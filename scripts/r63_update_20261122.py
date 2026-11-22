#!/usr/bin/env python3
"""r63 — 띠니 카탈로그 업데이트 (2026-11-22).

재영 님 정정 지시(2026-11-22): "아니 음료는 냅두고 쉐이크만" 슬림화.
1. 단백질 음료(category `protein`) 6종은 전부 유지.
2. 타 먹는 파우더 쉐이크(category `shake`)는 유명 3종으로 정리
   · 뉴욕웨이 라이트(인지도 낮음) 제거
   · 옵티멈 골드스탠다드웨이 899g / BSN 신타6 2.27kg 신규 추가, 칼로바이 유지
3. 고단백 볶음밥 신규 축(part `rice`, category `friedrice`) 3종 추가
   · 미트리 자이언트 300g×12(단백질 30g/팩) · 허닭 김치곤약 250g×16(18g/팩)
     · 허닭 간장계란 곤약 250g×12(21g/팩)
   · ① 단백질 20g당 단가 ② 1팩 단백질 15g+ ③ 평점 5.0·리뷰 충분
     ④ 인지도(미트리·허닭) 기준으로 쿠팡 상품 페이지에서 직접 검증한 후보만.
     곰곰 곤약볶음밥(14g)·곰곰 닭가슴살볶음밥(14g)·아임닭 감자탕(7g)·한우물(9g)은
     단백질 함량 미달로 제외, 맛있닭 점보·아임닭 5종은 평점 4.5로 제외.
4. 기존 25종 오늘(11/22) 실가격·리뷰 수 최신화(쿠팡 상품 페이지 직접 확인).
   토스 3종은 웹 미노출로 마지막 확인값 유지.
5. 가격 이력: 뺀 상품 이력 삭제, 바뀐 가격은 오늘 관측치 추가, 신규 5종 추적 시작.

출력: data/products.json, data/price-history.json, js/products.js
사용법: python3 scripts/r63_update_20261122.py
"""
import json
from collections import Counter
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
HIST = ROOT / "data" / "price-history.json"
JS = ROOT / "js" / "products.js"

CHECKED_AT = "2026-11-22 20:50"
CHECKED_LABEL = "11/22 저녁(19:30~20:50) 쿠팡 기준"

