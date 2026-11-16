#!/usr/bin/env python3
"""단백질 음료 22종 원료 배지·당류(2026-11-16 2차 보강).

확인 출처는 handoffs/🧬-기존-단백질-음료-22종-원료-라벨-보강/research.md 참고.
- 제조사 공식 페이지(매일유업·빙그레·베지밀) 또는 식약처 품목제조보고·식품영양성분 DB를
  옮긴 라벨 전사 자료에서 원재료명과 영양성분을 확인한 제품만 채운다.
- 라벨과 사이트 값이 어긋난 4건(테이크핏 kcal, 케어웰·연세두유 단백질, 마이밀 단백질)도
  같은 근거로 바로잡는다.
"""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"

SOURCES = {
    # ── 두유(대두) ─────────────────────────────────────────
    "maeilduyu-godanbaek-geomeunkong-190ml-24gae": {
        "proteinSourceKey": "soy",
        "proteinSource": "대두단백(두유·ISP)",
        "proteinSourceDetail": "원액두유·ISP",
        "sugarPerServing": 1.7,
    },
    "maeilduyu-godanbaek-peulrein-duyu-190ml-24gae": {
        "proteinSourceKey": "soy",
        "proteinSource": "대두단백(두유·ISP)",
        "proteinSourceDetail": "원액두유·ISP",
        "sugarPerServing": 1.2,
    },
    "maeilduyu-99-9-seoritae-24gae-190ml": {
        "proteinSourceKey": "soy",
        "proteinSource": "대두단백(두유)",
        "proteinSourceDetail": "원액두유 99.9%",
        "sugarPerServing": 1.8,
    },
    "amondeubeurijeu-nyuteuripeulreoseu-peurotin-190ml-24gae": {
        "proteinSourceKey": "soy",
        "proteinSource": "대두단백(ISP)",
        "proteinSourceDetail": "분리대두단백 단일",
        "sugarPerServing": 3,
    },
    "matitneunduyugt-godanbaek-duyu-190ml-24gae": {
        "proteinSourceKey": "soy",
        "proteinSource": "대두단백(두유·ISP)",
        "proteinSourceDetail": "원액두유·ISP",
        "sugarPerServing": 0.9,
    },
    "yeonseduyu-godanbaek-geomeunkong-aen-gokalsyum-jeodang-190ml-32gae": {
        "proteinSourceKey": "soy",
        "proteinSource": "대두단백(두유)",
        "proteinSourceDetail": "두유액 기반",
        "sugarPerServing": 4,
        "proteinStatus": "12g",
        "protein_g_per_bottle": 12,
        "proteinPerG": 66,
    },
    "bejimil-godanbaekduyu-geomeunkong-190ml-32gae": {
        "proteinSourceKey": "soy",
        "proteinSource": "대두단백(두유·ISP)",
        "proteinSourceDetail": "원액두유·ISP",
        "sugarPerServing": 7.5,
    },
    "yeonseduyu-godanbaek-pro-peulrein-240ml-32gae": {
        "proteinSourceKey": "soy",
        "proteinSource": "대두단백(두유·ISP)",
        "proteinSourceDetail": "ISP·두유액·콜라겐",
        "sugarPerServing": 2.2,
    },
    # ── 우유·유청 단일 ──────────────────────────────────────
    "deodanbaek-deuringkeu-ttalgi-250ml-18gae": {
        "proteinSourceKey": "milk",
        "proteinSource": "우유단백(MPC)",
        "proteinSourceDetail": "분리·농축우유단백",
        "sugarPerServing": 0.7,
    },
    "deodanbaek-40g-gohamryang-deuringkeu-deobeulchoko-350ml-20gae": {
        "proteinSourceKey": "milk",
        "proteinSource": "우유단백(MPI)",
        "proteinSourceDetail": "분리우유단백 100%",
        "sugarPerServing": 0.8,
    },
    "deodanbaek-deuringkeu-dakeuchoko-330ml-12gae": {
        "proteinSourceKey": "milk",
        "proteinSource": "우유단백(MPC)",
        "proteinSourceDetail": "분리·농축우유단백",
        "sugarPerServing": 0.9,
    },
    "haimyun-peurotin-baelreonseu-aektibeu-orijineol-250ml-18gae": {
        "proteinSourceKey": "milk",
        "proteinSource": "우유단백(MPC)",
        "proteinSourceDetail": "MPC·탈지분유·산양유",
        "sugarPerServing": 4,
    },
    "maipeurotin-deuringkeu-sigeunicheo-chokolrit-340ml-24gae": {
        "proteinSourceKey": "milk",
        "proteinSource": "우유단백(MPC)",
        "proteinSourceDetail": "WPI·MPC",
        "sugarPerServing": 0,
    },
    "kalobai-peopekteu-pawosweikeu-choko-250ml-24gae": {
        "proteinSourceKey": "milk",
        "proteinSource": "우유단백(MPC)",
        "proteinSourceDetail": "농축유단백·탈지분유",
        "sugarPerServing": 8,
    },
    "heoswi-chokolrit-deuringkeu-peurotin-235ml-24gae": {
        "proteinSourceKey": "milk",
        "proteinSource": "우유단백(탈지분유)",
        "proteinSourceDetail": "가공유(초코우유)",
        "sugarPerServing": 27,
    },
    "binggeure-yopeulre-peurotin-deuringkeu-ttalgibanana-210ml-12gae": {
        "proteinSourceKey": "whey",
        "proteinSource": "유청단백(WPC)",
        "proteinSourceDetail": "WPC·원유",
        "sugarPerServing": 16.5,
    },
    # ── 혼합(유청·대두) ─────────────────────────────────────
    "nyukeeo-olpeurotin-gosohanmat-245ml-24gae": {
        "proteinSourceKey": "blend",
        "proteinSource": "유청+대두 혼합단백",
        "proteinSourceDetail": "ISP·WPI",
        "sugarPerServing": 0,
    },
    "teikeupit-maekseu-chokomat-peurotin-250ml-24gae": {
        "proteinSourceKey": "blend",
        "proteinSource": "유청+대두 혼합단백",
        "proteinSourceDetail": "ISP·WPI·MPC",
        "sugarPerServing": 0.7,
        "kcalStatus": "106kcal",
        "kcal_per_bottle": 106,
    },
    # ── 동·식물성 복합 ─────────────────────────────────────
    "maimil-nyupeurotin-deuringkeu-orijineol-190ml-30gae": {
        "proteinSourceKey": "blend",
        "proteinSource": "동·식물성 복합단백",
        "proteinSourceDetail": "ISP·카제인·탈지분유",
        "sugarPerServing": 10,
        "proteinStatus": "9g",
        "protein_g_per_bottle": 9,
    },
    "dakteoyu-peuro-danbaekjil-40g-deuringkeu-choko-350ml-6gae": {
        "proteinSourceKey": "blend",
        "proteinSource": "동·식물성 복합단백",
        "proteinSourceDetail": "ISP·WPI·분유",
        "sugarPerServing": 4.8,
    },
    "dakteoyu-danbaekjildeuringkeu-ttalgi-40g-350ml-6gae": {
        "proteinSourceKey": "blend",
        "proteinSource": "동·식물성 복합단백",
        "proteinSourceDetail": "ISP·WPI·분유",
        "sugarPerServing": 4,
    },
    "keeowel-baelreonseun-godanbaek-bananamat-200ml-60gae": {
        "proteinSourceKey": "blend",
        "proteinSource": "동·식물성 복합단백",
        "proteinSourceDetail": "ISP·카제인",
        "sugarPerServing": 3,
        "proteinStatus": "14g",
        "protein_g_per_bottle": 14,
        "proteinPerG": 102,
    },
}

