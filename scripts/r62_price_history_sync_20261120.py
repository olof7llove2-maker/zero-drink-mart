#!/usr/bin/env python3
"""r62 — 압축한 30종의 가격 이력에 오늘(2026-11-20) 직접 확인한 값을 반영한다.

- 카드 값(cardPrice·cardPriceCheckedAt·cardListPrice)을 products.json 과 맞춘다.
- series 에 오늘 확인값(mart)을 그 날짜의 점으로 넣는다(같은 날짜 점은 교체).
- stats(min/max/avg/latest)를 다시 계산한다.

사용법: python3 scripts/r62_price_history_sync_20261120.py
"""
import importlib.util
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
HIST = ROOT / "data" / "price-history.json"

spec = importlib.util.spec_from_file_location("fph", ROOT / "scripts" / "fetch_price_history.py")
FPH = importlib.util.module_from_spec(spec)
spec.loader.exec_module(FPH)


def main():
    products = json.loads(DATA.read_text(encoding="utf-8"))["products"]
    hist = json.loads(HIST.read_text(encoding="utf-8"))
    touched = 0
    for p in products:
        e = hist["products"].get(p["id"])
        if not e:
            e = {"id": p["id"], "name": p["name"], "platform": p.get("platform") or "coupang", "series": []}
            hist["products"][p["id"]] = e
        e["name"] = p["name"]
        e["platform"] = p.get("platform") or "coupang"
        e["cardPrice"] = p["price"]
        e["cardPriceCheckedAt"] = p["priceCheckedAt"]
        e["cardListPrice"] = p.get("listPrice")
        checked = p["priceCheckedAt"]
        day = checked[:10]
        ts = checked.replace(" ", "T") + ":00+09:00"
        series = [s for s in e.get("series", []) if s.get("date") != day]
        series.append({"date": day, "price": p["price"], "ts": ts, "src": "mart"})
        series.sort(key=lambda s: s["ts"])
        e["series"] = series
        e["stats"] = FPH.stats([{"date": s["date"], "price": s["price"], "ts": s["ts"], "src": s["src"]} for s in series])
        e["lastObservedAt"] = series[-1]["ts"]
        touched += 1
    # 카탈로그 순서로 정리
    order = [p["id"] for p in products]
    hist["products"] = {k: hist["products"][k] for k in order if k in hist["products"]}
    HIST.write_text(json.dumps(hist, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    print(f"가격 이력 {touched}종 오늘 값 반영")


if __name__ == "__main__":
    main()
