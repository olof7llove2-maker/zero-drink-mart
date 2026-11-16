const won = (n) => Number(n).toLocaleString("ko-KR") + "원";
const $ = (id) => document.getElementById(id);
const CONV_UNIT = 2000;
const SHARE_BASE = "https://zero-drink-mart.vercel.app";

const state = {
  data: null,
  priceHistory: null,
  priceMeta: null,
  part: "all",
  filter: "all",
  sort: "per100",
  container: "all",
  ingredient: "all",
  calcCount: 1,
  calcTarget: "all",
  highlightId: null,
};

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ── 분류 구조 (대분류 → 세부 분류) ───────────────────── */

function allParts() {
  return state.data.parts && state.data.parts.length
    ? state.data.parts
    : [{ id: "all", label: "전체" }];
}

function partById(id) {
  return allParts().find((p) => p.id === id) || null;
}

function currentPart() {
  return partById(state.part);
}

function partOf(p) {
  if (p.part) return p.part;
  if (p.category === "protein") return "protein";
  const cat = (state.data.categories || []).find((c) => c.id === p.category);
  return cat && cat.part ? cat.part : "zero";
}

function meatCats() {
  return (state.data.categories || []).filter((c) => c.part === "meat").map((c) => c.id);
}

function isMeat(p) {
  return partOf(p) === "meat";
}

function isGadget(p) {
  return p.category === "gadget";
}

function partFilters(partId) {
  const part = partById(partId == null ? state.part : partId);
  if (!part || !part.filters || !part.filters.length) {
    return [{ id: "all", label: "전체", cats: [] }];
  }
  return part.filters;
}

function filterCats(partId, filterId) {
  const pid = partId == null ? state.part : partId;
  const fid = filterId == null ? state.filter : filterId;
  if (pid === "all") return [];
  const f = partFilters(pid).find((x) => x.id === fid);
  return f ? f.cats || [] : [];
}

function currentFilter(partId, filterId) {
  const pid = partId == null ? state.part : partId;
  const fid = filterId == null ? state.filter : filterId;
  return partFilters(pid).find((x) => x.id === fid) || null;
}

/* 단백질 음료 세부 타입: soy(두유·식물성) · choco(초코·커피) · fruit(과일맛) · plain(플레인·고소한) */
function proteinType(p) {
  return p.proteinType || "plain";
}

function matchesFilter(p, f) {
  if (!f) return true;
  const cats = f.cats || [];
  const types = f.types || [];
  if (cats.length && !cats.includes(p.category)) return false;
  if (types.length && !types.includes(proteinType(p))) return false;
  if (typeof f.proteinMin === "number") {
    const g = proteinValue(p);
    if (g == null || g < f.proteinMin) return false;
  }
  return true;
}

function partCount(partId) {
  const list = state.data.products || [];
  if (!partId || partId === "all") return list.length;
  return list.filter((p) => partOf(p) === partId).length;
}

function filterCount(partId, f, ignorePack) {
  const pid = partId == null ? state.part : partId;
  const pack = ignorePack ? "all" : state.container;
  const ing = ignorePack ? "all" : state.ingredient;
  return (state.data.products || []).filter((p) => {
    if (pid !== "all" && partOf(p) !== pid) return false;
    if (!matchesFilter(p, f)) return false;
    if (pack && pack !== "all" && !isMeat(p) && p.container !== pack) return false;
    if (ing && ing !== "all" && !isMeat(p) && !matchesIngredient(p, ing)) return false;
    return true;
  }).length;
}

/* ── 단가 계산 ───────────────────────────────────────── */

const MEASURE_LABEL = { per100ml: "100ml", per100g: "100g", each: "개" };

function isPowder(p) {
  return p.category === "powder" || p.container === "powder";
}

function measureKind(p) {
  if (isGadget(p)) return "each";
  if (isPowder(p) || isMeat(p)) return "per100g";
  return "per100ml";
}

function measureValue(p) {
  const kind = measureKind(p);
  if (kind === "per100g") {
    if (typeof p.per100g === "number" && Number.isFinite(p.per100g)) return p.per100g;
    if (typeof p.unitPricePer100g === "number" && Number.isFinite(p.unitPricePer100g)) {
      return p.unitPricePer100g;
    }
    return null;
  }
  if (kind === "each") {
    return typeof p.price === "number" && Number.isFinite(p.price) ? p.price : null;
  }
  return typeof p.unitPricePer100ml === "number" && Number.isFinite(p.unitPricePer100ml)
    ? p.unitPricePer100ml
    : null;
}

