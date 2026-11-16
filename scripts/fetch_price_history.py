#!/usr/bin/env python3
"""제로 음료 비교 마트의 가격 이력(data/price-history.json)을 만든다.

원칙(가짜 데이터 금지)
- 실제로 관측된 값만 쓴다. 없는 날짜를 채우거나 값을 만들어 넣지 않는다.
- 과거 이력은 공개 가격추적 사이트(쿠프라이스)가 쿠팡 판매가를 다시 확인해 남긴
  관측 기록만 가져온다. 그 기록의 itemId/vendorItemId가 우리 상품과 다르면 쓰지 않는다.
- 과거 기록이 없으면 "2026-11-16 추적 시작" 상태로 두고, 마트가 직접 확인한
  오늘 가격 한 점만 넣는다.

사용
    python3 scripts/fetch_price_history.py               # 전체 갱신
    python3 scripts/fetch_price_history.py --only a b    # 일부만 갱신(나머지 유지)
    python3 scripts/fetch_price_history.py --sleep 1.2   # 요청 간격
"""
from __future__ import annotations

import argparse
import json
import re
import sys
import time
import urllib.error
import urllib.request
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
PRODUCTS = ROOT / "data" / "products.json"
OUT = ROOT / "data" / "price-history.json"
RAW_DIR = ROOT.parent / "zero-mart-price-raw"

UA = (
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 "
    "(KHTML, like Gecko) Chrome/124.0 Safari/537.36"
)
BASE = "https://www.couprice.co.kr/products/x-"
KST = timezone(timedelta(hours=9))

SOURCES = {
    "couprice": {
        "name": "쿠프라이스",
        "url": "https://www.couprice.co.kr",
        "what": "쿠팡 판매가를 주기적으로 다시 확인해 남긴 공개 가격 관측 기록(최근 60일)",
    },
    "mart": {
        "name": "제로음료 비교 마트",
        "url": "https://zero-drink-mart.vercel.app",
        "what": "마트가 직접 확인한 판매가 스냅샷",
    },
}


def fetch(url: str, timeout: int = 25) -> str:
    req = urllib.request.Request(
        url, headers={"User-Agent": UA, "Accept-Language": "ko-KR,ko;q=0.9"}
    )
    with urllib.request.urlopen(req, timeout=timeout) as res:
        charset = res.headers.get_content_charset() or "utf-8"
        return res.read().decode(charset, errors="replace")


def flight_text(html: str) -> str:
    """Next.js RSC 페이로드(self.__next_f)를 이어 붙인 문자열."""
    blobs = re.findall(r'self\.__next_f\.push\(\[1,"(.*?)"\]\)', html, re.S)
    joined = "".join(blobs)
    try:
        joined = joined.encode("utf-8").decode("unicode_escape")
    except UnicodeDecodeError:
        pass
    return joined


def parse_points(text: str) -> list[dict]:
    pts = []
    for ts, price in re.findall(r'\{"recorded_at":"([^"]+)","price":(\d+)\}', text):
        price = int(price)
        if price > 0:
            pts.append({"ts": ts, "price": price})
    return pts


def parse_ids(text: str) -> dict:
    m = re.search(r"pageKey=(\d+)&itemId=(\d+)&vendorItemId=(\d+)", text)
    if not m:
        return {}
    return {"productId": m.group(1), "itemId": m.group(2), "vendorItemId": m.group(3)}


def parse_visible(html: str) -> dict:
    body = re.sub(r"<script.*?</script>", "", html, flags=re.S)
    txt = re.sub(r"<[^>]+>", " ", body)
    txt = re.sub(r"\s+", " ", txt)
    out: dict = {}
    for key, pat in (
        ("source60Min", r"60일 최저가 ([\d,]+) 원"),
        ("source60Max", r"60일 최고가 ([\d,]+) 원"),
        ("sourceRecords", r"가격 기록 전체 보기 \( *([\d,]+) *건\)"),
        ("sourceCurrent", r"현재가 ([\d,]+) 원"),
    ):
        m = re.search(pat, txt)
        if m:
            out[key] = int(m.group(1).replace(",", ""))
    out["sourceWarnsVolatile"] = "옵션이나 묶음 구성이 바뀌며 수집 가격이 크게 오르내린 상품" in txt
    return out


