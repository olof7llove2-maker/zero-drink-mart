#!/usr/bin/env python3
"""2026-11-25(수) 토스 애사비·스파클 익일 가격 갱신 (r71).

11/24 하루특가로 올렸던 웅진 애사비와, 11/24에 가격을 고친 스파클 생수의
다음 날 실제 판매가를 아버님(신승용) 토스 쉐어링크 링크 관리
(sharelink.toss.im/links/manage)에서 확인한 값으로 반영한다.

확인 시각: 2026-11-25 08:35 (아버님 계정 리암승용 / ssy7199@naver.com)

  상품                                      11/24 → 11/25 판매가
1. 웅진식품 애사비 오리지널, 500ml, 24개     12,900(하루특가) → 14,400원 (+1,500, +11.6%)
   100ml당 108 → 120원, 1병당 538 → 600원, 정가 28,900원 대비 55% → 50% 할인
2. 스파클 생수, 무라벨, 2L, 30개             15,990 → 15,980원 (-10)
   100ml당 27원·1병당 533원 그대로, 정가 25,000원 대비 36% 할인 유지

· 두 상품 모두 링크 상태 '활성' 유지(링크 발급일 애사비 2026.11.24 · 스파클 2026.11.17).
  토스쇼핑 상품 페이지도 정상 판매 중(품절·판매중지 표기 없음).
· 애사비: 평점 4.9 · 리뷰 3,161 → 3,172개 · 기타탄산음료 3위 · 내일 도착 예정.
  정가는 그대로 두고 할인율만 다시 계산(28,900원 → 50%).
  30일 안 최저는 11/24 하루특가 12,900원(외부 기록의 10/20 하루특가 12,850원은 30일 창을 벗어남)
  → lowest30d를 12,850 → 12,900으로 바로잡음.
· 스파클: 평점 4.8 · 리뷰 16,378 → 16,671개 · 국산생수 4위 · 오늘출발·내일 도착 예정.
  30일 최저는 11/17의 13,900원 그대로 → 지금이 30일 기준 가장 높은 가격.
· 토스 웹(toss.shopping)은 가격을 숨기므로 판매가는 링크 관리 표의 판매가 열로만 확인했다.

출력: data/products.json, data/price-history.json, js/products.js
사용법: python3 scripts/update_toss_hotdeal_2_20261125.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
HIST = ROOT / "data" / "price-history.json"
JS = ROOT / "js" / "products.js"

CHECKED = "2026-11-25 08:35"
CHECKED_LABEL = "11/25 08:35 토스쉐어링크 판매가 기준"
TS = "2026-11-25T08:35:00+09:00"
TODAY = "2026-11-25"

UPDATES = [
    {
        "id": "toss-woongjin-aesabi-orijineol-500ml-24",
        "price": 14400,
        "previousPrice": 12900,
        "discountPct": 50,
        "priceHistoryDays": 2,
        "unitPricePer100ml": 120,
        "unitPrice": "100ml당 120원",
        "eachPrice": 600,
        "unitEach": "1병당 600원",
        "perValue": 120.0,
        "lowest30d": 12900,
        "rating": 4.9,
        "reviewCount": 3172,
        "tip": "애사비 오리지널 24병, 100ml당 120원",
        "note": (
            "아버님 토스 쉐어링크예요. 11/24 하루특가(12,900원)가 끝나 11/25 아침 판매가가 14,400원으로 "
            "올랐어요 — 500ml 24병(12L)에 100ml당 120원, 1병당 600원이에요. 그래도 띠니 애사비 중 단가가 "
            "가장 낮아요(클룹 애사비소다 500ml 12병은 100ml당 233원). 웅진식품 공식 판매·평점 4.9·"
            "리뷰 3,172개·내일 도착 예정이고 토스 기타탄산음료 3위예요. 정가 28,900원에서 50% 할인한 값이고, "
            "30일 안 최저는 11/24 하루특가 12,900원이라 지금은 그보다 12% 비싼 편이에요(외부 기록의 10/20 "
            "하루특가 12,850원은 30일 창을 벗어났어요). 토스 웹은 가격을 숨겨서 아버님 쉐어링크 링크 관리의 "
            "판매가로 확인했어요(11/25 08:35). 급하지 않으면 다음 하루특가를 기다리는 편이 싸요."
        ),
    },
    {
        "id": "toss-seupakeul-saengsu-murabel-2l-30gae",
        "price": 15980,
        "previousPrice": 15990,
        "discountPct": 36,
        "priceHistoryDays": 3,
        "unitPricePer100ml": 27,
        "unitPrice": "100ml당 27원",
        "eachPrice": 533,
        "unitEach": "1병당 533원",
        "perValue": 26.6,
        "lowest30d": 13900,
        "rating": 4.8,
        "reviewCount": 16671,
        "note": (
            "아버님 토스 쉐어링크예요. 11/25 아침 판매가가 15,990원에서 15,980원으로 10원 내렸어요 — "
            "2L 30병(60L)에 100ml당 27원, 1병당 533원으로 단가는 그대로예요. 11/17에 확인한 13,900원이 "
            "30일 안 최저라 지금은 그보다 15% 비싼, 30일 기준 가장 높은 가격이에요. 생수 중에서는 "
            "탐사 샘물 2L 12개(100ml당 23원)가 더 싸요. 스파클 공식 판매·평점 4.8·리뷰 16,671개·오늘출발·"
            "내일 도착 예정이고, 정가 25,000원에서 36% 할인한 값이에요. 토스 웹은 가격을 숨겨서 아버님 "
            "쉐어링크 링크 관리의 판매가로 확인했어요(11/25 08:35). 급하지 않으면 다음 하루특가를 기다리는 "
            "편이 싸요."
        ),
    },
]


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

    changed = []
    for upd in UPDATES:
        p = by_id[upd["id"]]
        before = p["price"]
        p["price"] = upd["price"]
        p["previousPrice"] = upd["previousPrice"]
        p["discountPct"] = upd["discountPct"]
        p["priceHistoryDays"] = upd["priceHistoryDays"]
        p["unitPricePer100ml"] = upd["unitPricePer100ml"]
        p["unitPriceOfficial"] = upd["unitPrice"]
        p["unitPrice"] = upd["unitPrice"]
        p["eachPrice"] = upd["eachPrice"]
        p["unitEach"] = upd["unitEach"]
        p["perValue"] = upd["perValue"]
        p["lowest30d"] = upd["lowest30d"]
        p["rating"] = upd["rating"]
        p["reviewCount"] = upd["reviewCount"]
        if "tip" in upd:
            p["tip"] = upd["tip"]
        p["note"] = upd["note"]
        p["priceCheckedAt"] = CHECKED
        p["priceCheckedLabel"] = CHECKED_LABEL
        changed.append((upd["id"], before, p["price"]))

    data["site"]["updatedAt"] = TODAY
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── 가격 이력: 오늘 관측점 한 점 추가
    hist = json.loads(HIST.read_text(encoding="utf-8"))
    hprod = hist["products"]
    for upd in UPDATES:
        pid = upd["id"]
        entry = hprod[pid]
        series = entry["series"]
        if not any(s["date"] == TODAY for s in series):
            series.append({"date": TODAY, "price": upd["price"], "ts": TS, "src": "mart"})
        else:
            for s in series:
                if s["date"] == TODAY:
                    s["price"] = upd["price"]
        entry["cardPrice"] = upd["price"]
        entry["cardPriceCheckedAt"] = CHECKED
        entry["cardListPrice"] = by_id[pid]["listPrice"]
        entry["lastObservedAt"] = TS
        entry["stats"] = recompute_stats(series)
    HIST.write_text(json.dumps(hist, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── js/products.js 다시 만들기
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

    for pid, before, after in changed:
        print(f"{pid}: {before:,} → {after:,}")
    print("상품", len(data["products"]), "종 · updatedAt", data["site"]["updatedAt"])


if __name__ == "__main__":
    main()
