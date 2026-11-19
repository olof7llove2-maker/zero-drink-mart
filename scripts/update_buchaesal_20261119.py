#!/usr/bin/env python3
"""2026-11-19 09:5x 부채살 3건 정리 (r43).

1) 링크 교체 — `meat-beef-au-buchaesal-steak-600g`
   옛 링크(7538803722)는 지금 1kg 52,290원 상품으로 바뀌어 600g 카드에 잘못 붙어 있었다.
   실제 600g 상품은 7858546638(호주산 부채살 **구이용** 냉장 600g, 24,900원·100g당 4,150원).
   → url/affiliateUrl 을 7858546638 600g 옵션으로 바꾸고, 이름·부위용도·평점(4.6·18,871)·
     정가(29,590원)·이미지(구이용 슬라이스)를 실제 페이지에 맞춘다.
   단, 이 상품은 쿠팡 파트너스에서 "법적으로 또는 판매자의 요청에 따라 링크 생성이 제한된
   상품" 이라 단축 링크를 만들 수 없다(옵션 URL·기본 URL 둘 다 거부 확인).
   → 제한 상품 처리 원칙대로 일반 쿠팡 링크로 연결하고 partners-restricted.json 에 넣는다(수수료 없음).
   쿠팡 표기 할인 배지 22%는 와우쿠폰 적용가(22,900원) 기준이라, 우리가 보여 주는 판매가
   24,900원과 맞도록 할인율은 16%(29,590 → 24,900)로 계산해 넣는다.

2) 신규 특가 2종 추가 (2026-11-19 09:50~09:55 상품 페이지 직접 확인, 쿠팡 로그인 세션 신*용)
   - 베스트밀 호주산 부채살 1.2kg(300g×4팩) 구이용: 37,900원(정가 42,600·11%·100g당 3,158원),
     평점 4.3·리뷰 355, 상품 8518594609-28075803379.
     아버님 파트너스 단축 링크: https://link.coupang.com/a/iNhb84e5ZI (lptag=AF5520784 확인)
   - 미트플렉스 미국산 초이스등급 냉장 부채살 900g: 31,920원(정가 39,900·20%·100g당 3,547원,
     "3일 남음" 특가), 평점 4.2·리뷰 13, 상품 9139983421-27912922979.
     아버님 파트너스 단축 링크: https://link.coupang.com/a/iNhd5zfpvN (lptag=AF5520784 확인)

출력: data/products.json, js/products.js, partners-links.json, partners-restricted.json,
      data/price-history.json(신규 2종 첫 관측점만 추가)
사용법: python3 scripts/update_buchaesal_20261119.py
"""
import json
import math
from datetime import datetime, timedelta, timezone
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"
LINKS = ROOT / "partners-links.json"
RESTRICTED = ROOT / "partners-restricted.json"
HIST = ROOT / "data" / "price-history.json"
KST = timezone(timedelta(hours=9))

CHECKED = "2026-11-19 09:55"
CHECKED_LABEL = "11/19 09:55 쿠팡 기준"

# ── 1) 600g 카드 (id는 가격 이력이 붙어 있어 그대로 두고 내용만 실제 상품에 맞춘다)
B600_URL = "https://www.coupang.com/vp/products/7858546638?itemId=22350737406&vendorItemId=89395861033"

B600 = {
    "name": "호주산 부채살 구이용 (냉장), 600g, 1개",
    "kind": "호주산 부채살 · 구이용",
    "cutGroup": "부채살(구이용)",
    "price": 24900,
    "listPrice": 29590,
    "discountPct": 16,
    "url": B600_URL,
    # 파트너스 링크 생성 제한 상품 → 일반 상품 링크로 연결(수수료 없음)
    "affiliateUrl": B600_URL,
    "image": "images/meat-beef-au-buchaesal-steak-600g.jpg",
    "rating": 4.6,
    "reviewCount": 18871,
    "weightG": 600,
    "unitEach": "600g 1팩",
    "priceCheckedAt": CHECKED,
    "priceCheckedLabel": CHECKED_LABEL,
    "shipNote": "로켓프레시 · 오늘(목) 저녁 8시 전 도착",
    "note": (
        "24,900원(100g당 4,150원) 호주산 부채살 구이용 냉장 600g이에요. 정가 29,590원이고 "
        "로켓와우 쿠폰을 받으면 22,900원(100g당 3,817원)까지 내려가요(쿠팡 표기 22%는 이 쿠폰가 기준). "
        "평점 4.6·리뷰 18,871. 이 상품은 판매자 요청으로 쿠팡 파트너스 링크가 막혀 있어 일반 쿠팡 링크로 연결했어요(수수료 없음)."
    ),
}

