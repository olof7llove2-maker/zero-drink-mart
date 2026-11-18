#!/usr/bin/env python3
"""2026-11-18 18:30 점검에서 발굴한 신규 초특가 2종 추가 (r40).

1) [케이원푸드] 국내산 냉장 닭가슴살, 1kg, 2개
   12,650원(정가 16,000원, 100g당 633원) · 🥩 식단 고기 > 닭고기
   아버님 쿠팡 파트너스 단축 링크 발급 성공: https://link.coupang.com/a/iMeZzVubLw
2) 프로틴스토리 맛있는 단백질 퓨어프로틴7 3kg 쇼콜라초코, 3kg, 1개
   42,410원(정가 69,000원, 100g당 1,414원·10g당 141원) · 🧋 단백질 쉐이크
   쿠팡 파트너스에서 "판매자의 요청에 따라 링크 생성이 제한된 상품"으로 막혀
   일반 상품 링크로 연결한다(수익 없음).

실측 근거(2026-11-18 18:45~18:50, 쿠팡 로그인 세션 신*용)
- 케이원푸드: 상품번호 9194426453-27137448409, 4.5(281), 무료배송, 모레(금) 11/20 도착 예정,
  판매자 케이원푸드·CJ대한통운, 1kg×2개. 화면가 12,650원(100g당 633원) / 정가 16,000원 /
  "2,150원 할인 14,800원" 표기 → 할인 전 판매가 14,800원.
- 퓨어프로틴7: 상품번호 9499047981-24263235071, 4.5(3,460), 일반할인가 42,410원·와우할인가 41,980원,
  정가 69,000원, 1회 45g·단백질 32g·171kcal(제품 상세 표기), 무료배송·내일(목) 11/19 도착 예정,
  판매자 레인보우 오가닉.

출력: data/products.json, js/products.js, partners-links.json, partners-restricted.json
사용법: python3 scripts/add_deals_20261118_k1_pureprotein7.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"
LINKS = ROOT / "partners-links.json"
RESTRICTED = ROOT / "partners-restricted.json"

CHECKED = "2026-11-18 18:50"
CHECKED_LABEL = "11/18 18:50 쿠팡 기준"

K1_LINK = "https://link.coupang.com/a/iMeZzVubLw"
K1_URL = "https://www.coupang.com/vp/products/9194426453?itemId=27137448409&vendorItemId=94105378412"
PP7_URL = "https://www.coupang.com/vp/products/9499047981?itemId=24263235071&vendorItemId=94917160218"

K1 = {
    "id": "meat-chicken-k1-naengjang-breast-1kg-1kg",
    "group": "닭고기",
    "category": "chicken",
    "categoryId": "chicken",
    "part": "meat",
    "meatType": "닭고기",
    "cut": "닭가슴살",
    "cutGroup": "닭가슴살",
    "brand": "케이원푸드",
    "name": "[케이원푸드] 국내산 냉장 닭가슴살, 1kg, 2개",
    "kind": "국내산 닭가슴살 · 냉장 1kg×2",
    "price": 12650,
    "listPrice": 16000,
    "discountPct": 21,
    "priceCheckedAt": CHECKED,
    "priceCheckedLabel": CHECKED_LABEL,
    "platform": "coupang",
    "url": K1_URL,
    "affiliateUrl": K1_LINK,
    "image": "images/meat-chicken-k1-naengjang-breast-1kg-1kg.jpg",
    "rating": 4.5,
    "reviewCount": 281,
    "weightG": 2000,
    "packCount": 2,
    "eachPrice": 6325,
    "eachLabel": "팩",
    "unitEach": "1팩(1kg)당 6,325원",
    "proteinPer100g": 23.0,
    "fatPer100g": 1.3,
    "nutritionBasis": "부위 기준 참고치",
    "nutritionNote": "제품 영양성분표가 없는 원물이라 국가표준식품성분표·USDA 부위 표준값 참고치예요",
    "nutritionLabel": "100g당 단백질 ~23.0g · 지방 ~1.3g (부위 기준)",
    "measure": "per100g",
    "shipNote": "무료배송 · 모레(금) 11/20 도착 예정 · 판매자 배송(CJ대한통운)",
    "note": (
        "16,000원 → 12,650원(100g당 633원), 1kg 두 팩(총 2kg) 국내산 냉장이에요. "
        "쿠팡에서 2,150원 할인이 붙은 가격이라 할인 전 판매가는 14,800원(100g당 740원)이에요. "
        "무료배송·오늘출발, 평점 4.5·리뷰 281. 마트에서 가장 싸던 한강식품 IQF 닭가슴살(100g당 1,059원)보다 "
        "100g당 40% 낮아요. 아버님 쿠팡 파트너스 단축 링크로 연결했어요."
    ),
}

PP7 = {
    "id": "shake-peurotinseutori-purepeurotin7-3kg-choko",
    "part": "shake",
    "category": "shake",
    "group": "단백질 쉐이크",
    "brand": "프로틴스토리",
    "name": "프로틴스토리 맛있는 단백질 퓨어프로틴7 3kg 쇼콜라초코, 3kg, 1개",
    "kind": "단백질 쉐이크 · 쇼콜라초코",
    "flavor": "쇼콜라초코",
    "proteinType": "choco",
    "price": 42410,
    "listPrice": 69000,
    "discountPct": 38,
    "priceCheckedAt": CHECKED,
    "priceCheckedLabel": CHECKED_LABEL,
    "platform": "coupang",
    "url": PP7_URL,
    # 파트너스 링크 생성 제한 상품 → 일반 상품 링크
    "affiliateUrl": PP7_URL,
    "image": "images/shake-peurotinseutori-purepeurotin7-3kg-choko.jpg",
    "container": "powder",
    "netWeightG": 3000,
    "weightG": 3000,
    "servingG": 45,
    "packCount": 66,
    "eachPrice": 643,
    "eachLabel": "회분",
    "unitEach": "1회(45g)당 643원",
    "protein_g_per_bottle": 32,
    "kcal_per_bottle": 171,
    "proteinStatus": "32g",
    "kcalStatus": "171kcal",
    "proteinBasis": "1회(45g)",
    "proteinUnitLabel": "1회 단백질",
    "proteinSource": "동·식물성 복합단백",
    "proteinSourceDetail": "ISP·WPH·WPI·WPC·MPI·미셀라카제인",
    "proteinSourceKey": "blend",
    "measure": "per100g",
    "rating": 4.5,
    "reviewCount": 3460,
    "shipNote": "무료배송 · 내일(목) 11/19 도착 예정 · 판매자 레인보우 오가닉",
    "note": (
        "69,000원 → 42,410원(100g당 1,414원·10g당 141원), 38% 할인이에요. "
        "3kg 대용량으로 1회 45g 기준 약 66회분, 와우회원은 41,980원(10g당 140원)이에요. "
        "평점 4.5·리뷰 3,460. 칼로바이 퍼펙트 파워쉐이크 1.8kg(10g당 233원)보다 10g당 39% 낮은 단가예요. "
        "이 상품은 판매자 요청으로 쿠팡 파트너스 링크가 막혀 있어 일반 쿠팡 링크로 연결했어요(수수료 없음)."
    ),
}


def brand_weight(brand):
    # build_v5_20261117.py와 같은 기준. 케이원푸드·프로틴스토리는 대표/준주력 목록에 없어 6점.
    return 6


def popular_score(p):
    score = brand_weight(p.get("brand"))
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


def half_up(x):
    # 쿠팡 표기와 맞추기 위해 사사오입(은행가 반올림 금지): 632.5 → 633
    return int(math.floor(x + 0.5))


def build(p):
    out = dict(p)
    price = out["price"]
    if out.get("weightG"):
        per100 = price / out["weightG"] * 100
        out["per100g"] = half_up(per100)
        out["perValue"] = round(per100, 1)
        out["unitPrice"] = f"100g당 {half_up(per100):,}원"
        if out.get("protein_g_per_bottle"):
            each = out["eachPrice"]
            out["protein20"] = round(each / out["protein_g_per_bottle"] * 20)
            out["pricePer20gProtein"] = out["protein20"]
            out["proteinPerG"] = round(each / out["protein_g_per_bottle"])
        elif out.get("proteinPer100g"):
            out["protein20"] = half_up(half_up(per100) / out["proteinPer100g"] * 20)
            out["pricePer20gProtein"] = out["protein20"]
        else:
            out["protein20"] = None
    else:
        per100 = price / (out["volumeMl"] * out["packCount"]) * 100
        out["unitPricePer100ml"] = round(per100)
        out["unitPriceOfficial"] = f"100ml당 {round(per100):,}원"
        out["unitPrice"] = f"100ml당 {round(per100):,}원"
        out["perValue"] = round(per100, 1)
        each = round(price / out["packCount"])
        out["eachPrice"] = each
        out["unitEach"] = f"1{out.get('eachLabel', '개')}당 {each:,}원"
        out["protein20"] = None
    out["popularScore"] = popular_score(out)
    return out


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    added, updated = [], []
    for row in (K1, PP7):
        prod = build(row)
        if prod["id"] in by_id:
            by_id[prod["id"]].update(prod)
            updated.append(prod["id"])
        else:
            data["products"].append(prod)
            added.append(prod["id"])

    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

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

    links = json.loads(LINKS.read_text(encoding="utf-8"))
    links[K1["id"]] = K1_LINK
    LINKS.write_text(json.dumps(links, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    restricted = json.loads(RESTRICTED.read_text(encoding="utf-8"))
    if PP7["id"] not in restricted:
        restricted.append(PP7["id"])
        restricted.sort()
    RESTRICTED.write_text(json.dumps(restricted, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    counts = {}
    for p in data["products"]:
        counts[p["part"]] = counts.get(p["part"], 0) + 1
    print("신규", added, "갱신", updated)
    print("상품", len(data["products"]), counts)
    for pid in added + updated:
        p = {x["id"]: x for x in data["products"]}[pid]
        print(
            f"  {pid}: {p['price']:,}원 · {p['unitPrice']} · {p['unitEach']} · "
            f"20g당 {p.get('protein20')} · popularScore {p['popularScore']}"
        )


if __name__ == "__main__":
    main()
