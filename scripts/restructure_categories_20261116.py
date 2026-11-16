"""띠니마트 카테고리 세분화·명료화 (2026-11-16)

- 세부 분류를 뭉치지 않고 하나씩 나눈다 (제로: 콜라·사이다·탄산수·생수·차·이온·에너지·애사비·분말,
  고기: 소·돼지·닭·양·오리·연어·조리기구).
- 단백질 음료는 맛/타입 기준 세부 필터를 붙인다. 상품마다 proteinType
  (soy | choco | fruit | plain) 을 넣고, 필터는 그 값과 병당 단백질(g)로 고른다.
- data/products.json (JSON 사본)과 js/products.js (사이트가 실제로 읽는 파일) 양쪽에 반영한다.

실행: python3 scripts/restructure_categories_20261116.py
"""

import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

ZERO_CATS = ["cola", "cider", "sparkling", "water", "acv", "ion", "energy", "icetea", "tea", "powder"]
MEAT_CATS = ["beef", "pork", "chicken", "lamb", "duck", "salmon", "gadget"]

PARTS = [
    {"id": "all", "label": "전체", "icon": "", "note": ""},
    {
        "id": "zero",
        "label": "제로 음료",
        "icon": "🥤",
        "desc": "100ml당 가격 낮은 순 · 분말·티백은 100g당",
        "note": "제로 음료는 분류마다 100ml당 가격이 낮은 순으로 모았어요. 분말·티백은 100g당 가격으로 따로 비교해요.",
        "filters": [
            {"id": "all", "label": "전체", "cats": ZERO_CATS},
            {"id": "cola", "label": "콜라", "cats": ["cola"]},
            {"id": "cider", "label": "사이다", "cats": ["cider"]},
            {"id": "sparkling", "label": "탄산수", "cats": ["sparkling"]},
            {"id": "water", "label": "생수", "cats": ["water"]},
            {"id": "tea", "label": "차·아이스티", "cats": ["icetea", "tea"]},
            {"id": "ion", "label": "이온", "cats": ["ion"]},
            {"id": "energy", "label": "에너지", "cats": ["energy"]},
            {"id": "acv", "label": "애사비", "cats": ["acv"]},
            {"id": "powder", "label": "분말", "cats": ["powder"]},
        ],
    },
    {
        "id": "protein",
        "label": "단백질 음료",
        "icon": "💪",
        "desc": "병당 단백질(g) 높은 순 · 병당 단백질·열량 함께 표시",
        "note": "병당 단백질(g)이 높은 순으로 보여 줘요. 카드마다 병당 단백질과 열량을 같이 적었어요.",
        "filters": [
            {"id": "all", "label": "전체", "cats": ["protein"]},
            {
                "id": "high",
                "label": "고단백 20g+",
                "cats": ["protein"],
                "proteinMin": 20,
                "note": "병당 단백질 20g 이상 상품만 모았어요. 단백질(g)은 제품 표기 기준이에요.",
            },
            {"id": "soy", "label": "두유·식물성", "cats": ["protein"], "types": ["soy"], "note": "두유·아몬드 등 식물성 음료예요."},
            {"id": "choco", "label": "초코·커피", "cats": ["protein"], "types": ["choco"], "note": "초코·초콜릿·커피·모카 맛이에요."},
            {"id": "fruit", "label": "과일맛", "cats": ["protein"], "types": ["fruit"], "note": "딸기·바나나 등 과일 맛이에요."},
            {"id": "plain", "label": "플레인·고소한", "cats": ["protein"], "types": ["plain"], "note": "플레인·고소한·오리지널 타입이에요."},
        ],
    },
    {
        "id": "meat",
        "label": "식단 고기·조리",
        "icon": "🥩",
        "desc": "100g당 가격 낮은 순 · 부위 태그 · 조리기구는 개당 가격",
        "note": "고기는 100g당 가격과 부위 태그로 비교해요. 가격은 2026-11-16 16:00~17:00(Asia/Seoul)에 쿠팡에서 확인한 값이고, 평점 4.5 이상·리뷰 수백 건 이상 상품만 골랐어요. 조리기구는 중량 비교 대신 개당 가격으로 봐요.",
        "filters": [
            {"id": "all", "label": "전체", "cats": MEAT_CATS},
            {"id": "beef", "label": "소고기", "cats": ["beef"]},
            {"id": "pork", "label": "돼지고기", "cats": ["pork"]},
            {"id": "chicken", "label": "닭고기", "cats": ["chicken"]},
            {"id": "lamb", "label": "양고기", "cats": ["lamb"]},
            {"id": "duck", "label": "오리고기", "cats": ["duck"]},
            {"id": "salmon", "label": "연어", "cats": ["salmon"]},
            {"id": "gadget", "label": "에어프라이어·조리기구", "cats": ["gadget"]},
        ],
    },
]

