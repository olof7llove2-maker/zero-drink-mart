#!/usr/bin/env python3
"""data/meat-candidates.json 의 고기·조리기구 27종을 정식 상품 데이터에 합친다.

- js/products.js  : CATEGORIES 에 part(대분류) 정보를 넣고, PARTS 를 추가하고,
                    PRODUCTS 끝에 고기·조리기구 상품을 덧붙인다.
- data/products.json : 같은 내용의 JSON 사본을 다시 만든다.

값을 만들지 않는다. 후보 파일에 있는 값만 옮기고, 단가 표기(100g당/1대)는
per100g·price 로 계산해 문구로만 담는다.

사용
    python3 scripts/merge_meat_products.py            # 합치기(이미 있으면 갱신)
    python3 scripts/merge_meat_products.py --check    # 바뀔 내용만 확인

주의: 이 스크립트의 PARTS 는 2026-11-16 세분화 이전 값이다. 다시 돌리면
세부 분류가 뭉친 예전 구조로 되돌아가므로, 실행 후에는
`python3 scripts/restructure_categories_20261116.py` 를 이어서 돌려야 한다.
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MEAT = ROOT / "data" / "meat-candidates.json"
PRODUCTS_JS = ROOT / "js" / "products.js"
PRODUCTS_JSON = ROOT / "data" / "products.json"

ZERO_CATS = ["cola", "cider", "sparkling", "water", "acv", "ion", "energy", "icetea", "tea", "powder"]
MEAT_CATS = ["beef", "pork", "chicken", "lamb", "duck", "salmon", "gadget"]

CATEGORIES = [
    {"id": "all", "label": "전체", "part": "all"},
    {
        "id": "protein",
        "label": "단백질 음료",
        "part": "protein",
        "note": "병당 단백질(g)과 열량은 쿠팡 상품 페이지에서 2026-11-15 19:51(Asia/Seoul)에 확인한 값이에요. 병당 가격은 박스 가격을 개수로 나눈 값이에요. 정가와 할인율이 확인되지 않은 상품은 판매가만 적어요.",
    },
    {"id": "cola", "label": "제로 콜라", "part": "zero"},
    {"id": "cider", "label": "제로 사이다", "part": "zero"},
    {"id": "sparkling", "label": "탄산수", "part": "zero"},
    {"id": "water", "label": "생수", "part": "zero"},
    {"id": "acv", "label": "애사비", "part": "zero"},
    {"id": "ion", "label": "제로 이온", "part": "zero"},
    {"id": "energy", "label": "제로 에너지", "part": "zero"},
    {"id": "icetea", "label": "제로 아이스티", "part": "zero"},
    {"id": "tea", "label": "무당 차음료", "part": "zero"},
    {
        "id": "powder",
        "label": "분말·티백",
        "part": "zero",
        "note": "가루와 티백은 100g당 가격으로 비교해요. 100ml당 비교에는 넣지 않아요.",
    },
    {"id": "beef", "label": "소고기", "part": "meat"},
    {"id": "pork", "label": "돼지고기", "part": "meat"},
    {"id": "chicken", "label": "닭고기", "part": "meat"},
    {"id": "lamb", "label": "양고기", "part": "meat"},
    {"id": "duck", "label": "오리", "part": "meat"},
    {"id": "salmon", "label": "연어", "part": "meat"},
    {"id": "gadget", "label": "조리기구", "part": "meat"},
]

PARTS = [
    {"id": "all", "label": "전체", "icon": "", "note": ""},
    {
        "id": "zero",
        "label": "제로 음료",
        "icon": "🥤",
        "note": "제로 음료는 분류마다 100ml당 가격이 낮은 순으로 모았어요. 분말·티백은 100g당 가격으로 따로 비교해요.",
        "filters": [
            {"id": "all", "label": "전체", "cats": ZERO_CATS},
            {"id": "fizz", "label": "탄산(콜라/사이다)", "cats": ["cola", "cider"]},
            {"id": "water", "label": "탄산수/생수", "cats": ["sparkling", "water"]},
            {"id": "tea", "label": "차/아이스티", "cats": ["icetea", "tea", "powder"]},
            {"id": "boost", "label": "이온/에너지/애사비", "cats": ["ion", "energy", "acv"]},
        ],
    },
    {
        "id": "protein",
        "label": "단백질 음료",
        "icon": "💪",
        "note": "병당 단백질(g)이 높은 순으로 보여 줘요. 카드마다 병당 단백질과 열량을 같이 적었어요.",
        "filters": [{"id": "all", "label": "전체", "cats": ["protein"]}],
    },
    {
        "id": "meat",
        "label": "식단 고기",
        "icon": "🥩",
        "note": "고기는 100g당 가격과 부위 태그로 비교해요. 가격은 2026-11-16 16:00~17:00(Asia/Seoul)에 쿠팡에서 확인한 값이고, 평점 4.5 이상·리뷰 수백 건 이상 상품만 골랐어요. 조리기구는 중량 비교 대신 개당 가격으로 봐요.",
        "filters": [
            {"id": "all", "label": "전체", "cats": MEAT_CATS},
            {"id": "beef", "label": "소고기", "cats": ["beef"]},
            {"id": "pork", "label": "돼지고기", "cats": ["pork"]},
            {"id": "chicken", "label": "닭고기", "cats": ["chicken"]},
            {"id": "lamb", "label": "양고기", "cats": ["lamb"]},
            {"id": "duck", "label": "오리/연어", "cats": ["duck", "salmon"]},
            {"id": "gadget", "label": "에어프라이어/조리기구", "cats": ["gadget"]},
        ],
    },
]


def weight_label(weight_g) -> str:
    if not weight_g:
        return ""
    if weight_g >= 1000:
        kg = weight_g / 1000
        return f"{kg:g}kg"
    return f"{weight_g:g}g"


def label_from_checked(checked: str) -> str:
    """'2026-11-16 16:10' -> '11/16 16:10 쿠팡 기준'"""
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})", checked or "")
    if not m:
        return "쿠팡 기준"
    return f"{int(m.group(2))}/{int(m.group(3))} {m.group(4)} 쿠팡 기준"


def to_product(src: dict) -> dict:
    cat = src["categoryId"]
    is_gadget = cat == "gadget"
    per100g = src.get("per100g")
    weight = src.get("weightG")
    price = src["price"]

    out = {
        "id": src["id"],
        "part": "meat",
        "category": cat,
        "categoryId": cat,
        "group": src["meatType"],
        "meatType": src["meatType"],
        "cut": src["cut"],
        "cutGroup": src.get("cutGroup"),
        "brand": "" if src.get("brand") == "쿠팡" else src.get("brand", ""),
        "name": src["name"],
        "kind": src["kind"],
        "price": price,
        "listPrice": src.get("originalPrice"),
        "discountPct": src.get("discountRate"),
        "priceCheckedAt": src.get("priceCheckedAt"),
        "priceCheckedLabel": label_from_checked(src.get("priceCheckedAt", "")),
        "platform": "coupang",
        "url": src.get("url"),
        "affiliateUrl": src.get("affiliateUrl"),
        "image": src.get("image"),
        "rating": src.get("rating"),
        "reviewCount": src.get("reviewCount"),
    }
    if src.get("brandNote"):
        out["brandNote"] = src["brandNote"]
    if src.get("note"):
        out["note"] = src["note"]

    if is_gadget:
        out["spec"] = src.get("spec")
        out["unitPrice"] = src.get("priceUnit") or f"1대 {price:,}원"
        out["unitEach"] = src.get("spec") or ""
    else:
        out["weightG"] = weight
        out["per100g"] = per100g
        if per100g is not None:
            out["unitPrice"] = f"100g당 {per100g:,}원"
        note = src.get("note") or ""
        if "×" in note:
            out["unitEach"] = note
        elif weight:
            out["unitEach"] = f"{weight_label(weight)} 1팩"
        else:
            out["unitEach"] = ""
    # 빈 문자열은 넣지 않는다
    return {k: v for k, v in out.items() if v not in ("", None) or k in ("listPrice", "discountPct", "cutGroup")}


def load_js_products(text: str) -> list[dict]:
    start = text.index("const PRODUCTS = [") + len("const PRODUCTS = ")
    end = text.rindex("\n];") + 2  # ']' 까지 포함
    return json.loads(text[start:end])


def dump_items(items: list[dict]) -> str:
    chunks = []
    for item in items:
        body = json.dumps(item, ensure_ascii=False, indent=2)
        chunks.append("\n".join("  " + line for line in body.splitlines()))
    return "[\n" + ",\n".join(chunks) + "\n]"


def replace_const(text: str, name: str, value) -> str:
    start = text.index(f"const {name} = ")
    end = text.index("\n];", start)
    return text[:start] + f"const {name} = {json.dumps(value, ensure_ascii=False, indent=2)}" + text[end + 2:]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    meat_all = json.loads(MEAT.read_text(encoding="utf-8"))
    meat = [to_product(p) for p in meat_all["products"]]

    text = PRODUCTS_JS.read_text(encoding="utf-8")
    products = load_js_products(text)
    base = [p for p in products if p.get("part") != "meat"]
    # 음료에는 part 를 붙인다 (기존 데이터에는 없음)
    for p in base:
        p.setdefault("part", "protein" if p["category"] == "protein" else "zero")
    merged = base + meat

    new = replace_const(text, "CATEGORIES", CATEGORIES)
    new = new.replace(
        "const SORTS = ",
        "const PARTS = " + json.dumps(PARTS, ensure_ascii=False, indent=2) + ";\n\nconst SORTS = ",
        1,
    )
    # SORTS: 평점·리뷰 정렬 추가 (고기 파트에서만 노출)
    sorts = json.loads(re.search(r"const SORTS = (\[[\s\S]*?\n\]);", new).group(1))
    for extra in (
        {"id": "rating", "label": "평점"},
        {"id": "reviews", "label": "리뷰 많은 순"},
    ):
        if not any(s["id"] == extra["id"] for s in sorts):
            sorts.append(extra)
    new = replace_const(new, "SORTS", sorts)

    start = new.index("const PRODUCTS = [") + len("const PRODUCTS = ")
    end = new.rindex("\n];")
    new = new[:start] + dump_items(merged) + new[end + 2:]  # 끝의 '];' 유지

    # SITE.sourceNote 에 고기 확인 시각 추가
    site_note = "쿠팡 검색 판매량순 목록에서 2026-11-15 19:25(Asia/Seoul)에 확인한 값이에요. 토스 상품 가격은 2026-11-16 14:00(Asia/Seoul) 토스쇼핑 카테고리 판매 베스트에서 확인한 값이에요. 고기·조리기구 가격은 2026-11-16 16:00~17:00(Asia/Seoul)에 쿠팡에서 확인한 값이에요."
    new = re.sub(
        r'("sourceNote": ")[^"]*(")',
        lambda m: m.group(1) + site_note + m.group(2),
        new,
        count=1,
    )

    catalog = {
        "site": None,
        "categories": CATEGORIES,
        "parts": PARTS,
        "sorts": sorts,
        "products": merged,
        "containers": None,
        "ingredientFilters": None,
    }
    old_json = json.loads(PRODUCTS_JSON.read_text(encoding="utf-8"))
    catalog["site"] = old_json["site"]
    catalog["containers"] = old_json["containers"]
    catalog["ingredientFilters"] = old_json["ingredientFilters"]
    catalog["site"]["sourceNote"] = site_note

    if args.check:
        print(f"products: {len(products)} -> {len(merged)} (meat {len(meat)})")
        print(f"js change: {len(new) - len(text)} chars")
        return 0

    PRODUCTS_JS.write_text(new, encoding="utf-8")
    PRODUCTS_JSON.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"js/products.js: {len(merged)} products ({len(meat)} meat)")
    print(f"data/products.json: {len(merged)} products")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
