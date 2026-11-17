#!/usr/bin/env python3
"""띠니마트 v5 데이터 통합 (2026-11-17).

입력
  data/products.json                       (기존 125종)
  data/shake-candidates-20261117.json      (단백질 쉐이크 10종)
  data/retort-candidates-20261117.json     (레토르트·생활식품 16종)
  data/naver-candidates-20261117.json      (네이버 최저가 — 카드 추가가 아니라 '네이버 최저가' 줄로만 반영)
  재영 님이 직접 보낸 토스 특가 5종        (아래 TOSS_MANUAL)

출력
  data/products.json
  js/products.js
  data/v5-report.json  (빌드 요약: 카테고리별 개수, 옵션 묶음, 삭제한 상품)
"""
import json
import math
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

# ── 5대 카테고리 ─────────────────────────────────────────
PARTS = [
    {"id": "all", "label": "전체", "icon": "", "note": ""},
    {"id": "zero", "label": "제로 음료", "icon": "🥤", "desc": "100ml당 가격 낮은 순",
     "note": "제로 음료는 100ml당 가격으로 비교해요."},
    {"id": "protein", "label": "단백질 음료", "icon": "💪", "desc": "병당 단백질(g) 높은 순",
     "note": "병당 단백질(g)과 100ml당 가격을 같이 봐요."},
    {"id": "shake", "label": "단백질 쉐이크", "icon": "🥛", "desc": "100g당 가격 낮은 순",
     "note": "가루·파우치는 100g당 가격으로 비교해요."},
    {"id": "meat", "label": "식단 고기", "icon": "🥩", "desc": "100g당 가격 낮은 순",
     "note": "식단용 고기·계란·양념육·조리기구를 모았어요."},
    {"id": "cheat", "label": "치팅·간편식", "icon": "🍕", "desc": "100g당 가격 낮은 순",
     "note": "즉석밥·캔·간편식·소스·베이글까지."},
]

CATEGORIES = [
    {"id": "all", "label": "전체", "part": "all"},
    # 제로 음료
    {"id": "cola", "label": "제로 콜라", "icon": "🥤", "part": "zero"},
    {"id": "cider", "label": "제로 사이다", "icon": "🍋", "part": "zero"},
    {"id": "sparkling", "label": "탄산수", "icon": "💧", "part": "zero"},
    {"id": "water", "label": "생수", "icon": "🚰", "part": "zero"},
    {"id": "acv", "label": "애사비", "icon": "🍎", "part": "zero"},
    {"id": "ion", "label": "이온음료", "icon": "⚡", "part": "zero"},
    {"id": "energy", "label": "에너지음료", "icon": "🔋", "part": "zero"},
    {"id": "icetea", "label": "아이스티", "icon": "🧊", "part": "zero"},
    {"id": "tea", "label": "차음료", "icon": "🌾", "part": "zero"},
    # 단백질 음료 / 쉐이크
    {"id": "protein", "label": "단백질 음료", "icon": "💪", "part": "protein"},
    {"id": "shake", "label": "단백질 쉐이크", "icon": "🥛", "part": "shake"},
    # 식단 고기
    {"id": "beef", "label": "소고기", "icon": "🥩", "part": "meat"},
    {"id": "pork", "label": "돼지고기", "icon": "🐖", "part": "meat"},
    {"id": "jeyuk", "label": "제육·양념육", "icon": "🍲", "part": "meat"},
    {"id": "chicken", "label": "닭고기", "icon": "🍗", "part": "meat"},
    {"id": "egg", "label": "계란·구운란", "icon": "🥚", "part": "meat"},
    {"id": "lamb", "label": "양고기", "icon": "🐑", "part": "meat"},
    {"id": "duck", "label": "오리", "icon": "🦆", "part": "meat"},
    {"id": "salmon", "label": "연어", "icon": "🐟", "part": "meat"},
    {"id": "gadget", "label": "조리기구", "icon": "🍳", "part": "meat"},
    # 치팅·간편식
    {"id": "rice", "label": "즉석밥", "icon": "🍚", "part": "cheat"},
    {"id": "can", "label": "참치·캔·스팸", "icon": "🥫", "part": "cheat"},
    {"id": "meal", "label": "간편식·면·국", "icon": "🍜", "part": "cheat"},
    {"id": "sauce", "label": "소스", "icon": "🧂", "part": "cheat"},
    {"id": "snack", "label": "간식·단백질바", "icon": "🍫", "part": "cheat"},
    {"id": "bakery", "label": "빵·베이글", "icon": "🥯", "part": "cheat"},
]

