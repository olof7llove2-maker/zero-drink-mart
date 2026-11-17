const won = (n) => Number(n).toLocaleString("ko-KR") + "원";
const $ = (id) => document.getElementById(id);
const SHARE_BASE = "https://zero-drink-mart.vercel.app";

const TABS = [
  { id: "home", label: "홈", icon: "🏠" },
  { id: "category", label: "카테고리", icon: "🎛️" },
  { id: "ranking", label: "랭킹", icon: "🏆" },
  { id: "hotdeal", label: "핫딜", icon: "🔥" },
];

const RANK_PARTS = [
  { id: "zero", label: "제로 음료", part: "zero" },
  { id: "protein", label: "단백질", part: "protein" },
  { id: "meat", label: "식단 고기", part: "meat" },
];

const RANK_METRICS = {
  zero: [
    {
      id: "unit",
      label: "100ml당 최저가",
      unit: "100ml당",
      perCategory: true,
      value: (p) => (measureKind(p) === "per100ml" ? measureValue(p) : null),
    },
    {
      id: "discount",
      label: "할인율 높은 순",
      unit: "",
      desc: true,
      value: (p) => (typeof p.discountPct === "number" ? p.discountPct : null),
    },
  ],
  protein: [
    { id: "protein20", label: "단백질 20g당 최저가", unit: "단백질 20g당", value: (p) => { const x = protein20(p); return x ? x.value : null; } },
    { id: "unit", label: "100ml당 최저가", unit: "100ml당", value: (p) => (measureKind(p) === "per100ml" ? measureValue(p) : null) },
    { id: "reviews", label: "리뷰 많은 순", unit: "", desc: true, value: (p) => (typeof p.reviewCount === "number" ? p.reviewCount : null) },
  ],
  meat: [
    { id: "protein20", label: "단백질 20g당 최저가", unit: "단백질 20g당", value: (p) => { const x = protein20(p); return x ? x.value : null; } },
    { id: "unit", label: "100g당 최저가", unit: "100g당", value: (p) => (measureKind(p) === "per100g" ? measureValue(p) : null) },
    { id: "reviews", label: "리뷰 많은 순", unit: "", desc: true, value: (p) => (typeof p.reviewCount === "number" ? p.reviewCount : null) },
  ],
};

const SORT_OPTIONS = [
  { id: "basis", label: "단가 낮은 순" },
  { id: "low", label: "저점에 가까운 순" },
  { id: "discount", label: "할인율 높은 순" },
  { id: "reviews", label: "리뷰 많은 순" },
  { id: "rating", label: "평점 높은 순" },
  { id: "price", label: "가격 낮은 순" },
  { id: "protein", label: "단백질 많은 순" },
  { id: "proteinPerG", label: "단백질 1g당 낮은 순" },
];
const SORT_IDS = new Set(SORT_OPTIONS.map((s) => s.id));
const BASIS_OPTIONS = [
  { id: "auto", label: "기본 단가" },
  { id: "per100ml", label: "100ml당" },
  { id: "per100g", label: "100g당" },
  { id: "protein20", label: "단백질 20g당" },
];

const state = {
  data: null,
  priceHistory: null,
  priceMeta: null,
  low: {},
  tab: "home",
  part: "all",
  filter: "all",
  container: "all",
  ingredient: "all",
  sources: { coupang: true, toss: true },
  basis: "auto",
  sort: "basis",
  rankPart: "zero",
  rankMetric: "unit",
  dealMode: "discount",
  query: "",
  highlightId: null,
};

