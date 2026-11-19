#!/usr/bin/env python3
"""2026-11-20 07:30 타임세일 점검 반영.

- 하림 자연실록 400g: 6,150 → 6,900 (어제 프로모 종료, 정가 7,190원 · 4% 배지 · 와우쿠폰 6,600원)
  사이트가 실제보다 750원(10.9%) 싸게 표시되던 상태를 정정한다.
- 값을 확인했지만 변동이 없던 9종은 확인 시각(priceCheckedAt)만 오늘로 올린다.
- `affiliateUrl`·`url`·`image`는 건드리지 않는다.

출력: data/products.json, js/products.js (둘 다 동기화)
사용법: python3 scripts/update_prices_20261120_0730.py
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

TS = "2026-11-20 07:45"

# 새 정가 (상품 페이지에 정가·할인 배지가 보이는 상품만)
LIST_PRICES = {
    "meat-chicken-harim-jayeonsilrok-breast-400g": 7190,
}

# id: 새 가격 (실제로 값이 바뀐 상품만)
CHANGES = {
    "meat-chicken-harim-jayeonsilrok-breast-400g": 6900,
}

# 오늘 07:30 실행에서 눈으로 확인한 상품 (값 변동이 없어도 확인 시각은 갱신)
CHECKED = [
    "meat-beef-au-buchaesal-steak-600g",
    "meat-beef-gomgom-au-buchaesal-gui-600g",
    "cola-zero",
    "narangd-cider-zero",
    "meat-chicken-harim-iff-breast-2kg",
    "meat-chicken-harim-jayeonsilrok-breast-400g",
    "meat-chicken-harim-jayeonsilrok-breast-1kg-3",
    "kalobai-peopekteu-pawosweikeu-beulrende-choko-1-8kg",
    "deodanbaek-deuringkeu-choko-250ml-18gae",
]

NOTE_UPDATES = {
    "meat-chicken-harim-jayeonsilrok-breast-400g": (
        "상품 페이지 필수표기 정보에서 개당 중량 400g 확인 · 2026-11-20 07:45 조회 시 "
        "쿠팡 판매가 6,900원(정가 7,190원 · 4% 배지, 100g당 1,725원, 와우쿠폰 300원 적용 시 6,600원) · "
        "11-19 12:30~18:30의 6,150원 프로모는 종료 · 400g 2팩 12,240원(100g당 1,530), 8팩 43,960원(100g당 1,374)"
    ),
}


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    missing = [k for k in CHECKED if k not in by_id]
    if missing:
        raise SystemExit(f"상품을 찾지 못했습니다: {missing}")

    for pid, price in CHANGES.items():
        p = by_id[pid]
        if p.get("part") == "meat":
            old = M.refresh_meat(p, price, TS)
        else:
            old = U.refresh(p, price, TS)
        # 정가·할인 배지는 refresh 뒤에 넣는다 (refresh는 배지가 없던 상품의 listPrice를 비운다)
        if pid in LIST_PRICES:
            p["listPrice"] = LIST_PRICES[pid]
            p["discountPct"] = round((LIST_PRICES[pid] - price) / LIST_PRICES[pid] * 100)
        arrow = "↓" if price < old else "↑"
        diff = price - old
        pct = diff / old * 100
        print(
            f"{p['name']}\n  {old:,}원 {arrow} {price:,}원 "
            f"({diff:+,}원 · {pct:+.1f}% · "
            f"{(str(p['discountPct']) + '% 할인') if p.get('discountPct') else '할인 배지 없음'} · "
            f"{p['unitPrice']})"
        )
        if pid in NOTE_UPDATES:
            p["note"] = NOTE_UPDATES[pid]

    for pid in CHECKED:
        if pid in CHANGES:
            continue
        p = by_id[pid]
        p["priceCheckedAt"] = TS
        p["priceCheckedLabel"] = U.checked_label(TS)
        print(f"확인 시각만 갱신: {p['name']} ({p['price']:,}원)")

    data["site"]["updatedAt"] = "2026-11-20"

    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

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
