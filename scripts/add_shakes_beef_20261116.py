#!/usr/bin/env python3
"""2026-11-16 단백질 쉐이크 6종 + 호주산 부채살 600g 2종을 마트 데이터에 추가한다.

- data/products.json 과 js/products.js 를 같은 내용으로 다시 만든다.
- 이미 있는 id 는 건너뛴다(재실행 안전).
- 일반 쿠팡 구매 링크만 쓴다(파트너스/쉐어링크 없음).
- images/ 아래 ASCII 파일명 이미지를 참조한다.

사용법
    python3 scripts/add_shakes_beef_20261116.py --check   # 검증만
    python3 scripts/add_shakes_beef_20261116.py           # 반영
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

CHECKED_AT = "2026-11-16 22:55"
CHECKED_LABEL = "11/16 22:55 쿠팡 기준"
NUTRITION_LABEL = "11/16 22:55 쿠팡 상품 페이지·제품 표기 기준"
NOTE_ADD = "단백질 쉐이크·부채살 가격은 2026-11-16 22:55(Asia/Seoul)에 쿠팡에서 확인한 값이에요."

COUPANG = "https://www.coupang.com/vp/products/"


def shake(**kw):
    base = {
        "part": "protein",
        "category": "shake",
        "group": "단백질 쉐이크",
        "platform": "coupang",
        "priceCheckedAt": CHECKED_AT,
        "priceCheckedLabel": CHECKED_LABEL,
        "nutritionCheckedLabel": NUTRITION_LABEL,
        "container": "powder",
        "caffeine": None,
        "aspartame": None,
        "previousPrice": None,
        "lowest30d": None,
        "priceHistoryDays": 0,
    }
    base.update(kw)
    base.setdefault("listPrice", None)
    base.setdefault("discountPct", None)
    base["url"] = COUPANG + base["productId"]
    base["affiliateUrl"] = base["url"]
    base["image"] = f"images/{base['id']}.jpg"
    base.pop("productId")
    # 단가: 100g당 · 1회분당
    per100g = round(base["price"] / base["netWeightG"] * 100)
    per_serving = round(base["price"] / base["packCount"])
    base["unitPricePer100g"] = per100g
    base["unitPrice"] = f"100g당 {per100g:,}원"
    base["unitEach"] = f"1회({base['servingG']}g)분 약 {per_serving:,}원"
    base["protein_g_per_bottle"] = base["proteinPerServing"]
    base["kcal_per_bottle"] = base["kcalPerServing"]
    base["proteinStatus"] = f"{base['proteinPerServing']}g"
    base["kcalStatus"] = f"{base['kcalPerServing']}kcal"
    base["proteinPerG"] = round(per_serving / base["proteinPerServing"])
    base["proteinBasis"] = f"1회({base['servingG']}g)"
    base["proteinUnitLabel"] = "1회 단백질"
    base.pop("proteinPerServing")
    base.pop("kcalPerServing")
    return base


def rtd(**kw):
    """단백질 음료(액상) — 기존 단백질 음료 카드 구조."""
    base = {
        "part": "protein",
        "category": "protein",
        "group": "단백질 음료",
        "platform": "coupang",
        "priceCheckedAt": CHECKED_AT,
        "priceCheckedLabel": CHECKED_LABEL,
        "nutritionCheckedLabel": NUTRITION_LABEL,
        "container": "pet-small",
        "caffeine": "contains",
        "aspartame": None,
        "previousPrice": None,
        "lowest30d": None,
        "priceHistoryDays": 0,
    }
    base.update(kw)
    base.setdefault("listPrice", None)
    base.setdefault("discountPct", None)
    base["url"] = COUPANG + base["productId"]
    base["affiliateUrl"] = base["url"]
    base["image"] = f"images/{base['id']}.jpg"
    base.pop("productId")
    per100 = round(base["price"] / (base["volumeMl"] * base["packCount"]) * 100)
    base["unitPricePer100ml"] = per100
    base["unitPrice"] = f"100ml당 {per100:,}원"
    base["unitEach"] = f"병당 약 {round(base['price'] / base['packCount']):,}원"
    base["protein_g_per_bottle"] = base["proteinPerBottle"]
    base["kcal_per_bottle"] = base.get("kcalPerBottle")
    base["proteinStatus"] = f"{base['proteinPerBottle']}g"
    base["proteinUnitLabel"] = "병당 단백질"
    base["proteinPerG"] = round(base["price"] / base["packCount"] / base["proteinPerBottle"])
    base.pop("proteinPerBottle")
    base.pop("kcalPerBottle", None)
    return base


def meat(**kw):
    base = {"part": "meat", "platform": "coupang",
            "priceCheckedAt": CHECKED_AT, "priceCheckedLabel": CHECKED_LABEL,
            "meatType": "소고기"}
    base.update(kw)
    base["categoryId"] = base["category"]
    base["url"] = COUPANG + base["productId"]
    base["affiliateUrl"] = base["url"]
    base["image"] = f"images/{base['id']}.jpg"
    base.pop("productId")
    base["per100g"] = round(base["price"] / base["weightG"] * 100)
    base["unitPrice"] = f"100g당 {base['per100g']:,}원"
    base["unitEach"] = f"{base['weightG']}g 1팩"
    return base


NEW_PRODUCTS = [
    shake(
        id="kalobai-peopekteu-pawosweikeu-beulrende-choko-1-8kg",
        productId="9411472223",
        brand="칼로바이",
        name="칼로바이 퍼펙트 파워쉐이크 블렌드 단백질쉐이크 초코맛, 1.8kg, 1개",
        kind="단백질 쉐이크 · 초코",
        flavor="초코",
        proteinType="choco",
        price=41900, listPrice=79200, discountPct=47,
        netWeightG=1800, servingG=30, packCount=60,
        proteinPerServing=21, kcalPerServing=115, sugarPerServing=1,
        proteinSource="동·식물성 복합단백", proteinSourceDetail="WPC·MPC·ISP",
        rating=4.5, reviewCount=612,
    ),
    shake(
        id="kalobai-peopekteu-pawosweikeu-soi-peurotin-1-8kg",
        productId="9705618995",
        brand="칼로바이",
        name="칼로바이 퍼펙트 파워쉐이크 소이 프로틴 EAA 초코맛, 1.8kg, 1개",
        kind="단백질 쉐이크 · 식물성 초코",
        flavor="초코",
        proteinType=["soy", "choco"],
        price=27900, listPrice=30900, discountPct=9,
        netWeightG=1800, servingG=30, packCount=60,
        proteinPerServing=21, kcalPerServing=120, sugarPerServing=1,
        proteinSource="ISP 분리대두단백", proteinSourceDetail="식물성 단일원료",
        rating=5, reviewCount=102,
    ),
    shake(
        id="peulraimil-rieolchoko-630g",
        productId="9445621038",
        brand="플라이밀",
        name="플라이밀 리얼초코 고단백 단백질 쉐이크, 630g, 1개",
        kind="단백질 쉐이크 · 리얼초코",
        flavor="리얼초코",
        proteinType="choco",
        price=26800,
        netWeightG=630, servingG=45, packCount=14,
        proteinPerServing=23.7, kcalPerServing=159, sugarPerServing=1.2,
        proteinSource="동·식물성 복합단백", proteinSourceDetail="WPI·WPC·ISP·콜라겐",
        rating=5, reviewCount=2265,
    ),
    shake(
        id="peulraimil-beuraun-630g",
        productId="7537043284",
        brand="플라이밀",
        name="플라이밀 브라운 17곡미숫가루 고단백 단백질 쉐이크, 630g, 1개",
        kind="단백질 쉐이크 · 미숫가루",
        flavor="17곡미숫가루",
        proteinType="plain",
        price=26800,
        netWeightG=630, servingG=45, packCount=14,
        proteinPerServing=20, kcalPerServing=166, sugarPerServing=1,
        proteinSource="유청+대두 혼합단백", proteinSourceDetail="ISP·WPC·밀크단백",
        rating=5, reviewCount=8580,
    ),
    shake(
        id="mirit-danbaekjil-sweikeu-piseutacio-560g",
        productId="8725390495",
        brand="밀잇",
        name="밀잇 단백질 쉐이크 피스타치오맛, 560g, 1개",
        kind="단백질 쉐이크 · 피스타치오",
        flavor="피스타치오",
        proteinType="plain",
        price=29900, listPrice=50000, discountPct=40,
        netWeightG=560, servingG=40, packCount=14,
        proteinPerServing=15, kcalPerServing=164, sugarPerServing=2.6,
        proteinSource="유청+대두 혼합단백", proteinSourceDetail="WPC·ISP·MPC",
        rating=5, reviewCount=656,
    ),
    rtd(
        id="kalobai-peopekteu-pawosweikeu-choko-250ml-24gae",
        productId="7645380932",
        brand="칼로바이",
        name="칼로바이 퍼펙트 파워쉐이크 초코맛 20g, 250ml, 24개",
        kind="단백질 음료 · 초코",
        flavor="초코",
        proteinType="choco",
        price=38900, listPrice=40540, discountPct=4,
        volumeMl=250, packCount=24, proteinPerBottle=20, kcalPerBottle=None,
        rating=5, reviewCount=1703,
    ),
    meat(
        id="meat-beef-au-buchaesal-steak-600g",
        productId="7538803722",
        category="beef",
        group="소고기",
        cut="부채살",
        cutGroup="부채살(스테이크용)",
        brand="호주산",
        name="호주산 부채살 스테이크용 (냉장), 600g, 1개",
        kind="호주산 부채살 · 스테이크용",
        price=19520, listPrice=29590, discountPct=34,
        weightG=600, rating=4.5, reviewCount=23100,
    ),
    meat(
        id="meat-beef-gomgom-au-buchaesal-gui-600g",
        productId="1232707733",
        category="beef",
        group="소고기",
        cut="부채살",
        cutGroup="부채살(구이용)",
        brand="곰곰",
        name="곰곰 호주산 부채살 구이용 (냉장), 600g, 1팩",
        kind="호주산 부채살 · 구이용",
        price=21590, listPrice=23990, discountPct=10,
        weightG=600, rating=4.5, reviewCount=50467,
    ),
]

SHAKE_CATEGORY = {
    "id": "shake",
    "label": "단백질 쉐이크",
    "icon": "🥛",
    "part": "protein",
    "note": "가루 쉐이크라 100g당 가격으로 비교하고, 카드에는 1회 섭취분의 단백질(g)과 열량을 적었어요. 단백질(g)은 제품 포장 표기 기준이에요.",
}

SHAKE_FILTER = {
    "id": "shake",
    "label": "단백질 쉐이크",
    "icon": "🥛",
    "cats": ["shake"],
    "note": "1회 섭취분 단백질(g)과 열량, 100g당 가격을 같이 봐요. 가루 제품은 물이나 우유에 타서 마셔요.",
}


def load():
    return json.loads(DATA.read_text(encoding="utf-8"))


def transform(cat):
    products = cat["products"]
    have = {p["id"]: p for p in products}
    added = []
    for item in NEW_PRODUCTS:
        old = have.get(item["id"])
        if old is None:
            products.append(item)
            added.append(item)
        else:
            old.update(item)
            added.append(item)

    cats = cat["categories"]
    if not any(c["id"] == "shake" for c in cats):
        idx = next((i for i, c in enumerate(cats) if c["id"] == "protein"), 1)
        cats.insert(idx + 1, SHAKE_CATEGORY)

    for part in cat["parts"]:
        if part.get("id") != "protein":
            continue
        for f in part.get("filters", []):
            if f.get("id") == "all" and "shake" not in f.get("cats", []):
                f["cats"].append("shake")
            if f.get("id") == "high":
                f["note"] = "1회(병·포) 단백질 20g 이상 상품만 모았어요. 단백질(g)은 제품 표기 기준이에요."
        if not any(f["id"] == "shake" for f in part.get("filters", [])):
            pos = next((i for i, f in enumerate(part["filters"]) if f["id"] == "high"), 1)
            part["filters"].insert(pos + 1, dict(SHAKE_FILTER))

    labels = {"pet-small": "소형 페트", "pet-large": "대용량"}
    for c in cat.get("containers", []):
        if c["id"] in labels:
            c["label"] = labels[c["id"]]

    note = cat["site"].get("sourceNote", "")
    if NOTE_ADD not in note:
        cat["site"]["sourceNote"] = (note.rstrip() + " " + NOTE_ADD).strip()
    cat["site"]["tagline"] = "제로 음료·단백질 쉐이크·식단 고기 단가 비교"

    return cat, added


def js_text(cat):
    head = """/**
 * 띠니 상품 데이터 (이 파일 하나만 보면 됩니다).
 *
 * 구매 버튼은 각 상품의 affiliateUrl만 사용합니다.
 * 지금은 쿠팡 상품은 www.coupang.com 주소(파트너스 링크가 있으면 link.coupang.com),
 * 토스 상품은 쉐어링크(있으면 shareLink, 없으면 토스 상품 페이지)입니다.
 *
 * 쿠팡 파트너스 단축 링크(https://link.coupang.com/...)가 준비되면
 * partners-links.json 에 상품 id → 파트너스 URL 을 적은 뒤
 *
 *   python3 scripts/apply-partners-links.py
 *
 * 를 실행하세요. affiliateUrl만 바뀌고, 나머지 상품 정보는 그대로입니다.
 */