function escapeHtml(s) {
  return String(s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ── 분류 구조 ───────────────────────────────────────── */

function allParts() {
  return state.data.parts && state.data.parts.length ? state.data.parts : [{ id: "all", label: "전체" }];
}

function partById(id) {
  return allParts().find((p) => p.id === id) || null;
}

function partOf(p) {
  if (p.part) return p.part;
  if (p.category === "protein" || p.category === "shake") return "protein";
  const cat = (state.data.categories || []).find((c) => c.id === p.category);
  return cat && cat.part ? cat.part : "zero";
}

function isMeat(p) {
  return partOf(p) === "meat";
}

function isGadget(p) {
  return p.category === "gadget";
}

function isProteinCat(p) {
  return p.category === "protein" || p.category === "shake";
}

function isPowder(p) {
  return p.category === "powder" || p.container === "powder";
}

function isToss(p) {
  return p.platform === "toss";
}

function meatCats() {
  return (state.data.categories || []).filter((c) => c.part === "meat").map((c) => c.id);
}

function partFilters(partId) {
  const part = partById(partId == null ? state.part : partId);
  if (!part || !part.filters || !part.filters.length) return [{ id: "all", label: "전체", cats: [] }];
  return part.filters;
}

function currentFilter(partId, filterId) {
  const pid = partId == null ? state.part : partId;
  const fid = filterId == null ? state.filter : filterId;
  return partFilters(pid).find((x) => x.id === fid) || null;
}

function proteinTypes(p) {
  if (Array.isArray(p.proteinType)) return p.proteinType;
  return [p.proteinType || "plain"];
}

function matchesFilter(p, f) {
  if (!f) return true;
  const cats = f.cats || [];
  const types = f.types || [];
  const own = proteinTypes(p);
  if (cats.length && !cats.includes(p.category)) return false;
  if (types.length && !types.some((t) => own.includes(t))) return false;
  if (f.sources && f.sources.length && !f.sources.includes(p.proteinSourceKey)) return false;
  if (typeof f.proteinMin === "number") {
    const g = proteinValue(p);
    if (g == null || g < f.proteinMin) return false;
  }
  return true;
}

function categoryOrder() {
  const ids = (state.data.categories || []).filter((c) => c.id !== "all").map((c) => c.id);
  const protein = ids.filter((id) => id === "protein" || id === "shake");
  const zero = ids.filter((id) => {
    const cat = state.data.categories.find((c) => c.id === id);
    return cat && cat.part === "zero" && id !== "powder";
  });
  const powder = ids.filter((id) => id === "powder");
  const meat = ids.filter((id) => meatCats().includes(id));
  return protein.concat(zero, powder, meat);
}

function categoryLabel(catId) {
  const c = (state.data.categories || []).find((x) => x.id === catId);
  return c ? c.label : catId;
}

/* ── 검색 ────────────────────────────────────────────── */

function normText(s) {
  return String(s == null ? "" : s)
    .toLowerCase()
    .replace(/[\s()\[\]{},·\-–—/]+/g, "");
}

function searchTokens() {
  return String(state.query || "")
    .toLowerCase()
    .split(/\s+/)
    .map(normText)
    .filter(Boolean);
}

function searchHaystack(p) {
  if (!p.__hay) {
    p.__hay = normText([p.name, p.brand, p.kind, p.flavor, p.cut, p.cutGroup, p.group, categoryLabel(p.category)].join(" "));
  }
  return p.__hay;
}

function matchesQuery(p) {
  const tokens = searchTokens();
  if (!tokens.length) return true;
  const hay = searchHaystack(p);
  return tokens.every((t) => hay.includes(t));
}

function matchesSource(p) {
  return isToss(p) ? state.sources.toss : state.sources.coupang;
}

function basePool() {
  return (state.data.products || []).filter((p) => matchesQuery(p) && matchesSource(p));
}

/* ── 단가 · 영양 ─────────────────────────────────────── */

const MEASURE_LABEL = { per100ml: "100ml당", per100g: "100g당", each: "개당" };
const CONTAINER_LABEL = { can: "캔", "pet-small": "페트", "pet-large": "대용량", powder: "분말" };

function measureKind(p) {
  if (isGadget(p)) return "each";
  if (isPowder(p) || isMeat(p)) return "per100g";
  return "per100ml";
}

function measureValue(p) {
  const kind = measureKind(p);
  if (kind === "per100g") {
    if (typeof p.per100g === "number" && Number.isFinite(p.per100g)) return p.per100g;
    if (typeof p.unitPricePer100g === "number" && Number.isFinite(p.unitPricePer100g)) return p.unitPricePer100g;
    return null;
  }
  if (kind === "each") {
    return typeof p.price === "number" && Number.isFinite(p.price) ? p.price : null;
  }
  return typeof p.unitPricePer100ml === "number" && Number.isFinite(p.unitPricePer100ml) ? p.unitPricePer100ml : null;
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

function servingPrice(p) {
  if (p.bottlePrice != null) return p.bottlePrice;
  return unitEachPrice(p);
}

function proteinPerG(p) {
  if (typeof p.proteinPerG === "number" && Number.isFinite(p.proteinPerG)) return p.proteinPerG;
  const g = proteinValue(p);
  const each = servingPrice(p);
  if (g == null || each == null || g <= 0) return null;
  return Math.round(each / g);
}

/* 단백질 20g당 가격 — 고기는 100g당 단백질 참고치로 '추정' */
function protein20(p) {
  if (isGadget(p) || p.price == null) return null;
  if (isMeat(p)) {
    const per = measureValue(p);
    const g = typeof p.proteinPer100g === "number" ? p.proteinPer100g : null;
    if (per == null || !g || g <= 0) return null;
    return { value: Math.round((per / g) * 20), est: true };
  }
  if (isProteinCat(p)) {
    const g = proteinValue(p);
    const each = servingPrice(p);
    if (g == null || each == null || g <= 0) return null;
    return { value: Math.round((each / g) * 20), est: false };
  }
  return null;
}

function naturalUnit(p) {
  const kind = measureKind(p);
  if (kind === "each") return { value: p.price, label: "개당", kind };
  if (kind === "per100g") return { value: measureValue(p), label: "100g당", kind };
  return { value: measureValue(p), label: "100ml당", kind };
}

function displayUnit(p) {
  if (state.basis === "protein20") {
    const x = protein20(p);
    if (x) return { value: x.value, label: "단백질 20g당", kind: "protein20", est: x.est };
  }
  if (state.basis === "per100ml" && measureKind(p) === "per100ml") {
    return { value: measureValue(p), label: "100ml당", kind: "per100ml" };
  }
  if (state.basis === "per100g" && measureKind(p) === "per100g") {
    return { value: measureValue(p), label: "100g당", kind: "per100g" };
  }
  return naturalUnit(p);
}

function reviewCountLabel(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  if (n >= 10000) return `${(n / 10000).toFixed(1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toLocaleString("ko-KR");
}

/* ── 60일 저점 ───────────────────────────────────────── */

function buildLowInfo() {
  state.low = {};
  const entries = state.priceHistory || {};
  Object.entries(entries).forEach(([id, e]) => {
    const st = e.stats || {};
    const has = e.status === "history" && st.min != null && (e.series || []).length > 1;
    state.low[id] = {
      hasHistory: has,
      min: st.min,
      avg: st.avg,
      max: st.max,
      minDate: st.minDate,
      days: st.days,
      observations: st.observations,
      volatile: !!(e.couprice && e.couprice.crosscheck && e.couprice.crosscheck.sourceWarnsVolatile),
      detail: e.statusDetail,
    };
  });
}

function lowStats(p) {
  const info = state.low[p.id];
  if (!info) return { state: "none" };
  if (!info.hasHistory) return { state: "tracking", info };
  if (p.price == null || info.min == null) return { state: "none", info };
  const pct = Math.round((p.price / info.min - 1) * 100);
  const pctAvg = info.avg ? Math.round((p.price / info.avg - 1) * 100) : null;
  const state_ = pct <= 0 ? "low" : pct <= 3 ? "near" : "above";
  return { state: state_, pct, pctAvg, info };
}

function lowBadges(p, withAvg = true, opts = {}) {
  const s = lowStats(p);
  if (s.state === "none") return "";
  if (s.state === "tracking") {
    return opts.tracking === false ? "" : `<span class="bd bd-track" title="가격 기록을 오늘부터 쌓고 있어요">추적 시작</span>`;
  }
  const volatile = s.info && s.info.volatile;
  const warn = volatile ? " · 묶음 구성이 바뀐 기록이 섞여 있어 참고용" : "";
  const lowIsMeaningful = s.pct <= 3 || !volatile;
  let main = "";
  if (s.state === "low") {
    main = `<span class="bd bd-low" title="쿠프라이스가 최근 60일 사이 확인한 최저가와 같거나 낮아요${warn}">60일 최저가!</span>`;
  } else if (s.state === "near") {
    main = `<span class="bd bd-near" title="60일 최저가 바로 위${warn}">저점 근접 +${s.pct}%</span>`;
  } else if (lowIsMeaningful) {
    main = `<span class="bd bd-up" title="60일 최저가 대비">저점 대비 +${s.pct}% ▲</span>`;
  }
  let avg = "";
  if (withAvg && s.pctAvg != null) {
    if (s.pctAvg <= -5) avg = `<span class="bd bd-avg" title="60일 관측 평균가 대비">평균 대비 ${s.pctAvg}% ▼</span>`;
    else if (s.pctAvg >= 5) avg = `<span class="bd bd-up" title="60일 관측 평균가 대비">평균 대비 +${s.pctAvg}% ▲</span>`;
  }
  return main + avg;
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
  let all = basePool().filter((p) => (pid !== "all" ? partOf(p) === pid : true) && matchesFilter(p, f));
  if (pack && pack !== "all") {
    all = all.filter((p) => (isMeat(p) || isPowder(p) ? true : p.container === pack));
  }
  if (ing && ing !== "all") {
    all = all.filter((p) => (isMeat(p) ? true : matchesIngredient(p, ing)));
  }
  return all;
}

function countFor(partId, f, ignorePack) {
  const pid = partId == null ? state.part : partId;
  const pack = ignorePack ? "all" : state.container;
  const ing = ignorePack ? "all" : state.ingredient;
  return basePool().filter((p) => {
    if (pid !== "all" && partOf(p) !== pid) return false;
    if (!matchesFilter(p, f)) return false;
    if (pack && pack !== "all" && !isMeat(p) && !isPowder(p) && p.container !== pack) return false;
    if (ing && ing !== "all" && !isMeat(p) && !matchesIngredient(p, ing)) return false;
    return true;
  }).length;
}

function partCount(partId) {
  const list = basePool();
  if (!partId || partId === "all") return list.length;
  return list.filter((p) => partOf(p) === partId).length;
}

/* ── 정렬 ────────────────────────────────────────────── */

function sortValue(p, key) {
  const u = displayUnit(p);
  if (key === "basis") return u && u.value != null ? u.value : null;
  if (key === "low") {
    const s = lowStats(p);
    if (s.state === "low" || s.state === "near" || s.state === "above") return 1000 + s.pct;
    return null;
  }
  if (key === "price") return typeof p.price === "number" ? p.price : null;
  if (key === "discount") return typeof p.discountPct === "number" ? p.discountPct : null;
  if (key === "rating") return typeof p.rating === "number" ? p.rating : null;
  if (key === "reviews") return typeof p.reviewCount === "number" ? p.reviewCount : null;
  if (key === "protein") return proteinValue(p);
  if (key === "proteinPerG") return proteinPerG(p);
  return null;
}

function sortList(list, key) {
  const k = key || state.sort;
  const desc = k === "discount" || k === "rating" || k === "reviews" || k === "protein";
  return list
    .map((p, i) => ({ p, i, v: sortValue(p, k) }))
    .sort((a, b) => {
      const an = a.v == null;
      const bn = b.v == null;
      if (an && bn) return a.i - b.i;
      if (an) return 1;
      if (bn) return -1;
      if (a.v !== b.v) return desc ? b.v - a.v : a.v - b.v;
      return a.i - b.i;
    })
    .map((x) => x.p);
}

function groupHint(list) {
  const items = list || [];
  if (state.sort === "basis") {
    if (state.basis === "protein20" && items.some((p) => protein20(p))) return "단백질 20g당 가격 낮은 순";
    const kinds = new Set(items.map(measureKind));
    if (kinds.size === 1) {
      const kind = [...kinds][0];
      if (kind === "per100ml") return "100ml당 가격 낮은 순";
      if (kind === "per100g") return "100g당 가격 낮은 순";
      if (kind === "each") return "가격 낮은 순";
    }
    return "단가 낮은 순";
  }
  const map = {
    low: "저점에 가까운 순",
    discount: "할인율 높은 순",
    reviews: "리뷰 많은 순",
    rating: "평점 높은 순",
    price: "가격 낮은 순",
    protein: "단백질 많은 순",
    proteinPerG: "단백질 1g당 낮은 순",
  };
  return map[state.sort] || "";
}

/* ── 카드 ────────────────────────────────────────────── */

function unitLineHTML(p, override) {
  const u = override || displayUnit(p);
  if (!u || u.value == null) return "";
  if (u.kind === "each" && !override) return "";
  const est = u.est ? `<span class="est">추정</span>` : "";
  return `<p class="pc-unit"><b>${won(Math.round(u.value))}</b> <span class="per">/ ${u.label}</span>${est}</p>`;
}

function subLine(p) {
  const bits = [];
  if (isProteinCat(p)) {
    const src = p.proteinSourceDetail || p.proteinSource;
    if (src) bits.push(`🧬 ${src}`);
    const g = proteinValue(p);
    if (g != null) {
      const basis = p.proteinBasis ? p.proteinBasis : p.category === "shake" ? "1회" : "병당";
      bits.push(`${basis} 단백질 ${g}g`);
    }
    const k = kcalLabel(p);
    if (k) bits.push(k);
    if (p.sugarPerServing != null) bits.push(`당류 ${p.sugarPerServing}g`);
  } else if (isMeat(p) && !isGadget(p)) {
    if (p.cut) bits.push(p.cut);
    if (p.weightG) bits.push(p.weightG >= 1000 ? `${p.weightG / 1000}kg` : `${p.weightG}g`);
    if (p.proteinPer100g != null) bits.push(`단백질 ${p.proteinPer100g}g · 지방 ${p.fatPer100g}g / 100g`);
  } else if (isGadget(p)) {
    if (p.kind) bits.push(p.kind);
  } else {
    const cont = CONTAINER_LABEL[p.container];
    if (cont) bits.push(cont);
    if (p.volumeMl) bits.push(`${p.volumeMl}ml`);
    if (p.packCount) bits.push(`${p.packCount}개`);
    if (p.caffeine === "none") bits.push("논카페인");
    if (p.aspartame === "none") bits.push("아스파탐 무첨가");
  }
  return bits.filter(Boolean).join(" · ");
}

function airfryerTipHTML(p) {
  if (!isMeat(p) || isGadget(p) || !p.airfryerTip) return "";
  const full = p.airfryerTipNote || p.airfryerTip;
  return `<p class="pc-tip" title="${escapeHtml(full)}"><span class="pc-tip-ico" aria-hidden="true">🔥</span> ${escapeHtml(p.airfryerTip)}</p>`;
}

function priceRowHTML(p) {
  if (p.price == null) return "";
  const off = p.discountPct ? `<span class="off">${p.discountPct}%</span>` : "";
  const was = p.listPrice && p.listPrice > p.price ? `<span class="was">${won(p.listPrice)}</span>` : "";
  return `<div class="pc-price"><strong>${won(p.price)}</strong>${off}${was}</div>`;
}

function rateHTML(p) {
  if (p.rating == null && p.reviewCount == null) return "";
  const star = p.rating != null ? `<b>★ ${Number(p.rating).toFixed(1)}</b>` : "";
  const rv = p.reviewCount != null ? `${star ? " · " : ""}리뷰 ${reviewCountLabel(p.reviewCount)}` : "";
  return `<p class="pc-rate">${star}${rv}</p>`;
}

function buyHTML(p, cls, label) {
  if (!p.affiliateUrl) return `<span class="pending-label">링크 준비 중</span>`;
  const toss = isToss(p);
  return `<a class="${cls}${toss ? " is-toss" : ""}" href="${escapeHtml(p.affiliateUrl)}" target="_blank" rel="noopener noreferrer">${label || "구매하기"}</a>`;
}

function cardEl(p, opts = {}) {
  const el = document.createElement("article");
  el.className = "pc";
  el.dataset.id = p.id;
  const toss = isToss(p);
  const rank = opts.rank ? `<span class="pc-rank${opts.rank <= 3 ? " is-top" : ""}">${opts.rank}</span>` : "";
  const photo = p.image
    ? `<div class="pc-photo"><img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async"></div>`
    : `<div class="pc-photo is-blank">사진<br>준비 중</div>`;
  el.innerHTML = `
    ${rank}
    ${photo}
    <div class="pc-body">
      <p class="pc-top"><span class="pc-brand">${escapeHtml(p.brand || categoryLabel(p.category))}</span>
        <span class="src ${toss ? "src-toss" : "src-coupang"}">${toss ? "토스" : "쿠팡"}</span></p>
      <h3 class="pc-name">${escapeHtml(p.name)}</h3>
      ${unitLineHTML(p, opts.unit)}
      <p class="pc-sub">${escapeHtml(opts.showCategory ? `${categoryLabel(p.category)} · ${subLine(p)}` : subLine(p))}</p>
      ${airfryerTipHTML(p)}
      ${typeof gradeLineHTML === "function" ? gradeLineHTML(p) : ""}
      ${priceRowHTML(p)}
      <div class="pc-deal">${lowBadges(p)}</div>
      ${rateHTML(p)}
      <div class="pc-acts">
        ${typeof alertIconHTML === "function" ? alertIconHTML(p) : ""}
        <button type="button" class="btn-ghost" data-chart="${escapeHtml(p.id)}">📊 가격 추이</button>
        ${buyHTML(p, "btn-buy")}
      </div>
    </div>`;
  return el;
}

function dealCardEl(p) {
  const el = document.createElement("article");
  el.className = "dc";
  const toss = isToss(p);
  const off = p.discountPct ? `<span class="off">${p.discountPct}%</span>` : "";
  const was = p.listPrice && p.listPrice > p.price ? `<span class="was">${won(p.listPrice)}</span>` : "";
  const lowLine = lowBadges(p, true, { tracking: false });
  el.dataset.id = p.id;
  el.innerHTML = `
    <div class="dc-top">
      <div class="dc-photo">${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async">` : ""}</div>
      <div class="dc-head">
        <p class="pc-top"><span class="pc-brand">${escapeHtml(p.brand || categoryLabel(p.category))}</span>
          <span class="src ${toss ? "src-toss" : "src-coupang"}">${toss ? "토스" : "쿠팡"}</span></p>
        <h3 class="pc-name">${escapeHtml(p.name)}</h3>
        ${unitLineHTML(p)}
        <p class="pc-sub">${escapeHtml(subLine(p))}</p>
        ${typeof gradeLineHTML === "function" ? gradeLineHTML(p) : ""}
      </div>
    </div>
    <div class="dc-box">
      <div class="dc-row"><span class="dc-k">판매처</span><strong>${toss ? "토스" : "쿠팡"}</strong></div>
      <div class="dc-row"><span class="dc-k">가격</span><strong>${p.price != null ? won(p.price) : "-"}</strong>${off}${was}</div>
      ${buyHTML(p, "dc-go", "상품 확인")}
      <div class="dc-deal"${lowLine ? "" : " hidden"}>${lowLine}</div>
    </div>
    <div class="dc-acts">
      <button type="button" class="btn-copy" data-copy="${escapeHtml(p.id)}">🔗 링크 복사</button>
      <button type="button" class="btn-ghost" data-chart="${escapeHtml(p.id)}">📊 가격 추이</button>
    </div>
    <p class="dc-when">${escapeHtml([p.priceCheckedLabel, state.data.site.priceNote].filter(Boolean).join(" · "))}</p>`;
  return el;
}

/* ── 그룹 · 목록 그리기 ──────────────────────────────── */

function emptyNode() {
  const box = document.createElement("div");
  box.className = "empty";
  const q = String(state.query || "").trim();
  box.innerHTML = q
    ? `<p>‘${escapeHtml(q)}’ 검색 결과가 없어요.</p>
       <div class="empty-actions">
         <button type="button" class="empty-btn" id="empty-clear">검색어 지우기</button>
         <button type="button" class="empty-btn is-primary" id="empty-reset">전체에서 다시 찾기</button>
       </div>`
    : `<p>이 분류에 해당하는 상품이 없어요.</p>
       <div class="empty-actions"><button type="button" class="empty-btn is-primary" id="empty-reset">전체에서 다시 찾기</button></div>`;
  return box;
}

function groupBlock(catId, list, hideHead) {
  const sec = document.createElement("section");
  sec.className = "group-block";
  sec.id = `group-${catId}`;
  const cat = (state.data.categories || []).find((c) => c.id === catId);
  if (!hideHead) {
    const head = document.createElement("div");
    head.className = "group-head";
    head.innerHTML = `<h2>${cat && cat.icon ? `<span class="cat-ico">${escapeHtml(cat.icon)}</span>` : ""}${escapeHtml(
      cat ? cat.label : catId
    )}</h2><span class="group-hint">${escapeHtml(groupHint(list))}</span>`;
    sec.appendChild(head);
  }
  const grid = document.createElement("div");
  grid.className = "list";
  sortList(list).forEach((p) => grid.appendChild(cardEl(p)));
  sec.appendChild(grid);
  return sec;
}

function partHead(partId, count) {
  const part = partById(partId);
  const wrap = document.createElement("div");
  wrap.className = "part-head";
  wrap.innerHTML = `<span class="part-head-ico">${escapeHtml((part && part.icon) || "")}</span>
    <div>
      <h2>${escapeHtml((part && part.label) || partId)} <span class="part-head-count">(${count})</span></h2>
      ${part && part.desc ? `<p class="part-head-desc">${escapeHtml(part.desc)}</p>` : ""}
    </div>`;
  return wrap;
}

function renderListInto(target, list, opts = {}) {
  target.innerHTML = "";
  if (!list.length) {
    target.appendChild(emptyNode());
    if (opts.compare) renderCompare([]);
    return;
  }
  const ids = categoryOrder().filter((id) => list.some((p) => p.category === id));
  const grouped = ids.length > 1;
  if (!grouped) {
    const grid = document.createElement("div");
    grid.className = "list";
    const ordered = sortList(list);
    ordered.forEach((p) => grid.appendChild(cardEl(p)));
    target.appendChild(grid);
    if (opts.compare) renderCompare(ordered);
    return;
  }
  const pids = state.part === "all" ? ["protein", "zero", "meat"] : [partOf(list[0])];
  pids.forEach((pid) => {
    const items = list.filter((p) => partOf(p) === pid);
    if (!items.length) return;
    const section = document.createElement("section");
    section.className = `part-section part-section-${pid}`;
    if (state.part === "all") section.appendChild(partHead(pid, items.length));
    ids
      .filter((cid) => items.some((p) => p.category === cid))
      .forEach((cid) => {
        const partLabel = (partById(pid) || {}).label || "";
        const hideHead = state.part === "all" && categoryLabel(cid) === partLabel;
        section.appendChild(groupBlock(cid, items.filter((p) => p.category === cid), hideHead));
      });
    target.appendChild(section);
  });
  if (opts.compare) renderCompare([]);
}

/* ── 오늘의 특가 ─────────────────────────────────────── */

function dropVsPrevious(p) {
  if (p.previousPrice == null || p.price == null || p.price >= p.previousPrice) return null;
  const pct = Math.round(((p.previousPrice - p.price) / p.previousPrice) * 100);
  return pct > 0 ? pct : null;
}

function topDeals(all) {
  const dropped = all
    .map((p) => ({ p, drop: dropVsPrevious(p) }))
    .filter((x) => x.drop != null)
    .sort((a, b) => (b.drop !== a.drop ? b.drop - a.drop : a.p.price - b.p.price));
  if (dropped.length) {
    return {
      title: "오늘 특가 TOP 3",
      items: dropped.slice(0, 3).map((x) => ({ p: x.p, label: `이전가 대비 -${x.drop}%` })),
    };
  }
  const discounted = all
    .filter((p) => p.discountPct)
    .sort((a, b) => (b.discountPct || 0) - (a.discountPct || 0) || a.price - b.price);
  return {
    title: "할인 큰 순 TOP 3",
    items: discounted.slice(0, 3).map((p) => ({ p, label: `정가 대비 -${p.discountPct}%` })),
  };
}

function renderDeals() {
  const sec = $("deals");
  const row = $("deals-row");
  const title = $("deals-title");
  if (!sec || !row || !title) return;
  const pool = basePool();
  const { title: heading, items } = topDeals(pool);
  if (!items.length || state.tab !== "home") {
    sec.hidden = true;
    if (!items.length) row.innerHTML = "";
    return;
  }
  sec.hidden = false;
  title.textContent = heading;
  row.innerHTML = items
    .map(
      ({ p, label }) => `<button type="button" class="deal-card" data-id="${escapeHtml(p.id)}">
        <div class="deal-photo">${p.image ? `<img src="${escapeHtml(p.image)}" alt="" decoding="async">` : ""}</div>
        <div class="deal-body">
          <p class="deal-drop">${escapeHtml(label)}</p>
          <p class="deal-name">${escapeHtml(p.name)}</p>
          <p class="deal-price">${p.price != null ? won(p.price) : ""}</p>
        </div>
      </button>`
    )
    .join("");
  row.querySelectorAll(".deal-card").forEach((btn) => {
    btn.addEventListener("click", () => jumpToProduct(btn.getAttribute("data-id")));
  });
}

/* ── 비교표 ──────────────────────────────────────────── */

function unitHeadFor(list) {
  const kinds = new Set(list.map(measureKind));
  if (kinds.size !== 1) return "단가";
  const kind = [...kinds][0];
  return kind === "each" ? "개당" : MEASURE_LABEL[kind];
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
  const showKcal = list.some((p) => kcalLabel(p));
  const showProtein = list.some((p) => proteinValue(p) != null);
  const showRating = list.some((p) => p.rating != null);
  const unitHead = unitHeadFor(list);
  const head = `<thead><tr><th>상품</th><th>${unitHead}</th><th>가격</th><th>할인</th>${
    showRating ? "<th>평점</th>" : ""
  }${showKcal ? "<th>열량</th>" : ""}${showProtein ? "<th>단백질</th>" : ""}<th>저점</th></tr></thead>`;
  const rows = list
    .map((p) => {
      const v = measureValue(p);
      const thumb = p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy">` : "";
      const low = lowStats(p);
      const lowText =
        low.state === "low" ? "최저가" : low.state === "near" ? `+${low.pct}%` : low.state === "above" ? `+${low.pct}%` : "-";
      return `<tr>
        <td class="cmp-name">${thumb}<span>${escapeHtml(p.name)}</span></td>
        <td>${v != null ? won(Math.round(v)) : ""}</td>
        <td>${p.price != null ? won(p.price) : ""}</td>
        <td>${p.discountPct ? `${p.discountPct}%` : ""}</td>
        ${showRating ? `<td>${p.rating != null ? `★ ${Number(p.rating).toFixed(1)}` : ""}${p.reviewCount != null ? `<span class="cmp-reviews">${reviewCountLabel(p.reviewCount)}</span>` : ""}</td>` : ""}
        ${showKcal ? `<td>${kcalLabel(p) ? escapeHtml(kcalLabel(p)) : ""}</td>` : ""}
        ${showProtein ? `<td>${proteinValue(p) != null ? `${proteinValue(p)}g` : ""}</td>` : ""}
        <td>${low.state === "low" ? `<span class="cheap-dot">최저가</span>` : lowText}</td>
      </tr>`;
    })
    .join("");
  table.innerHTML = `${head}<tbody>${rows}</tbody>`;
}