CAT_BY_ID = {c["id"]: c for c in CATEGORIES}

# 카테고리 → 필터(칩). 대분류 안에서 종류만 고르게 한다.
PARTS_BY_ID = {p["id"]: p for p in PARTS}
for part in PARTS:
    if part["id"] == "all":
        continue
    cats = [c for c in CATEGORIES if c.get("part") == part["id"]]
    part["filters"] = [{"id": "all", "label": "전체", "cats": [c["id"] for c in cats]}]
    for c in cats:
        part["filters"].append({"id": c["id"], "label": c["label"], "icon": c.get("icon", ""),
                                "cats": [c["id"]]})
PARTS_BY_ID = {p["id"]: p for p in PARTS}

# ── 브랜드 인지도 가중치 ─────────────────────────────────
BRAND_1 = {
    # 음료
    "코카콜라", "펩시", "칠성사이다", "스프라이트", "나랑드사이다", "웰치스", "갈배사이다",
    "초록매실", "몬스터에너지", "핫식스", "레드불", "박카스", "동아오츠카", "롯데칠성",
    "해태htb", "트레비", "탐사", "스파클", "초정탄산수", "게토레이", "파워에이드", "토레타",
    "이프로", "비타500", "하늘보리", "립톤", "보성홍차", "동원", "맥콜",
    # 단백질
    "매일두유", "서울우유", "베지밀", "연세두유", "아몬드브리즈", "셀렉스", "더단백", "테이크핏",
    "하이뮨", "닥터유", "랩노쉬", "프로티원", "그린비아", "뉴케어", "허쉬", "마이프로틴",
    "칼로바이", "BSN", "옵티멈뉴트리션", "머슬팜", "다이마타이즈", "꼬박꼬밥", "잇더핏",
    "플라이밀", "밀잇", "뉴욕웨이",
    # 식품
    "CJ 햇반", "비비고(CJ)", "오뚜기", "CJ 스팸", "곰곰", "하림", "미트리", "도드람한돈",
    "한돈", "널담", "셰프초이스", "농협안심한우", "목우촌", "풀무원", "한강식품", "마니커",
    "다향", "은하수산",
}
BRAND_2 = {
    "클룹", "더 빅토리아", "라인바싸", "부르르", "싱하", "탐사스파클링", "모아미트",
    "생생포크", "케이원푸드", "더하닭", "모위", "미트엔조이", "고메프리미엄", "홈플래닛",
    "쿠비녹스", "크루거", "재원전자", "힐링미트", "요플레", "마이밀", "케어웰",
}


def brand_weight(brand):
    b = str(brand or "").strip()
    if b in BRAND_1:
        return 40
    if b in BRAND_2:
        return 22
    return 6


def num(v):
    return v if isinstance(v, (int, float)) and math.isfinite(v) else None


def measure_of(cat_id, container=None):
    if cat_id in ("gadget", "egg", "bakery"):
        return "each"
    if cat_id in ("cola", "cider", "sparkling", "water", "acv", "ion", "energy", "icetea", "tea",
                  "protein"):
        return "per100ml"
    if container == "powder":
        return "per100g"
    return "per100g"


EACH_LABEL = {"can": "캔", "pet-small": "병", "pet-large": "병", "powder": "회분",
              "pouch": "팩", "raw": "팩", "tray": "구"}

# 쿠팡 상품 페이지에서 직접 확인한 '같은 상품의 다른 묶음 수량' (2026-11-17 12:2x~12:55)
# (수량, 판매가, 정가) — 정가가 확인된 것만 넣었다.
OPTIONS = {
    "bakkaseu-eolbaksa-jero-24gae-355ml": {
        "sizes": [(6, 7750, None), (12, 13570, None), (18, 18800, None), (48, 41480, None)],
    },
    "retort-rice-haetban-baekmi-210g-24": {
        "unit_g": 210,
        "sizes": [(9, 10850, None), (12, 13970, None), (18, 20490, None), (36, 38710, None)],
    },
    "retort-can-spam-classic-340g-6": {
        "unit_g": 340,
        "sizes": [(3, 12440, None), (9, 34340, None), (12, 45570, None), (20, 75930, None)],
        "url": "https://www.coupang.com/vp/products/8244032757?vendorItemId=91255258320",
        "affiliateUrl": "https://www.coupang.com/vp/products/8244032757?vendorItemId=91255258320",
    },
    "kokakolra-jero-190ml-30gae": {
        "sizes": [(6, 6370, None), (10, 7400, None), (20, 12080, None), (90, 46330, None)],
    },
}