function measureLabel(p) {
  return MEASURE_LABEL[measureKind(p)];
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

function reviewCountLabel(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toLocaleString("ko-KR");
}

/* ── 목록 고르기 ─────────────────────────────────────── */

function matchesIngredient(p, ingredient) {
  if (!ingredient || ingredient === "all") return true;
  if (ingredient === "caffeine-free") return p.caffeine === "none";
  if (ingredient === "no-aspartame") return p.aspartame === "none";
  return true;
}

function productsIn(partId, filterId, container, ingredient) {
  const pid = partId == null ? state.part : partId;
  const f = currentFilter(pid, filterId == null ? state.filter : filterId);
  const pack = container == null ? state.container : container;
  const ing = ingredient == null ? state.ingredient : ingredient;
  let all = (state.data.products || []).filter((p) => {
    if (pid !== "all" && partOf(p) !== pid) return false;
    return matchesFilter(p, f);
  });
  if (pack && pack !== "all") {
    all = all.filter((p) => (isMeat(p) ? true : p.container === pack));
  }
  if (ing && ing !== "all") {
    all = all.filter((p) => (isMeat(p) ? true : matchesIngredient(p, ing)));
  }
  return all.slice();
}

function drinkProducts() {
  return (state.data.products || []).filter((p) => !isMeat(p));
}

function categoryOrder() {
  const ids = (state.data.categories || []).filter((c) => c.id !== "all").map((c) => c.id);
  const protein = ids.filter((id) => id === "protein");
  const zero = ids.filter((id) => {
    const cat = state.data.categories.find((c) => c.id === id);
    return cat && cat.part === "zero" && id !== "powder";
  });
  const powder = ids.filter((id) => id === "powder");
  const meat = ids.filter((id) => meatCats().includes(id));
  return protein.concat(zero, powder, meat);
}

function categoryIdsInPart(partId) {
  const order = categoryOrder();
  return order.filter((id) => {
    const cat = state.data.categories.find((c) => c.id === id);
    return cat && cat.part === partId;
  });
}

/* ── 정렬 ────────────────────────────────────────────── */

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

function sortValueFor(p, key) {
  if (key === "per100g") return measureKind(p) === "per100g" ? measureValue(p) : null;
  if (key === "per100") return measureKind(p) === "per100ml" ? measureValue(p) : null;
  if (key === "proteinPerG") return proteinPerG(p);
  if (key === "rating") return typeof p.rating === "number" ? p.rating : null;
  if (key === "reviews") return typeof p.reviewCount === "number" ? p.reviewCount : null;
  if (key === "price") return typeof p.price === "number" ? p.price : null;
  if (key === "discount") return typeof p.discountPct === "number" ? p.discountPct : null;
  return null;
}

function sortProducts(list, forceKey) {
  const key = forceKey || state.sort;
  if (key === "protein") return sortByProtein(list);
  const desc = key === "discount" || key === "rating" || key === "reviews";
  const arr = list.map((p, i) => ({ p, i, v: sortValueFor(p, key) }));
  arr.sort((a, b) => {
    const an = a.v == null;
    const bn = b.v == null;
    if (an && bn) return a.i - b.i;
    if (an) return 1;
    if (bn) return -1;
    if (a.v !== b.v) return desc ? b.v - a.v : a.v - b.v;
    return a.i - b.i;
  });
  return arr.map((x) => x.p);
}

function cheapestIds(list) {
  const by = {};
  list.forEach((p) => {
    const v = measureValue(p);
    if (v == null) return;
    (by[p.category] || (by[p.category] = [])).push(p);
  });
  const ids = new Set();
  Object.values(by).forEach((arr) => {
    const m = Math.min(...arr.map((p) => measureValue(p)));
    arr.filter((p) => measureValue(p) === m).forEach((p) => ids.add(p.id));
  });
  return ids;
}

function cheapLabel(p) {
  const kind = measureKind(p);
  if (kind === "each") return "가장 저렴";
  return `${MEASURE_LABEL[kind]}당 가장 저렴`;
}

function topProteinIds(list) {
  const arr = list.filter((p) => p.category === "protein" && proteinValue(p) != null);
  const ids = new Set();
  if (!arr.length) return ids;
  const m = Math.max(...arr.map((p) => proteinValue(p)));
  arr.filter((p) => proteinValue(p) === m).forEach((p) => ids.add(p.id));
  return ids;
}

function defaultSortFor(partId) {
  const pid = partId == null ? state.part : partId;
  if (pid === "protein") return "protein";
  if (pid === "meat") return "per100g";
  return "per100";
}

function isWeightMeat(catId) {
  return meatCats().includes(catId) && catId !== "gadget";
}

function defaultSortForCategory(catId) {
  if (catId === "protein") return "protein";
  if (catId === "gadget") return "price";
  if (catId === "powder" || isWeightMeat(catId)) return "per100g";
  return "per100";
}

function sortApplies(key, catId) {
  if (key === "protein" || key === "proteinPerG") return catId === "protein";
  if (key === "per100g") return catId === "powder" || isWeightMeat(catId);
  if (key === "per100") {
    return catId !== "protein" && catId !== "powder" && !isWeightMeat(catId) && catId !== "gadget";
  }
  if (key === "rating" || key === "reviews") return meatCats().includes(catId);
  return true;
}

function visibleSorts(listArg) {
  const list = listArg || productsIn();
  const sorts = state.data.sorts || [];
  const kinds = new Set(list.map(measureKind));
  const order = [];
  if (kinds.has("per100ml")) order.push("per100");
  if (kinds.has("per100g")) order.push("per100g");
  if (list.some((p) => p.category === "protein")) order.push("protein", "proteinPerG");
  order.push("discount", "price");
  if (list.some((p) => p.rating != null)) order.push("rating");
  if (list.some((p) => p.reviewCount != null)) order.push("reviews");
  return order
    .map((id) => sorts.find((s) => s.id === id))
    .filter(Boolean)
    .map((s) => (s.id === "price" && state.part === "meat" ? { ...s, label: "가격" } : s));
}

/* ── URL ─────────────────────────────────────────────── */

const LEGACY_CAT = {
  cola: ["zero", "cola"],
  cider: ["zero", "cider"],
  sparkling: ["zero", "sparkling"],
  water: ["zero", "water"],
  acv: ["zero", "acv"],
  ion: ["zero", "ion"],
  energy: ["zero", "energy"],
  icetea: ["zero", "tea"],
  tea: ["zero", "tea"],
  powder: ["zero", "powder"],
  protein: ["protein", "all"],
};

/* 예전 링크의 뭉친 필터 id → 지금 세부 분류 id */
const LEGACY_FILTER = { fizz: "cola", boost: "ion" };

function syncUrl() {
  const url = new URL(location.href);
  const put = (k, v) => {
    if (v == null || v === "" || v === "all") url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  };
  put("part", state.part);
  put("f", state.filter);
  put("sort", state.sort === defaultSortFor() ? "" : state.sort);
  put("pack", state.container);
  put("ing", state.ingredient);
  put("p", state.highlightId);
  url.searchParams.delete("cat");
  history.replaceState({}, "", url);
}

function setLegalOffset() {
  const legal = document.querySelector(".legal");
  if (!legal) return;
  document.documentElement.style.setProperty("--legal-h", legal.offsetHeight + "px");
}

/* ── 마지막 업데이트 · 업데이트 주기 ─────────────────── */

const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function parseCheckedAt(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(value || ""));
  if (!m) return null;
  return {
    date: `${m[1]}-${m[2]}-${m[3]}`,
    y: Number(m[1]),
    mo: Number(m[2]),
    d: Number(m[3]),
    time: m[4] ? `${m[4]}:${m[5]}` : "",
  };
}

