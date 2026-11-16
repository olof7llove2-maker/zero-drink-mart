const won = (n) => Number(n).toLocaleString("ko-KR") + "원";
const $ = (id) => document.getElementById(id);
const CONV_UNIT = 2000;

const state = {
  data: null,
  category: "all",
  sort: "per100",
  container: "all",
  ingredient: "all",
  calcCount: 1,
  calcTarget: "all",
};

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

function proteinValue(p) {
  const n = p.protein_g_per_bottle;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function kcalValue(p) {
  const n = p.kcal_per_bottle;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}

function kcalLabel(p) {
  if (p.kcalLabel) return p.kcalLabel;
  const n = kcalValue(p);
  return n != null ? `${n}kcal` : null;
}

function isPowder(p) {
  return p.category === "powder" || p.container === "powder";
}

function unitKey(p) {
  return isPowder(p) ? "unitPricePer100g" : "unitPricePer100ml";
}

function unitEachPrice(p) {
  if (p.price == null || !p.packCount) return null;
  return p.price / p.packCount;
}

function proteinPerG(p) {
  if (typeof p.proteinPerG === "number" && Number.isFinite(p.proteinPerG)) {
    return p.proteinPerG;
  }
  const g = proteinValue(p);
  const each = unitEachPrice(p);
  if (g == null || each == null || g <= 0) return null;
  return Math.round(each / g);
}

function matchesIngredient(p, ingredient) {
  if (!ingredient || ingredient === "all") return true;
  if (ingredient === "caffeine-free") return p.caffeine === "none";
  if (ingredient === "no-aspartame") return p.aspartame === "none";
  return true;
}

function productsIn(cat, container, ingredient) {
  const pack = container == null ? state.container : container;
  const ing = ingredient == null ? state.ingredient : ingredient;
  let all = state.data.products || [];
  if (cat && cat !== "all") all = all.filter((p) => p.category === cat);
  if (pack && pack !== "all") all = all.filter((p) => p.container === pack);
  if (ing && ing !== "all") all = all.filter((p) => matchesIngredient(p, ing));
  return all.slice();
}

function categoryOrder() {
  const ids = (state.data.categories || []).filter((c) => c.id !== "all").map((c) => c.id);
  const protein = ids.filter((id) => id === "protein");
  const powder = ids.filter((id) => id === "powder");
  const rest = ids.filter((id) => id !== "protein" && id !== "powder");
  return protein.concat(rest, powder);
}

function sortByProtein(list) {
  return list
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const av = proteinValue(a.p);
      const bv = proteinValue(b.p);
      const aMissing = av == null;
      const bMissing = bv == null;
      if (aMissing && bMissing) return a.i - b.i;
      if (aMissing) return 1;
      if (bMissing) return -1;
      if (bv !== av) return bv - av;
      return a.i - b.i;
    })
    .map((x) => x.p);
}

function sortProducts(list, forceKey) {
  const key = forceKey || state.sort;
  if (key === "protein") return sortByProtein(list);
  const arr = list.map((p, i) => ({ p, i }));
  arr.sort((a, b) => {
    if (key === "discount") {
      const d = (b.p.discountPct || 0) - (a.p.discountPct || 0);
      return d !== 0 ? d : a.i - b.i;
    }
    if (key === "price") {
      const d = (a.p.price || Infinity) - (b.p.price || Infinity);
      return d !== 0 ? d : a.i - b.i;
    }
    if (key === "proteinPerG") {
      const av = proteinPerG(a.p);
      const bv = proteinPerG(b.p);
      if (av == null && bv == null) return a.i - b.i;
      if (av == null) return 1;
      if (bv == null) return -1;
      if (av !== bv) return av - bv;
      return a.i - b.i;
    }
    const field = key === "per100g" ? "unitPricePer100g" : unitKey(a.p) === unitKey(b.p) ? unitKey(a.p) : "unitPricePer100ml";
    const av = a.p[field];
    const bv = b.p[field];
    if (av == null && bv == null) return a.i - b.i;
    if (av == null) return 1;
    if (bv == null) return -1;
    if (av !== bv) return av - bv;
    return a.i - b.i;
  });
  return arr.map((x) => x.p);
}

function cheapestIds(list) {
  const by = {};
  list.forEach((p) => {
    const v = p[unitKey(p)];
    if (v == null) return;
    (by[p.category] || (by[p.category] = [])).push(p);
  });
  const ids = new Set();
  Object.values(by).forEach((arr) => {
    const field = unitKey(arr[0]);
    const m = Math.min(...arr.map((p) => p[field]));
    arr.filter((p) => p[field] === m).forEach((p) => ids.add(p.id));
  });
  return ids;
}