# ── 2) 신규 특가 2종
BESTEUMIL_URL = "https://www.coupang.com/vp/products/8518594609?itemId=28075803379&vendorItemId=95032345917"
BESTEUMIL_LINK = "https://link.coupang.com/a/iNhb84e5ZI"
MITEU_URL = "https://www.coupang.com/vp/products/9139983421?itemId=27912922979&vendorItemId=93875429559"
MITEU_LINK = "https://link.coupang.com/a/iNhd5zfpvN"

BESTEUMIL = {
    "id": "meat-beef-besteumil-au-buchaesal-gui-1-2kg",
    "part": "meat",
    "category": "beef",
    "categoryId": "beef",
    "group": "소고기",
    "meatType": "소고기",
    "cut": "부채살",
    "cutGroup": "부채살(구이용)",
    "brand": "베스트밀",
    "name": "베스트밀 호주산 부채살 1.2kg (300g×4팩) 구이용 고단백 캠핑 소고기, 300g, 4개",
    "kind": "호주산 부채살 · 구이용 1.2kg(300g×4팩)",
    "price": 37900,
    "listPrice": 42600,
    "discountPct": 11,
    "priceCheckedAt": CHECKED,
    "priceCheckedLabel": CHECKED_LABEL,
    "platform": "coupang",
    "url": BESTEUMIL_URL,
    "affiliateUrl": BESTEUMIL_LINK,
    "image": "images/meat-beef-besteumil-au-buchaesal-gui-1-2kg.jpg",
    "rating": 4.3,
    "reviewCount": 355,
    "weightG": 1200,
    "packCount": 4,
    "eachPrice": 9475,
    "eachLabel": "팩",
    "unitEach": "1팩(300g)당 9,475원",
    "proteinPer100g": 20.4,
    "fatPer100g": 6.9,
    "nutritionBasis": "부위 기준 참고치",
    "nutritionNote": "제품 영양성분표가 없는 원물이라 국가표준식품성분표·USDA 부위 표준값 참고치예요",
    "nutritionLabel": "100g당 단백질 ~20.4g · 지방 ~6.9g (부위 기준)",
    "measure": "per100g",
    "shipNote": "무료배송 · 내일(금) 도착 예정",
    "note": (
        "42,600원 → 37,900원(100g당 3,158원, 11% 할인), 300g씩 4팩 개별포장 1.2kg이에요. "
        "평점 4.3·리뷰 355. 같은 부채살 600g 냉장(100g당 4,150원)보다 100g당 24% 싸요. "
        "아버님 쿠팡 파트너스 단축 링크로 연결했어요."
    ),
}

MITEU = {
    "id": "meat-beef-miteupeullekseu-us-choice-buchaesal-900g",
    "part": "meat",
    "category": "beef",
    "categoryId": "beef",
    "group": "소고기",
    "meatType": "소고기",
    "cut": "부채살",
    "cutGroup": "부채살(스테이크용)",
    "brand": "미트플렉스",
    "name": "[미트플렉스] 미국산 소고기 초이스등급 냉장 부채살, 900g, 1개",
    "kind": "미국산 초이스 · 냉장 900g",
    "price": 31920,
    "listPrice": 39900,
    "discountPct": 20,
    "priceCheckedAt": CHECKED,
    "priceCheckedLabel": CHECKED_LABEL,
    "platform": "coupang",
    "url": MITEU_URL,
    "affiliateUrl": MITEU_LINK,
    "image": "images/meat-beef-miteupeullekseu-us-choice-buchaesal-900g.jpg",
    "rating": 4.2,
    "reviewCount": 13,
    "weightG": 900,
    "unitEach": "900g 1팩",
    "proteinPer100g": 20.4,
    "fatPer100g": 6.9,
    "nutritionBasis": "부위 기준 참고치",
    "nutritionNote": "제품 영양성분표가 없는 원물이라 국가표준식품성분표·USDA 부위 표준값 참고치예요",
    "nutritionLabel": "100g당 단백질 ~20.4g · 지방 ~6.9g (부위 기준)",
    "measure": "per100g",
    "shipNote": "무료배송 · 내일(금) 도착 예정 · 20% 특가 3일 남음",
    "note": (
        "39,900원 → 31,920원(100g당 3,547원, 20% 할인)으로 3일 한정 특가예요. "
        "USDA 초이스등급 미국산 부채살 냉장 900g 한 팩, 평점 4.2·리뷰 13. "
        "마트에서 100g당 3,500원대 부채살 중 가장 싼 축이라 특가 2종에 넣었어요. "
        "아버님 쿠팡 파트너스 단축 링크로 연결했어요."
    ),
}


