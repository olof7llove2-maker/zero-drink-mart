/* ── 단가 계산기 (모달) ─────────────────────────────────
   딜 문구를 붙여넣으면 100ml·100g당 단가와 5단계 등급을 판정합니다.
   판정 기준은 카드 배지와 같은 marketForValues()를 씁니다. */

const calcState = { category: "", brand: "" };

function calcEls() {
  return {
    modal: $("calc-modal"),
    raw: $("calc-raw"),
    cat: $("calc-cat"),
    brand: $("calc-brand"),
    price: $("calc-price"),
    ship: $("calc-ship"),
    vol: $("calc-vol"),
    qty: $("calc-qty"),
    protein: $("calc-protein"),
    result: $("calc-result"),
  };
}

function calcCategories() {
  return (state.data.categories || []).filter((c) => c.id !== "all" && c.id !== "gadget");
}

function calcBrandsFor(catId) {
  const set = new Set();
  (state.data.products || []).forEach((p) => {
    if (p.category !== catId) return;
    const b = String(p.brand || "").trim();
    if (b) set.add(b);
  });
  return [...set].sort((a, b) => a.localeCompare(b, "ko"));
}

function fillCalcCategories(selected) {
  const el = calcEls().cat;
  if (!el) return;
  el.innerHTML = calcCategories()
    .map((c) => `<option value="${escapeHtml(c.id)}">${escapeHtml((c.icon ? c.icon + " " : "") + c.label)}</option>`)
    .join("");
  if (selected && calcCategories().some((c) => c.id === selected)) el.value = selected;
  calcState.category = el.value;
}

function fillCalcBrands(selected) {
  const el = calcEls().brand;
  if (!el) return;
  const list = calcBrandsFor(calcState.category);
  el.innerHTML =
    `<option value="">모르겠어요 (분류 시세로 비교)</option>` +
    list.map((b) => `<option value="${escapeHtml(b)}">${escapeHtml(b)}</option>`).join("");
  if (selected && list.includes(selected)) el.value = selected;
  calcState.brand = el.value;
}

function calcUnitKind() {
  const cat = (state.data.categories || []).find((c) => c.id === calcState.category);
  const part = cat ? cat.part : "zero";
  if (part === "meat") return "per100g";
  if (calcState.category === "shake" || calcState.category === "powder") return "per100g";
  return "per100ml";
}

function calcContainer(vol) {
  if (calcUnitKind() === "per100g") {
    const cat = (state.data.categories || []).find((c) => c.id === calcState.category);
    return cat && cat.part === "meat" ? "raw" : "powder";
  }
  return containerFromVolume(vol);
}

function calcKvHTML(rows) {
  return rows
    .map(([k, v]) => `<div class="calc-kv"><span>${escapeHtml(k)}</span><b>${v}</b></div>`)
    .join("");
}

function runCalc() {
  const els = calcEls();
  const out = els.result;
  if (!out) return;
  const price = Number(els.price.value);
  const ship = Number(els.ship.value || 0);
  const vol = Number(els.vol.value);
  const qty = Number(els.qty.value);
  const pg = Number(els.protein.value);
  const unitKind = calcUnitKind();
  const unitLabel = unitKind === "per100g" ? "100g당" : "100ml당";

  out.hidden = false;
  if (!(price > 0) || !(vol > 0) || !(qty > 0)) {
    out.innerHTML = `<p class="calc-warn">상품가·용량·수량을 넣어 주세요. (예: 25,760원 · 355ml · 48개)</p>`;
    return;
  }

  const total = price + (ship > 0 ? ship : 0);
  const each = total / qty;
  const unit = (total / (vol * qty)) * 100;
  const protein20 = pg > 0 ? (each * 20) / pg : null;

  const container = calcContainer(vol);
  const market = marketForValues(calcState.category, calcState.brand, container);
  const pct = market && market.value ? ((unit - market.value) / market.value) * 100 : null;
  const band = pct == null ? null : gradeOf(pct);

  let head = "";
  if (band && market) {
    head = `<div class="calc-verdict">
      <span class="grade-badge ${band.cls}">${band.id}</span>
      <p class="calc-verdict-t">${escapeHtml(band.verdict)}</p>
      <p class="calc-verdict-sub">${escapeHtml(market.label)} <b>${won(Math.round(market.value))}</b>원/${unitLabel} 대비 <b class="${pct <= 0 ? "minus" : "plus"}">${signedPct(
      pct
    )}</b> · 표본 ${market.sample}개</p>
    </div>`;
  } else {
    head = `<div class="calc-verdict is-plain">
      <p class="calc-verdict-t">단가만 계산했어요</p>
      <p class="calc-verdict-sub">같은 용기·같은 분류에 비교할 시세 표본이 부족해요. 브랜드를 골라 보세요.</p>
    </div>`;
  }

  const rows = [
    [unitLabel, `<b>${won(Math.round(unit))}원</b>`],
    ["1개(캔·병)당", `${won(Math.round(each))}원`],
  ];
  if (protein20) rows.push(["단백질 20g당", `${won(Math.round(protein20))}원`]);
  rows.push(["총 결제액", `${won(total)}원${ship > 0 ? ` (배송비 ${won(ship)}원 포함)` : ""}`]);

  const shareText = `${calcState.brand ? calcState.brand + " " : ""}${vol}${unitKind === "per100g" ? "g" : "ml"} × ${qty}개 ${won(
    total
  )} → ${unitLabel} ${won(Math.round(unit))}원 · ${band ? band.id : "단가만"}${market && band ? ` (${market.shortLabel} 대비 ${signedPct(pct)})` : ""}`;

  out.innerHTML = `${head}
    <div class="calc-kvs">${calcKvHTML(rows)}</div>
    <div class="calc-result-acts">
      <button type="button" class="calc-copy" data-calc-copy="${escapeHtml(shareText)}">결과 복사</button>
      <button type="button" class="calc-again" data-calc-reset>새로 계산</button>
    </div>`;
}

