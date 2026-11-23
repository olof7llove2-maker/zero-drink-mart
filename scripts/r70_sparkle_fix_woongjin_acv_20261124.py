#!/usr/bin/env python3
"""r70 — 스파클 생수 2L 30개 가격 정정 + 웅진 애사비 오리지널 500ml×24 신규 (2026-11-24).

1) 스파클 생수, 무라벨, 2L, 30개 — 13,900원(11/17) → **15,990원**(11/24)
   · 아버님(신승용, ssy7199@naver.com / 리암승용) 토스 쉐어링크 링크 관리 판매가 15,990원,
     링크 상태 '활성', 발급일 2026.11.17 그대로(기존 `_m/vL3doUK` 유지). 11/24 08:45 확인.
   · 11/23에 13,900 → 15,990으로 오른 값(세이보 일자별 기록 11/24 15,990원과 일치).
   · 정가 25,000원(판매자 표시가) 대비 36% 할인 — 토스 상품 페이지에는 정가가 없고
     외부 집계(인조이스 11/24, 다사자 11/15) 모두 25,000원이라 그 값을 썼다.
   · 단가 100ml당 27원(1병당 533원), 30일 최저는 11/17의 13,900원 → 지금이 30일 최고가.
   · 같은 생수 중 탐사 샘물 2L 12개(100ml당 23원)가 더 싸다 → 노트에 명시.
   · 평점 4.8 · 리뷰 16,378개(토스쇼핑 상품 페이지 og, 11/24 08:47 확인) · 내일 도착 예정.

2) 웅진식품 애사비 오리지널, 500ml, 24개 — **12,900원** 신규 추가 (애사비 축 1종 → 2종)
   · 오늘(11/24) 토스 하루특가. 아버님 쉐어링크 베스트 랭킹에서 **'링크 발급'으로 `_m/` 직접 발급**
     → https://toss.shopping/_m/lU6BreBA (링크 관리 발급일 2026.11.24 · 수수료 5% · 활성)
   · 링크 관리 판매가 12,900원 · 토스 표기 '지금 30일 내 최저가'.
     외부 기록(딜바고·랭킹박스)에는 10/20 하루특가 12,850원이 있어 실질 최저 +50원(0.4%).
   · 정가 28,900원 → 55% 할인(딜바고·랭킹박스 11/24 동일), 100ml당 108원(1병당 538원).
   · 평점 4.9 · 리뷰 3,161개 · 판매자 웅진식품 공식 · 내일 도착 예정 ·
     토스 '기타탄산음료 3위'(상품 페이지 11/24 08:47 확인).

출력: data/products.json, data/price-history.json, js/products.js
사용법: python3 scripts/r70_sparkle_fix_woongjin_acv_20261124.py
"""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
HIST = ROOT / "data" / "price-history.json"
JS = ROOT / "js" / "products.js"

CHECKED = "2026-11-24 08:45"
CHECKED_LABEL = "11/24 08:45 토스쉐어링크 판매가 기준"
TS = "2026-11-24T08:45:00+09:00"
TODAY = "2026-11-24"

SPARKLE_ID = "toss-seupakeul-saengsu-murabel-2l-30gae"

SPARKLE_UPDATE = {
    "price": 15990,
    "previousPrice": 13900,
    "listPrice": 25000,
    "discountPct": 36,
    "lowest30d": 13900,
    "priceHistoryDays": 2,
    "unitPricePer100ml": 27,
    "unitPriceOfficial": "100ml당 27원",
    "unitPrice": "100ml당 27원",
    "eachPrice": 533,
    "unitEach": "1병당 533원",
    "perValue": 26.7,
    "weightG": None,
    "rating": 4.8,
    "reviewCount": 16378,
    "note": (
        "아버님 토스 쉐어링크예요. 11/23에 13,900원에서 15,990원으로 올랐어요 — "
        "2L 30병(60L)에 100ml당 27원, 1병당 533원이에요. 11/17에 확인한 13,900원이 30일 안 최저라 "
        "지금은 그보다 15% 비싼, 30일 기준 가장 높은 가격이에요. 생수 중에서는 "
        "탐사 샘물 2L 12개(100ml당 23원)가 더 싸요. 스파클 공식 판매·평점 4.8·리뷰 16,378개·"
        "내일 도착 예정이고, 정가 25,000원에서 36% 할인한 값이에요. 토스 웹은 가격을 숨겨서 "
        "아버님 쉐어링크 링크 관리의 판매가로 확인했어요(11/24 08:45). "
        "급하지 않으면 다음 하루특가를 기다리는 편이 싸요."
    ),
}

