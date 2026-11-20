#!/usr/bin/env python3
"""2026-11-20 09:00 정기 가격 점검 반영 (r61).

쿠팡 상품 페이지를 직접 열어 확인한 값만 반영한다(아버님 계정 로그인 세션).

- 초정탄산수 190ml 30개: 10,900 → 11,900 (+1,000, +9.2%)
- 아몬드브리즈 뉴트리플러스 프로틴 190ml 24개: 17,490 → 17,450 (-40)
- 값이 그대로인 상품은 확인 시각만 2026-11-20 09:35로 올린다.

출력: data/products.json, js/products.js
사용법: python3 scripts/update_prices_20261120_0900.py
"""
import importlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

U = importlib.import_module("update_prices_20261118")
DATA = U.DATA
JS = U.JS

TS = "2026-11-20 09:35"

CHANGES = {
    "chojeongtansansu-190ml-30gae": 11900,
    "amondeubeurijeu-nyuteuripeulreoseu-peurotin-190ml-24gae": 17450,
}

# 상품 페이지를 직접 열어 값이 그대로임을 확인한 상품
CHECKED = [
    "keulrup-aesabisoda-orijineol-tansaneumryo-500ml-12gae",  # 14,000 (정가 36,000·61%)
    "teurebi-peulrein-190ml-30gae",                            # 9,900
    "tamsaseupakeulring-peulrein-murabel-500ml-20gae",         # 8,790 (정가 13,600·35%)
]

# 다른 상품 페이지의 '함께 비교하면 좋을 상품' 목록에서 이름·수량·가격이 정확히 일치하는 것을 본 상품
CHECKED_VIA_LISTING = [
    "shake-newyorkwhey-light-2kg",                     # 뉴욕웨이 라이트 2kg 36,700 (62%)
    "nyukeeo-olpeurotin-gosohanmat-245ml-24gae",       # 뉴케어 올프로틴 고소한맛 245ml 24개 41,320 (47%)
    "maipeurotin-deuringkeu-sigeunicheo-chokolrit-340ml-24gae",  # 마이프로틴 시그니처 초콜릿 340ml 24개 56,950 (37%)
]

NOTE_UPDATES = {
    "chojeongtansansu-190ml-30gae": (
        "2026-11-20 09:35 상품 페이지 확인 · 판매자 (주)일화 · 11,900원(100ml당 209원, 할인 배지 없음). "
        "11-15 확인한 10,900원에서 1,000원 올랐어요."
    ),
    "amondeubeurijeu-nyuteuripeulreoseu-peurotin-190ml-24gae": (
        "2026-11-20 09:35 상품 페이지 확인 · 17,450원(정가 36,000원·51%, 100ml당 383원) · "
        "12개 11,580원 옵션, 48개 옵션은 3만원대."
    ),
}


def sync_js(data):
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


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    for pid, price in CHANGES.items():
        p = by_id[pid]
        old = U.refresh(p, price, TS)
        diff = price - old
        arrow = "↓" if price < old else "↑"
        print(
            f"{p['name']}\n  {old:,}원 {arrow} {price:,}원 ({diff:+,}원 · {diff / old * 100:+.1f}% · "
            f"{p.get('unitPrice')} · {p.get('discountPct')}% 할인)"
        )
        if pid in NOTE_UPDATES:
            p["note"] = NOTE_UPDATES[pid]

    for pid in CHECKED + CHECKED_VIA_LISTING:
        p = by_id[pid]
        p["priceCheckedAt"] = TS
        p["priceCheckedLabel"] = U.checked_label(TS)
        print(f"확인 시각 갱신: {p['name']} ({p['price']:,}원)")

    data["site"]["updatedAt"] = "2026-11-20"
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    sync_js(data)
    print(f"\n상품 {len(data['products'])}종 · data/products.json + js/products.js 동기화 완료")


if __name__ == "__main__":
    main()