/* ── 상단 탭 · 네비 ──────────────────────────────────── */

function navLinks(className) {
  return TABS.map(
    (t) => `<a href="?tab=${t.id}" data-goto="${t.id}" class="${className}">
      ${className === "tab" ? `<span class="ico" aria-hidden="true">${t.icon}</span>` : ""}
      <span>${t.label}</span></a>`
  ).join("");
}

function renderNav() {
  const top = $("topnav");
  if (top) {
    top.innerHTML = TABS.map(
      (t) => `<a href="?tab=${t.id}" data-goto="${t.id}"${state.tab === t.id ? ' aria-current="page"' : ""}>${t.label}</a>`
    ).join("");
  }
  const bar = $("tabbar");
  if (bar) {
    bar.innerHTML = TABS.map(
      (t) => `<a href="?tab=${t.id}" data-goto="${t.id}"${state.tab === t.id ? ' aria-current="page"' : ""}>
        <span class="ico" aria-hidden="true">${t.icon}</span><span>${t.label}</span></a>`
    ).join("");
  }
}

function setTab(id, scroll = true) {
  if (!TABS.some((t) => t.id === id)) return;
  state.tab = id;
  document.body.dataset.tab = id;
  document.title =
    id === "home"
      ? "띠니마트 | 제로음료·단백질쉐이크·식단고기 단가 비교"
      : `${TABS.find((t) => t.id === id).label} | 띠니마트`;
  TABS.forEach((t) => {
    const view = $(`view-${t.id}`);
    if (view) view.hidden = t.id !== id;
  });
  const hero = $("hero");
  if (hero) hero.hidden = id !== "home";
  if ($("deals")) $("deals").hidden = id !== "home" || !$("deals-row").children.length;
  renderNav();
  paint();
  if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
}