ACV = {
    "id": "toss-woongjin-aesabi-orijineol-500ml-24",
    "group": "제로음료·생수",
    "category": "acv",
    "categoryId": "acv",
    "part": "zero",
    "brand": "웅진식품",
    "name": "웅진식품 애사비 오리지널, 500ml, 24개",
    "kind": "애사비 · 오리지널",
    "flavor": "오리지널",
    "price": 12900,
    "listPrice": 28900,
    "discountPct": 55,
    "previousPrice": None,
    "lowest30d": 12850,
    "priceHistoryDays": 1,
    "platform": "toss",
    "shareLink": "https://toss.shopping/_m/lU6BreBA",
    "url": "https://toss.shopping/_m/lU6BreBA",
    "affiliateUrl": "https://toss.shopping/_m/lU6BreBA",
    "image": "images/toss-woongjin-aesabi-original-500ml-24.jpg",
    "volumeMl": 500,
    "packCount": 24,
    "unitPricePer100ml": 108,
    "unitPriceOfficial": "100ml당 108원",
    "unitPrice": "100ml당 108원",
    "eachPrice": 538,
    "unitEach": "1병당 538원",
    "container": "pet-small",
    "caffeine": "none",
    "aspartame": None,
    "measure": "per100ml",
    "weightG": None,
    "perValue": 107.5,
    "eachLabel": "병",
    "protein20": None,
    "rating": 4.9,
    "reviewCount": 3161,
    "tip": "애사비 오리지널 24병, 100ml당 108원",
    "shipNote": "내일 도착 예정 · 웅진식품 공식",
    "note": (
        "아버님 토스 쉐어링크예요. 500ml 24병(12L)에 12,900원, 100ml당 108원으로 띠니 애사비 중 "
        "단가가 가장 낮아요 — 클룹 애사비소다(500ml 12병, 100ml당 233원)의 절반 이하예요. "
        "웅진식품 공식 판매·평점 4.9·리뷰 3,161개·내일 도착 예정이고 토스 기타탄산음료 3위예요. "
        "오늘(11/24) 토스 하루특가로 정가 28,900원에서 55% 할인한 값이에요. 토스는 '지금 30일 내 "
        "최저가'로 표시하지만 외부 가격 기록에는 10/20 하루특가 12,850원이 있어 최저보다 "
        "50원(0.4%) 높은 수준이에요. 하루특가는 오늘 밤 12시까지고, 내일은 14,000원대로 "
        "돌아갈 수 있어요."
    ),
    "priceCheckedAt": CHECKED,
    "priceCheckedLabel": CHECKED_LABEL,
}


def popular_score(p):
    score = 6
    rc = p.get("reviewCount") or 0
    if rc:
        score += min(30, math.log10(rc + 1) * 7)
        if rc >= 1000:
            score += 4
    if p.get("discountPct"):
        score += min(26, p["discountPct"] * 0.7)
    if p.get("rating") and p["rating"] >= 4.8 and rc > 500:
        score += 2
    return round(score, 2)


def recompute_stats(series):
    prices = [s["price"] for s in series if isinstance(s.get("price"), (int, float))]
    dates = sorted({s["date"] for s in series})
    lo = min(series, key=lambda s: (s["price"], s["date"]))
    hi = max(series, key=lambda s: (s["price"], s["date"]))
    last = sorted(series, key=lambda s: (s["date"], s.get("ts", "")))[-1]
    return {
        "min": lo["price"],
        "minDate": lo["date"],
        "max": hi["price"],
        "maxDate": hi["date"],
        "avg": round(sum(prices) / len(prices)),
        "latest": last["price"],
        "latestDate": last["date"],
        "observations": len(prices),
        "days": len(dates),
    }


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    # ── 1) 스파클 가격 정정
    sp = by_id[SPARKLE_ID]
    before = sp["price"]
    sp.update(SPARKLE_UPDATE)
    sp["priceCheckedAt"] = CHECKED
    sp["priceCheckedLabel"] = CHECKED_LABEL

    # ── 2) 웅진 애사비 신규 (클룹 애사비소다 바로 뒤에 넣어 애사비 축을 붙여 둔다)
    states = []
    if ACV["id"] in by_id:
        by_id[ACV["id"]].update(ACV)
        states.append(("갱신", ACV["id"]))
    else:
        prod = dict(ACV)
        prod["popularScore"] = popular_score(prod)
        ids = [p["id"] for p in data["products"]]
        pos = ids.index("keulrup-aesabisoda-orijineol-tansaneumryo-500ml-12gae") + 1
        data["products"].insert(pos, prod)
        states.append(("신규", ACV["id"]))

    data["site"]["updatedAt"] = TODAY
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── 3) 가격 이력
    hist = json.loads(HIST.read_text(encoding="utf-8"))
    hprod = hist["products"]

    entry = hprod[SPARKLE_ID]
    series = entry["series"]
    if not any(s["date"] == TODAY for s in series):
        series.append({"date": TODAY, "price": sp["price"], "ts": TS, "src": "mart"})
    else:
        for s in series:
            if s["date"] == TODAY:
                s["price"] = sp["price"]
    entry["cardPrice"] = sp["price"]
    entry["cardPriceCheckedAt"] = CHECKED
    entry["cardListPrice"] = sp["listPrice"]
    entry["lastObservedAt"] = TS
    entry["stats"] = recompute_stats(series)

    if ACV["id"] not in hprod:
        hprod[ACV["id"]] = {
            "id": ACV["id"],
            "name": ACV["name"],
            "platform": ACV["platform"],
            "cardPrice": ACV["price"],
            "cardPriceCheckedAt": CHECKED,
            "cardListPrice": ACV["listPrice"],
            "source": "mart",
            "status": "tracking-started",
            "statusDetail": "not-tracked",
            "series": [{"date": TODAY, "price": ACV["price"], "ts": TS, "src": "mart"}],
            "stats": {
                "min": ACV["price"],
                "minDate": TODAY,
                "max": ACV["price"],
                "maxDate": TODAY,
                "avg": ACV["price"],
                "latest": ACV["price"],
                "latestDate": TODAY,
                "observations": 1,
                "days": 1,
            },
            "lastObservedAt": TS,
        }
    HIST.write_text(json.dumps(hist, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── 4) js/products.js 다시 만들기
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

    counts = {}
    for p in data["products"]:
        counts[p["part"]] = counts.get(p["part"], 0) + 1
    print(f"스파클: {before:,} → {sp['price']:,} (100ml당 {sp['unitPricePer100ml']}원)")
    for state, pid in states:
        print(state, pid, dict((p["id"], p["price"]) for p in data["products"])[pid])
    print("상품", len(data["products"]), counts)


if __name__ == "__main__":
    main()
