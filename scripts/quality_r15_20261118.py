#!/usr/bin/env python3
"""띠니마트 r15 (2026-11-18) — 데이터 쪽 품질 정리.

1) 1병 단백질 10g 미만 두유·식물성 음료 3종을 `lowsoy`(두유·저단백) 분류로 옮깁니다.
   고단백 음료(10g 이상) 순위와 섞이지 않게 하려는 것입니다. `part`는 `protein` 그대로라
   목적별 결론·검색·소스 필터는 예전처럼 동작합니다.
2) 확인하지 않은 "네이버 최저(가)" 표현을 "네이버 확인가"로 바꿉니다.
   (네이버 쇼핑커넥트로 받은 가격을 확인한 값이라는 뜻만 남깁니다.)
3) `data/products.json` 과 `js/products.js` 를 같은 내용으로 다시 씁니다.

사용:
    python3 scripts/quality_r15_20261118.py            # 적용
    python3 scripts/quality_r15_20261118.py --check    # 바뀔 내용만 확인
"""
import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

LOWSOY_IDS = {
    "amondeubeurijeu-nyuteuripeulreoseu-peurotin-190ml-24gae": "아몬드브리즈 뉴트리플러스 프로틴 (1병 6g)",
    "heoswi-chokolrit-deuringkeu-peurotin-235ml-24gae": "허쉬 초콜릿 드링크 프로틴 (1병 8g)",
    "maeilduyu-99-9-seoritae-24gae-190ml": "매일두유 99.9 서리태 (1병 9g)",
}

LOWSOY_CATEGORY = {
    "id": "lowsoy",
    "label": "두유·저단백",
    "icon": "🥛",
    "part": "protein",
    "note": "1병 단백질 10g 미만 — 고단백 음료 순위와 따로 봐요.",
}

PROTEIN_NOTE = "1병 단백질 10g 이상은 '단백질 음료', 그 미만 두유·식물성은 '두유·저단백'으로 나눠 봐요."

JS_HEADER = (
    "/**\n"
    " * 띠니 상품 데이터 (이 파일 하나만 보면 됩니다).\n"
    " *\n"
    " * 구매 버튼은 각 상품의 affiliateUrl만 사용합니다.\n"
    " * 쿠팡 파트너스 단축 링크가 준비되면 partners-links.json 을 채우고\n"
    " *   python3 scripts/apply_partners_links.py\n"
    " * 를 실행하세요.\n"
    " */\n"
)

NAVER_FIXES = [
    ("네이버 최저가(배송비 포함) 기준", "네이버 확인가(배송비 포함) 기준"),
    ("네이버 최저(일화 공식몰, 무료배송)", "네이버 확인가(일화 공식몰, 무료배송)"),
    ("네이버 최저(페퍼앤솔트, 배송비 100원 포함)", "네이버 확인가(페퍼앤솔트, 배송비 100원 포함)"),
    ("네이버 최저도 16,530원으로 같아요", "네이버 확인가도 16,530원으로 같아요"),
    ("네이버 최저도 같은 가격이에요", "네이버 확인가도 같은 가격이에요"),
    ("네이버 최저는 8,390원이라", "네이버 확인가는 8,390원이라"),
]


def rewrite_strings(node):
    """문자열 값 안의 '네이버 최저' 표현만 바꿉니다. 바꾼 개수를 돌려줍니다."""
    changed = 0
    if isinstance(node, dict):
        for k, v in node.items():
            if isinstance(v, str):
                new = v
                for a, b in NAVER_FIXES:
                    new = new.replace(a, b)
                if new != v:
                    node[k] = new
                    changed += 1
            else:
                changed += rewrite_strings(v)
    elif isinstance(node, list):
        for i, v in enumerate(node):
            if isinstance(v, str):
                new = v
                for a, b in NAVER_FIXES:
                    new = new.replace(a, b)
                if new != v:
                    node[i] = new
                    changed += 1
            else:
                changed += rewrite_strings(v)
    return changed