# ── 오늘 쿠팡 상품 페이지에서 직접 확인한 값 ────────────────────────────
# id: (가격, 정가, 할인%, 리뷰수, 메모)
VERIFIED = {
    "kokakolra-jero-190ml-30gae": (15740, 21600, 27, 151092, "변동 없음"),
    "haetaehtb-galbaesaida-jero-185ml-30gae": (11160, 11160, 0, 31825, "변동 없음"),
    "seupeuraiteu-jero-saida-500ml-24gae": (16530, 38800, 57, 12119, "변동 없음"),
    "chojeongtansansu-190ml-30gae": (11900, 30900, 61, 92288, "변동 없음"),
    "keulrup-aesabisoda-orijineol-tansaneumryo-500ml-12gae": (14000, 36000, 61, 38288, "변동 없음"),
    "nyukeeo-olpeurotin-gosohanmat-245ml-24gae": (41320, 52000, 20, 20139, "변동 없음"),
    "deodanbaek-deuringkeu-choko-250ml-18gae": (24380, 34800, 29, 52296, "23,930 → 24,380원(+1.9%)"),
    "deodanbaek-40g-gohamryang-deuringkeu-deobeulchoko-350ml-20gae": (48080, 78000, 38, 688, "52,020 → 48,080원(-7.6%, 자동 적용 쿠폰 반영)"),
    "selrekseu-peuropit-moka-chokolrit-250ml-18gae": (24900, 24900, 0, 5396, "변동 없음"),
    "haimyun-peurotin-baelreonseu-aektibeu-orijineol-250ml-18gae": (25760, 28000, 8, 28170, "28,000 → 25,760원(-8.0%, 와우할인)"),
    "teikeupit-maekseu-chokomat-peurotin-250ml-24gae": (32000, 32000, 0, 8270, "변동 없음"),
    "kalobai-peopekteu-pawosweikeu-beulrende-choko-1-8kg": (41900, 79200, 47, 623, "변동 없음(쿠폰할인가)"),
    "meat-chicken-deobareundak-breast-2kg": (15000, 18000, 16, 3546, "변동 없음"),
    "meat-chicken-harim-iff-breast-2kg": (19700, 22900, 13, 118877, "22,200 → 19,700원(-11.3%, 와우할인)"),
    "meat-chicken-harim-jayeonsilrok-breast-400g": (6150, 7190, 14, 90489, "6,900 → 6,150원(-10.9%) · 로켓배송 일시품절, 로켓프레시 구매 가능"),
    "meat-chicken-harim-jayeonsilrok-breast-1kg-3": (29150, 30650, 5, 269, "변동 없음"),
    "meat-chicken-hangang-iqf-tenderloin-2kg": (18400, None, None, 20531, "변동 없음(2kg 옵션, 로켓와우 전용)"),
    "meat-chicken-harim-tenderloin-350g": (6150, 8900, 30, 61074, "변동 없음(와우쿠폰 350원 반영가)"),
    "meat-beef-gomgom-daepae-woosamgyup-1kg": (15750, 19490, 19, 84307, "변동 없음"),
    "meat-beef-au-buchaesal-steak-600g": (22900, 29590, 22, 18917, "24,900 → 22,900원(-8.0%, 와우쿠폰 2,000원 반영)"),
    "meat-beef-gomgom-au-buchaesal-gui-600g": (22510, None, None, 50562, "변동 없음(600g 옵션, 로켓와우 전용)"),
    "meat-pork-gomgom-daepae-samgyeop-1kg-2": (9900, 16990, 41, 99640, "변동 없음"),
    "meat-pork-gomgom-muyeongol-daepae-1-5kg": (16390, 20990, 21, 208140, "변동 없음"),
    "meat-pork-moamit-canada-moksal-1kg": (14770, 22660, 34, 53533, "변동 없음"),
    "meat-pork-dodram-handon-samgyeopsal-1kg": (21390, 38000, 43, 115014, "가격 변동 없음 · 일시품절(재입고 알림만 가능)"),
}

REMOVE = ["shake-newyorkwhey-light-2kg"]

