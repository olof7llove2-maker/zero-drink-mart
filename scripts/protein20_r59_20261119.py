#!/usr/bin/env python3
"""r59 — '단백질 20g당 가격'을 고기·단백질 음료·단백질 쉐이크에서 같은 규칙으로 맞춘다.

무엇을 하나
  1) 100g당 단백질 참고치가 있는 고기는 protein20 = round(100g당 가격 × 20 ÷ 100g당 단백질) 로 다시 계산합니다.
     (하림 자연실록 1kg×3 처럼 계산식과 어긋난 값 3,543원 → 709원도 여기서 바로잡힙니다.)
  2) 부위(cut)가 비어 있던 고기 중 **상품명에서 부위가 명확한 것만** 기존 부위 표준 참고치 표를 그대로 붙입니다.
     예) '대패삼겹살' → 삼겹살(단백질 13.9g/지방 33.3g), '닭안심' → 닭안심살(23.0g), '부채살' → 부채살(20.4g)
     우삼겹·뒷고기·우볼살처럼 표준 부위값이 딱 맞지 않는 것은 **추정해서 넣지 않고 비워 둡니다.**
     (화면에서도 함량을 모르면 20g당 가격을 표시하지 않습니다 — 없는 값을 만들지 않는 원칙.)
  3) 단백질 음료·쉐이크는 1병(1회) 단백질과 개당 가격이 있으면 protein20 을 채웁니다.
  4) data/products.json 과 js/products.js(PRODUCTS 배열)를 같은 내용으로 다시 씁니다.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

# 100g당 단백질(g), 지방(g) — 조리 전 생것, 국가표준식품성분표·USDA 부위 표준값 참고치
# (scripts/add_meat_nutrition_20261116.py 와 같은 표를 씁니다)
CUT_NUTRITION = {
    "등심": (19.9, 14.3),
    "채끝": (17.7, 5.7),
    "부채살": (20.4, 6.9),
    "살치살": (18.0, 12.0),
    "갈비살": (18.4, 13.4),
    "삼겹살": (13.9, 33.3),
    "목살": (17.2, 16.4),
    "뒷다리살": (20.9, 5.0),
    "갈매기살": (17.9, 12.2),
    "닭가슴살": (23.0, 1.3),
    "닭안심살": (23.0, 1.5),
    "닭다리살": (18.5, 7.5),
    "숄더랙": (17.5, 15.0),
    "프렌치랙": (17.5, 14.0),
    "훈제오리 슬라이스": (18.0, 20.0),
    "훈제오리 슬라이스(소분)": (18.0, 20.0),
    "생연어(횟감)": (20.0, 13.0),
    "훈제연어": (22.0, 12.0),
    "연어 스테이크(필렛)": (20.0, 13.0),
}

# 상품명에서 부위가 분명한 경우만 (앞에서부터 검사)
NAME_CUT_RULES = [
    ("닭안심", "닭안심살"),
    ("닭가슴살", "닭가슴살"),
    ("대패삼겹", "삼겹살"),
    ("정삼겹", "삼겹살"),
    ("삼겹살", "삼겹살"),
    ("부채살", "부채살"),
]


def cut_from_name(name):
    for key, cut in NAME_CUT_RULES:
        if key in name:
            return cut
    return None


def p20_from_per100g(per100g, protein_per100g):
    if not per100g or not protein_per100g:
        return None
    return round(per100g * 20 / protein_per100g)


def main():
    cat = json.loads(DATA.read_text(encoding="utf-8"))
    filled = []
    recomputed = []
    filled_drinks = []

    for p in cat["products"]:
        part = p.get("part")
        cat_id = p.get("category")

        if part == "meat" and cat_id != "gadget":
            if not p.get("proteinPer100g"):
                cut = cut_from_name(p.get("name", "")) if not p.get("cut") else p.get("cut")
                vals = CUT_NUTRITION.get(cut)
                if vals:
                    prot, fat = vals
                    p["cut"] = p.get("cut") or cut
                    p["proteinPer100g"] = prot
                    p["fatPer100g"] = fat
                    p["nutritionBasis"] = "부위 기준 참고치"
                    p["nutritionNote"] = (
                        "제품 영양성분표가 없는 원물이라 국가표준식품성분표·USDA 부위 표준값 참고치예요"
                    )
                    p["nutritionLabel"] = f"100g당 단백질 ~{prot}g · 지방 ~{fat}g (부위 기준)"
                    filled.append((p["id"], cut, prot))
            calc = p20_from_per100g(p.get("per100g"), p.get("proteinPer100g"))
            if calc:
                if p.get("protein20") != calc:
                    recomputed.append((p["id"], p.get("protein20"), calc))
                    p["protein20"] = calc
                    p["pricePer20gProtein"] = calc

        elif part in ("protein", "shake"):
            if p.get("protein20") is None:
                g = p.get("protein_g_per_bottle")
                each = p.get("eachPrice")
                if g and each:
                    calc = round(each / g * 20)
                    p["protein20"] = calc
                    p["pricePer20gProtein"] = calc
                    filled_drinks.append((p["id"], calc))
            elif p.get("pricePer20gProtein") != p.get("protein20"):
                p["pricePer20gProtein"] = p["protein20"]

    DATA.write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    text = JS.read_text(encoding="utf-8")
    head = text[: text.index("const PRODUCTS = ")]
    JS.write_text(
        head
        + "const PRODUCTS = "
        + json.dumps(cat["products"], ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )

    print(f"부위 참고치 새로 붙인 고기 {len(filled)}개")
    for row in filled:
        print("  +", row)
    print(f"20g당 가격 다시 계산한 상품 {len(recomputed)}개")
    for pid, before, after in recomputed:
        print(f"  * {pid}: {before} → {after}")
    print(f"단백질 음료·쉐이크 20g당 새로 채운 상품 {len(filled_drinks)}개")
    for row in filled_drinks:
        print("  +", row)


if __name__ == "__main__":
    main()