/* ── 컨트롤(필터 패널) ───────────────────────────────── */

function sourceChecks() {
  return `<label class="chk"><input type="checkbox" data-src="coupang"${state.sources.coupang ? " checked" : ""}><span>쿠팡</span></label>
    <label class="chk"><input type="checkbox" data-src="toss"${state.sources.toss ? " checked" : ""}><span>토스</span></label>`;
}

function basisSelect() {
  const hasProtein = (state.data.products || []).some((p) => protein20(p));
  const opts = BASIS_OPTIONS.filter((o) => o.id !== "protein20" || hasProtein);
  return `<select class="sel" data-ctl="basis" aria-label="가격 기준">${opts
    .map((o) => `<option value="${o.id}"${state.basis === o.id ? " selected" : ""}>${o.label}</option>`)
    .join("")}</select>`;
}

function sortSelect() {
  return `<select class="sel" data-ctl="sort" aria-label="정렬">${SORT_OPTIONS.map(
    (o) => `<option value="${o.id}"${state.sort === o.id ? " selected" : ""}>${o.label}</option>`
  ).join("")}</select>`;
}

function metricSelect() {
  const metrics = RANK_METRICS[state.rankPart];
  return `<div class="ctl-grp"><span class="ctl-lab">기준</span><select class="sel" data-ctl="rankMetric" aria-label="랭킹 기준">
    ${metrics.map((m) => `<option value="${m.id}"${state.rankMetric === m.id ? " selected" : ""}>${m.label}</option>`).join("")}
  </select></div>`;
}