function cheapLabel(p) {
  return isPowder(p) ? "100g당 가장 저렴" : "100ml당 가장 저렴";
}

function topProteinIds(list) {
  const arr = list.filter((p) => p.category === "protein" && proteinValue(p) != null);
  const ids = new Set();
  if (!arr.length) return ids;
  const m = Math.max(...arr.map((p) => proteinValue(p)));
  arr.filter((p) => proteinValue(p) === m).forEach((p) => ids.add(p.id));
  return ids;
}

function defaultSortFor(cat) {
  if (cat === "protein") return "protein";
  if (cat === "powder") return "per100g";
  return "per100";
}

function visibleSorts() {
  const all = state.data.sorts || [];
  if (state.category === "protein") {
    return all.filter((s) => s.id !== "per100g");
  }
  if (state.category === "powder") {
    return all.filter((s) => s.id !== "protein" && s.id !== "per100" && s.id !== "proteinPerG");
  }
  if (state.category === "all") {
    return all.filter((s) => s.id !== "per100g");
  }
  return all.filter((s) => s.id !== "protein" && s.id !== "per100g" && s.id !== "proteinPerG");
}

function syncUrl() {
  const url = new URL(location.href);
  if (state.category === "all") url.searchParams.delete("cat");
  else url.searchParams.set("cat", state.category);
  if (state.sort === defaultSortFor(state.category)) url.searchParams.delete("sort");
  else url.searchParams.set("sort", state.sort);
  if (state.container === "all") url.searchParams.delete("pack");
  else url.searchParams.set("pack", state.container);
  if (state.ingredient === "all") url.searchParams.delete("ing");
  else url.searchParams.set("ing", state.ingredient);
  history.replaceState({}, "", url);
}

function setLegalOffset() {
  const legal = document.querySelector(".legal");
  if (!legal) return;
  document.documentElement.style.setProperty("--legal-h", legal.offsetHeight + "px");
}

function tabClick(id) {
  const prev = state.category;
  state.category = id;
  if (defaultSortFor(prev) === state.sort || !visibleSorts().some((s) => s.id === state.sort)) {
    state.sort = defaultSortFor(id);
  }
  paint();
  const wrap = $("tabs-wrap");
  if (wrap && wrap.getBoundingClientRect().top < 8) {
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function renderTabs() {
  const nav = $("tabs");
  nav.innerHTML = "";
  state.data.categories.forEach((c) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "tab" + (c.id === "protein" ? " is-protein" : "");
    btn.textContent = c.label;
    btn.setAttribute("aria-selected", String(c.id === state.category));
    btn.addEventListener("click", () => tabClick(c.id));
    nav.appendChild(btn);
    if (c.id === state.category) {
      requestAnimationFrame(() => {
        const mid = btn.offsetLeft - nav.clientWidth / 2 + btn.offsetWidth / 2;
        nav.scrollTo({ left: Math.max(0, mid), behavior: "smooth" });
      });
    }
  });
}

function renderChipNav(nav, items, current, onPick) {
  if (!nav) return;
  nav.innerHTML = "";
  (items || []).forEach((c) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter";
    btn.textContent = c.label;
    btn.setAttribute("aria-selected", String(c.id === current));
    btn.addEventListener("click", () => onPick(c.id));
    nav.appendChild(btn);
  });
}

function renderFilters() {
  renderChipNav($("filters"), state.data.containers || [], state.container, (id) => {
    state.container = id;
    paint();
  });
}

function renderIngredients() {
  renderChipNav($("ingredients"), state.data.ingredientFilters || [], state.ingredient, (id) => {
    state.ingredient = id;
    paint();
  });
}

function renderSorts() {
  const nav = $("sorts");
  if (!nav) return;
  nav.innerHTML = "";
  const lab = document.createElement("span");
  lab.className = "sorts-label";
  lab.textContent = "비교";
  nav.appendChild(lab);
  visibleSorts().forEach((s) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sort-btn";
    btn.textContent = s.label;
    btn.setAttribute("aria-selected", String(s.id === state.sort));
    btn.addEventListener("click", () => {
      state.sort = s.id;
      paint();
    });
    nav.appendChild(btn);
  });
}

function dropVsPrevious(p) {
  if (p.previousPrice == null || p.price == null || p.price >= p.previousPrice) return null;
  const pct = Math.round(((p.previousPrice - p.price) / p.previousPrice) * 100);
  return pct > 0 ? pct : null;
}

