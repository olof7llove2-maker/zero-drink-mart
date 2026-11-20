#!/usr/bin/env python3
"""r62 — 띠니 카탈로그를 재영 님이 실제로 먹는 핵심 식단템 30종으로 압축한다 (2026-11-20).

배경
- 재영 님(2026-11-20): 208종 → 후보 5축 중 "1,2,3,4"(닭가슴살·안심 / 소·돼지고기 /
  단백질 쉐이크·음료 / 제로음료·생수)만 남기고 5번(간편식)은 뺀다.
- 카테고리 구조도 이 4축에 맞춘다. part 4개: zero / protein / chicken / meat
  · protein 안에 category `protein`(단백질 음료)과 `shake`(단백질 쉐이크)가 함께 들어간다.
  · chicken 안에 category `breast`(닭가슴살) / `tenderloin`(닭안심).

가격
- VERIFIED 는 이번 런(2026-11-20 17:2x~18:1x)에 쿠팡 상품 페이지(아버님 계정 로그인 브라우저)에서
  직접 확인한 값이다. 확인하지 못한 토스 3종은 마지막 확인값을 그대로 두고 확인 시각도 그대로 둔다
  (카드에 'N일 전 확인'으로 정직하게 표시됨).

출력: data/products.json, data/price-history.json(유지 상품만), js/products.js
사용법: python3 scripts/r62_compress_20261120.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
HIST = ROOT / "data" / "price-history.json"
JS = ROOT / "js" / "products.js"

# id: (가격, 정가, 할인%, 리뷰수, 확인시각, 근거 메모)
VERIFIED = {
    "meat-chicken-harim-jayeonsilrok-breast-400g": (6900, 7190, 4, 90297, "17:25", "변동 없음(와우쿠폰 300원 별도)"),
    "meat-chicken-harim-jayeonsilrok-breast-1kg-3": (29150, 30650, 5, 267, "17:27", "20% 특가 11:00 종료 → 29,150원 복귀"),
    "meat-chicken-harim-iff-breast-2kg": (22200, 23100, 4, 118803, "17:27", "변동 없음"),
    "meat-chicken-harim-tenderloin-350g": (6150, 6150, 0, 60938, "17:26", "변동 없음"),
    "meat-chicken-hangang-iqf-tenderloin-2kg": (18400, 18700, 2, 20459, "17:44", "2kg 옵션 18,400원(변동 없음)"),
    "meat-chicken-deobareundak-breast-2kg": (15000, 18000, 16, 3532, "17:47", "변동 없음"),
    "meat-beef-gomgom-daepae-woosamgyup-1kg": (15750, 19490, 19, 83879, "17:32", "16,190 → 15,750원(-2.7%)"),
    "meat-pork-gomgom-muyeongol-daepae-1-5kg": (16390, 20990, 21, 207517, "17:35", "변동 없음"),
    "meat-pork-gomgom-daepae-samgyeop-1kg-2": (9900, 11000, 10, 99545, "17:35", "변동 없음"),
    "meat-pork-dodram-handon-samgyeopsal-1kg": (21390, 38000, 43, 114842, "17:37", "24,230 → 21,390원(-11.7%)"),
    "meat-pork-moamit-canada-moksal-1kg": (14770, 22660, 34, 53491, "17:39", "변동 없음"),
    "selrekseu-peuropit-moka-chokolrit-250ml-18gae": (24900, 24900, 0, 5361, "17:50", "변동 없음"),
    "haimyun-peurotin-baelreonseu-aektibeu-orijineol-250ml-18gae": (28000, 28000, 0, 28087, "17:53", "일반판매가 그대로(와우 25,760원)"),
    "teikeupit-maekseu-chokomat-peurotin-250ml-24gae": (32000, 32000, 0, 8236, "17:56", "29,900 → 32,000원(+7.0%)"),
    "deodanbaek-40g-gohamryang-deuringkeu-deobeulchoko-350ml-20gae": (52020, 78000, 33, 683, "18:01", "51,840 → 52,020원"),
    "kokakolra-jero-190ml-30gae": (15740, 21600, 27, 150590, "18:04", "변동 없음"),
    "seupeuraiteu-jero-saida-500ml-24gae": (16530, 38800, 57, 12074, "18:07", "변동 없음"),
    "haetaehtb-galbaesaida-jero-185ml-30gae": (11160, 11160, 0, 31711, "18:12", "9,020 → 11,160원(+23.7%)"),
}

KEEP = [
    # 닭가슴살·안심 (6)
    ("meat-chicken-harim-jayeonsilrok-breast-400g", "chicken", "breast"),
    ("meat-chicken-harim-iff-breast-2kg", "chicken", "breast"),
    ("meat-chicken-harim-jayeonsilrok-breast-1kg-3", "chicken", "breast"),
    ("meat-chicken-deobareundak-breast-2kg", "chicken", "breast"),
    ("meat-chicken-harim-tenderloin-350g", "chicken", "tenderloin"),
    ("meat-chicken-hangang-iqf-tenderloin-2kg", "chicken", "tenderloin"),
    # 소·돼지고기 (8)
    ("meat-beef-gomgom-daepae-woosamgyup-1kg", "meat", "beef"),
    ("meat-beef-gomgom-au-buchaesal-gui-600g", "meat", "beef"),
    ("meat-beef-au-buchaesal-steak-600g", "meat", "beef"),
    ("meat-pork-gomgom-daepae-samgyeop-1kg-2", "meat", "pork"),
    ("meat-pork-gomgom-muyeongol-daepae-1-5kg", "meat", "pork"),
    ("meat-pork-dodram-handon-samgyeopsal-1kg", "meat", "pork"),
    ("meat-pork-moamit-canada-moksal-1kg", "meat", "pork"),
    ("toss-daepae-samgyeop-2kg", "meat", "pork"),
    # 단백질 쉐이크·음료 (8)
    ("deodanbaek-deuringkeu-choko-250ml-18gae", "protein", "protein"),
    ("deodanbaek-40g-gohamryang-deuringkeu-deobeulchoko-350ml-20gae", "protein", "protein"),
    ("selrekseu-peuropit-moka-chokolrit-250ml-18gae", "protein", "protein"),
    ("haimyun-peurotin-baelreonseu-aektibeu-orijineol-250ml-18gae", "protein", "protein"),
    ("teikeupit-maekseu-chokomat-peurotin-250ml-24gae", "protein", "protein"),
    ("nyukeeo-olpeurotin-gosohanmat-245ml-24gae", "protein", "protein"),
    ("kalobai-peopekteu-pawosweikeu-beulrende-choko-1-8kg", "protein", "shake"),
    ("shake-newyorkwhey-light-2kg", "protein", "shake"),
    # 제로음료·생수 (8)
    ("kokakolra-jero-190ml-30gae", "zero", "cola"),
    ("toss-pepsi-jero-syugeo-raimhyang-355ml-24gae", "zero", "cola"),
    ("narangd-cider-zero", "zero", "cider"),
    ("seupeuraiteu-jero-saida-500ml-24gae", "zero", "cider"),
    ("haetaehtb-galbaesaida-jero-185ml-30gae", "zero", "cider"),
    ("chojeongtansansu-190ml-30gae", "zero", "sparkling"),
    ("keulrup-aesabisoda-orijineol-tansaneumryo-500ml-12gae", "zero", "acv"),
    ("toss-seupakeul-saengsu-murabel-2l-30gae", "zero", "water"),
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
    {"id": "breast", "label": "닭가슴살", "icon": "🍗", "part": "chicken"},
    {"id": "tenderloin", "label": "닭안심", "icon": "🍗", "part": "chicken"},
    {"id": "beef", "label": "소고기", "icon": "🥩", "part": "meat"},
    {"id": "pork", "label": "돼지고기", "icon": "🐖", "part": "meat"},
]

PARTS = [
    {"id": "all", "label": "전체", "icon": "", "note": ""},
    {
        "id": "zero",
        "label": "제로음료·생수",
        "icon": "🥤",
        "desc": "100ml당 가격 낮은 순",
        "note": "제로 음료·생수는 100ml당 가격으로 비교해요.",
        "filters": [
            {"id": "all", "label": "전체", "cats": ["cola", "cider", "sparkling", "water", "acv"]},
            {"id": "cola", "label": "제로 콜라", "icon": "🥤", "cats": ["cola"]},
            {"id": "cider", "label": "제로 사이다", "icon": "🍋", "cats": ["cider"]},
            {"id": "sparkling", "label": "탄산수", "icon": "💧", "cats": ["sparkling"]},
            {"id": "water", "label": "생수", "icon": "🚰", "cats": ["water"]},
            {"id": "acv", "label": "애사비", "icon": "🍎", "cats": ["acv"]},
        ],
    },
    {
        "id": "protein",
        "label": "단백질 쉐이크·음료",
        "icon": "💪",
        "desc": "단백질 함량·100g(g)당 가격 순",
        "note": "마시는 단백질은 1병 단백질(g), 가루 쉐이크는 100g당 가격으로 비교해요.",
        "filters": [
            {"id": "all", "label": "전체", "cats": ["protein", "shake"]},
            {"id": "protein", "label": "단백질 음료", "icon": "💪", "cats": ["protein"]},
            {"id": "shake", "label": "쉐이크(가루)", "icon": "🥛", "cats": ["shake"]},
        ],
    },
    {
        "id": "chicken",
        "label": "닭가슴살·안심",
        "icon": "🍗",
        "desc": "100g당 가격 낮은 순",
        "note": "닭가슴살·안심 원물을 100g당 가격으로 비교해요.",
        "filters": [
            {"id": "all", "label": "전체", "cats": ["breast", "tenderloin"]},
            {"id": "breast", "label": "닭가슴살", "icon": "🍗", "cats": ["breast"]},
            {"id": "tenderloin", "label": "닭안심", "icon": "🍗", "cats": ["tenderloin"]},
        ],
    },
    {
        "id": "meat",
        "label": "소·돼지고기",
        "icon": "🥩",
        "desc": "100g당 가격 낮은 순",
        "note": "소·돼지고기를 100g당 가격으로 비교해요.",
        "filters": [
            {"id": "all", "label": "전체", "cats": ["beef", "pork"]},
            {"id": "beef", "label": "소고기", "icon": "🥩", "cats": ["beef"]},
            {"id": "pork", "label": "돼지고기", "icon": "🐖", "cats": ["pork"]},
        ],
    },
]

PART_GROUP = {"zero": "제로음료·생수", "protein": "단백질", "chicken": "닭가슴살·안심", "meat": "소·돼지고기"}
CAT_GROUP = {
    "cola": "제로 콜라", "cider": "제로 사이다", "sparkling": "탄산수", "water": "생수", "acv": "애사비",
    "protein": "단백질 음료", "shake": "단백질 쉐이크", "breast": "닭가슴살", "tenderloin": "닭안심",
    "beef": "소고기", "pork": "돼지고기",
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
    # 단백질 20g당
    if isinstance(p.get("protein_g_per_bottle"), (int, float)) and p["protein_g_per_bottle"] > 0 and p.get("eachPrice"):
        p["protein20"] = round(p["eachPrice"] / p["protein_g_per_bottle"] * 20)
        p["pricePer20gProtein"] = p["protein20"]
    return p


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    src = {p["id"]: p for p in data["products"]}
    missing = [i for i, _, _ in KEEP if i not in src]
    if missing:
        raise SystemExit(f"카탈로그에 없는 상품: {missing}")

    out = []
    changed = []
    for pid, part, cat in KEEP:
        p = dict(src[pid])
        old_price = p["price"]
        old_checked = p.get("priceCheckedAt")
        p["part"] = part
        p["category"] = cat
        p["categoryId"] = cat
        p["group"] = PART_GROUP[part]
        v = VERIFIED.get(pid)
        if v:
            price, list_price, pct, reviews, hhmm, memo = v
            p["price"] = price
            p["listPrice"] = list_price
            p["discountPct"] = pct
            p["reviewCount"] = reviews
            p["priceCheckedAt"] = f"2026-11-20 {hhmm}"
            p["priceCheckedLabel"] = f"11/20 {hhmm} 쿠팡 기준"
            p["note"] = f"{memo}. {p.get('note', '')}".strip()
            if old_price != price:
                changed.append((pid, old_price, price, memo))
        elif not str(old_checked).startswith("2026-11-20"):
            # 토스 3종 — 웹에서 가격이 노출되지 않아 마지막 확인값 유지(확인 시각도 그대로)
            p["note"] = f"{p.get('note', '')} 토스 앱 전용 가격이라 웹에서는 재확인하지 못했어요(11/20 기준 마지막 확인값).".strip()
        p.pop("dealEndsAt", None)
        p.pop("shipNote", None)
        recompute(p)
        out.append(p)

    order = {"zero": 0, "protein": 1, "chicken": 2, "meat": 3}
    catorder = {c["id"]: i for i, c in enumerate(CATEGORIES)}
    out.sort(key=lambda p: (order[p["part"]], catorder[p["category"]], -(p.get("popularScore") or 0)))

    data["products"] = out
    data["categories"] = CATEGORIES
    data["parts"] = PARTS
    data["site"]["tagline"] = "제로음료·생수·단백질·닭가슴살·소·돼지고기 단가 비교"
    data["site"]["sourceNote"] = (
        "쿠팡·토스쇼핑 판매가는 직접 확인한 값이고, 네이버는 쇼핑커넥트로 발급받은 가격이에요. "
        "구성(수량)이 다른 상품은 몇 개입인지 함께 적었어요. 토스 앱 전용 가격은 앱에서 확인한 마지막 값을 적어 두었어요."
    )
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── 가격 이력: 남긴 상품만
    hist = json.loads(HIST.read_text(encoding="utf-8"))
    kept_ids = [p["id"] for p in out]
    hist["products"] = {k: v for k, v in hist["products"].items() if k in kept_ids}
    hist["meta"]["note"] = "r62(2026-11-20) 카탈로그를 핵심 식단템 30종으로 압축 — 뺀 상품의 이력은 지웠습니다."
    HIST.write_text(json.dumps(hist, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── js/products.js
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

    from collections import Counter

    print(f"상품 {len(out)}종 · 카테고리 {len(CATEGORIES)-1}개 · 파트 {len(PARTS)-1}개")
    print(dict(Counter(p["part"] for p in out)))
    print("가격이 바뀐 상품:")
    for pid, before, after, memo in changed:
        diff = after - before
        print(f"  {pid}: {before:,} → {after:,} ({diff:+,}) · {memo}")
    print(f"가격 이력 남은 상품 {len(hist['products'])}개")


if __name__ == "__main__":
    main()
