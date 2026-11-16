#!/usr/bin/env python3
"""매일 도는 가격 기록 갱신 진입점.

하는 일
1) 쿠팡 상품: 공개 가격추적 사이트(쿠프라이스)에서 실제 관측 이력을 다시 받아 병합
2) 모든 상품: data/products.json 의 확인 가격을 오늘 날짜 관측점으로 추가
   (과거 기록이 없는 상품은 이 한 점이 첫 점이 된다)

실행
    python3 scripts/update_prices.py
    python3 scripts/update_prices.py --sleep 1.5

주의
- 값을 만들어 넣지 않습니다. 조회에 실패한 상품은 이전 기록을 그대로 둡니다.
- 갱신 뒤에는 git add data/price-history.json → commit → push 로 배포합니다.
"""
from __future__ import annotations

import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))

from fetch_price_history import main  # noqa: E402

if __name__ == "__main__":
    raise SystemExit(main())