function dealModeSelect() {
  const opts = [
    { id: "discount", label: "할인율 높은 순" },
    { id: "low", label: "60일 저점 대비" },
  ];
  return `<div class="ctl-grp"><span class="ctl-lab">모아보기</span><select class="sel" data-ctl="dealMode" aria-label="핫딜 기준">
    ${opts.map((o) => `<option value="${o.id}"${state.dealMode === o.id ? " selected" : ""}>${o.label}</option>`).join("")}
  </select></div>`;
}

function renderControls() {
  document.querySelectorAll("[data-controls]").forEach((box) => {
    const kind = box.dataset.controls;
    const withBasis = kind === "home" || kind === "category";
    box.innerHTML = `<div class="ctl">
      <div class="ctl-grp"><span class="ctl-lab">출처</span>${sourceChecks()}</div>
      ${withBasis ? `<div class="ctl-grp"><span class="ctl-lab">가격 기준</span>${basisSelect()}</div>` : ""}
      ${withBasis ? `<div class="ctl-grp"><span class="ctl-lab">정렬</span>${sortSelect()}</div>` : ""}
      ${kind === "ranking" ? metricSelect() : ""}
      ${kind === "hotdeal" ? dealModeSelect() : ""}
    </div>`;
  });
}

function initControls() {
  document.addEventListener("change", (e) => {
    const t = e.target;
    if (!t || !t.matches) return;
    if (t.matches("[data-src]")) {
      const key = t.getAttribute("data-src");
      state.sources[key] = t.checked;
      if (!state.sources.coupang && !state.sources.toss) {
        state.sources[key] = true;
        showToast("출처는 하나 이상 골라야 해요");
      }
      state.highlightId = null;
      paint();
      return;
    }
    const ctl = t.getAttribute("data-ctl");
    if (!ctl) return;
    if (ctl === "basis") state.basis = t.value;
    else if (ctl === "sort") state.sort = t.value;
    else if (ctl === "dealMode") state.dealMode = t.value;
    else if (ctl === "rankMetric") state.rankMetric = t.value;
    state.highlightId = null;
    paint();
  });
}

/* ── 뷰: 홈 ──────────────────────────────────────────── */

function renderHome() {
  renderDeals();
  const list = basePool();
  const count = $("home-count");
  if (count) count.textContent = `(${list.length})`;
  renderListInto($("home-list"), list);
}

/* ── 뷰: 카테고리 ────────────────────────────────────── */

function renderParts() {
  const nav = $("parts");
  if (!nav) return;
  nav.innerHTML = allParts()
    .map((pt) => {
      const icon = pt.icon ? `<span class="chip-ico" aria-hidden="true">${escapeHtml(pt.icon)}</span>` : "";
      return `<button type="button" class="part-chip" data-part="${pt.id}" aria-selected="${pt.id === state.part}">
        ${icon}${escapeHtml(pt.label)} <span class="chip-n">${partCount(pt.id)}</span></button>`;
    })
    .join("");
  nav.querySelectorAll("[data-part]").forEach((btn) => {
    btn.addEventListener("click", () => pickPart(btn.getAttribute("data-part")));
  });
}

