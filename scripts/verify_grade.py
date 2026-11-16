#!/usr/bin/env python3
"""띠니마트 5단계 등급 · 단가 계산 검증 (js/grade.js 와 같은 계산을 파이썬으로 다시 구현해 대조).

사용:
    python3 scripts/verify_grade.py            # 등급 분포와 검증값 표
    python3 scripts/verify_grade.py --check    # 기대값과 다르면 종료코드 1

계산 규칙(js/grade.js와 동일)
- 단가: 음료 100ml당, 단백질 쉐이크·고기 100g당. 저장된 반올림 값보다 계산값을 먼저 씁니다.
- 시세: 같은 용기(캔/소형페트/대용량/분말/100g) 안에서 같은 브랜드 상품 단가의 중간값.
        브랜드 표본이 2개 미만이면 같은 용기의 분류 시세(표본 3개 이상)를 씁니다.
- 등급: 역대급 -20% 이하 / 대박급 -12% 이하 / 중박급 -5% 이하 / 쏘쏘 +3% 이하 / 비쌈 그 위.
- 배지: 실제 관측 이력 14일 이상 + 관측 5회 이상인 상품만.
"""
import json
import statistics
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
MIN_DAYS = 14


def container_of(p):
    if p.get("category") == "gadget":
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
    return "can" if v <= 270 else ("pet-small" if v <= 700 else "pet-large")


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


def build(products):
    brand, group = {}, {}
    for p in products:
        u, c = unit_value(p), container_of(p)
        if u is None or not c or not p.get("category"):
            continue
        group.setdefault(f"{c}|{p['category']}", []).append(u)
        b = str(p.get("brand") or "").strip()
        if b:
            brand.setdefault(f"{c}|{p['category']}|{b}", []).append(u)
    return brand, group


def market_for_values(brand, group, category, b, container):
    if b and f"{container}|{category}|{b}" in brand:
        arr = brand[f"{container}|{category}|{b}"]
        if len(arr) >= 2:
            return statistics.median(arr), "brand", len(arr)
    arr = group.get(f"{container}|{category}")
    if arr and len(arr) >= 3:
        return statistics.median(arr), "group", len(arr)
    return None, None, 0


def history_days(entry):
    if not entry or entry.get("status") != "history":
        return 0
    st = entry.get("stats") or {}
    if (st.get("days") or 0) < MIN_DAYS:
        return 0
    if (st.get("observations") or 0) < 5:
        return 0
    return st.get("days")


def main():
    products = json.loads((ROOT / "data/products.json").read_text())["products"]
    history = json.loads((ROOT / "data/price-history.json").read_text())["products"]
    brand, group = build(products)

    rows = []
    for p in products:
        days = history_days(history.get(p["id"]))
        if not days or p.get("price") is None:
            continue
        u = unit_value(p)
        if u is None:
            continue
        base, kind, sample = market_for_values(brand, group, p["category"], str(p.get("brand") or "").strip(), container_of(p))
        if not base:
            continue
        pct = (u - base) / base * 100
        rows.append((p["id"], p.get("brand"), container_of(p), u, base, kind, sample, pct, grade_of(pct), days))

    print(f"5단계 배지가 붙는 상품: {len(rows)}종 (관측 {MIN_DAYS}일 이상)\n")
    print(f"{'상품 ID':44s} {'용기':9s} {'단가':>8s} {'시세':>8s} {'종류':6s} {'차이':>7s}  등급")
    for r in sorted(rows, key=lambda x: x[7]):
        print(f"{r[0]:44s} {r[2]:9s} {r[3]:8.1f} {r[4]:8.1f} {r[5]:6s} {r[7]:+6.1f}%  {r[8]}")

    counts = {}
    for r in rows:
        counts[r[8]] = counts.get(r[8], 0) + 1
    print("\n등급 분포:", counts)

    # 계산기 회귀 검증값
    cases = [
        ("펩시 제로 355ml 48캔 25,760원 무료배송", 355, 48, 25760, 0, "cola", "펩시", 151.2, -18.8, "대박급"),
        ("같은 딜 36캔 29,900원", 355, 36, 29900, 0, "cola", "펩시", 234.0, 25.7, "비쌈"),
        ("코카콜라 제로 350ml 24개 18,700원", 350, 24, 18700, 0, "cola", "코카콜라", 222.6, -9.4, "중박급"),
    ]
    ok = True
    print("\n계산기 검증")
    for name, vol, qty, price, ship, cat, br, exp_unit, exp_pct, exp_grade in cases:
        total = price + ship
        unit = total / (vol * qty) * 100
        base, kind, sample = market_for_values(brand, group, cat, br, "can")
        pct = (unit - base) / base * 100
        grade = grade_of(pct)
        good = abs(unit - exp_unit) < 0.15 and abs(pct - exp_pct) < 0.15 and grade == exp_grade
        ok = ok and good
        print(f"  {'OK ' if good else 'X  '} {name}\n      100ml당 {unit:.1f}원 · 시세 {base:.1f}원({kind}) → {pct:+.1f}% {grade}")
    sys.exit(0 if ok or "--check" not in sys.argv else 1)


if __name__ == "__main__":
    main()
