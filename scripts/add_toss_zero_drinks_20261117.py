#!/usr/bin/env python3
"""토스 쉐어링크 제로음료 추가 — 2026-11-17.

아버님(신승용) 쉐어링크 어드민(11/17 14:00) 전 탭 스캔 결과로 나온 제로음료 핫딜.
- BEST 1위 펩시 제로슈거 피치향 500ml 18개 9,900원 (지금 30일 내 최저가)
- 카테고리 식품 4위 스파클 생수 무라벨 2L 30개 13,900원 (100ml당 24원, 사이트 최저 생수)

두 링크 모두 어드민에서 새로 발급한 아버님 쉐어링크.
기존 스파클 500ml 80개는 오늘 어드민 가격(13,900원·42% 특가)으로 갱신.

출력: data/products.json, js/products.js
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

CHECKED_AT = "2026-11-17 14:00"
CHECKED_LABEL = "11/17 14:00 토스 기준"

PEPSI = {
    "id": "toss-pepsi-jero-syugeo-pichihyang-500ml-18gae",
    "group": "제로 콜라",
    "category": "cola",
    "part": "zero",
    "brand": "펩시",
    "name": "펩시 제로슈거 피치향, 500ml, 18개",
    "kind": "제로 콜라 · 피치",
    "flavor": "피치",
    "price": 9900,
    "listPrice": 28300,
    "discountPct": 65,
    "priceCheckedAt": CHECKED_AT,
    "priceCheckedLabel": CHECKED_LABEL,
    "platform": "toss",
    "previousPrice": None,
    "priceHistoryDays": 1,
    "shareLink": "https://toss.shopping/_m/DhaUTdA4",
    "url": "https://toss.shopping/_m/DhaUTdA4",
    "affiliateUrl": "https://toss.shopping/_m/DhaUTdA4",
    "image": "images/toss-pepsi-jero-syugeo-pichihyang-500ml-18gae.png",
    "volumeMl": 500,
    "packCount": 18,
    "unitPricePer100ml": 110,
    "unitPriceOfficial": "100ml당 110원",
    "unitPrice": "100ml당 110원",
    "unitEach": "1병당 550원",
    "container": "pet-small",
    "caffeine": "contains",
    "aspartame": None,
    "lowest30d": 9900,
    "measure": "per100ml",
    "weightG": None,
    "perValue": 110.0,
    "eachPrice": 550,
    "eachLabel": "병",
    "protein20": None,
    "rating": 4.7,
    "reviewCount": 38,
    "popularScore": 86,
    "note": (
        "11/17 14:00 아버님 토스 쉐어링크 어드민 BEST 1위·'지금 30일 내 최저가' 상품. "
        "선착순특가 9,900원(100ml당 110원) — 같은 펩시 제로 355ml 24개(100ml당 175원)보다 37% 싸요. "
        "정가 28,300원은 토스 표기 할인율 65%에서 역산한 값이에요. 특가가 끝나면 정가로 올라요."
    ),
}

SPARKLE_2L = {
    "id": "toss-seupakeul-saengsu-murabel-2l-30gae",
    "group": "생수",
    "category": "water",
    "part": "zero",
    "brand": "스파클",
    "name": "스파클 생수, 무라벨, 2L, 30개",
    "kind": "생수 · 무라벨",
    "flavor": "생수",
    "price": 13900,
    "listPrice": None,
    "discountPct": None,
    "priceCheckedAt": CHECKED_AT,
    "priceCheckedLabel": CHECKED_LABEL,
    "platform": "toss",
    "previousPrice": None,
    "priceHistoryDays": 1,
    "shareLink": "https://toss.shopping/_m/vL3doUK",
    "url": "https://toss.shopping/_m/vL3doUK",
    "affiliateUrl": "https://toss.shopping/_m/vL3doUK",
    "image": "images/toss-seupakeul-saengsu-murabel-2l-30gae.jpeg",
    "volumeMl": 2000,
    "packCount": 30,
    "unitPricePer100ml": 23,
    "unitPriceOfficial": "100ml당 23원",
    "unitPrice": "100ml당 23원",
    "unitEach": "1병당 463원",
    "container": "pet-large",
    "caffeine": "none",
    "aspartame": "none",
    "lowest30d": 13900,
    "measure": "per100ml",
    "weightG": None,
    "perValue": 23.2,
    "eachPrice": 463,
    "eachLabel": "병",
    "protein20": None,
    "rating": 4.8,
    "reviewCount": 14863,
    "popularScore": 58,
    "note": (
        "11/17 14:00 어드민 '카테고리 인기 상품 > 식품' 4위, 판매자 스파클 공식·국산생수 3위. "
        "13,900원(100ml당 23원)으로 사이트 생수 중 가장 싸요(에브리워터 2L 18개 100ml당 25원). "
        "토스 웹 상세는 가격을 QR로만 보여 줘서 어드민 카드 가격 기준이에요."
    ),
}


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))

    for product in (PEPSI, SPARKLE_2L):
        existing = [p for p in data["products"] if p["id"] == product["id"]]
        if existing:
            existing[0].update(product)
        else:
            data["products"].append(dict(product))

    # 기존 스파클 500ml 80개 — 오늘 어드민 가격으로 갱신
    for p in data["products"]:
        if p["id"] == "toss-seupakeul-saengsu-murabel-500ml-80gae":
            p["previousPrice"] = p.get("price")
            p["price"] = 13900
            p["discountPct"] = 42
            p["unitPricePer100ml"] = 35
            p["unitPriceOfficial"] = "100ml당 35원"
            p["unitPrice"] = "100ml당 35원"
            p["unitEach"] = "1병당 174원"
            p["perValue"] = 34.8
            p["eachPrice"] = 174
            p["priceCheckedAt"] = CHECKED_AT
            p["priceCheckedLabel"] = CHECKED_LABEL
            p["note"] = (
                "11/17 14:00 어드민 기준 13,900원(42% 특가·100ml당 35원). "
                "11/16 기록한 12,800원 특가가 끝나 1,100원 올랐어요."
            )
            break

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
