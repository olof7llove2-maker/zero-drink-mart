#!/usr/bin/env python3
"""치팅·간편식 재분류 + 굽네 훈제 닭가슴살 슬라이스 12팩 추가 (2026-11-17).

재영 님 지시(11-17):
  - 굽네 훈제 닭가슴살 슬라이스 세트는 식단 고기가 아니라 즉석식품 → 🍕 치팅·간편식
  - 닭가슴살 스테이크·훈제/스팀/소스 닭가슴살·제육/양념육도 🍕 치팅·간편식으로 이동
  - 🥩 식단 고기에는 생고기·원물(소·돼지·생닭·양·오리·연어)·계란·조리기구만
  - 오리훈제슬라이스는 식단 고기에 그대로 둔다

출력: data/products.json, js/products.js
"""
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

READY_CAT = {"id": "ready", "label": "간편 닭가슴살", "icon": "🍗", "part": "cheat"}

NEW_PRODUCT = {
    "id": "retort-ready-gubne-hunje-breast-12pack",
    "group": "간편 닭가슴살",
    "category": "ready",
    "categoryId": "ready",
    "part": "cheat",
    "brand": "굽네",
    "name": "굽네 훈제 닭가슴살 슬라이스 오리지널 8팩 + 스파이시 4팩 세트 (냉동), 100g, 12개",
    "kind": "훈제 닭가슴살 슬라이스 · 그대로 먹는 즉석육",
    "price": 12820,
    "listPrice": 14250,
    "discountPct": 10,
    "priceCheckedAt": "2026-11-17 12:47",
    "priceCheckedLabel": "11/17 12:47 쿠팡 기준",
    "platform": "coupang",
    "url": "https://www.coupang.com/vp/products/5711358485?itemId=9523123413&vendorItemId=76807854065",
    "affiliateUrl": "https://www.coupang.com/vp/products/5711358485?itemId=9523123413&vendorItemId=76807854065",
    "image": "images/retort-ready-gubne-hunje-breast-12pack.jpg",
    "rating": 4.6,
    "reviewCount": 1145,
    "packCount": 12,
    "weightG": 1200,
    "per100g": 1068,
    "unitPrice": "100g당 1,068원",
    "eachPrice": None,
    "unitEach": "100g × 12팩",
    "proteinPer100g": 24.0,
    "fatPer100g": 1.3,
    "nutritionBasis": "제품 영양성분표",
    "nutritionNote": "오리지널 100g당 단백질 24g·지방 1.3g(115kcal), 스파이시 100g당 25g·1.4g(120kcal). 낮은 쪽(오리지널) 기준으로 적었어요",
    "nutritionLabel": "100g당 단백질 24~25g · 지방 1.3~1.4g (제품 표기)",
    "nutritionCheckedAt": "2026-11-17 12:47",
    "nutritionCheckedLabel": "제품 영양성분표(11/17 확인)",
    "measure": "per100g",
    "perValue": 1068.3,
    "protein20": 890,
    "pricePer20gProtein": 890,
    "note": "100g×12팩(오리지널 8 + 스파이시 4) = 1.2kg. 쿠팡판매가 14,250원에 쿠폰 1,430원(10%) 적용가 12,820원. 11/17 12:47 기준 일시품절 — 재입고·가격 변동 가능",
    "shipNote": "일시품절 · 15,000원 이상 무료배송(로켓프레시)",
    "popularScore": 48.0,
}

MEAT_NOTE = "소·돼지·닭·양·오리·연어 생고기와 계란·조리기구를 모았어요."
CHEAT_NOTE = "즉석밥·캔·간편식·간편 닭가슴살·양념육·소스·베이글까지."


def move_category(cats, cat_id, part):
    for c in cats:
        if c["id"] == cat_id:
            c["part"] = part


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))

    # ── 카테고리 ─────────────────────────────────────────
    for c in data["categories"]:
        if c["id"] == "jeyuk":
            c["part"] = "cheat"
    ids = [c["id"] for c in data["categories"]]
    if "ready" not in ids:
        pos = ids.index("meal") + 1
        data["categories"].insert(pos, dict(READY_CAT))

    # ── 대분류 필터 ──────────────────────────────────────
    parts = {p["id"]: p for p in data["parts"]}
    meat = parts["meat"]
    meat["note"] = MEAT_NOTE
    meat["filters"] = [f for f in meat["filters"] if f["id"] != "jeyuk"]
    meat["filters"][0]["cats"] = ["beef", "pork", "chicken", "egg", "lamb", "duck", "salmon", "gadget"]

    cheat = parts["cheat"]
    cheat["note"] = CHEAT_NOTE
    cheat["filters"][0]["cats"] = ["rice", "can", "meal", "ready", "jeyuk", "sauce", "snack", "bakery"]
    cheat_ids = [f["id"] for f in cheat["filters"]]
    if "ready" not in cheat_ids:
        idx = [f["id"] for f in cheat["filters"]].index("meal") + 1
        cheat["filters"].insert(idx, {"id": "ready", "label": "간편 닭가슴살", "icon": "🍗", "cats": ["ready"]})
    if "jeyuk" not in [f["id"] for f in cheat["filters"]]:
        jeyuk_chip = {"id": "jeyuk", "label": "제육·양념육", "icon": "🍲", "cats": ["jeyuk"]}
        idx = [f["id"] for f in cheat["filters"]].index("ready") + 1
        cheat["filters"].insert(idx, jeyuk_chip)

    # 카테고리 배열도 대분류·칩 순서대로 정리
    order = ["all"]
    for part in data["parts"]:
        if part["id"] == "all":
            continue
        for f in part["filters"]:
            for cid in f["cats"]:
                if cid not in order:
                    order.append(cid)
    by_id = {c["id"]: c for c in data["categories"]}
    data["categories"] = [by_id[c] for c in order if c in by_id]

    # ── 상품 재분류 ──────────────────────────────────────
    moved = []
    for p in data["products"]:
        if p["id"] == "toss-chefchoice-jeyuk-2kg":
            p["part"] = "cheat"
            moved.append(p["id"])
        elif p["id"] == "meat-chicken-deohadak-steak-original-30x90g":
            p["part"] = "cheat"
            p["category"] = "ready"
            p["categoryId"] = "ready"
            p["group"] = "간편 닭가슴살"
            moved.append(p["id"])

    # ── 신규 상품 ────────────────────────────────────────
    existing = [p for p in data["products"] if p["id"] == NEW_PRODUCT["id"]]
    if existing:
        existing[0].update(NEW_PRODUCT)
    else:
        data["products"].append(dict(NEW_PRODUCT))

    # 인기 점수: 브랜드(굽네=6) + 리뷰 log10(1146)*7≈21.4 + 4(리뷰 1000+) + 쿠폰할인 10%*0.7=7 → 38.4
    for p in data["products"]:
        if p["id"] == NEW_PRODUCT["id"]:
            p["popularScore"] = 38.4

    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── js/products.js 재생성 ────────────────────────────
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
    print("이동", moved)


if __name__ == "__main__":
    main()
