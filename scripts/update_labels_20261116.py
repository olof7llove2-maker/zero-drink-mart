#!/usr/bin/env python3
"""띠니마트 2026-11-16 개선: 업데이트 주기·마지막 업데이트 표시용 데이터 + 세부 카테고리 이름 다듬기

- SITE 에 updatedAt / updateCycle / updateCycleNote 를 넣는다.
- CATEGORIES·PARTS 세부 분류 이름을 방문자가 바로 알아보게 풀네임으로 바꾸고,
  분류마다 이모지(icon)와 한 줄 설명(note)을 붙인다.
- js/products.js 의 중복 `const PARTS`(예전 뭉친 필터 사본) 를 지운다.
  이 중복 때문에 브라우저에서 products.js 가 SyntaxError 로 죽고 data/products.json 으로
  넘어가고 있었다. 지운 뒤에는 두 파일 내용이 같아진다.
- data/products.json 과 js/products.js 양쪽에 같은 값을 쓴다.

실행: python3 scripts/update_labels_20261116.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

SITE_EXTRA = {
    "updatedAt": "2026-11-16",
    "updateCycle": "매일 오전 9시 가격 자동 업데이트",
    "updateCycleNote": "쿠팡·토스 가격을 다시 확인해요",
}

CAT_ICON = {
    "protein": "💪",
    "cola": "🥤",
    "cider": "🍋",
    "sparkling": "💧",
    "water": "🚰",
    "acv": "🍎",
    "ion": "⚡",
    "energy": "🔋",
    "icetea": "🧊",
    "tea": "🌾",
    "powder": "🥄",
    "beef": "🥩",
    "pork": "🐖",
    "chicken": "🍗",
    "lamb": "🐑",
    "duck": "🦆",
    "salmon": "🐟",
    "gadget": "🍳",
}

CAT_LABEL = {
    "acv": "애사비(사과식초)",
    "ion": "제로 이온음료",
    "energy": "제로 에너지음료",
    "powder": "분말·티백",
}

ZERO_FILTERS = [
    {"id": "all", "label": "전체"},
    {
        "id": "cola",
        "label": "콜라",
        "icon": "🥤",
        "note": "콜라 계열 제로 탄산음료예요.",
    },
    {
        "id": "cider",
        "label": "사이다",
        "icon": "🍋",
        "note": "사이다 계열 제로 탄산음료예요.",
    },
    {
        "id": "sparkling",
        "label": "탄산수",
        "icon": "💧",
        "note": "플레인·과일향 탄산수예요.",
    },
    {"id": "water", "label": "생수", "icon": "🚰", "note": "무라벨 생수예요."},
    {
        "id": "tea",
        "label": "차·아이스티",
        "icon": "🍵",
        "note": "무당 차음료와 제로 아이스티를 함께 봐요.",
    },
    {
        "id": "ion",
        "label": "이온음료",
        "icon": "⚡",
        "note": "이온음료·스포츠음료예요.",
    },
    {"id": "energy", "label": "에너지음료", "icon": "🔋", "note": "에너지드링크예요."},
    {
        "id": "acv",
        "label": "애사비(사과식초)",
        "icon": "🍎",
        "note": "사과식초(애사비)를 넣은 탄산음료예요.",
    },
    {
        "id": "powder",
        "label": "분말·티백",
        "icon": "🥄",
        "note": "가루·티백은 100ml가 아니라 100g당 가격으로 비교해요.",
    },
]

ZERO_FILTER_CATS = {
    "all": ["cola", "cider", "sparkling", "water", "acv", "ion", "energy", "icetea", "tea", "powder"],
    "cola": ["cola"],
    "cider": ["cider"],
    "sparkling": ["sparkling"],
    "water": ["water"],
    "tea": ["icetea", "tea"],
    "ion": ["ion"],
    "energy": ["energy"],
    "acv": ["acv"],
    "powder": ["powder"],
}

PROTEIN_FILTERS = [
    {"id": "all", "label": "전체", "cats": ["protein"]},
    {
        "id": "high",
        "label": "고단백(20g+)",
        "icon": "💪",
        "cats": ["protein"],
        "proteinMin": 20,
        "note": "병당 단백질 20g 이상 상품만 모았어요. 단백질(g)은 제품 표기 기준이에요.",
    },
    {
        "id": "soy",
        "label": "두유·식물성",
        "icon": "🌱",
        "cats": ["protein"],
        "types": ["soy"],
        "note": "두유·아몬드 등 식물성 음료예요.",
    },
    {
        "id": "choco",
        "label": "초코·커피맛",
        "icon": "🍫",
        "cats": ["protein"],
        "types": ["choco"],
        "note": "초코·초콜릿·커피·모카 맛이에요.",
    },
    {
        "id": "fruit",
        "label": "과일맛(딸기·바나나)",
        "icon": "🍓",
        "cats": ["protein"],
        "types": ["fruit"],
        "note": "딸기·바나나 등 과일 맛이에요.",
    },
    {
        "id": "plain",
        "label": "플레인·고소한맛",
        "icon": "🥛",
        "cats": ["protein"],
        "types": ["plain"],
        "note": "플레인·고소한·오리지널 타입이에요.",
    },
]


def zero_filters():
    out = []
    for f in ZERO_FILTERS:
        item = dict(f)
        item["cats"] = ZERO_FILTER_CATS[item["id"]]
        if item["id"] != "all":
            item["note"] = f.get("note", "")
        out.append(item)
    return out


def update_parts(parts):
    for part in parts:
        if part["id"] == "zero":
            part["filters"] = zero_filters()
            part["desc"] = "100ml당 가격 낮은 순 · 분말·티백은 100g당"
        elif part["id"] == "protein":
            part["filters"] = [dict(f) for f in PROTEIN_FILTERS]
            part["desc"] = "병당 단백질(g) 높은 순 · 맛·타입으로 골라 보기"
    return parts


def update_categories(cats):
    for c in cats:
        cid = c["id"]
        if cid in CAT_LABEL:
            c["label"] = CAT_LABEL[cid]
        if cid in CAT_ICON:
            items = list(c.items())
            # label 바로 뒤에 icon 을 넣어 읽기 순서를 유지한다
            rebuilt = {}
            for k, v in items:
                if k == "icon":
                    continue
                rebuilt[k] = v
                if k == "label":
                    rebuilt["icon"] = CAT_ICON[cid]
            c.clear()
            c.update(rebuilt)
    return cats


def update_site(site):
    for k, v in SITE_EXTRA.items():
        site[k] = v
    return site


def replace_const(text, name, value):
    """`const NAME = ...;` 블록(배열·객체 모두)을 새 값으로 바꾼다 (첫 번째 것)."""
    m = re.search(rf"const {name}\s*=\s*", text)
    if not m:
        raise SystemExit(f"{name} 선언을 찾지 못했습니다")
    start = m.end()
    open_ch = text[start]
    close_ch = {"[": "]", "{": "}"}.get(open_ch)
    if close_ch is None:
        raise SystemExit(f"{name} 값이 배열·객체가 아닙니다: {open_ch!r}")
    depth = 0
    end = None
    for i in range(start, len(text)):
        c = text[i]
        if c == open_ch:
            depth += 1
        elif c == close_ch:
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end is None:
        raise SystemExit(f"{name} 블록 끝을 찾지 못했습니다")
    body = json.dumps(value, ensure_ascii=False, indent=2)
    return text[:start] + body + text[end:]


def drop_duplicate_parts(text):
    """두 번째 `const PARTS` 블록(예전 사본)을 통째로 지운다."""
    spots = [m.start() for m in re.finditer(r"const PARTS\s*=", text)]
    if len(spots) < 2:
        return text, 0
    start = spots[1]
    bracket = text.index("[", start)
    depth = 0
    end = None
    for i in range(bracket, len(text)):
        if text[i] == "[":
            depth += 1
        elif text[i] == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    if end is None:
        raise SystemExit("중복 PARTS 블록 끝을 찾지 못했습니다")
    m = re.compile(r";\s*\n\s*").match(text, end)
    if m:
        end = m.end()
    return text[:start] + text[end:], 1


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    data["site"] = update_site(data["site"])
    data["categories"] = update_categories(data["categories"])
    data["parts"] = update_parts(data["parts"])
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    js = JS.read_text(encoding="utf-8")
    js, dropped = drop_duplicate_parts(js)
    js = replace_const(js, "SITE", data["site"])
    js = replace_const(js, "CATEGORIES", data["categories"])
    js = replace_const(js, "PARTS", data["parts"])
    JS.write_text(js, encoding="utf-8")

    print(f"중복 PARTS 블록 제거: {dropped}개")
    print("PARTS 선언 수:", len(re.findall(r"const PARTS\s*=", js)))
    for name in ("SITE", "CATEGORIES", "PARTS", "SORTS", "CONTAINERS", "INGREDIENT_FILTERS", "PRODUCTS"):
        print(f"const {name} 선언 수:", len(re.findall(rf"const {name}\s*=", js)))
    print("세부 분류:")
    for part in data["parts"]:
        if part.get("filters"):
            print(" ", part["id"], [f["label"] for f in part["filters"]])


if __name__ == "__main__":
    main()
