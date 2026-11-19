#!/usr/bin/env python3
"""2026-11-19 09:00 정기 가격 점검 반영.

- 실제 상품 페이지에서 직접 확인한 값만 반영한다(쿠팡 로그인 세션, 09:09~09:12 KST).
  · 더단백 40g 고함량 드링크 더블초코 350ml 20개: 51,300 → 51,840원 (33%, 정가 78,000원)
    → 07:30 점검이 남긴 53,010원은 그 사이 값이 다시 내려가 오늘 09:09 기준 51,840원이다.
  · 나랑드사이다 제로 245ml 30개: 12,770원 그대로 (확인 시각만 오늘로)
  · 나랑드사이다 제로 500ml 24개: 15,250원 그대로 (확인 시각만 오늘로)
- `affiliateUrl`·`url`·`image`는 손대지 않는다.
- data/price-history.json 에 세 상품의 오늘 관측점을 덧붙이고(기존 이력 유지) 통계를 다시 계산한다.

사용법: python3 scripts/update_prices_20261119_0900.py
"""
import importlib
import json
import sys
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent
sys.path.insert(0, str(ROOT))

U = importlib.import_module("update_prices_20261118")

DATA = U.DATA
JS = U.JS
HIST = U.ROOT / "data" / "price-history.json"
KST = timezone(timedelta(hours=9))

# id: (새 가격, 확인 시각)
UPDATES = {
    "deodanbaek-40g-gohamryang-deuringkeu-deobeulchoko-350ml-20gae": (51840, "2026-11-19 09:09"),
    "narangd-cider-zero": (12770, "2026-11-19 09:12"),
    "narangdeusaida-jero-500ml-24gae": (15250, "2026-11-19 09:12"),
}

# 확인 시각을 오늘로 올리며 남길 메모(가격이 그대로인 상품만)
NOTES = {
    "deodanbaek-40g-gohamryang-deuringkeu-deobeulchoko-350ml-20gae": (
        "상품 페이지에서 51,840원·33%·정가 78,000원·100ml당 74원(쿠팡 표기) 직접 확인"
        "(11/19 09:09). 11/18 18:50에 넣은 51,300원보다 540원 올랐고, "
        "07:30 점검의 53,010원보다는 1,170원 내렸다. 단백질 40g×20병=800g 기준 20g당 1,296원."
    ),
    "narangd-cider-zero": "11/19 09:12 상품 페이지에서 12,770원·14%(정가 15,000원) 그대로 확인.",
    "narangdeusaida-jero-500ml-24gae": (
        "11/19 09:12 같은 상품 페이지의 나랑드 다른 상품 목록에서 15,250원(100ml당 127원) 확인."
    ),
}


def stats(series):
    if not series:
        return {}
    prices = [s["price"] for s in series]
    lo = min(series, key=lambda s: s["price"])
    hi = max(series, key=lambda s: s["price"])
    return {
        "min": lo["price"],
        "minDate": lo["date"],
        "max": hi["price"],
        "maxDate": hi["date"],
        "avg": round(sum(prices) / len(prices)),
        "latest": series[-1]["price"],
        "latestDate": series[-1]["date"],
        "observations": len(series),
        "days": len({s["date"] for s in series}),
    }


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}
    missing = [k for k in UPDATES if k not in by_id]
    if missing:
        raise SystemExit(f"상품을 찾지 못했습니다: {missing}")

    hist = json.loads(HIST.read_text(encoding="utf-8"))

    for pid, (price, ts) in UPDATES.items():
        p = by_id[pid]
        old = U.refresh(p, price, ts)
        if pid == "deodanbaek-40g-gohamryang-deuringkeu-deobeulchoko-350ml-20gae":
            p["previousPrice"] = old
            p["unitPriceOfficial"] = f"100ml당 {p['perValue']:.0f}원"
            # 쿠팡이 실제로 표시하는 배지(33%)와 맞춘다 (계산값 33.54% → 34로 반올림됨)
            p["discountPct"] = 33
        if pid in NOTES:
            p["note"] = NOTES[pid]
        arrow = "↓" if price < old else ("↑" if price > old else "=")
        print(
            f"{p['name']}\n  {old:,}원 {arrow} {price:,}원 "
            f"({p['discountPct']}% · {p['unitPrice']} · {p['unitEach']}"
            + (f" · 단백질20g당 {p['protein20']:,}원" if p.get("protein20") else "")
            + f") [{p['priceCheckedLabel']}]"
        )

        # 가격 이력: 기존 시리즈 유지 + 오늘 확인점 추가
        entry = hist["products"].get(pid)
        if entry is None:
            continue
        series = entry.get("series") or []
        stamp = ts.replace(" ", "T") + ":00+09:00"
        if not any(s["ts"] == stamp for s in series):
            series.append({"date": ts[:10], "price": price, "ts": stamp, "src": "mart"})
        series.sort(key=lambda s: s["ts"])
        entry["series"] = series
        entry["stats"] = stats(series)
        entry["cardPrice"] = price
        entry["cardPriceCheckedAt"] = ts
        entry["latestObservedAt"] = series[-1]["ts"]
        if entry.get("status") == "history":
            entry["source"] = "couprice+mart"

    hist["meta"]["generatedAt"] = datetime.now(KST).isoformat(timespec="seconds")
    HIST.write_text(
        json.dumps(hist, ensure_ascii=False, indent=1, separators=(",", ": ")) + "\n",
        encoding="utf-8",
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
    print(f"\n상품 {len(data['products'])}종 · products.json + products.js + price-history.json 동기화 완료")


if __name__ == "__main__":
    main()
