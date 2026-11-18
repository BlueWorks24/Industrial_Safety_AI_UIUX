"""시제품 서버 — 파일을 내주고, 임시 DB(SQLite)에 계정과 화면 데이터를 둔다.

UI/UX 연구용이다. 진짜 서비스의 서버 구조가 아니다.
- 계정: 공장주·운영자·지킴이 아이디/비밀번호 (시험 편의 — 공장주 설계는 번호 인증), 근로자는 초대로 들어온다
- 근로자 앱·지킴이 앱·웹(공장주·운영자)은 로그인 쿠키를 따로 쓴다 (asid / gsid / sid)
- 화면 데이터: 가짜 서버 상태 하나를 JSON 한 덩어리로 둔다. 버전 번호로 여러 기기의 쓰기를 맞춘다.
- 사진: 지킴이 앱 카메라로 찍은 사진 · 공장주가 [고쳤어요]로 올린 사진은 data/photos/에 파일로 두고 상태에는 주소만 둔다 (2026-10-23, 공장주는 10-26)

사용: python3 server.py [--port 8765] [--reset]
표준 라이브러리만 쓴다.
"""
import argparse
import base64
import hashlib
import http.server
import json
import os
import re
import secrets
import shutil
import socket
import sqlite3
import struct
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime
from http import cookies
from urllib.parse import urlparse, parse_qs

ROOT = os.path.dirname(os.path.abspath(__file__))
DB_PATH = os.path.join(ROOT, 'data', 'proto.db')
PHOTO_DIR = os.path.join(ROOT, 'data', 'photos')
PHOTO_NAME = re.compile(r'[0-9a-f]{16}\.jpg')
PHOTO_MAX = 8 * 1024 * 1024  # 앱이 긴 변 1600px로 줄여 올려 보통 수백 KB
LOCK = threading.Lock()

# 시험용 계정 — (아이디, 비밀번호, 역할, 이름, 공장, 소속). 지킴이의 소속은 조 이름이다
SEED_ACCOUNTS = [
    ('daesung', '1234', 'owner', '박대표', 'daesung', '대성정밀'),
    ('hanbit', '1234', 'owner', '최대표', 'hanbit', '한빛화학'),
    ('admin', '1234', 'operator', '이운영', None, '산업안전지킴이 운영센터'),
    ('guard1', '1234', 'guard', '김지킴', None, '전기 1조'),
    ('guard2', '1234', 'guard', '이조장', None, '전기 1조'),
]
# 로그인하는 곳마다 들어올 수 있는 역할과 쿠키 이름 (근로자는 초대로만 들어와 여기 없다)
LOGIN_AT = {'web': (('owner', 'operator'), 'sid'), 'guard': (('guard',), 'gsid')}
COOKIE = {'web': 'sid', 'app': 'asid', 'guard': 'gsid'}

# 시험용 근로자 초대 — (코드, 이름, 공장, 언어, 일하는 곳, 상태)
# open 초대는 시험을 여러 번 하도록 써도 닫지 않는다 (시험 편의). used·expired는 오류 화면 보기용.
SEED_INVITES = [
    ('DS-KIM', '김근로', 'daesung', 'ko', 'A동 2라인', 'open'),
    ('DS-NGUYEN', 'Nguyen Van A', 'daesung', 'vi', 'A동 2라인', 'open'),
    ('DS-USED', '이현장', 'daesung', 'ko', 'A동', 'used'),
    ('DS-OLD', '박신입', 'daesung', 'ko', 'A동', 'expired'),
    # 한빛화학 근로자 (2026-11-11 사용자 지시 — 센서 관련 PoC는 진짜 센서를 붙인 한빛화학 기준으로 하고 그 다음 넓힌다). 이름 · 일하는 곳은 내가 정함
    ('HB-JUNG', '정근로', 'hanbit', 'ko', '반응동 1층', 'open'),
]