function isRecentLow(p) {
  return (
    p.lowest30d != null &&
    p.price != null &&
    p.price <= p.lowest30d &&
    (p.priceHistoryDays || 0) >= 7
  );
}

function dealMarks(p) {
  const bits = [];
  const drop = dropVsPrevious(p);
  if (drop != null) {
    bits.push(`<span class="drop-badge">이전가 대비 -${drop}%</span>`);
  }
  if (isRecentLow(p)) {
    bits.push(`<span class="low-badge">최근 최저가</span>`);
  }
  return bits.join("");
}

function topDeals(all) {
  const dropped = all
    .map((p) => ({ p, drop: dropVsPrevious(p) }))
    .filter((x) => x.drop != null)
    .sort((a, b) => (b.drop !== a.drop ? b.drop - a.drop : a.p.price - b.p.price));
  if (dropped.length) {
    return {
      title: "오늘 특가 TOP 3",
      items: dropped.slice(0, 3).map((x) => ({
        p: x.p,
        label: `이전가 대비 -${x.drop}%`,
      })),
    };
  }
  const discounted = all
    .filter((p) => p.discountPct)
    .sort((a, b) => (b.discountPct || 0) - (a.discountPct || 0) || a.price - b.price);
  return {
    title: "오늘 할인 큰 순 TOP 3",
    items: discounted.slice(0, 3).map((p) => ({
      p,
      label: `정가 대비 -${p.discountPct}%`,
    })),
  };
}

function renderDeals() {
  const sec = $("deals");
  const row = $("deals-row");
  const title = $("deals-title");
  if (!sec || !row || !title) return;
  const { title: heading, items } = topDeals(state.data.products || []);
  if (!items.length) {
    sec.hidden = true;
    row.innerHTML = "";
    return;
  }
  sec.hidden = false;
  title.textContent = heading;
  row.innerHTML = items
    .map(({ p, label }) => {
      const img = p.image
        ? `<img src="${p.image}" alt="" decoding="async">`
        : "";
      return `<button type="button" class="deal-card" data-id="${escapeHtml(p.id)}">
        <div class="deal-photo">${img}</div>
        <div class="deal-body">
          <p class="deal-drop">${escapeHtml(label)}</p>
          <p class="deal-name">${escapeHtml(p.name)}</p>
          <p class="deal-price">${p.price != null ? won(p.price) : ""}</p>
        </div>
      </button>`;
    })
    .join("");
  row.querySelectorAll(".deal-card").forEach((btn) => {
    btn.addEventListener("click", () => {
      const id = btn.getAttribute("data-id");
      const el = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
      if (el) el.scrollIntoView({ behavior: "smooth", block: "center" });
    });
  });
}

function cheapestUnitIn(list) {
  let best = null;
  list.forEach((p) => {
    const each = unitEachPrice(p);
    if (each == null) return;
    if (!best || each < best.each) best = { p, each };
  });
  return best;
}

function calcSelection() {
  const all = state.data.products || [];
  const val = state.calcTarget;
  if (val === "all") {
    const best = cheapestUnitIn(all);
    return best ? { label: `전체 · ${best.p.name}`, each: best.each, p: best.p } : null;
  }
  if (val.startsWith("cat:")) {
    const cat = val.slice(4);
    const label = (state.data.categories || []).find((c) => c.id === cat);
    const best = cheapestUnitIn(all.filter((p) => p.category === cat));
    if (!best) return null;
    return { label: `${label ? label.label : cat} · ${best.p.name}`, each: best.each, p: best.p };
  }
  if (val.startsWith("p:")) {
    const p = all.find((x) => x.id === val.slice(2));
    const each = p ? unitEachPrice(p) : null;
    if (!p || each == null) return null;
    return { label: p.name, each, p };
  }
  return null;
}

function calcSavings() {
  const sel = calcSelection();
  if (!sel) return null;
  const unitSave = Math.max(0, CONV_UNIT - sel.each);
  const amount = Math.round(30 * state.calcCount * unitSave);
  return { ...sel, amount };
}

function renderCalcResult() {
  const el = $("calc-result");
  if (!el) return;
  const res = calcSavings();
  if (!res) {
    el.textContent = "계산할 상품이 없어요.";
    return;
  }
  el.textContent = `편의점(개당 2,000원 기준) 대신 여기서 박스 구매 시 한 달 ${won(res.amount)} 절약!`;
}

function calcCopyText() {
  const res = calcSavings();
  if (!res) return "";
  return [
    `하루 ${state.calcCount}개, ${res.label}`,
    `편의점(개당 2,000원 기준) 대신 여기서 박스 구매 시 한 달 ${won(res.amount)} 절약!`,
    location.href,
  ].join("\n");
}

