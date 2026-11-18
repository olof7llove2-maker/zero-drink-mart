#!/usr/bin/env python3
"""2026-11-18 12:30 타임세일 점검 반영.

- 가격이 실제와 달라진 2종은 가격·단가·단백질 20g당 가격을 다시 계산한다.
  · 하림 자연실록 400g: 6,900 → 6,150 (쿠팡 판매가 인하, 정가 배지 없음)
  · 더단백 드링크 초코 250ml 18개: 23,930 → 24,110
- 값을 확인했지만 변동이 없던 7종은 확인 시각(priceCheckedAt)만 오늘로 올린다.
- `affiliateUrl`·`url`·`image`는 건드리지 않는다.

출력: data/products.json, js/products.js (둘 다 동기화)
사용법: python3 scripts/update_prices_20261118_1230.py
"""
import importlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

U = importlib.import_module("update_prices_20261118")

DATA = U.DATA
JS = U.JS

TS = "2026-11-18 12:45"

# id: 새 가격 (실제로 값이 바뀐 상품만)
CHANGES = {
    "meat-chicken-harim-jayeonsilrok-breast-400g": 6150,
    "deodanbaek-deuringkeu-choko-250ml-18gae": 24110,
}

# 오늘 12:30 실행에서 눈으로 확인한 전 상품 (값 변동이 없어도 확인 시각은 갱신)
CHECKED = [
    "meat-beef-au-buchaesal-steak-600g",
    "meat-beef-gomgom-au-buchaesal-gui-600g",
    "cola-zero",
    "narangd-cider-zero",
    "meat-chicken-harim-iff-breast-2kg",
    "meat-chicken-harim-jayeonsilrok-breast-400g",
    "kalobai-peopekteu-pawosweikeu-beulrende-choko-1-8kg",
    "deodanbaek-deuringkeu-choko-250ml-18gae",
]


# 오늘 상품 페이지에 정가·할인 배지가 없던 상품 (할인율을 지어내지 않는다)
NO_LIST_PRICE = {"meat-chicken-harim-jayeonsilrok-breast-400g"}


def refresh_meat(p, price, ts):
    """원물(100g 단가) 상품 가격 갱신 — 단가·단백질 20g당 가격 재계산."""
    old = p.get("price")
    p["price"] = price
    p["priceCheckedAt"] = ts
    p["priceCheckedLabel"] = U.checked_label(ts)

    grams = p.get("weightG")
    if grams:
        per100 = price / grams * 100
        p["per100g"] = round(per100)
        p["perValue"] = round(per100, 1)
        p["unitPrice"] = f"100g당 {round(per100):,}원"

    protein = p.get("proteinPer100g")
    if grams and isinstance(protein, (int, float)) and protein > 0:
        per20 = round(price / (grams * protein / 100) * 20)
        p["protein20"] = per20
        p["pricePer20gProtein"] = per20

    list_price = p.get("listPrice")
    if p.get("id") in NO_LIST_PRICE:
        # 상품 페이지에 정가·할인 배지가 표시되지 않아 할인율을 만들지 않는다
        p["discountPct"] = None
        p["listPrice"] = None
    elif list_price and list_price > price:
        p["discountPct"] = round((list_price - price) / list_price * 100)
    else:
        # 정가 배지가 사라진 상품은 할인율 표기를 지운다 (없는 할인을 만들지 않는다)
        p["discountPct"] = None
        p["listPrice"] = None

    low = p.get("lowest30d")
    if isinstance(low, (int, float)):
        p["lowest30d"] = min(low, price)
    else:
        p["lowest30d"] = price
    return old


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    missing = [k for k in CHECKED if k not in by_id]
    if missing:
        raise SystemExit(f"상품을 찾지 못했습니다: {missing}")

    for pid, price in CHANGES.items():
        p = by_id[pid]
        if p.get("part") == "meat":
            old = refresh_meat(p, price, TS)
        else:
            old = U.refresh(p, price, TS)
        arrow = "↓" if price < old else "↑"
        diff = price - old
        pct = diff / old * 100
        print(
            f"{p['name']}\n  {old:,}원 {arrow} {price:,}원 "
            f"({diff:+,}원 · {pct:+.1f}% · "
            f"{(str(p['discountPct']) + '% 할인') if p.get('discountPct') else '할인 배지 없음'} · "
            f"{p['unitPrice']})"
        )

    for pid in CHECKED:
        if pid in CHANGES:
            continue
        p = by_id[pid]
        p["priceCheckedAt"] = TS
        p["priceCheckedLabel"] = U.checked_label(TS)
        print(f"확인 시각만 갱신: {p['name']} ({p['price']:,}원)")

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