def each_label(p, cat_id):
    if cat_id == "egg":
        return "구"
    if cat_id == "bakery":
        return "개"
    if cat_id in ("pork", "beef", "chicken", "lamb", "duck", "salmon", "jeyuk") and p.get("packCount"):
        return "팩"
    if cat_id in ("rice", "meal", "jeyuk"):
        return "개" if cat_id == "rice" else "팩"
    if cat_id in ("can", "sauce", "snack"):
        return "개"
    if p.get("container") == "powder":
        return "회분"
    return EACH_LABEL.get(p.get("container"), "개")


def compute(p):
    """단가·개당·단백질 20g당 값을 상품에 채운다."""
    price = num(p.get("price"))
    cat = p.get("category")
    p["measure"] = p.get("measure") or measure_of(cat, p.get("container"))
    part = p.get("part")

    # 총 중량
    w = num(p.get("weightG")) or num(p.get("totalWeightG"))
    if not w:
        net = num(p.get("netWeightG"))
        if net:
            w = net
    p["weightG"] = w

    vol = num(p.get("volumeMl"))
    cnt = num(p.get("packCount"))

    per_kind = p["measure"]
    per_val = None
    if price:
        if per_kind == "each":
            per_val = (price / cnt) if cnt else price
        elif per_kind == "per100ml" and vol:
            ml = vol * (cnt if part in ("zero", "protein") and cnt else 1)
            per_val = price / ml * 100 if ml else None
        elif per_kind == "per100g" and w:
            if cat == "shake" and cnt:
                # 쉐이크는 packCount 가 '회분'이다. 1회분 중량 × 회분 수로 총량을 잡는다.
                total = w
                per_val = price / total * 100 if total else None
            else:
                per_val = price / w * 100 if w else None
    p["perValue"] = round(per_val, 1) if per_val else None
    if per_kind == "per100ml":
        p["unitPricePer100ml"] = round(per_val) if per_val else p.get("unitPricePer100ml")
        p["unitPrice"] = f"100ml당 {round(per_val):,}원" if per_val else p.get("unitPrice")
    elif per_kind == "per100g":
        p["per100g"] = round(per_val) if per_val else p.get("per100g")
        p["unitPrice"] = f"100g당 {round(per_val):,}원" if per_val else p.get("unitPrice")
    else:
        p["unitPrice"] = f"1{ (cnt and '개') or '개'}당 {round(per_val):,}원" if per_val else p.get("unitPrice")

    # 개당(캔·병·팩·구) 가격
    each = None
    if price and cnt and part in ("zero", "protein", "shake", "cheat", "meat"):
        if cat == "shake":
            each = price / cnt  # 1회분
        elif cat in ("rice", "can", "meal", "egg", "bakery", "jeyuk", "sauce", "snack"):
            each = price / cnt
        else:
            each = price / cnt
    if each:
        lab = each_label(p, cat)
        p["eachPrice"] = round(each)
        p["eachLabel"] = lab
        p["unitEach"] = f"1{lab}당 {round(each):,}원"
    else:
        p["eachPrice"] = None
        p["unitEach"] = p.get("unitEach")

    # 단백질 20g당
    p20 = None
    if price and part in ("protein", "shake"):
        g = num(p.get("protein_g_per_bottle"))
        serving = (price / cnt) if (cnt and part == "protein") else (price / cnt if cnt else None)
        if part == "shake" and cnt:
            serving = price / cnt  # 1회분 가격
        if g and serving:
            p20 = serving / g * 20
    elif price and part == "meat" and cat != "gadget":
        g100 = num(p.get("proteinPer100g"))
        per100 = p.get("perValue")
        if g100 and per100:
            p20 = per100 / g100 * 20
    p["protein20"] = round(p20) if p20 else None
    if p20:
        p["pricePer20gProtein"] = round(p20)

    # 정가·할인율
    lp = num(p.get("listPrice"))
    dp = num(p.get("discountPct"))
    if dp is None and lp and price and lp > price:
        dp = round((lp - price) / lp * 100)
    p["discountPct"] = int(dp) if dp else None
    if lp:
        p["listPrice"] = int(lp)
    elif dp and price:
        p["listPrice"] = int(round(price / (1 - dp / 100)))

    # 평점·리뷰
    rv = num(p.get("reviewCount"))
    if rv is None:
        rv = num(p.get("reviews"))
    p["reviewCount"] = int(rv) if rv else None
    p["rating"] = num(p.get("rating"))

    # 인기·할인 점수 (브랜드 인지도 + 리뷰 + 할인율)
    score = brand_weight(p.get("brand"))
    if p["reviewCount"]:
        score += min(30, math.log10(p["reviewCount"] + 1) * 7)
        if p["reviewCount"] >= 1000:
            score += 4
    if p["discountPct"]:
        score += min(26, p["discountPct"] * 0.7)
    if p.get("rating") and p["rating"] >= 4.8 and p["reviewCount"] and p["reviewCount"] > 500:
        score += 2
    p["popularScore"] = round(score, 2)
    return p