/* 상품 카드의 확인 시각(priceCheckedAt) 중 가장 늦은 날짜 = 마지막 업데이트 */
function latestChecked() {
  let best = null;
  (state.data.products || []).forEach((p) => {
    const c = parseCheckedAt(p.priceCheckedAt);
    if (!c) return;
    if (!best || c.date > best.date || (c.date === best.date && c.time > best.time)) best = c;
  });
  return best || parseCheckedAt(state.data.site && state.data.site.updatedAt);
}

function renderUpdateBand() {
  const site = state.data.site || {};
  const latest = latestChecked();
  const dateEl = $("update-date-big");
  const wdEl = $("update-weekday");
  const fullEl = $("update-date-full");
  const cycleEl = $("update-cycle-main");
  const cycleNoteEl = $("update-cycle-note");
  const band = $("update-band");
  if (latest && dateEl) {
    const wd = WEEKDAY_KO[new Date(latest.y, latest.mo - 1, latest.d).getDay()] || "";
    dateEl.textContent = `${latest.mo}/${latest.d}`;
    if (wdEl) wdEl.textContent = wd ? `(${wd})` : "";
    if (fullEl) {
      const ymd = `${latest.y}.${String(latest.mo).padStart(2, "0")}.${String(latest.d).padStart(2, "0")}`;
      fullEl.textContent = latest.time ? `${ymd} ${latest.time} 확인` : ymd;
    }
  }
  if (cycleEl) cycleEl.textContent = site.updateCycle || "매일 오전 9시 가격 자동 업데이트";
  if (cycleNoteEl) cycleNoteEl.textContent = site.updateCycleNote || "쿠팡·토스 가격을 다시 확인해요";
  if (band) band.hidden = false;
}

