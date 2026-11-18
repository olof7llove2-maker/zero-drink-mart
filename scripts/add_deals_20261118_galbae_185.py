#!/usr/bin/env python3
"""2026-11-18 재영 님이 공유한 갈배사이다 제로 185ml×30 추가.

상품: 해태htb 갈배사이다 제로, 185ml, 30개 (쿠팡상품번호 7604723347 - 22946610409)
- 참고 링크(다른 사람 파트너스 링크)는 쓰지 않고, 실제 상품 페이지에서 값을 확인했다.
- 2026-11-18 13:15 상품 페이지: 와우할인가 20% 11,280원 → 9,020원(100ml당 163원),
  일반판매가 11,280원(100ml당 203원). 상품평 31,592(별 5점), 로켓배송.
- 링크는 아버님(신승용) 쿠팡 파트너스 AF5520784 세션에서 2026-11-18 13:20에 새로 발급한
  단축 링크(iLRq75LEXI)를 붙인다. 리다이렉트 최종 주소에 lptag=AF5520784 확인.

출력: data/products.json, js/products.js
사용법: python3 scripts/add_deals_20261118_galbae_185.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

CHECKED = "2026-11-18 13:15"
CHECKED_LABEL = "11/18 13:15 쿠팡 기준"

GALBAE_185 = {
    "id": "haetaehtb-galbaesaida-jero-185ml-30gae",
    "part": "zero",
    "group": "제로 사이다",
    "category": "cider",
    "brand": "갈배사이다",
    "name": "해태htb 갈배사이다 제로, 185ml, 30개",
    "kind": "제로 사이다",
    "flavor": "사이다",
    "price": 9020,
    "listPrice": 11280,
    "discountPct": 20,
    "priceCheckedAt": CHECKED,
    "priceCheckedLabel": CHECKED_LABEL,
    "platform": "coupang",
    "url": "https://www.coupang.com/vp/products/7604723347?itemId=22946610409",
    "affiliateUrl": "https://link.coupang.com/a/iLRq75LEXI",
    "image": "images/haetaehtb-galbaesaida-jero-185ml-30gae.jpg",
    "volumeMl": 185,
    "packCount": 30,
    "container": "can",
    "caffeine": "none",
    "aspartame": None,
    "rating": 5.0,
    "reviewCount": 31592,
    "measure": "per100ml",
    "eachLabel": "캔",
    "note": (
        "9,020원(100ml당 163원)은 와우회원 할인가(정가 11,280원에서 20%)예요. "
        "와우가 아니면 11,280원(100ml당 203원)이에요. 1캔 301원이라 작은 캔을 한 번에 마시기 좋아요. "
        "355ml×24개(13,260원·100ml당 156원)보다 100ml 단가는 조금 높지만 총액과 캔 크기는 이쪽이 가벼워요. "
        "상품평 31,592·별 5점·로켓배송. 아버님 쿠팡 파트너스 단축 링크로 연결했어요."
    ),
}


def popular_score(p):
    score = 40  # 갈배사이다는 build_v5_20261117.py의 BRAND_1(대표 브랜드) = 40점
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
    total = out["volumeMl"] * out["packCount"]
    per = round(price / total * 100)
    out["unitPricePer100ml"] = per
    out["unitPriceOfficial"] = f"100ml당 {per:,}원"
    out["unitPrice"] = f"100ml당 {per:,}원"
    out["perValue"] = round(price / total * 100, 1)
    each = round(price / out["packCount"])
    out["eachPrice"] = each
    out["unitEach"] = f"1{out.get('eachLabel', '개')}당 {each:,}원"
    out["protein20"] = None
    out["popularScore"] = popular_score(out)
    return out


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    prod = build(GALBAE_185)
    if prod["id"] in by_id:
        by_id[prod["id"]].update(prod)
        state = "갱신"
    else:
        data["products"].append(prod)
        state = "신규"

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
    print(state, prod["id"])
    print("상품", len(data["products"]), counts)
    print(f"  {prod['price']:,}원 · perValue {prod['perValue']} · {prod['unitEach']} · popularScore {prod['popularScore']}")


if __name__ == "__main__":
    main()
