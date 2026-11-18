#!/usr/bin/env python3
"""더단백 40g 고함량 드링크 더블초코(350ml, 20개) 가격 정정 — r37 (2026-11-18 16:22).

재영 님이 쿠팡 상품 페이지에서 직접 확인한 값: 53,070원 → 51,170원 (34% 할인, 정가 78,000원).
data/products.json 과 js/products.js 를 같은 값으로 고치고, data/price-history.json 에
2026-11-18 16:22 관측점을 더합니다(관측된 값만 기록하는 규칙 그대로).

    python3 scripts/update_price_20261118_deodanbaek40g.py
"""
from __future__ import annotations

import json
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data"

PID = "deodanbaek-40g-gohamryang-deuringkeu-deobeulchoko-350ml-20gae"
OLD_PRICE = 53070
NEW_PRICE = 51170
LIST_PRICE = 78000
CHECKED_AT = "2026-11-18 16:22"
CHECKED_LABEL = "11/18 16:22 쿠팡 기준"
TS = "2026-11-18T16:22:00+09:00"
DAY = "2026-11-18"

BOTTLES = 20
ML = 350
PROTEIN_G = 40  # 1병 단백질


def derived() -> dict:
    total_ml = ML * BOTTLES
    per100ml = NEW_PRICE / total_ml * 100
    each = NEW_PRICE / BOTTLES
    per20 = NEW_PRICE / ((PROTEIN_G * BOTTLES) / 20)
    return {
        "price": NEW_PRICE,
        "priceCheckedAt": CHECKED_AT,
        "priceCheckedLabel": CHECKED_LABEL,
        "discountPct": round((1 - NEW_PRICE / LIST_PRICE) * 100),
        "unitPricePer100ml": round(per100ml),
        "unitPrice": f"100ml당 {round(per100ml):,}원",
        "eachPrice": round(each),  # 파이프라인과 같은 파이썬 반올림(짝수 반올림)
        "unitEach": f"1병당 {round(each):,}원",
        "perValue": round(per100ml, 1),
        "proteinPerG": round(NEW_PRICE / (PROTEIN_G * BOTTLES)),
        "protein20": round(per20),
        "pricePer20gProtein": round(per20),
        "lowest30d": NEW_PRICE,
        "previousPrice": OLD_PRICE,
        "priceHistoryDays": 2,
    }


def patch_block(path: Path, close_pat: str) -> None:
    """상품 하나의 블록 안에서만 값을 바꿉니다(나머지 줄은 그대로)."""
    text = path.read_text(encoding="utf-8")
    key = f'"id": "{PID}"'
    start = text.index(key)
    end = re.search(close_pat, text[start:])
    if not end:
        raise SystemExit(f"블록 끝을 찾지 못했습니다: {path}")
    block = text[start : start + end.start()]
    orig = block

    vals = derived()

    def setv(field: str, old, new, quote: bool) -> None:
        nonlocal block
        if quote:
            pattern = f'"{field}": "{old}"'
            repl = f'"{field}": "{new}"'
        else:
            pattern = f'"{field}": {json.dumps(old)}'
            repl = f'"{field}": {json.dumps(new)}'
        if pattern not in block:
            raise SystemExit(f"{path.name}: {field} = {old} 를 찾지 못했습니다")
        block = block.replace(pattern, repl, 1)

    # 가격·확인 시각
    setv("price", OLD_PRICE, vals["price"], False)
    setv("priceCheckedAt", "2026-11-15 20:00", vals["priceCheckedAt"], True)
    setv("priceCheckedLabel", "11/15 20:00 쿠팡 기준", vals["priceCheckedLabel"], True)
    # 단가
    setv("unitPricePer100ml", 758, vals["unitPricePer100ml"], False)
    setv("unitPrice", "100ml당 758원", vals["unitPrice"], True)
    setv("unitEach", "1병당 2,654원", vals["unitEach"], True)
    setv("eachPrice", 2654, vals["eachPrice"], False)
    setv("perValue", 758.1, vals["perValue"], False)
    setv("proteinPerG", 66, vals["proteinPerG"], False)
    setv("protein20", 1327, vals["protein20"], False)
    setv("pricePer20gProtein", 1327, vals["pricePer20gProtein"], False)
    # 할인·이력
    setv("discountPct", 31, vals["discountPct"], False)
    setv("previousPrice", None, vals["previousPrice"], False)
    setv("lowest30d", OLD_PRICE, vals["lowest30d"], False)
    setv("priceHistoryDays", 1, vals["priceHistoryDays"], False)

    if block == orig:
        raise SystemExit(f"{path.name}: 바뀐 값이 없습니다")
    path.write_text(text[:start] + block + text[start + end.start() :], encoding="utf-8")
    print(f"{path.relative_to(ROOT)} 갱신 완료")


def patch_history() -> None:
    path = DATA / "price-history.json"
    doc = json.loads(path.read_text(encoding="utf-8"))
    entry = doc["products"][PID]
    if any(s["date"] == DAY and s["price"] == NEW_PRICE for s in entry["series"]):
        print("price-history.json: 이미 오늘 관측점이 있습니다")
        return
    entry["cardPrice"] = NEW_PRICE
    entry["cardPriceCheckedAt"] = CHECKED_AT
    entry["series"].append({"date": DAY, "price": NEW_PRICE, "ts": TS, "src": "mart"})
    entry["series"].sort(key=lambda s: s["ts"])
    prices = [s["price"] for s in entry["series"]]
    lo = min(entry["series"], key=lambda s: s["price"])
    hi = max(entry["series"], key=lambda s: s["price"])
    entry["stats"] = {
        "min": lo["price"],
        "minDate": lo["date"],
        "max": hi["price"],
        "maxDate": hi["date"],
        "avg": round(sum(prices) / len(prices)),
        "latest": entry["series"][-1]["price"],
        "latestDate": entry["series"][-1]["date"],
        "observations": len(entry["series"]),
        "days": len({s["date"] for s in entry["series"]}),
    }
    doc["meta"]["generatedAt"] = datetime.fromisoformat(TS).isoformat(timespec="seconds")
    path.write_text(
        json.dumps(doc, ensure_ascii=False, indent=1, separators=(",", ": ")) + "\n",
        encoding="utf-8",
    )
    print("price-history.json 갱신 완료:", json.dumps(entry["stats"], ensure_ascii=False))


def main() -> int:
    print("계산값:", json.dumps(derived(), ensure_ascii=False))
    patch_block(DATA / "products.json", r"\n\s*\}")
    patch_block(ROOT / "js" / "products.js", r"\n\s*\}")
    patch_history()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