# ── 신규 5종 ─────────────────────────────────────────────────────────
NEW = [
    {
        "id": "mitree-jaieoneteu-dakgaseomsal-bokkeumbap-300g-12gae",
        "part": "rice", "category": "friedrice", "categoryId": "friedrice", "group": "고단백 볶음밥",
        "brand": "미트리",
        "name": "미트리 자이언트 닭가슴살 볶음밥 3종 혼합, 300g, 12개",
        "kind": "고단백 볶음밥 · 3종 혼합", "flavor": "3종 혼합",
        "price": 40500, "listPrice": 54000, "discountPct": 25,
        "weightG": 3600, "packCount": 12,
        "rating": 5.0, "reviewCount": 2016, "popularScore": 88.0,
        "url": "https://www.coupang.com/vp/products/8498900048?itemId=24600730397&vendorItemId=91612791332",
        "image": "images/mitree-jaieoneteu-dakgaseomsal-bokkeumbap-300g-12gae.jpg",
        "platform": "coupang",
        "proteinPer100g": 10.0, "kcalPer100g": 158.3,
        "proteinPerPackG": 30, "kcalPerPack": 475,
        "nutritionSource": "쿠팡 상세 이미지(제품 표기): 1팩 300g 475kcal · 단백질 30g",
        "proteinStatus": "30g", "proteinBasis": "1팩(300g)", "proteinUnitLabel": "1팩 단백질",
        "proteinPer100gSource": "30g ÷ 300g × 100 = 10g/100g",
        "storage": "냉동", "measure": "per100g",
        "altPrice": {
            "source": "naver",
            "price": 39900,
            "url": "https://search.shopping.naver.com/search/all?query=%EB%AF%B8%ED%8A%B8%EB%A6%AC%20%EC%9E%90%EC%9D%B4%EC%96%B8%ED%8A%B8%20%EB%8B%AD%EA%B0%80%EC%8A%B4%EC%82%B4%20%EB%B3%B6%EC%9D%8C%EB%B0%A5",
            "packCount": 12,
            "save": 600, "savePct": 1.5,
            "note": "네이버 미트리 공식스토어 12팩 확인가(배송비 포함, 11/22 기준)",
        },
        "note": "1팩 300g · 단백질 30g(475kcal). 100g당 1,125원, 단백질 20g당 2,250원. 리뷰 2,016건 평점 5.0.",
        "affiliateUrl": "https://www.coupang.com/vp/products/8498900048?itemId=24600730397&vendorItemId=91612791332",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "heodak-gimchikonjak-bokkeumbap-250g-16gae",
        "part": "rice", "category": "friedrice", "categoryId": "friedrice", "group": "고단백 볶음밥",
        "brand": "허닭",
        "name": "허닭 닭가슴살 김치곤약볶음밥, 250g, 16개",
        "kind": "고단백 볶음밥 · 곤약 김치", "flavor": "김치곤약",
        "price": 39890, "listPrice": 62400, "discountPct": 36,
        "weightG": 4000, "packCount": 16,
        "rating": 5.0, "reviewCount": 1411, "popularScore": 85.0,
        "url": "https://www.coupang.com/vp/products/195110274?itemId=20199504665&vendorItemId=5252664887",
        "image": "images/heodak-gimchikonjak-bokkeumbap-250g-16gae.png",
        "platform": "coupang",
        "proteinPer100g": 7.2, "kcalPer100g": 146.0,
        "proteinPerPackG": 18, "kcalPerPack": 365,
        "nutritionSource": "허닭 라벨 기준 영양 DB(다이어트카메라, 2026-10 확인): 1팩 250g 365kcal · 단백질 18g · 나트륨 930mg",
        "proteinStatus": "18g", "proteinBasis": "1팩(250g)", "proteinUnitLabel": "1팩 단백질",
        "proteinPer100gSource": "18g ÷ 250g × 100 = 7.2g/100g",
        "storage": "냉동", "measure": "per100g",
        "note": "1팩 250g · 단백질 18g(365kcal). 100g당 997원, 단백질 20g당 2,769원. 리뷰 1,411건 평점 5.0. 네이버에 동일 구성(16개)이 없어 비교가 미표기.",
        "affiliateUrl": "https://www.coupang.com/vp/products/195110274?itemId=20199504665&vendorItemId=5252664887",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "heodak-ganjanggyeran-gonjak-bokkeumbap-250g-12p",
        "part": "rice", "category": "friedrice", "categoryId": "friedrice", "group": "고단백 볶음밥",
        "brand": "허닭",
        "name": "허닭 닭가슴살 간장계란 곤약 볶음밥 1인분 (냉동), 250g, 12팩",
        "kind": "고단백 볶음밥 · 곤약 간장계란", "flavor": "간장계란곤약",
        "price": 29420, "listPrice": None, "discountPct": None,
        "weightG": 3000, "packCount": 12,
        "rating": 5.0, "reviewCount": 650, "popularScore": 82.0,
        "url": "https://www.coupang.com/vp/products/7761705128?itemId=21053184071&vendorItemId=88115665045",
        "image": "images/heodak-ganjanggyeran-gonjak-bokkeumbap-250g-12p.png",
        "platform": "coupang",
        "proteinPer100g": 8.4, "kcalPer100g": 162.0,
        "proteinPerPackG": 21, "kcalPerPack": 405,
        "nutritionSource": "허닭 라벨 기준 영양 DB(다이어트카메라, 2026-10 확인): 1팩 250g 405kcal · 단백질 21g · 나트륨 610mg",
        "proteinStatus": "21g", "proteinBasis": "1팩(250g)", "proteinUnitLabel": "1팩 단백질",
        "proteinPer100gSource": "21g ÷ 250g × 100 = 8.4g/100g",
        "storage": "냉동", "measure": "per100g",
        "note": "1팩 250g · 단백질 21g(405kcal). 100g당 981원, 단백질 20g당 2,336원. 리뷰 650건 평점 5.0. 11/22 기준 '단 3개 남음' 표기 — 재고 빠지면 확인 후 갱신. 네이버에는 동일 구성(12팩)이 없어 비교가 미표기.",
        "affiliateUrl": "https://www.coupang.com/vp/products/7761705128?itemId=21053184071&vendorItemId=88115665045",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
    },
    {
        "id": "optimum-gold-standard-whey-899g-choco",
        "part": "protein", "category": "shake", "categoryId": "shake", "group": "단백질",
        "brand": "옵티멈",
        "name": "옵티멈뉴트리션 골드스탠다드웨이 더블 리치 프로틴 파우더 초코맛 29회분, 899g, 1개",
        "kind": "단백질 쉐이크 · 초코", "flavor": "더블 리치 초코", "proteinType": "choco",
        "price": 59890, "listPrice": 62900, "discountPct": 4,
        "netWeightG": 899, "weightG": 899, "servingG": 30.4, "packCount": 29,
        "rating": 4.5, "reviewCount": 2433, "popularScore": 90.0,
        "url": "https://www.coupang.com/vp/products/7939328589?itemId=28906890269&vendorItemId=95838995062",
        "image": "images/optimum-gold-standard-whey-899g-choco.jpg",
        "platform": "coupang",
        "protein_g_per_bottle": 24, "kcal_per_bottle": 120,
        "proteinStatus": "24g", "kcalStatus": "120kcal",
        "proteinBasis": "1회(30.4g)", "proteinUnitLabel": "1회 단백질",
        "proteinSource": "유청 단백질(WPC·WPI)", "proteinSourceKey": "whey",
        "eachLabel": "회분",
        "nutritionSource": "옵티멈 공식 라벨·네이버 카탈로그 속성(단백질 24g): 1회 30.4g · 단백질 24g, 899g ≈ 29회분",
        "container": "powder",
        "note": "국민 웨이 '골드스탠다드'. 100g당 6,661원, 1회분(30.4g) 2,065원, 단백질 20g당 1,721원. 리뷰 2,433건 평점 4.5. 네이버에 동일 899g 국내재고는 쿠팡 위탁가 62,900원뿐이라 비교가 미표기.",
        "affiliateUrl": "https://www.coupang.com/vp/products/7939328589?itemId=28906890269&vendorItemId=95838995062",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
        "delivery": "로켓배송 · 무료반품",
    },
    {
        "id": "bsn-synta-6-2-27kg-choco",
        "part": "protein", "category": "shake", "categoryId": "shake", "group": "단백질",
        "brand": "BSN",
        "name": "신타6 정품 프로틴 파우더 초코맛, 2.27kg, 1개",
        "kind": "단백질 쉐이크 · 초코", "flavor": "초코", "proteinType": "choco",
        "price": 88890, "listPrice": 110900, "discountPct": 19,
        "netWeightG": 2270, "weightG": 2270, "servingG": 47, "packCount": 48,
        "rating": 5.0, "reviewCount": 6586, "popularScore": 93.0,
        "url": "https://www.coupang.com/vp/products/7470533914?itemId=19492433606&vendorItemId=86602114160",
        "image": "images/bsn-synta-6-2-27kg-choco.jpg",
        "platform": "coupang",
        "protein_g_per_bottle": 22, "kcal_per_bottle": 200,
        "proteinStatus": "22g", "kcalStatus": "200kcal",
        "proteinBasis": "1회(47g)", "proteinUnitLabel": "1회 단백질",
        "proteinSource": "복합단백(웨이·카제인·계란)", "proteinSourceKey": "blend",
        "eachLabel": "회분",
        "nutritionSource": "BSN 신타6 공식 라벨·네이버 카탈로그 속성(단백질 22g, 48일분): 1회 단백질 22g, 2.27kg ≈ 48회분",
        "container": "powder",
        "note": "신타6 국내 정품(쿠팡 직수입 로켓배송). 100g당 3,916원, 1회분(47g) 1,852원, 단백질 20g당 1,684원. 리뷰 6,586건 평점 5.0. 해외직구·네이버(107,900원)보다 쿠팡가가 저렴해 비교가 미표기.",
        "affiliateUrl": "https://www.coupang.com/vp/products/7470533914?itemId=19492433606&vendorItemId=86602114160",
        "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
        "delivery": "로켓배송(쿠팡 직수입)",
    },
]

