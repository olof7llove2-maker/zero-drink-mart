#!/usr/bin/env python3
"""data/meat-airfryer-candidates.json 의 에어프라이어 식단 고기 13종(소 3·돼지 5·닭 5)을 합친다.

- js/products.js  : PRODUCTS 끝에 13종을 덧붙인다.
- data/products.json : 같은 내용의 JSON 사본을 다시 만든다.
- SITE.sourceNote : 고기 확인 시각(16:00~23:55)을 반영한다.

값을 만들지 않는다. 후보 파일에 있는 값만 옮기고, 단가 표기(100g당)·영양 참고치
문구는 후보 파일의 weightG·per100g·proteinPer100g·fatPer100g 로 계산해 문구로만 담는다.

airfryerTip 은 카드에 한 줄로 들어가는 짧은 표기(예: "에프 200℃ 6분→뒤집어 4분")이고,
후보 파일의 원문(레스팅·주의사항까지 담은 문장)은 airfryerTipNote 에 그대로 보존한다.
짧은 표기는 아래 SHORT_TIPS 에서 상품별로 옮겨 적었다(원문을 줄인 것이고 새 조리법을 만들지 않는다).

사용
    python3 scripts/merge_meat_airfryer_20261117.py --check   # 바뀔 내용만 확인
    python3 scripts/merge_meat_airfryer_20261117.py           # 합치기
"""
from __future__ import annotations

import argparse
import json
import re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CANDIDATES = ROOT / "data" / "meat-airfryer-candidates.json"
PRODUCTS_JS = ROOT / "js" / "products.js"
PRODUCTS_JSON = ROOT / "data" / "products.json"

SOURCE_NOTE_OLD = (
    "고기·조리기구 가격은 2026-11-16 16:00~17:00(Asia/Seoul)에 쿠팡에서 확인한 값이에요."
)
SOURCE_NOTE_NEW = (
    "고기·조리기구 가격은 2026-11-16 16:00~23:55(Asia/Seoul)에 쿠팡에서 확인한 값이에요."
)

# 후보 파일 airfryerTip 원문을 카드 한 줄로 줄인 표기. 원문의 온도·시간·뒤집는 시점만 남겼다.
SHORT_TIPS = {
    "meat-beef-us-prime-chuckeye-steak-1kg": "에프 200℃ 6분→뒤집어 4분",
    "meat-beef-muscleggo-udunsal-steak-10x150g": "에프 190℃ 8분→뒤집어 5분",
    "meat-beef-gomgom-au-chimasal-gui-600g": "에프 200℃ 5분→뒤집어 3분",
    "meat-pork-dongwon-hangjeongsal-800g": "에프 190℃ 12분·중간 뒤집기",
    "meat-pork-tongsamgyeop-camping-2kg": "160℃ 25분→200℃ 10분",
    "meat-pork-mokuchon-profork-apdari-500g": "에프 190℃ 10분→뒤집어 5분",
    "meat-pork-deungsim-slice-diet-10x200g": "에프 200℃ 8분·4분에 뒤집기",
    "meat-pork-ansim-gui-diet-10x200g": "에프 190℃ 9분→뒤집어 5분",
    "meat-chicken-k1-sai-jeongyuk-1kg": "에프 190℃ 12분·중간 뒤집기",
    "meat-chicken-k1-bukchae-drumstick-1kg": "에프 200℃ 18분·9분에 뒤집기",
    "meat-chicken-maniker-wing-bong-1kg": "에프 200℃ 15분·한 켜로",
    "meat-chicken-deohadak-steak-original-30x90g": "해동 후 에프 180℃ 8분",
    "meat-chicken-hangang-iqf-cube-1kg": "얼린 채 에프 200℃ 10분",
}

# 소분 구성 표기(중량 ÷ 팩 수는 후보 파일 note 에 적힌 값).
UNIT_EACH = {
    "meat-beef-muscleggo-udunsal-steak-10x150g": "150g × 10팩",
    "meat-pork-deungsim-slice-diet-10x200g": "200g × 10팩",
    "meat-pork-ansim-gui-diet-10x200g": "200g × 10팩",
    "meat-chicken-deohadak-steak-original-30x90g": "90g × 30팩",
    "meat-pork-tongsamgyeop-camping-2kg": "2kg 1덩이",
    "meat-chicken-k1-bukchae-drumstick-1kg": "1kg 1세트",
}

NUTRITION_RAW_NOTE = "제품 영양성분표가 없는 원물이라 국가표준식품성분표·USDA 부위 표준값 참고치예요"
NUTRITION_PROCESSED_NOTE = "가공·양념 제품이라 소스 포함 대략치예요"
PROCESSED_IDS = {"meat-chicken-deohadak-steak-original-30x90g"}

NO_BRAND = {"쿠팡", "브랜드 표기 없음", ""}


def weight_label(weight_g) -> str:
    if not weight_g:
        return ""
    if weight_g >= 1000:
        return f"{weight_g / 1000:g}kg"
    return f"{weight_g:g}g"


def label_from_checked(checked: str) -> str:
    m = re.match(r"^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}:\d{2})", checked or "")
    if not m:
        return "쿠팡 기준"
    return f"{int(m.group(2))}/{int(m.group(3))} {m.group(4)} 쿠팡 기준"


