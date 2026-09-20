"""시제품 서버 — 파일을 내주고, 임시 DB(SQLite)에 계정과 화면 데이터를 둔다.

UI/UX 연구용이다. 진짜 서비스의 서버 구조가 아니다.
- 계정: 공장주·운영자 아이디/비밀번호 (시험 편의 — 설계는 번호 인증), 근로자는 초대로 들어온다
- 앱(근로자)과 웹(공장주·운영자)은 로그인 쿠키를 따로 쓴다 (asid / sid)
- 화면 데이터: 가짜 서버 상태 하나를 JSON 한 덩어리로 둔다. 버전 번호로 여러 기기의 쓰기를 맞춘다.

사용: python3 server.py [--port 8765] [--reset]
표준 라이브러리만 쓴다.
"""
import argparse
import hashlib
import http.server
import json
import os
import secrets
import socket
import sqlite3
import threading
from datetime import datetime
from http import cookies
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(ROOT, 'data', 'proto.db')
LOCK = threading.Lock()

# 시험용 계정 — (아이디, 비밀번호, 역할, 이름, 공장, 소속)
SEED_ACCOUNTS = [
    ('daesung', '1234', 'owner', '박대표', 'daesung', '대성정밀'),
    ('hanbit', '1234', 'owner', '최대표', 'hanbit', '한빛화학'),
    ('admin', '1234', 'operator', '이운영', None, '산업안전지킴이 운영센터'),
]

# 시험용 근로자 초대 — (코드, 이름, 공장, 언어, 일하는 곳, 상태)
# open 초대는 시험을 여러 번 하도록 써도 닫지 않는다 (시험 편의). used·expired는 오류 화면 보기용.
SEED_INVITES = [
    ('DS-KIM', '김근로', 'daesung', 'ko', 'A동 2라인', 'open'),
    ('DS-NGUYEN', 'Nguyen Van A', 'daesung', 'vi', 'A동 2라인', 'open'),
    ('DS-USED', '이현장', 'daesung', 'ko', 'A동', 'used'),
    ('DS-OLD', '박신입', 'daesung', 'ko', 'A동', 'expired'),
]


def pw_hash(pw, salt):
    return hashlib.pbkdf2_hmac('sha256', pw.encode(), salt.encode(), 100_000).hex()


def db():
    con = sqlite3.connect(DB_PATH)
    con.row_factory = sqlite3.Row
    return con


def init_db(reset=False):
    os.makedirs(os.path.dirname(DB_PATH), exist_ok=True)
    if reset and os.path.exists(DB_PATH):
        os.remove(DB_PATH)
    with db() as con:
        con.executescript('''
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY, login TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, pw TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('owner','operator','worker')), name TEXT NOT NULL, factory TEXT, org TEXT,
          lang TEXT, area TEXT);
        CREATE TABLE IF NOT EXISTS invites (
          code TEXT PRIMARY KEY, name TEXT NOT NULL, factory TEXT NOT NULL, lang TEXT, area TEXT,
          status TEXT NOT NULL CHECK (status IN ('open','used','expired')));
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY, account INTEGER NOT NULL REFERENCES accounts(id), created TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS state (
          id INTEGER PRIMARY KEY CHECK (id = 1), ver INTEGER NOT NULL, json TEXT, updated TEXT);
        ''')
        if con.execute('SELECT COUNT(*) FROM accounts').fetchone()[0] == 0:
            for login, pw, role, name, factory, org in SEED_ACCOUNTS:
                salt = secrets.token_hex(8)
                con.execute('INSERT INTO accounts (login,salt,pw,role,name,factory,org) VALUES (?,?,?,?,?,?,?)',
                            (login, salt, pw_hash(pw, salt), role, name, factory, org))
        if con.execute('SELECT COUNT(*) FROM invites').fetchone()[0] == 0:
            con.executemany('INSERT INTO invites VALUES (?,?,?,?,?,?)', SEED_INVITES)
        con.execute('INSERT OR IGNORE INTO state (id, ver, json, updated) VALUES (1, 0, NULL, NULL)')


def account_public(row):
    return {'login': row['login'], 'role': row['role'], 'name': row['name'], 'factory': row['factory'],
            'org': row['org'], 'lang': row['lang'], 'area': row['area']}