function fillCalcSelect() {
  const sel = $("calc-type");
  if (!sel || sel.dataset.ready === "1") return;
  const cats = (state.data.categories || []).filter((c) => c.id !== "all");
  const all = state.data.products || [];
  let html = `<option value="all">전체 (가장 싼 개당가)</option>`;
  html += `<optgroup label="분류 (가장 싼 개당가)">`;
  cats.forEach((c) => {
    if (!all.some((p) => p.category === c.id && unitEachPrice(p) != null)) return;
    html += `<option value="cat:${escapeHtml(c.id)}">${escapeHtml(c.label)}</option>`;
  });
  html += `</optgroup><optgroup label="상품">`;
  all.forEach((p) => {
    if (unitEachPrice(p) == null) return;
    html += `<option value="p:${escapeHtml(p.id)}">${escapeHtml(p.name)}</option>`;
  });
  html += `</optgroup>`;
  sel.innerHTML = html;
  sel.value = state.calcTarget;
  sel.dataset.ready = "1";
  sel.addEventListener("change", () => {
    state.calcTarget = sel.value;
    renderCalcResult();
  });
}

function bindCalc() {
  document.querySelectorAll(".calc-n").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.calcCount = Number(btn.getAttribute("data-n")) || 1;
      document.querySelectorAll(".calc-n").forEach((b) => {
        b.setAttribute("aria-selected", String(b === btn));
      });
      renderCalcResult();
    });
  });
  const copyBtn = $("calc-copy");
  const copied = $("calc-copied");
  if (copyBtn) {
    copyBtn.addEventListener("click", async () => {
      const text = calcCopyText();
      if (!text) return;
      try {
        await navigator.clipboard.writeText(text);
      } catch {
        const ta = document.createElement("textarea");
        ta.value = text;
        document.body.appendChild(ta);
        ta.select();
        document.execCommand("copy");
        ta.remove();
      }
      if (copied) {
        copied.hidden = false;
        setTimeout(() => {
          copied.hidden = true;
        }, 1600);
      }
    });
  }
}

function priceBlock(p) {
  if (p.price == null) return "";
  const pct = p.discountPct ? `<span class="pct">${p.discountPct}%</span>` : "";
  const list = p.listPrice ? `<span class="list">${won(p.listPrice)}</span>` : "";
  const unit = p.unitPrice ? `<span class="unit">${escapeHtml(p.unitPrice)}</span>` : "";
  const each = p.unitEach ? `<span class="unit">${escapeHtml(p.unitEach)}</span>` : "";
  const from = p.unitPriceRecomputedFrom
    ? `<span class="unit-note">목록 표기 ${escapeHtml(p.unitPriceRecomputedFrom)}</span>`
    : "";
  return `
    <div class="price-row">
      ${pct}
      <span class="price">${won(p.price)}</span>
      ${list}
    </div>
    <p class="units">${unit}${each}</p>
    ${from}`;
}

function isToss(p) {
  return p.platform === "toss";
}

function sourceChip(p) {
  const toss = isToss(p);
  const label = toss ? "토스" : "쿠팡";
  const cls = toss ? "src-chip src-toss" : "src-chip src-coupang";
  return `<span class="${cls}">${label}</span>`;
}

function cta(p) {
  const href = p.affiliateUrl;
  if (!href) return `<p class="pending-label">링크 준비 중</p>`;
  const toss = isToss(p);
  const label = toss ? "토스에서 보기" : "쿠팡에서 보기";
  const cls = toss ? "cta cta-toss" : "cta";
  return `<a class="${cls}" href="${href}" target="_blank" rel="noopener noreferrer">${label}</a>`;
}

function chips(p, isProteinCard) {
  const parts = [];
  if (!isProteinCard) {
    const kcalText = kcalLabel(p);
    if (kcalText) parts.push(`<span class="chip chip-kcal">${escapeHtml(kcalText)}</span>`);
  }
  if (p.unitPrice) parts.push(`<span class="chip chip-unit">${escapeHtml(p.unitPrice)}</span>`);
  if (isProteinCard) {
    const perg = proteinPerG(p);
    if (perg != null) {
      parts.push(`<span class="chip chip-perg">단백질 1g당 ${won(perg)}</span>`);
    }
  }
  if (!parts.length) return "";
  return `<div class="chips">${parts.join("")}</div>`;
}

