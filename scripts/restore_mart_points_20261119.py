#!/usr/bin/env python3
"""가격 이력 재수집 때 사라진 '마트 직접 확인' 관측점을 되살린다.

`fetch_price_history.py` 는 쿠프라이스 페이지를 못 받아오면(404·차단) 그 상품의
series 를 "오늘 확인한 한 점"으로 다시 만든다. 그래서 우리가 직접 확인해 남긴
과거 관측점(mart)이 함께 지워질 수 있다. 쿠프라이스가 주는 60일 창 밖으로
밀려난 기록은 그대로 두고, 60일 안의 mart 관측점만 다시 붙인다.

입력: work/zero-mart-backup-20261119/price-history.json (재수집 직전 상태)
출력: data/price-history.json

사용법: python3 scripts/restore_mart_points_20261119.py
"""
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HIST = ROOT / "data" / "price-history.json"
BACKUP = ROOT.parent / "zero-mart-backup-20261119" / "price-history.json"
KST = timezone(timedelta(hours=9))
WINDOW_START = "2026-09-20"  # 60일 창 (2026-11-19 기준)


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
    cur = json.loads(HIST.read_text(encoding="utf-8"))
    old = json.loads(BACKUP.read_text(encoding="utf-8"))["products"]
    restored = 0
    for pid, entry in cur["products"].items():
        prev = old.get(pid)
        if not prev:
            continue
        series = entry.get("series") or []
        seen = {s["ts"] for s in series}
        add = [
            s
            for s in prev.get("series", [])
            if s.get("src") == "mart" and s["ts"] not in seen and s["date"] >= WINDOW_START
        ]
        if not add:
            continue
        series = sorted(series + add, key=lambda s: s["ts"])
        entry["series"] = series
        entry["stats"] = stats(series)
        entry["firstObservedAt"] = series[0]["ts"]
        entry["latestObservedAt"] = series[-1]["ts"]
        restored += len(add)
        print(f"{pid}: {len(add)}점 복원 → {len(series)}점 ({series[0]['date']}~{series[-1]['date']})")

    cur["meta"]["generatedAt"] = datetime.now(KST).isoformat(timespec="seconds")
    HIST.write_text(
        json.dumps(cur, ensure_ascii=False, indent=1, separators=(",", ": ")) + "\n",
        encoding="utf-8",
    )
    print(f"\n복원한 관측점 {restored}개 · data/price-history.json 저장")


if __name__ == "__main__":
    main()