function renderPartFilters() {
  const nav = $("part-filters");
  const row = $("row-part");
  if (!nav) return;
  const items = partFilters();
  if (state.part === "all" || items.length < 2) {
    nav.innerHTML = "";
    if (row) row.hidden = true;
    return;
  }
  let shown = 0;
  nav.innerHTML = items
    .map((f) => {
      const total = countFor(state.part, f, true);
      if (f.id !== "all" && total === 0) return "";
      shown += 1;
      const ico = f.icon ? `<span class="chip-ico">${escapeHtml(f.icon)}</span>` : "";
      return `<button type="button" class="filter" data-filter="${f.id}" aria-selected="${f.id === state.filter}">
        ${ico}${escapeHtml(f.label)} <span class="chip-n">${countFor(state.part, f)}</span></button>`;
    })
    .join("");
  if (row) row.hidden = shown < 2;
  nav.querySelectorAll("[data-filter]").forEach((btn) => {
    btn.addEventListener("click", () => pickFilter(btn.getAttribute("data-filter")));
  });
}

function renderChipRow(nav, items, current, onPick) {
  if (!nav) return;
  nav.innerHTML = (items || [])
    .map(
      (c) => `<button type="button" class="filter" data-chip="${escapeHtml(c.id)}" aria-selected="${c.id === current}">${escapeHtml(c.label)}</button>`
    )
    .join("");
  nav.querySelectorAll("[data-chip]").forEach((btn) => {
    btn.addEventListener("click", () => onPick(btn.getAttribute("data-chip")));
  });
}

function renderFilters() {
  const nav = $("filters");
  const note = document.querySelector(".ing-note");
  const meatOnly = state.part === "meat";
  const row = $("row-container");
  if (row) row.hidden = meatOnly;
  if (note) note.hidden = meatOnly;
  if (!meatOnly) {
    renderChipRow(nav, state.data.containers || [], state.container, (id) => {
      state.container = id;
      state.highlightId = null;
      paint();
    });
  }
}

function renderIngredients() {
  const nav = $("ingredients");
  const row = $("row-ingredient");
  const meatOnly = state.part === "meat";
  if (row) row.hidden = meatOnly;
  if (meatOnly) return;
  renderChipRow(nav, state.data.ingredientFilters || [], state.ingredient, (id) => {
    state.ingredient = id;
    state.highlightId = null;
    paint();
  });
}

function pickPart(id) {
  if (!partById(id)) return;
  state.part = id;
  state.filter = "all";
  state.highlightId = null;
  paint();
}

function pickFilter(id) {
  state.filter = id;
  state.highlightId = null;
  paint();
}

function renderCategory() {
  renderParts();
  renderPartFilters();
  renderFilters();
  renderIngredients();
  const part = partById(state.part);
  const cat = (state.data.categories || []).find((c) => c.id === state.filter);
  const sub = currentFilter();
  const noteText = [sub && sub.id !== "all" ? sub.note : "", cat && cat.note ? cat.note : "", part && part.note ? part.note : ""]
    .filter(Boolean)
    .join(" ");
  const note = $("cat-note");
  if (note) {
    note.hidden = !noteText;
    note.textContent = noteText;
  }
  renderListInto($("cat-list"), productsIn(), { compare: true });
}

/* ── 뷰: 랭킹 ────────────────────────────────────────── */

function renderRankParts() {
  const nav = $("rank-parts");
  if (!nav) return;
  nav.innerHTML = RANK_PARTS.map(
    (p) => `<button type="button" data-rankpart="${p.id}" aria-selected="${p.id === state.rankPart}">${p.label}</button>`
  ).join("");
  nav.querySelectorAll("[data-rankpart]").forEach((btn) => {
    btn.addEventListener("click", () => {
      state.rankPart = btn.getAttribute("data-rankpart");
      const metrics = RANK_METRICS[state.rankPart];
      state.rankMetric = metrics[0].id;
      paint();
    });
  });
}

function rankRows() {
  const metric = RANK_METRICS[state.rankPart].find((m) => m.id === state.rankMetric) || RANK_METRICS[state.rankPart][0];
  const part = RANK_PARTS.find((p) => p.id === state.rankPart);
  const pool = basePool().filter((p) => partOf(p) === part.part && !isGadget(p));
  let rows = pool.map((p) => ({ p, v: metric.value(p) })).filter((x) => x.v != null && x.v > 0);
  if (metric.perCategory) {
    const best = new Map();
    rows.forEach((x) => {
      const cur = best.get(x.p.category);
      if (!cur || x.v < cur.v) best.set(x.p.category, x);
    });
    rows = [...best.values()];
  }
  rows.sort((a, b) => (metric.desc ? b.v - a.v : a.v - b.v));
  return { metric, rows: rows.slice(0, 10), total: rows.length };
}

function renderRanking() {
  renderRankParts();
  const box = $("rank-list");
  const note = $("rank-note");
  if (!box) return;
  const { metric, rows, total } = rankRows();
  box.innerHTML = "";
  if (!rows.length) {
    box.appendChild(emptyNode());
    if (note) note.textContent = "이 기준으로 비교할 수 있는 상품이 없어요.";
    return;
  }
  rows.forEach((x, i) => {
    const unit =
      metric.unit && state.rankMetric !== "reviews" && state.rankMetric !== "discount"
        ? { value: x.v, label: metric.unit, kind: metric.id, est: metric.id === "protein20" && isMeat(x.p) }
        : null;
    box.appendChild(cardEl(x.p, { rank: i + 1, unit, showCategory: true }));
  });
  if (note) {
    note.textContent = metric.perCategory
      ? `종류별로 가장 싼 상품만 모아 ${metric.label} 순으로 보여 줘요 · 비교 가능한 종류 ${total}개.`
      : state.rankMetric === "reviews"
      ? `리뷰가 확인된 상품 ${total}개 중 상위 ${rows.length}개예요.`
      : `${metric.label} 기준 비교 가능한 상품 ${total}개 중 상위 ${rows.length}개예요. ` +
        (state.rankMetric === "protein20" ? "고기 단백질은 부위 표준값 기준이라 '추정'으로 표시했어요." : "");
  }
}

/* ── 뷰: 핫딜 ────────────────────────────────────────── */

function hotdealRows() {
  const pool = basePool();
  if (state.dealMode === "low") {
    const rows = pool
      .map((p) => ({ p, s: lowStats(p) }))
      .filter(
        (x) =>
          (x.s.state === "low" || x.s.state === "near" || x.s.state === "above") &&
          x.s.pct <= 30 &&
          (x.s.pct <= 3 || (x.s.pctAvg != null && x.s.pctAvg <= -5))
      );
    rows.sort((a, b) => a.s.pct - b.s.pct);
    return rows.map((x) => x.p);
  }
  return pool
    .filter((p) => typeof p.discountPct === "number" && p.discountPct > 0)
    .sort((a, b) => b.discountPct - a.discountPct || a.price - b.price);
}

function renderHotdeal() {
  const box = $("deal-list");
  const note = $("deal-note");
  if (!box) return;
  const rows = hotdealRows();
  const shown = rows.slice(0, 30);
  box.innerHTML = "";
  if (!shown.length) {
    box.appendChild(emptyNode());
    if (note) note.textContent = "조건에 맞는 핫딜이 없어요.";
    return;
  }
  shown.forEach((p) => box.appendChild(dealCardEl(p)));
  if (note) {
    note.textContent =
      state.dealMode === "low"
        ? `60일 최저가에 붙어 있거나 60일 평균보다 확실히 싼 상품 ${rows.length}개만 모았어요 · 묶음 구성이 바뀐 기록이 있는 상품은 참고값이에요.`
        : `할인율(정가 대비)이 확인된 상품 ${rows.length}개를 할인 큰 순으로 보여 줘요 · 상위 ${shown.length}개.`;
  }
}

