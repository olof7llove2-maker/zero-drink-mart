#!/usr/bin/env python3
"""2026-11-19 12:30 타임세일 점검 반영.

- 하림 자연실록 400g이 07:30의 6,900원(정가 7,190원·4%)에서 다시 6,150원으로 내려갔다
  (정가·할인 배지 없음, 100g당 1,538원). 사이트가 실제보다 750원(10.9%) 비싸게
  표시되던 상태라 값·단가·단백질 20g당 가격을 다시 계산한다.
- 값을 확인했지만 변동이 없던 7종은 확인 시각(priceCheckedAt)만 갱신한다.
- `affiliateUrl`·`url`·`image`는 건드리지 않는다.

출력: data/products.json, js/products.js (둘 다 동기화)
사용법: python3 scripts/update_prices_20261119_1230.py
"""
import importlib
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

U = importlib.import_module("update_prices_20261118")
M = importlib.import_module("update_prices_20261118_1230")

DATA = U.DATA
JS = U.JS

TS = "2026-11-19 12:45"

# id: 새 가격 (실제로 값이 바뀐 상품만)
CHANGES = {
    "meat-chicken-harim-jayeonsilrok-breast-400g": 6150,
}

# 오늘 12:30 실행에서 눈으로 확인한 상품 (값 변동이 없어도 확인 시각은 갱신)
CHECKED = [
    "meat-beef-au-buchaesal-steak-600g",
    "meat-beef-gomgom-au-buchaesal-gui-600g",
    "cola-zero",
    "narangd-cider-zero",
    "meat-chicken-harim-iff-breast-2kg",
    "meat-chicken-harim-jayeonsilrok-breast-400g",
    "kalobai-peopekteu-pawosweikeu-beulrende-choko-1-8kg",
    "deodanbaek-deuringkeu-choko-250ml-18gae",
]

# 오늘 상품 페이지에 정가·할인 배지가 없던 상품 (할인율을 지어내지 않는다)
M.NO_LIST_PRICE = {"meat-chicken-harim-jayeonsilrok-breast-400g"}

NOTE_UPDATES = {
    "meat-chicken-harim-jayeonsilrok-breast-400g": (
        "상품 페이지 필수표기 정보에서 개당 중량 400g 확인 · 2026-11-19 12:30 조회 시 "
        "쿠팡 판매가 6,150원(정가·할인 배지 없음, 100g당 1,538원) · 07:30의 6,900원(정가 7,190·4%)보다 "
        "750원 낮아 다시 내렸고, 30일 최저(6,150원)와 같은 값 · 2팩 12,240원(100g당 1,530), "
        "8팩 43,960원(100g당 1,374)"
    ),
}


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    missing = [k for k in CHECKED if k not in by_id]
    if missing:
        raise SystemExit(f"상품을 찾지 못했습니다: {missing}")

    for pid, price in CHANGES.items():
        p = by_id[pid]
        if p.get("part") == "meat":
            old = M.refresh_meat(p, price, TS)
        else:
            old = U.refresh(p, price, TS)
        arrow = "↓" if price < old else "↑"
        diff = price - old
        pct = diff / old * 100
        print(
            f"{p['name']}\n  {old:,}원 {arrow} {price:,}원 "
            f"({diff:+,}원 · {pct:+.1f}% · "
            f"{(str(p['discountPct']) + '% 할인') if p.get('discountPct') else '할인 배지 없음'} · "
            f"{p['unitPrice']})"
        )
        if pid in NOTE_UPDATES:
            p["note"] = NOTE_UPDATES[pid]

    for pid in CHECKED:
        if pid in CHANGES:
            continue
        p = by_id[pid]
        p["priceCheckedAt"] = TS
        p["priceCheckedLabel"] = U.checked_label(TS)
        print(f"확인 시각만 갱신: {p['name']} ({p['price']:,}원)")

    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

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
    print(f"\n상품 {len(data['products'])}종 · data/products.json + js/products.js 동기화 완료")


if __name__ == "__main__":
    main()
