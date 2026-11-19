#!/usr/bin/env python3
"""띠니마트 판정 검증 (2026-11-18 r15) — js/grade.js 의 judgeOf()를 파이썬으로 다시 구현해 대조.

판정 규칙(화면과 같은 식)
- 평소가 = 이 상품의 관측 가격(data/price-history.json) 중간값. 관측 14일·5회 이상만 인정.
- 5단계: −20%↓ 역대급 · −12%↓ 대박급 · −5%↓ 중박급 · +3%까지 쏘쏘 · 그 위 비쌈\n- r55: 정가 대비 70% 이상 할인이면 60일 이력과 무관하게 역대급
- 4단계(신호등): −5%↓ 지금 사기 좋아요 · +3%까지 무난한 가격 · +8%까지 조금 비싸요 · 그 위 비싸요
- 단백질 레일: −5%↓ 핫딜 · +3%까지 보통 · 그 위 비쌈 · 기록 부족은 기록중
- 기록이 14일 미만이면 판정·5단계 배지 없이 정가 할인·30일 최저로 3단계 톤만.
- 참고 시세(같은 용기)는 판정에 쓰지 않습니다. 단백질 음료는 단백질 20g당 가격끼리 견줍니다.

검사 항목
 ① 같은 상품에서 3단계·5단계·단백질 레일 판정이 서로 반대가 아닌지 (예: 무난한 가격 + 비쌈 ✗)
 ② 판정이 있는데 5단계 배지가 없는/있는 경우가 규칙과 맞는지
 ③ data/products.json 과 js/products.js 가 같은지
 ④ 두유·저단백(lowsoy) 상품이 단백질 레일 대상에서 빠졌는지

사용:
    python3 scripts/verify_grade.py
    python3 scripts/verify_grade.py --check    # 하나라도 어긋나면 종료코드 1
"""
import json
import re
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MIN_DAYS = 14

TIERS = [("good", -5), ("mid", 3), ("wait", 8), ("high", float("inf"))]
TIER_LABEL = {"good": "지금 사기 좋아요", "mid": "무난한 가격", "wait": "조금 비싸요", "high": "비싸요"}
BADGE_TIER = {"역대급": {"good"}, "대박급": {"good"}, "중박급": {"good"}, "쏘쏘": {"mid"}, "비쌈": {"wait", "high"}}
PROT_LABEL = {"good": "핫딜", "mid": "보통", "wait": "비쌈", "high": "비쌈"}
DEEP_CUT_PCT = 70  # r55 — 정가 대비 70% 이상이면 이력과 무관하게 역대급


def container_of(p):
    if p.get("category") in ("gadget", "egg", "bakery"):
        return None
    if p.get("part") == "meat":
        return "raw"
    if p.get("container") == "powder" or p.get("category") == "powder":
        return "powder"
    if p.get("container"):
        return p["container"]
    v = p.get("volumeMl")
    if not v:
        return None
    return "can" if v <= 360 else ("pet-small" if v <= 700 else "pet-large")


def unit_kind(p):
    if p.get("category") == "gadget":
        return "each"
    if p.get("part") == "meat":
        return "per100g"
    if p.get("category") in ("shake", "powder") or p.get("container") == "powder":
        return "per100g"
    return "per100ml"


def unit_value(p):
    if p.get("price") is None:
        return None
    kind = unit_kind(p)
    if kind == "each":
        return None
    if kind == "per100g":
        if isinstance(p.get("per100g"), (int, float)) and p["per100g"] > 0:
            return p["per100g"]
        if p.get("weightG"):
            return p["price"] / p["weightG"] * 100
        return None
    if p.get("volumeMl") and p.get("packCount") and p.get("price"):
        return p["price"] / (p["volumeMl"] * p["packCount"]) * 100
    v = p.get("unitPricePer100ml")
    return v if isinstance(v, (int, float)) else None


def grade_of(pct):
    if pct <= -20:
        return "역대급"
    if pct <= -12:
        return "대박급"
    if pct <= -5:
        return "중박급"
    if pct <= 3:
        return "쏘쏘"
    return "비쌈"


def tier_of(pct):
    for tid, mx in TIERS:
        if pct <= mx:
            return tid
    return "wait"


def baseline_of(p, history):
    entry = history.get(p["id"])
    if not entry or entry.get("status") != "history":
        return None
    st = entry.get("stats") or {}
    days, obs = st.get("days") or 0, st.get("observations") or 0
    if days < MIN_DAYS or obs < 5:
        return None
    prices = [s["price"] for s in (entry.get("series") or []) if s and isinstance(s.get("price"), (int, float)) and s["price"] > 0]
    if not prices:
        return None
    return {"median": statistics.median(prices), "days": days, "observations": obs}


def deep_cut(p, out):
    """r55 — 정가 대비 70% 이상 할인은 이력·점수와 무관하게 역대급."""
    disc = p.get("discountPct")
    if isinstance(disc, (int, float)) and disc >= DEEP_CUT_PCT:
        out["tier"] = "good"
        out["badge"] = "역대급"
        out["deepCut"] = True
    return out