function proteinHero(p) {
  const prot = proteinValue(p);
  const kcalText = kcalLabel(p);
  if (prot == null && !kcalText) return "";
  const figure = prot != null
    ? `<div class="protein-figure">${prot}<span class="g">g</span><span class="label">단백질</span></div>`
    : "";
  const kcalSide = kcalText
    ? `<div class="kcal-side">${escapeHtml(kcalText)}</div>`
    : "";
  return `<div class="protein-hero">${figure}${kcalSide}</div>`;
}

function photoHTML(p, rankMark) {
  if (p.image) {
    return `<div class="photo">${rankMark}<img src="${p.image}" alt="${escapeHtml(p.name)}" decoding="async"></div>`;
  }
  return `<div class="photo is-blank">${rankMark}<span>사진 준비 중</span></div>`;
}

function card(p, cheap, topProt, rank) {
  const isProtein = p.category === "protein";
  const el = document.createElement("article");
  el.className = "card" + (isProtein ? " card-protein" : "");
  el.dataset.id = p.id;
  const rankMark = isProtein && rank ? `<span class="rank">${rank}</span>` : "";
  const cheapBadge = cheap ? `<span class="cheap-badge">${cheapLabel(p)}</span>` : "";
  const protBadge = topProt ? `<span class="protein-badge">단백질 가장 많음</span>` : "";
  const when = [p.priceCheckedLabel, state.data.site.priceNote].filter(Boolean).join(" · ");
  el.innerHTML = `
    ${photoHTML(p, rankMark)}
    <div class="body">
      <p class="brand-name"><span>${escapeHtml(p.brand || "")}</span>${sourceChip(p)}${cheapBadge}${protBadge}${dealMarks(p)}</p>
      <h3 class="name">${escapeHtml(p.name)}</h3>
      ${isProtein ? proteinHero(p) : ""}
      ${chips(p, isProtein)}
      ${priceBlock(p)}
      <p class="when">${escapeHtml(when)}</p>
      ${cta(p)}
    </div>
  `;
  return el;
}

function renderCompare(list) {
  const sec = $("compare");
  const table = $("compare-table");
  if (!sec || !table) return;
  if (state.category === "all" || list.length < 2) {
    sec.hidden = true;
    table.innerHTML = "";
    return;
  }
  sec.hidden = false;
  const showProtein = list.some((p) => proteinValue(p) != null);
  const showKcal = list.some((p) => kcalLabel(p));
  const showPerG = list.some((p) => proteinPerG(p) != null);
  const powder = list.every(isPowder);
  const unitHead = powder ? "100g당" : "100ml당";
  const cheap = cheapestIds(list);
  const topProt = topProteinIds(list);
  const head = `<thead><tr>
    <th>상품</th>
    <th>맛</th>
    <th>${unitHead}</th>
    <th>할인</th>
    ${showKcal ? "<th>열량</th>" : ""}
    ${showProtein ? "<th>단백질</th>" : ""}
    ${showPerG ? "<th>1g당</th>" : ""}
  </tr></thead>`;
  const rows = list.map((p) => {
    const per = p.unitPrice || "";
    const disc = p.discountPct ? `${p.discountPct}%` : "";
    const marks = [
      cheap.has(p.id) ? `<span class="cheap-dot">${cheapLabel(p)}</span>` : "",
      topProt.has(p.id) ? `<span class="protein-dot">단백질 가장 많음</span>` : "",
    ].join("");
    const thumb = p.image ? `<img src="${p.image}" alt="">` : "";
    const kcalText = kcalLabel(p);
    const prot = proteinValue(p);
    const perg = proteinPerG(p);
    return `<tr>
      <td class="cmp-name">${thumb}<span>${escapeHtml(p.name)}${marks}</span></td>
      <td>${escapeHtml(p.kind || p.flavor || "")}</td>
      <td>${escapeHtml(per)}</td>
      <td>${disc}</td>
      ${showKcal ? `<td>${kcalText ? escapeHtml(kcalText) : ""}</td>` : ""}
      ${showProtein ? `<td>${prot != null ? `${prot}g` : ""}</td>` : ""}
      ${showPerG ? `<td>${perg != null ? won(perg) : ""}</td>` : ""}
    </tr>`;
  }).join("");
  table.innerHTML = `${head}<tbody>${rows}</tbody>`;
}

function proteinRanks(list) {
  const ranks = {};
  let n = 0;
  list.forEach((p) => {
    if (proteinValue(p) == null) return;
    n += 1;
    ranks[p.id] = n;
  });
  return ranks;
}

