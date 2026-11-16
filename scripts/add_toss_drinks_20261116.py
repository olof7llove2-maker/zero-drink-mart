#!/usr/bin/env python3
"""2026-11-16 토스쇼핑 제로음료 10건을 마트 데이터에 추가한다.

- data/products.json (JSON 사본)과 js/products.js (사이트가 실제로 읽는 파일) 양쪽에 반영.
- 이미 있는 id 는 건너뛴다(재실행 안전).
- images/ 아래 ASCII 파일명 이미지를 참조한다.

사용법
    python3 scripts/add_toss_drinks_20261116.py --check    # 검증만
    python3 scripts/add_toss_drinks_20261116.py            # 반영
"""
import json
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

CHECKED_AT = "2026-11-16 14:00"
CHECKED_LABEL = "11/16 14:00 토스 기준"


def p(**kw):
    base = {
        "platform": "toss",
        "priceCheckedAt": CHECKED_AT,
        "priceCheckedLabel": CHECKED_LABEL,
        "previousPrice": None,
        "priceHistoryDays": 1,
    }
    base.update(kw)
    base.setdefault("lowest30d", base["price"])
    base["unitPriceOfficial"] = f"100ml당 {base['unitPricePer100ml']}원"
    base["unitPrice"] = base["unitPriceOfficial"]
    base["url"] = f"https://sharelink.toss.im/links/products/{base['tacaItemId']}"
    base["affiliateUrl"] = base["shareLink"]
    base["image"] = f"images/{base['id']}.{base['imageExt']}"
    base.pop("imageExt")
    base.pop("tacaItemId")
    return base


NEW = [
    p(
        id="toss-pepsi-jero-syugeo-raimhyang-355ml-24gae",
        group="제로콜라", category="cola", brand="펩시",
        name="펩시 제로 슈거 라임향, 355ml, 24개",
        kind="제로 콜라 · 라임", flavor="라임",
        price=14880, listPrice=26200, discountPct=43,
        tacaItemId=24493527, shareLink="https://toss.shopping/_m/J3InQ13l",
        volumeMl=355, packCount=24, unitPricePer100ml=175, unitEach="캔당 약 620원",
        container="can", caffeine="contains", aspartame=None, imageExt="jpeg",
    ),
    p(
        id="toss-pepsi-jero-kolra-eopsoyong-500ml-20gae",
        group="제로콜라", category="cola", brand="펩시",
        name="롯데칠성 제로라임 펩시 제로콜라, 업소용, 500ml, 20개",
        kind="제로 콜라 · 라임", flavor="라임",
        price=15990, listPrice=18000, discountPct=11,
        tacaItemId=1267220657, shareLink="https://toss.shopping/_m/pLZ9Y3ex",
        volumeMl=500, packCount=20, unitPricePer100ml=160, unitEach="병당 약 800원",
        container="pet-small", caffeine="contains", aspartame=None, imageExt="jpg",
    ),
    p(
        id="toss-bureureu-kolra-jero-250ml-30gae",
        group="제로콜라", category="cola", brand="부르르",
        name="부르르콜라 제로, 250ml, 30개",
        kind="제로 콜라", flavor="콜라",
        price=12900, listPrice=13900, discountPct=7,
        tacaItemId=11253613, shareLink="https://toss.shopping/_m/xE9OBSS1",
        volumeMl=250, packCount=30, unitPricePer100ml=172, unitEach="캔당 약 430원",
        container="can", caffeine=None, aspartame=None, imageExt="jpg",
    ),
    p(
        id="toss-maekkol-jero-250ml-30gae",
        group="제로콜라", category="cola", brand="맥콜",
        name="맥콜 제로, 250ml, 30개",
        kind="제로 콜라", flavor="콜라",
        price=15900, listPrice=17900, discountPct=11,
        tacaItemId=7882389, shareLink="https://toss.shopping/_m/JvdzWP3b",
        volumeMl=250, packCount=30, unitPricePer100ml=212, unitEach="캔당 약 530원",
        container="can", caffeine=None, aspartame=None, imageExt="jpeg",
    ),
    p(
        id="toss-narangdeu-saida-jero-geurinaepul-345ml-24gae",
        group="제로사이다", category="cider", brand="나랑드사이다",
        name="동아오츠카 나랑드사이다 제로, 그린애플, 345ml, 24개",
        kind="제로 사이다 · 그린애플", flavor="그린애플",
        price=12500, listPrice=20000, discountPct=37,
        tacaItemId=1184510077, shareLink="https://toss.shopping/_m/ZBZVLQsc",
        volumeMl=345, packCount=24, unitPricePer100ml=151, unitEach="캔당 약 521원",
        container="can", caffeine="none", aspartame=None, imageExt="jpeg",
    ),
    p(
        id="toss-deo-biktoria-cheongpodo-remon-500ml-40gae",
        group="탄산수", category="sparkling", brand="더 빅토리아",
        name="더 빅토리아 청포도 500ml 20개 + 레몬 500ml 20개, 40개",
        kind="탄산수 · 가향", flavor="청포도+레몬",
        price=18900, listPrice=26900, discountPct=50,
        tacaItemId=334588203, shareLink="https://toss.shopping/_m/vVqeNIgn",
        volumeMl=500, packCount=40, unitPricePer100ml=95, unitEach="병당 약 473원",
        container="pet-small", caffeine="none", aspartame="none", imageExt="jpeg",
    ),
    p(
        id="toss-deo-biktoria-yujac-500ml-20gae",
        group="탄산수", category="sparkling", brand="더 빅토리아",
        name="더 빅토리아 내사랑 유자C맛, 500ml, 20개",
        kind="탄산수 · 가향", flavor="유자C",
        price=11400, listPrice=20400, discountPct=50,
        tacaItemId=84326655, shareLink="https://toss.shopping/_m/NXHUI451",
        volumeMl=500, packCount=20, unitPricePer100ml=114, unitEach="병당 약 570원",
        container="pet-small", caffeine="none", aspartame="none", imageExt="jpeg",
    ),
    p(
        id="toss-raineubassa-paesyeonhureucheu-cheri-500ml-40gae",
        group="탄산수", category="sparkling", brand="라인바싸",
        name="라인바싸 패션후르츠 체리, 500ml, 체리 20개 + 패션후르츠 20개, 1세트",
        kind="탄산수 · 가향", flavor="체리+패션후르츠",
        price=12900, listPrice=None, discountPct=None,
        tacaItemId=930077725, shareLink="https://toss.shopping/_m/nWR5Uyd8",
        volumeMl=500, packCount=40, unitPricePer100ml=65, unitEach="병당 약 323원",
        container="pet-small", caffeine="none", aspartame="none", imageExt="png",
    ),
    p(
        id="toss-seupakeul-saengsu-murabel-500ml-80gae",
        group="생수", category="water", brand="스파클",
        name="스파클 생수, 무라벨, 500ml, 80개",
        kind="생수 · 무라벨", flavor="생수",
        price=12800, listPrice=24000, discountPct=46,
        tacaItemId=651526161, shareLink="https://toss.shopping/_m/pOyp1U6A",
        volumeMl=500, packCount=80, unitPricePer100ml=32, unitEach="병당 160원",
        container="pet-small", caffeine="none", aspartame="none", imageExt="jpeg",
    ),
    p(
        id="toss-ebeoriwoteo-murabel-2l-18gae",
        group="생수", category="water", brand="에브리워터",
        name="에브리워터 무라벨, 2L, 18개",
        kind="생수 · 무라벨", flavor="생수",
        price=8990, listPrice=21900, discountPct=59,
        tacaItemId=12833307, shareLink="https://toss.shopping/_m/VigB6sE5",
        volumeMl=2000, packCount=18, unitPricePer100ml=25, unitEach="병당 약 499원",
        container="pet-large", caffeine="none", aspartame="none", imageExt="jpeg",
    ),
]