def judge(p, history):
    if p.get("price") is None:
        return {"basis": "none", "tier": None, "badge": None, "pct": None}
    base = baseline_of(p, history)
    if base:
        pct = (p["price"] / base["median"] - 1) * 100
        out = {"basis": "history", "tier": tier_of(pct), "badge": grade_of(pct), "pct": pct, "base": base}
        return deep_cut(p, out)
    disc = p.get("discountPct")
    l30 = None if (p.get("id") and "#" in p["id"]) else p.get("lowest30d")
    if disc is None and l30 is None:
        return {"basis": "none", "tier": None, "badge": None, "pct": None}
    score = 50 if disc is None else 46 + min(32, disc * 0.6)
    at30 = l30 is not None and p["price"] <= l30 * 1.001
    if at30:
        score += 6
    if l30 is not None and p["price"] > l30 * 1.12:
        score -= 14
    score = max(6, min(92, score))
    tier = "good" if score >= 70 else ("mid" if score >= 44 else "wait")
    return deep_cut(p, {"basis": "discount", "tier": tier, "badge": None, "pct": None})


def load_js_blocks():
    text = (ROOT / "js" / "products.js").read_text(encoding="utf-8")
    names = {
        "SITE": "site",
        "CATEGORIES": "categories",
        "PARTS": "parts",
        "SORTS": "sorts",
        "CONTAINERS": "containers",
        "INGREDIENT_FILTERS": "ingredientFilters",
        "PRODUCTS": "products",
    }
    out = {}
    for name, key in names.items():
        start = text.index(f"const {name} = ") + len(f"const {name} = ")
        rest = text[start:]
        nxt = rest.find("const ")
        block = rest if nxt == -1 else rest[:nxt]
        out[key] = json.loads(block.strip().rstrip(";"))
    return out


def main():
    doc = json.loads((ROOT / "data" / "products.json").read_text(encoding="utf-8"))
    history = json.loads((ROOT / "data/price-history.json").read_text(encoding="utf-8"))["products"]
    products = doc["products"]

    problems = []
    rows = []
    for p in products:
        j = judge(p, history)
        tier, badge = j["tier"], j["badge"]
        if badge and tier not in BADGE_TIER[badge]:
            problems.append(f"{p['id']}: 5단계 {badge} ↔ 3단계 {TIER_LABEL.get(tier)}")
        if j["basis"] != "history" and badge and not j.get("deepCut"):
            problems.append(f"{p['id']}: 기록 부족인데 5단계 배지 {badge}")
        if p.get("category") == "protein":
            g = p.get("protein_g_per_bottle")
            if g is not None and g < 10:
                problems.append(f"{p['id']}: 10g 미만인데 lowsoy로 옮겨지지 않음")
        rows.append((p["id"], p.get("category"), j))

    # ① 화면에 동시에 뜨는 판정 조합 (카드: 3단계 + 5단계, 레일: 레일 판정)
    print(f"상품 {len(products)}종 · 판정 있음 {sum(1 for r in rows if r[2]['tier'])}종")
    print(f"{'상품 ID':46s} {'3단계(신호등)':14s} {'5단계 배지':8s} {'레일':6s} 근거")
    seen = {}
    for pid, cat, j in sorted(rows, key=lambda r: (r[2]["pct"] is None, r[2]["pct"] if r[2]["pct"] is not None else 0)):
        if not j["tier"]:
            continue
        rail = PROT_LABEL[j["tier"]] if cat == "protein" else "-"
        label = TIER_LABEL[j["tier"]]
        badge = j["badge"] or "—"
        pct = f"{j['pct']:+.1f}%" if j["pct"] is not None else ("할인 기준" if j["tier"] else "")
        print(f"{pid[:46]:46s} {label:14s} {badge:8s} {rail:6s} {pct}")
        seen.setdefault((label, badge, rail), 0)
        seen[(label, badge, rail)] += 1

    print("\n나타난 판정 조합:")
    for combo, n in sorted(seen.items(), key=lambda x: -x[1]):
        print(f"  {combo[0]:14s} + {combo[1]:8s} + 레일 {combo[2]:6s} → {n}종")

    # ② 데이터·js 동기화
    js = load_js_blocks()
    for key in ("site", "categories", "parts", "sorts", "containers", "ingredientFilters", "products"):
        if js[key] != doc[key]:
            problems.append(f"data/products.json ↔ js/products.js 불일치: {key}")

    # ③ 두유·저단백 분리
    lowsoy = [p for p in products if p.get("category") == "lowsoy"]
    print(f"\n두유·저단백(lowsoy): {len(lowsoy)}종 — " + ", ".join(f"{p['name']}({p.get('protein_g_per_bottle') if p.get('protein_g_per_bottle') is not None else '?'}g)" for p in lowsoy))

    # ④ 단백질 레일 대상
    rail = [p for p in products if p.get("category") == "protein" and (p.get("protein_g_per_bottle") or 0) >= 10 and p.get("protein20")]
    print(f"단백질 레일 대상(1병 10g 이상·20g당 계산 가능): {len(rail)}종")

    if problems:
        print("\n✗ 문제:")
        for x in problems:
            print("  -", x)
        sys.exit(1 if "--check" in sys.argv else 0)
    print("\n✓ 판정 충돌 없음 · 데이터 동기화 OK")


if __name__ == "__main__":
    main()