class Handler(http.server.SimpleHTTPRequestHandler):
    def __init__(self, *a, **kw):
        super().__init__(*a, directory=ROOT, **kw)

    def log_message(self, fmt, *args):
        if '/api/state' in (args[0] if args else ''):
            return  # 주기적 동기화 요청은 기록하지 않는다
        super().log_message(fmt, *args)

    def end_headers(self):
        self.send_header('Cache-Control', 'no-store')
        super().end_headers()

    # ---- 도구 ----
    def json_out(self, code, obj=None, headers=None):
        body = b'' if obj is None else json.dumps(obj, ensure_ascii=False).encode()
        self.send_response(code)
        for k, v in (headers or {}).items():
            self.send_header(k, v)
        if obj is not None:
            self.send_header('Content-Type', 'application/json; charset=utf-8')
        self.send_header('Content-Length', str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def body(self):
        n = int(self.headers.get('Content-Length') or 0)
        return json.loads(self.rfile.read(n) or b'{}')

    def me(self, app=False):
        c = cookies.SimpleCookie(self.headers.get('Cookie') or '')
        name = 'asid' if app else 'sid'
        tok = c[name].value if name in c else None
        if not tok:
            return None
        with db() as con:
            return con.execute('SELECT a.* FROM sessions s JOIN accounts a ON a.id = s.account WHERE s.token = ?', (tok,)).fetchone()

    # ---- GET ----
    def do_GET(self):
        u = urlparse(self.path)
        if u.path.startswith('/data/'):
            return self.json_out(404, {'error': 'not found'})
        if u.path == '/api/ping':
            return self.json_out(200, {'ok': True})
        if u.path == '/api/invite':
            code = (parse_qs(u.query).get('code', [''])[0]).strip().upper()
            with db() as con:
                r = con.execute('SELECT * FROM invites WHERE code = ?', (code,)).fetchone()
            if not r:
                return self.json_out(404, {'status': 'none'})
            return self.json_out(200, dict(r))
        if u.path == '/api/invites':
            row = self.me()
            if not row or row['role'] != 'owner':
                return self.json_out(401, {'error': 'login'})
            with db() as con:
                rs = con.execute('SELECT * FROM invites WHERE factory = ? ORDER BY rowid DESC', (row['factory'],)).fetchall()
            return self.json_out(200, [dict(r) for r in rs])
        if u.path == '/api/me':
            row = self.me(app=parse_qs(u.query).get('app') == ['1'])
            return self.json_out(200, account_public(row)) if row else self.json_out(401, {'error': 'login'})
        if u.path == '/api/state':
            since = parse_qs(u.query).get('since', [None])[0]
            with db() as con:
                r = con.execute('SELECT ver, json FROM state WHERE id = 1').fetchone()
            if since is not None and since == str(r['ver']):
                return self.json_out(204)
            return self.json_out(200, {'ver': r['ver'], 'state': json.loads(r['json']) if r['json'] else None})
        return super().do_GET()

    # ---- POST ----
    def do_POST(self):
        u = urlparse(self.path)
        if u.path == '/api/login':
            b = self.body()
            with db() as con:
                row = con.execute('SELECT * FROM accounts WHERE login = ?', ((b.get('login') or '').strip(),)).fetchone()
                if not row or pw_hash(b.get('pw') or '', row['salt']) != row['pw']:
                    return self.json_out(401, {'error': '아이디 또는 비밀번호가 맞지 않아요'})
                tok = secrets.token_urlsafe(24)
                con.execute('INSERT INTO sessions VALUES (?,?,?)', (tok, row['id'], datetime.now().isoformat(timespec='seconds')))
            return self.json_out(200, account_public(row), {'Set-Cookie': f'sid={tok}; Path=/; HttpOnly; SameSite=Lax'})
        if u.path == '/api/invite/create':
            row = self.me()
            if not row or row['role'] != 'owner':
                return self.json_out(401, {'error': 'login'})
            b = self.body()
            name = (b.get('name') or '').strip()
            if not name:
                return self.json_out(400, {'error': '이름을 적어 주세요'})
            code = f"{row['factory'][:2].upper()}-{secrets.token_hex(2).upper()}"
            with db() as con:
                con.execute('INSERT INTO invites VALUES (?,?,?,?,?,?)', (code, name, row['factory'], b.get('lang') or 'ko', b.get('area') or '', 'open'))
            return self.json_out(200, {'code': code, 'name': name})
        if u.path == '/api/invite/cancel':
            row = self.me()
            if not row or row['role'] != 'owner':
                return self.json_out(401, {'error': 'login'})
            with db() as con:
                con.execute("UPDATE invites SET status = 'expired' WHERE code = ? AND factory = ? AND status = 'open'", ((self.body().get('code') or ''), row['factory']))
            return self.json_out(200, {'ok': True})
        if u.path == '/api/invite/accept':
            code = (self.body().get('code') or '').strip().upper()
            with db() as con:
                inv = con.execute('SELECT * FROM invites WHERE code = ?', (code,)).fetchone()
                if not inv or inv['status'] != 'open':
                    return self.json_out(410, {'status': inv['status'] if inv else 'none'})
                login = f"w:{inv['factory']}:{inv['name']}"
                row = con.execute('SELECT * FROM accounts WHERE login = ?', (login,)).fetchone()
                if not row:
                    con.execute('INSERT INTO accounts (login,salt,pw,role,name,factory,org,lang,area) VALUES (?,?,?,?,?,?,?,?,?)',
                                (login, '-', '-', 'worker', inv['name'], inv['factory'], None, inv['lang'], inv['area']))
                    row = con.execute('SELECT * FROM accounts WHERE login = ?', (login,)).fetchone()
                # 공장주가 만든 초대는 한 번 쓰면 닫힌다. 시험용 초대(SEED_INVITES)는 여러 번 시험하도록 열어 둔다.
                if code not in {c for c, *_ in SEED_INVITES}:
                    con.execute("UPDATE invites SET status = 'used' WHERE code = ?", (code,))
                tok = secrets.token_urlsafe(24)
                con.execute('INSERT INTO sessions VALUES (?,?,?)', (tok, row['id'], datetime.now().isoformat(timespec='seconds')))
            return self.json_out(200, account_public(row), {'Set-Cookie': f'asid={tok}; Path=/; HttpOnly; SameSite=Lax'})
        if u.path == '/api/logout':
            app = parse_qs(u.query).get('app') == ['1']
            name = 'asid' if app else 'sid'
            c = cookies.SimpleCookie(self.headers.get('Cookie') or '')
            if name in c:
                with db() as con:
                    con.execute('DELETE FROM sessions WHERE token = ?', (c[name].value,))
            return self.json_out(200, {'ok': True}, {'Set-Cookie': f'{name}=; Path=/; Max-Age=0'})
        if u.path == '/api/state':
            b = self.body()
            with LOCK, db() as con:
                ver = con.execute('SELECT ver FROM state WHERE id = 1').fetchone()['ver']
                if not b.get('force') and b.get('base') != ver:
                    cur = con.execute('SELECT ver, json FROM state WHERE id = 1').fetchone()
                    return self.json_out(409, {'ver': cur['ver'], 'state': json.loads(cur['json']) if cur['json'] else None})
                ver += 1
                con.execute('UPDATE state SET ver = ?, json = ?, updated = ? WHERE id = 1',
                            (ver, json.dumps(b.get('state'), ensure_ascii=False), datetime.now().isoformat(timespec='seconds')))
            return self.json_out(200, {'ver': ver})
        return self.json_out(404, {'error': 'not found'})


class Server(http.server.ThreadingHTTPServer):
    """IPv4와 IPv6를 함께 받는다.

    Render의 내부 건강 검사가 IPv6로 찾아오기 때문이다. IPv4(0.0.0.0)로만 열어 두면
    요청이 아예 닿지 않아 배포가 'Timed Out'으로 끝난다.
    """
    address_family = socket.AF_INET6

    def server_bind(self):
        try:
            self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
        except OSError:
            pass  # IPv6만 받는 기계면 그대로 둔다
        return super().server_bind()


def make_server(port):
    try:
        return Server(('::', port), Handler)
    except OSError:  # IPv6를 못 쓰는 기계면 IPv4로 돌아간다
        return http.server.ThreadingHTTPServer(('0.0.0.0', port), Handler)


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument('--port', type=int, default=8765)
    ap.add_argument('--reset', action='store_true', help='임시 DB를 지우고 처음 계정으로 다시 만든다')
    a = ap.parse_args()
    init_db(a.reset)
    srv = make_server(a.port)
    fam = 'IPv4+IPv6' if srv.address_family == socket.AF_INET6 else 'IPv4'
    print(f'시제품 서버: http://localhost:{a.port}/  ({fam})  (DB: {DB_PATH})', flush=True)
    srv.serve_forever()


if __name__ == '__main__':
    main()