"""

    def block(name, value):
        return f"const {name} = " + json.dumps(value, ensure_ascii=False, indent=2) + ";\n"

    return (
        head
        + "\n"
        + block("SITE", cat["site"])
        + "\n"
        + block("CATEGORIES", cat["categories"])
        + "\n"
        + block("PARTS", cat["parts"])
        + "\n"
        + block("SORTS", cat["sorts"])
        + "\n"
        + block("CONTAINERS", cat["containers"])
        + "\n"
        + block("INGREDIENT_FILTERS", cat["ingredientFilters"])
        + "\n"
        + block("PRODUCTS", cat["products"])
    )


def main():
    check = "--check" in sys.argv
    cat, added = transform(load())
    print(f"추가 {len(added)}건 / 전체 {len(cat['products'])}건")
    for p in added:
        print("  +", p["id"], "|", p["name"])

    # 이미지 존재 확인
    missing = [p["image"] for p in cat["products"] if not (ROOT / p["image"]).exists()]
    if missing:
        print("이미지 없음:", missing)
        return 1

    ids = [p["id"] for p in cat["products"]]
    dup = {i for i in ids if ids.count(i) > 1}
    if dup:
        print("중복 id:", dup)
        return 1

    if check:
        print("check ok")
        return 0

    DATA.write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    JS.write_text(js_text(cat), encoding="utf-8")
    print("wrote", DATA.name, "and", JS.name)
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
