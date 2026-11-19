#!/usr/bin/env python3
"""r59 — 60일 가격 이력 오염값(clensing) 정리.

왜: 쿠프라이스 기록에는 같은 상품 페이지의 **다른 옵션(묶음 수량) 가격**이 섞여 들어옵니다.
    갈배사이다 24개 상품에 12개 가격(5,590원)이 찍히는 식이에요. 그 값이 남아 있으면
    '역대 최저' 판정과 평균가가 실제보다 낮게(또는 높게) 왜곡됩니다.

어떻게(보수적으로, 기준은 '지금 확인한 가격'):
  1) 기준선 = 카드에 적힌 현재가(cardPrice). 현재가가 없을 때만 관측값 중앙값을 씁니다.
  2) 기준선의 50% 미만이거나 175% 초과인 관측값만 같은 상품의 다른 옵션(묶음 수량) 값으로 보고 뺍니다.
     예) 갈배사이다 24개 13,220원 → 6,610원 미만(12개 가격 5,590원) · 23,135원 초과만 제거.
  3) 한 상품에서 40% 넘게 빠지면 그 상품은 건드리지 않고 meta 에 '손대지 않음'으로 남깁니다
     (가격이 정말 크게 바뀐 상품일 수 있어 이력 자체를 지우지 않습니다).
  4) 뺀 뒤 통계(최저·최고·평균·관측 수)를 다시 계산하고, 남은 점이 5개 미만이거나
     날짜가 하루뿐이면 '추적 시작' 상태로 되돌립니다.
  5) 무엇을 뺐는지 meta.cleansing 에 상품별로 남깁니다(나중에 되돌아볼 수 있게).

원칙: 값을 새로 만들지 않습니다 — 관측된 값 중 명백한 타옵션 값만 제거합니다.
"""
import json
import statistics
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "price-history.json"

LOW = 0.50
HIGH = 1.75
MAX_DROP_SHARE = 0.40
MIN_OBS = 5


def stats_of(series):
    prices = [x["price"] for x in series]
    lo = min(series, key=lambda x: x["price"])
    hi = max(series, key=lambda x: x["price"])
    last = series[-1]
    dates = sorted({x["date"] for x in series})
    return {
        "min": lo["price"],
        "minDate": lo["date"],
        "max": hi["price"],
        "maxDate": hi["date"],
        "avg": round(sum(prices) / len(prices)),
        "latest": last["price"],
        "latestDate": last["date"],
        "observations": len(series),
        "days": len(dates),
    }


def main():
    doc = json.loads(DATA.read_text(encoding="utf-8"))
    products = doc["products"]
    cleaned = []
    skipped = []

    for pid, entry in products.items():
        series = entry.get("series") or []
        if entry.get("status") != "history" or len(series) < MIN_OBS:
            continue
        card = entry.get("cardPrice")
        anchor = card if isinstance(card, (int, float)) and card > 0 else statistics.median(
            [x["price"] for x in series]
        )
        lo_cut = anchor * LOW
        hi_cut = anchor * HIGH
        keep = [x for x in series if lo_cut <= x["price"] <= hi_cut]
        dropped = [x for x in series if not (lo_cut <= x["price"] <= hi_cut)]
        if not dropped:
            continue
        if len(dropped) / len(series) > MAX_DROP_SHARE or len(keep) < 3:
            skipped.append(
                {
                    "id": pid,
                    "name": entry.get("name"),
                    "reason": "removal-would-erase-majority"
                    if len(dropped) / len(series) > MAX_DROP_SHARE
                    else "kept-too-few",
                    "anchor": anchor,
                    "observations": len(series),
                    "wouldRemove": len(dropped),
                    "sample": [x["price"] for x in dropped[:6]],
                }
            )
            continue

        before = entry.get("stats") or {}
        entry["series"] = keep
        entry["stats"] = stats_of(keep)
        if entry["stats"]["observations"] < MIN_OBS or entry["stats"]["days"] < 2:
            entry["status"] = "tracking-started"
            entry["statusDetail"] = "ok"
        cleaned.append(
            {
                "id": pid,
                "name": entry.get("name"),
                "cardPrice": card,
                "anchor": anchor,
                "window": [round(lo_cut), round(hi_cut)],
                "removed": [{"date": x["date"], "price": x["price"]} for x in dropped],
                "statsBefore": {k: before.get(k) for k in ("min", "max", "avg", "observations")},
                "statsAfter": {k: entry["stats"][k] for k in ("min", "max", "avg", "observations")},
            }
        )

    meta = doc.setdefault("meta", {})
    meta["cleansing"] = {
        "at": "2026-11-19",
        "build": "r59",
        "rule": (
            "기준선 = 카드 현재가(cardPrice). 기준선의 50% 미만 또는 175% 초과 = 같은 상품 페이지의 "
            "다른 옵션(묶음 수량) 값으로 보고 제거. 한 상품에서 40% 넘게 빠지면 손대지 않음. "
            "제거 후 통계 재계산."
        ),
        "cleaned": cleaned,
        "skipped": skipped,
    }
    DATA.write_text(json.dumps(doc, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    print(f"정리한 상품 {len(cleaned)}개 / 손대지 않은 상품 {len(skipped)}개")
    for row in cleaned:
        removed = ", ".join(f"{x['date']} {x['price']:,}원" for x in row["removed"])
        print(
            f"- {row['name']} (현재 {row['cardPrice']:,}원)\n"
            f"    뺀 값: {removed}\n"
            f"    최저 {row['statsBefore']['min']:,}→{row['statsAfter']['min']:,} · "
            f"최고 {row['statsBefore']['max']:,}→{row['statsAfter']['max']:,} · "
            f"평균 {row['statsBefore']['avg']:,}→{row['statsAfter']['avg']:,} · "
            f"관측 {row['statsBefore']['observations']}→{row['statsAfter']['observations']}"
        )
    for row in skipped:
        print(f"! 손대지 않음 {row['name']} ({row['reason']}, {row['wouldRemove']}/{row['observations']})")


if __name__ == "__main__":
    main()