def to_product(src: dict) -> dict:
    cat = src["categoryId"]
    price = src["price"]
    weight = src.get("weightG")
    per100g = src.get("per100g")
    protein = src.get("proteinPer100g")
    fat = src.get("fatPer100g")
    processed = src["id"] in PROCESSED_IDS

    out: dict = {
        "id": src["id"],
        "part": "meat",
        "category": cat,
        "categoryId": cat,
        "group": src["meatType"],
        "meatType": src["meatType"],
        "cut": src["cut"],
        "cutGroup": src.get("cutGroup"),
        "brand": "" if src.get("brand") in NO_BRAND else src.get("brand", ""),
        "name": src["name"],
        "kind": src["kind"],
        "price": price,
        "listPrice": src.get("listPrice"),
        "discountPct": src.get("discountPct"),
        "priceCheckedAt": src.get("priceCheckedAt"),
        "priceCheckedLabel": label_from_checked(src.get("priceCheckedAt", "")),
        "platform": "coupang",
        "url": src["url"],
        # 제휴 단축 링크가 아직 없어 일반 상품 URL 을 구매 링크로 쓴다(기존 조리기구 상품과 같은 방식).
        "affiliateUrl": src["url"],
        "image": src["image"],
        "rating": src.get("rating"),
        "reviewCount": src.get("reviewCount"),
        "weightG": weight,
        "per100g": per100g,
        "unitPrice": f"100g당 {per100g:,}원" if per100g is not None else "",
        "unitEach": UNIT_EACH.get(src["id"]) or (f"{weight_label(weight)} 1팩" if weight else ""),
        "proteinPer100g": protein,
        "fatPer100g": fat,
        "nutritionBasis": "제품 표기 대략치" if processed else "부위 기준 참고치",
        "nutritionNote": NUTRITION_PROCESSED_NOTE if processed else NUTRITION_RAW_NOTE,
        "nutritionLabel": (
            f"100g당 단백질 ~{protein:.1f}g · 지방 ~{fat:.1f}g "
            f"({'소스 포함 대략치' if processed else '부위 기준'})"
        ),
    }
    if src["id"] in SHORT_TIPS:
        out["airfryerTip"] = SHORT_TIPS[src["id"]]
    if src.get("airfryerTip"):
        out["airfryerTipNote"] = src["airfryerTip"]
    for key in ("brandNote", "originNote", "seller", "verifiedOnPageAt", "note"):
        if src.get(key):
            out[key] = src[key]
    return out


def load_js_products(text: str) -> tuple[list[dict], int, int]:
    s = text.index("const PRODUCTS = ") + len("const PRODUCTS = ")
    e = text.index("\n];", s) + 2
    return json.loads(text[s:e]), s, e


def dump_items(items: list[dict]) -> str:
    chunks = []
    for item in items:
        body = json.dumps(item, ensure_ascii=False, indent=2)
        chunks.append("\n".join("  " + line for line in body.splitlines()))
    return "[\n" + ",\n".join(chunks) + "\n]"


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--check", action="store_true")
    args = ap.parse_args()

    js_text = PRODUCTS_JS.read_text(encoding="utf-8")
    existing, s, e = load_js_products(js_text)
    have = {p["id"] for p in existing}

    candidates = json.loads(CANDIDATES.read_text(encoding="utf-8"))["products"]
    new_items = [to_product(src) for src in candidates if src["id"] not in have]
    dupes = [src["id"] for src in candidates if src["id"] in have]

    counts = {}
    for p in existing + new_items:
        if p.get("part") == "meat":
            counts[p.get("categoryId")] = counts.get(p.get("categoryId"), 0) + 1

    print(f"기존 {len(existing)}종 + 신규 {len(new_items)}종 = {len(existing) + len(new_items)}종")
    if dupes:
        print(f"이미 있어 건너뛴 상품 {len(dupes)}건: {', '.join(dupes)}")
    print("식단 고기·조리:", ", ".join(f"{k} {v}" for k, v in sorted(counts.items())))
    for p in new_items:
        print(f"  + [{p['categoryId']}] {p['name']} · 100g당 {p['per100g']:,}원 · {p.get('airfryerTip', '')}")

    if args.check:
        return 0

    if new_items:
        merged = existing + new_items
        js_new = js_text[:s] + dump_items(merged) + js_text[e:]
    else:
        js_new = js_text
    if SOURCE_NOTE_OLD in js_new:
        js_new = js_new.replace(SOURCE_NOTE_OLD, SOURCE_NOTE_NEW)
    PRODUCTS_JS.write_text(js_new, encoding="utf-8")

    data = json.loads(PRODUCTS_JSON.read_text(encoding="utf-8"))
    have_json = {p["id"] for p in data["products"]}
    data["products"].extend([p for p in new_items if p["id"] not in have_json])
    if SOURCE_NOTE_OLD in data["site"].get("sourceNote", ""):
        data["site"]["sourceNote"] = data["site"]["sourceNote"].replace(SOURCE_NOTE_OLD, SOURCE_NOTE_NEW)
    PRODUCTS_JSON.write_text(
        json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8"
    )
    print("js/products.js · data/products.json 갱신 완료")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
