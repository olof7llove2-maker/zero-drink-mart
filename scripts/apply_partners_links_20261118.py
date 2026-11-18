#!/usr/bin/env python3
"""2026-11-18 아버님 쿠팡 파트너스 링크 일괄 반영 (r16).

입력: .scratch/final_map.json (상품 id → link.coupang.com 단축 링크 또는 "RESTRICTED")
동작:
 1) data/products.json 의 affiliateUrl 만 교체 (url 필드는 원본 그대로)
 2) 고기 2종(곰곰 대패삼겹 1kg, 사조원 닭안심 1kg)은 2개 옵션 → 1개 옵션으로 정리
 3) js/products.js 재생성, partners-links.json / partners-restricted.json 갱신
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"
MAP = ROOT / ".scratch" / "final_map.json"
LINKS = ROOT / "partners-links.json"
RESTRICTED = ROOT / "partners-restricted.json"

ONE_PACK = {
    "meat-pork-gomgom-daepae-samgyeop-1kg-2": {
        "name": "곰곰 돌돌말이 대패삼겹살 (냉동), 1kg, 1개",
        "kind": "대패삼겹 · 냉동 1kg",
        "price": 9900,
        "listPrice": 16990,
        "discountPct": 41,
        "packCount": 1,
        "weightG": 1000,
        "per100g": 990,
        "perValue": 990.0,
        "unitPrice": "100g당 990원",
        "eachPrice": 9900,
        "eachLabel": "팩",
        "unitEach": "1팩당 9,900원",
        "url": "https://www.coupang.com/vp/products/343900909?itemId=1092570386",
        "priceCheckedAt": "2026-11-18 10:15",
        "priceCheckedLabel": "11/18 10:15 쿠팡 상품 페이지 기준",
        "note": "16,990원 → 9,900원(100g당 990원) 41% 할인. 리뷰 9.9만건. 2개 묶음으로 들어가던 링크를 1개(1kg) 옵션으로 바꿔서 바로 1개 담기게 했어요.",
    },
    "meat-chicken-sajowon-tenderloin-1kg-2": {
        "name": "사조원 닭안심 (냉장), 1kg, 1개",
        "kind": "닭안심 · 냉장 1kg",
        "price": 7650,
        "listPrice": None,
        "discountPct": None,
        "packCount": 1,
        "weightG": 1000,
        "per100g": 765,
        "perValue": 765.0,
        "unitPrice": "100g당 765원",
        "eachPrice": 7650,
        "eachLabel": "팩",
        "unitEach": "1팩당 7,650원",
        "url": "https://www.coupang.com/vp/products/9178751443?itemId=27064861412",
        "priceCheckedAt": "2026-11-18 10:15",
        "priceCheckedLabel": "11/18 10:15 쿠팡 상품 페이지 기준",
        "note": "7,650원(100g당 765원). 로켓프레시, 1kg 1팩. 2개 묶음으로 들어가던 링크를 1개 옵션으로 바꿨어요. 정가 표기가 없어 할인율은 비워 뒀어요.",
    },
}


def main():
    doc = json.loads(DATA.read_text(encoding="utf-8"))
    mapping = json.loads(MAP.read_text(encoding="utf-8"))
    products = {p["id"]: p for p in doc["products"]}

    changed = restricted = one_pack = 0
    for pid, target in mapping.items():
        p = products.get(pid)
        if p is None:
            print("! 없는 상품:", pid)
            continue
        if target == "RESTRICTED":
            if p["affiliateUrl"] != p["url"]:
                p["affiliateUrl"] = p["url"]
            restricted += 1
            continue
        if p["affiliateUrl"] != target:
            p["affiliateUrl"] = target
            changed += 1

    for pid, patch in ONE_PACK.items():
        p = products[pid]
        p.update(patch)
        one_pack += 1

    DATA.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # js/products.js 재생성
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

    # 대장
    links = json.loads(LINKS.read_text(encoding="utf-8")) if LINKS.exists() else {}
    for pid, target in mapping.items():
        if target != "RESTRICTED":
            links[pid] = target
    LINKS.write_text(json.dumps(links, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    rs = set(json.loads(RESTRICTED.read_text(encoding="utf-8"))) if RESTRICTED.exists() else set()
    rs |= {pid for pid, target in mapping.items() if target == "RESTRICTED"}
    RESTRICTED.write_text(json.dumps(sorted(rs), ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    coupang = [p for p in doc["products"] if p.get("platform") == "coupang"]
    short = [p for p in coupang if p["affiliateUrl"].startswith("https://link.coupang.com/")]
    plain = [p for p in coupang if not p["affiliateUrl"].startswith("https://link.coupang.com/")]
    print(f"affiliateUrl 교체 {changed}건 · 제한 유지 {restricted}건 · 1개 옵션 정리 {one_pack}건")
    print(f"쿠팡 상품 {len(coupang)}종 = 단축 {len(short)}종 + 일반 {len(plain)}종")


if __name__ == "__main__":
    main()
