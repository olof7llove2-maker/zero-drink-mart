#!/usr/bin/env python3
"""식육·연어 상품에 100g당 단백질·지방 참고치를 붙인다.

- 제품 영양성분표가 없는 원물 정육이라, 국가표준식품성분표/USDA 부위 표준값을
  참고치로 적고 화면에서도 '부위 기준' 임을 함께 표시한다.
- js/products.js 는 data/products.json 에서 다시 만든다.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

# 100g당 단백질(g), 지방(g) — 조리 전 생것, 부위 표준값 참고치
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


def main():
    cat = json.loads(DATA.read_text(encoding="utf-8"))
    n = 0
    for p in cat["products"]:
        if p.get("part") != "meat" or p.get("category") == "gadget":
            continue
        cut = p.get("cut")
        vals = CUT_NUTRITION.get(cut)
        if not vals:
            print("값 없음:", cut, p["id"])
            continue
        prot, fat = vals
        p["proteinPer100g"] = prot
        p["fatPer100g"] = fat
        p["nutritionBasis"] = "부위 기준 참고치"
        p["nutritionNote"] = (
            "제품 영양성분표가 없는 원물이라 국가표준식품성분표·USDA 부위 표준값 참고치예요"
        )
        p["nutritionLabel"] = f"100g당 단백질 ~{prot}g · 지방 ~{fat}g (부위 기준)"
        n += 1

    DATA.write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # js 재생성 (products.js 안의 PRODUCTS 배열만 교체)
    text = JS.read_text(encoding="utf-8")
    head = text[: text.index("const PRODUCTS = ")]
    JS.write_text(
        head
        + "const PRODUCTS = "
        + json.dumps(cat["products"], ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    print(f"영양 참고치 {n}건 반영")


if __name__ == "__main__":
    main()
