# 시안 검사 도구

시안 HTML을 캡처하고, 휴대폰 틀 안에서 넘치거나 찌그러진 칸을 찾는 도구다. 이 기기(aarch64)에서는 Playwright에 딸린 크롬을 직접 부른다.

| 파일 | 하는 일 |
|---|---|
| `shot.sh` | `shot.sh <시안.html 절대경로> <저장.png> <폭> <높이>` — 전체 캡처. 미리보기는 폭 1000, 높이는 넉넉히 준 뒤 내용 끝에서 자른다 |
| `clip.js` | 넘침 검사 — 넘치면 잘리는 칸(`overflow:hidden`) 가운데 내용이 더 큰 것을 `body[data-clip]`에 적는다 |
| `squash.js` | 찌그러짐 검사 — 휴대폰 틀 안에서 글자 6자 이상인데 폭 120px 미만·높이 3줄 넘는 칸을 `body[data-squash]`에 적는다 (넘침 검사로는 안 잡힌다) |
| `cappos.js` | 칸 제목(`.cap`)의 위치를 `body[data-cap]`에 적는다 — 특정 칸만 잘라 볼 때 |

검사 스크립트는 시안 복사본의 `</body>` 앞에 끼워 넣고 DOM을 읽는다.

```bash
CHROME=~/.cache/ms-playwright/chromium-1228/chrome-linux/chrome
sed "s#</body>#$(cat clip.js squash.js | tr -d '\n' | sed 's/[&#]/\\&/g')</body>#" 시안.html > /tmp/검사.html
$CHROME --headless --no-sandbox --window-size=1000,1200 --virtual-time-budget=3000 --dump-dom file:///tmp/검사.html \
  | grep -o 'data-\(clip\|squash\)="[^"]*"'
```

둘 다 `NONE`이면 통과다. 흰 버튼(`btn ghost`) 안에 설명 번호를 넣으면 번호가 보이지 않으니 버튼 밖에 둔다.
