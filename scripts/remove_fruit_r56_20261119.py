#!/usr/bin/env python3
"""r56 — 🍎 과일 카테고리와 제철 과일 5종 제거 (2026-11-19).

재영 님 지시(#32410): "과일 넣어놓으니까 너무 그렇다.. 걍빼자"
r53에서 넣은 `fruit` 파트·세부 분류 5종·상품 5종을 데이터에서 걷어내고,
사이트를 원래의 제로음료·단백질음료·단백질쉐이크·식단고기·간편식 정체성으로 되돌린다.

출력: data/products.json, js/products.js, partners-links.json
사용법: python3 scripts/remove_fruit_r56_20261119.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"
LINKS = ROOT / "partners-links.json"

OLD_TAGLINE = "제로 음료·단백질·식단 고기·간편식·제철 과일 단가 비교"
NEW_TAGLINE = "제로 음료·단백질·식단 고기·간편식 단가 비교"


def is_fruit_product(p):
    return p.get("part") == "fruit" or str(p.get("id", "")).startswith("fruit-")


def main():
    doc = json.loads(DATA.read_text(encoding="utf-8"))

    parts_before = [p["id"] for p in doc["parts"]]
    cats_before = len(doc["categories"])
    prods_before = len(doc["products"])

    doc["parts"] = [p for p in doc["parts"] if p.get("id") != "fruit"]
    doc["categories"] = [c for c in doc["categories"] if c.get("part") != "fruit"]
    doc["products"] = [p for p in doc["products"] if not is_fruit_product(p)]

    if doc["site"].get("tagline") == OLD_TAGLINE:
        doc["site"]["tagline"] = NEW_TAGLINE

    DATA.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # js/products.js 재생성 (다른 스크립트와 같은 방식)
    text = JS.read_text(encoding="utf-8")
    header = text[: text.index("const SITE = ")]

    def block(name, value):
        return "const " + name + " = " + json.dumps(value, ensure_ascii=False, indent=2) + ";\n"

    js = header
    js += block("SITE", doc["site"]) + "\n"
    js += block("CATEGORIES", doc["categories"]) + "\n"
    js += block("PARTS", doc["parts"]) + "\n"
    js += block("SORTS", doc["sorts"]) + "\n"
    js += block("CONTAINERS", doc["containers"]) + "\n"
    js += block("INGREDIENT_FILTERS", doc["ingredientFilters"]) + "\n"
    js += block("PRODUCTS", doc["products"])
    JS.write_text(js, encoding="utf-8")

    # 아버님 파트너스 단축 링크에서 과일 5종 제거
    links = json.loads(LINKS.read_text(encoding="utf-8"))
    removed_links = {k: links.pop(k) for k in list(links) if k.startswith("fruit-")}
    LINKS.write_text(json.dumps(links, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    print(f"parts {parts_before} → {[p['id'] for p in doc['parts']]}")
    print(f"categories {cats_before} → {len(doc['categories'])}")
    print(f"products {prods_before} → {len(doc['products'])}")
    print(f"partner links removed: {sorted(removed_links)}")
    print(f"tagline: {doc['site']['tagline']}")


if __name__ == "__main__":
    main()