/* ── 탭 · 필터 ───────────────────────────────────────── */

function pickPart(id) {
  if (!partById(id)) return;
  const changed = state.part !== id;
  state.part = id;
  state.filter = "all";
  state.highlightId = null;
  if (changed || !visibleSorts().some((s) => s.id === state.sort)) state.sort = defaultSortFor();
  paint();
  const wrap = $("tabs-wrap");
  if (wrap && wrap.getBoundingClientRect().top < 8) {
    wrap.scrollIntoView({ behavior: "smooth", block: "start" });
  }
}

function pickFilter(id) {
  state.filter = id;
  state.highlightId = null;
  if (!visibleSorts().some((s) => s.id === state.sort)) state.sort = defaultSortFor();
  paint();
}

function setRowHidden(el, hidden) {
  if (!el) return;
  el.hidden = hidden;
  const row = el.closest ? el.closest(".filter-row") : null;
  if (row) row.hidden = hidden;
}

function renderParts() {
  const nav = $("parts");
  if (!nav) return;
  nav.innerHTML = "";
  allParts().forEach((pt) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "part-tab";
    btn.setAttribute("aria-selected", String(pt.id === state.part));
    const icon = pt.icon ? `<span class="part-ico" aria-hidden="true">${escapeHtml(pt.icon)}</span>` : "";
    const count = partCount(pt.id);
    btn.innerHTML = `${icon}<span class="part-label">${escapeHtml(pt.label)}</span><span class="part-count">(${count})</span>`;
    btn.addEventListener("click", () => pickPart(pt.id));
    nav.appendChild(btn);
  });
}

function renderPartFilters() {
  const nav = $("part-filters");
  if (!nav) return;
  const items = partFilters();
  if (state.part === "all" || items.length < 2) {
    nav.innerHTML = "";
    setRowHidden(nav, true);
    return;
  }
  nav.innerHTML = "";
  let shown = 0;
  items.forEach((f) => {
    const total = filterCount(state.part, f, true);
    if (f.id !== "all" && total === 0) return;
    shown += 1;
    const n = filterCount(state.part, f);
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "filter";
    const ico = f.icon
      ? `<span class="chip-ico" aria-hidden="true">${escapeHtml(f.icon)}</span>`
      : "";
    btn.innerHTML = `${ico}<span class="chip-label">${escapeHtml(f.label)}</span> <span class="chip-n">${n}</span>`;
    btn.setAttribute("aria-selected", String(f.id === state.filter));
    btn.addEventListener("click", () => pickFilter(f.id));
    nav.appendChild(btn);
  });
  setRowHidden(nav, shown < 2);
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
  const nav = $("filters");
  const note = document.querySelector(".ing-note");
  const meatOnly = state.part === "meat";
  if (nav) {
    setRowHidden(nav, meatOnly);
    if (!meatOnly) {
      renderChipNav(nav, state.data.containers || [], state.container, (id) => {
        state.container = id;
        state.highlightId = null;
        paint();
      });
    }
  }
  if (note) note.hidden = meatOnly;
}

