#!/usr/bin/env python3
"""r53 — 🍎 과일 카테고리 + 11월 제철 과일 5종 추가 (2026-11-19).

재영 님 승인(#31474)으로 `🍎 과일` 파트를 새로 만들고, 11월 제철 과일 5종
(감귤·배·사과·단감·샤인머스켓)의 쿠팡 실페이지 확인가를 등록한다.

확인 방법: 2026-11-19 18:55~19:05 KST에 쿠팡 상품 페이지를 직접 열어
가격·정가·100g당 단가·배송(무료배송/도착예정)·리뷰 수를 확인했다.
값은 '일반할인가'(와우 전용가 아님) 기준.

출력: data/products.json, js/products.js (둘 다 동기화)
사용법: python3 scripts/add_fruit_r53_20261119.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

TS = "2026-11-19 19:05"
LABEL = "11/19 19:05 쿠팡 기준"

FRUIT_CATS = [
    {"id": "tangerine", "label": "감귤", "icon": "🍊", "part": "fruit"},
    {"id": "pear", "label": "배", "icon": "🍐", "part": "fruit"},
    {"id": "apple", "label": "사과", "icon": "🍏", "part": "fruit"},
    {"id": "persimmon", "label": "단감·홍시", "icon": "🟠", "part": "fruit"},
    {"id": "shinemuscat", "label": "샤인머스켓", "icon": "🍇", "part": "fruit"},
]

FRUIT_PART = {
    "id": "fruit",
    "label": "🍎 과일",
    "icon": "🍎",
    "desc": "100g당 가격 낮은 순",
    "note": "제철 과일을 100g당 가격으로 비교해요. 박스 중량 기준이라 실제 과일 무게는 조금 적을 수 있어요.",
    "filters": [{"id": "all", "label": "전체", "cats": ["tangerine", "pear", "apple", "persimmon", "shinemuscat"]}]
    + [{"id": c["id"], "label": c["label"], "icon": c["icon"], "cats": [c["id"]]} for c in FRUIT_CATS],
}


def product(pid, brand, name, kind, cat, group, price, list_price, disc, weight,
            rating, reviews, url, image, note, score):
    per100 = round(price / weight * 100)
    p = {
        "id": pid,
        "brand": brand,
        "name": name,
        "kind": kind,
        "category": cat,
        "part": "fruit",
        "price": price,
        "discountPct": disc,
        "weightG": weight,
        "packCount": 1,
        "rating": rating,
        "reviewCount": reviews,
        "url": url,
        "affiliateUrl": url,
        "image": image,
        "platform": "coupang",
        "note": note,
        "priceCheckedAt": TS,
        "priceCheckedLabel": LABEL,
        "group": group,
        "measure": "per100g",
        "perValue": round(price / weight * 100, 1),
        "per100g": per100,
        "unitPrice": f"100g당 {per100:,}원",
        "eachPrice": price,
        "eachLabel": "박스",
        "unitEach": f"1박스당 {price:,}원",
        "protein20": None,
        "popularScore": score,
    }
    if list_price:
        p["listPrice"] = list_price
    return p


PRODUCTS = [
    product(
        "fruit-tangerine-hwanggeum-10kg",
        "황금농원",
        "황금농원 서귀포 고당도 조생 귤 10kg, 중대과(L-2L), 1박스",
        "제주 노지감귤 · 중대과",
        "tangerine",
        "감귤",
        10580, 51900, 79, 10000, 4.0, 73105,
        "https://www.coupang.com/vp/products/9085072640?itemId=20525732619&vendorItemId=5574386645",
        "images/fruit-tangerine-hwanggeum-10kg.png",
        "11/19 상품페이지 확인: 10,580원(정가 51,900원·79%)·무료배송·모레(토) 도착·상품평 73,105개. 박스에 담아 보내 실제 과일 무게는 조금 적어요.",
        96,
    ),
    product(
        "fruit-pear-asadalcom-10kg",
        "오렌지씨",
        "아삭달콤 가정용 배 실속형배 신고배 국내산, 10kg, 1박스",
        "신고배 · 가정용 실속형",
        "pear",
        "배",
        14520, 72500, 79, 10000, 4.0, 1295,
        "https://www.coupang.com/vp/products/8299999522?itemId=23943046763&vendorItemId=90964878678",
        "images/fruit-pear-asadalcom-10kg.jpg",
        "11/19 상품페이지 확인: 14,520원(정가 72,500원·79%)·무료배송·모레(토) 도착·상품평 1,295개. 3kg 9,800원·5kg 10,890원 옵션도 있어요(박스 포함 중량).",
        88,
    ),
    product(
        "fruit-apple-busa-10kg",
        "국내산",
        "국내산 고당도 햇 부사사과, 10kg, 1박스",
        "부사 · 햇사과",
        "apple",
        "사과",
        16900, 50000, 66, 10000, 4.5, 109,
        "https://www.coupang.com/vp/products/9812066038?itemId=29385382194&vendorItemId=96296903251",
        "images/fruit-apple-busa-10kg.png",
        "11/19 검색·상품 확인: 16,900원(정가 50,000원·66%)·무료배송·11/26 도착 예정·100g당 169원·평점 4.5. 당일수확 농협선별(10kg 26,910원)보다 1만 원 싼 가정용 등급이에요.",
        90,
    ),
    product(
        "fruit-persimmon-gyeongnam-10kg",
        "효담농산",
        "맛있으면 단감 아삭달콤 경남 햇 단감, 10kg(40-80과내외) 혼합, 1박스",
        "부유·진영 단감 · 경남 밀양",
        "persimmon",
        "단감·홍시",
        11810, 39000, 69, 10000, 4.0, 4054,
        "https://www.coupang.com/vp/products/9202379376?vendorItemId=83431870663",
        "images/fruit-persimmon-gyeongnam-10kg.jpg",
        "11/19 상품페이지 확인: 11,810원(정가 39,000원·69%)·무료배송·11/24(화) 도착 예정·상품평 4,054개·원산지 경남 밀양. 가정용이라 검은 점·상처가 있을 수 있어요.",
        92,
    ),
    product(
        "fruit-shine-gomgom-2kg",
        "곰곰",
        "곰곰 샤인머스켓, 2kg(2~4수), 1박스",
        "샤인머스캣 · 2~4송이",
        "shinemuscat",
        "샤인머스켓",
        9900, None, None, 2000, 4.5, 1431,
        "https://www.coupang.com/vp/products/9048045854?itemId=26554607823&vendorItemId=93528402149",
        "images/fruit-shine-gomgom-2kg.jpg",
        "11/19 검색 확인: 9,900원(100g당 495원)·로켓프레시 내일(금) 새벽 도착·평점 4.5(리뷰 1,431개). 산지직송 9,500원(리뷰 76개)보다 400원 비싸지만 후기가 훨씬 많아요.",
        94,
    ),
]


# 아버님 쿠팡 파트너스(AF5520784) 단축 링크 — 2026-11-19 19:11 링크 생성, 302 확인(모두 상품 페이지로 연결)
PARTNER_LINKS = {
    "fruit-tangerine-hwanggeum-10kg": "https://link.coupang.com/a/iNVl2dbyLc",
    "fruit-pear-asadalcom-10kg": "https://link.coupang.com/a/iNVofN1yNg",
    "fruit-apple-busa-10kg": "https://link.coupang.com/a/iNVpNx1F3k",
    "fruit-persimmon-gyeongnam-10kg": "https://link.coupang.com/a/iNVrBkRk2C",
    "fruit-shine-gomgom-2kg": "https://link.coupang.com/a/iNVsNfWJci",
}


def main():
    doc = json.loads(DATA.read_text(encoding="utf-8"))

    if not any(c.get("id") == "fruit" for c in doc["categories"]):
        doc["categories"].extend(FRUIT_CATS)
    if not any(p.get("id") == "fruit" for p in doc["parts"]):
        doc["parts"].append(FRUIT_PART)

    have = {p["id"] for p in doc["products"]}
    added = [p for p in PRODUCTS if p["id"] not in have]
    for p in added:
        if p["id"] in PARTNER_LINKS:
            p["affiliateUrl"] = PARTNER_LINKS[p["id"]]
    doc["products"].extend(added)

    doc["site"]["tagline"] = "제로 음료·단백질·식단 고기·간편식·제철 과일 단가 비교"
    doc["site"]["updatedAt"] = "2026-11-19"

    DATA.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # js/products.js 재생성 (다른 스크립트와 같은 방식)
    text = JS.read_text(encoding="utf-8")
    header = text[: text.index("const SITE = ")]

    def block(name, value):
        return "const " + name + " = " + json.dumps(value, ensure_ascii=False, indent=2) + ";\n"

    js = header
    js += block("SITE", doc["site"]) + "\n"
    js += block("CATEGORIES", doc["categories"]) + "\n"
    js += block("PARTS", doc["parts"]) + "\n"
    js += block("SORTS", doc["sorts"]) + "\n"
    js += block("CONTAINERS", doc["containers"]) + "\n"
    js += block("INGREDIENT_FILTERS", doc["ingredientFilters"]) + "\n"
    js += block("PRODUCTS", doc["products"])
    JS.write_text(js, encoding="utf-8")

    print(f"과일 {len(added)}종 추가 · 전체 {len(doc['products'])}종 · data/js 동기화 완료")
    for p in added:
        print(f"  - {p['name']} · {p['price']:,}원 · {p['unitPrice']} · 리뷰 {p['reviewCount']:,}")


if __name__ == "__main__":
    main()