# ---- 진짜 센서 경보 (2026-11-09 사용자 지시 — 한빛화학 온습도 센서를 Jetson의 ThingsBoard에 붙임) ----
# 시제품 센서 키 → (ThingsBoard 장치 이름, 지금 값으로 보일 값 [ThingsBoard 키, 화면 이름, 단위]). 이 센서의 경보는 씨앗 대신 ThingsBoard 경보를 보인다 (지킴이 공장 창 센서 이력만)
TB_LINK = {'hb_th': ('HTA843f28-TEMPHUMI', [('temperature', '온도', '℃'), ('humidity', '습도', '%')]),
           # 전력량계 (같은 날 사용자 지시 — 네 칸. 전류 · 전력은 CT를 달기 전까지 0). 사무실 시험 장비가 단상이라 A상 값을 쓴다
           'hb_power': ('HTA843f28-GIMAC1000', [('voltage_a', '전압', 'V'), ('frequency', '주파수', 'Hz'), ('current_a', '전류', 'A'), ('active_power', '전력', 'W')])}
# 계정은 깃 밖 data/tb.env (TB_URL · TB_USER · TB_PASS 세 줄, `이름=값`) 또는 같은 이름의 환경변수. 읽기만 한다
TB_ENV = os.path.join(ROOT, 'data', 'tb.env')
TB_SEV = {'CRITICAL': 'critical', 'MAJOR': 'warn', 'MINOR': 'warn', 'WARNING': 'info', 'INDETERMINATE': 'info'}
TB = {'token': None, 'dev': {}}
# 받아 둔 것 — ThingsBoard WebSocket 스레드(tb_live)가 채우고, 화면 쪽 연결(/api/tb/live)이 바뀔 때마다 받아 간다
TB_NOW = {'ok': False, 'why': 'no-account', 'alarms': {}, 'latest': {}, 'ver': 0}
TB_CV = threading.Condition()


def tb_conf():
    c = {}
    if os.path.isfile(TB_ENV):
        with open(TB_ENV, encoding='utf-8') as f:
            for line in f:
                if '=' in line and not line.lstrip().startswith('#'):
                    k, v = line.split('=', 1)
                    c[k.strip()] = v.strip()
    for k in ('TB_URL', 'TB_USER', 'TB_PASS'):
        c[k] = os.environ.get(k) or c.get(k)
    return c if all(c.get(k) for k in ('TB_URL', 'TB_USER', 'TB_PASS')) else None


def tb_call(c, path, body=None, login=False):
    url = c['TB_URL'].rstrip('/') + path
    head = {'Content-Type': 'application/json'}
    if not login:
        if not TB['token']:
            TB['token'] = tb_call(c, '/api/auth/login', {'username': c['TB_USER'], 'password': c['TB_PASS']}, login=True)['token']
        head['X-Authorization'] = 'Bearer ' + TB['token']
    req = urllib.request.Request(url, data=json.dumps(body).encode() if body is not None else None, headers=head)
    try:
        with urllib.request.urlopen(req, timeout=5) as r:
            return json.loads(r.read() or b'null')
    except urllib.error.HTTPError as e:
        if e.code == 401 and not login and TB['token']:  # 토큰이 끝났으면 한 번 다시 로그인
            TB['token'] = None
            return tb_call(c, path, body)
        raise


def tb_device(c, name):
    if name not in TB['dev']:
        me = tb_call(c, '/api/auth/user')
        q = 'pageSize=10&page=0&textSearch=' + urllib.parse.quote(name)
        cid = (me.get('customerId') or {}).get('id')
        path = f'/api/customer/{cid}/devices?{q}' if me.get('authority') == 'CUSTOMER_USER' else f'/api/tenant/devices?{q}'
        hit = [d for d in tb_call(c, path).get('data', []) if d.get('name') == name]
        if not hit:
            raise LookupError(f'장치 없음: {name}')
        TB['dev'][name] = hit[0]['id']['id']
    return TB['dev'][name]


