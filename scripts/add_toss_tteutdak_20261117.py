#!/usr/bin/env python3
"""토스 쉐어링크 상품 추가 — 떴닭 로스트 치킨, 1kg, 2개 (2026-11-17).

재영 님 지시(11-17 15:21): "떴닭 로스트 치킨, 1kg, 2개 12,920원 / 이거넣자"
→ 아버님(신승용) 토스 쉐어링크 https://toss.shopping/_m/JfmTbWb8
→ 카테고리 🍕 치팅·간편식 > 간편 닭가슴살(ready). 기존 '굽네 훈제 닭가슴살'과 같은
   '그대로 먹는 간편 닭구이' 규칙을 따른다.

확인한 값(2026-11-17 15:41 토스쇼핑 상품 페이지):
  - 평점 4.5 · 리뷰 3,674개
  - 판매자 (주)예찬F&S (베스트판매자) · 내일 출발 · 모레 도착 예정 · 양념·가공육 21위
  - 썸네일: 토스쇼핑 상품 대표 이미지(images/toss-tteutdak-roast-chicken-1kg-2.jpg)
  - 정가·할인율: 페이지에 표기 없음(모바일 웹은 QR로 앱 안내만) → null로 둔다.

가격 12,920원은 재영 님이 앱에서 확인해 보낸 값이다(100g당 646원 = 12,920/2,000g).

출력: data/products.json, js/products.js
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

PRODUCT = {
    "id": "toss-tteutdak-roast-chicken-1kg-2",
    "group": "간편 닭가슴살",
    "category": "ready",
    "categoryId": "ready",
    "part": "cheat",
    "brand": "떴닭",
    "name": "떴닭 로스트 치킨, 1kg, 2개",
    "kind": "로스트 치킨 · 양념구이 통닭",
    "price": 12920,
    "listPrice": None,
    "discountPct": None,
    "priceCheckedAt": "2026-11-17 15:21",
    "priceCheckedLabel": "11/17 15:21 토스 기준",
    "platform": "toss",
    "url": "https://toss.shopping/_m/JfmTbWb8",
    "affiliateUrl": "https://toss.shopping/_m/JfmTbWb8",
    "image": "images/toss-tteutdak-roast-chicken-1kg-2.jpg",
    "rating": 4.5,
    "reviewCount": 3674,
    "packCount": 2,
    "weightG": 2000,
    "per100g": 646,
    "unitPrice": "100g당 646원",
    "unitEach": "1kg 1개당 6,460원",
    "eachPrice": 6460,
    "eachLabel": "개",
    "measure": "per100g",
    "perValue": 646.0,
    "protein20": None,
    "note": (
        "1kg×2개 = 2kg. 아버님 토스 쉐어링크, 12,920원(100g당 646원). "
        "토스쇼핑은 모바일 웹에 가격·정가를 안 띄우고 앱 QR만 안내해서 "
        "정가·할인율은 표기하지 않았어요(앱에서 확인한 값은 재영 님 제공). "
        "양념·가공육이라 단백질·지방은 적지 않았어요"
    ),
    "shipNote": "내일 출발 · 모레 도착 예정 · (주)예찬F&S",
    "popularScore": 34.96,
}


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    products = [p for p in data["products"] if p["id"] != PRODUCT["id"]]
    products.append(dict(PRODUCT))
    products.sort(key=lambda p: (-(p.get("popularScore") or 0), p.get("perValue") or 10 ** 9))
    data["products"] = products

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
    if not js.endswith("\n"):
        js += "\n"
    JS.write_text(js, encoding="utf-8")

    counts = {}
    for p in data["products"]:
        counts[p["part"]] = counts.get(p["part"], 0) + 1
    print("상품", len(data["products"]), counts)
    print("치팅·간편식 ready:", sum(1 for p in data["products"] if p.get("category") == "ready"))


if __name__ == "__main__":
    main()