def to_kst_date(ts: str) -> str | None:
    try:
        dt = datetime.fromisoformat(ts)
    except ValueError:
        return None
    if dt.tzinfo is None:
        dt = dt.replace(tzinfo=timezone.utc)
    return dt.astimezone(KST).strftime("%Y-%m-%d")


def series_from_points(points: list[dict]) -> list[dict]:
    out = []
    for p in sorted(points, key=lambda x: x["ts"]):
        day = to_kst_date(p["ts"])
        if not day:
            continue
        out.append({"date": day, "price": p["price"], "ts": p["ts"], "src": "couprice"})
    return out


def stats(series: list[dict]) -> dict:
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


def product_ids(url: str) -> dict:
    m = re.search(r"/vp/products/(\d+)\?itemId=(\d+)&vendorItemId=(\d+)", url or "")
    if not m:
        return {}
    return {"productId": m.group(1), "itemId": m.group(2), "vendorItemId": m.group(3)}


def mart_point(product: dict) -> dict | None:
    price = product.get("price")
    checked = (product.get("priceCheckedAt") or "").strip()
    if not price or not re.match(r"^\d{4}-\d{2}-\d{2}", checked):
        return None
    day = checked[:10]
    ts = checked.replace(" ", "T")
    if re.match(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$", ts):
        ts = f"{ts}:00+09:00"
    else:
        ts = f"{day}T12:00:00+09:00"
    return {"date": day, "price": int(price), "ts": ts, "src": "mart"}


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--only", nargs="*", help="이 상품 id만 갱신")
    ap.add_argument("--sleep", type=float, default=1.0, help="요청 간 간격(초)")
    args = ap.parse_args()

    catalog = json.loads(PRODUCTS.read_text(encoding="utf-8"))
    targets = catalog["products"]
    if args.only:
        targets = [p for p in targets if p["id"] in set(args.only)]

    old: dict = {}
    if OUT.exists():
        try:
            old = json.loads(OUT.read_text(encoding="utf-8")).get("products", {})
        except json.JSONDecodeError:
            old = {}
    result: dict[str, dict] = {} if not args.only else {k: v for k, v in old.items() if k not in {p["id"] for p in targets}}

    RAW_DIR.mkdir(parents=True, exist_ok=True)
    tally = {"history": 0, "tracking-started": 0, "not-tracked": 0, "item-mismatch": 0, "no-records": 0, "error": 0}

    for i, p in enumerate(targets, 1):
        snapshot = mart_point(p)
        ids = product_ids(p.get("url", ""))
        entry: dict = {
            "id": p["id"],
            "name": p["name"],
            "platform": p.get("platform") or "coupang",
            "cardPrice": p.get("price"),
            "cardPriceCheckedAt": p.get("priceCheckedAt"),
            "cardListPrice": p.get("listPrice"),
        }

        if not ids:
            entry.update({"source": "mart", "status": "tracking-started", "statusDetail": "not-tracked"})
            entry["series"] = [snapshot] if snapshot else []
            entry["stats"] = stats(entry["series"])
            result[p["id"]] = entry
            tally["not-tracked"] += 1
            print(f"[{i}/{len(targets)}] {p['id']}: 추적 시작(과거 이력 조회 대상 아님)")
            continue

        url = f"{BASE}{ids['productId']}"
        try:
            html = fetch(url)
        except (urllib.error.URLError, urllib.error.HTTPError, TimeoutError) as e:
            entry.update({"source": "mart", "status": "tracking-started", "statusDetail": "fetch-error"})
            entry["series"] = [snapshot] if snapshot else []
            entry["stats"] = stats(entry["series"])
            entry["sourceUrl"] = url
            result[p["id"]] = entry
            tally["error"] += 1
            print(f"[{i}/{len(targets)}] {p['id']}: 조회 실패({e}) → 추적 시작", file=sys.stderr)
            time.sleep(args.sleep)
            continue

        (RAW_DIR / f"{ids['productId']}.html").write_text(html, encoding="utf-8")
        text = flight_text(html)
        points = parse_points(text)
        seen = parse_ids(text)
        vis = parse_visible(html)
        same_item = (seen.get("itemId") == ids["itemId"]) if seen.get("itemId") else None
        entry["sourceUrl"] = url
        entry["couprice"] = {"ids": seen, "sameItem": same_item, "crosscheck": vis}
        entry["coupang"] = ids

        if not points:
            entry.update({"source": "mart", "status": "tracking-started", "statusDetail": "no-records"})
            entry["series"] = [snapshot] if snapshot else []
            tally["no-records"] += 1
            print(f"[{i}/{len(targets)}] {p['id']}: 기록 없음 → 추적 시작")
        elif same_item is False:
            entry.update({"source": "mart", "status": "tracking-started", "statusDetail": "item-mismatch"})
            entry["series"] = [snapshot] if snapshot else []
            tally["item-mismatch"] += 1
            print(f"[{i}/{len(targets)}] {p['id']}: 다른 옵션 기록(itemId 불일치) → 추적 시작")
        else:
            series = series_from_points(points)
            if snapshot and series:
                last_ts = series[-1]["ts"]
                try:
                    if datetime.fromisoformat(snapshot["ts"]) > datetime.fromisoformat(last_ts):
                        series.append(snapshot)
                except ValueError:
                    pass
            elif snapshot and not series:
                series = [snapshot]
            entry.update({"source": "couprice+mart", "status": "history", "statusDetail": "ok"})
            entry["series"] = series
            entry["firstObservedAt"] = series[0]["ts"]
            entry["lastObservedAt"] = series[-1]["ts"]
            entry["stats"] = stats(series)
            tally["history"] += 1
            st = entry["stats"]
            print(f"[{i}/{len(targets)}] {p['id']}: {st['days']}일 {st['min']:,}~{st['max']:,} · 관측 {len(series)}회")

        entry["stats"] = stats(entry["series"])
        result[p["id"]] = entry
        time.sleep(args.sleep)

    # 카탈로그 순서 유지
    order = [p["id"] for p in catalog["products"]]
    ordered = {k: result[k] for k in order if k in result}
    for k, v in result.items():
        ordered.setdefault(k, v)

    payload = {
        "meta": {
            "generatedAt": datetime.now(KST).isoformat(timespec="seconds"),
            "sources": SOURCES,
            "rules": [
                "관측된 가격만 기록합니다. 없는 날짜를 채우거나 값을 만들지 않습니다.",
                "과거 이력은 쿠프라이스가 쿠팡 판매가를 다시 확인해 남긴 기록(최근 60일)만 씁니다.",
                "쿠프라이스 기록의 itemId/vendorItemId가 우리 상품과 다르면 그 기록은 쓰지 않습니다.",
                "과거 기록이 확인되지 않은 상품은 '추적 시작'으로 표시하고, 그날 확인한 가격 한 점만 남깁니다.",
                "쿠팡 판매가는 옵션·묶음 구성이 바뀌면 크게 오르내릴 수 있어 최고가·평균가는 참고값입니다.",
            ],
            "tally": tally,
        },
        "products": ordered,
    }
    OUT.write_text(json.dumps(payload, ensure_ascii=False, indent=1, separators=(",", ": ")) + "\n", encoding="utf-8")
    print(json.dumps(tally, ensure_ascii=False))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
