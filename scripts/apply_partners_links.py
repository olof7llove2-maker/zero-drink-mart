#!/usr/bin/env python3
"""쿠팡 상품 링크를 파트너스 단축 링크(link.coupang.com)로 일괄 교체한다.

사용법
    python3 scripts/apply_partners_links.py --check     # 검증만
    python3 scripts/apply_partners_links.py             # 실제 반영 + 대장 갱신

입력: partners-links.json  {"<상품 id>": "https://link.coupang.com/..."}
  - 값이 비어 있는 id는 '아직 변환 안 됨'으로 보고 건너뛴다.
  - 토스 상품 2건은 affiliateUrl이 토스 링크라 대상이 아니다.

동작
  1) data/products.json 과 js/products.js 의 affiliateUrl 만 바꾼다.
     (상품의 url 필드는 원본 쿠팡 주소 그대로 두어 나중에 가격 재확인에 쓴다)
  2) downloads/coupang_partners_links_father_20261115.md 변환 대장을 다시 만든다.
"""

import json
import re
import sys
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent          # work/zero-mart
WORKSPACE = ROOT.parent.parent                          # <-/workspace
DATA = ROOT / "data" / "products.json"
JS = ROOT / "js" / "products.js"
MAP = ROOT / "partners-links.json"
RESTRICTED = ROOT / "partners-restricted.json"
LEDGER = WORKSPACE / "downloads" / "coupang_partners_links_father_20261115.md"

SHORT_PREFIX = "https://link.coupang.com/"
COUPANG_PREFIX = "https://www.coupang.com/"


def load_json(path):
    with path.open(encoding="utf-8") as f:
        return json.load(f)


def coupang_products(products):
    return [
        p for p in products
        if str(p.get("affiliateUrl", "")).startswith((COUPANG_PREFIX, SHORT_PREFIX))
    ]


def main(argv):
    check_only = "--check" in argv

    products_doc = load_json(DATA)
    products = products_doc["products"]
    mapping = load_json(MAP) if MAP.exists() else {}

    targets = coupang_products(products)
    problems = []

    unknown = [k for k in mapping if k not in {p["id"] for p in products}]
    if unknown:
        problems.append(f"알 수 없는 상품 id: {unknown[:5]}")

    restricted = set(load_json(RESTRICTED)) if RESTRICTED.exists() else set()

    ready = {}
    for p in targets:
        short = (mapping.get(p["id"]) or "").strip()
        if not short:
            continue
        if not short.startswith(SHORT_PREFIX):
            problems.append(f"{p['id']}: link.coupang.com 주소가 아님 ({short[:40]})")
            continue
        ready[p["id"]] = short

    print(f"쿠팡 상품 {len(targets)}건 · 변환 준비 {len(ready)}건 · 남은 {len(targets) - len(ready)}건")
    for msg in problems:
        print("  ! " + msg)

    if check_only:
        return 1 if problems else 0

    # 1) data/products.json  (교체 전 옛 주소를 기억해 두었다가 js 치환에 쓴다)
    old_by_id = {p["id"]: p["affiliateUrl"] for p in products}
    changed = 0
    for p in products:
        short = ready.get(p["id"])
        if short and p["affiliateUrl"] != short:
            p["affiliateUrl"] = short
            changed += 1
    with DATA.open("w", encoding="utf-8") as f:
        json.dump(products_doc, f, ensure_ascii=False, indent=2)
        f.write("\n")
    print(f"data/products.json: affiliateUrl {changed}건 교체")

    # 2) js/products.js — 상품별 옛 주소 → 단축 링크로 텍스트 치환
    js_text = JS.read_text(encoding="utf-8")
    js_replaced = 0
    for p in products:
        short = ready.get(p["id"])
        old = old_by_id.get(p["id"]) or ""
        if not short or not old.startswith(COUPANG_PREFIX):
            continue
        old_line = f'"affiliateUrl": "{old}"'
        new_line = f'"affiliateUrl": "{short}"'
        if old_line in js_text:
            js_text = js_text.replace(old_line, new_line)
            js_replaced += 1
        elif new_line not in js_text:
            print(f"  ! js에서 옛 주소를 찾지 못함: {p['id']}")
    JS.write_text(js_text, encoding="utf-8")
    print(f"js/products.js: affiliateUrl {js_replaced}건 교체")

    write_ledger(products, targets, ready, restricted)
    print(f"대장 갱신: {LEDGER.relative_to(WORKSPACE)}")
    return 0


def write_ledger(products, targets, ready, restricted=frozenset()):
    done = sum(1 for p in targets if p["id"] in ready)
    lines = [
        "---",
        'title: "🔗 아버님 쿠팡 파트너스 링크 변환 대장"',
        "---",
        "",
        f"아버님 쿠팡 파트너스 계정(`ssy7199@naver.com`)으로 변환한 내역입니다. "
        f"쿠팡 상품 {len(targets)}건 중 **{done}건 변환 완료 / {len(targets) - done}건 남음**"
        + (f" (그중 {len([p for p in targets if p['id'] in restricted])}건은 쿠팡 파트너스 링크 생성 제한 상품)" if restricted else "")
        + ".",
        "",
        "| # | 상품 | 상품 id | 변환 상태 | 단축 링크 |",
        "| ---: | --- | --- | --- | --- |",
    ]
    for i, p in enumerate(targets, 1):
        short = ready.get(p["id"])
        if short:
            status = "✅ 완료"
        elif p["id"] in restricted:
            status = "⛔ 링크 생성 제한"
        else:
            status = "⏳ 대기"
        lines.append(
            f"| {i} | {p['name']} | `{p['id']}` | {status} | {short or '-'} |"
        )
    lines += [
        "",
        "## 원본 쿠팡 주소 (변환 대기분 재작업용)",
        "",
        "```text",
    ]
    for p in targets:
        if p["id"] not in ready:
            lines.append(p["url"])
    lines += ["```", ""]
    LEDGER.write_text("\n".join(lines), encoding="utf-8")


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