function renderIngredients() {
  const nav = $("ingredients");
  if (!nav) return;
  const meatOnly = state.part === "meat";
  setRowHidden(nav, meatOnly);
  if (meatOnly) return;
  renderChipNav(nav, state.data.ingredientFilters || [], state.ingredient, (id) => {
    state.ingredient = id;
    state.highlightId = null;
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
  const items = visibleSorts();
  if (!items.some((s) => s.id === state.sort)) state.sort = items[0] ? items[0].id : "price";
  items.forEach((s) => {
    const btn = document.createElement("button");
    btn.type = "button";
    btn.className = "sort-btn";
    btn.textContent = s.label;
    btn.setAttribute("aria-selected", String(s.id === state.sort));
    btn.addEventListener("click", () => {
      state.sort = s.id;
      state.highlightId = null;
      paint();
    });
    nav.appendChild(btn);
  });
}

/* ── 특가 ────────────────────────────────────────────── */

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
  const pool =
    state.part === "all"
      ? state.data.products || []
      : (state.data.products || []).filter((p) => partOf(p) === state.part);
  const { title: heading, items } = topDeals(pool);
  if (!items.length) {
    sec.hidden = true;
    row.innerHTML = "";
    return;
  }
  sec.hidden = false;
  title.textContent = heading;
  row.innerHTML = items
    .map(({ p, label }) => {
      const img = p.image ? `<img src="${p.image}" alt="" decoding="async">` : "";
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
      jumpToProduct(id);
    });
  });
}

/* ── 절약 계산기 (음료만) ────────────────────────────── */

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
  const all = drinkProducts();
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
  const cats = (state.data.categories || []).filter((c) => c.id !== "all" && c.part !== "meat");
  const all = drinkProducts();
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
      await copyText(text);
      if (copied) {
        copied.hidden = false;
        setTimeout(() => {
          copied.hidden = true;
        }, 1600);
      }
    });
  }
}

/* ── 상품 카드 ───────────────────────────────────────── */

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

function shareChip(p) {
  return `<button type="button" class="share-mini" data-share-product="${escapeHtml(
    p.id
  )}" aria-label="${escapeHtml(p.name)} 공유하기">🔗 공유</button>`;
}

function cardActions(p) {
  return `<div class="card-actions">${cta(p)}${shareChip(p)}</div>`;
}

function chips(p, isProteinCard) {
  const parts = [];
  const meat = isMeat(p);
  if (meat && p.cut) {
    parts.push(`<span class="chip chip-cut">${escapeHtml(p.cut)}</span>`);
  }
  if (p.rating != null) {
    const reviews = p.reviewCount != null ? ` · 리뷰 ${reviewCountLabel(p.reviewCount)}` : "";
    parts.push(`<span class="chip chip-rating">★ ${Number(p.rating).toFixed(1)}${reviews}</span>`);
  }
  if (!isProteinCard) {
    const kcalText = kcalLabel(p);
    if (kcalText) parts.push(`<span class="chip chip-kcal">${escapeHtml(kcalText)}</span>`);
  }
  if (p.unitPrice && !meat) {
    parts.push(`<span class="chip chip-unit">${escapeHtml(p.unitPrice)}</span>`);
  }
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
    return `<div class="photo">${rankMark}<img src="${p.image}" alt="${escapeHtml(p.name)}" loading="lazy" decoding="async"></div>`;
  }
  return `<div class="photo is-blank">${rankMark}<span>사진 준비 중</span></div>`;
}

