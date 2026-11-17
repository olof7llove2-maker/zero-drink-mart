#!/usr/bin/env python3
"""애사비 원액·스틱 6종 + 오트몬드 프로틴 + 네이버 우위 3종 반영 (2026-11-17).

재영 님 요청
  - "애사비 원액·스틱도 제로음료에 넣어줘" (naver-extra-20261117.json 발굴분)
  - "오트몬드 프로틴 초코 18개 11,650원 꿀딜" → 배송비 10,000원이 붙어 실질 21,650원이라
    배송비 없는 36개(38,700원·100ml당 430원)로 카드 만들고 18/54개 가격을 note에 남김
  - 네이버가 더 싼 상품은 같은 카드에 네이버 버튼 추가 (altPrice, source=naver)

가격 근거
  쿠팡: 2026-11-17 14:5x 쿠팡 검색/상품 확인 (아버님 로그인 세션)
  네이버: data/naver-extra-20261117.json (2026-11-17 14:30, 배송비 포함 실결제가)

출력: data/products.json, js/products.js
사용법: python3 scripts/add_naver_acv_3color_20261117.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

CHECKED = "2026-11-17 14:55"
CHECKED_LABEL = "11/17 14:55 쿠팡 기준"
NAVER_SEARCH = "https://search.shopping.naver.com/search/all?query="

# 네이버 상품 주소가 '판매처 상품ID'라 카탈로그 주소가 확실하지 않은 건은 검색 주소로 보낸다.
NAVER_QUERY = {
    "맥콜": "맥콜 제로 250ml",
    "브래그": "브래그 유기농 사과식초 946ml",
}


def cp(pid, item_id):
    return f"https://www.coupang.com/vp/products/{pid}?itemId={item_id}"


def nsearch(q):
    from urllib.parse import quote

    return NAVER_SEARCH + quote(q)


def drink_score(per_value, discount):
    """100ml당 가격(로그 스케일) 45점 + 할인율 18점 + 기본 30점."""
    if not per_value:
        return 42.0
    lo, hi = 80, 900
    cheap = max(0.0, min(1.0, (math.log10(hi) - math.log10(per_value)) / (math.log10(hi) - math.log10(lo))))
    disc = min(discount or 0, 60) / 60
    return round(30 + 45 * cheap + 18 * disc, 2)


def solid_score(per_value, discount):
    if not per_value:
        return 42.0
    lo, hi = 400, 6000
    cheap = max(0.0, min(1.0, (math.log10(hi) - math.log10(per_value)) / (math.log10(hi) - math.log10(lo))))
    disc = min(discount or 0, 60) / 60
    return round(30 + 45 * cheap + 18 * disc, 2)


NEW = [
    # ── 애사비 원액 ───────────────────────────────────────────
    dict(
        id="acv-duomo-organic-1l", category="acv", brand="두오모(DUOMO)",
        name="두오모 유기농 사과식초, 1L, 1개", kind="애사비 · 유기농 원액",
        price=7550, listPrice=9690, discountPct=22, volumeMl=1000, packCount=1,
        unit_per_100ml=755, unit_each="1병당 7,550원",
        rating=5.0, reviewCount=12773,
        url=cp(7663062764, 20420666452), image="images/acv-duomo-organic-1l.jpg",
        note="22% 할인(6일 남음) 7,550원 = 100ml당 755원. 네이버 최저는 8,390원이라 쿠팡이 더 싸요. "
             "4개 20,840원(100ml당 521원)·6개 29,090원(485원) 묶음이 더 저렴해요.",
    ),
    dict(
        id="acv-denigris-organic-1l", category="acv", brand="데니그리스",
        name="데니그리스 유기농 사과식초, 1L, 1개", kind="애사비 · 유기농 원액",
        price=9800, listPrice=22000, discountPct=55, volumeMl=1000, packCount=1,
        unit_per_100ml=980, unit_each="1병당 9,800원",
        rating=5.0, reviewCount=95508,
        url=cp(7992079901, 11652049882), image="images/acv-denigris-organic-1l.jpg",
        note="55% 할인 9,800원 = 100ml당 980원. 리뷰 9.5만·평점 5.0. 네이버 최저도 같은 가격이에요.",
    ),
    dict(
        id="acv-maya-organic-1l-4", category="acv", brand="마야(MAYAH)",
        name="마야 유기농 애플 사이다 비니거, 1L, 4개", kind="애사비 · 유기농 원액",
        price=19190, listPrice=39600, discountPct=51, volumeMl=1000, packCount=4,
        unit_per_100ml=480, unit_each="1병당 4,798원",
        rating=4.5, reviewCount=3284,
        url=cp(8844412181, 25789740518), image="images/acv-maya-organic-1l-4.jpg",
        note="51% 할인. 4L에 19,190원 = 100ml당 480원. 1개 5,900원(100ml당 590원)보다 훨씬 싸요. "
             "네이버 최저도 같은 가격이에요.",
    ),
    dict(
        id="acv-bragg-organic-946ml-2", category="acv", brand="브래그(Bragg)",
        name="브래그 유기농 사과식초(애플사이다비니거), 946ml, 2개", kind="애사비 · 유기농 원액",
        price=27900, listPrice=31800, discountPct=12, volumeMl=946, packCount=2,
        unit_per_100ml=1475, unit_each="1병당 13,950원",
        rating=4.5, reviewCount=55616,
        url=cp(8321911365, 27575458524), image="images/acv-bragg-organic-946ml-2.jpg",
        alt=dict(price=24580, save=3320, savePct=11.9,
                 url=nsearch(NAVER_QUERY["브래그"]),
                 note="네이버 최저(페퍼앤솔트, 배송비 100원 포함) 24,580원"),
        note="쿠팡 27,900원(100ml당 1,475원) vs 네이버 24,580원(100ml당 1,299원) — 네이버가 3,320원 싸요.",
    ),
    # ── 애사비 스틱 ───────────────────────────────────────────
    dict(
        id="acv-teazen-stick-150g-2", category="acv", brand="티젠",
        name="티젠 애플사이다 비니거 스틱, 150g, 2개(60스틱)", kind="애사비 스틱 · 5g×60포",
        price=16900, listPrice=42000, discountPct=59, weightG=300, packCount=2,
        measure="per100g", per_100g=5633, unit_each="1스틱(5g)당 282원",
        rating=5.0, reviewCount=13785,
        url=cp(8834441083, 24583783298), image="images/acv-teazen-stick-150g-2.jpg",
        note="59% 할인. 60스틱 16,900원 = 1스틱 282원·100g당 5,633원. 네이버는 19,900원이라 쿠팡이 3,000원 싸요.",
    ),
    dict(
        id="acv-jeongjikhan-stick-15g-100", category="acv", brand="정직한하루",
        name="정직한하루 100% 유기농 애사비 스틱, 15g, 100개", kind="애사비 스틱 · 15g×100포",
        price=19790, listPrice=24900, discountPct=20, weightG=1500, packCount=100,
        measure="per100g", per_100g=1319, unit_each="1스틱(15g)당 198원",
        rating=4.5, reviewCount=768,
        url=cp(9479078924, 28220848142), image="images/acv-jeongjikhan-stick-15g-100.jpg",
        note="20% 할인. 100스틱 19,790원 = 1스틱 198원·100g당 1,319원. 200스틱 38,490원(100g당 1,283원)도 있어요. "
             "네이버 최저도 같은 가격이에요.",
    ),
    # ── 단백질 음료 ──────────────────────────────────────────
    dict(
        id="protein-otmond-choco-250ml-36", category="protein", brand="오트몬드",
        name="오트몬드 프로틴 초코맛, 250ml, 36개", kind="단백질 음료 · 초코", flavor="초코",
        price=38700, listPrice=None, discountPct=None, volumeMl=250, packCount=36,
        unit_per_100ml=430, unit_each="1병당 1,075원",
        rating=5.0, reviewCount=735,
        url=cp(8822328328, 27578260887), image="images/protein-otmond-choco-250ml-36.jpg",
        note="18개 11,650원은 배송비 10,000원이 붙어 실결제 21,650원(100ml당 481원)이에요. "
             "배송비 없는 36개 38,700원(100ml당 430원)이 더 싸고, 54개 52,820원은 391원까지 내려가요.",
    ),
    # ── 즉석밥 ───────────────────────────────────────────────
    dict(
        id="retort-rice-haetban-baeahyeonmi-130g-36", category="rice", brand="CJ 햇반",
        name="햇반 발아현미밥, 130g, 36개", kind="즉석현미밥 · 작은공기",
        price=29900, listPrice=89280, discountPct=66, weightG=4680, packCount=36,
        measure="per100g", per_100g=639, unit_each="1개당 830원",
        rating=5.0, reviewCount=112462,
        url=cp(9775921821, 29264489282), image="images/retort-rice-haetban-baeahyeonmi-130g-36.jpg",
        alt=dict(price=26690, save=3210, savePct=10.7,
                 url="https://search.shopping.naver.com/catalog/51929185882",
                 note="네이버 최저 26,690원(무료배송, 100g당 617원)"),
        note="66% 할인 29,900원(100g당 639원) — 네이버는 26,690원(100g당 617원)이라 3,210원 싸요.",
    ),
    # ── 제로 사이다 ──────────────────────────────────────────
    dict(
        id="seupeuraiteu-jero-saida-500ml-24gae", category="cider", brand="스프라이트",
        name="스프라이트 제로 사이다, 500ml, 24개", kind="제로 사이다", flavor="사이다",
        price=16530, listPrice=38800, discountPct=57, volumeMl=500, packCount=24,
        unit_per_100ml=138, unit_each="1병당 689원",
        rating=5.0, reviewCount=11997, container="pet-small",
        url=cp(8255038473, 24105046603), image="images/seupeuraiteu-jero-saida-500ml-24gae.jpg",
        note="57% 할인 16,530원 = 100ml당 138원. 350ml 24개(100ml당 172원)보다 훨씬 싸요. "
             "네이버 최저도 16,530원으로 같아요.",
    ),
]

# 기존 카드에 네이버 최저가만 덧붙이는 것 (같은 카드 안 두 버튼)
ALTS = {
    "toss-maekkol-jero-250ml-30gae": dict(
        price=14900, save=1000, savePct=6.3,
        url=nsearch(NAVER_QUERY["맥콜"]),
        note="네이버 최저(일화 공식몰, 무료배송) 14,900원",
    ),
    "shake-optimum-gold-standard-double-rich-chocolate-2-29kg": dict(
        price=122500, save=11770, savePct=8.8,
        url="https://search.shopping.naver.com/catalog/55499106094",
        note="네이버 2.27kg 112,600원 + 배송비 9,900원 = 122,500원(배송비 포함)",
    ),
}

PART_OF_CAT = {"acv": "zero", "cider": "zero", "protein": "protein", "rice": "cheat"}
GROUP_OF_CAT = {"acv": "애사비", "cider": "제로 사이다", "protein": "단백질 음료", "rice": "즉석밥"}


def build(row):
    cat = row["category"]
    measure = row.get("measure", "per100ml")
    p = {
        "id": row["id"],
        "group": GROUP_OF_CAT[cat],
        "category": cat,
        "part": PART_OF_CAT[cat],
        "brand": row["brand"],
        "name": row["name"],
        "kind": row["kind"],
        "price": row["price"],
        "listPrice": row.get("listPrice"),
        "discountPct": row.get("discountPct"),
        "priceCheckedAt": CHECKED,
        "priceCheckedLabel": CHECKED_LABEL,
        "platform": "coupang",
        "url": row["url"],
        "affiliateUrl": row["url"],
        "image": row["image"],
        "volumeMl": row.get("volumeMl"),
        "weightG": row.get("weightG"),
        "packCount": row.get("packCount"),
        "rating": row.get("rating"),
        "reviewCount": row.get("reviewCount"),
        "measure": measure,
        "unitEach": row.get("unit_each"),
        "note": row["note"],
        "previousPrice": None,
        "lowest30d": row["price"],
        "priceHistoryDays": 0,
        "protein20": None,
    }
    if row.get("flavor"):
        p["flavor"] = row["flavor"]
    if row.get("container"):
        p["container"] = row["container"]
        p["caffeine"] = None
        p["aspartame"] = None
    if measure == "per100g":
        per = row["per_100g"]
        p["per100g"] = per
        p["perValue"] = float(per)
        p["unitPrice"] = f"100g당 {per:,}원"
        if row.get("weightG"):
            p["eachPrice"] = round(row["price"] / row["packCount"]) if row.get("packCount") else None
            p["eachLabel"] = "개"
    else:
        per = row["unit_per_100ml"]
        p["unitPricePer100ml"] = per
        p["unitPriceOfficial"] = f"100ml당 {per:,}원"
        p["perValue"] = float(per)
        p["unitPrice"] = f"100ml당 {per:,}원"
        if row.get("packCount"):
            p["eachPrice"] = round(row["price"] / row["packCount"])
            p["eachLabel"] = "병"
    if row.get("alt"):
        a = row["alt"]
        p["altPrice"] = {
            "source": "naver",
            "price": a["price"],
            "url": a["url"],
            "save": a["save"],
            "savePct": a["savePct"],
            "note": a["note"],
        }
    p["popularScore"] = (
        solid_score(p.get("perValue"), row.get("discountPct"))
        if measure == "per100g"
        else drink_score(p.get("perValue"), row.get("discountPct"))
    )
    return p


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    added, skipped = [], []
    for row in NEW:
        if row["id"] in by_id:
            skipped.append(row["id"])
            continue
        data["products"].append(build(row))
        added.append(row["id"])

    alt_added = []
    for pid, a in ALTS.items():
        p = by_id.get(pid)
        if not p:
            print("!! 기존 카드 없음:", pid)
            continue
        p["altPrice"] = {
            "source": "naver",
            "price": a["price"],
            "url": a["url"],
            "save": a["save"],
            "savePct": a["savePct"],
            "note": a["note"],
        }
        alt_added.append(pid)

    # 기본 정렬 유지: 인기·할인 순
    data["products"].sort(key=lambda p: (-(p.get("popularScore") or 0), p.get("perValue") or 10 ** 9))
    data["site"]["updatedAt"] = "2026-11-17"
    data["site"]["sourceNote"] = (
        "쿠팡·토스쇼핑 판매가를 2026-11-15~17에 직접 확인한 값이에요. "
        "네이버 최저가는 배송비 포함 실구매가로 견줘 더 싼 것만 '네이버' 버튼으로 같이 걸었어요."
    )
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # js/products.js 재생성 (헤더는 기존 파일 유지)
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

    print("추가:", len(added))
    for i in added:
        print("  +", i)
    if skipped:
        print("이미 있음:", skipped)
    print("네이버 버튼 추가:", alt_added)
    print("총 상품:", len(data["products"]))


if __name__ == "__main__":
    main()
