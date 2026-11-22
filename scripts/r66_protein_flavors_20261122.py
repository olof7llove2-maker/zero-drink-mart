#!/usr/bin/env python3
"""r66 — 단백질 음료 맛별 확충 (2026-11-22 밤).

재영 님 지시:
  "단백질 음료수는 좀 맛별로 추가해놓자 더단백은 다 있어야할거같아" / "셀렉스도 마찬가지고"
  "그리고 맛별로 섞은거도 있잖아 그런것도 특가있으면 넣어놔 그냥"
  → 테이크핏(맥스)·닥터유 프로도 대표 맛·혼합팩 함께.

1. 더단백(빙그레) 드링크 맛 8종 + 6종 기획 혼합팩 1종 = 9종 신규
2. 셀렉스(매일) 프로핏 맛 3종 = 3종 신규
3. 테이크핏(남양) 맥스 맛 2종 + 4종 혼합팩 1종 = 3종 신규
4. 닥터유 프로(오리온) 40g 맛 2종 + 3종 혼합팩 1종 = 3종 신규
   → 50종 → 68종 (단백질 음료 6 → 24종)
5. 하이뮨 프로틴 밸런스 액티브 오리지널 18개: 와우할인 종료로 25,760 → 28,000원 정정
6. price-history: 신규 18종 추적 시작, 하이뮨 관측치 추가

가격·리뷰는 2026-11-22 23:10~23:45 쿠팡 로그인 세션에서 상품 목록·상품 페이지로 직접 확인.
영양(단백질·열량)은 제품 라벨·식약처 공공데이터·제조사 공식 제품정보에서 확인(각 상품 nutritionSource).
사용법: python3 scripts/r66_protein_flavors_20261122.py
"""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
HIST = ROOT / "data" / "price-history.json"
JS = ROOT / "js" / "products.js"

CHECKED_AT = "2026-11-22 23:40"
CHECKED_LABEL = "11/22 밤(23:10~23:40) 쿠팡 기준"
CP = "https://www.coupang.com/vp/products/"

DD = "더단백 우유단백(분리·농축우유단백)"
DD_NOTE = "제품 라벨(빙그레 더단백 드링크 250ml): 단백질 20g, 당류 0.8g"
SLX = "매일유업 공식 제품정보(셀렉스 프로핏 완전단백질 음료): 분리유단백+분리대두단백"

