#!/usr/bin/env python3
"""r59 — 🤔 애매해요 5표 이상 상품 = 가격 재확인 우선 순위 목록.

사용자가 '애매해요'를 누르는 건 "이 가격·단가가 이상하다"는 신호입니다.
그 표가 5표 이상 쌓이면 가격 재확인 루틴(09:00·21:00 점검)에서 이 상품을 먼저 봅니다.

쓰는 법
  python3 scripts/flagged_recheck_r59.py                 # ttini.kr 라이브에서 받아서 목록만 출력
  python3 scripts/flagged_recheck_r59.py --base http://localhost:8080   # 로컬 서버
  python3 scripts/flagged_recheck_r59.py --json .tmpwork/flagged.json   # 파일로도 저장
  python3 scripts/flagged_recheck_r59.py --min 3         # 기준 표 수 바꾸기
  python3 scripts/flagged_recheck_r59.py --wait 1440     # (예약 실행용) 바뀐 게 없으면 조용히 끝냄

API(/api/vote?flagged=1)는 상품 ID와 누적 표만 돌려주고 개인정보는 저장하지 않습니다.
저장소(Upstash)가 아직 연결되지 않았으면 ok:false 로 오고, 그때는 '확인 불가'로 알립니다.
"""
import argparse
import json
import sys
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "data" / "products.json"


def fetch_flagged(base, min_votes, timeout=15):
    url = f"{base.rstrip('/')}/api/vote?flagged=1&min={min_votes}"
    req = urllib.request.Request(url, headers={"Accept": "application/json", "User-Agent": "ttini-recheck/1.0"})
    with urllib.request.urlopen(req, timeout=timeout) as res:
        return json.loads(res.read().decode("utf-8"))


def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--base", default="https://ttini.kr")
    ap.add_argument("--min", type=int, default=5)
    ap.add_argument("--json", default="")
    ap.add_argument("--wait", type=int, default=0, help="이 분 동안 바뀐 게 없으면 조용히 끝냄(예약 실행용)")
    args = ap.parse_args()

    try:
        data = fetch_flagged(args.base, args.min)
    except (urllib.error.URLError, TimeoutError, json.JSONDecodeError) as err:
        print(f"! 애매해요 목록을 받지 못했어요: {err}")
        return 2

    if not data.get("ok"):
        print(f"! 저장소(Upstash)가 연결돼 있지 않아 표를 셀 수 없어요: {data.get('error')}")
        return 0

    flagged = data.get("flagged") or []
    if not flagged:
        if args.wait:
            print(f"애매해요 {args.min}표 이상 상품 없음 — 점검할 것 없어요.")
        else:
            print(f"애매해요 {args.min}표 이상 상품이 아직 없어요.")
        return 0

    cat = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in cat["products"]}

    rows = []
    for item in flagged:
        pid = item.get("id")
        p = by_id.get(pid)
        rows.append(
            {
                "id": pid,
                "votes": item.get("count"),
                "name": (p or {}).get("name") or "(상품 목록에 없음 — 삭제·이름변경 됐을 수 있음)",
                "price": (p or {}).get("price"),
                "unit_price": (p or {}).get("unitPrice"),
                "checked": (p or {}).get("priceCheckedLabel") or (p or {}).get("priceCheckedAt"),
                "url": (p or {}).get("url"),
                "platform": (p or {}).get("platform"),
            }
        )

    print(f"🤔 애매해요 {args.min}표 이상 · {len(rows)}개 — 가격 재확인 우선 순위\n")
    for i, r in enumerate(rows, 1):
        price = f"{r['price']:,}원" if isinstance(r["price"], int) else "가격 없음"
        print(f"{i:>2}. {r['name']}  [{r['votes']}표]")
        print(f"    {price} · {r['unit_price'] or '단가 없음'} · 확인 {r['checked'] or '기록 없음'}")
        if r["url"]:
            print(f"    {r['url']}")
    missing = [r for r in rows if not r["price"]]
    if missing:
        print(f"\n※ 상품 목록에 없는 ID {len(missing)}개: {', '.join(str(r['id']) for r in missing)}")

    if args.json:
        out = Path(args.json)
        if not out.is_absolute():
            out = ROOT / out
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(
            json.dumps({"at": data.get("at"), "min": args.min, "rows": rows}, ensure_ascii=False, indent=1) + "\n",
            encoding="utf-8",
        )
        print(f"\n저장: {out}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