NOTE_TAIL = "토스 상품 가격은 2026-11-16 14:00(Asia/Seoul) 토스쇼핑 카테고리 판매 베스트에서 확인한 값이에요."


def js_payload(text):
    start = text.index("const PRODUCTS = ")
    end = text.rindex("];")
    return start, end


def main(argv):
    check = "--check" in argv
    doc = json.loads(DATA.read_text(encoding="utf-8"))
    products = doc["products"]
    ids = {x["id"] for x in products}

    missing_img = [n["id"] for n in NEW if not (ROOT / n["image"]).exists()]
    dups = [n["id"] for n in NEW if n["id"] in ids]
    print(f"기존 {len(products)}개 / 추가 대상 {len(NEW)}개")
    if missing_img:
        print("!! 이미지 없음:", missing_img)
        return 1
    if dups:
        print("이미 있음(건너뜀):", dups)

    added = [n for n in NEW if n["id"] not in ids]
    doc["products"] = products + added

    note = doc["site"].get("sourceNote", "")
    if NOTE_TAIL not in note:
        doc["site"]["sourceNote"] = (note.rstrip() + " " + NOTE_TAIL).strip()

    print(f"추가 {len(added)}개 → 총 {len(doc['products'])}개")
    for n in added:
        print(f"  {n['category']:9} {n['price']:>6}원 {n['unitPricePer100ml']:>4}원/100ml  {n['name']}")

    if check:
        print("(검증 모드: 파일을 쓰지 않았습니다)")
        return 0

    DATA.write_text(json.dumps(doc, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    text = JS.read_text(encoding="utf-8")
    start, end = js_payload(text)
    new_js = text[:start] + "const PRODUCTS = " + json.dumps(doc["products"], ensure_ascii=False, indent=2) + ";" + text[end + 2:]
    # SITE 는 JS 안에서 별도로 관리되므로 sourceNote 만 치환
    old_note = "쿠팡 검색 판매량순 목록에서 2026-11-15 19:25(Asia/Seoul)에 확인한 값이에요."
    if old_note in new_js and NOTE_TAIL not in new_js:
        new_js = new_js.replace(
            '"sourceNote": "' + old_note + '"',
            '"sourceNote": "' + old_note + " " + NOTE_TAIL + '"',
            1,
        )
    JS.write_text(new_js, encoding="utf-8")
    print("data/products.json, js/products.js 반영 완료")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