def tb_alarm(key, a):
    """ThingsBoard 경보 하나를 시제품 경보 꼴(seed.js alarms)로. 시각은 이 기계 시간대(한국)"""
    at = lambda ms: datetime.fromtimestamp(ms / 1000)
    t0 = at(a.get('startTs') or a['createdTime'])
    mins = lambda t: t.hour * 60 + t.minute
    cleared = a.get('cleared') or str(a.get('status', '')).startswith('CLEARED')
    out = {'id': 'tb-' + a['id']['id'], 'key': key, 'day': f'{t0.month}/{t0.day:02d}', 'start': mins(t0),
           'status': 'ended' if cleared else 'live', 'abnormal': False, 'sev': TB_SEV.get(a.get('severity'), 'info'),
           'acks': [{'by': '', 'at': mins(at(a['ackTs']))}] if a.get('acknowledged') and a.get('ackTs') else [], 'snoozes': 0, 'tb': True}
    if cleared:
        out['endedAt'] = mins(at(a.get('clearTs') or a.get('endTs') or a['createdTime']))
        out['endKind'] = 'ended' if out['acks'] else 'noack'
    return out


def tb_snap():
    """화면에 줄 것 한 덩어리. 계정이 없거나 닿지 않으면 ok False — 화면은 씨앗 경보를 그대로 보인다"""
    return {'ok': TB_NOW['ok'], 'keys': list(TB_LINK), 'alarms': list(TB_NOW['alarms'].values()), 'latest': TB_NOW['latest']}


TB_FACTORY = 'hanbit'  # TB_LINK 센서가 달린 공장 — 센서 관련 PoC는 한빛화학 기준 (2026-11-11 사용자 결정)


def tb_state(factory):
    """근로자 앱 센서 감시용 (2026-11-11 사용자 지시) — 센서마다 마지막으로 받은 때, 울리는 경보가 있는지, 경보 기록, 지금 값.
    처음엔 근로자는 센서 값을 보지 않는다(2026-10-20 사용자 결정)에 따라 값을 뺐는데, 같은 날 사용자 지시("온습도면 온도, 습도를 실시간으로")로
    센서 하나 화면에서는 지금 값을 보이게 되어 vals도 준다(홈 센서 감시 칸은 그대로 상태만). 다른 공장 근로자는 ok False(씨앗 그대로)"""
    if factory != TB_FACTORY:
        return {'ok': False}
    al = TB_NOW['alarms'].values()
    # 센서 하나 화면의 경보 기록 — 지킴이 센서 이력 타임라인과 같은 줄을 그리게 울린 때 · 조치한 때 · 끝난 때 · 심각도, 최근 30건
    md = lambda a: tuple(int(x) for x in a['day'].split('/')) + (a['start'],)
    log = lambda k: [{'day': a['day'], 'start': a['start'], 'end': a.get('endedAt'), 'live': a['status'] == 'live',
                      'ack': a['acks'][0]['at'] if a['acks'] else None, 'sev': a['sev']}
                     for a in sorted((a for a in al if a['key'] == k), key=md, reverse=True)[:30]]
    now = lambda k: TB_NOW['latest'].get(k) or {}
    return {'ok': TB_NOW['ok'], 'keys': list(TB_LINK),
            'st': {k: {'ts': now(k).get('ts'), 'vals': now(k).get('vals'), 'abn': any(a['key'] == k and a['status'] == 'live' for a in al), 'al': log(k)} for k in TB_LINK}}


def tb_set(**kw):
    with TB_CV:
        TB_NOW.update(kw)
        TB_NOW['ver'] += 1
        TB_CV.notify_all()