CATEGORIES = [
    {"id": "all", "label": "전체", "part": "all"},
    {"id": "cola", "label": "제로 콜라", "icon": "🥤", "part": "zero"},
    {"id": "cider", "label": "제로 사이다", "icon": "🍋", "part": "zero"},
    {"id": "sparkling", "label": "탄산수", "icon": "💧", "part": "zero"},
    {"id": "water", "label": "생수", "icon": "🚰", "part": "zero"},
    {"id": "acv", "label": "애사비", "icon": "🍎", "part": "zero"},
    {"id": "protein", "label": "단백질 음료", "icon": "💪", "part": "protein"},
    {"id": "shake", "label": "단백질 쉐이크", "icon": "🥛", "part": "protein"},
    {"id": "friedrice", "label": "고단백 볶음밥", "icon": "🍚", "part": "rice"},
    {"id": "breast", "label": "닭가슴살", "icon": "🍗", "part": "chicken"},
    {"id": "tenderloin", "label": "닭안심", "icon": "🍗", "part": "chicken"},
    {"id": "beef", "label": "소고기", "icon": "🥩", "part": "meat"},
    {"id": "pork", "label": "돼지고기", "icon": "🐖", "part": "meat"},
]

RICE_PART = {
    "id": "rice",
    "label": "고단백 볶음밥",
    "icon": "🍚",
    "desc": "단백질 20g당 가격 낮은 순",
    "note": "볶음밥은 1팩 단백질(g)과 단백질 20g당 가격으로 비교해요. 100g당 가격은 참고용.",
    "filters": [
        {"id": "all", "label": "전체", "cats": ["friedrice"]},
        {"id": "friedrice", "label": "고단백 볶음밥", "icon": "🍚", "cats": ["friedrice"]},
    ],
}

