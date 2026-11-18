#!/usr/bin/env python3
"""그록봇이 넘긴 최신 가격 4종 반영 (2026-11-18).

가격만 바꾸면 단가·할인율·단백질 20g당 가격이 옛 값으로 남으므로,
같은 스크립트에서 파생 필드를 다시 계산한다.
`affiliateUrl`·`url` 은 절대 건드리지 않는다.

출력: data/products.json, js/products.js (둘 다 동기화)
사용법: python3 scripts/update_prices_20261118.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

# id: (새 가격, 확인 시각)
UPDATES = {
    "deodanbaek-deuringkeu-dakeuchoko-330ml-12gae": (27760, "2026-11-17 19:02"),
    "deodanbaek-deuringkeu-keopi-a-250ml-18gae": (23930, "2026-11-17 11:03"),
    "deodanbaek-deuringkeu-choko-250ml-18gae": (23930, "2026-11-17 21:02"),
    "teikeupit-maekseu-chokomat-peurotin-250ml-24gae": (29900, "2026-11-16 05:02"),
}


def checked_label(ts):
    month, day = ts[5:7], ts[8:10]
    return f"{int(month)}/{int(day)} {ts[11:16]} 쿠팡 기준"


def refresh(p, price, ts):
    old = p.get("price")
    p["price"] = price
    p["priceCheckedAt"] = ts
    p["priceCheckedLabel"] = checked_label(ts)

    pack = p.get("packCount") or 1
    each = round(price / pack)
    p["eachPrice"] = each
    p["eachLabel"] = p.get("eachLabel") or "병"
    p["unitEach"] = f"1{p['eachLabel']}당 {each:,}원"
    if "bottlePrice" in p:
        p["bottlePrice"] = each

    ml = p.get("volumeMl")
    if ml:
        per100 = price / (ml * pack) * 100
        p["perValue"] = round(per100, 1)
        p["unitPricePer100ml"] = round(per100)
        p["unitPrice"] = f"100ml당 {round(per100)}원"
        # 쿠팡이 적어 둔 10ml당 표기와 계산값이 어긋나면 계산값으로 맞춘다
        official = p.get("unitPriceOfficial")
        if isinstance(official, str) and official.startswith("10ml당"):
            per10 = round(price / (ml * pack) * 10)
            if official != f"10ml당 {per10:,}원":
                p["unitPriceOfficial"] = f"10ml당 {per10:,}원"
                p["unitPriceRecomputedFrom"] = p["unitPriceOfficial"]

    grams = p.get("protein_g_per_bottle")
    if isinstance(grams, (int, float)) and grams > 0:
        per20 = round(each / grams * 20)
        p["protein20"] = per20
        p["pricePer20gProtein"] = per20
        p["proteinPerG"] = round(each / grams)

    list_price = p.get("listPrice")
    if list_price:
        p["discountPct"] = round((list_price - price) / list_price * 100)
    elif list_price == 0:
        p["discountPct"] = None

    low = p.get("lowest30d")
    if isinstance(low, (int, float)):
        p["lowest30d"] = min(low, price)
    else:
        p["lowest30d"] = price

    return old


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}
    missing = [k for k in UPDATES if k not in by_id]
    if missing:
        raise SystemExit(f"상품을 찾지 못했습니다: {missing}")

    for pid, (price, ts) in UPDATES.items():
        p = by_id[pid]
        old = refresh(p, price, ts)
        arrow = "↓" if price < old else "↑"
        print(
            f"{p['name']}\n  {old:,}원 {arrow} {price:,}원 "
            f"({p['discountPct'] if p['discountPct'] is not None else '-'}% 할인 · "
            f"{p['unitPrice']} · {p['unitEach']} · 단백질20g당 {p['protein20']:,}원) "
            f"[{p['priceCheckedLabel']}]"
        )

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
