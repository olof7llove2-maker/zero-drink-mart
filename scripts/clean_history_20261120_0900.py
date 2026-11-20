#!/usr/bin/env python3
"""r59에서 '다른 옵션 제거 시 관측 대부분이 사라진다'로 보류한 5종의 60일 이력을 정리한다 (r61).

원인: 쿠프라이스는 같은 상품 페이지(itemId 동일)의 **다른 수량 옵션** 가격까지 같은 기록에 섞는다.
      예) 클룹 애사비소다 500ml 12개 페이지 → 12개 옵션 14,000원과 24개 옵션 2만5~6천원대가 교차 기록.
정리 규칙(이번 런에서 확인한 현재가 기준):
      확인된 현재가의 0.75배 ~ 1.15배 안에 드는 기록만 남긴다.
      (같은 옵션의 프로모 하락은 남기고, 두 배 안팎의 다른 수량 옵션 값은 뺀다.)
각 상품의 현재가는 2026-11-20 오전 쿠팡 상품 페이지(또는 옵션 목록)에서 직접 확인한 값이다.

출력: data/price-history.json (meta.cleansing.resolved 에 근거 기록)
사용법: python3 scripts/clean_history_20261120_0900.py
"""
import importlib.util
import json
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
HIST = ROOT / "data" / "price-history.json"
PRODUCTS = ROOT / "data" / "products.json"

spec = importlib.util.spec_from_file_location("fph", ROOT / "scripts" / "fetch_price_history.py")
FPH = importlib.util.module_from_spec(spec)
spec.loader.exec_module(FPH)

KST = timezone(timedelta(hours=9))
BAND = (0.75, 1.15)

# id: (확인한 현재가, 확인 근거)
ANCHORS = {
    "amondeubeurijeu-nyuteuripeulreoseu-peurotin-190ml-24gae": (
        17450, "쿠팡 상품 페이지 24개 옵션 17,450원 (11-20 09:35 확인)"),
    "keulrup-aesabisoda-orijineol-tansaneumryo-500ml-12gae": (
        14000, "쿠팡 상품 페이지 12개 옵션 14,000원 (11-20 09:13 확인)"),
    "tamsaseupakeulring-peulrein-murabel-500ml-20gae": (
        8790, "쿠팡 상품 페이지 20개 옵션 8,790원, 40개 17,050원 (11-20 09:20 확인)"),
    "teurebi-peulrein-190ml-30gae": (
        9900, "쿠팡 상품 페이지 30개 9,900원, 60개 19,620원 (11-20 09:15 확인)"),
    "chojeongtansansu-190ml-30gae": (
        11900, "쿠팡 상품 페이지 30개 11,900원 (11-20 09:18 확인)"),
}


def main():
    hist = json.loads(HIST.read_text(encoding="utf-8"))
    cat = {p["id"]: p for p in json.loads(PRODUCTS.read_text(encoding="utf-8"))["products"]}
    resolved = []

    for pid, (anchor, evidence) in ANCHORS.items():
        p = cat[pid]
        ids = FPH.product_ids(p.get("url", ""))
        if not ids:
            print(f"{pid}: 상품 URL에 옵션 ID 없음 → 건너뜀")
            continue
        html = FPH.fetch(f"{FPH.BASE}{ids['productId']}")
        points = FPH.parse_points(FPH.flight_text(html))
        series = FPH.series_from_points(points)

        before = len(series)
        kept = [s for s in series if BAND[0] * anchor <= s["price"] <= BAND[1] * anchor]
        removed = [s for s in series if s not in kept]

        snapshot = FPH.mart_point(p)
        if snapshot and all(s["date"] != snapshot["date"] or s["price"] != snapshot["price"] for s in kept):
            kept.append(snapshot)
        kept.sort(key=lambda s: s["ts"])

        entry = hist["products"].setdefault(pid, {"id": pid, "name": p["name"], "platform": p.get("platform", "coupang")})
        entry.update(
            {
                "cardPrice": p["price"],
                "cardPriceCheckedAt": p.get("priceCheckedAt"),
                "cardListPrice": p.get("listPrice"),
                "source": "couprice+mart",
                "status": "history",
                "statusDetail": "same-option-only",
                "sourceUrl": f"{FPH.BASE}{ids['productId']}",
                "coupang": ids,
                "optionAnchor": anchor,
                "series": kept,
                "stats": FPH.stats(kept),
            }
        )
        if kept:
            entry["firstObservedAt"] = kept[0]["ts"]
            entry["lastObservedAt"] = kept[-1]["ts"]
        st = entry["stats"]
        print(
            f"{p['name']}: {before} → {len(kept)}개 기록 · "
            f"{st.get('min'):,}~{st.get('max'):,}원 · 평균 {st.get('avg'):,}원"
        )
        resolved.append(
            {
                "id": pid,
                "name": p["name"],
                "anchor": anchor,
                "anchorEvidence": evidence,
                "band": "현재가의 0.75~1.15배",
                "observationsBefore": before,
                "observationsAfter": len(kept),
                "removed": [{"date": s["date"], "price": s["price"]} for s in removed],
                "statsAfter": st,
            }
        )

    hist["meta"].setdefault("cleansing", {})["resovedAt"] = datetime.now(KST).isoformat(timespec="seconds")
    hist["meta"]["cleansing"]["resolvedAt"] = datetime.now(KST).isoformat(timespec="seconds")
    hist["meta"]["cleansing"]["resolvedBuild"] = "r61"
    hist["meta"]["cleansing"]["resolvedRule"] = (
        "r59에서 보류한 5종은 쿠팡 상품 페이지에서 같은 옵션의 현재가를 직접 확인한 뒤, "
        "현재가의 0.75~1.15배 밖에 있는 기록(같은 페이지의 다른 수량 옵션 값)만 제거했다. "
        "같은 옵션의 프로모 하락 기록은 남긴다."
    )
    hist["meta"]["cleansing"]["resolved"] = resolved
    hist["meta"]["cleansing"].pop("skipped", None)
    hist["meta"]["cleansing"]["previousSkipped"] = "r59에서 옵션 불일치로 보류한 5종 — r61에서 정리 완료"

    HIST.write_text(json.dumps(hist, ensure_ascii=False, indent=1, separators=(",", ": ")) + "\n", encoding="utf-8")
    print(f"\n{len(resolved)}종 정리 · data/price-history.json 갱신")


if __name__ == "__main__":
    main()
