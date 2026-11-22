#!/usr/bin/env python3
"""r64 — 띠니 50종 확장 (2026-11-22 밤).

1. 신규 16종 추가 (34종 → 50종)
   · 제로음료·생수 3: 웰치스 제로 애플망고 355ml×24 / 몬스터 울트라 355ml×24 / 탐사 샘물 2L×12
   · 유제품·간식(신규 축 snack) 5: 요즘 그릭 450g / 후디스 그릭 450g×3
     / 닥터유 프로바 크런치 560g / 포스트 단백질바 미니 231g×2 / 아몬드브리즈 언스위트 190ml×24
   · 닭가슴살 간편식(신규 카테고리 chicken-meal) 4: 맛있닭 스테이크 100g×10
     / 잇메이트 소시지 5종 100g×20 / 허닭 한입 큐브 5종 100g×20 / 하림 블랙페퍼 100g×10
   · 고단백 볶음밥 1: 맛있닭 점보 볶음밥 혼합 350g×12 (단백질 42g/팩)
   · 소·돼지고기 3: 곰곰 한돈 앞다리살 1kg / 고급진 캐나다 목살 1kg / 호주산 우홍두깨 슬라이스 500g×2
2. 품절(soldOut) 표기: 도드람 한돈 삼겹살 1kg
3. 카테고리·파트 정의 추가(유제품·간식 축, 닭가슴살 간편식, 에너지드링크)
4. price-history: 신규 16종 추적 시작

가격·평점·리뷰는 2026-11-22 20:30~21:20 쿠팡 로그인 세션에서 직접 확인한 값.
영양(단백질·지방)은 제품 라벨·식약처 공공데이터·농진청 식품성분 DB에서 확인(각 상품 nutritionSource 참고).
사용법: python3 scripts/r64_expand_20261122.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
HIST = ROOT / "data" / "price-history.json"
JS = ROOT / "js" / "products.js"

CHECKED_AT = "2026-11-22 21:20"
CHECKED_LABEL = "11/22 밤(20:30~21:20) 쿠팡 기준"
CP = "https://www.coupang.com/vp/products/"

NEW = [
    # ── 제로음료·생수 ────────────────────────────────────────────────
    {
        "id": "welchs-zero-applemango-355ml-24",
        "part": "zero", "category": "cola", "categoryId": "cola", "group": "제로음료·생수",
        "brand": "웰치스", "name": "웰치스 제로 애플망고맛, 355ml, 24개",
        "kind": "제로 과일탄산", "flavor": "애플망고",
        "price": 15900, "listPrice": None, "discountPct": None,
        "volumeMl": 355, "packCount": 24, "container": "can",
        "rating": 5.0, "reviewCount": 1776, "popularScore": 88.0,
        "caffeine": "none", "aspartame": "none",
        "url": CP + "9409709264?itemId=27958049331&vendorItemId=94916134748",
        "image": "images/welchs-zero-applemango-355ml-24.png",
        "platform": "coupang",
        "nutritionSource": "식약처 공공데이터(먹스캔, 웰치스 제로 애플망고맛): 100ml당 0kcal·당류 0g, 355ml 1캔 8g 탄수(알룰로오스)",
        "note": "355ml 24캔 · 100ml당 187원, 1캔 663원. 0kcal·당류 0g(알룰로오스 감미). 리뷰 1,776건 평점 5.0. 11/22 확인.",
        "affiliateUrl": CP + "9409709264?itemId=27958049331&vendorItemId=94916134748",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "monster-ultra-355ml-24",
        "part": "zero", "category": "energy", "categoryId": "energy", "group": "제로음료·생수",
        "brand": "몬스터", "name": "몬스터에너지 울트라, 355ml, 24개",
        "kind": "제로 에너지드링크", "flavor": "울트라",
        "price": 30290, "listPrice": 43200, "discountPct": 29,
        "volumeMl": 355, "packCount": 24, "container": "can",
        "rating": 5.0, "reviewCount": 43567, "popularScore": 96.0,
        "caffeine": "contains", "caffeineMg": 100, "aspartame": "contains",
        "url": CP + "8424947419?itemId=24411503064",
        "image": "images/monster-ultra-355ml-24.jpg",
        "platform": "coupang",
        "nutritionSource": "코스트코·먹스캔 고시(몬스터 에너지 울트라 355ml): 14kcal·당류 0g·카페인 100mg·에리스리톨 2g",
        "note": "355ml 24캔 · 100ml당 356원, 1캔 1,262원. 제로슈거(에리스리톨) 14kcal, 카페인 100mg. 리뷰 43,567건 평점 5.0. 11/22 확인.",
        "affiliateUrl": CP + "8424947419?itemId=24411503064",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "tamsa-saemmul-2l-12",
        "part": "zero", "category": "water", "categoryId": "water", "group": "제로음료·생수",
        "brand": "탐사", "name": "탐사 샘물 무라벨, 2L, 12개",
        "kind": "생수", "flavor": "무라벨",
        "price": 5590, "listPrice": 9980, "discountPct": 43,
        "volumeMl": 2000, "packCount": 12, "container": "pet-large",
        "rating": 5.0, "reviewCount": 602352, "popularScore": 95.0,
        "url": CP + "7689270513?itemId=20877904723",
        "image": "images/tamsa-saemmul-2l-12.png",
        "platform": "coupang",
        "note": "2L 12병 · 100ml당 23원, 1병 466원(와우할인가). 무라벨·로켓배송. 리뷰 60.2만건 평점 5.0. 11/22 확인.",
        "affiliateUrl": CP + "7689270513?itemId=20877904723",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },

    # ── 유제품·간식 ─────────────────────────────────────────────────
    {
        "id": "yozm-greek-plain-450g",
        "part": "snack", "category": "yogurt", "categoryId": "yogurt", "group": "유제품·간식",
        "brand": "요즘", "name": "요즘 그릭요거트 플레인, 450g, 1개",
        "kind": "그릭요거트 · 플레인", "flavor": "플레인",
        "price": 11470, "listPrice": 12750, "discountPct": 10,
        "weightG": 450, "packCount": 1, "eachLabel": "개", "measure": "per100g",
        "rating": 5.0, "reviewCount": 77400, "popularScore": 93.0,
        "proteinPer100g": 12.0, "fatPer100g": 12.0, "kcalPer100g": 188.0,
        "proteinStatus": "12g", "proteinBasis": "100g",
        "storage": "냉장",
        "nutritionSource": "제품 영양정보(코스트코 코리아 고시): 100g당 188kcal·단백질 12g·지방 12g·당류 2g",
        "url": CP + "331527359?itemId=28086202366",
        "image": "images/yozm-greek-plain-450g.jpg",
        "platform": "coupang",
        "note": "450g 1통 · 100g당 2,549원, 1통 11,470원. 원유 99.996%+유산균만(첨가물 없음). 단백질 12g/100g로 그릭요거트 중 높은 편. 리뷰 7.7만건 평점 5.0. 11/22 확인.",
        "affiliateUrl": CP + "331527359?itemId=28086202366",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "hoodis-greek-plain-450g-3",
        "part": "snack", "category": "yogurt", "categoryId": "yogurt", "group": "유제품·간식",
        "brand": "후디스", "name": "후디스그릭요거트 플레인, 450g, 3개",
        "kind": "그릭요거트 · 플레인", "flavor": "플레인",
        "price": 14790, "listPrice": None, "discountPct": None,
        "weightG": 1350, "packCount": 3, "eachLabel": "개", "measure": "per100g",
        "rating": 5.0, "reviewCount": 96019, "popularScore": 92.0,
        "proteinPer100g": 6.0, "fatPer100g": 7.8, "kcalPer100g": 156.0,
        "proteinStatus": "6g", "proteinBasis": "100g",
        "storage": "냉장",
        "nutritionSource": "제품 영양정보(에누리 상품정보, 80g 125kcal·단백질 4.8g): 100g 환산 단백질 6.0g·지방 7.8g",
        "url": CP + "168835912?itemId=19224726307",
        "image": "images/hoodis-greek-plain-450g-3.jpg",
        "platform": "coupang",
        "note": "450g 3개(1.35kg) · 100g당 1,096원, 1개 4,930원. 1A등급 원유 2배 농축. 단백질은 6g/100g으로 요즘(12g)의 절반이지만 100g 단가가 절반 이하. 리뷰 9.6만건 평점 5.0. 11/22 확인.",
        "affiliateUrl": CP + "168835912?itemId=19224726307",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "dryou-proteinbar-crunch-560g",
        "part": "snack", "category": "bar", "categoryId": "bar", "group": "유제품·간식",
        "brand": "닥터유", "name": "닥터유 프로 단백질바 크런치, 560g, 1개 (70g×8)",
        "kind": "프로틴바 · 크런치", "flavor": "크런치",
        "price": 14400, "listPrice": 16000, "discountPct": 10,
        "weightG": 560, "packCount": 8, "eachLabel": "개", "measure": "per100g",
        "rating": 5.0, "reviewCount": 4101, "popularScore": 90.0,
        "proteinPer100g": 34.3, "fatPer100g": 27.1, "proteinPerPackG": 24, "kcalPerPack": 355,
        "protein_g_per_bottle": 24, "kcal_per_bottle": 355,
        "proteinStatus": "24g", "proteinBasis": "1개(70g)",
        "storage": "실온",
        "nutritionSource": "라벨 기준(뉴트리봄·ProteinLab, 70g 1개 355kcal·단백질 24g·지방 19g): 100g당 단백질 34.3g",
        "url": CP + "7537130432?itemId=18737915707",
        "image": "images/dryou-proteinbar-crunch-560g.jpg",
        "platform": "coupang",
        "note": "70g 8개입(560g) · 100g당 2,571원, 1개 1,800원. 1개 단백질 24g·355kcal로 프로틴바 중 최상위 함량. 단백질 20g당 1,500원. 리뷰 4,101건 평점 5.0. 11/22 확인.",
        "affiliateUrl": CP + "7537130432?itemId=18737915707",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "post-proteinbar-mini-231g-2",
        "part": "snack", "category": "bar", "categoryId": "bar", "group": "유제품·간식",
        "brand": "포스트", "name": "포스트 단백질바 미니, 231g, 2개 (11g×21개입×2)",
        "kind": "프로틴바 · 미니", "flavor": "초코",
        "price": 8360, "listPrice": 11600, "discountPct": 28,
        "weightG": 462, "packCount": 42, "eachLabel": "개", "measure": "per100g",
        "rating": 5.0, "reviewCount": 7371, "popularScore": 85.0,
        "proteinPer100g": 27.3, "proteinPerPackG": 3, "kcalPerPack": 53,
        "protein_g_per_bottle": 3, "kcal_per_bottle": 53,
        "proteinStatus": "3g", "proteinBasis": "1개(11g)",
        "storage": "실온",
        "nutritionSource": "라벨 기준(에누리 상품정보, 1개 11g 53kcal·단백질 3g·지방 2.8g): 100g당 단백질 27.3g",
        "url": CP + "8414651411?itemId=24292118425",
        "image": "images/post-proteinbar-mini-231g-2.jpg",
        "platform": "coupang",
        "note": "11g 미니 21개입 2박스(42개) · 100g당 1,810원, 1개 199원. 한입 크기 간식용. 리뷰 7,371건 평점 5.0. 11/22 확인.",
        "affiliateUrl": CP + "8414651411?itemId=24292118425",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "almondbreeze-unsweet-190ml-24",
        "part": "snack", "category": "soy", "categoryId": "soy", "group": "유제품·간식",
        "brand": "아몬드브리즈", "name": "아몬드브리즈 언스위트, 190ml, 24개",
        "kind": "아몬드 음료 · 무가당", "flavor": "언스위트",
        "price": 15670, "listPrice": 26400, "discountPct": 41,
        "volumeMl": 190, "packCount": 24, "container": "pet-small", "eachLabel": "팩",
        "measure": "per100ml",
        "rating": 5.0, "reviewCount": 178494, "popularScore": 94.0,
        "proteinPer100ml": 0.5, "sugarPerServing": 0,
        "nutritionSource": "식약처 공공데이터(먹스캔): 100ml당 15kcal·단백질 0.5g·당류 0.1g, 190ml 1팩 30kcal",
        "url": CP + "329389373?itemId=9060755624&vendorItemId=3006697064",
        "image": "images/almondbreeze-unsweet-190ml-24.png",
        "platform": "coupang",
        "note": "190ml 24팩 · 100ml당 344원, 1팩 653원. 당류 0g(언스위트)·1팩 30kcal로 우유 대체. 리뷰 17.8만건 평점 5.0. 11/22 확인.",
        "affiliateUrl": CP + "329389373?itemId=9060755624&vendorItemId=3006697064",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },

    # ── 닭가슴살 간편식 ──────────────────────────────────────────────
    {
        "id": "matitdak-steak-100g-10",
        "part": "chicken", "category": "chicken-meal", "categoryId": "chicken-meal", "group": "닭가슴살·안심",
        "brand": "맛있닭", "name": "맛있닭 닭가슴살 스테이크 오리지널, 100g, 10개",
        "kind": "닭가슴살 스테이크", "flavor": "오리지널",
        "price": 18480, "listPrice": 19880, "discountPct": 7,
        "weightG": 1000, "packCount": 10, "eachLabel": "팩", "measure": "per100g",
        "rating": 4.8, "reviewCount": 16427, "popularScore": 91.0,
        "proteinPer100g": 20.0, "fatPer100g": 6.0, "proteinPerPackG": 20, "kcalPerPack": 165,
        "proteinStatus": "20g", "proteinBasis": "1팩(100g)",
        "storage": "냉장",
        "nutritionSource": "라벨 영양 DB(필라이즈·노바, 맛있닭 스테이크 오리지널): 100g 165kcal·단백질 20g·지방 6g",
        "url": CP + "8721477488?itemId=25222871430&vendorItemId=92219201893",
        "image": "images/matitdak-steak-100g-10.jpg",
        "platform": "coupang",
        "note": "100g 10팩(1kg) · 100g당 1,848원, 1팩 1,848원. 단백질 20g/팩. 리뷰 1.6만건 평점 4.8. 11/22 확인.",
        "affiliateUrl": CP + "8721477488?itemId=25222871430&vendorItemId=92219201893",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "itmate-sausage-100g-20",
        "part": "chicken", "category": "chicken-meal", "categoryId": "chicken-meal", "group": "닭가슴살·안심",
        "brand": "잇메이트", "name": "잇메이트 닭가슴살 소시지 5종 혼합, 100g, 20개",
        "kind": "닭가슴살 소시지", "flavor": "5종 혼합",
        "price": 33800, "listPrice": 46800, "discountPct": 28,
        "weightG": 2000, "packCount": 20, "eachLabel": "팩", "measure": "per100g",
        "rating": 5.0, "reviewCount": 15511, "popularScore": 90.0,
        "proteinPer100g": 20.0, "fatPer100g": 2.0, "proteinPerPackG": 20, "kcalPerPack": 112,
        "proteinStatus": "20g", "proteinBasis": "1팩(100g)",
        "storage": "냉장",
        "nutritionSource": "식약처 공공데이터(먹스캔, 잇메이트 닭가슴살 소시지 훈제맛): 100g 112kcal·단백질 20g·지방 2g",
        "url": CP + "7427855563?vendorItemId=70259022008",
        "image": "images/itmate-sausage-100g-20.jpg",
        "platform": "coupang",
        "note": "100g 20개(2kg) · 100g당 1,690원, 1팩 1,690원. 단백질 20g·지방 2g로 저지방. 리뷰 1.5만건 평점 5.0. 11/22 확인.",
        "affiliateUrl": CP + "7427855563?vendorItemId=70259022008",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "heodak-cube-5jong-100g-20",
        "part": "chicken", "category": "chicken-meal", "categoryId": "chicken-meal", "group": "닭가슴살·안심",
        "brand": "허닭", "name": "허닭 한입 닭가슴살 큐브 5종 혼합, 100g, 20개",
        "kind": "닭가슴살 큐브", "flavor": "떡갈비·새우·깻잎·치즈·갈릭",
        "price": 35990, "listPrice": 40900, "discountPct": 12,
        "weightG": 2000, "packCount": 20, "eachLabel": "팩", "measure": "per100g",
        "rating": 5.0, "reviewCount": 1903, "popularScore": 86.0,
        "proteinPer100g": 18.0, "fatPer100g": 7.0, "proteinPerPackG": 18, "kcalPerPack": 165,
        "proteinStatus": "18g", "proteinBasis": "1팩(100g)",
        "storage": "냉동",
        "nutritionSource": "라벨 검수 DB(뉴트리봄, 허닭 한입 큐브 떡갈비맛): 100g 165kcal·단백질 18g·지방 7g",
        "url": CP + "1772224246?itemId=20012402727&vendorItemId=71005765859",
        "image": "images/heodak-cube-5jong-100g-20.png",
        "platform": "coupang",
        "note": "100g 20개(2kg) · 100g당 1,800원, 1팩 1,800원. 5가지 맛 혼합. 리뷰 1,903건 평점 5.0. 11/22 확인.",
        "affiliateUrl": CP + "1772224246?itemId=20012402727&vendorItemId=71005765859",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "harim-blackpepper-100g-10",
        "part": "chicken", "category": "chicken-meal", "categoryId": "chicken-meal", "group": "닭가슴살·안심",
        "brand": "하림", "name": "하림 닭가슴살 블랙페퍼, 100g, 10개",
        "kind": "닭가슴살 블랙페퍼", "flavor": "블랙페퍼",
        "price": 20700, "listPrice": None, "discountPct": None,
        "weightG": 1000, "packCount": 10, "eachLabel": "팩", "measure": "per100g",
        "rating": 5.0, "reviewCount": 27927, "popularScore": 92.0,
        "proteinPer100g": 24.0, "fatPer100g": 1.6, "proteinPerPackG": 24, "kcalPerPack": 115,
        "proteinStatus": "24g", "proteinBasis": "1팩(100g)",
        "storage": "냉장",
        "nutritionSource": "상품정보 라벨(에누리·다나와, 하림 닭가슴살 블랙페퍼): 100g 115kcal·단백질 24g·지방 1.6g",
        "url": CP + "7260940221?itemId=16938973800&vendorItemId=5269347916",
        "image": "images/harim-blackpepper-100g-10.jpg",
        "platform": "coupang",
        "note": "100g 10팩(1kg) · 100g당 2,070원, 1팩 2,070원. 단백질 24g·지방 1.6g로 간편식 중 단백질 밀도 최고. 리뷰 2.8만건 평점 5.0. 11/22 확인.",
        "affiliateUrl": CP + "7260940221?itemId=16938973800&vendorItemId=5269347916",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },

    # ── 고단백 볶음밥 ───────────────────────────────────────────────
    {
        "id": "matitdak-jumbo-friedrice-350g-12",
        "part": "rice", "category": "friedrice", "categoryId": "friedrice", "group": "고단백 볶음밥",
        "brand": "맛있닭", "name": "맛있닭 점보 닭가슴살 볶음밥 혼합, 350g, 12개",
        "kind": "고단백 볶음밥 · 혼합", "flavor": "6종 혼합",
        "price": 53960, "listPrice": 67800, "discountPct": 20,
        "weightG": 4200, "packCount": 12, "eachLabel": "팩", "measure": "per100g",
        "rating": 4.5, "reviewCount": 244, "popularScore": 84.0,
        "proteinPer100g": 12.0, "proteinPerPackG": 42, "kcalPerPack": 515,
        "proteinStatus": "42g", "proteinBasis": "1팩(350g)",
        "storage": "냉동",
        "nutritionSource": "라벨 검수 DB(뉴트리봄·단픽, 점보 김치맛): 1팩 350g 515kcal·단백질 42g·지방 9g",
        "url": CP + "8243165020?itemId=24892490293&vendorItemId=90746708739",
        "image": "images/matitdak-jumbo-friedrice-350g-12.jpg",
        "platform": "coupang",
        "note": "350g 12팩(4.2kg) · 100g당 1,285원, 1팩 4,497원. 1팩 단백질 42g로 볶음밥 중 최고 수준(단백질 20g당 2,142원). 리뷰 244건 평점 4.5. 11/22 확인.",
        "affiliateUrl": CP + "8243165020?itemId=24892490293&vendorItemId=90746708739",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },

    # ── 소·돼지고기 ─────────────────────────────────────────────────
    {
        "id": "gomgom-handon-apdari-1kg",
        "part": "meat", "category": "pork", "categoryId": "pork", "group": "소·돼지고기",
        "brand": "곰곰", "name": "곰곰 한돈 앞다리살 수육용 (냉장), 1kg, 1팩",
        "kind": "돼지고기 · 앞다리살", "flavor": "앞다리(수육용)",
        "price": 12380, "listPrice": None, "discountPct": None,
        "weightG": 1000, "packCount": 1, "eachLabel": "팩", "measure": "per100g",
        "rating": 4.5, "reviewCount": 50542, "popularScore": 93.0,
        "proteinPer100g": 20.6, "fatPer100g": 7.9,
        "storage": "냉장",
        "nutritionSource": "농촌진흥청 국가표준식품성분 DB(돼지고기 앞다리살 생것): 100g당 단백질 20.6g·지방 7.9g",
        "url": CP + "1465326792?itemId=70512939979",
        "image": "images/gomgom-handon-apdari-1kg.jpg",
        "platform": "coupang",
        "note": "국내산 한돈 1kg · 100g당 1,238원. 앞다리살은 목살보다 지방이 절반 이하(7.9g vs 16.4g)에 단백질은 더 높아 식단용으로 가성비가 좋아요. 리뷰 5만건 평점 4.5. 11/22 확인.",
        "affiliateUrl": CP + "1465326792?itemId=70512939979",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "gogeupjin-canada-moksal-1kg",
        "part": "meat", "category": "pork", "categoryId": "pork", "group": "소·돼지고기",
        "brand": "고급진", "name": "고급진 캐나다산 목살 구이용 (냉장), 1kg, 1개",
        "kind": "돼지고기 · 목살", "flavor": "목살(구이용)",
        "price": 14060, "listPrice": None, "discountPct": None,
        "weightG": 1000, "packCount": 1, "eachLabel": "개", "measure": "per100g",
        "rating": 5.0, "reviewCount": 14635, "popularScore": 88.0,
        "proteinPer100g": 17.2, "fatPer100g": 16.4,
        "storage": "냉장",
        "nutritionSource": "농촌진흥청 국가표준식품성분 DB(돼지고기 목심 생것): 100g당 단백질 17.2g·지방 16.4g",
        "url": CP + "8259218904?itemId=23790226690",
        "image": "images/gogeupjin-canada-moksal-1kg.jpg",
        "platform": "coupang",
        "note": "캐나다산 냉장 목살 1kg · 100g당 1,406원. 모아미트 목살(1,477원)보다 100g당 71원 저렴. 리뷰 1.5만건 평점 5.0. 11/22 확인.",
        "affiliateUrl": CP + "8259218904?itemId=23790226690",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "au-hongdukke-slice-500g-2",
        "part": "meat", "category": "beef", "categoryId": "beef", "group": "소·돼지고기",
        "brand": "호주청정우", "name": "호주산 우홍두깨 슬라이스 (냉동), 500g, 2개",
        "kind": "소고기 · 홍두깨(우둔)", "flavor": "홍두깨 슬라이스",
        "price": 28000, "listPrice": None, "discountPct": None,
        "weightG": 1000, "packCount": 2, "eachLabel": "팩", "measure": "per100g",
        "rating": 4.5, "reviewCount": 4066, "popularScore": 87.0,
        "proteinPer100g": 21.6, "fatPer100g": 7.3,
        "storage": "냉동",
        "nutritionSource": "농촌진흥청 국가표준식품성분 DB(소 우둔 홍두깨살, 한우 1+등급 생것): 100g당 단백질 21.6g·지방 7.3g",
        "url": CP + "8510668564?vendorItemId=91673082289",
        "image": "images/au-hongdukke-slice-500g-2.png",
        "platform": "coupang",
        "note": "500g 2팩(1kg) · 100g당 2,800원. 부채살(3,752원)보다 100g당 950원 싸고 단백질은 더 높아요(21.6g vs 20.4g). 리뷰 4,066건 평점 4.5. 11/22 확인.",
        "affiliateUrl": CP + "8510668564?vendorItemId=91673082289",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
]

CATEGORIES_ADD = [
    {"after": "acv", "cat": {"id": "energy", "label": "에너지드링크", "icon": "⚡", "part": "zero"}},
    {"after": "friedrice", "cat": {"id": "yogurt", "label": "그릭요거트", "icon": "🥣", "part": "snack"}},
    {"after": "yogurt", "cat": {"id": "bar", "label": "프로틴바", "icon": "🍫", "part": "snack"}},
    {"after": "bar", "cat": {"id": "soy", "label": "두유·아몬드", "icon": "🥛", "part": "snack"}},
    {"after": "breast", "cat": {"id": "chicken-meal", "label": "닭가슴살 간편식", "icon": "🍗", "part": "chicken"}},
]

SNACK_PART = {
    "id": "snack",
    "label": "유제품·간식",
    "icon": "🥣",
    "desc": "100g·100ml당 가격 낮은 순",
    "note": "그릭요거트·프로틴바는 100g당, 아몬드브리즈 같은 음료는 100ml당 가격으로 비교해요.",
    "filters": [
        {"id": "all", "label": "전체", "cats": ["yogurt", "bar", "soy"]},
        {"id": "yogurt", "label": "그릭요거트", "icon": "🥣", "cats": ["yogurt"]},
        {"id": "bar", "label": "프로틴바", "icon": "🍫", "cats": ["bar"]},
        {"id": "soy", "label": "두유·아몬드", "icon": "🥛", "cats": ["soy"]},
    ],
}


def won(n):
    return f"{n:,}원"


def recompute(p):
    price = p["price"]
    weight = p.get("weightG")
    vol = p.get("volumeMl")
    pack = p.get("packCount") or 1
    if vol and not weight:
        per100 = round(price / (vol * pack) * 100)
        p["unitPricePer100ml"] = per100
        p["perValue"] = float(per100)
        p["measure"] = "per100ml"
        p["unitPrice"] = f"100ml당 {per100:,}원"
        each = round(price / pack)
        p["eachPrice"] = each
        if not p.get("eachLabel"):
            p["eachLabel"] = "캔" if vol <= 360 else "병"
        p["unitEach"] = f"1{p['eachLabel']}당 {each:,}원"
    elif weight:
        per100 = round(price / weight * 100)
        p["per100g"] = per100
        p["perValue"] = float(per100)
        p["measure"] = "per100g"
        p["unitPrice"] = f"100g당 {per100:,}원"
        if pack > 1:
            each = round(price / pack)
            p["eachPrice"] = each
            p.setdefault("eachLabel", "팩")
            p["unitEach"] = f"1{p['eachLabel']}({round(weight / pack):,}g)당 {each:,}원"
        else:
            scale = 1000 if weight >= 1000 else 1
            p.setdefault("eachLabel", "개")
            p["eachPrice"] = price
            p["unitEach"] = f"1개({weight / scale:g}{'kg' if scale == 1000 else 'g'})당 {price:,}원"
    if isinstance(p.get("protein_g_per_bottle"), (int, float)) and p["protein_g_per_bottle"] > 0 and p.get("eachPrice"):
        p["protein20"] = round(p["eachPrice"] / p["protein_g_per_bottle"] * 20)
        p["pricePer20gProtein"] = p["protein20"]
    elif isinstance(p.get("proteinPer100g"), (int, float)) and p["proteinPer100g"] > 0 and isinstance(p.get("per100g"), (int, float)):
        p["protein20"] = round(p["per100g"] * 20 / p["proteinPer100g"])
        p["pricePer20gProtein"] = p["protein20"]
    if p.get("proteinPerPackG"):
        p["proteinPackStatus"] = f"{p['proteinPerPackG']}g"
    return p


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    products = [p for p in data["products"] if p["id"] not in {n["id"] for n in NEW}]

    # 품절 표기
    for p in products:
        if p["id"] == "meat-pork-dodram-handon-samgyeopsal-1kg":
            p["soldOut"] = True

    # 카테고리 추가
    cats = list(data["categories"])
    for item in CATEGORIES_ADD:
        if any(c["id"] == item["cat"]["id"] for c in cats):
            continue
        idx = next(i for i, c in enumerate(cats) if c["id"] == item["after"])
        cats.insert(idx + 1, item["cat"])
    data["categories"] = cats

    # 파트 추가 (rice 뒤에 snack)
    parts = [pt for pt in data["parts"] if pt["id"] != "snack"]
    idx = next(i for i, pt in enumerate(parts) if pt["id"] == "rice")
    parts.insert(idx + 1, SNACK_PART)
    # 닭가슴살 파트 필터에 '간편식' 칩 추가
    for pt in parts:
        if pt["id"] == "chicken":
            filters = pt.setdefault("filters", [])
            if not any(f["id"] == "chicken-meal" for f in filters):
                allf = next(f for f in filters if f["id"] == "all")
                allf["cats"] = allf["cats"] + ["chicken-meal"]
                filters.insert(
                    1,
                    {"id": "chicken-meal", "label": "닭가슴살 간편식", "icon": "🍗", "cats": ["chicken-meal"]},
                )
            pt["note"] = "닭가슴살·안심 원물과 간편식(스테이크·소시지·큐브)을 100g당 가격으로 비교해요."
    data["parts"] = parts

    # 새 상품 추가
    for np in NEW:
        p = dict(np)
        recompute(p)
        products.append(p)

    order = {"zero": 0, "protein": 1, "rice": 2, "snack": 3, "chicken": 4, "meat": 5}
    catorder = {c["id"]: i for i, c in enumerate(cats)}
    products.sort(key=lambda p: (order.get(p["part"], 9), catorder.get(p["category"], 99), -(p.get("popularScore") or 0)))
    data["products"] = products
    data["site"]["tagline"] = "제로음료·생수·단백질·볶음밥·닭가슴살·유제품·소·돼지고기 단가 비교"
    data["site"]["updatedAt"] = "2026-11-22"
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # 가격 이력
    hist = json.loads(HIST.read_text(encoding="utf-8"))
    kept = {p["id"] for p in products}
    hist["products"] = {k: v for k, v in hist["products"].items() if k in kept}
    for np in NEW:
        if np["id"] in hist["products"]:
            continue
        entry = {
            "id": np["id"],
            "name": np["name"],
            "platform": "coupang",
            "cardPrice": np["price"],
            "cardPriceCheckedAt": CHECKED_AT,
            "sourceUrl": np["url"],
            "coupang": {"productId": np["url"].split("/products/")[1].split("?")[0]},
            "source": "mart",
            "status": "tracking-started",
            "statusDetail": "new-item",
            "series": [{"date": "2026-11-22", "price": np["price"], "ts": "2026-11-22T21:20:00+09:00", "src": "mart"}],
            "stats": {"min": np["price"], "minDate": "2026-11-22", "max": np["price"], "maxDate": "2026-11-22",
                      "avg": np["price"], "latest": np["price"], "latestDate": "2026-11-22",
                      "observations": 1, "days": 1},
            "lastObservedAt": "2026-11-22T21:20:00+09:00",
        }
        if np.get("listPrice"):
            entry["cardListPrice"] = np["listPrice"]
        hist["products"][np["id"]] = entry
    hist["meta"]["generatedAt"] = "2026-11-22T21:20:00+09:00"
    hist["meta"]["note"] = "r64(2026-11-22) — 50종 확장: 신규 16종(제로음료·생수 3, 유제품·간식 5, 닭가슴살 간편식 4, 볶음밥 1, 소·돼지고기 3) 추적 시작."
    HIST.write_text(json.dumps(hist, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # js/products.js 재생성
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

    print("products:", len(products))
    from collections import Counter
    print("by part:", Counter(p["part"] for p in products))
    print("by platform:", Counter(p.get("platform") for p in products))


if __name__ == "__main__":
    main()