def brand_weight(brand):
    # build_v5_20261117.py 기준: 대표·준주력 목록에 없는 브랜드는 6점
    return 6


def half_up(x):
    return int(math.floor(x + 0.5))


def popular_score(p):
    score = brand_weight(p.get("brand"))
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


def build(p):
    out = dict(p)
    price = out["price"]
    per100 = price / out["weightG"] * 100
    out["per100g"] = half_up(per100)
    out["perValue"] = round(per100, 1)
    out["unitPrice"] = f"100g당 {half_up(per100):,}원"
    out.setdefault("eachPrice", None)
    if out.get("proteinPer100g"):
        out["protein20"] = half_up(half_up(per100) / out["proteinPer100g"] * 20)
        out["pricePer20gProtein"] = out["protein20"]
    else:
        out["protein20"] = None
    out["popularScore"] = popular_score(out)
    return out


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


def write_js(data):
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


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    # 1) 600g 카드 갱신
    pid = "meat-beef-au-buchaesal-steak-600g"
    if pid not in by_id:
        raise SystemExit(f"상품을 찾지 못했습니다: {pid}")
    card = by_id[pid]
    old_image_url = card.get("url")
    for k, v in build({**B600, "proteinPer100g": card["proteinPer100g"]}).items():
        card[k] = v
    print(f"[교체] {card['name']}\n  링크 {old_image_url}\n     → {card['url']}")
    print(
        f"  {card['price']:,}원 (정가 {card['listPrice']:,}·{card['discountPct']}% · {card['unitPrice']} · "
        f"평점 {card['rating']}·리뷰 {card['reviewCount']:,}) · affiliateUrl 일반 링크"
    )

    # 2) 신규 2종
    added, updated = [], []
    for row in (BESTEUMIL, MITEU):
        prod = build(row)
        if prod["id"] in by_id:
            by_id[prod["id"]].update(prod)
            updated.append(prod["id"])
        else:
            data["products"].append(prod)
            added.append(prod["id"])
        print(
            f"[신규] {prod['name']}\n  {prod['price']:,}원 (정가 {prod['listPrice']:,}·{prod['discountPct']}% · "
            f"{prod['unitPrice']} · {prod['unitEach']} · 단백질20g당 {prod['protein20']:,}원 · "
            f"popularScore {prod['popularScore']}) → {prod['affiliateUrl']}"
        )

    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")
    write_js(data)

    # 3) 링크 장부
    links = json.loads(LINKS.read_text(encoding="utf-8"))
    links[BESTEUMIL["id"]] = BESTEUMIL_LINK
    links[MITEU["id"]] = MITEU_LINK
    LINKS.write_text(json.dumps(links, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    restricted = json.loads(RESTRICTED.read_text(encoding="utf-8"))
    if pid not in restricted:
        restricted.append(pid)
        restricted.sort()
    RESTRICTED.write_text(json.dumps(restricted, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # 4) 가격 이력 — 신규 2종은 오늘 첫 관측점만 추가(기존 이력은 그대로)
    hist = json.loads(HIST.read_text(encoding="utf-8"))
    stamp = CHECKED.replace(" ", "T") + ":00+09:00"
    by_id = {p["id"]: p for p in data["products"]}
    for row in (BESTEUMIL, MITEU):
        prod = by_id[row["id"]]
        entry = hist["products"].get(prod["id"])
        if entry is not None:
            continue
        series = [{"date": CHECKED[:10], "price": prod["price"], "ts": stamp, "src": "mart"}]
        hist["products"][prod["id"]] = {
            "id": prod["id"],
            "name": prod["name"],
            "platform": "coupang",
            "cardPrice": prod["price"],
            "cardPriceCheckedAt": CHECKED,
            "cardListPrice": prod["listPrice"],
            "source": "mart",
            "status": "tracking-started",
            "statusDetail": "not-tracked",
            "series": series,
            "stats": stats(series),
            "firstObservedAt": stamp,
            "latestObservedAt": stamp,
            "sourceUrl": f"https://www.couprice.co.kr/products/x-{prod['url'].split('/products/')[1].split('?')[0]}",
        }
        print(f"[이력] {prod['id']} 첫 관측점 {prod['price']:,}원 추가")

    hist["meta"]["generatedAt"] = datetime.now(KST).isoformat(timespec="seconds")
    HIST.write_text(
        json.dumps(hist, ensure_ascii=False, indent=1, separators=(",", ": ")) + "\n",
        encoding="utf-8",
    )

    counts = {}
    for p in data["products"]:
        counts[p["part"]] = counts.get(p["part"], 0) + 1
    print(f"\n신규 {added} 갱신 {updated}")
    print(f"상품 {len(data['products'])}종 {counts}")


if __name__ == "__main__":
    main()
