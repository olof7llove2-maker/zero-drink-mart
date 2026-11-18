#!/usr/bin/env python3
"""2026-11-18 12:30 점검에서 발굴한 신규 특가 2종 추가.

1) HF 국내산 냉장 닭가슴살, 1kg, 5개 — 36,900원(100g당 738원) · 🥩 식단 고기 > 닭고기
2) 탐스제로 파인애플 탄산음료, 355ml, 24개 — 11,700원(100ml당 137원) · 🥤 제로 음료 > 제로 사이다

링크는 둘 다 아버님(신승용) 쿠팡 파트너스 계정(AF5520784)에서 2026-11-18 12:44~12:47에
새로 발급한 단축 링크를 붙인다(탐스제로는 PB가 아니라 롯데칠성 상품이라 발급됐다).

출력: data/products.json, js/products.js
사용법: python3 scripts/add_deals_20261118_hf_tams.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

CHECKED = "2026-11-18 12:45"
CHECKED_LABEL = "11/18 12:45 쿠팡 기준"

HF = {
    "id": "meat-chicken-hf-guknaesan-naengjang-breast-1kg-5",
    "group": "닭고기",
    "category": "chicken",
    "categoryId": "chicken",
    "part": "meat",
    "meatType": "닭고기",
    "cut": "닭가슴살",
    "cutGroup": "닭가슴살",
    "brand": "HF",
    "name": "HF 국내산 냉장 닭가슴살, 1kg, 5개",
    "kind": "국내산 닭가슴살 · 냉장 1kg×5",
    "price": 36900,
    "listPrice": None,
    "discountPct": None,
    "priceCheckedAt": CHECKED,
    "priceCheckedLabel": CHECKED_LABEL,
    "platform": "coupang",
    "url": "https://www.coupang.com/vp/products/9341582482?itemId=27704737899&vendorItemId=91532096539",
    "affiliateUrl": "https://link.coupang.com/a/iLON2xhJIa",
    "image": "images/meat-chicken-hf-guknaesan-naengjang-breast-1kg-5.jpg",
    "rating": 5.0,
    "reviewCount": 6159,
    "weightG": 5000,
    "packCount": 5,
    "per100g": 738,
    "unitPrice": "100g당 738원",
    "unitEach": "1팩(1kg)당 7,380원",
    "eachPrice": 7380,
    "eachLabel": "팩",
    "proteinPer100g": 23.0,
    "fatPer100g": 1.3,
    "nutritionBasis": "부위 기준 참고치",
    "nutritionNote": "제품 영양성분표가 없는 원물이라 국가표준식품성분표·USDA 부위 표준값 참고치예요",
    "nutritionLabel": "100g당 단백질 ~23.0g · 지방 ~1.3g (부위 기준)",
    "measure": "per100g",
    "note": (
        "36,900원(100g당 738원). 국내산 냉장 닭가슴살 1kg 5팩 묶음, 판매자 배송(우체국택배). "
        "평점 5.0·리뷰 6,159. 정가 표기가 없어 할인율은 비워 뒀어요. "
        "아버님 쿠팡 파트너스 단축 링크로 연결했어요."
    ),
}

TAMS = {
    "id": "tamseu-jero-painaepeul-355ml-24gae",
    "part": "zero",
    "group": "제로 사이다",
    "category": "cider",
    "brand": "탐스제로",
    "name": "탐스제로 파인애플 탄산음료, 355ml, 24개",
    "kind": "제로 사이다 · 파인애플",
    "flavor": "파인애플",
    "price": 11700,
    "listPrice": 13270,
    "discountPct": 11,
    "priceCheckedAt": CHECKED,
    "priceCheckedLabel": CHECKED_LABEL,
    "platform": "coupang",
    "url": "https://www.coupang.com/vp/products/8745000733?itemId=22895376284&vendorItemId=94009969105",
    "affiliateUrl": "https://link.coupang.com/a/iLOQP6whFs",
    "volumeMl": 355,
    "packCount": 24,
    "unitPriceOfficial": "100ml당 137원",
    "unitPricePer100ml": 137,
    "unitPrice": "100ml당 137원",
    "unitEach": "1캔당 488원",
    "eachPrice": 488,
    "eachLabel": "캔",
    "image": "images/tamseu-jero-painaepeul-355ml-24gae.jpg",
    "container": "can",
    "caffeine": "none",
    "aspartame": None,
    "rating": 5.0,
    "reviewCount": 5050,
    "measure": "per100ml",
    "note": (
        "13,270원 → 11,700원(100ml당 137원), 쿠폰 1,570원 적용가. 로켓배송·평점 5.0·리뷰 5,050, 캔 355ml×24. "
        "제로 탄산 중 100ml당 단가가 가장 낮은 축이에요. 쿠폰이 끝나면 13,270원(100ml당 156원)으로 올라가요. "
        "아버님 쿠팡 파트너스 단축 링크로 연결했어요."
    ),
}


def brand_weight(brand):
    # build_v5_20261117.py와 같은 기준. HF·탐스제로는 대표/준주력 목록에 없어 6점.
    return 6


def popular_score(p):
    score = brand_weight(p.get("brand"))
    rc = p.get("reviewCount") or 0
    if rc:
        score += min(30, math.log10(rc + 1) * 7)
        if rc >= 1000:
            score += 4
    if p.get("discountPct"):
        score += min(26, p["discountPct"] * 0.7)
    if p.get("rating") and p["rating"] >= 4.8 and rc > 500:
        score += 2
    return round(score, 2)


def build(p):
    out = dict(p)
    price = out["price"]
    if out.get("weightG"):
        per = round(price / out["weightG"] * 100)
        out["per100g"] = per
        out["perValue"] = round(price / out["weightG"] * 100, 1)
        g100 = out.get("proteinPer100g")
        if g100:
            out["protein20"] = round(per / g100 * 20)
            out["pricePer20gProtein"] = out["protein20"]
        else:
            out["protein20"] = None
    else:
        per = round(price / (out["volumeMl"] * out["packCount"]) * 100)
        out["unitPricePer100ml"] = per
        out["unitPriceOfficial"] = f"100ml당 {per:,}원"
        out["unitPrice"] = f"100ml당 {per:,}원"
        out["perValue"] = round(price / (out["volumeMl"] * out["packCount"]) * 100, 1)
        each = round(price / out["packCount"])
        out["eachPrice"] = each
        out["unitEach"] = f"1{out.get('eachLabel', '개')}당 {each:,}원"
        out["protein20"] = None
    out["popularScore"] = popular_score(out)
    return out


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    added, updated = [], []
    for row in (HF, TAMS):
        prod = build(row)
        if prod["id"] in by_id:
            by_id[prod["id"]].update(prod)
            updated.append(prod["id"])
        else:
            data["products"].append(prod)
            added.append(prod["id"])

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

    counts = {}
    for p in data["products"]:
        counts[p["part"]] = counts.get(p["part"], 0) + 1
    print("신규", added, "갱신", updated)
    print("상품", len(data["products"]), counts)
    for pid in added + updated:
        p = {x["id"]: x for x in data["products"]}[pid]
        print(f"  {pid}: {p['price']:,}원 · perValue {p['perValue']} · popularScore {p['popularScore']}")


if __name__ == "__main__":
    main()