# 단백질 음료 24종의 맛·타입 (상품명·맛 표기를 직접 보고 하나씩 지정)
PROTEIN_TYPE = {
    # 두유·식물성
    "maeilduyu-godanbaek-geomeunkong-190ml-24gae": "soy",
    "maeilduyu-godanbaek-peulrein-duyu-190ml-24gae": "soy",
    "maeilduyu-99-9-seoritae-24gae-190ml": "soy",
    "amondeubeurijeu-nyuteuripeulreoseu-peurotin-190ml-24gae": "soy",
    "matitneunduyugt-godanbaek-duyu-190ml-24gae": "soy",
    "yeonseduyu-godanbaek-geomeunkong-aen-gokalsyum-jeodang-190ml-32gae": "soy",
    "bejimil-godanbaekduyu-geomeunkong-190ml-32gae": "soy",
    "yeonseduyu-godanbaek-pro-peulrein-240ml-32gae": "soy",
    # 초코·커피
    "deodanbaek-deuringkeu-choko-250ml-18gae": "choco",
    "deodanbaek-deuringkeu-keopi-a-250ml-18gae": "choco",
    "teikeupit-maekseu-chokomat-peurotin-250ml-24gae": "choco",
    "selrekseu-peuropit-moka-chokolrit-250ml-18gae": "choco",
    "dakteoyu-peuro-danbaekjil-40g-deuringkeu-choko-350ml-6gae": "choco",
    "deodanbaek-40g-gohamryang-deuringkeu-deobeulchoko-350ml-20gae": "choco",
    "deodanbaek-deuringkeu-dakeuchoko-330ml-12gae": "choco",
    "heoswi-chokolrit-deuringkeu-peurotin-235ml-24gae": "choco",
    "maipeurotin-deuringkeu-sigeunicheo-chokolrit-340ml-24gae": "choco",
    # 과일맛
    "deodanbaek-deuringkeu-ttalgi-250ml-18gae": "fruit",
    "dakteoyu-danbaekjildeuringkeu-ttalgi-40g-350ml-6gae": "fruit",
    "keeowel-baelreonseun-godanbaek-bananamat-200ml-60gae": "fruit",
    "binggeure-yopeulre-peurotin-deuringkeu-ttalgibanana-210ml-12gae": "fruit",
    # 플레인·고소한
    "nyukeeo-olpeurotin-gosohanmat-245ml-24gae": "plain",
    "haimyun-peurotin-baelreonseu-aektibeu-orijineol-250ml-18gae": "plain",
    "maimil-nyupeurotin-deuringkeu-orijineol-190ml-30gae": "plain",
}


def replace_const(text: str, name: str, value) -> str:
    """js/products.js 의 `const NAME = [...];` 블록을 새 값으로 바꾼다."""
    start = text.index(f"const {name} = ")
    bracket = text.index("[", start)
    depth = 0
    for i in range(bracket, len(text)):
        if text[i] == "[":
            depth += 1
        elif text[i] == "]":
            depth -= 1
            if depth == 0:
                end = i + 1
                break
    body = json.dumps(value, ensure_ascii=False, indent=2)
    return text[:bracket] + body + text[end:]


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    products = data["products"]

    # 1) 상품에 proteinType 넣기 (flavor 바로 뒤)
    tagged = 0
    new_products = []
    for p in products:
        if p.get("category") == "protein":
            pid = p["id"]
            if pid not in PROTEIN_TYPE:
                raise SystemExit(f"proteinType 지정이 빠진 상품: {pid}")
            rebuilt = {}
            for k, v in p.items():
                if k == "proteinType":
                    continue
                rebuilt[k] = v
                if k == "flavor":
                    rebuilt["proteinType"] = PROTEIN_TYPE[pid]
            if "proteinType" not in rebuilt:  # flavor 가 없는 경우
                rebuilt["proteinType"] = PROTEIN_TYPE[pid]
            if p.get("proteinType") != PROTEIN_TYPE[pid]:
                tagged += 1
            new_products.append(rebuilt)
        else:
            new_products.append(p)

    missing = [p["id"] for p in new_products if p.get("category") == "protein" and not p.get("proteinType")]
    if missing:
        raise SystemExit(f"proteinType 누락: {missing}")

    data["products"] = new_products
    data["parts"] = PARTS
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # 2) js/products.js 갱신
    js = JS.read_text(encoding="utf-8")
    js = replace_const(js, "PARTS", PARTS)

    for pid, ptype in PROTEIN_TYPE.items():
        marker = f'"id": "{pid}",'
        idx = js.index(marker)
        end = js.index("\n  },", idx)
        block = js[idx:end]
        # 이미 들어 있던 값은 지우고 다시 넣는다 (중복 방지)
        block = re.sub(r'\n\s*"proteinType": "[^"]*",', "", block)
        m = re.search(r'\n\s*"flavor": "[^"]*",', block)
        if not m:
            raise SystemExit(f"flavor 를 찾지 못한 상품: {pid}")
        block = block[: m.end()] + f'\n    "proteinType": "{ptype}",' + block[m.end() :]
        js = js[:idx] + block + js[end:]

    JS.write_text(js, encoding="utf-8")

    # 3) 확인
    by_type = {}
    for p in new_products:
        if p.get("category") == "protein":
            by_type[p["proteinType"]] = by_type.get(p["proteinType"], 0) + 1
    high = [p["id"] for p in new_products if p.get("category") == "protein" and (p.get("protein_g_per_bottle") or 0) >= 20]
    print(f"proteinType 새로 넣음: {tagged}건")
    print("타입별:", by_type)
    print(f"고단백 20g+: {len(high)}건 (단백질 g 표기 없는 상품은 제외)")
    print("parts 필터 수:", {p["id"]: len(p.get("filters", [])) for p in PARTS})


if __name__ == "__main__":
    main()