function calcReadTitle() {
  const els = calcEls();
  const text = els.raw ? els.raw.value : "";
  if (!text.trim()) {
    showToast("딜 문구를 먼저 붙여넣어 주세요");
    return;
  }
  const parsed = parseDealText(text);
  if (parsed.price) els.price.value = parsed.price;
  if (parsed.freeShip) els.ship.value = 0;
  else if (parsed.ship != null) els.ship.value = parsed.ship;
  if (parsed.volume) els.vol.value = parsed.volume;
  if (parsed.qty) els.qty.value = parsed.qty;
  if (parsed.protein) els.protein.value = parsed.protein;

  const cat = guessCategory(text, state.data.categories || []);
  const brands = [...new Set((state.data.products || []).map((p) => String(p.brand || "").trim()).filter(Boolean))];
  const brand = guessBrand(text, brands);
  if (cat) {
    fillCalcCategories(cat);
    calcState.category = cat;
  }
  fillCalcBrands(brand || "");
  calcState.brand = els.brand.value;

  if (!parsed.price && !parsed.volume) {
    showToast("값을 찾지 못했어요. 직접 넣어 주세요");
    return;
  }
  runCalc();
}

function calcSample() {
  const els = calcEls();
  if (els.raw) els.raw.value = "펩시 제로 355ml 48캔 (25,760원/무료)";
  calcReadTitle();
}

function openCalc() {
  const els = calcEls();
  if (!els.modal) return;
  if (!els.cat.options.length) fillCalcCategories(calcState.category || "cola");
  if (!els.brand.options.length) fillCalcBrands(calcState.brand);
  els.modal.hidden = false;
  document.body.classList.add("modal-open");
  const x = $("calc-x");
  if (x) x.focus({ preventScroll: true });
}

function closeCalc() {
  const els = calcEls();
  if (!els.modal || els.modal.hidden) return;
  els.modal.hidden = true;
  if (!document.querySelector(".pm-modal:not([hidden]), .install-modal:not([hidden]), .alert-modal:not([hidden])")) {
    document.body.classList.remove("modal-open");
  }
}

function initCalc() {
  const els = calcEls();
  if (!els.modal) return;
  fillCalcCategories("cola");
  fillCalcBrands("");

  els.cat.addEventListener("change", () => {
    calcState.category = els.cat.value;
    fillCalcBrands("");
    if (els.result && !els.result.hidden) runCalc();
  });
  els.brand.addEventListener("change", () => {
    calcState.brand = els.brand.value;
    if (els.result && !els.result.hidden) runCalc();
  });
  const read = $("calc-read");
  if (read) read.addEventListener("click", calcReadTitle);
  if (els.raw) {
    els.raw.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        e.preventDefault();
        calcReadTitle();
      }
    });
  }
  const go = $("calc-go");
  if (go) go.addEventListener("click", runCalc);
  const sample = $("calc-sample");
  if (sample) sample.addEventListener("click", calcSample);
  const x = $("calc-x");
  if (x) x.addEventListener("click", closeCalc);
  els.modal.addEventListener("click", (e) => {
    if (e.target === els.modal) closeCalc();
  });
  document.addEventListener("click", async (e) => {
    const copy = e.target.closest("[data-calc-copy]");
    if (copy) {
      const ok = await copyText(copy.getAttribute("data-calc-copy"));
      showToast(ok ? "계산 결과를 복사했어요" : "복사하지 못했어요");
      return;
    }
    if (e.target.closest("[data-calc-reset]")) {
      els.raw.value = "";
      els.price.value = "";
      els.vol.value = "";
      els.qty.value = "";
      els.protein.value = "";
      els.ship.value = "0";
      els.result.hidden = true;
      els.raw.focus();
      return;
    }
    const opener = e.target.closest("[data-calc]");
    if (opener) {
      e.preventDefault();
      openCalc();
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeCalc();
  });
}