def norm_key(s):
    return re.sub(r"[\s()\[\]{},·\-–—/]+", "", str(s or "").lower())


PACK_TOKEN = re.compile(r"[,\s]*\d+\s*(개|팩|병|캔|구|입|포|세트)\b")


GEN_WORD = re.compile(r"(탄산음료|음료|제품|정육|업소용)")


def variant_key(p):
    name = PACK_TOKEN.sub("", str(p.get("name", "")))
    name = GEN_WORD.sub(" ", name)
    toks = sorted({t for t in re.findall(r"[0-9A-Za-z가-힣.]+", name.lower()) if len(t) > 1})
    return f'{p.get("category")}|{p.get("volumeMl") or p.get("weightG")}|{"|".join(toks)}'


def main():
    BASE = DATA / "products.base.json"
    src = BASE if BASE.exists() else DATA / "products.json"
    doc = json.loads(src.read_text(encoding="utf-8"))
    base = doc["products"]
    seen = {x["id"] for x in base}

    def add(p):
        if p["id"] in seen:
            return
        seen.add(p["id"])
        kept.append(p)

    # 1) 기존 상품 정리 ------------------------------------------------
    kept = []
    dropped = []
    for p in base:
        cat = p.get("category")
        if cat == "shake":
            p["part"] = "shake"
        elif cat == "protein":
            p["part"] = "protein"
        p.setdefault("platform", "coupang")
        if p.get("brand") in ("마이밀", "케어웰") and cat == "protein":
            dropped.append({"id": p["id"], "name": p["name"], "why": "인지도 낮은 브랜드(재영 님 지시)"})
            continue
        kept.append(p)

    # 박카스 얼박사 제로 — 실제 쿠팡 페이지 확인값으로 정정 (11/17 12:2x, 24개 22,400원 · 100ml당 263원 · 배송비 10,000원 별도)
    for p in kept:
        if p["id"] == "bakkaseu-eolbaksa-jero-24gae-355ml":
            p.update({
                "price": 22400,
                "priceCheckedAt": "2026-11-17 12:25",
                "priceCheckedLabel": "11/17 12:25 쿠팡 기준",
                "listPrice": None,
                "discountPct": None,
                "unitPricePer100ml": 263,
                "unitPrice": "100ml당 263원",
                "unitEach": "1캔당 933원",
                "reviewCount": 2659,
                "rating": None,
                "note": "쿠팡 판매가 22,400원 · 배송비 10,000원 별도(장바구니 기준). 배송비 포함 32,400원이면 100ml당 381원이에요.",
                "cheapestPer100": False,
            })
            p.pop("cheapestPer100", None)

    # 코카콜라 제로 190ml×30 — 11/17 12:55 쿠팡 페이지 재확인(15,740원 · 27% · 100ml당 276원)
    for p in kept:
        if p["id"] == "kokakolra-jero-190ml-30gae":
            p.update({"price": 15740, "listPrice": 21600, "discountPct": 27,
                      "reviewCount": 149641,
                      "priceCheckedAt": "2026-11-17 12:55",
                      "priceCheckedLabel": "11/17 12:55 쿠팡 기준"})
        if p["id"] == "retort-can-spam-classic-340g-6":
            p["url"] = "https://www.coupang.com/vp/products/8244032757?vendorItemId=91255258320"
            p["affiliateUrl"] = p["url"]

    # 2) 쉐이크 10종 ---------------------------------------------------
    shake = json.loads((DATA / "shake-candidates-20261117.json").read_text(encoding="utf-8"))
    for s in shake["products"]:
        p = dict(s)
        p["category"] = "shake"
        p["part"] = "shake"
        p["group"] = "단백질 쉐이크"
        p["affiliateUrl"] = p.get("affiliateUrl") or p["url"]
        p["platform"] = "coupang"
        p["priceCheckedLabel"] = p.get("priceCheckedLabel") or "11/17 10:40 쿠팡 기준"
        p["reviewCount"] = p.pop("reviewCount", None)
        p["kcal_per_bottle"] = p.pop("kcalPerServing", None)
        p["sugarPerServing"] = p.get("sugarPerServing")
        p["protein_g_per_bottle"] = p.pop("proteinPerServing", None)
        p["proteinBasis"] = p.get("proteinBasis") or "1회"
        if p.get("container") is None:
            p["container"] = "powder"
        add(p)

    # 3) 레토르트·생활식품 16종 -----------------------------------------
    retort = json.loads((DATA / "retort-candidates-20261117.json").read_text(encoding="utf-8"))
    RETORT_CAT = {"rice": "rice", "can": "can", "meal": "meal", "egg": "egg", "sauce": "sauce"}
    for r in retort["products"]:
        cid = RETORT_CAT.get(r.get("categoryId"), "meal")
        if r["id"].endswith("proteinbar-600g"):
            cid = "snack"
        p = {
            "id": r["id"],
            "group": CAT_BY_ID[cid]["label"],
            "category": cid,
            "part": "meat" if cid == "egg" else "cheat",
            "brand": r.get("brand"),
            "name": r.get("name"),
            "kind": r.get("kind"),
            "price": r.get("price"),
            "listPrice": r.get("listPrice"),
            "discountPct": r.get("discountRate"),
            "priceCheckedAt": r.get("priceCheckedAt"),
            "priceCheckedLabel": "11/17 10:06 쿠팡 기준",
            "url": r.get("url"),
            "affiliateUrl": r.get("url"),
            "image": r.get("image"),
            "packCount": r.get("packCount"),
            "weightG": r.get("totalWeightG") or r.get("unitWeightG"),
            "per100g": r.get("per100g"),
            "rating": r.get("rating"),
            "reviewCount": r.get("reviews"),
            "platform": "coupang",
            "measure": "each" if cid == "egg" else "per100g",
            "note": r.get("note"),
        }
        if cid == "egg":
            p["eachPrice"] = r.get("perPiece")
        add(p)

    # 4) 재영 님이 직접 보낸 토스 특가 ------------------------------------
    TOSS_MANUAL = [
        {"id": "toss-chefchoice-jeyuk-2kg", "brand": "셰프초이스",
         "name": "셰프초이스 제육 불고기, 2kg, 1개", "kind": "제육불고기 · 양념육",
         "category": "jeyuk", "part": "meat", "price": 14600, "discountPct": 45,
         "weightG": 2000, "rating": 4.6, "reviewCount": 465,
         "url": "https://toss.shopping/_m/ZJyh9lp2", "affiliateUrl": "https://toss.shopping/_m/ZJyh9lp2",
         "image": "images/toss-chefchoice-jeyuk-2kg.jpg", "platform": "toss",
         "note": "아버님 토스 쉐어링크. 100g당 730원 — 1.5kg(12,560원·837원/100g)보다 2kg이 더 쌉니다."},
        {"id": "toss-daepae-samgyeop-2kg", "brand": "미트팜",
         "name": "수입산 냉동 대패삼겹살, 2kg, 1개", "kind": "대패삼겹살 · 냉동",
         "category": "pork", "part": "meat", "price": 18900, "discountPct": 56,
         "weightG": 2000, "rating": None, "reviewCount": None,
         "url": "https://toss.shopping/t/2271693971", "affiliateUrl": "https://toss.shopping/t/2271693971",
         "image": "images/toss-daepae-samgyeop-2kg.jpg", "platform": "toss",
         "note": "토스쇼핑 특가. 아버님 쉐어링크는 앱에서만 발급 가능해 아직 일반 링크예요."},
        {"id": "toss-handon-dwitgogi-500g-4", "brand": "한돈",
         "name": "국내산 한돈 뒷고기 1등급, 500g, 4팩", "kind": "뒷고기 · 냉장",
         "category": "pork", "part": "meat", "price": 17800, "discountPct": 54,
         "weightG": 2000, "packCount": 4, "rating": None, "reviewCount": None,
         "url": "https://toss.shopping/t/2469694719", "affiliateUrl": "https://toss.shopping/t/2469694719",
         "image": "images/toss-handon-dwitgogi-500g-4.jpg", "platform": "toss",
         "note": "토스쇼핑 특가. 아버님 쉐어링크는 앱에서만 발급 가능해 아직 일반 링크예요."},
        {"id": "toss-naldam-baekkop-bagel-10", "brand": "널담",
         "name": "널담 고단백 배꼽 베이글 맛혼합, 10개", "kind": "고단백 베이글",
         "category": "bakery", "part": "cheat", "price": 18900, "discountPct": 32,
         "packCount": 10, "rating": None, "reviewCount": None,
         "url": "https://toss.shopping/t/2413913575", "affiliateUrl": "https://toss.shopping/t/2413913575",
         "image": "images/toss-naldam-baekkop-bagel-10.jpg", "platform": "toss",
         "note": "가끔 1만 원 밑으로 떨어지는 상품 — 알림 걸어 둘 만해요. 아버님 쉐어링크는 앱에서만 발급."},
        {"id": "toss-naldam-nemo-baguette-90g-10", "brand": "널담",
         "name": "널담 고단백 저당 네모 바게트 5종혼합, 90g, 10개", "kind": "고단백 바게트",
         "category": "bakery", "part": "cheat", "price": 10090, "discountPct": 71,
         "packCount": 10, "weightG": 900, "rating": None, "reviewCount": None,
         "url": "https://toss.shopping/t/116698237", "affiliateUrl": "https://toss.shopping/t/116698237",
         "image": "images/toss-naldam-nemo-baguette-90g-10.jpg", "platform": "toss",
         "note": "토스쇼핑 특가. 아버님 쉐어링크는 앱에서만 발급 가능해 아직 일반 링크예요."},
    ]
    for t in TOSS_MANUAL:
        p = dict(t)
        p["priceCheckedAt"] = "2026-11-17 12:30"
        p["priceCheckedLabel"] = "11/17 12:30 토스 기준"
        p["group"] = CAT_BY_ID[t["category"]]["label"]
        if p.get("packCount"):
            p["measure"] = "each" if t["category"] == "bakery" else p.get("measure")
        add(p)

    # 5) 네이버 최저가 — 카드 추가 대신 '네이버 최저가' 줄로 붙인다 ------------
    naver = json.loads((DATA / "naver-candidates-20261117.json").read_text(encoding="utf-8"))
    naver_by_key = {}
    for it in naver["items"]:
        naver_by_key[it["productId"]] = it
    # 실구매가(배송비 포함) 기준으로만 붙인다. 배송비가 붙는 건 쿠팡보다 비싸져서 제외.
    NAVER_ALT = [
        ("klup-aesabi-orijineol", "keulrup-aesabisoda-orijineol-500ml-24gae"),
        ("dodram-samgyeop", "meat-pork-dodram-handon-samgyeop-1kg"),
        ("pultorae-drumstick", "meat-chicken-pultorae-drumstick-2kg"),
        ("harim-iff", "meat-chicken-harim-iff-breast-2kg"),
        ("chilseong-210", "chilseongsaida-jero-210ml-30gae"),
        ("seupakeul-500-20", "seupakeul-seupakeulring-tansansu-peulrein-500ml-20byeong"),
        ("mirit-pistachio", "mirit-danbaekjil-sweikeu-piseutacio-560g"),
    ]
    naver_source = {
        "keulrup-aesabisoda-orijineol-500ml-24gae": "keulrup-aesabisoda-orijineol-500ml-24gae",
        "meat-pork-dodram-handon-samgyeop-1kg": "meat-pork-dodram-handon-samgyeop-1kg",
        "meat-chicken-pultorae-drumstick-2kg": "meat-chicken-pultorae-drumstick-2kg",
        "meat-chicken-harim-iff-breast-2kg": "meat-chicken-harim-iff-breast-2kg",
        "chilseongsaida-jero-210ml-30gae": "chilseongsaida-jero-210ml-30gae",
        "seupakeul-seupakeulring-tansansu-peulrein-500ml-20byeong": "seupakeul-seupakeulring-tansansu-peulrein-500ml-20byeong",
        "mirit-danbaekjil-sweikeu-piseutacio-560g": "mirit-danbaekjil-sweikeu-piseutacio-560g",
    }
    alt_count = 0
    for pid, nid in naver_source.items():
        it = naver_by_key.get(nid)
        if not it:
            continue
        ship = it.get("shippingFee") or 0
        if ship != 0:
            continue  # 배송비 붙으면 실구매가가 쿠팡보다 비싸진다
        for p in kept:
            if p["id"] != pid:
                continue
            cur = p.get("price")
            if not cur or it["price"] >= cur * 0.97:
                continue
            save = cur - it["price"]
            p["altPrice"] = {
                "source": "naver",
                "price": it["price"],
                "url": it["url"],
                "save": save,
                "savePct": round(save / cur * 100, 1),
                "note": "네이버 최저가(배송비 포함) 기준",
            }
            alt_count += 1

    # 6) 옵션(묶음 수량) 확장 — 쿠팡 상품 페이지에서 직접 확인한 같은 상품의 다른 수량 -------
    for base_id, spec in OPTIONS.items():
        base = next((x for x in kept if x["id"] == base_id), None)
        if not base:
            continue
        for cnt, price, list_price in spec["sizes"]:
            v = json.loads(json.dumps(base))
            if base.get("packCount") == cnt:
                continue
            v["id"] = f"{base_id}#{cnt}"
            v["packCount"] = cnt
            v["name"] = re.sub(r"\d+\s*개", f"{cnt}개", v.get("name", ""))
            if spec.get("unit_g"):
                v["weightG"] = spec["unit_g"] * cnt
            v["price"] = price
            v["listPrice"] = list_price
            v["discountPct"] = round((list_price - price) / list_price * 100) if list_price else None
            v["url"] = spec.get("url", base.get("url"))
            v["affiliateUrl"] = spec.get("affiliateUrl", base.get("affiliateUrl"))
            v["priceCheckedAt"] = "2026-11-17 12:55"
            v["priceCheckedLabel"] = "11/17 12:55 쿠팡 기준"
            v["note"] = f"같은 상품 페이지의 {cnt}개 옵션이에요(11/17 12:55 확인). 옵션을 바꾸면 페이지에서 수량을 고르세요."
            v.pop("altPrice", None)
            add(v)

    # 7) 중복 상품 합치기 (같은 브랜드·같은 분류·같은 용량·같은 수량·같은 맛) ----
    DUP_PAIRS = {"pepsi-zero-lime-355": "toss-pepsi-jero-syugeo-raimhyang-355ml-24gae"}
    out = []
    for p in kept:
        if p["id"] in DUP_PAIRS:
            other = next((x for x in kept if x["id"] == DUP_PAIRS[p["id"]]), None)
            if other and (other.get("price") or 0) <= (p.get("price") or 0):
                dropped.append({"id": p["id"], "name": p["name"],
                                "why": f'{other["id"]}와 같은 상품(더 비싸서 제외)'})
                continue
        out.append(p)

    # 7-1) 파생값 계산 --------------------------------------------------
    hist = json.loads((DATA / "price-history.json").read_text(encoding="utf-8")).get("products", {})
    for p in out:
        p["group"] = CAT_BY_ID.get(p["category"], {}).get("label", p.get("group"))
        compute(p)
        # 60일 기록이 쌓인 상품은 '계속 모니터링하는 인기 상품'으로 조금 앞에
        e = hist.get(p["id"]) or {}
        if e.get("status") == "history" and len(e.get("series") or []) >= 5:
            p["hasHistory"] = True
            p["popularScore"] = round((p.get("popularScore") or 0) + 6, 2)

    # 8) 옵션 묶음 — 쿠팡 상품 페이지에서 직접 확인한 같은 상품의 수량 옵션만 묶는다 -----
    VARIANT_GROUPS = [
        ["bakkaseu-eolbaksa-jero-24gae-355ml#6", "bakkaseu-eolbaksa-jero-24gae-355ml#12",
         "bakkaseu-eolbaksa-jero-24gae-355ml#18", "bakkaseu-eolbaksa-jero-24gae-355ml",
         "bakkaseu-eolbaksa-jero-24gae-355ml#48"],
        ["retort-rice-haetban-baekmi-210g-24#9", "retort-rice-haetban-baekmi-210g-24#12",
         "retort-rice-haetban-baekmi-210g-24#18", "retort-rice-haetban-baekmi-210g-24",
         "retort-rice-haetban-baekmi-210g-24#36"],
        ["retort-can-spam-classic-340g-6#3", "retort-can-spam-classic-340g-6",
         "retort-can-spam-classic-340g-6#9", "retort-can-spam-classic-340g-6#12",
         "retort-can-spam-classic-340g-6#20"],
        ["kokakolra-jero-190ml-30gae#6", "kokakolra-jero-190ml-30gae#10",
         "kokakolra-jero-190ml-30gae#20", "kokakolra-jero-190ml-30gae",
         "kokakolra-jero-190ml-30gae#90"],
        ["keulrup-aesabisoda-orijineol-tansaneumryo-500ml-12gae", "keulrup-aesabisoda-orijineol-500ml-24gae"],
        ["seupakeul-saengsu-murabel-500ml-40byeong", "toss-seupakeul-saengsu-murabel-500ml-80gae"],
    ]
    by_id = {p["id"]: p for p in out}
    group_no = 0
    multi = {}
    for ids in VARIANT_GROUPS:
        members = [by_id[i] for i in ids if i in by_id]
        if len(members) < 2:
            continue
        group_no += 1
        gid = f"g{group_no:03d}"
        multi[gid] = members
        for p in members:
            p["variantGroup"] = gid
            cnt = p.get("packCount") or 0
            if p["category"] in ("rice", "can", "meal", "cola", "cider", "sparkling", "water",
                                 "ion", "energy", "icetea", "tea", "acv", "protein"):
                p["variantLabel"] = f"{cnt}개"
            else:
                p["variantLabel"] = f"{cnt}팩"

    # 9) 정렬: 인기·할인 순 ---------------------------------------------
    out.sort(key=lambda p: (-(p.get("popularScore") or 0), p.get("perValue") or 10 ** 9))

    # 10) 저장 ----------------------------------------------------------
    doc["products"] = out
    doc["parts"] = PARTS
    doc["categories"] = CATEGORIES
    doc["containers"] = [{"id": "all", "label": "전체"}, {"id": "can", "label": "캔"},
                         {"id": "pet-small", "label": "소형 페트"}, {"id": "pet-large", "label": "대용량"}]
    doc["ingredientFilters"] = [{"id": "all", "label": "전체"},
                                {"id": "caffeine-free", "label": "논카페인"},
                                {"id": "no-aspartame", "label": "아스파탐 무첨가"}]
    doc["sorts"] = [{"id": "popular", "label": "🔥 인기·할인 순"},
                    {"id": "basis", "label": "단가 낮은 순"},
                    {"id": "discount", "label": "할인율 높은 순"},
                    {"id": "low", "label": "60일 저점 가까운 순"},
                    {"id": "price", "label": "가격 낮은 순"}]
    doc["site"]["tagline"] = "제로 음료·단백질·식단 고기·간편식 단가 비교"
    doc["site"]["updatedAt"] = "2026-11-17"
    doc["site"]["sourceNote"] = (
        "쿠팡·토스쇼핑 판매가를 2026-11-15~17에 직접 확인한 값이에요. "
        "네이버 최저가는 배송비 포함 실구매가로 견줘 더 싼 것만 표시했어요."
    )
    (DATA / "products.json").write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n",
                                        encoding="utf-8")

    js = []
    js.append("/**\n * 띠니 상품 데이터 (이 파일 하나만 보면 됩니다).\n *\n"
              " * 구매 버튼은 각 상품의 affiliateUrl만 사용합니다.\n"
              " * 쿠팡 파트너스 단축 링크가 준비되면 partners-links.json 을 채우고\n"
              " *   python3 scripts/apply_partners_links.py\n"
              " * 를 실행하세요.\n */\n")
    for name in ("SITE", "CATEGORIES", "PARTS", "SORTS", "CONTAINERS", "INGREDIENT_FILTERS"):
        key = {"SITE": "site", "CATEGORIES": "categories", "PARTS": "parts", "SORTS": "sorts",
               "CONTAINERS": "containers", "INGREDIENT_FILTERS": "ingredientFilters"}[name]
        js.append(f"const {name} = {json.dumps(doc[key], ensure_ascii=False, indent=2)};\n")
    js.append(f"const PRODUCTS = {json.dumps(out, ensure_ascii=False, indent=2)};\n")
    (ROOT / "js" / "products.js").write_text("\n".join(js), encoding="utf-8")

    # 11) 리포트 --------------------------------------------------------
    from collections import Counter
    cats = Counter(p["category"] for p in out)
    parts = Counter(p["part"] for p in out)
    report = {
        "products": len(out),
        "byPart": dict(parts),
        "byCategory": dict(cats),
        "dropped": dropped,
        "variantGroups": [{"group": k, "ids": [x["id"] for x in v],
                           "labels": [x.get("variantLabel") for x in v]} for k, v in multi.items()],
        "variantCardCount": group_no,
        "naverAlt": alt_count,
        "topPopular": [{"name": p["name"], "score": p["popularScore"], "discount": p.get("discountPct")}
                       for p in out[:12]],
    }
    (DATA / "v5-report.json").write_text(json.dumps(report, ensure_ascii=False, indent=1), encoding="utf-8")
    print(json.dumps({k: report[k] for k in ("products", "byPart", "variantCardCount", "naverAlt")},
                     ensure_ascii=False))
    print("dropped:", len(dropped))
    print("groups:", [g["labels"] for g in report["variantGroups"]])


if __name__ == "__main__":
    main()
