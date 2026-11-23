#!/usr/bin/env python3
"""2026-11-24(화) 토스 하루특가 3종(r67d) 익일 가격 갱신 (r69).

11/23 23:59에 끝난 토스 하루특가 3종의 다음 날 실제 판매가를 아버님(신승용)
토스 쉐어링크 링크 관리(sharelink.toss.im/links/manage)에서 확인한 값으로 반영한다.

확인 시각: 2026-11-24 08:36~08:45 (아버님 계정 리암승용 / ssy7199@naver.com)

  상품                                  11/23 특가 → 11/24 판매가
1. 파파네정육점 통삼겹살, 수육용, 1kg, 2개   15,900 → 18,810원 (+2,910, +18.3%)  100g당 795 → 941원
2. 고기중독 삼겹살, 8mm, 구이용, 1kg, 1개    11,560 → 12,990원 (+1,430, +12.4%)  100g당 1,156 → 1,299원
3. 널담 고단백 배꼽 베이글, 맛혼합, 10개      9,600 →  9,600원 (변동 없음)        1개당 960원 그대로

· 두 상품은 하루특가가 끝나며 일반 판매가로 돌아갔고, 널담은 특가가 끝난 뒤에도 9,600원이 유지됐다.
· 세 상품 모두 링크 상태 '활성', 토스쇼핑 상품 페이지도 정상 판매 중(품절 표기 없음).
  - 고기중독: '내일 도착 예정' / 널담: '오늘출발·내일 도착 예정' (리뷰 938·27,347개)
  - 파파네: 리뷰 8,442개, 오늘 페이지에 배송일정 줄이 없어 shipNote에서 '내일 도착 예정'을 뺐다.
· 정가(35,600 / 24,900 / 27,900원)는 그대로 두고 할인율만 다시 계산했다(47 / 48 / 65%).
  DEEP_CUT_PCT=60 규칙상 널담만 '🔥 역대 최저'(65%)로 남고, 둘은 🟢 지금 사기 좋아요.

출력: data/products.json, data/price-history.json, js/products.js
사용법: python3 scripts/update_toss_hotdeal_3_20261124.py
"""
import json
from datetime import date
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
HIST = ROOT / "data" / "price-history.json"
JS = ROOT / "js" / "products.js"

CHECKED = "2026-11-24 08:40"
CHECKED_LABEL = "11/24 08:40 토스쉐어링크 판매가 기준"
TS = "2026-11-24T08:40:00+09:00"
TODAY = "2026-11-24"

PRICE_SRC = "정가·할인율은 11/23 집계 사이트 교차확인값이에요."

UPDATES = [
    {
        "id": "toss-papane-tongsamgyeop-suyuk-1kg-2",
        "price": 18810,
        "discountPct": 47,
        "per100g": 941,
        "perValue": 940.5,
        "unitPrice": "100g당 941원",
        "eachPrice": 9405,
        "unitEach": "1팩(1kg)당 9,405원",
        "reviewCount": 8442,
        "tip": "수육·보쌈용 통삼겹 2kg, 100g당 941원",
        "shipNote": "무료배송 · (주)파파육가공",
        "note": (
            "아버님 토스 쉐어링크예요. 11/23 하루특가(15,900원)가 끝나 11/24 아침 판매가가 18,810원으로 올랐어요 — "
            "1kg 두 팩(2kg)에 100g당 941원이에요. 그래도 띠니 돼지고기 중 단가가 가장 낮아요"
            "(냉동 대패삼겹 100g당 945원·곰곰 대패 990원). 통삼겹이라 수육·보쌈용으로 두툼하게 썰어 삶기 좋고, "
            "정육 1위·리뷰 8,442개·평점 4.3이에요. "
            + PRICE_SRC
            + " 급하지 않으면 다음 하루특가를 기다리는 편이 싸요."
        ),
    },
    {
        "id": "toss-gogijungdok-samgyeop-8mm-1kg",
        "price": 12990,
        "discountPct": 48,
        "per100g": 1299,
        "perValue": 1299.0,
        "unitPrice": "100g당 1,299원",
        "eachPrice": 12990,
        "unitEach": "1팩(1kg)당 12,990원",
        "reviewCount": 938,
        "tip": "8mm 도톰 썰기라 굽기만 하면 되는 삼겹살",
        "shipNote": "무료배송 · 내일 도착 예정 · 렛츠커넥트",
        "note": (
            "아버님 토스 쉐어링크예요. 11/23 하루특가(11,560원)가 끝나 11/24 아침 판매가가 12,990원으로 올랐어요 — "
            "1kg에 100g당 1,299원이에요. 8mm로 도톰하게 썰려 굽기만 하면 되고, 리뷰 938개·평점 4.2·무료배송·내일 도착이에요. "
            "같은 상품 2kg 구성도 있는데 100g당으로는 이 1kg 쪽이 더 싸요. "
            + PRICE_SRC
            + " 급하지 않으면 다음 특가를 기다리는 편이 싸요."
        ),
    },
    {
        "id": "toss-neoldam-godanbaek-baekkop-baegel-10",
        "price": 9600,
        "discountPct": 65,
        "per100g": None,
        "perValue": 960.0,
        "unitPrice": "1개당 960원",
        "eachPrice": 960,
        "unitEach": "1개당 960원",
        "reviewCount": 27347,
        "tip": "고단백 베이글 10개, 1개당 960원",
        "shipNote": "무료배송 · 내일 도착 예정 · 널담",
        "note": (
            "아버님 토스 쉐어링크예요. 11/23 하루특가가 끝난 11/24 아침에도 9,600원 그대로예요 — 10개에 9,600원, 1개당 960원. "
            "베이글 카테고리 1위에 리뷰 27,347개·평점 4.7로 후기가 압도적이에요. 지난 10/20에 8,480원까지 내려간 적이 있어 "
            "지금이 역대 최저는 아니지만, 평소 평균가(12,375원)보다 22% 싼 값이에요. 무료배송·내일 도착이에요. "
            + PRICE_SRC
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
        pid = upd["id"]
        p = by_id[pid]
        before = p["price"]
        p["price"] = upd["price"]
        p["discountPct"] = upd["discountPct"]
        if upd["per100g"] is None:
            p.pop("per100g", None)
        else:
            p["per100g"] = upd["per100g"]
        p["perValue"] = upd["perValue"]
        p["unitPrice"] = upd["unitPrice"]
        p["eachPrice"] = upd["eachPrice"]
        p["unitEach"] = upd["unitEach"]
        p["reviewCount"] = upd["reviewCount"]
        p["tip"] = upd["tip"]
        p["shipNote"] = upd["shipNote"]
        p["note"] = upd["note"]
        p["priceCheckedAt"] = CHECKED
        p["priceCheckedLabel"] = CHECKED_LABEL
        changed.append((pid, before, p["price"]))

    data["site"]["updatedAt"] = TODAY
    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # ── 가격 이력: 오늘 관측점 한 점 추가
    hist = json.loads(HIST.read_text(encoding="utf-8"))
    hprod = hist["products"]
    for pid, _, new_price in changed:
        entry = hprod[pid]
        series = entry["series"]
        if not any(s["date"] == TODAY for s in series):
            series.append({"date": TODAY, "price": new_price, "ts": TS, "src": "mart"})
        else:
            for s in series:
                if s["date"] == TODAY:
                    s["price"] = new_price
        entry["cardPrice"] = new_price
        entry["cardPriceCheckedAt"] = CHECKED
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
