#!/usr/bin/env python3
"""2026-11-18 재영 님이 공유한 지민푸드 통통왕족발 800g 1팩 추가.

상품: 지민푸드 통통왕족발, 800g, 1팩 — 8,800원(100g당 1,100원)
- 참고 링크(타인 토스 쉐어링크 toss.shopping/_m/fpA4Wvq9)는 쓰지 않았다.
- 일반 상품 주소 https://toss.shopping/t/1333835493 로 상품을 확인한 뒤,
  아버님(신승용) 토스 쉐어링크 세션에서 이 상품 링크를 새로 발급받아 붙였다.
  발급 링크 https://toss.shopping/_m/dYjmZ2Uw → 리다이렉트 최종 주소에
  k=00efd5e2-…&referrer=affiliate 확인(2026-11-18 13:31).
- 확인한 값(상품 페이지 11/18 13:29): 평점 4.6 · 리뷰 2,800개 · 판매자 지민푸드 ·
  내일 도착 예정 · '족발 2위' 배지. 상세 스펙(원재료·중량 외)은 이미지라 적지 않았다.
- 가격: 쉐어링크 어드민 '링크 관리' 2026.11.18. 판매가 8,800원(수수료 5%).
  토스쇼핑 웹은 가격·정가를 안 띄우고 앱 QR만 안내해서 정가·할인율은 null로 둔다.
- 같은 상품 2팩 구성(16,800원·100g당 1,050원, 리뷰 3,219)이 어드민 '구매 전환율' 목록에
  있어 안내문에 함께 적었다(둘 다 11/18 13:33 확인).
- 카테고리: 🍕 치팅·간편식 > 간편식·면·국(meal). tip 은 카테고리 기본 문구
  ('전자레인지 2분이면 한 끼')가 이 상품과 안 맞아 상품별 문구로 덮어썼다.

출력: data/products.json, data/price-history.json, js/products.js
사용법: python3 scripts/add_toss_jimin_jokbal_20261118.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
HIST = ROOT / "data" / "price-history.json"
JS = ROOT / "js" / "products.js"

CHECKED = "2026-11-18 13:30"
CHECKED_LABEL = "11/18 13:30 토스 기준"

PRODUCT = {
    "id": "toss-jimin-tongtong-wangjokbal-800g-1",
    "group": "간편식·면·국",
    "category": "meal",
    "categoryId": "meal",
    "part": "cheat",
    "brand": "지민푸드",
    "name": "지민푸드 통통왕족발, 800g, 1팩",
    "kind": "족발 · 간편 안주·식사",
    "price": 8800,
    "listPrice": None,
    "discountPct": None,
    "priceCheckedAt": CHECKED,
    "priceCheckedLabel": CHECKED_LABEL,
    "platform": "toss",
    "url": "https://toss.shopping/_m/dYjmZ2Uw",
    "affiliateUrl": "https://toss.shopping/_m/dYjmZ2Uw",
    "image": "images/toss-jimin-tongtong-wangjokbal-800g-1.png",
    "rating": 4.6,
    "reviewCount": 2800,
    "packCount": 1,
    "weightG": 800,
    "per100g": 1100,
    "unitPrice": "100g당 1,100원",
    "unitEach": "1팩당 8,800원",
    "eachPrice": 8800,
    "eachLabel": "팩",
    "measure": "per100g",
    "perValue": 1100.0,
    "protein20": None,
    "tip": "그대로 꺼내 안주로도 한 끼로도",
    "note": (
        "아버님 토스 쉐어링크예요. 8,800원은 800g 한 팩 가격(100g당 1,100원)이에요. "
        "같은 상품 2팩 구성(16,800원·100g당 1,050원)이 따로 있어서, 두 팩 먹을 거면 2팩 쪽이 100g당 50원 쌉니다. "
        "토스쇼핑은 모바일 웹에 가격·정가를 안 띄우고 앱 QR만 안내해서 정가·할인율은 적지 않았어요"
        "(가격은 쉐어링크 어드민 11/18 13:30 판매가). "
        "평점 4.6·리뷰 2,800개·판매자 지민푸드·내일 도착·족발 카테고리 2위."
    ),
    "shipNote": "내일 도착 예정 · 지민푸드",
}


def popular_score(p):
    score = 6  # 지민푸드는 BRAND_1·BRAND_2에 없는 브랜드 = 6점
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


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    prod = dict(PRODUCT)
    prod["popularScore"] = popular_score(prod)
    if prod["id"] in by_id:
        by_id[prod["id"]].update(prod)
        state = "갱신"
    else:
        data["products"].append(prod)
        state = "신규"

    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── 가격 이력: 이 상품은 추적 시작 상태로 오늘 확인한 한 점만 남긴다
    hist = json.loads(HIST.read_text(encoding="utf-8"))
    hprod = hist["products"]
    if prod["id"] not in hprod:
        hprod[prod["id"]] = {
            "id": prod["id"],
            "name": prod["name"],
            "platform": prod["platform"],
            "cardPrice": prod["price"],
            "cardPriceCheckedAt": CHECKED,
            "cardListPrice": None,
            "source": "mart",
            "status": "tracking-started",
            "statusDetail": "not-tracked",
            "series": [
                {
                    "date": "2026-11-18",
                    "price": prod["price"],
                    "ts": "2026-11-18T13:30:00+09:00",
                    "src": "mart",
                }
            ],
            "stats": {
                "min": prod["price"],
                "minDate": "2026-11-18",
                "max": prod["price"],
                "maxDate": "2026-11-18",
                "avg": prod["price"],
                "latest": prod["price"],
                "latestDate": "2026-11-18",
                "observations": 1,
                "days": 1,
            },
        }
    HIST.write_text(json.dumps(hist, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── js/products.js 다시 만들기(data/products.json 과 같은 내용)
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