function card(p, cheap, topProt, rank) {
  const isProtein = p.category === "protein";
  const meat = isMeat(p);
  const el = document.createElement("article");
  el.className = "card" + (isProtein ? " card-protein" : "") + (meat ? " card-meat" : "");
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
      ${typeof cmpMini === "function" ? cmpMini(p) : ""}
      ${typeof chartButton === "function" ? chartButton(p) : ""}
      <p class="when">${escapeHtml(when)}</p>
      ${cardActions(p)}
    </div>
  `;
  return el;
}

/* ── 한눈에 비교표 ───────────────────────────────────── */

function unitHeadFor(list) {
  const kinds = new Set(list.map(measureKind));
  if (kinds.size !== 1) return "단가";
  const kind = [...kinds][0];
  if (kind === "each") return "개당";
  return `${MEASURE_LABEL[kind]}당`;
}

function renderCompare(list) {
  const sec = $("compare");
  const table = $("compare-table");
  if (!sec || !table) return;
  if (list.length < 2) {
    sec.hidden = true;
    table.innerHTML = "";
    return;
  }
  sec.hidden = false;
  const showProtein = list.some((p) => proteinValue(p) != null);
  const showKcal = list.some((p) => kcalLabel(p));
  const showPerG = list.some((p) => proteinPerG(p) != null);
  const showRating = list.some((p) => p.rating != null);
  const showCut = list.some((p) => p.cut);
  const unitHead = unitHeadFor(list);
  const cheap = cheapestIds(list);
  const topProt = topProteinIds(list);
  const head = `<thead><tr>
    <th>상품</th>
    <th>${showCut ? "부위" : "맛"}</th>
    <th>${unitHead}</th>
    <th>할인</th>
    ${showRating ? "<th>평점</th>" : ""}
    ${showKcal ? "<th>열량</th>" : ""}
    ${showProtein ? "<th>단백질</th>" : ""}
    ${showPerG ? "<th>1g당</th>" : ""}
  </tr></thead>`;
  const rows = list.map((p) => {
    const v = measureValue(p);
    const per = v != null ? won(v) : "";
    const disc = p.discountPct ? `${p.discountPct}%` : "";
    const marks = [
      cheap.has(p.id) ? `<span class="cheap-dot">${cheapLabel(p)}</span>` : "",
      topProt.has(p.id) ? `<span class="protein-dot">단백질 가장 많음</span>` : "",
    ].join("");
    const thumb = p.image ? `<img src="${p.image}" alt="" loading="lazy">` : "";
    const kcalText = kcalLabel(p);
    const prot = proteinValue(p);
    const perg = proteinPerG(p);
    const rating = p.rating != null
      ? `★ ${Number(p.rating).toFixed(1)}${
          p.reviewCount != null ? `<span class="cmp-reviews">${reviewCountLabel(p.reviewCount)}</span>` : ""
        }`
      : "";
    return `<tr>
      <td class="cmp-name">${thumb}<span>${escapeHtml(p.name)}${marks}</span></td>
      <td>${escapeHtml(p.cut || p.kind || p.flavor || "")}</td>
      <td>${per}</td>
      <td>${disc}</td>
      ${showRating ? `<td>${rating}</td>` : ""}
      ${showKcal ? `<td>${kcalText ? escapeHtml(kcalText) : ""}</td>` : ""}
      ${showProtein ? `<td>${prot != null ? `${prot}g` : ""}</td>` : ""}
      ${showPerG ? `<td>${perg != null ? won(perg) : ""}</td>` : ""}
    </tr>`;
  }).join("");
  table.innerHTML = `${head}<tbody>${rows}</tbody>`;
}

/* ── 목록 그리기 ─────────────────────────────────────── */

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
  const chosen = sortApplies(state.sort, catId) ? state.sort : defaultSortForCategory(catId);
  if (catId === "protein") {
    if (chosen === "proteinPerG") return "단백질 1g당 가격 낮은 순";
    if (chosen === "discount") return "할인율 높은 순";
    if (chosen === "price") return "박스 가격 낮은 순";
    return "병당 단백질 높은 순";
  }
  if (chosen === "per100g") return "100g당 가격 낮은 순";
  if (chosen === "discount") return "할인율 높은 순";
  if (chosen === "price") return "가격 낮은 순";
  if (chosen === "rating") return "평점 높은 순";
  if (chosen === "reviews") return "리뷰 많은 순";
  return "100ml당 가격 낮은 순";
}

function proteinUsesGOrder() {
  return state.sort === "protein" || (state.sort !== "proteinPerG" && state.sort !== "discount" && state.sort !== "price");
}

function orderedForGroup(catId, list) {
  const chosen = sortApplies(state.sort, catId) ? state.sort : defaultSortForCategory(catId);
  if (chosen === "protein") return sortByProtein(list);
  return sortProducts(list, chosen);
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
  const catIco = cat && cat.icon
    ? `<span class="cat-ico" aria-hidden="true">${escapeHtml(cat.icon)}</span>`
    : "";
  title.innerHTML = `${catIco}${escapeHtml(cat ? cat.label : catId)}`;
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

function partHead(partId, count) {
  const part = partById(partId);
  const wrap = document.createElement("div");
  wrap.className = "part-head";
  const icon = escapeHtml((part && part.icon) || "");
  const label = escapeHtml((part && part.label) || partId);
  const desc = part && part.desc ? `<p class="part-head-desc">${escapeHtml(part.desc)}</p>` : "";
  wrap.innerHTML = `<span class="part-head-ico" aria-hidden="true">${icon}</span>
    <div class="part-head-text">
      <h2>${label} <span class="part-head-count">(${count})</span></h2>
      ${desc}
    </div>`;
  return wrap;
}

function groupedIds(list) {
  const ids = [];
  categoryOrder().forEach((id) => {
    if (list.some((p) => p.category === id)) ids.push(id);
  });
  return ids;
}

function renderProducts() {
  const grid = $("grid");
  const empty = $("empty");
  const note = $("cat-note");
  const part = currentPart();
  const cat = (state.data.categories || []).find((c) => c.id === state.filter);
  const subFilter = currentFilter();
  const list = productsIn();
  const cheap = cheapestIds(list.length ? list : productsIn("all", "all", state.container, state.ingredient));
  const topProt = topProteinIds(state.data.products);

  const subNote = subFilter && subFilter.id !== "all" && subFilter.note ? subFilter.note : "";
  const noteText = subNote || [cat && cat.note ? cat.note : "", part && part.note ? part.note : ""]
    .filter(Boolean)
    .join(" ");
  if (noteText) {
    note.hidden = false;
    note.textContent = noteText;
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

  const ids = groupedIds(list);
  const groupMode = state.part === "all" || ids.length > 1;
  const showPartHeads = state.part === "all";

  if (groupMode) {
    grid.className = "groups";
    if (showPartHeads) {
      ["protein", "zero", "meat"].forEach((pid) => {
        const items = list.filter((p) => partOf(p) === pid);
        if (!items.length) return;
        const section = document.createElement("section");
        section.className = `part-section part-section-${pid}`;
        section.appendChild(partHead(pid, items.length));
        categoryIdsInPart(pid).forEach((cid) => {
          const group = items.filter((p) => p.category === cid);
          if (group.length) renderGroup(section, cid, group, cheap, topProt);
        });
        grid.appendChild(section);
      });
    } else {
      ids.forEach((cid) => {
        const group = list.filter((p) => p.category === cid);
        if (group.length) renderGroup(grid, cid, group, cheap, topProt);
      });
    }
    renderCompare([]);
    return;
  }

  const catId = ids[0];
  const ordered = orderedForGroup(catId, list);
  const ranks = catId === "protein" && proteinUsesGOrder() ? proteinRanks(ordered) : {};
  ordered.forEach((p) => grid.appendChild(card(p, cheap.has(p.id), topProt.has(p.id), ranks[p.id])));
  renderCompare(ordered);
}

function jumpToProduct(id) {
  const p = (state.data.products || []).find((x) => x.id === id);
  const el = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
  if (el) {
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("is-flash");
    setTimeout(() => el.classList.remove("is-flash"), 2600);
    return true;
  }
  if (!p) return false;
  state.part = partOf(p);
  state.filter = "all";
  state.sort = defaultSortFor();
  paint();
  requestAnimationFrame(() => {
    const target = document.querySelector(`.card[data-id="${CSS.escape(id)}"]`);
    if (target) {
      target.scrollIntoView({ behavior: "smooth", block: "center" });
      target.classList.add("is-flash");
      setTimeout(() => target.classList.remove("is-flash"), 2600);
    }
  });
  return true;
}

/* ── 공유 ────────────────────────────────────────────── */

let toastTimer = null;

function showToast(message) {
  const t = $("toast");
  if (!t) return;
  t.textContent = message;
  t.hidden = false;
  requestAnimationFrame(() => t.classList.add("is-on"));
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    t.classList.remove("is-on");
    t.hidden = true;
  }, 2400);
}

function shareLinkFor(p) {
  return p ? `${SHARE_BASE}/?p=${encodeURIComponent(p.id)}` : `${SHARE_BASE}/`;
}

function shareTextFor(p) {
  if (!p) return "제로 음료·단백질 음료·식단 고기를 단가로 비교하는 띠니마트예요.";
  const price = p.price != null ? `${won(p.price)} · ` : "";
  const unit = p.unitPrice ? `${p.unitPrice}` : "";
  return `띠니마트에서 본 상품: ${p.name} / ${price}${unit}`.trim();
}

async function shareMart(p) {
  const url = shareLinkFor(p);
  const title = p ? `띠니마트 · ${p.name}` : "띠니마트 · 단가 비교";
  const text = shareTextFor(p);
  if (typeof navigator.share === "function") {
    try {
      await navigator.share({ title, text, url });
      return;
    } catch (err) {
      if (err && err.name === "AbortError") return;
    }
  }
  const ok = await copyText(url);
  showToast(ok ? "공유 링크가 복사됐어요!" : `직접 복사해 주세요: ${url}`);
}

function initShare() {
  document.addEventListener("click", (e) => {
    const productBtn = e.target.closest("[data-share-product]");
    if (productBtn) {
      const id = productBtn.getAttribute("data-share-product");
      const p = (state.data.products || []).find((x) => x.id === id);
      shareMart(p || null);
      return;
    }
    const btn = e.target.closest("[data-share]");
    if (btn) {
      shareMart(null);
    }
  });
}

/* ── 홈 화면 바로가기 추가 ───────────────────────────── */

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
  document.querySelectorAll("[data-shortcut]").forEach((btn) => {
    btn.hidden = true;
  });
  document.querySelectorAll(".shortcut-row").forEach((row) => {
    row.classList.add("is-solo");
  });
  document.querySelectorAll(".shortcut-sub").forEach((sub) => {
    sub.hidden = true;
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
      hint: "홈 화면에 '띠니마트' 아이콘으로 추가돼요.",
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
      hint: "설치하면 홈 화면에 '띠니마트'로 보여요.",
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

/* ── 시작 ────────────────────────────────────────────── */

function paint() {
  syncUrl();
  renderParts();
  renderPartFilters();
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
    parts: typeof PARTS !== "undefined" ? PARTS : [],
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

function applyUrlState() {
  const q = new URLSearchParams(location.search);
  const partIds = allParts().map((p) => p.id);
  const legacy = q.get("cat") ? LEGACY_CAT[q.get("cat")] : null;
  const wantedPart = q.get("part") || (legacy ? legacy[0] : "all");
  if (partIds.includes(wantedPart)) state.part = wantedPart;
  const filterId = q.get("f") ? LEGACY_FILTER[q.get("f")] || q.get("f") : legacy ? legacy[1] : "all";
  if (partFilters(state.part).some((f) => f.id === filterId)) state.filter = filterId;
  state.sort = defaultSortFor();
  const sorts = (state.data.sorts || []).map((s) => s.id);
  if (q.get("sort") && sorts.includes(q.get("sort"))) state.sort = q.get("sort");
  const packs = (state.data.containers || []).map((c) => c.id);
  if (q.get("pack") && packs.includes(q.get("pack"))) state.container = q.get("pack");
  const ings = (state.data.ingredientFilters || []).map((c) => c.id);
  if (q.get("ing") && ings.includes(q.get("ing"))) state.ingredient = q.get("ing");
  const pid = q.get("p");
  if (pid && (state.data.products || []).some((p) => p.id === pid)) state.highlightId = pid;
}

async function init() {
  setLegalOffset();
  initShortcut();
  initShare();
  window.addEventListener("resize", setLegalOffset);
  state.data = await loadCatalog();
  if (typeof loadPriceHistory === "function") await loadPriceHistory();
  if (typeof initPriceModal === "function") initPriceModal();
  applyUrlState();
  renderUpdateBand();
  const when = $("source-when");
  if (when) {
    const src = state.data.site.sourceNote || "";
    const note = state.data.site.priceNote || "";
    when.textContent = [src, note].filter(Boolean).join(" ");
  }
  fillCalcSelect();
  bindCalc();
  paint();
  if (state.highlightId) {
    const id = state.highlightId;
    setTimeout(() => jumpToProduct(id), 60);
  }
}

init().catch((err) => {
  const empty = $("empty");
  empty.hidden = false;
  empty.textContent = "상품 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.";
  console.error(err);
});
