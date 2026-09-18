#!/bin/bash
# 시제품 서버(임시 DB 포함)를 띄운다. 같은 와이파이의 휴대폰에서도 열 수 있다.
# 사용: ./serve.sh [포트] [--reset]   (--reset: 임시 DB를 지우고 시험용 계정으로 다시 만든다)
PORT=8765; EXTRA=""
for a in "$@"; do case "$a" in --reset) EXTRA="--reset";; *) PORT="$a";; esac; done
cd "$(dirname "$0")"
echo "PC:     http://localhost:$PORT/"
for ip in $(hostname -I); do case "$ip" in *:*) ;; *) echo "휴대폰: http://$ip:$PORT/";; esac; done
exec python3 server.py --port "$PORT" $EXTRA