PART_GROUP = {"zero": "제로음료·생수", "protein": "단백질", "rice": "고단백 볶음밥", "chicken": "닭가슴살·안심", "meat": "소·돼지고기"}
CAT_GROUP = {
    "cola": "제로 콜라", "cider": "제로 사이다", "sparkling": "탄산수", "water": "생수", "acv": "애사비",
    "protein": "단백질 음료", "shake": "단백질 쉐이크", "friedrice": "고단백 볶음밥",
    "breast": "닭가슴살", "tenderloin": "닭안심", "beef": "소고기", "pork": "돼지고기",
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
            p["eachLabel"] = "개"
            p["eachPrice"] = price
            p["unitEach"] = f"1개({weight / scale:g}{'kg' if scale == 1000 else 'g'})당 {price:,}원"
    # 단백질 20g당 (1병/1팩/1회분 단백질 기준)
    if isinstance(p.get("protein_g_per_bottle"), (int, float)) and p["protein_g_per_bottle"] > 0 and p.get("eachPrice"):
        p["protein20"] = round(p["eachPrice"] / p["protein_g_per_bottle"] * 20)
        p["pricePer20gProtein"] = p["protein20"]
    # 100g 단백질 기준(볶음밥 등 무게축 제품): proteinPer100g × 100g당 가격 ÷ 20
    elif isinstance(p.get("proteinPer100g"), (int, float)) and p["proteinPer100g"] > 0 and isinstance(p.get("per100g"), (int, float)):
        p["protein20"] = round(p["per100g"] * 20 / p["proteinPer100g"])
        p["pricePer20gProtein"] = p["protein20"]
    if p.get("proteinPerPackG"):
        p["proteinPackStatus"] = f"{p['proteinPerPackG']}g"
    return p


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    src = {p["id"]: p for p in data["products"]}

    out = []
    changed = []
    skip_ids = set(REMOVE) | {np["id"] for np in NEW}
    for pid, p in src.items():
        if pid in skip_ids:
            continue
        p = dict(p)
        old_price = p["price"]
        v = VERIFIED.get(pid)
        if v:
            price, list_price, pct, reviews, memo = v
            p["price"] = price
            if list_price is not None:
                p["listPrice"] = list_price
            if pct is not None:
                p["discountPct"] = pct
            if reviews is not None:
                p["reviewCount"] = reviews
            p["priceCheckedAt"] = CHECKED_AT
            p["priceCheckedLabel"] = CHECKED_LABEL
            if old_price != price:
                p["note"] = f"{memo}. 11/22 확인."
                changed.append((pid, old_price, price, memo))
            else:
                if pid == "meat-chicken-harim-jayeonsilrok-breast-400g":
                    p["note"] = f"{memo}. 11/22 확인."
                elif pid == "meat-pork-dodram-handon-samgyeopsal-1kg":
                    p["note"] = f"{memo}. 11/22 확인."
        if p.get("part") == "protein":
            p["group"] = PART_GROUP["protein"]
        recompute(p)
        out.append(p)

    for np in NEW:
        p = dict(np)
        recompute(p)
        out.append(p)

    order = {"zero": 0, "protein": 1, "rice": 2, "chicken": 3, "meat": 4}
    catorder = {c["id"]: i for i, c in enumerate(CATEGORIES)}
    out.sort(key=lambda p: (order[p["part"]], catorder[p["category"]], -(p.get("popularScore") or 0)))

    data["products"] = out
    data["categories"] = CATEGORIES
    # 기존 parts에 rice 파트를 protein 뒤에 삽입
    parts = [pt for pt in data["parts"] if pt["id"] != "rice"]
    insert_at = next(i for i, pt in enumerate(parts) if pt["id"] == "chicken")
    parts.insert(insert_at, RICE_PART)
    data["parts"] = parts
    data["site"]["tagline"] = "제로음료·생수·단백질·볶음밥·닭가슴살·소·돼지고기 단가 비교"
    data["site"]["updatedAt"] = "2026-11-22"
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── 가격 이력
    hist = json.loads(HIST.read_text(encoding="utf-8"))
    kept_ids = [p["id"] for p in out]
    hist["products"] = {k: v for k, v in hist["products"].items() if k in kept_ids}
    for pid, old_price, price, memo in changed:
        e = hist["products"].get(pid)
        if not e or e.get("status") != "tracking-started":
            continue
        e["cardPrice"] = price
        e["cardPriceCheckedAt"] = CHECKED_AT
        if e.get("cardListPrice") is None:
            e.pop("cardListPrice", None)
        e.setdefault("series", []).append(
            {"date": "2026-11-22", "price": price, "ts": "2026-11-22T20:50:00+09:00", "src": "mart"}
        )
        series = e["series"]
        prices = [s["price"] for s in series]
        e["stats"] = {
            "min": min(prices), "minDate": min(series, key=lambda s: s["price"])["date"],
            "max": max(prices), "maxDate": max(series, key=lambda s: s["price"])["date"],
            "avg": round(sum(prices) / len(prices)),
            "latest": prices[-1], "latestDate": series[-1]["date"],
            "observations": len(series), "days": (max(s["date"] for s in series), min(s["date"] for s in series)) and len({s["date"] for s in series}),
        }
        e["lastObservedAt"] = "2026-11-22T20:50:00+09:00"
    for np in NEW:
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
            "series": [{"date": "2026-11-22", "price": np["price"], "ts": "2026-11-22T20:50:00+09:00", "src": "mart"}],
            "stats": {"min": np["price"], "minDate": "2026-11-22", "max": np["price"], "maxDate": "2026-11-22",
                      "avg": np["price"], "latest": np["price"], "latestDate": "2026-11-22",
                      "observations": 1, "days": 1},
            "lastObservedAt": "2026-11-22T20:50:00+09:00",
        }
        if np.get("listPrice"):
            entry["cardListPrice"] = np["listPrice"]
        hist["products"][np["id"]] = entry
    hist["meta"]["generatedAt"] = "2026-11-22T20:50:00+09:00"
    hist["meta"]["note"] = "r63(2026-11-22) — 뉴욕웨이 라이트 제거, 쉐이크 유명 3종(옵티멈·BSN 신타6 추가), 고단백 볶음밥 3종 신규, 기존 25종 실가격 갱신."
    HIST.write_text(json.dumps(hist, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── js/products.js 재생성
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

    print(f"상품 {len(out)}종 · 카테고리 {len(CATEGORIES)-1}개 · 파트 {len(parts)-1}개")
    print(dict(Counter(p["part"] for p in out)))
    print("가격이 바뀐 상품:")
    for pid, before, after, memo in changed:
        diff = after - before
        print(f"  {pid}: {before:,} → {after:,} ({diff:+,}) · {memo}")
    print(f"가격 이력 {len(hist['products'])}개")


if __name__ == "__main__":
    main()