/* ── 검색 상태 ───────────────────────────────────────── */

function renderSearchStatus() {
  const status = $("search-status");
  const clear = $("search-clear");
  const input = $("search-input");
  const q = String(state.query || "").trim();
  if (clear) clear.hidden = !q;
  if (input && document.activeElement !== input && input.value !== state.query) input.value = state.query;
  if (!status) return;
  if (!q) {
    status.hidden = true;
    status.innerHTML = "";
    return;
  }
  const n = basePool().length;
  status.hidden = false;
  status.innerHTML = n
    ? `🔍 ‘${escapeHtml(q)}’ 검색 결과 <strong>${n}개</strong> <button type="button" class="search-reset" id="search-reset">초기화</button>`
    : `🔍 ‘${escapeHtml(q)}’ 검색 결과가 없어요`;
  const reset = $("search-reset");
  if (reset) reset.addEventListener("click", resetSearch);
}

function resetSearch() {
  state.query = "";
  state.highlightId = null;
  const input = $("search-input");
  if (input) input.value = "";
  paint();
}

function resetAllFilters() {
  state.query = "";
  state.part = "all";
  state.filter = "all";
  state.container = "all";
  state.ingredient = "all";
  state.basis = "auto";
  state.sort = "basis";
  state.sources = { coupang: true, toss: true };
  state.highlightId = null;
  const input = $("search-input");
  if (input) input.value = "";
  paint();
}

function initSearch() {
  const input = $("search-input");
  const clear = $("search-clear");
  if (input) {
    input.addEventListener("input", () => {
      state.query = input.value;
      state.highlightId = null;
      paint();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        resetSearch();
      }
    });
  }
  if (clear) {
    clear.addEventListener("click", () => {
      resetSearch();
      if (input) input.focus();
    });
  }
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "empty-clear") resetSearch();
    if (e.target && e.target.id === "empty-reset") resetAllFilters();
  });
}

/* ── 상품으로 이동 ───────────────────────────────────── */

function jumpToProduct(id) {
  const p = (state.data.products || []).find((x) => x.id === id);
  if (!p) return false;
  if (state.query) {
    state.query = "";
    const input = $("search-input");
    if (input) input.value = "";
  }
  state.part = "all";
  state.filter = "all";
  state.container = "all";
  state.ingredient = "all";
  state.sources = { coupang: true, toss: true };
  state.highlightId = id;
  if (state.tab !== "home") setTab("home", false);
  paint();
  requestAnimationFrame(() => {
    const el = document.querySelector(`.pc[data-id="${CSS.escape(id)}"]`);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "center" });
    el.classList.add("is-flash");
    setTimeout(() => el.classList.remove("is-flash"), 2600);
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
  const u = displayUnit(p);
  const unit = u && u.value != null ? `${Math.round(u.value)}원 / ${u.label}` : p.unitPrice || "";
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

function initShare() {
  document.addEventListener("click", async (e) => {
    const copyBtn = e.target.closest("[data-copy]");
    if (copyBtn) {
      const id = copyBtn.getAttribute("data-copy");
      const p = (state.data.products || []).find((x) => x.id === id);
      if (!p) return;
      const link = p.affiliateUrl || shareLinkFor(p);
      const ok = await copyText(link);
      showToast(ok ? "구매 링크를 복사했어요 (제휴 링크)" : `직접 복사해 주세요: ${link}`);
      return;
    }
    const productBtn = e.target.closest("[data-share-product]");
    if (productBtn) {
      const id = productBtn.getAttribute("data-share-product");
      const p = (state.data.products || []).find((x) => x.id === id);
      shareMart(p || null);
      return;
    }
    const go = e.target.closest("[data-goto]");
    if (go) {
      e.preventDefault();
      setTab(go.getAttribute("data-goto"));
      return;
    }
    const btn = e.target.closest("[data-share]");
    if (btn) shareMart(null);
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
  document.querySelectorAll(".quick-row").forEach((row) => row.classList.add("is-solo"));
}

function deviceEnv() {
  const ua = navigator.userAgent || "";
  const iOS = /iPad|iPhone|iPod/.test(ua) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
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
        steps: ["지금은 앱 안의 브라우저로 열려 있어요", "오른쪽 위 ⋯ 메뉴에서 'Safari로 열기'를 눌러요", "Safari 하단 공유 버튼(□↑) → '홈 화면에 추가' → '추가'"],
        hint: "카카오톡·인스타그램 안에서는 홈 화면 추가가 막혀 있어요.",
      };
    }
    const safari = /Safari/i.test(ua) && !/CriOS|FxiOS|EdgiOS/i.test(ua);
    if (!safari) {
      return {
        device: "아이폰 · Chrome 등",
        steps: ["오른쪽 위 공유 버튼을 눌러요", "'홈 화면에 추가'를 골라요", "'추가'를 누르면 끝!"],
        hint: "공유 메뉴에 항목이 없으면 Safari로 열어 주세요.",
      };
    }
    return {
      device: "아이폰 · 아이패드 (Safari)",
      steps: ["하단 가운데 공유 버튼(□↑)을 눌러요", "목록에서 '홈 화면에 추가'를 골라요", "오른쪽 위 '추가'를 누르면 끝!"],
      hint: "홈 화면에 '띠니마트' 아이콘으로 추가돼요.",
    };
  }
  if (android) {
    if (inApp) {
      return {
        device: "안드로이드 · 앱 안 브라우저",
        steps: ["지금은 앱 안의 브라우저로 열려 있어요", "오른쪽 위 메뉴에서 'Chrome으로 열기'를 눌러요", "Chrome 오른쪽 위 ⋮ → '홈 화면에 추가' 또는 '앱 설치'"],
        hint: "카카오톡·인스타그램 안에서는 설치가 막혀 있어요.",
      };
    }
    return {
      device: "안드로이드 (Chrome)",
      steps: ["오른쪽 위 ⋮ 메뉴를 눌러요", "'앱 설치' 또는 '홈 화면에 추가'를 골라요", "'설치'를 누르면 끝!"],
      hint: "설치하면 홈 화면에 '띠니마트'로 보여요.",
    };
  }
  if (mac) {
    return {
      device: "맥 (PC)",
      steps: ["Chrome·Edge는 주소창 오른쪽 설치 아이콘 → '설치'", "Safari는 공유 → '즐겨찾기 추가' 또는 파일 → 'Dock에 추가'", "설치하면 Dock에서 앱처럼 바로 열려요"],
      hint: "단축키 ⌘D 로 즐겨찾기에 추가할 수도 있어요.",
    };
  }
  return {
    device: "PC (Chrome·Edge)",
    steps: ["주소창 오른쪽의 설치 아이콘을 눌러요", "'설치'를 고르면 바탕화면에서 앱처럼 바로 열려요", "아이콘이 없으면 Ctrl+D 로 북마크에 추가해요"],
    hint: "북마크에 넣어 두면 클릭 한 번으로 열 수 있어요.",
  };
}

function shortcutUrl() {
  return location.origin + location.pathname;
}

