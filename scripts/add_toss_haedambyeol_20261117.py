#!/usr/bin/env python3
"""토스 쉐어링크 상품 추가 — 해담별 제주 흑돼지 왕구이 (2026-11-17).

재영 님 지시(11-17): 토스 링크는 외부인 링크라 쓰지 않고, 아버님(신승용) 쉐어링크
어드민에서 새로 발급한 링크를 쓴다. → https://toss.shopping/_m/DJkSWeOy
분류는 🍕 치팅·간편식 (제육·양념육).

출력: data/products.json, js/products.js
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

PRODUCT = {
    "id": "toss-haedambyeol-jeju-heukdwaeji-wang-gui-1-2kg-2",
    "group": "제육·양념육",
    "category": "jeyuk",
    "categoryId": "jeyuk",
    "part": "cheat",
    "brand": "해담별",
    "name": "해담별 제주 흑돼지 왕구이, 1.2kg, 2개",
    "kind": "제주 흑돼지 양념 왕구이",
    "price": 13900,
    "listPrice": 15900,
    "discountPct": 13,
    "priceCheckedAt": "2026-11-17 12:52",
    "priceCheckedLabel": "11/17 12:52 토스 기준",
    "platform": "toss",
    "url": "https://toss.shopping/_m/DJkSWeOy",
    "affiliateUrl": "https://toss.shopping/_m/DJkSWeOy",
    "image": "images/toss-haedambyeol-jeju-heukdwaeji-wang-gui-1-2kg-2.jpg",
    "rating": 4.2,
    "reviewCount": 4026,
    "packCount": 2,
    "weightG": 2400,
    "per100g": 579,
    "unitPrice": "100g당 579원",
    "eachPrice": None,
    "unitEach": "1.2kg × 2팩",
    "measure": "per100g",
    "perValue": 579.2,
    "note": (
        "1.2kg×2팩 = 2.4kg. 11/17 12:52 아버님 토스 쉐어링크 어드민 기준 "
        "선착순특가 13,900원(100g당 579원) / 정가 15,900원(100g당 663원) — "
        "특가가 끝나면 15,900원으로 올라요. 양념·가공육이라 단백질·지방은 표기하지 않았어요"
    ),
    "popularScore": 44.3,
}


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    existing = [p for p in data["products"] if p["id"] == PRODUCT["id"]]
    if existing:
        existing[0].update(PRODUCT)
    else:
        data["products"].append(dict(PRODUCT))

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
    print("상품", len(data["products"]), counts)


if __name__ == "__main__":
    main()