# 순수 두유까지 대두 필터에 들어간다는 사실을 설명문에 반영
SOY_NOTE = (
    "분리대두단백(ISP)이나 콩(원액두유)이 주원료인 식물성 상품이에요. "
    "두유는 단백질 대부분이 콩에서 오고 일부만 ISP로 보강해요."
)


def main():
    cat = json.loads(DATA.read_text(encoding="utf-8"))
    by_id = {p["id"]: p for p in cat["products"]}
    missing = [pid for pid in SOURCES if pid not in by_id]
    if missing:
        raise SystemExit(f"없는 상품 id: {missing}")

    for pid, extra in SOURCES.items():
        by_id[pid].update(extra)

    for part in cat["parts"]:
        if part.get("id") != "protein":
            continue
        for f in part.get("filters", []):
            if f.get("id") == "src-soy":
                f["note"] = SOY_NOTE

    DATA.write_text(json.dumps(cat, ensure_ascii=False, indent=1) + "\n", encoding="utf-8")

    text = JS.read_text(encoding="utf-8")
    pre = text[: text.index("const PARTS = ")]
    rest = text[text.index("const SORTS = ") :]
    mid = rest[: rest.index("const PRODUCTS = ")]
    JS.write_text(
        pre
        + "const PARTS = "
        + json.dumps(cat["parts"], ensure_ascii=False, indent=2)
        + ";\n\n"
        + mid
        + "const PRODUCTS = "
        + json.dumps(cat["products"], ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )

    filled = [p for p in cat["products"] if p.get("category") in ("protein", "shake") and p.get("proteinSource")]
    total = [p for p in cat["products"] if p.get("category") in ("protein", "shake")]
    print(f"원료 배지 {len(filled)}/{len(total)}종 · 이번 반영 {len(SOURCES)}종")


if __name__ == "__main__":
    main()