class WSClient:
    """WebSocket 받는 쪽만 (ws:// 하나, 표준 라이브러리만). ThingsBoard /api/ws에 붙어 JSON을 주고받는다"""
    def __init__(self, url):
        u = urlparse(url)
        self.sock = socket.create_connection((u.hostname, u.port or 80), timeout=60)
        key = base64.b64encode(os.urandom(16)).decode()
        self.sock.sendall((f'GET {u.path} HTTP/1.1\r\nHost: {u.netloc}\r\nUpgrade: websocket\r\nConnection: Upgrade\r\n'
                           f'Sec-WebSocket-Key: {key}\r\nSec-WebSocket-Version: 13\r\n\r\n').encode())
        buf = b''
        while b'\r\n\r\n' not in buf:
            got = self.sock.recv(4096)
            if not got:
                raise EOFError('handshake')
            buf += got
        head, self.rest = buf.split(b'\r\n\r\n', 1)
        if b' 101 ' not in head.split(b'\r\n')[0]:
            raise OSError(head.split(b'\r\n')[0].decode(errors='replace'))

    def _take(self, n):
        while len(self.rest) < n:
            got = self.sock.recv(65536)
            if not got:
                raise EOFError('closed')
            self.rest += got
        out, self.rest = self.rest[:n], self.rest[n:]
        return out

    def send(self, obj, op=1):
        data = json.dumps(obj).encode() if op == 1 else obj
        n, mask = len(data), os.urandom(4)
        size = bytes([0x80 | n]) if n < 126 else bytes([0x80 | 126]) + struct.pack('>H', n) if n < 65536 else bytes([0x80 | 127]) + struct.pack('>Q', n)
        self.sock.sendall(bytes([0x80 | op]) + size + mask + bytes(b ^ mask[i % 4] for i, b in enumerate(data)))

    def recv(self):
        msg = b''
        while True:
            b0, b1 = self._take(2)
            n = b1 & 0x7f
            if n == 126:
                n = struct.unpack('>H', self._take(2))[0]
            elif n == 127:
                n = struct.unpack('>Q', self._take(8))[0]
            mask = self._take(4) if b1 & 0x80 else None
            data = self._take(n)
            if mask:
                data = bytes(b ^ mask[i % 4] for i, b in enumerate(data))
            op = b0 & 0x0f
            if op == 9:  # ping → pong
                self.send(data, 10)
                continue
            if op == 10:  # 우리가 보낸 "살아 있나"의 답(pong) — 버린다 (2026-11-11 — 전엔 빈 글을 JSON으로 읽다 오류가 나 끊겼다)
                continue
            if op == 8:
                raise EOFError('closed')
            msg += data
            if b0 & 0x80:
                return json.loads(msg)


