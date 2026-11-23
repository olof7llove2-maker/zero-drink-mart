#!/usr/bin/env python3
"""2026-11-23(화) 토스 초핫딜 4종을 띠니에 추가 (r67).

재영 님 확정: "4종 다 올려줘 (베네틴 일반링크 + 🥯칩 신설)".

1. 파파네정육점 통삼겹살, 수육용, 1kg, 2개 — 15,900원 (100g당 795원)
   아버님(신승용) 토스 쉐어링크 https://toss.shopping/_m/1CkHqdXh
2. 고기중독 삼겹살, 8mm, 구이용, 1kg, 1개 — 11,560원 (100g당 1,156원)
   아버님 쉐어링크 https://toss.shopping/_m/lJOPnxM7
3. 널담 고단백 배꼽 베이글, 맛혼합, 10개 — 9,600원 (1개당 960원)
   아버님 쉐어링크 https://toss.shopping/_m/zPJROLPd
   → '유제품·간식' 부품에 🥯 고단백 베이글 카테고리 신설(재영 님 사전 승인)
4. 베네틴 플랜트 프로틴 쉐이크 아이솔레이트 초코맛, 2kg, 1개 — 24,800원 (100g당 1,240원)
   쉐어링크 상품 목록에 없어 _m/ 발급 불가 → 일반 상품 링크로 등록
   https://toss.shopping/t/1786959705 (식물성 분리대두단백 명시)

가격 근거
- 판매가: sharelink.toss.im 링크 관리(아버님 계정, 2026-11-23 18:15) 판매가와 일치.
- 정가·할인율: 토스쇼핑 웹은 가격을 숨기므로(QR만 안내) 오늘 시각 집계 사이트
  교차확인 값(투데모아 17:46 / 세이보 / 애드리띵 / 딜바고 / 핫딜모음 15:12).
  상품별 note 에 출처를 적었다.
- 리뷰·평점·배송: 토스쇼핑 상품 페이지(og 메타, 11/23 18:05 확인) 값.

출력: data/products.json, data/price-history.json, js/products.js
사용법: python3 scripts/add_toss_hotdeal_20261123.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
HIST = ROOT / "data" / "price-history.json"
JS = ROOT / "js" / "products.js"

CHECKED = "2026-11-23 18:15"
CHECKED_LABEL = "11/23 18:15 토스쉐어링크 판매가 기준"

PRICE_SRC = "토스쇼핑 웹은 가격을 숨겨서 정가·할인율은 오늘 시각 집계 사이트 교차확인값이에요(투데모아 17:46·세이보·애드리띵·딜바고·핫딜모음 15:12)."

PRODUCTS = [
    {
        "id": "toss-papane-tongsamgyeop-suyuk-1kg-2",
        "part": "meat",
        "category": "pork",
        "categoryId": "pork",
        "group": "소·돼지고기",
        "brand": "파파네정육점",
        "name": "파파네정육점 통삼겹살, 수육용, 1kg, 2개",
        "kind": "돼지고기 · 통삼겹 수육용",
        "flavor": "삼겹살(수육용)",
        "price": 15900,
        "listPrice": 35600,
        "discountPct": 55,
        "weightG": 2000,
        "packCount": 2,
        "eachLabel": "팩",
        "measure": "per100g",
        "per100g": 795,
        "perValue": 795.0,
        "unitPrice": "100g당 795원",
        "eachPrice": 7950,
        "unitEach": "1팩(1kg)당 7,950원",
        "rating": 4.3,
        "reviewCount": 8404,
        "platform": "toss",
        "url": "https://toss.shopping/_m/1CkHqdXh",
        "affiliateUrl": "https://toss.shopping/_m/1CkHqdXh",
        "shareLink": "https://toss.shopping/_m/1CkHqdXh",
        "image": "images/toss-papane-tongsamgyeop-suyuk-1kg-2.jpg",
        "tip": "수육·보쌈용 통삼겹 2kg, 100g당 795원",
        "shipNote": "무료배송 · 내일 도착 예정 · (주)파파육가공",
        "note": (
            "아버님 토스 쉐어링크예요. 15,900원은 1kg 두 팩(2kg) 가격으로 100g당 795원 — "
            "띠니 돼지고기 중 가장 낮은 단가예요(곰곰 앞다리 100g당 1,238원). "
            "통삼겹이라 수육·보쌈용으로 두툼하게 썰어 삶기 좋아요. "
            "정육 카테고리 1위·리뷰 8,404개·평점 4.3·무료배송·내일 도착. "
            + PRICE_SRC
            + " 11/23 하루특가(선착순)로 밤 12시까지예요."
        ),
        "priceCheckedAt": CHECKED,
        "priceCheckedLabel": CHECKED_LABEL,
        "storage": "냉장",
    },
    {
        "id": "toss-gogijungdok-samgyeop-8mm-1kg",
        "part": "meat",
        "category": "pork",
        "categoryId": "pork",
        "group": "소·돼지고기",
        "brand": "고기중독",
        "name": "고기중독 삼겹살, 8mm, 구이용, 1kg, 1개",
        "kind": "돼지고기 · 삼겹살 구이용",
        "flavor": "삼겹살(구이용)",
        "price": 11560,
        "listPrice": 24900,
        "discountPct": 53,
        "weightG": 1000,
        "packCount": 1,
        "eachLabel": "팩",
        "measure": "per100g",
        "per100g": 1156,
        "perValue": 1156.0,
        "unitPrice": "100g당 1,156원",
        "eachPrice": 11560,
        "unitEach": "1팩(1kg)당 11,560원",
        "rating": 4.2,
        "reviewCount": 937,
        "platform": "toss",
        "url": "https://toss.shopping/_m/lJOPnxM7",
        "affiliateUrl": "https://toss.shopping/_m/lJOPnxM7",
        "shareLink": "https://toss.shopping/_m/lJOPnxM7",
        "image": "images/toss-gogijungdok-samgyeop-8mm-1kg.jpg",
        "tip": "8mm 도톰 썰기라 굽기만 하면 되는 삼겹살",
        "shipNote": "무료배송 · 내일 도착 예정 · 렛츠커넥트",
        "note": (
            "아버님 토스 쉐어링크예요. 8mm로 도톰하게 썰린 구이용 삼겹살 1kg에 11,560원, 100g당 1,156원이에요. "
            "리뷰 937개·평점 4.2·무료배송·내일 도착이고 30일 안에 가장 싼 가격이에요. "
            "같은 상품 2kg 구성도 있는데 100g당으로는 이 1kg 쪽이 더 싸요. "
            + PRICE_SRC
            + " 11/23 하루특가로 밤 12시까지예요."
        ),
        "priceCheckedAt": CHECKED,
        "priceCheckedLabel": CHECKED_LABEL,
        "storage": "냉장",
    },
    {
        "id": "toss-neoldam-godanbaek-baekkop-baegel-10",
        "part": "snack",
        "category": "bagel",
        "categoryId": "bagel",
        "group": "유제품·간식",
        "brand": "널담",
        "name": "널담 고단백 배꼽 베이글, 맛혼합, 10개",
        "kind": "고단백 베이글 · 맛혼합",
        "flavor": "맛혼합",
        "price": 9600,
        "listPrice": 27900,
        "discountPct": 65,
        "weightG": None,
        "packCount": 10,
        "eachLabel": "개",
        "measure": "each",
        "perValue": 960.0,
        "unitPrice": "1개당 960원",
        "eachPrice": 960,
        "unitEach": "1개당 960원",
        "rating": 4.7,
        "reviewCount": 27328,
        "platform": "toss",
        "url": "https://toss.shopping/_m/zPJROLPd",
        "affiliateUrl": "https://toss.shopping/_m/zPJROLPd",
        "shareLink": "https://toss.shopping/_m/zPJROLPd",
        "image": "images/toss-neoldam-baekkop-bagel-10.jpg",
        "tip": "고단백 베이글 10개, 1개당 960원",
        "shipNote": "무료배송 · 내일 출발 예정 · 널담",
        "note": (
            "아버님 토스 쉐어링크예요. 10개에 9,600원, 1개당 960원이에요. "
            "베이글 카테고리 1위에 리뷰 27,328개·평점 4.7로 후기가 압도적이에요. "
            "지난 10/20에 8,480원까지 내려간 적이 있어 지금이 역대 최저는 아니지만, 평소 평균가(12,375원)보다 22% 싼 값이에요. "
            + PRICE_SRC
            + " 11/23 하루특가로 밤 12시까지, 모레 도착 예정이에요."
        ),
        "priceCheckedAt": CHECKED,
        "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "toss-benetin-plant-protein-isolate-choco-2kg",
        "part": "protein",
        "category": "shake",
        "categoryId": "shake",
        "group": "단백질 쉐이크·음료",
        "brand": "베네틴",
        "name": "베네틴 플랜트 프로틴 쉐이크 아이솔레이트 초코맛, 2kg, 1개",
        "kind": "단백질 파우더 · 식물성(분리대두단백)",
        "flavor": "초코",
        "price": 24800,
        "listPrice": 53000,
        "discountPct": 53,
        "weightG": 2000,
        "packCount": 1,
        "eachLabel": "통",
        "measure": "per100g",
        "per100g": 1240,
        "perValue": 1240.0,
        "unitPrice": "100g당 1,240원",
        "eachPrice": 24800,
        "unitEach": "1통(2kg)당 24,800원",
        "rating": 4.8,
        "reviewCount": 1018,
        "platform": "toss",
        "url": "https://toss.shopping/t/1786959705",
        "affiliateUrl": "https://toss.shopping/t/1786959705",
        "image": "images/toss-benetin-plant-protein-isolate-choco-2kg.jpg",
        "tip": "100g당 1,240원 — 띠니 파우더 중 가장 싼 100g 단가",
        "shipNote": "무료배송 · 판매자 베네틴",
        "note": (
            "**식물성(분리대두단백) 단백질 파우더예요 — 유청(우유) 단백이 아닙니다.** "
            "2kg에 24,800원, 100g당 1,240원으로 띠니 파우더 중 100g 단가가 가장 낮아요"
            "(칼로바이 퍼펙트 파워쉐이크 1.8kg 100g당 2,328원, 신타6 3,916원). "
            "복합 프로틴 파우더 2위·리뷰 1,018개·평점 4.8. "
            "단백질 1회 섭취량·함량은 제품 상세 이미지에만 있어 확인하지 못했고, 그래서 단백질 20g당 단가는 계산하지 않았어요. "
            "쉐어링크 상품 목록에 없어 아버님 토스 쉐어링크(_m/)가 아닌 일반 상품 링크예요. "
            + PRICE_SRC
            + " 11/23 하루특가로 밤 12시까지예요."
        ),
        "priceCheckedAt": CHECKED,
        "priceCheckedLabel": CHECKED_LABEL,
        "container": "powder",
    },
]

BAGEL_CATEGORY = {"id": "bagel", "label": "고단백 베이글", "icon": "🥯", "part": "snack"}


def popular_score(p):
    score = 6  # 브랜드 인지도 기본값
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


def add_bagel_category(data):
    cats = data["categories"]
    if any(c["id"] == "bagel" for c in cats):
        return False
    ids = [c["id"] for c in cats]
    pos = ids.index("bar") + 1 if "bar" in ids else len(cats)
    cats.insert(pos, dict(BAGEL_CATEGORY))
    for part in data["parts"]:
        if part["id"] != "snack":
            continue
        filters = part.get("filters", [])
        fids = [f["id"] for f in filters]
        if "bagel" not in fids:
            insert_at = fids.index("bar") + 1 if "bar" in fids else len(filters)
            filters.insert(insert_at, {"id": "bagel", "label": "고단백 베이글", "icon": "🥯", "cats": ["bagel"]})
    return True


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    added_cat = add_bagel_category(data)

    states = []
    for src in PRODUCTS:
        prod = dict(src)
        prod["popularScore"] = popular_score(prod)
        if prod["id"] in by_id:
            by_id[prod["id"]].update(prod)
            states.append(("갱신", prod))
        else:
            data["products"].append(prod)
            states.append(("신규", prod))

    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── 가격 이력: 추적 시작점 한 점만 남긴다
    hist = json.loads(HIST.read_text(encoding="utf-8"))
    hprod = hist["products"]
    for _, prod in states:
        if prod["id"] in hprod:
            continue
        hprod[prod["id"]] = {
            "id": prod["id"],
            "name": prod["name"],
            "platform": prod["platform"],
            "cardPrice": prod["price"],
            "cardPriceCheckedAt": CHECKED,
            "cardListPrice": prod.get("listPrice"),
            "source": "mart",
            "status": "tracking-started",
            "statusDetail": "not-tracked",
            "series": [
                {
                    "date": "2026-11-23",
                    "price": prod["price"],
                    "ts": "2026-11-23T18:15:00+09:00",
                    "src": "mart",
                }
            ],
            "stats": {
                "min": prod["price"],
                "minDate": "2026-11-23",
                "max": prod["price"],
                "maxDate": "2026-11-23",
                "avg": prod["price"],
                "latest": prod["price"],
                "latestDate": "2026-11-23",
                "observations": 1,
                "days": 1,
            },
        }
    HIST.write_text(json.dumps(hist, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── js/products.js 다시 만들기
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
    print("베이글 카테고리 신설:", added_cat)
    for state, prod in states:
        print(state, prod["id"], prod["price"], prod.get("unitPrice"))
    print("상품", len(data["products"]), counts)


if __name__ == "__main__":
    main()
