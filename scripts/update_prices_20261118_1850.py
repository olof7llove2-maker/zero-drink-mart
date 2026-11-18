#!/usr/bin/env python3
"""2026-11-18 18:50 실측 반영 (r40) — 가격 정정 2건 + 신규 상품 가격 이력 정리.

1) 나랑드사이다 제로 245ml 30개: 12,900 → 12,770원 (정가 15,000원, 100ml당 174원)
2) 더단백 40g 고함량 드링크 더블초코 350ml 20개: 51,170 → 51,300원 (정가 78,000원, 100ml당 733원)

신규 상품(퓨어프로틴7 3kg)의 쿠프라이스 과거 기록은 같은 상품번호에 1kg 옵션(19,900원)이
섞여 있어 3kg 카드에 그리면 사실과 다른 급락처럼 보인다. 그래서 기록은 쓰지 않고
'추적 시작 + 오늘 마트 확인가 한 점'만 남긴다(없는 과거를 만들지 않는 원칙과 같은 이유).

출력: data/products.json, js/products.js, data/price-history.json
사용법: python3 scripts/update_prices_20261118_1850.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"
HISTORY = ROOT / "data" / "price-history.json"

CHECKED = "2026-11-18 18:50"
TS = "2026-11-18T18:50:00+09:00"

UPDATES = {
    "narangd-cider-zero": 12770,
    "deodanbaek-40g-gohamryang-deuringkeu-deobeulchoko-350ml-20gae": 51300,
}

PP7_ID = "shake-peurotinseutori-purepeurotin7-3kg-choko"


def half_up(x):
    return int(math.floor(x + 0.5))


def refresh(p, price):
    old = p.get("price")
    p["price"] = price
    p["priceCheckedAt"] = CHECKED
    p["priceCheckedLabel"] = "11/18 18:50 쿠팡 기준"

    pack = p.get("packCount") or 1
    each = round(price / pack)
    p["eachPrice"] = each
    p["eachLabel"] = p.get("eachLabel") or "병"
    p["unitEach"] = f"1{p['eachLabel']}당 {each:,}원"
    if "bottlePrice" in p:
        p["bottlePrice"] = each

    ml = p.get("volumeMl")
    if ml:
        per100 = price / (ml * pack) * 100
        p["perValue"] = round(per100, 1)
        p["unitPricePer100ml"] = half_up(per100)
        p["unitPrice"] = f"100ml당 {half_up(per100):,}원"
        p["unitPriceOfficial"] = p["unitPrice"]

    grams = p.get("protein_g_per_bottle")
    if isinstance(grams, (int, float)) and grams > 0:
        per20 = half_up(each / grams * 20)
        p["protein20"] = per20
        p["pricePer20gProtein"] = per20
        p["proteinPerG"] = round(each / grams)

    list_price = p.get("listPrice")
    if list_price:
        p["discountPct"] = round((list_price - price) / list_price * 100)

    low = p.get("lowest30d")
    p["lowest30d"] = min(low, price) if isinstance(low, (int, float)) else price
    return old


def stats(series):
    prices = [s["price"] for s in series if isinstance(s.get("price"), (int, float))]
    if not prices:
        return None
    lo = min(prices)
    hi = max(prices)
    loDate = next(s["date"] for s in series if s.get("price") == lo)
    hiDate = next(s["date"] for s in series if s.get("price") == hi)
    days = len({s["date"] for s in series})
    return {
        "min": lo,
        "minDate": loDate,
        "max": hi,
        "maxDate": hiDate,
        "avg": round(sum(prices) / len(prices)),
        "latest": series[-1]["price"],
        "latestDate": series[-1]["date"],
        "observations": len(prices),
        "days": days,
    }


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    for pid, price in UPDATES.items():
        p = by_id[pid]
        old = refresh(p, price)
        arrow = "↓" if price < old else "↑"
        print(
            f"{p['name']}\n   {old:,}원 {arrow} {price:,}원 · {p['unitPrice']} · {p['unitEach']} · "
            f"{p['discountPct']}% · 20g당 {p.get('protein20')}"
        )

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

    hist = json.loads(HISTORY.read_text(encoding="utf-8"))
    products = hist["products"]
    mart_point = {"date": "2026-11-18", "price": None, "ts": TS, "src": "mart"}

    # ① 정정 2건: 카드 가격 + 오늘 마트 관측 한 점
    for pid in UPDATES:
        entry = products[pid]
        point = dict(mart_point, price=UPDATES[pid])
        entry["cardPrice"] = UPDATES[pid]
        entry["cardPriceCheckedAt"] = CHECKED
        entry["cardListPrice"] = by_id[pid].get("listPrice")
        series = [s for s in entry.get("series", []) if not (s.get("src") == "mart" and s.get("ts") == TS)]
        series.append(point)
        entry["series"] = series
        entry["stats"] = stats(series)
        entry["lastObservedAt"] = TS
        print(f"이력 갱신 {pid}: {entry['stats']['days']}일 · 관측 {entry['stats']['observations']}회")

    # ② 퓨어프로틴7: 1kg 옵션이 섞인 쿠프라이스 과거 기록은 쓰지 않는다
    entry = products[PP7_ID]
    entry["status"] = "tracking-started"
    entry["statusDetail"] = "option-mixed"
    entry["statusNote"] = (
        "쿠프라이스 60일 기록에 같은 상품번호의 1kg 옵션(19,900원)이 섞여 있어 "
        "3kg 카드의 과거 값으로 쓰지 않았어요. 마트가 직접 확인한 값만 남깁니다."
    )
    entry["series"] = [dict(mart_point, price=42410)]
    entry["stats"] = stats(entry["series"])
    entry["firstObservedAt"] = TS
    entry["lastObservedAt"] = TS
    print("이력 정리:", PP7_ID, entry["stats"])

    tally = {"history": 0, "tracking-started": 0, "not-tracked": 0, "item-mismatch": 0, "no-records": 0, "error": 0}
    for e in products.values():
        st = e.get("status")
        if st in tally:
            tally[st] += 1
    hist["meta"]["tally"] = tally
    hist["meta"]["generatedAt"] = TS
    HISTORY.write_text(json.dumps(hist, ensure_ascii=False, indent=1, separators=(",", ": ")) + "\n", encoding="utf-8")

    print("상품", len(data["products"]), "· 이력", len(products), tally)


if __name__ == "__main__":
    main()