def tb_live():
    """ThingsBoard WebSocket에 붙어 있는 스레드 (2026-11-09 사용자 지시 — 10초마다 묻던 것을 바꿈).
    장치마다 지금 값(ENTITY_DATA)과 경보(ALARM_DATA)를 구독한다. 끊기면 5초 뒤 다시 로그인해서 붙는다"""
    while True:
        c = tb_conf()
        if not c:
            tb_set(ok=False, why='no-account', alarms={}, latest={})
            time.sleep(30)
            continue
        try:
            # 새로 붙을 때마다 새 토큰 (오래 붙어 있다 끊긴 경우). 장치 id도 다시 찾는다 — 그래야 로그인을 한다
            # (2026-11-11 — 전엔 id를 기억해 둬서 다시 붙을 때 로그인을 건너뛰고 빈 토큰으로 붙어, 한 번 끊기면 서버를 다시 켤 때까지 계속 거절당했다)
            TB['token'], TB['dev'] = None, {}
            devs = {tb_device(c, name): key for key, (name, _) in TB_LINK.items()}
            ws = WSClient(c['TB_URL'].replace('http', 'ws', 1).rstrip('/') + '/api/ws')
            ws.send({'authCmd': {'cmdId': 0, 'token': TB['token']}})
            cmds, cmd_key = [], {}
            for i, (dev, key) in enumerate(devs.items()):
                one = {'type': 'singleEntity', 'singleEntity': {'entityType': 'DEVICE', 'id': dev}}
                vals = [{'type': 'TIME_SERIES', 'key': k} for k, _, _ in TB_LINK[key][1]]
                cmds.append({'type': 'ENTITY_DATA', 'cmdId': 10 + 2 * i, 'query': {'entityFilter': one, 'pageLink': {'page': 0, 'pageSize': 1},
                             'entityFields': [], 'latestValues': vals}, 'latestCmd': {'keys': vals}})
                cmds.append({'type': 'ALARM_DATA', 'cmdId': 11 + 2 * i, 'query': {'entityFilter': one, 'entityFields': [], 'latestValues': [],
                             'alarmFields': [{'type': 'ALARM_FIELD', 'key': 'createdTime'}],
                             'pageLink': {'page': 0, 'pageSize': 100, 'timeWindow': 365 * 86400000, 'searchPropagatedAlarms': False,
                                          'statusList': [], 'severityList': [], 'typeList': [],
                                          'sortOrder': {'key': {'type': 'ALARM_FIELD', 'key': 'createdTime'}, 'direction': 'DESC'}}}})
                cmd_key[10 + 2 * i] = cmd_key[11 + 2 * i] = key
            ws.send({'cmds': cmds})
            alarms, latest, got = {}, {}, {}
            while True:
                try:
                    m = ws.recv()
                except socket.timeout:  # 1분 동안 아무것도 안 오면(센서가 쉬면) 끊지 않고 살아 있나만 묻는다
                    ws.send(b'', 9)
                    continue
                key = cmd_key.get(m.get('cmdId'))
                if not key or m.get('errorCode'):
                    continue
                rows = (m.get('data') or {}).get('data') or m.get('update') or []
                if m.get('cmdUpdateType') == 'ALARM_DATA':
                    for a in rows:
                        x = tb_alarm(key, a)
                        alarms[x['id']] = x
                else:
                    lv = (rows[0].get('latest') or {}).get('TIME_SERIES', {}) if rows else {}
                    if not lv:
                        continue
                    got.setdefault(key, {}).update(lv)  # 바뀐 키만 올 때도 있어 앞의 것과 합친다
                    have = got[key]
                    # 값이 같아도 받을 때마다 보낸다 — 화면의 "받은 시각"이 센서가 살아 있는지 알려 준다 (같은 날 사용자가 고른 3안)
                    latest[key] = {'ts': max(int(v['ts']) for v in have.values()),
                                   'vals': [[name, have[k]['value'], unit] for k, name, unit in TB_LINK[key][1] if k in have]}
                tb_set(ok=True, why='', alarms=dict(alarms), latest=dict(latest))
        except Exception as e:  # 시제품이라 까닭만 남기고 다시 붙는다
            tb_set(ok=False, why=type(e).__name__ + ': ' + str(e)[:200])
            time.sleep(5)



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
    if reset:
        shutil.rmtree(PHOTO_DIR, ignore_errors=True)  # 찍은 사진도 상태와 같이 지운다
    with db() as con:
        con.executescript('''
        CREATE TABLE IF NOT EXISTS accounts (
          id INTEGER PRIMARY KEY, login TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, pw TEXT NOT NULL,
          role TEXT NOT NULL CHECK (role IN ('owner','operator','worker','guard')), name TEXT NOT NULL, factory TEXT, org TEXT,
          lang TEXT, area TEXT);
        CREATE TABLE IF NOT EXISTS invites (
          code TEXT PRIMARY KEY, name TEXT NOT NULL, factory TEXT NOT NULL, lang TEXT, area TEXT,
          status TEXT NOT NULL CHECK (status IN ('open','used','expired')));
        CREATE TABLE IF NOT EXISTS sessions (
          token TEXT PRIMARY KEY, account INTEGER NOT NULL REFERENCES accounts(id), created TEXT NOT NULL);
        CREATE TABLE IF NOT EXISTS state (
          id INTEGER PRIMARY KEY CHECK (id = 1), ver INTEGER NOT NULL, json TEXT, updated TEXT);
        ''')
        # 지킴이 역할이 없던 옛 DB — 계정 표를 새 규칙으로 옮겨 담는다 (세션·화면 데이터는 그대로)
        if "'guard'" not in con.execute("SELECT sql FROM sqlite_master WHERE name = 'accounts'").fetchone()[0]:
            con.executescript('''
            PRAGMA legacy_alter_table = ON;
            ALTER TABLE accounts RENAME TO accounts_old;
            CREATE TABLE accounts (
              id INTEGER PRIMARY KEY, login TEXT UNIQUE NOT NULL, salt TEXT NOT NULL, pw TEXT NOT NULL,
              role TEXT NOT NULL CHECK (role IN ('owner','operator','worker','guard')), name TEXT NOT NULL, factory TEXT, org TEXT,
              lang TEXT, area TEXT);
            INSERT INTO accounts SELECT * FROM accounts_old;
            DROP TABLE accounts_old;
            PRAGMA legacy_alter_table = OFF;
            ''')
        for login, pw, role, name, factory, org in SEED_ACCOUNTS:
            if not con.execute('SELECT 1 FROM accounts WHERE login = ?', (login,)).fetchone():
                salt = secrets.token_hex(8)
                con.execute('INSERT INTO accounts (login,salt,pw,role,name,factory,org) VALUES (?,?,?,?,?,?,?)',
                            (login, salt, pw_hash(pw, salt), role, name, factory, org))
        # 시험용 초대는 없는 것만 넣는다 — 이미 있는 초대(공장주가 만든 것 · 상태)는 그대로 (2026-11-11 — 전엔 초대 표가 비었을 때만이라 켜 둔 서버에 새 시험 초대가 안 들어갔다)
        con.executemany('INSERT OR IGNORE INTO invites VALUES (?,?,?,?,?,?)', SEED_INVITES)
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
        if not self.__dict__.pop('cached', False):
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

    def where(self, u):
        # ?app=1 근로자 앱 · ?app=guard 지킴이 앱 · 없으면 웹
        a = parse_qs(u.query).get('app', [''])[0]
        return 'app' if a == '1' else 'guard' if a == 'guard' else 'web'

    def me(self, where='web'):
        c = cookies.SimpleCookie(self.headers.get('Cookie') or '')
        name = COOKIE[where]
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
        if u.path.startswith('/api/photo/'):
            name = u.path[len('/api/photo/'):]
            path = os.path.join(PHOTO_DIR, name)
            if not PHOTO_NAME.fullmatch(name) or not os.path.isfile(path):
                return self.json_out(404, {'error': 'not found'})
            with open(path, 'rb') as f:
                data = f.read()
            # 사진마다 이름이 달라 바뀌지 않는다 — 화면을 다시 그릴 때마다 새로 받지 않게 둔다
            self.cached = True
            self.send_response(200)
            self.send_header('Content-Type', 'image/jpeg')
            self.send_header('Cache-Control', 'private, max-age=31536000, immutable')
            self.send_header('Content-Length', str(len(data)))
            self.end_headers()
            self.wfile.write(data)
            return
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
            row = self.me(self.where(u))
            return self.json_out(200, account_public(row)) if row else self.json_out(401, {'error': 'login'})
        if u.path == '/api/tb/live':  # 진짜 센서 경보와 지금 값 (2026-11-09) — 지킴이. 바뀔 때마다 밀어 주는 연결(Server-Sent Events)
            # 근로자 앱도 (2026-11-11) — ?app=1로 묻고 값 없이 상태만(tb_state). 어느 앱이 묻는지로 가른다:
            # 시제품은 한 브라우저에 지킴이 · 근로자 로그인이 같이 있어, 지킴이 로그인을 먼저 보던 때는 근로자 앱에 지킴이 데이터(값 포함)가 갔다
            if self.where(u) == 'app':
                w = self.me('app')
                if not (w and w['role'] == 'worker'):
                    return self.json_out(401, {'error': 'login'})
                snap = lambda f=w['factory']: tb_state(f)
            else:
                if not self.me('guard'):
                    return self.json_out(401, {'error': 'login'})
                snap = tb_snap
            self.send_response(200)
            self.send_header('Content-Type', 'text/event-stream; charset=utf-8')
            self.end_headers()
            seen = -1
            try:
                while True:
                    with TB_CV:
                        if TB_NOW['ver'] == seen:
                            TB_CV.wait(15)
                        ver, body = TB_NOW['ver'], json.dumps(snap(), ensure_ascii=False)
                    # 그대로면 빈 줄로 연결이 살아 있나만 본다 (화면을 닫으면 여기서 끊겨 끝난다)
                    self.wfile.write(b': keep\n\n' if ver == seen else f'data: {body}\n\n'.encode())
                    self.wfile.flush()
                    seen = ver
            except (BrokenPipeError, ConnectionResetError):
                return
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
            roles, name = LOGIN_AT.get(self.where(u), LOGIN_AT['web'])
            with db() as con:
                row = con.execute('SELECT * FROM accounts WHERE login = ?', ((b.get('login') or '').strip(),)).fetchone()
                if not row or row['role'] not in roles or pw_hash(b.get('pw') or '', row['salt']) != row['pw']:
                    return self.json_out(401, {'error': '아이디 또는 비밀번호가 맞지 않아요'})
                tok = secrets.token_urlsafe(24)
                con.execute('INSERT INTO sessions VALUES (?,?,?)', (tok, row['id'], datetime.now().isoformat(timespec='seconds')))
            # 로그인 상태 유지를 고르면 30일 남고, 안 고르면 브라우저를 닫을 때 지워진다
            age = '; Max-Age=2592000' if b.get('keep') else ''
            return self.json_out(200, account_public(row), {'Set-Cookie': f'{name}={tok}; Path=/; HttpOnly; SameSite=Lax{age}'})
        if u.path == '/api/password':
            row = self.me(self.where(u))
            if not row:
                return self.json_out(401, {'error': 'login'})
            b = self.body()
            new = b.get('new') or ''
            if pw_hash(b.get('old') or '', row['salt']) != row['pw']:
                return self.json_out(400, {'error': '지금 비밀번호가 맞지 않아요', 'field': 'old'})
            if len(new) < 4:
                return self.json_out(400, {'error': '새 비밀번호는 4자 이상이어야 해요', 'field': 'new'})
            salt = secrets.token_hex(8)
            with db() as con:
                con.execute('UPDATE accounts SET salt = ?, pw = ? WHERE id = ?', (salt, pw_hash(new, salt), row['id']))
            return self.json_out(200, {'ok': True})
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
        if u.path == '/api/photo':
            # 지킴이 앱 카메라, 공장주 웹 [고쳤어요]의 고친 뒤 사진 (2026-10-26 — 공장주도 올린다)
            w = self.me('web')
            if not (self.me('guard') or (w and w['role'] == 'owner')):
                return self.json_out(401, {'error': 'login'})
            n = int(self.headers.get('Content-Length') or 0)
            if not 0 < n <= PHOTO_MAX:
                return self.json_out(413, {'error': 'size'})
            data = self.rfile.read(n)
            if not data.startswith(b'\xff\xd8\xff'):
                return self.json_out(400, {'error': 'jpeg'})
            name = secrets.token_hex(8) + '.jpg'
            os.makedirs(PHOTO_DIR, exist_ok=True)
            with open(os.path.join(PHOTO_DIR, name), 'wb') as f:
                f.write(data)
            return self.json_out(200, {'src': 'api/photo/' + name})
        if u.path == '/api/logout':
            name = COOKIE[self.where(u)]
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
    threading.Thread(target=tb_live, daemon=True).start()
    srv = make_server(a.port)
    fam = 'IPv4+IPv6' if srv.address_family == socket.AF_INET6 else 'IPv4'
    print(f'시제품 서버: http://localhost:{a.port}/  ({fam})  (DB: {DB_PATH})', flush=True)
    srv.serve_forever()


if __name__ == '__main__':
    main()
