#!/usr/bin/env python3
"""2026-11-19 21:00 정기 가격 점검 반영.

쿠팡 상품 페이지를 로그인 세션(브라우저)으로 직접 확인한 5종만 반영한다.
  · 하늘보리 500ml 20개: 14,100 → 14,890 (+5.6%) — 사이트가 실제보다 790원 낮게 표시되던 상태
  · 갈배사이다 제로 355ml 24개: 13,260 → 13,220 (-40원, 33% 할인·정가 19,900)
  · 햇반 발아현미밥 210g 24개: 29,200 → 29,180 (-20원, 47% 할인·정가 55,140)
  · 링티 제로 복숭아 24개 500ml: 21,200 그대로 (69% 할인) — 확인 시각만 갱신
  · 보성홍차 아이스티 제로 애플+샤인머스캣 24개 500ml: 16,900 그대로 (67% 할인) — 확인 시각만 갱신
또한 `priceCheckedAt`이 "2026-11-17 09:50~10:40"처럼 시각 범위로 적혀 있어
화면의 'N일 전 확인' 계산이 깨지던 단백질 쉐이크 10종의 확인 시각을
그 점검 창의 마지막 시각(2026-11-17 10:40)으로 정리한다.

`affiliateUrl`·`url`·`image`는 절대 건드리지 않는다.

출력: data/products.json, js/products.js (둘 다 동기화)
사용법: python3 scripts/update_prices_20261119_2100.py
"""
import importlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

U = importlib.import_module("update_prices_20261118")
M = importlib.import_module("update_prices_20261118_1230")

DATA = U.DATA
JS = U.JS

# 상품별 실제 확인 시각 (2026-11-19 밤, 쿠팡 상품 페이지 직접 확인)
CHANGES = {
    "haneulbori-500ml-20gae": (14890, "2026-11-19 21:09"),
    "haetaehtb-galbaesaida-jero-355ml-24gae": (13220, "2026-11-19 21:07"),
    "retort-rice-haetban-baeahyeonmi-210g-24": (29180, "2026-11-19 20:57"),
}

# 값은 그대로지만 오늘 눈으로 확인한 상품 (확인 시각만 갱신)
CHECKED_ONLY = {
    "ringti-jero-boksungamat-24gae-500ml": "2026-11-19 21:06",
    "boseonghongcha-aiseuti-jero-aepeul-syainmeoseukaet-500ml-24gae": "2026-11-19 21:08",
}

# 확인 시각이 범위 문자열이라 화면 계산이 깨지던 상품 → 점검 창의 마지막 시각으로 정리
BROKEN_TS = {
    "shake-newyorkwhey-light-2kg": "2026-11-17 10:40",
    "shake-itthefit-protein-shake-double-choco-35p": "2026-11-17 10:40",
    "shake-bsn-syntha6-isolate-chocolate-1-82kg": "2026-11-17 10:40",
    "shake-optimum-gold-standard-double-rich-chocolate-2-29kg": "2026-11-17 10:40",
    "shake-bsn-syntha6-chocolate-milkshake-2-27kg": "2026-11-17 10:40",
    "shake-dymatize-iso100-gourmet-chocolate-2-3kg": "2026-11-17 10:40",
    "shake-myprotein-impact-whey-chocolate-2-5kg": "2026-11-17 10:40",
    "shake-bsn-syntha6-strawberry-milkshake-2-27kg": "2026-11-17 10:40",
    "shake-musclepharm-combat-ultra-whey-banana-2-25kg": "2026-11-17 10:40",
    "shake-kkobakkkobab-plus-double-choco-7p": "2026-11-17 10:40",
}


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    missing = [k for k in list(CHANGES) + list(CHECKED_ONLY) + list(BROKEN_TS) if k not in by_id]
    if missing:
        raise SystemExit(f"상품을 찾지 못했습니다: {missing}")

    for pid, (price, ts) in CHANGES.items():
        p = by_id[pid]
        old = M.refresh_meat(p, price, ts) if p.get("weightG") else U.refresh(p, price, ts)
        arrow = "↓" if price < old else "↑"
        diff = price - old
        print(
            f"{p['name']}\n  {old:,}원 {arrow} {price:,}원 ({diff:+,}원 · {diff / old * 100:+.1f}%) "
            f"· 할인 {p.get('discountPct')}% · {p['unitPrice']} · {p.get('unitEach')} [{ts}]"
        )

    for pid, ts in CHECKED_ONLY.items():
        p = by_id[pid]
        U.refresh(p, p["price"], ts)
        print(f"{p['name']}\n  {p['price']:,}원 그대로 · {p.get('discountPct')}% · {p['unitPrice']} [{ts}]")

    for pid, ts in BROKEN_TS.items():
        p = by_id[pid]
        before = p.get("priceCheckedAt")
        p["priceCheckedAt"] = ts
        p["priceCheckedLabel"] = U.checked_label(ts)
        print(f"{p['name']}\n  확인 시각 정리: {before!r} → {ts}")

    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # js/products.js 재생성 (다른 스크립트와 같은 방식)
    text = JS.read_text(encoding="utf-8")
    header = text[: text.index("const SITE = ")]

    def block(name, value):
        return "const " + name + " = " + json.dumps(value, ensure_ascii=False, indent=2) + ";\n"

    js = header
    js += block("SITE", data["site"]) + "\n"
    js += block("CATEGORIES", data["categories"]) + "\n"
    js += block("PARTS", data["parts"]) + "\n"
    js += block("SORTS", data["sorts"]) + "\n"
    js += block("CONTAINERS", data["containers"]) + "\n"
    js += block("INGREDIENT_FILTERS", data["ingredientFilters"]) + "\n"
    js += block("PRODUCTS", data["products"])
    JS.write_text(js, encoding="utf-8")
    print(f"\n상품 {len(data['products'])}종 · data/products.json + js/products.js 동기화 완료")


if __name__ == "__main__":
    main()