function showInstallModal(guide) {
  const modal = $("install-modal");
  if (!modal) return;
  if ($("install-title")) $("install-title").textContent = guide.title || "홈 화면에 추가하기";
  if ($("install-device")) $("install-device").textContent = guide.device || "";
  if ($("install-steps")) {
    $("install-steps").innerHTML = (guide.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
  }
  if ($("install-hint")) {
    $("install-hint").textContent = guide.hint || "";
    $("install-hint").hidden = !guide.hint;
  }
  if ($("install-copied")) {
    $("install-copied").hidden = true;
    $("install-copied").textContent = "주소를 복사했어요";
  }
  modal.hidden = false;
  document.body.classList.add("modal-open");
  if ($("install-close")) $("install-close").focus({ preventScroll: true });
}

function closeInstallModal() {
  const modal = $("install-modal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  if (!$(".pm-modal:not([hidden])")) document.body.classList.remove("modal-open");
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
  document.querySelectorAll("[data-shortcut]").forEach((btn) => btn.addEventListener("click", onShortcutClick));
  if (isStandalone()) hideShortcutBanners();
  const modal = $("install-modal");
  if (!modal) return;
  if ($("install-close")) $("install-close").addEventListener("click", closeInstallModal);
  if ($("install-x")) $("install-x").addEventListener("click", closeInstallModal);
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
      setTimeout(() => (copied.hidden = true), 2400);
    });
  }
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
  powder: ["zero", "tea"],
  protein: ["protein", "all"],
};
const LEGACY_FILTER = { fizz: "cola", boost: "ion" };
const LEGACY_SORT = { per100: "basis", per100g: "basis" };

function syncUrl() {
  const url = new URL(location.href);
  const put = (k, v) => {
    if (v == null || v === "" || v === "all") url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  };
  put("tab", state.tab === "home" ? "" : state.tab);
  put("part", state.part);
  put("f", state.filter);
  put("sort", state.sort === "basis" ? "" : state.sort);
  put("basis", state.basis === "auto" ? "" : state.basis);
  put("pack", state.container);
  put("ing", state.ingredient);
  const srcOn = state.sources.coupang && state.sources.toss ? "" : [state.sources.coupang ? "coupang" : "", state.sources.toss ? "toss" : ""].filter(Boolean).join(",");
  put("src", srcOn);
  put("q", state.query.trim());
  put("p", state.highlightId);
  url.searchParams.delete("cat");
  history.replaceState({}, "", url);
}

function applyUrlState() {
  const q = new URLSearchParams(location.search);
  const tab = q.get("tab");
  if (tab && TABS.some((t) => t.id === tab)) state.tab = tab;

  const src = q.get("src");
  if (src) {
    const set = new Set(src.split(",").map((s) => s.trim()).filter(Boolean));
    state.sources.coupang = set.has("coupang");
    state.sources.toss = set.has("toss");
    if (!state.sources.coupang && !state.sources.toss) state.sources = { coupang: true, toss: true };
  }

  const legacy = q.get("cat") ? LEGACY_CAT[q.get("cat")] : null;
  const wantedPart = q.get("part") || (legacy ? legacy[0] : "all");
  if (allParts().some((p) => p.id === wantedPart)) state.part = wantedPart;
  const filterId = q.get("f") ? LEGACY_FILTER[q.get("f")] || q.get("f") : legacy ? legacy[1] : "all";
  if (partFilters(state.part).some((f) => f.id === filterId)) state.filter = filterId;

  const sort = q.get("sort");
  if (sort) {
    const mapped = LEGACY_SORT[sort] || sort;
    if (SORT_IDS.has(mapped)) state.sort = mapped;
  }
  const basis = q.get("basis");
  if (BASIS_OPTIONS.some((b) => b.id === basis)) state.basis = basis;

  const packs = (state.data.containers || []).map((c) => c.id);
  if (q.get("pack") && packs.includes(q.get("pack"))) state.container = q.get("pack");
  const ings = (state.data.ingredientFilters || []).map((c) => c.id);
  if (q.get("ing") && ings.includes(q.get("ing"))) state.ingredient = q.get("ing");

  const pid = q.get("p");
  if (pid && (state.data.products || []).some((p) => p.id === pid)) state.highlightId = pid;

  const query = q.get("q");
  if (query) {
    state.query = query;
    const input = $("search-input");
    if (input) input.value = query;
  }

  if (!tab && (q.get("part") || q.get("f") || q.get("pack") || q.get("ing"))) state.tab = "category";
  if (!TABS.some((t) => t.id === state.tab)) state.tab = "home";
}

/* ── 시작 ────────────────────────────────────────────── */

function paint() {
  syncUrl();
  renderSearchStatus();
  renderControls();
  if (state.tab === "home") renderHome();
  else if (state.tab === "category") renderCategory();
  else if (state.tab === "ranking") renderRanking();
  else renderHotdeal();
  if (typeof refreshAlertButtons === "function") refreshAlertButtons();
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

function setLegalOffset() {
  const legal = document.querySelector(".legal");
  if (!legal) return;
  document.documentElement.style.setProperty("--legal-h", legal.offsetHeight + "px");
}

/* 최신 업데이트 = 상품 카드 확인 시각 · 가격 이력 생성 시각 중 가장 늦은 값 */
const WEEKDAY_KO = ["일", "월", "화", "수", "목", "금", "토"];

function parseCheckedAt(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(value || ""));
  if (!m) return null;
  return { date: `${m[1]}-${m[2]}-${m[3]}`, y: +m[1], mo: +m[2], d: +m[3], time: m[4] ? `${m[4]}:${m[5]}` : "" };
}

function latestChecked() {
  let best = null;
  const consider = (c) => {
    if (!c) return;
    if (!best || c.date > best.date || (c.date === best.date && c.time > best.time)) best = c;
  };
  (state.data.products || []).forEach((p) => consider(parseCheckedAt(p.priceCheckedAt)));
  consider(parseCheckedAt((state.priceMeta || {}).generatedAt));
  consider(parseCheckedAt(state.data.site && state.data.site.updatedAt));
  return best;
}

function renderUpdateBand() {
  const site = state.data.site || {};
  const latest = latestChecked();
  if (latest && $("update-date-big")) {
    const wd = WEEKDAY_KO[new Date(latest.y, latest.mo - 1, latest.d).getDay()] || "";
    $("update-date-big").textContent = `${latest.mo}/${latest.d}`;
    if ($("update-weekday")) $("update-weekday").textContent = wd ? `(${wd})` : "";
  }
  if ($("update-cycle-main")) {
    // '오전 9시'가 줄 끝에서 '오전'/'9시'로 갈라지지 않게 시각 앞 공백만 붙여 둡니다.
    const cycle = site.updateCycle || "매일 오전 9시·오후 9시 가격 자동 업데이트";
    $("update-cycle-main").textContent = cycle
      .replace(/(오전|오후) /g, "$1\u00a0")
      .replace(/가격 자동 업데이트/g, "가격\u00a0자동\u00a0업데이트");
  }
  if ($("update-cycle-note")) $("update-cycle-note").textContent = site.updateCycleNote || "쿠팡·토스 가격을 다시 확인해요";
}

async function init() {
  setLegalOffset();
  initShortcut();
  initShare();
  initSearch();
  initControls();
  window.addEventListener("resize", setLegalOffset);

  state.data = await loadCatalog();
  if (typeof loadPriceHistory === "function") await loadPriceHistory();
  if (typeof initPriceModal === "function") initPriceModal();
  buildLowInfo();
  if (typeof buildMarketIndex === "function") buildMarketIndex(state.data.products, state.data.categories);
  if (typeof initCalc === "function") initCalc();
  if (typeof initPushUI === "function") initPushUI();
  if (typeof initPush === "function") initPush();
  applyUrlState();
  renderUpdateBand();
  renderNav();
  setTab(state.tab, false);
  if (state.highlightId) {
    const id = state.highlightId;
    setTimeout(() => jumpToProduct(id), 80);
  }
}

init().catch((err) => {
  const box = document.querySelector("#home-list");
  if (box) {
    box.innerHTML = `<div class="empty"><p>상품 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p></div>`;
  }
  console.error(err);
});
