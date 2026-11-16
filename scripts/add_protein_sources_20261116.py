#!/usr/bin/env python3
"""단백질 원료 배지·원료 필터 데이터 (확인된 제품만).

확인 출처
- 셀렉스 프로핏 모카 초콜릿: 매일유업 제품 페이지 원재료(분리유단백·분리대두단백), 단백질 20g·105kcal·당류 0g
- 더단백 드링크 초코 / 커피: 빙그레 원재료(분리우유단백분말·농축우유단백분말), 단백질 20g·105kcal/110kcal·당류 0.8/0.9g
- 칼로바이·플라이밀·밀잇 쉐이크: 제품 표기(단백질 원료) 기준
확인되지 않은 제품은 원료 배지를 비워 둔다(틀린 표기 금지).
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

SOURCES = {
    # 액상 단백질 음료
    "selrekseu-peuropit-moka-chokolrit-250ml-18gae": {
        "proteinSourceKey": "blend",
        "proteinSource": "유청+대두 혼합단백",
        "proteinSourceDetail": "분리유단백·ISP",
        "sugarPerServing": 0,
    },
    "deodanbaek-deuringkeu-choko-250ml-18gae": {
        "proteinSourceKey": "milk",
        "proteinSource": "우유단백(MPC)",
        "proteinSourceDetail": "분리·농축우유단백",
        "sugarPerServing": 0.8,
    },
    "deodanbaek-deuringkeu-keopi-a-250ml-18gae": {
        "proteinSourceKey": "milk",
        "proteinSource": "우유단백(MPC)",
        "proteinSourceDetail": "분리·농축우유단백",
        "sugarPerServing": 0.9,
    },
    # 쉐이크
    "kalobai-peopekteu-pawosweikeu-beulrende-choko-1-8kg": {"proteinSourceKey": "blend"},
    "kalobai-peopekteu-pawosweikeu-soi-peurotin-1-8kg": {"proteinSourceKey": "soy"},
    "peulraimil-rieolchoko-630g": {"proteinSourceKey": "blend"},
    "peulraimil-beuraun-630g": {"proteinSourceKey": "blend"},
    "mirit-danbaekjil-sweikeu-piseutacio-560g": {"proteinSourceKey": "blend"},
}

SOURCE_FILTERS = [
    {
        "id": "src-milk",
        "label": "유청·우유단백",
        "icon": "🥛",
        "cats": ["protein", "shake"],
        "sources": ["milk", "whey"],
        "note": "우유·유청에서 뽑은 단백질(WPI·WPC·MPC)이 주원료인 상품이에요.",
    },
    {
        "id": "src-soy",
        "label": "대두단백(ISP)",
        "icon": "🌱",
        "cats": ["protein", "shake"],
        "sources": ["soy"],
        "note": "분리대두단백(ISP)이 주원료인 식물성 상품이에요.",
    },
    {
        "id": "src-blend",
        "label": "혼합단백",
        "icon": "🧬",
        "cats": ["protein", "shake"],
        "sources": ["blend"],
        "note": "유청·우유단백과 대두단백을 섞은 상품이에요.",
    },
]


def main():
    cat = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in cat["products"]}
    for pid, extra in SOURCES.items():
        if pid in by_id:
            by_id[pid].update(extra)

    for part in cat["parts"]:
        if part.get("id") != "protein":
            continue
        filters = part.setdefault("filters", [])
        have = {f["id"] for f in filters}
        for f in SOURCE_FILTERS:
            if f["id"] not in have:
                filters.append(f)

    DATA.write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    text = JS.read_text(encoding="utf-8")
    head = text[: text.index("const PRODUCTS = ")]
    # PARTS 도 바뀌었으므로 PARTS 블록을 다시 만든다
    pre = text[: text.index("const PARTS = ")]
    post = text[text.index("const SORTS = ") :]
    js = (
        pre
        + "const PARTS = "
        + json.dumps(cat["parts"], ensure_ascii=False, indent=2)
        + ";\n\n"
        + post[: post.index("const PRODUCTS = ")]
        + "const PRODUCTS = "
        + json.dumps(cat["products"], ensure_ascii=False, indent=2)
        + ";\n"
    )
    JS.write_text(js, encoding="utf-8")
    print("원료 배지·필터 반영")


if __name__ == "__main__":
    main()
