#!/usr/bin/env python3
"""토스 쉐어링크 어드민('링크 관리')에서 확인한 실제 판매가 4종 반영 (2026-11-18 r24).

- 가격이 실제와 달라진 4종은 가격·단가·할인율·표기 문구를 다시 계산한다.
  · 떴닭 로스트 치킨 1kg×2: 12,920 → 14,100 (100g당 705원)
  · 셰프초이스 제육 불고기 2kg: 14,600 → 17,500 (100g당 875원)
  · 해담별 제주 흑돼지 왕구이 1.2kg×2: 13,900 → 15,900 (100g당 663원)
  · 펩시 제로슈거 피치향 500ml×18: 9,900 → 11,000 (100ml당 122원)
- 해담별은 11/17 선착순특가(13,900원)가 끝나 정가(15,900원)로 돌아갔다.
  정가와 판매가가 같아졌으니 할인 배지·정가 표기를 지운다(없는 할인을 만들지 않는다).
- data/price-history.json 에는 오늘(2026-11-18) 관측점 하나만 덧붙이고 통계를 다시 계산한다.
- `affiliateUrl`·`url`·`image`는 건드리지 않는다.

출력: data/products.json, js/products.js, data/price-history.json
사용법: python3 scripts/update_prices_20261118_toss4.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
HIST = ROOT / "data" / "price-history.json"
JS = ROOT / "js" / "products.js"

TS = "2026-11-18 13:40"
ISO = "2026-11-18T13:40:00+09:00"
DAY = "2026-11-18"

NOTES = {
    "toss-tteutdak-roast-chicken-1kg-2": (
        "1kg×2개 = 2kg. 11/18 13:40 토스 어드민 기준 14,100원(100g당 705원) — "
        "11/17 12,920원에서 올랐어요. 토스쇼핑 모바일 웹은 가격·정가를 안 띄워서 "
        "정가·할인율은 표기하지 않았어요. 양념·가공육이라 단백질·지방은 적지 않았어요"
    ),
    "toss-chefchoice-jeyuk-2kg": (
        "아버님 토스 쉐어링크. 11/18 13:40 토스 어드민 기준 17,500원(100g당 875원) — "
        "11/17 14,600원에서 올랐어요. 정가 26,545원 대비 34% 할인 표기예요."
    ),
    "toss-haedambyeol-jeju-heukdwaeji-wang-gui-1-2kg-2": (
        "1.2kg×2팩 = 2.4kg. 11/18 13:40 토스 어드민 기준 15,900원(100g당 663원) — "
        "11/17 선착순특가 13,900원이 끝나 정가(15,900원)로 돌아갔어요. 지금은 할인 표기가 없어요. "
        "양념·가공육이라 단백질·지방은 표기하지 않았어요"
    ),
    "toss-pepsi-jero-syugeo-pichihyang-500ml-18gae": (
        "11/18 13:40 아버님 토스 쉐어링크 어드민 기준 11,000원(100ml당 122원·1병당 611원) — "
        "11/17 선착순특가 9,900원에서 올랐어요. 같은 펩시 제로 355ml 24개(100ml당 175원)보다 30% 싸요. "
        "정가 28,300원은 11/17 토스 표기 할인율 65%에서 역산한 참고값이에요."
    ),
}

# id: 새 판매가 (어드민에서 확인한 실제 값)
CHANGES = {
    "toss-tteutdak-roast-chicken-1kg-2": 14100,
    "toss-chefchoice-jeyuk-2kg": 17500,
    "toss-haedambyeol-jeju-heukdwaeji-wang-gui-1-2kg-2": 15900,
    "toss-pepsi-jero-syugeo-pichihyang-500ml-18gae": 11000,
}

# 정가 표기를 지우는 상품 (정가 = 판매가가 되어 할인이 사라진 상품)
DROP_LIST_PRICE = {"toss-haedambyeol-jeju-heukdwaeji-wang-gui-1-2kg-2"}


def half_up(x):
    """파이썬 round()의 짝수 반올림 대신 화면(JS Math.round)과 같은 반올림을 쓴다."""
    return int(x + 0.5)


def checked_label(ts):
    return f"{int(ts[5:7])}/{int(ts[8:10])} {ts[11:16]} 토스 기준"


def refresh(p, price, ts):
    old = p.get("price")
    p["price"] = price
    p["priceCheckedAt"] = ts
    p["priceCheckedLabel"] = checked_label(ts)

    pack = p.get("packCount") or 1
    grams = p.get("weightG")
    ml = p.get("volumeMl")

    # 묶음 상품의 '1개당' 표기는 기존 문구의 머리(1kg 등)를 살려 숫자만 다시 계산한다
    if pack > 1 and "개당" in str(p.get("unitEach") or ""):
        each = half_up(price / pack)
        p["eachPrice"] = each
        head = str(p["unitEach"]).split("개당")[0]
        p["unitEach"] = f"{head}개당 {each:,}원"

    if grams:
        per100 = price / grams * 100
        p["per100g"] = half_up(per100)
        p["perValue"] = round(per100, 1)
        p["unitPrice"] = f"100g당 {half_up(per100):,}원"
    elif ml:
        per100 = price / (ml * pack) * 100
        p["perValue"] = round(per100, 1)
        p["unitPricePer100ml"] = half_up(per100)
        p["unitPrice"] = f"100ml당 {half_up(per100)}원"
        p["unitPriceOfficial"] = f"100ml당 {half_up(per100):,}원"
        each = half_up(price / pack)
        p["eachPrice"] = each
        p["eachLabel"] = p.get("eachLabel") or "병"
        p["unitEach"] = f"1{p['eachLabel']}당 {each:,}원"
    elif pack > 1:
        each = half_up(price / pack)
        p["eachPrice"] = each
        p["unitEach"] = f"1{p.get('eachLabel') or '개'}당 {each:,}원"

    if p.get("id") in DROP_LIST_PRICE:
        p["listPrice"] = None
        p["discountPct"] = None
    else:
        list_price = p.get("listPrice")
        if list_price and list_price > price:
            p["discountPct"] = half_up((list_price - price) / list_price * 100)
        else:
            p["discountPct"] = None

    low = p.get("lowest30d")
    if isinstance(low, (int, float)):
        p["lowest30d"] = min(low, price)

    p["note"] = NOTES[p["id"]]
    return old


def restats(series):
    prices = [s["price"] for s in series]
    lo = min(series, key=lambda s: s["price"])
    hi = max(series, key=lambda s: s["price"])
    return {
        "min": lo["price"],
        "minDate": lo["date"],
        "max": hi["price"],
        "maxDate": hi["date"],
        "avg": half_up(sum(prices) / len(prices)),
        "latest": series[-1]["price"],
        "latestDate": series[-1]["date"],
        "observations": len(series),
        "days": len({s["date"] for s in series}),
    }


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}
    missing = [k for k in CHANGES if k not in by_id]
    if missing:
        raise SystemExit(f"상품을 찾지 못했습니다: {missing}")

    for pid, price in CHANGES.items():
        p = by_id[pid]
        old = refresh(p, price, TS)
        diff = price - old
        print(
            f"{p['name']}\n  {old:,}원 → {price:,}원 "
            f"({diff:+,}원 · {diff / old * 100:+.1f}% · "
            f"{str(p['discountPct']) + '% 할인' if p.get('discountPct') else '할인 표기 없음'} · "
            f"{p['unitPrice']} · {p.get('unitEach') or '-'}) [{p['priceCheckedLabel']}]"
        )

    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── 가격 이력: 오늘 관측점 추가 (같은 날 점이 있으면 마지막 점을 새 값으로 바꾼다)
    hist = json.loads(HIST.read_text(encoding="utf-8"))
    hp = hist["products"]
    for pid, price in CHANGES.items():
        p = by_id[pid]
        entry = hp.get(pid)
        if not entry:
            print(f"! 가격 이력에 없는 상품: {pid}")
            continue
        series = [s for s in entry.get("series", []) if s.get("date") != DAY]
        series.append({"date": DAY, "price": price, "ts": ISO, "src": "mart"})
        series.sort(key=lambda s: s["ts"])
        entry["series"] = series
        entry["cardPrice"] = price
        entry["cardPriceCheckedAt"] = TS
        entry["cardListPrice"] = p.get("listPrice")
        entry["stats"] = restats(series)
        st = entry["stats"]
        print(f"  이력 {pid}: {st['days']}일 · {st['min']:,}~{st['max']:,} · 관측 {st['observations']}회")

    HIST.write_text(json.dumps(hist, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── js/products.js 다시 만들기(data/products.json 과 같은 내용)
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
    print(f"\n상품 {len(data['products'])}종 · products.json + products.js + price-history.json 갱신 완료")


if __name__ == "__main__":
    main()