function groupHint(catId) {
  if (catId === "protein") {
    if (state.sort === "proteinPerG") return "단백질 1g당 가격 낮은 순";
    if (state.sort === "discount") return "할인율 높은 순";
    if (state.sort === "price") return "박스 가격 낮은 순";
    return "병당 단백질 높은 순";
  }
  if (catId === "powder") return "100g당 가격 낮은 순";
  return "100ml당 가격 낮은 순";
}

function proteinUsesGOrder() {
  return state.sort === "protein" || (state.sort !== "proteinPerG" && state.sort !== "discount" && state.sort !== "price");
}

function orderedForGroup(catId, list) {
  if (catId === "protein") {
    if (state.sort === "proteinPerG" || state.sort === "discount" || state.sort === "price") {
      return sortProducts(list, state.sort);
    }
    return sortByProtein(list);
  }
  if (catId === "powder") return sortProducts(list, "per100g");
  return sortProducts(list, state.category === "all" ? "per100" : state.sort);
}

function renderGroup(parent, catId, list, cheap, topProt) {
  const cat = state.data.categories.find((c) => c.id === catId);
  const isProtein = catId === "protein";
  const ordered = orderedForGroup(catId, list);
  const ranks = isProtein && proteinUsesGOrder() ? proteinRanks(ordered) : {};
  const sec = document.createElement("section");
  sec.className = "group-block";
  sec.id = `group-${catId}`;
  const head = document.createElement("div");
  head.className = "group-head";
  const title = document.createElement("h2");
  title.textContent = cat ? cat.label : catId;
  const hint = document.createElement("span");
  hint.className = "group-hint";
  hint.textContent = groupHint(catId);
  head.appendChild(title);
  head.appendChild(hint);
  sec.appendChild(head);
  const grid = document.createElement("div");
  grid.className = "grid photo-grid";
  ordered.forEach((p) => grid.appendChild(card(p, cheap.has(p.id), topProt.has(p.id), ranks[p.id])));
  sec.appendChild(grid);
  parent.appendChild(sec);
}

function renderProducts() {
  const grid = $("grid");
  const empty = $("empty");
  const note = $("cat-note");
  const cat = state.data.categories.find((c) => c.id === state.category);
  const list = productsIn(state.category, state.container, state.ingredient);
  const cheap = cheapestIds(list.length ? list : productsIn("all", state.container, state.ingredient));
  const topProt = topProteinIds(state.data.products);

  if (cat && cat.note) {
    note.hidden = false;
    note.textContent = cat.note;
  } else {
    note.hidden = true;
    note.textContent = "";
  }

  grid.className = "grid photo-grid";
  grid.innerHTML = "";

  if (!list.length) {
    empty.hidden = false;
    grid.hidden = true;
    renderCompare([]);
    return;
  }
  empty.hidden = true;
  grid.hidden = false;

  if (state.category === "all") {
    grid.className = "groups";
    categoryOrder().forEach((id) => {
      const items = list.filter((p) => p.category === id);
      if (items.length) renderGroup(grid, id, items, cheap, topProt);
    });
    renderCompare([]);
  } else {
    const isProtein = state.category === "protein";
    const ordered = isProtein && state.sort === "protein"
      ? sortByProtein(list)
      : sortProducts(list);
    const ranks = isProtein && state.sort === "protein" ? proteinRanks(ordered) : {};
    ordered.forEach((p) => grid.appendChild(card(p, cheap.has(p.id), topProt.has(p.id), ranks[p.id])));
    renderCompare(ordered);
  }
}

/* ---- 홈 화면 바로가기 추가 ---- */
let installPromptEvent = null;

window.addEventListener("beforeinstallprompt", (e) => {
  e.preventDefault();
  installPromptEvent = e;
});

window.addEventListener("appinstalled", () => {
  installPromptEvent = null;
  hideShortcutBanners();
});

function isStandalone() {
  try {
    return (
      (window.matchMedia && window.matchMedia("(display-mode: standalone)").matches) ||
      (window.matchMedia && window.matchMedia("(display-mode: fullscreen)").matches) ||
      window.navigator.standalone === true
    );
  } catch {
    return false;
  }
}

function hideShortcutBanners() {
  document.querySelectorAll(".shortcut-wrap").forEach((el) => {
    el.hidden = true;
  });
}

