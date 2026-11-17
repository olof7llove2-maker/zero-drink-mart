#!/usr/bin/env python3
"""🥩 식단 고기 정예화·프리미엄 분리 (2026-11-17).

재영 님 지시
  - "비싼고기도 냅둬 근데 밑에둬" → 기존 고기는 삭제하지 않는다.
  - "프리미엄 돌리자 카테고리 바꿔서", "5000원 넘어가면 프리미엄으로 돌려"
    → 100g당 5,000원 이상 고기는 category=premium (조리기구 제외). 기본 목록 맨 아래.
  - 눈 돌아가는 초특가(소 1,800~2,800 / 돼지 900~1,700 / 닭 700~1,100원대) 신규 추가.

출력: data/products.json, js/products.js
사용법: python3 scripts/add_meat_deals_20261117.py
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

CHECKED = "2026-11-17 14:20"
CHECKED_LABEL = "11/17 14:20 쿠팡 검색 기준"
AFF_NOTE = "아버님 파트너스 단축 링크는 다음 일괄 발급 때 붙일 예정이라 지금은 쿠팡 일반 상품 링크예요."


def cp(pid, item_id=None):
    url = f"https://www.coupang.com/vp/products/{pid}"
    if item_id:
        url += f"?itemId={item_id}"
    return url


# (id, category, brand, name, kind, price, listPrice, discountPct, weightG, packCount,
#  rating, reviewCount, url, imageRemote, note)
NEW = [
    # ── 소고기 ─────────────────────────────────────────────
    dict(id="meat-beef-gomgom-daepae-woosamgyup-1kg", category="beef", brand="곰곰",
         name="곰곰 대패 우삼겹 (냉동), 1kg, 1개", kind="미국산 우삼겹 · 대패구이",
         price=16190, listPrice=19490, discountPct=16, weightG=1000, packCount=1,
         rating=5.0, reviewCount=82876, url=cp(8336308869, 24564131696),
         image="retail/images/221605937416791-77f4bb69-0af5-44ba-9ac8-4fca6aaf3f5f.jpg",
         note="로켓프레시. 19,490원 → 16,190원(100g당 1,619원). 리뷰 8.2만건·평점 5.0. 구이·샤브 겸용 대패 우삼겹 100g당 1,600원대."),
    dict(id="meat-beef-ouratown-woosamgyup-1kg", category="beef", brand="우리아파트정육점",
         name="우리아파트정육점 돌돌말이 우삼겹 대패 1kg (냉동), 1개", kind="미국산 우삼겹 · 2mm 대패",
         price=14600, listPrice=18100, discountPct=19, weightG=1000, packCount=1,
         rating=4.5, reviewCount=147, url=cp(9555147033, 28511311199),
         image="vendor_inventory/181a/13531a5fb4d261b485cb7b67e811cc20f23d0eb20858bbb8686fbb5ffc30.png",
         note="18,100원 → 14,600원(100g당 1,460원). 무료배송·오늘출발. 1kg 1,460원대로 이번 조사에서 가장 싼 우삼겹 중 하나."),
    dict(id="meat-beef-dongwon-5cho-woosamgyup-2kg", category="beef", brand="동원",
         name="동원 5초 구이 미국산 우삼겹 (냉동), 2kg, 1개", kind="미국산 우삼겹 · 구이용",
         price=34900, listPrice=45900, discountPct=23, weightG=2000, packCount=1,
         rating=4.5, reviewCount=4221, url=cp(7045700926, 17435874571),
         image="retail/images/713915010901940-18624fb2-54e2-4167-84b3-0e1d7b995efb.jpg",
         note="45,900원 → 34,900원(100g당 1,745원). 대기업 브랜드 2kg 대용량, 새벽도착. 100g당 1,700원대."),
    dict(id="meat-beef-deoyeppeunhanwoo-buchaesal-1kg", category="beef", brand="더예쁜한우",
         name="수입 부채살 구이용 1kg (500g×2ea) 냉동, 1개", kind="수입산 부채살 · 500g 소분 2팩",
         price=26900, listPrice=48400, discountPct=44, weightG=1000, packCount=2,
         rating=4.0, reviewCount=81, url=cp(9452841425, 21518412172),
         image="vendor_inventory/8c42/114262415b425012e51baf9c23966dc7db713b8a40e87add268d43061232.png",
         note="48,400원 → 26,900원(100g당 2,690원) 44% 할인. 무료배송·오늘출발. 평점 4.0·리뷰 81건이라 후기는 적어요."),
    dict(id="meat-beef-au-buchaesal-cube-1kg", category="beef", brand="프리미엄 호주산",
         name="프리미엄 호주산 부채살 큐브 1kg, 구이·챱스테이크·국거리용", kind="호주산 부채살 큐브 · 식단용",
         price=27630, listPrice=34540, discountPct=20, weightG=1000, packCount=1,
         rating=4.5, reviewCount=29, url=cp(9443025250, 28087034212),
         image="vendor_inventory/563e/8060835d1957fcd941033c65012a4986456800d0701f7d26dc3af8323764.jpg",
         note="34,540원 → 27,630원(100g당 2,763원). 무료배송·무료반품. 큐브라 식단용으로 쓰기 좋아요(리뷰 29건)."),
    dict(id="meat-beef-luckymeat-bolsal-1kg", category="beef", brand="럭키미트",
         name="럭키미트 수입산 소고기 우볼살 1kg (냉동), 1개", kind="수입산 우볼살 · 수육·곰탕용",
         price=23500, listPrice=40000, discountPct=41, weightG=1000, packCount=1,
         rating=5.0, reviewCount=17, url=cp(9709202175, 29048863478),
         image="image_audit/stage/manual/ec8d7d0382f9179ab3f8f49bdb1eaa124d4edd40f9268913451692184e3e_1793870559907.jpeg",
         note="40,000원 → 23,500원(100g당 2,350원) 41% 할인. 무료배송·오늘출발. 수육·곰탕용 특수부위(리뷰 17건)."),
    # ── 돼지고기 ───────────────────────────────────────────
    dict(id="meat-pork-spain-daepae-samgyeop-2kg", category="pork", brand="스페인산",
         name="스페인산 무연골 대패 삼겹살 (냉동), 2kg, 1개", kind="스페인산 삼겹살 · 무연골 대패",
         price=19420, listPrice=26900, discountPct=27, weightG=2000, packCount=1,
         rating=4.5, reviewCount=30758, url=cp(5498833210, 8536364182),
         image="retail/images/41648693797940-f04b32f8-4d97-4012-8204-f5a90d3381dc.jpg",
         note="26,900원 → 19,420원(100g당 971원) 27% 할인. 로켓프레시·무연골. 2kg 1만원대, 100g당 1,000원 아래."),
    dict(id="meat-pork-gomgom-muyeongol-daepae-1-5kg", category="pork", brand="곰곰",
         name="곰곰 돌돌말이 무연골 대패 삼겹살 (냉동), 1.5kg, 1개", kind="무연골 대패삼겹 · 냉동",
         price=16390, listPrice=20990, discountPct=21, weightG=1500, packCount=1,
         rating=4.5, reviewCount=206240, url=cp(9069279280, 22296908426),
         image="retail/images/1271144344775-ec7e74e6-4375-49f9-b9e3-eada3c6e3be6.jpg",
         note="20,990원 → 16,390원(100g당 1,093원). 리뷰 20.6만건·평점 4.5. 1.5kg 낱개 포장."),
    dict(id="meat-pork-gomgom-daepae-samgyeop-1kg-2", category="pork", brand="곰곰",
         name="곰곰 돌돌말이 대패삼겹살 (냉동), 1kg, 2개", kind="대패삼겹 · 냉동 1kg×2",
         price=20370, listPrice=33980, discountPct=40, weightG=2000, packCount=2,
         rating=4.5, reviewCount=99354, url=cp(343900909, 19223541715),
         image="1025_amir_coupang_oct_80k/1583/042b8f488aef231e7df73ff513d0748bfe3afce1e426bf2a0a94d27d8e8f.jpg",
         note="33,980원 → 20,370원(100g당 1,019원) 40% 할인. 리뷰 9.9만건. 1kg 2팩이라 소분해 두고 먹기 좋아요."),
    dict(id="meat-pork-daepaeking-jeongsamgyeop-2kg", category="pork", brand="대패킹",
         name="대패킹 진짜 정삼겹 대패삼겹살 (냉동), 2kg, 1개", kind="미국산 정삼겹 · 대패",
         price=20420, listPrice=31870, discountPct=35, weightG=2000, packCount=1,
         rating=4.5, reviewCount=10838, url=cp(6305684520, 13061642503),
         image="retail/images/68250614187930-3f3d97fb-93cc-4c7d-831c-87201aa2f595.jpg",
         note="31,870원 → 20,420원(100g당 1,021원) 35% 할인. 로켓프레시. 대패삼겹 대표 브랜드 2kg."),
    # ── 닭고기 ────────────────────────────────────────────
    dict(id="meat-chicken-pultorae-fresh-breast-2kg", category="chicken", brand="풀토래",
         name="풀토래 신선냉장 닭가슴살 국내산, 2kg, 1개", kind="국내산 닭가슴살 · 냉장",
         price=15500, listPrice=19100, discountPct=18, weightG=2000, packCount=1,
         rating=5.0, reviewCount=20928, url=cp(1144178958, 2201227236),
         image="vendor_inventory/956f/2c4a8cbda1d018082f23aa1933384db0c83e8736619c406088a0f1345674.jpg",
         note="19,100원 → 15,500원(100g당 775원). 국내산 냉장 2kg, 리뷰 2만건·평점 5.0. 100g당 700원대."),
    dict(id="meat-chicken-deobareundak-breast-2kg", category="chicken", brand="더바른닭",
         name="더바른닭 국내산 냉장 촉촉 닭가슴살, 2kg, 1개", kind="국내산 닭가슴살 · 냉장",
         price=15000, listPrice=18000, discountPct=16, weightG=2000, packCount=1,
         rating=5.0, reviewCount=3498, url=cp(8518771827, 24687496366),
         image="image_audit/stage/manual/d3b2dbb19a78dba17637bab6450714e47cae714a0fa087cc14b9b9fb6515_1792656435033.jpg",
         note="18,000원 → 15,000원(100g당 750원). 국내산 냉장 2kg, 평점 5.0. 100g당 750원."),
    dict(id="meat-chicken-sajowon-tenderloin-1kg-2", category="chicken", brand="사조원",
         name="사조원 닭안심 (냉장), 1kg, 2개", kind="닭안심 · 냉장 1kg×2",
         price=13550, listPrice=None, discountPct=None, weightG=2000, packCount=2,
         rating=5.0, reviewCount=3836, url=cp(9178751443, 27135692570),
         image="retail/images/06a42278-56ef-4798-afe2-a2b7c4b6c4cb14215458482268455312.png",
         note="13,550원(100g당 678원). 로켓프레시, 1kg 2팩. 정가 표기가 없어 할인율은 비워 뒀어요."),
    dict(id="meat-chicken-pultorae-tenderloin-2kg", category="chicken", brand="풀토래",
         name="풀토래 냉장 닭안심 국내산, 2kg, 1개", kind="국내산 닭안심 · 냉장",
         price=14900, listPrice=18500, discountPct=19, weightG=2000, packCount=1,
         rating=4.5, reviewCount=6194, url=cp(4759044905, 2854973249),
         image="vendor_inventory/4cfa/f63b2dc876cf2f414e63d9d417c5752711caf70b2095564d613a651bd739.jpg",
         note="18,500원 → 14,900원(100g당 745원). 국내산 냉장 2kg, 리뷰 6,194건. 100g당 700원대."),
]


def build_product(row):
    p = {
        "id": row["id"],
        "group": {"beef": "소고기", "pork": "돼지고기", "chicken": "닭고기"}[row["category"]],
        "category": row["category"],
        "part": "meat",
        "brand": row["brand"],
        "name": row["name"],
        "kind": row["kind"],
        "price": row["price"],
        "priceCheckedAt": CHECKED,
        "priceCheckedLabel": CHECKED_LABEL,
        "url": row["url"],
        "affiliateUrl": row["url"],
        "image": f"images/{row['id']}.jpg",
        "packCount": row["packCount"],
        "weightG": row["weightG"],
        "rating": row["rating"],
        "reviewCount": row["reviewCount"],
        "platform": "coupang",
        "measure": "per100g",
        "note": row["note"] + " " + AFF_NOTE,
    }
    if row["listPrice"]:
        p["listPrice"] = row["listPrice"]
    if row["discountPct"]:
        p["discountPct"] = row["discountPct"]
    per = round(row["price"] / row["weightG"] * 100)
    p["per100g"] = per
    p["perValue"] = round(row["price"] / row["weightG"] * 100, 1)
    p["unitPrice"] = f"100g당 {per:,}원"
    if row["packCount"] > 1:
        each = round(row["price"] / row["packCount"])
        p["eachPrice"] = each
        p["eachLabel"] = "팩"
        p["unitEach"] = f"1팩당 {each:,}원"
    p["protein20"] = None
    return p


def deal_score(p):
    """가성비 점수: 100g당 가격(로그 스케일) 45점 + 할인율 18점 + 기본 30점."""
    import math

    per = p.get("per100g")
    if not per:
        return 42.0
    lo, hi = 600, 4500
    cheap = max(0.0, min(1.0, (math.log10(hi) - math.log10(per)) / (math.log10(hi) - math.log10(lo))))
    disc = min(p.get("discountPct") or 0, 55) / 55
    return round(30 + 45 * cheap + 18 * disc, 2)


def main():
    data = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in data["products"]}

    added = 0
    for row in NEW:
        prod = build_product(row)
        if prod["id"] in by_id:
            by_id[prod["id"]].update(prod)
        else:
            data["products"].append(prod)
            added += 1

    # 카테고리: 프리미엄 추가 (없을 때만)
    if not any(c["id"] == "premium" for c in data["categories"]):
        data["categories"].append({"id": "premium", "label": "프리미엄", "icon": "👑", "part": "meat"})

    # 식단 고기 필터: 전체에 premium 포함 + 프리미엄 칩을 맨 끝에
    for part in data["parts"]:
        if part["id"] != "meat":
            continue
        part["note"] = (
            "초특가·가성비 고기를 100g당 가격으로 비교해요. 100g당 5,000원이 넘는 고급육은 "
            "👑 프리미엄으로 묶어 목록 맨 아래에 뒀어요."
        )
        for f in part["filters"]:
            if f["id"] == "all" and "premium" not in f["cats"]:
                f["cats"].append("premium")
        part["filters"] = [f for f in part["filters"] if f["id"] != "premium"]
        part["filters"].append({"id": "premium", "label": "프리미엄", "icon": "👑", "cats": ["premium"]})

    # 프리미엄 이동 (100g당 5,000원 이상, 조리기구·계란 제외)
    moved = []
    for p in data["products"]:
        if p["part"] != "meat" or p["category"] in ("gadget", "egg", "premium"):
            continue
        per = p.get("per100g")
        if per and per >= 5000:
            p["premiumFrom"] = p["category"]
            p["category"] = "premium"
            p["premium"] = True
            p["premiumNote"] = f"100g당 {per:,}원 — 프리미엄 고급육"
            moved.append((p["name"], per))

    # 인기·할인 점수 재계산: 가성비 특가가 위, 프리미엄은 30점 고정으로 아래
    for p in data["products"]:
        if p["part"] != "meat":
            continue
        if p["category"] == "premium":
            p["popularScore"] = 30.0
        elif p["category"] == "gadget":
            p["popularScore"] = 40.0
        elif p["category"] == "egg":
            p["popularScore"] = 46.0
        else:
            p["popularScore"] = deal_score(p)

    DATA.write_text(json.dumps(data, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    # js/products.js 재생성
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

    meat = [p for p in data["products"] if p["part"] == "meat"]
    print(f"상품 {len(data['products'])}종 (신규 {added}종) · 식단 고기 {len(meat)}종")
    print("프리미엄 이동:")
    for name, per in sorted(moved, key=lambda x: -x[1]):
        print(f"  - {per:>6,}원/100g  {name}")


if __name__ == "__main__":
    main()