NEW = [
    # ── 더단백(빙그레) 드링크 맛별 ────────────────────────────────────
    {
        "id": "deodanbaek-deuringkeu-ttalgi-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "더단백", "name": "더단백 드링크 딸기, 250ml, 18개",
        "kind": "단백질 음료 · 딸기", "flavor": "딸기", "proteinType": "fruit",
        "price": 23290, "listPrice": 34800, "discountPct": 33,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 20, "proteinStatus": "20g",
        "kcal_per_bottle": 105, "kcalStatus": "105kcal", "sugarPerServing": 0.8,
        "rating": 5.0, "reviewCount": 9222, "popularScore": 74.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "milk", "proteinSource": "우유단백(MPC)", "proteinSourceDetail": "분리·농축우유단백",
        "url": CP + "7814209814?itemId=21359437294&vendorItemId=88266164587",
        "image": "images/deodanbaek-deuringkeu-ttalgi-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": DD_NOTE + " · 식약처 공공데이터(먹스캔) 250ml 105kcal·단백질 20g",
        "note": "250ml 18개 · 100ml당 518원, 1병 1,294원, 단백질 20g당 1,294원. 더단백에서 가장 잘 팔리는 맛(리뷰 9,222건). 11/22 확인.",
        "affiliateUrl": CP + "7814209814?itemId=21359437294&vendorItemId=88266164587",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "deodanbaek-deuringkeu-keopi-a-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "더단백", "name": "더단백 드링크 커피 A, 250ml, 18개",
        "kind": "단백질 음료 · 커피", "flavor": "커피", "proteinType": "plain",
        "price": 23980, "listPrice": 34800, "discountPct": 31,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 20, "proteinStatus": "20g",
        "sugarPerServing": 0.8,
        "rating": 5.0, "reviewCount": 17520, "popularScore": 80.0,
        "caffeine": "contains", "caffeineMg": None, "aspartame": None,
        "proteinSourceKey": "milk", "proteinSource": "우유단백(MPC)", "proteinSourceDetail": "분리·농축우유단백",
        "url": CP + "7411107327?itemId=19202399565&vendorItemId=81135143112",
        "image": "images/deodanbaek-deuringkeu-keopi-a-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨(빙그레 더단백 드링크 250ml): 단백질 20g · 커피향이라 카페인 함유 표기",
        "note": "250ml 18개 · 100ml당 533원, 1병 1,332원, 단백질 20g당 1,332원. 리뷰 17,520건으로 더단백 맛 중 2번째로 많아요. 커피 성분이 있어 카페인 표기. 11/22 확인.",
        "affiliateUrl": CP + "7411107327?itemId=19202399565&vendorItemId=81135143112",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "deodanbaek-deuringkeu-karamel-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "더단백", "name": "더단백 드링크 카라멜, 250ml, 18개",
        "kind": "단백질 음료 · 카라멜", "flavor": "카라멜", "proteinType": "plain",
        "price": 23750, "listPrice": 34800, "discountPct": 31,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 20, "proteinStatus": "20g",
        "sugarPerServing": 0.8,
        "rating": 5.0, "reviewCount": 5939, "popularScore": 62.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "milk", "proteinSource": "우유단백(MPC)", "proteinSourceDetail": "분리·농축우유단백",
        "url": CP + "7616812492?itemId=20184839209&vendorItemId=81133193583",
        "image": "images/deodanbaek-deuringkeu-karamel-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨(빙그레 더단백 드링크 250ml): 단백질 20g",
        "note": "250ml 18개 · 100ml당 528원, 1병 1,319원, 단백질 20g당 1,319원. 리뷰 5,939건. 11/22 확인.",
        "affiliateUrl": CP + "7616812492?itemId=20184839209&vendorItemId=81133193583",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "deodanbaek-deuringkeu-banana-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "더단백", "name": "더단백 드링크 바나나, 250ml, 18개",
        "kind": "단백질 음료 · 바나나", "flavor": "바나나", "proteinType": "fruit",
        "price": 27540, "listPrice": 34800, "discountPct": 20,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 20, "proteinStatus": "20g",
        "kcal_per_bottle": 105, "kcalStatus": "105kcal", "sugarPerServing": 0.7,
        "rating": 5.0, "reviewCount": 2383, "popularScore": 52.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "milk", "proteinSource": "우유단백(MPC)", "proteinSourceDetail": "분리·농축우유단백",
        "url": CP + "7821923664?itemId=21248069591&vendorItemId=88308626475",
        "image": "images/deodanbaek-deuringkeu-banana-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": DD_NOTE + " · 식약처 공공데이터(먹스캔) 바나나 250ml 105kcal·단백질 20g·당류 0.7g",
        "note": "250ml 18개 · 100ml당 612원, 1병 1,530원, 단백질 20g당 1,530원. 36개(41,150원)로 사면 100ml당 457원까지 내려가요. 11/22 확인.",
        "affiliateUrl": CP + "7821923664?itemId=21248069591&vendorItemId=88308626475",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "deodanbaek-melron-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "더단백", "name": "더단백 멜론, 250ml, 18개",
        "kind": "단백질 음료 · 멜론", "flavor": "멜론", "proteinType": "fruit",
        "price": 23750, "listPrice": 34800, "discountPct": 31,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 20, "proteinStatus": "20g",
        "sugarPerServing": 0.8,
        "rating": 5.0, "reviewCount": 3972, "popularScore": 65.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "milk", "proteinSource": "우유단백(MPC)", "proteinSourceDetail": "분리·농축우유단백",
        "url": CP + "8308582418?itemId=23972733461&vendorItemId=90994072738",
        "image": "images/deodanbaek-melron-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨(빙그레 더단백 드링크 250ml): 단백질 20g",
        "note": "250ml 18개 · 100ml당 528원, 1병 1,319원, 단백질 20g당 1,319원. 리뷰 3,972건. 36개(41,150원)면 100ml당 457원. 11/22 확인.",
        "affiliateUrl": CP + "8308582418?itemId=23972733461&vendorItemId=90994072738",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "deodanbaek-deuringkeu-milkteu-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "더단백", "name": "더단백 드링크 밀크티, 250ml, 18개",
        "kind": "단백질 음료 · 밀크티", "flavor": "밀크티", "proteinType": "plain",
        "price": 27340, "listPrice": 34800, "discountPct": 21,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 20, "proteinStatus": "20g",
        "sugarPerServing": 0.8, "caffeine": "contains",
        "rating": 5.0, "reviewCount": 2252, "popularScore": 50.0,
        "aspartame": None,
        "proteinSourceKey": "milk", "proteinSource": "우유단백(MPC)", "proteinSourceDetail": "분리·농축우유단백",
        "url": CP + "7821929485?vendorItemId=88308658437",
        "image": "images/deodanbaek-deuringkeu-milkteu-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨(빙그레 더단백 드링크 250ml): 단백질 20g · 홍차 성분으로 카페인 함유",
        "note": "250ml 18개 · 100ml당 608원, 1병 1,519원, 단백질 20g당 1,519원. 맛 중 가장 비싼 축이에요. 리뷰 2,252건. 11/22 확인.",
        "affiliateUrl": CP + "7821929485?vendorItemId=88308658437",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "deodanbaek-deuringkeu-minteuchoko-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "더단백", "name": "더단백 드링크 민트초코, 250ml, 18개",
        "kind": "단백질 음료 · 민트초코", "flavor": "민트초코", "proteinType": "choco",
        "price": 25450, "listPrice": 34800, "discountPct": 26,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 20, "proteinStatus": "20g",
        "sugarPerServing": 0.8, "caffeine": "none",
        "rating": 5.0, "reviewCount": 524, "popularScore": 45.0,
        "aspartame": None,
        "proteinSourceKey": "milk", "proteinSource": "우유단백(MPC)", "proteinSourceDetail": "분리·농축우유단백",
        "url": CP + "9422053894?vendorItemId=95276536420",
        "image": "images/deodanbaek-deuringkeu-minteuchoko-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨(빙그레 더단백 드링크 250ml): 단백질 20g",
        "note": "250ml 18개 · 100ml당 566원, 1병 1,414원, 단백질 20g당 1,414원. 리뷰 524건으로 아직 적어요. 11/22 확인.",
        "affiliateUrl": CP + "9422053894?vendorItemId=95276536420",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "deodanbaek-deuringkeu-dakeuchoko-330ml-12gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "더단백", "name": "더단백 드링크 다크초코, 330ml, 12개",
        "kind": "단백질 음료 · 다크초코", "flavor": "다크초코", "proteinType": "choco",
        "price": 24410, "listPrice": 42000, "discountPct": 41,
        "volumeMl": 330, "packCount": 12, "container": "pet-small",
        "protein_g_per_bottle": 35, "proteinStatus": "35g",
        "kcal_per_bottle": 168, "kcalStatus": "168kcal", "sugarPerServing": 0.9,
        "rating": 5.0, "reviewCount": 2156, "popularScore": 58.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "milk", "proteinSource": "우유단백(MPI)", "proteinSourceDetail": "분리·농축우유단백 100%",
        "url": CP + "9165375222?itemId=27003819134&vendorItemId=93972516698",
        "image": "images/deodanbaek-deuringkeu-dakeuchoko-330ml-12gae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨·다나와 스펙(더단백 드링크 다크초코 330ml): 단백질 35g·168kcal·당류 0.9g",
        "note": "330ml 12개 · 100ml당 616원, 1병 2,034원, 단백질 20g당 1,162원. 40g 더블초코보다 가볍게 마시는 35g 라인이에요. 와우쿠폰 적용가. 11/22 확인.",
        "affiliateUrl": CP + "9165375222?itemId=27003819134&vendorItemId=93972516698",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "binggeure-deodanbaek-6jong-gihoek-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "더단백", "name": "더단백 6종 기획(초코·카라멜·커피·딸기·바나나·멜론), 250ml, 18개",
        "kind": "단백질 음료 · 6종 혼합", "flavor": "6종 혼합", "proteinType": "mixed",
        "price": 26190, "listPrice": 29900, "discountPct": 12,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 20, "proteinStatus": "20g",
        "sugarPerServing": 0.8, "caffeine": "none",
        "rating": 5.0, "reviewCount": 2360, "popularScore": 60.0,
        "aspartame": None,
        "proteinSourceKey": "milk", "proteinSource": "우유단백(MPC)", "proteinSourceDetail": "분리·농축우유단백",
        "url": CP + "8628856177?itemId=25036110037&vendorItemId=92040776124",
        "image": "images/binggeure-deodanbaek-6jong-gihoek-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨(빙그레 더단백 드링크 250ml): 맛별 단백질 20g (혼합팩 3맛×6개)",
        "note": "250ml 18개(6맛 × 3개) · 100ml당 582원, 1병 1,455원, 단백질 20g당 1,455원. 단일맛(초코 542원)과 큰 차이 없이 6맛을 맛볼 수 있어요. 리뷰 2,360건. 11/22 확인.",
        "affiliateUrl": CP + "8628856177?itemId=25036110037&vendorItemId=92040776124",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },

    # ── 셀렉스(매일) 프로핏 맛별 ─────────────────────────────────────
    {
        "id": "selrekseu-peuropit-ttalgichoko-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "셀렉스", "name": "셀렉스 프로핏 딸기초코, 250ml, 18개",
        "kind": "단백질 음료 · 딸기초코", "flavor": "딸기초코", "proteinType": "choco",
        "price": 27900, "listPrice": None, "discountPct": None,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 20, "proteinStatus": "20g",
        "kcal_per_bottle": 100, "kcalStatus": "100kcal", "sugarPerServing": 0,
        "rating": 5.0, "reviewCount": 851, "popularScore": 47.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "blend", "proteinSource": "유청+대두 혼합단백", "proteinSourceDetail": "분리유단백·ISP",
        "url": CP + "8817045827?itemId=26033649782&vendorItemId=95580940394",
        "image": "images/selrekseu-peuropit-ttalgichoko-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": "매일유업 공식 제품정보: 딸기초코 250ml 100kcal·단백질 20g·당류 0g·BCAA 4,200mg",
        "note": "250ml 18개 · 100ml당 620원, 1병 1,550원, 단백질 20g당 1,550원. ZERO SUGAR·락토프리. 리뷰 851건. 11/22 확인.",
        "affiliateUrl": CP + "8817045827?itemId=26033649782&vendorItemId=95580940394",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "selrekseu-peuropit-banana-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "셀렉스", "name": "셀렉스 프로핏 바나나, 250ml, 18개",
        "kind": "단백질 음료 · 바나나", "flavor": "바나나", "proteinType": "fruit",
        "price": 26880, "listPrice": None, "discountPct": None,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 20, "proteinStatus": "20g",
        "kcal_per_bottle": 100, "kcalStatus": "100kcal", "sugarPerServing": 0,
        "rating": 5.0, "reviewCount": 1472, "popularScore": 44.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "blend", "proteinSource": "유청+대두 혼합단백", "proteinSourceDetail": "분리유단백·ISP",
        "url": CP + "8397547499?vendorItemId=94499748277",
        "image": "images/selrekseu-peuropit-banana-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": "매일유업 공식 제품정보: 바나나 250ml 100kcal·단백질 20g·당류 0g",
        "note": "250ml 18개 · 100ml당 597원, 1병 1,493원, 단백질 20g당 1,493원. 36개(50,120원)면 100ml당 557원. 11/22 확인.",
        "affiliateUrl": CP + "8397547499?vendorItemId=94499748277",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "selrekseu-peuropit-milkeubanilla-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "셀렉스", "name": "셀렉스 프로핏 밀크 바닐라, 250ml, 18개",
        "kind": "단백질 음료 · 밀크바닐라", "flavor": "밀크바닐라", "proteinType": "plain",
        "price": 26900, "listPrice": None, "discountPct": None,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 20, "proteinStatus": "20g",
        "kcal_per_bottle": 105, "kcalStatus": "105kcal", "sugarPerServing": 0,
        "rating": 5.0, "reviewCount": 6303, "popularScore": 55.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "blend", "proteinSource": "유청+대두 혼합단백", "proteinSourceDetail": "분리유단백·ISP",
        "url": CP + "8415619462?vendorItemId=86983543109",
        "image": "images/selrekseu-peuropit-milkeubanilla-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": "매일유업 공식 제품정보: 밀크바닐라 250ml 105kcal·단백질 20g·당류 0g·식이섬유 5g",
        "note": "250ml 18개 · 100ml당 598원, 1병 1,494원, 단백질 20g당 1,494원. 24개(32,690원)로 사면 100ml당 545원. 리뷰 6,303건. 11/22 확인.",
        "affiliateUrl": CP + "8415619462?vendorItemId=86983543109",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },

    # ── 테이크핏(남양) 맥스 맛별·혼합 ─────────────────────────────────
    {
        "id": "teikeupit-maekseu-gosohanmat-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "테이크핏", "name": "테이크핏 맥스 고소한맛, 250ml, 18개",
        "kind": "단백질 음료 · 고소한맛", "flavor": "고소한맛", "proteinType": "plain",
        "price": 24400, "listPrice": None, "discountPct": None,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 24, "proteinStatus": "24g",
        "kcal_per_bottle": 105, "kcalStatus": "105kcal", "sugarPerServing": 0.7,
        "rating": 5.0, "reviewCount": 9971, "popularScore": 66.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "blend", "proteinSource": "유청+대두 혼합단백", "proteinSourceDetail": "ISP·WPI·MPC",
        "url": CP + "7923583836?itemId=28988522008&vendorItemId=95917380087",
        "image": "images/teikeupit-maekseu-gosohanmat-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨·식약처 공공데이터(먹스캔): 250ml 105kcal·단백질 24g·당류 0.7g",
        "note": "250ml 18개 · 100ml당 542원, 1병 1,356원, 단백질 20g당 1,130원. 테이크핏 맥스에서 초코 다음으로 잘 팔리는 맛(리뷰 9,971건). 11/22 확인.",
        "affiliateUrl": CP + "7923583836?itemId=28988522008&vendorItemId=95917380087",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "teikeupit-maekseu-ttalgimat-250ml-18gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "테이크핏", "name": "테이크핏 맥스 딸기맛, 250ml, 18개",
        "kind": "단백질 음료 · 딸기맛", "flavor": "딸기", "proteinType": "fruit",
        "price": 24750, "listPrice": None, "discountPct": None,
        "volumeMl": 250, "packCount": 18, "container": "pet-small",
        "protein_g_per_bottle": 24, "proteinStatus": "24g",
        "kcal_per_bottle": 105, "kcalStatus": "105kcal", "sugarPerServing": 0.7,
        "rating": 5.0, "reviewCount": 295, "popularScore": 42.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "blend", "proteinSource": "유청+대두 혼합단백", "proteinSourceDetail": "ISP·WPI·MPC",
        "url": CP + "9675021781?itemId=28988522015&vendorItemId=95917380113",
        "image": "images/teikeupit-maekseu-ttalgimat-250ml-18gae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨(테이크핏 맥스 250ml): 단백질 24g·105kcal·당류 0.7g",
        "note": "250ml 18개 · 100ml당 550원, 1병 1,375원, 단백질 20g당 1,146원. 리뷰 295건으로 아직 적은 맛. 11/22 확인.",
        "affiliateUrl": CP + "9675021781?itemId=28988522015&vendorItemId=95917380113",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "teikeupit-maekseu-4jong-honhap-250ml-12pae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "테이크핏", "name": "테이크핏 맥스 4종 혼합(초코·고소한맛·호박고구마·바나나), 250ml, 12개",
        "kind": "단백질 음료 · 4종 혼합", "flavor": "4종 혼합", "proteinType": "mixed",
        "price": 19010, "listPrice": 20010, "discountPct": 4,
        "volumeMl": 250, "packCount": 12, "container": "pet-small",
        "protein_g_per_bottle": 24, "proteinStatus": "24g",
        "kcal_per_bottle": 105, "kcalStatus": "105kcal", "sugarPerServing": 0.7,
        "rating": 5.0, "reviewCount": 646, "popularScore": 54.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "blend", "proteinSource": "유청+대두 혼합단백", "proteinSourceDetail": "ISP·WPI·MPC",
        "url": CP + "9540506572?itemId=28458032267&vendorItemId=95408521277",
        "image": "images/teikeupit-maekseu-4jong-honhap-250ml-12pae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨(테이크핏 맥스 250ml): 단백질 24g·105kcal (4종 동일)",
        "note": "250ml 12개(4맛 × 3개) · 1병 1,584원, 단백질 20g당 1,320원. 12개짜리라 단일맛 18개보다 100ml당 634원으로 조금 비싸지만 네 맛을 다 맛볼 수 있어요. 11/22 확인.",
        "affiliateUrl": CP + "9540506572?itemId=28458032267&vendorItemId=95408521277",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },

    # ── 닥터유 프로(오리온) 40g 맛별·혼합 ────────────────────────────
    {
        "id": "dakteoyu-peuro-40g-deuringkeu-choko-350ml-20gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "닥터유", "name": "닥터유 프로 단백질 40g 드링크 초코, 350ml, 20개",
        "kind": "단백질 음료 · 초코(40g)", "flavor": "초코", "proteinType": "choco",
        "price": 47110, "listPrice": None, "discountPct": None,
        "volumeMl": 350, "packCount": 20, "container": "pet-small",
        "protein_g_per_bottle": 40, "proteinStatus": "40g",
        "kcal_per_bottle": 247, "kcalStatus": "247kcal", "sugarPerServing": 4.2,
        "rating": 5.0, "reviewCount": 1371, "popularScore": 60.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "blend", "proteinSource": "유청+우유 혼합단백", "proteinSourceDetail": "WPI·MPC·칼슘 700mg",
        "url": CP + "8411577572?itemId=23873191270&vendorItemId=93469483090",
        "image": "images/dakteoyu-peuro-40g-deuringkeu-choko-350ml-20gae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨·다나와 스펙(닥터유 프로 40g 초코 350ml): 단백질 40g·247kcal·당류 4.2g·칼슘 700mg",
        "note": "350ml 20개 · 100ml당 673원, 1병 2,356원, 단백질 20g당 1,178원. 한 병에 40g이라 단백질 20g당으로 보면 더단백·셀렉스보다 쌉니다. 11/22 확인.",
        "affiliateUrl": CP + "8411577572?itemId=23873191270&vendorItemId=93469483090",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "dakteoyu-peuro-40g-deuringkeu-ttalgi-350ml-20gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "닥터유", "name": "닥터유 프로 단백질 40g 드링크 딸기, 350ml, 20개",
        "kind": "단백질 음료 · 딸기(40g)", "flavor": "딸기", "proteinType": "fruit",
        "price": 50890, "listPrice": None, "discountPct": None,
        "volumeMl": 350, "packCount": 20, "container": "pet-small",
        "protein_g_per_bottle": 40, "proteinStatus": "40g",
        "kcal_per_bottle": 247, "kcalStatus": "247kcal", "sugarPerServing": 4.2,
        "rating": 5.0, "reviewCount": 1070, "popularScore": 55.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "blend", "proteinSource": "유청+우유 혼합단백", "proteinSourceDetail": "WPI·MPC·칼슘 700mg",
        "url": CP + "8866352646?itemId=25858860201&vendorItemId=93469537195",
        "image": "images/dakteoyu-peuro-40g-deuringkeu-ttalgi-350ml-20gae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨(닥터유 프로 40g 딸기 350ml): 단백질 40g·247kcal·당류 4.2g",
        "note": "350ml 20개 · 100ml당 727원, 1병 2,545원, 단백질 20g당 1,272원. 초코보다 병당 190원 비싸요. 11/22 확인.",
        "affiliateUrl": CP + "8866352646?itemId=25858860201&vendorItemId=93469537195",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "orion-dakteoyu-peuro-honhap-ttalgi-choko-banana-250ml-12gae",
        "part": "protein", "category": "protein", "categoryId": "protein", "group": "단백질",
        "brand": "닥터유", "name": "닥터유 프로 단백질 드링크 딸기·초코·바나나 혼합, 250ml, 12개",
        "kind": "단백질 음료 · 3종 혼합", "flavor": "3종 혼합", "proteinType": "mixed",
        "price": 25100, "listPrice": None, "discountPct": None,
        "volumeMl": 250, "packCount": 12, "container": "pet-small",
        "protein_g_per_bottle": 27, "proteinStatus": "27g",
        "sugarPerServing": None,
        "rating": 5.0, "reviewCount": 193, "popularScore": 48.0,
        "caffeine": "none", "aspartame": None,
        "proteinSourceKey": "blend", "proteinSource": "유청+우유 혼합단백", "proteinSourceDetail": "WPI·MPC",
        "url": CP + "8313355115?itemId=23989965371&vendorItemId=93475628156",
        "image": "images/orion-dakteoyu-peuro-honhap-ttalgi-choko-banana-250ml-12gae.jpg",
        "platform": "coupang",
        "nutritionSource": "제품 라벨(닥터유 프로 27g 250ml): 단백질 27g(24g+3g) — 혼합팩 3맛 × 4개",
        "note": "250ml 12개(3맛 × 4개) · 100ml당 837원, 1병 2,092원, 단백질 20g당 1,550원. 27g 250ml 라인이라 40g 350ml보다 100ml 단가가 높아요. 11/22 확인.",
        "affiliateUrl": CP + "8313355115?itemId=23989965371&vendorItemId=93475628156",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
]

# 하이뮨 와우할인 종료 정정
HYM = {
    "id": "haimyun-peurotin-baelreonseu-aektibeu-orijineol-250ml-18gae",
    "price": 28000, "listPrice": 28000, "discountPct": 0,
    "reviewCount": 28175,
    "note": "28,000원(와우할인 종료, 할인 없음) · 250ml 18개, 100ml당 622원·1병 1,556원. 11/22 밤 확인.",
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
            p.setdefault("eachLabel", "개")
            p["eachPrice"] = price
            p["unitEach"] = f"1개({weight:,}g)당 {price:,}원"
    if isinstance(p.get("protein_g_per_bottle"), (int, float)) and p["protein_g_per_bottle"] > 0 and p.get("eachPrice"):
        p["protein20"] = round(p["eachPrice"] / p["protein_g_per_bottle"] * 20)
        p["pricePer20gProtein"] = p["protein20"]
    return p


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    products = [p for p in data["products"] if p["id"] not in {n["id"] for n in NEW}]

    # 하이뮨 가격 정정
    for p in products:
        if p["id"] == HYM["id"]:
            p["price"] = HYM["price"]
            p["listPrice"] = HYM["listPrice"]
            p["discountPct"] = HYM["discountPct"]
            p["reviewCount"] = HYM["reviewCount"]
            p["note"] = HYM["note"]
            p["priceCheckedAt"] = CHECKED_AT
            p["priceCheckedLabel"] = CHECKED_LABEL
            recompute(p)

    for np in NEW:
        p = dict(np)
        p["hasHistory"] = True
        p["ingredientFilter"] = None
        p["ingredientTags"] = []
        recompute(p)
        products.append(p)

    catorder = {c["id"]: i for i, c in enumerate(data["categories"])}
    order = {"zero": 0, "protein": 1, "rice": 2, "snack": 3, "chicken": 4, "meat": 5}
    products.sort(key=lambda p: (order.get(p["part"], 9), catorder.get(p["category"], 99), -(p.get("popularScore") or 0)))
    data["products"] = products
    data["site"]["updatedAt"] = "2026-11-22"
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    hist = json.loads(HIST.read_text(encoding="utf-8"))
    kept = {p["id"] for p in products}
    hist["products"] = {k: v for k, v in hist["products"].items() if k in kept}
    for np in NEW:
        if np["id"] in hist["products"]:
            continue
        hist["products"][np["id"]] = {
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
            "series": [{"date": "2026-11-22", "price": np["price"], "ts": "2026-11-22T23:40:00+09:00", "src": "mart"}],
            "stats": {"min": np["price"], "minDate": "2026-11-22", "max": np["price"], "maxDate": "2026-11-22",
                      "avg": np["price"], "latest": np["price"], "latestDate": "2026-11-22",
                      "observations": 1, "days": 1},
            "lastObservedAt": "2026-11-22T23:40:00+09:00",
        }
    # 하이뮨 관측치
    h = hist["products"].get(HYM["id"])
    if h and h["cardPrice"] != HYM["price"]:
        h["cardPrice"] = HYM["price"]
        h["cardPriceCheckedAt"] = CHECKED_AT
        h.setdefault("series", []).append({"date": "2026-11-22", "price": HYM["price"], "ts": "2026-11-22T23:40:00+09:00", "src": "mart"})
        prices = [s["price"] for s in h["series"]]
        h["stats"] = {"min": min(prices), "minDate": h["series"][prices.index(min(prices))]["date"],
                      "max": max(prices), "maxDate": h["series"][prices.index(max(prices))]["date"],
                      "avg": round(sum(prices) / len(prices)), "latest": HYM["price"], "latestDate": "2026-11-22",
                      "observations": len(prices), "days": len({s["date"] for s in h["series"]})}
        h["lastObservedAt"] = "2026-11-22T23:40:00+09:00"
    hist["meta"]["generatedAt"] = "2026-11-22T23:40:00+09:00"
    hist["meta"]["note"] = "r66(2026-11-22) — 단백질 음료 맛별 확충: 신규 18종(더단백 9·셀렉스 3·테이크핏 3·닥터유 프로 3) 추적 시작."
    HIST.write_text(json.dumps(hist, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

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
    print("by part:", Counter(p["part"] for p in products))
    print("protein items:", sum(1 for p in products if p["category"] == "protein"))


if __name__ == "__main__":
    main()
