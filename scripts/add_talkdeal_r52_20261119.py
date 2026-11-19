#!/usr/bin/env python3
"""2026-11-19 r52 — 카톡 톡딜 2종 + 하림 자연실록 3kg 추가.

재영 님 승인(#31432)에 따라 아래 3종을 넣는다.

1) 웅진식품 애사비 12+12 (오리지널 12 + 제주청귤하귤 12), 500ml 24병 — 16,900원
   - 카톡 톡딜 일반 상품 링크(제휴/큐레이터 링크 아님) https://store.kakao.com/wjfood/products/673526426
   - 확인: 톡딜 페이지 2026-11-19 19:0x · 정가 29,900 → 톡딜가 16,900(43%) · 무료배송
     · 톡딜 기간 11/16 17:00 ~ 11/23 16:59 · 만족도 99% · 리뷰 577 · 누적구매 22,468
   - 옵션 API: 오리지널+제주청귤하귤만 재고 있음(파인애플 조합 품절), 추가금 0원.
2) 자연채움 오색칠콩두유 무가당 185ml 20+20 (40팩) — 15,200원
   - https://store.kakao.com/jycu/products/245548941
   - 확인: 정가 30,000 → 톡딜가 15,200(49%) · 무료배송 · 톡딜 기간 11/19 17:00 ~ 11/22 23:59
     · 만족도 98% · 리뷰 3,765 · 누적구매 78,482 · 내일(11/20) 발송, 11/23 도착 예정
   - 1팩 61kcal(상자 표기 185mL·61kcal)라 단백질 10g 미만 두유로 보고 '두유·저단백'에 넣었다.
3) 하림 자연실록 무항생제 닭가슴살(냉동) 1kg×3 — 24,450원
   - 쿠팡 일반 주소 https://www.coupang.com/vp/products/8853526798?itemId=21799850938&vendorItemId=92799380791
   - 아버님(AF5520784) 쿠팡 파트너스 '간편 링크 만들기'로 발급한 단축 링크
     https://link.coupang.com/a/iNT6kvb0eW → 실제 접속해 lptag=AF5520784 확인(19:51).
   - 확인: 30,650 → 24,450(20%) · 100g당 815원 · 무료배송(롯데택배) · 모레(토) 11/21 도착 예정
     · 판매자 주식회사 함백유통(89%) · 평점 4.7 · 리뷰 266 · 6,200원 특가 16시간 남음(≈11/20 11:00 종료)
   - 상품 상태는 냉동(IFF): 구매 후기·포장 이미지 모두 IFF 급속냉동 1kg×3으로 확인.

출력: data/products.json, data/price-history.json, js/products.js
사용법: python3 scripts/add_talkdeal_r52_20261119.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
HIST = ROOT / "data" / "price-history.json"
JS = ROOT / "js" / "products.js"

CHECKED = "2026-11-19 19:05"
NUTRITION_NOTE = "제품 영양성분표가 없는 원물이라 국가표준식품분석표·USDA 부위 표준값 참고치예요"

PRODUCTS = [
    {
        "id": "talkdeal-wj-acv-500ml-24",
        "group": "애사비",
        "category": "acv",
        "part": "zero",
        "brand": "웅진식품",
        "name": "웅진식품 애사비 12+12 (오리지널·제주청귤하귤), 500ml, 24병",
        "kind": "애사비 탄산 · 오리지널+제주청귤하귤",
        "flavor": "오리지널+제주청귤하귤",
        "price": 16900,
        "listPrice": 29900,
        "discountPct": 43,
        "priceCheckedAt": CHECKED,
        "priceCheckedLabel": "11/19 19:05 카톡 톡딜 기준",
        "platform": "talkdeal",
        "url": "https://store.kakao.com/wjfood/products/673526426",
        "affiliateUrl": "https://store.kakao.com/wjfood/products/673526426",
        "image": "images/talkdeal-wj-acv-500ml-24.jpg",
        "volumeMl": 500,
        "packCount": 24,
        "container": "pet-small",
        "caffeine": "none",
        "aspartame": None,
        "measure": "per100ml",
        "weightG": None,
        "perValue": 140.8,
        "unitPricePer100ml": 141,
        "unitPriceOfficial": "100ml당 141원",
        "unitPrice": "100ml당 141원",
        "eachPrice": 704,
        "eachLabel": "병",
        "unitEach": "1병당 704원",
        "reviewCount": 577,
        "dealEndsAt": "2026-11-23T16:59:59+09:00",
        "shipNote": "무료배송 · 톡딜 11/23 16:59까지",
        "note": (
            "카톡 톡딜 16,900원(정가 29,900원, 43% 할인)에 500ml 24병이라 100ml당 141원·1병당 704원이에요. "
            "12+12 골라담기라 오리지널맛 12개 + 제주청귤하귤 12개 조합만 재고가 있고 파인애플 조합은 품절이에요. "
            "톡딜 기간은 11/16 17:00 ~ 11/23 16:59이고, 쿠폰 1,000원·카카오페이 즉시할인까지 쓰면 최대혜택가 14,787원(100ml당 123원)이에요. "
            "만족도 99%·리뷰 577개·누적구매 22,468개, 웅진식품 공식 스토어예요. "
            "마트 최저였던 클룹 애사비소다 500ml 24개(100ml당 220원)보다 36% 싸요."
        ),
        "popularScore": 51.3,
    },
    {
        "id": "talkdeal-jycu-ohsaek-soy-185ml-40",
        "group": "단백질 음료",
        "category": "lowsoy",
        "part": "protein",
        "brand": "자연채움",
        "name": "자연채움 오색칠콩두유 무가당 1+1, 185ml, 40팩",
        "kind": "콩두유 · 무가당 20팩 1+1",
        "flavor": "무가당",
        "proteinType": "soy",
        "proteinSourceKey": "soy",
        "proteinSource": "대두(콩두유)",
        "proteinSourceDetail": "오색콩 두유 85%",
        "price": 15200,
        "listPrice": 30000,
        "discountPct": 49,
        "priceCheckedAt": CHECKED,
        "priceCheckedLabel": "11/19 19:05 카톡 톡딜 기준",
        "platform": "talkdeal",
        "url": "https://store.kakao.com/jycu/products/245548941",
        "affiliateUrl": "https://store.kakao.com/jycu/products/245548941",
        "image": "images/talkdeal-jycu-ohsaek-soy-185ml-40.jpg",
        "volumeMl": 185,
        "packCount": 40,
        "measure": "per100ml",
        "weightG": None,
        "perValue": 205.4,
        "unitPricePer100ml": 205,
        "unitPriceOfficial": "100ml당 205원",
        "unitPrice": "100ml당 205원",
        "eachPrice": 380,
        "eachLabel": "팩",
        "unitEach": "1팩(185ml)당 380원",
        "reviewCount": 3765,
        "kcalStatus": "61kcal",
        "kcal_per_bottle": 61,
        "nutritionCheckedAt": CHECKED,
        "nutritionCheckedLabel": "11/19 19:05 톡딜 상품 페이지 기준",
        "nutritionLabel": "1팩 185ml 61kcal · 무가당",
        "nutritionNote": "상세 이미지에 단백질 g 표기가 없어 단백질 수치는 넣지 않았어요",
        "dealEndsAt": "2026-11-22T23:59:59+09:00",
        "shipNote": "무료배송 · 내일(금) 11/20 발송 · 11/23 도착 예정",
        "note": (
            "카톡 톡딜 15,200원(정가 30,000원, 49% 할인)에 185ml 40팩(20팩 1+1)이라 100ml당 205원·1팩당 380원이에요. "
            "무가당 오색칠콩두유 40팩 구성이고, 고칼슘 40팩·무가당 20+고칼슘 20은 각 16,200원이에요. "
            "톡딜 기간은 11/19 17:00 ~ 11/22 23:59. 만족도 98%·리뷰 3,765개·누적구매 78,482개. "
            "1팩 185ml에 61kcal라 단백질 10g 미만 두유로 보고 '두유·저단백' 칸에 넣었어요(상세 이미지에 단백질 g 표기가 없어 영양 수치는 적지 않았어요). "
            "마트 최저 두유였던 매일두유 190ml(100ml당 382원)보다 46% 싸요."
        ),
        "popularScore": 61.0,
    },
    {
        "id": "meat-chicken-harim-jayeonsilrok-breast-1kg-3",
        "group": "닭고기",
        "category": "chicken",
        "categoryId": "chicken",
        "part": "meat",
        "meatType": "닭고기",
        "cut": "닭가슴살",
        "cutGroup": "닭가슴살",
        "brand": "하림",
        "name": "하림 자연실록 무항생제 닭가슴살 (냉동), 1kg, 3개",
        "kind": "냉동 닭가슴살 · 무항생제 1kg×3",
        "price": 24450,
        "listPrice": 30650,
        "discountPct": 20,
        "priceCheckedAt": CHECKED,
        "priceCheckedLabel": "11/19 19:05 쿠팡 기준",
        "platform": "coupang",
        "url": "https://www.coupang.com/vp/products/8853526798?itemId=21799850938&vendorItemId=92799380791",
        "affiliateUrl": "https://link.coupang.com/a/iNT6kvb0eW",
        "image": "images/meat-chicken-harim-jayeonsilrok-breast-1kg-3.jpg",
        "rating": 4.7,
        "reviewCount": 266,
        "packCount": 3,
        "weightG": 3000,
        "per100g": 815,
        "perValue": 815.0,
        "unitPrice": "100g당 815원",
        "unitEach": "1팩(1kg)당 8,150원",
        "eachPrice": 8150,
        "eachLabel": "팩",
        "measure": "per100g",
        "proteinPer100g": 23.0,
        "fatPer100g": 1.3,
        "nutritionBasis": "부위 기준 참고치",
        "nutritionNote": NUTRITION_NOTE,
        "nutritionLabel": "100g당 단백질 ~23.0g · 지방 ~1.3g (부위 기준)",
        "protein20": 3543,
        "pricePer20gProtein": 3543,
        "dealEndsAt": "2026-11-20T11:00:00+09:00",
        "shipNote": "무료배송 · 모레(토) 11/21 도착 예정 · 20% 특가 11/20 11:00 종료",
        "note": (
            "쿠팡 24,450원(정가 30,650원, 20% 할인)에 1kg 3팩 총 3kg이라 100g당 815원·1팩(1kg)당 8,150원이에요. "
            "아버님 쿠팡 파트너스 단축 링크로 연결했어요. 무료배송(롯데택배)이고 모레(토) 11/21 도착 예정, "
            "판매자는 주식회사 함백유통(판매자평가 89%)이에요. 6,200원 특가가 11/20(금) 11:00쯤 끝나요. "
            "평점 4.7·리뷰 266개. 마트 자연실록 400g(100g당 1,538원)보다 47%, 하림 IFF 2kg(1,110원)보다 27% 싸지만 "
            "케이원푸드 냉장 2kg(633원)보다는 비싸요."
        ),
        "popularScore": 36.9,
    },
]


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    added = []
    for base in PRODUCTS:
        prod = dict(base)
        if prod["id"] in by_id:
            by_id[prod["id"]].update(prod)
            state = "갱신"
        else:
            data["products"].append(prod)
            added.append(prod)
            state = "신규"
        print(state, prod["id"], f"{prod['price']:,}원")

    data["site"]["updatedAt"] = "2026-11-19"
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── 가격 이력: 오늘 확인한 한 점만 남기고 추적 시작
    if HIST.exists():
        hist = json.loads(HIST.read_text(encoding="utf-8"))
        hprod = hist["products"]
        for prod in added:
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
                        "date": "2026-11-19",
                        "price": prod["price"],
                        "ts": "2026-11-19T19:05:00+09:00",
                        "src": "mart",
                    }
                ],
                "stats": {
                    "min": prod["price"],
                    "minDate": "2026-11-19",
                    "max": prod["price"],
                    "maxDate": "2026-11-19",
                    "avg": prod["price"],
                    "latest": prod["price"],
                    "latestDate": "2026-11-19",
                    "observations": 1,
                    "days": 1,
                },
            }
        HIST.write_text(json.dumps(hist, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── js/products.js 다시 만들기 (data/products.json 과 같은 내용)
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