def dump_js(doc):
    out = [JS_HEADER]
    for name in ("SITE", "CATEGORIES", "PARTS", "SORTS", "CONTAINERS", "INGREDIENT_FILTERS"):
        key = {
            "SITE": "site",
            "CATEGORIES": "categories",
            "PARTS": "parts",
            "SORTS": "sorts",
            "CONTAINERS": "containers",
            "INGREDIENT_FILTERS": "ingredientFilters",
        }[name]
        out.append(f"const {name} = {json.dumps(doc[key], ensure_ascii=False, indent=2)};\n")
    out.append(f"const PRODUCTS = {json.dumps(doc['products'], ensure_ascii=False, indent=2)};\n")
    return "\n".join(out)


def main():
    check = "--check" in sys.argv
    doc = json.loads(DATA.read_text(encoding="utf-8"))

    cats = doc["categories"]
    moved = []
    for p in doc["products"]:
        if p["id"] in LOWSOY_IDS and p.get("category") == "protein":
            if not check:
                p["category"] = "lowsoy"
            moved.append(LOWSOY_IDS[p["id"]])

    if not any(c["id"] == "lowsoy" for c in cats):
        idx = next((i for i, c in enumerate(cats) if c["id"] == "protein"), len(cats) - 1) + 1
        if check:
            print(f"[check] CATEGORIES {idx}번째에 lowsoy 추가 예정")
        else:
            cats.insert(idx, dict(LOWSOY_CATEGORY))
    elif not check:
        for c in cats:
            if c["id"] == "lowsoy":
                c.update(LOWSOY_CATEGORY)

    for part in doc["parts"]:
        if part["id"] != "protein":
            continue
        if not check:
            part["note"] = PROTEIN_NOTE
        filters = part.setdefault("filters", [])
        if not any(f["id"] == "lowsoy" for f in filters):
            if check:
                print("[check] PARTS.protein.filters 에 lowsoy 추가 예정")
            else:
                filters.append({"id": "lowsoy", "label": "두유·저단백", "icon": "🥛", "cats": ["lowsoy"]})

    changed = rewrite_strings(doc)
    print(f"네이버 최저 → 네이버 확인가: {changed}곳")
    print(f"두유·저단백으로 옮김: {len(moved)}종")
    for m in moved:
        print("  -", m)

    if check:
        left = [p["id"] for p in doc["products"] if p.get("category") == "protein" and p["id"] in LOWSOY_IDS]
        print(f"[check] 아직 protein 에 남은 저단백: {left}")
        return

    DATA.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    JS.write_text(dump_js(doc), encoding="utf-8")

    # 동기화 확인 — js 파일의 각 const 블록을 다시 읽어 JSON과 같은지 봅니다
    again = json.loads(DATA.read_text(encoding="utf-8"))
    js_text = JS.read_text(encoding="utf-8")
    names = {
        "SITE": "site",
        "CATEGORIES": "categories",
        "PARTS": "parts",
        "SORTS": "sorts",
        "CONTAINERS": "containers",
        "INGREDIENT_FILTERS": "ingredientFilters",
        "PRODUCTS": "products",
    }
    ok = True
    for name, key in names.items():
        mark = f"const {name} = "
        start = js_text.index(mark) + len(mark)
        rest = js_text[start:]
        nxt = rest.find("const ")
        block = rest if nxt == -1 else rest[:nxt]
        block = block.strip().rstrip(";")
        if json.loads(block) != again[key]:
            print(f"! 동기화 실패: {key}")
            ok = False
    if not ok:
        return
    print("data/products.json ↔ js/products.js 동기화 OK")
    print(f"상품 {len(again['products'])}종 · lowsoy {sum(1 for p in again['products'] if p.get('category') == 'lowsoy')}종")


if __name__ == "__main__":
    main()