function deviceEnv() {
  const ua = navigator.userAgent || "";
  const iOS =
    /iPad|iPhone|iPod/.test(ua) ||
    (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
  const android = /Android/i.test(ua);
  const inApp = /KAKAOTALK|NAVER|Instagram|FBAN|FBAV|Line\/|Twitter/i.test(ua);
  const mac = !iOS && /Macintosh|Mac OS X/.test(ua);
  return { iOS, android, inApp, mac };
}

function shortcutGuide() {
  const { iOS, android, inApp, mac } = deviceEnv();
  const ua = navigator.userAgent || "";

  if (iOS) {
    if (inApp) {
      return {
        device: "아이폰 · 앱 안 브라우저",
        steps: [
          "지금은 앱 안의 브라우저로 열려 있어요",
          "오른쪽 위 ⋯ 메뉴에서 'Safari로 열기'를 눌러요",
          "Safari 하단 공유 버튼(□↑) → '홈 화면에 추가' → '추가'",
        ],
        hint: "카카오톡·인스타그램 안에서는 홈 화면 추가가 막혀 있어요.",
      };
    }
    const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    if (!safari) {
      return {
        device: "아이폰 · Chrome 등",
        steps: [
          "오른쪽 위 공유 버튼을 눌러요",
          "'홈 화면에 추가'를 골라요",
          "'추가'를 누르면 끝!",
        ],
        hint: "공유 메뉴에 항목이 없으면 Safari로 열어 주세요.",
      };
    }
    return {
      device: "아이폰 · 아이패드 (Safari)",
      steps: [
        "하단 가운데 공유 버튼(□↑)을 눌러요",
        "목록에서 '홈 화면에 추가'를 골라요",
        "오른쪽 위 '추가'를 누르면 끝!",
      ],
      hint: "홈 화면의 띠니 아이콘으로 앱처럼 바로 열려요.",
    };
  }

  if (android) {
    if (inApp) {
      return {
        device: "안드로이드 · 앱 안 브라우저",
        steps: [
          "지금은 앱 안의 브라우저로 열려 있어요",
          "오른쪽 위 메뉴에서 'Chrome으로 열기'를 눌러요",
          "Chrome 오른쪽 위 ⋮ → '홈 화면에 추가' 또는 '앱 설치'",
        ],
        hint: "카카오톡·인스타그램 안에서는 설치가 막혀 있어요.",
      };
    }
    return {
      device: "안드로이드 (Chrome)",
      steps: [
        "오른쪽 위 ⋮ 메뉴를 눌러요",
        "'앱 설치' 또는 '홈 화면에 추가'를 골라요",
        "'설치'를 누르면 끝!",
      ],
      hint: "Chrome에서 주소창 오른쪽 설치 아이콘이 보이면 그걸 눌러도 돼요.",
    };
  }

  if (mac) {
    return {
      device: "맥 (PC)",
      steps: [
        "Chrome·Edge는 주소창 오른쪽 설치 아이콘 → '설치'",
        "Safari는 공유 → '즐겨찾기 추가' 또는 파일 → 'Dock에 추가'",
        "설치하면 Dock에서 앱처럼 바로 열려요",
      ],
      hint: "단축키 ⌘D 로 즐겨찾기에 추가할 수도 있어요.",
    };
  }

  return {
    device: "PC (Chrome·Edge)",
    steps: [
      "주소창 오른쪽의 설치 아이콘을 눌러요",
      "'설치'를 고르면 바탕화면에서 앱처럼 바로 열려요",
      "아이콘이 없으면 Ctrl+D 로 북마크에 추가해요",
    ],
    hint: "북마크에 넣어 두면 클릭 한 번으로 열 수 있어요.",
  };
}

function shortcutUrl() {
  return location.origin + location.pathname;
}

async function copyText(text) {
  try {
    await navigator.clipboard.writeText(text);
    return true;
  } catch {
    try {
      const ta = document.createElement("textarea");
      ta.value = text;
      ta.setAttribute("readonly", "");
      ta.style.position = "fixed";
      ta.style.top = "-1000px";
      document.body.appendChild(ta);
      ta.select();
      const ok = document.execCommand("copy");
      ta.remove();
      return ok;
    } catch {
      return false;
    }
  }
}

function showInstallModal(guide) {
  const modal = $("install-modal");
  if (!modal) return;
  const title = $("install-title");
  const device = $("install-device");
  const steps = $("install-steps");
  const hint = $("install-hint");
  const copied = $("install-copied");
  if (title) title.textContent = guide.title || "홈 화면에 추가하기";
  if (device) device.textContent = guide.device || "";
  if (steps) {
    steps.innerHTML = (guide.steps || [])
      .map((s) => `<li>${escapeHtml(s)}</li>`)
      .join("");
  }
  if (hint) {
    hint.textContent = guide.hint || "";
    hint.hidden = !guide.hint;
  }
  if (copied) {
    copied.hidden = true;
    copied.textContent = "주소를 복사했어요";
  }
  modal.hidden = false;
  document.body.classList.add("modal-open");
  const closeBtn = $("install-close");
  if (closeBtn) closeBtn.focus({ preventScroll: true });
}

function closeInstallModal() {
  const modal = $("install-modal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}

async function onShortcutClick() {
  if (isStandalone()) {
    showInstallModal({
      device: "",
      steps: ["지금 이미 홈 화면 앱으로 열고 있어요", "아이콘을 길게 누르면 삭제할 수 있어요"],
      hint: "주소창 없는 화면으로 열려 있으면 추가가 끝난 상태예요.",
    });
    return;
  }
  if (installPromptEvent) {
    const ev = installPromptEvent;
    installPromptEvent = null;
    try {
      ev.prompt();
      const choice = await ev.userChoice;
      if (choice && choice.outcome === "accepted") {
        hideShortcutBanners();
        return;
      }
      return;
    } catch {
      installPromptEvent = null;
    }
  }
  showInstallModal(shortcutGuide());
}

function initShortcut() {
  document.querySelectorAll("[data-shortcut]").forEach((btn) => {
    btn.addEventListener("click", onShortcutClick);
  });
  if (isStandalone()) {
    // 이미 홈 화면 앱으로 열고 있으면 배너는 숨기고 안내만 남깁니다.
    hideShortcutBanners();
  }
  const modal = $("install-modal");
  if (!modal) return;
  const close = $("install-close");
  const x = $("install-x");
  if (close) close.addEventListener("click", closeInstallModal);
  if (x) x.addEventListener("click", closeInstallModal);
  modal.addEventListener("click", (e) => {
    if (e.target === modal) closeInstallModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeInstallModal();
  });
  const copy = $("install-copy");
  if (copy) {
    copy.addEventListener("click", async () => {
      const url = shortcutUrl();
      const ok = await copyText(url);
      const copied = $("install-copied");
      if (!copied) return;
      copied.textContent = ok ? "주소를 복사했어요" : `직접 복사해 주세요: ${url}`;
      copied.hidden = false;
      setTimeout(() => {
        copied.hidden = true;
      }, 2400);
    });
  }
}

function paint() {
  syncUrl();
  renderTabs();
  renderFilters();
  renderIngredients();
  renderSorts();
  renderProducts();
  renderDeals();
  renderCalcResult();
}

function catalogFromGlobals() {
  if (typeof PRODUCTS === "undefined") return null;
  return {
    site: typeof SITE !== "undefined" ? SITE : {},
    categories: typeof CATEGORIES !== "undefined" ? CATEGORIES : [],
    sorts: typeof SORTS !== "undefined" ? SORTS : [],
    containers: typeof CONTAINERS !== "undefined" ? CONTAINERS : [],
    ingredientFilters: typeof INGREDIENT_FILTERS !== "undefined" ? INGREDIENT_FILTERS : [],
    products: PRODUCTS,
  };
}

async function loadCatalog() {
  const fromJs = catalogFromGlobals();
  if (fromJs) return fromJs;
  const res = await fetch("data/products.json", { cache: "no-store" });
  if (!res.ok) throw new Error("상품 정보를 불러오지 못했어요.");
  return res.json();
}

async function init() {
  setLegalOffset();
  initShortcut();
  window.addEventListener("resize", setLegalOffset);
  state.data = await loadCatalog();
  const q = new URLSearchParams(location.search);
  if (q.get("cat") && state.data.categories.some((c) => c.id === q.get("cat"))) {
    state.category = q.get("cat");
  }
  state.sort = defaultSortFor(state.category);
  const sorts = (state.data.sorts || []).map((s) => s.id);
  if (q.get("sort") && sorts.includes(q.get("sort"))) state.sort = q.get("sort");
  const packs = (state.data.containers || []).map((c) => c.id);
  if (q.get("pack") && packs.includes(q.get("pack"))) state.container = q.get("pack");
  const ings = (state.data.ingredientFilters || []).map((c) => c.id);
  if (q.get("ing") && ings.includes(q.get("ing"))) state.ingredient = q.get("ing");
  const when = $("source-when");
  if (when) {
    const src = state.data.site.sourceNote || "";
    const note = state.data.site.priceNote || "";
    when.textContent = [src, note].filter(Boolean).join(" ");
  }
  fillCalcSelect();
  bindCalc();
  paint();
}

init().catch((err) => {
  const empty = $("empty");
  empty.hidden = false;
  empty.textContent = "상품 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
  console.error(err);
});
