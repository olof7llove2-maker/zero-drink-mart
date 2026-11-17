/* 띠니마트 v5 — 5대 카테고리 · 옵션 묶음 · 미니 가격그래프
   데이터: js/products.js (PRODUCTS · PARTS · CATEGORIES …), data/price-history.json */
const won = (n) => Number(n).toLocaleString("ko-KR") + "원";
const $ = (id) => document.getElementById(id);
const SHARE_BASE = "https://zero-drink-mart.vercel.app";

const TABS = [
  { id: "home", label: "홈", icon: "🏠" },
  { id: "category", label: "카테고리", icon: "🗂️" },
  { id: "search", label: "검색", icon: "🔍" },
  { id: "ranking", label: "랭킹", icon: "🏆" },
  { id: "hotdeal", label: "핫딜", icon: "🔥" },
];

/* 카테고리 탭 대표 사진 — 재영 님이 고른 대표 상품 */
const PART_TILES = [
  { part: "zero", label: "제로 음료", emoji: "🥤", sub: "펩시·나랑드·몬스터", image: "images/toss-pepsi-jero-syugeo-raimhyang-355ml-24gae.jpeg" },
  { part: "protein", label: "단백질 음료", emoji: "💪", sub: "더단백·셀렉스·테이크핏", image: "images/deodanbaek-deuringkeu-choko-250ml-18gae.jpg" },
  { part: "shake", label: "단백질 쉐이크", emoji: "🥛", sub: "신타6·옵티멈·마이프로틴", image: "images/shake-bsn-syntha6-chocolate-milkshake-2-27kg.jpg" },
  { part: "meat", label: "식단 고기", emoji: "🥩", sub: "소·돼지·닭 원물", image: "images/meat-beef-au-buchaesal-steak-600g.jpg" },
  { part: "cheat", label: "치팅·간편식", emoji: "🍕", sub: "햇반·간편 닭가슴살·스팸", image: "images/retort-can-spam-classic-340g-6.jpg" },
];

const SORT_OPTIONS = [
  { id: "popular", label: "🔥 인기·할인 순" },
  { id: "basis", label: "단가 낮은 순" },
  { id: "discount", label: "할인율 높은 순" },
  { id: "low", label: "저점 가까운 순" },
  { id: "price", label: "가격 낮은 순" },
];
const SORT_IDS = new Set(SORT_OPTIONS.map((s) => s.id));

/* 홈 1등 고정 상품 — 재영 님: "뉴욕웨이 프로틴을 제일 위에 두자" */
const HOME_PIN_ID = "shake-newyorkwhey-light-2kg";

const state = {
  data: null,
  priceHistory: null,
  priceMeta: null,
  low: {},
  vgroups: {},
  tab: "home",
  part: "all",
  filter: "all",
  sources: { coupang: true, toss: true },
  sort: "popular",
  query: "",
  highlightId: null,
  limit: { home: 24, category: 30, hotdeal: 30 },
};

function escapeHtml(s) {
  return String(s == null ? "" : s)
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

/* ── 구조 ─────────────────────────────────────────────── */

function allParts() {
  return state.data.parts && state.data.parts.length ? state.data.parts : [{ id: "all", label: "전체" }];
}
function partById(id) {
  return allParts().find((p) => p.id === id) || null;
}
function partOf(p) {
  return p.part || "zero";
}
function categoryLabel(catId) {
  const c = (state.data.categories || []).find((x) => x.id === catId);
  return c ? c.label : catId;
}
function partFilters(partId) {
  const part = partById(partId == null ? state.part : partId);
  if (!part || !part.filters || !part.filters.length) return [{ id: "all", label: "전체", cats: [] }];
  return part.filters;
}
function currentFilter() {
  return partFilters().find((f) => f.id === state.filter) || null;
}
function matchesFilter(p, f) {
  if (!f) return true;
  const cats = f.cats || [];
  if (cats.length && !cats.includes(p.category)) return false;
  return true;
}

/* ── 단가 · 영양 ──────────────────────────────────────── */

const MEASURE_LABEL = { per100ml: "100ml당", per100g: "100g당", each: "개당" };

function isMeat(p) {
  return partOf(p) === "meat";
}
function isGadget(p) {
  return p.category === "gadget";
}
function measureKind(p) {
  if (p.measure) return p.measure;
  if (isGadget(p)) return "each";
  if (p.category === "shake" || p.container === "powder") return "per100g";
  if (partOf(p) === "zero" || partOf(p) === "protein") return "per100ml";
  return "per100g";
}
function measureValue(p) {
  if (typeof p.perValue === "number" && Number.isFinite(p.perValue)) return p.perValue;
  if (measureKind(p) === "each") return typeof p.price === "number" ? p.price : null;
  if (measureKind(p) === "per100g") {
    if (typeof p.per100g === "number") return p.per100g;
    if (typeof p.unitPricePer100g === "number") return p.unitPricePer100g;
    return null;
  }
  return typeof p.unitPricePer100ml === "number" ? p.unitPricePer100ml : null;
}
function measureLabel(p) {
  if (measureKind(p) === "each") return `1${p.eachLabel || "개"}당`;
  return MEASURE_LABEL[measureKind(p)] || "단가";
}
function proteinValue(p) {
  const n = p.protein_g_per_bottle;
  return typeof n === "number" && Number.isFinite(n) ? n : null;
}
function kcalLabel(p) {
  if (p.kcalLabel) return p.kcalLabel;
  const n = p.kcal_per_bottle;
  return typeof n === "number" && Number.isFinite(n) ? `${n}kcal` : null;
}
function protein20(p) {
  if (typeof p.protein20 === "number" && Number.isFinite(p.protein20)) return p.protein20;
  return null;
}
function proteinPerG(p) {
  if (typeof p.proteinPerG === "number" && Number.isFinite(p.proteinPerG)) return p.proteinPerG;
  const g = proteinValue(p);
  const each = p.eachPrice;
  if (g == null || each == null || g <= 0) return null;
  return Math.round(each / g);
}
function reviewLabel(n) {
  if (typeof n !== "number" || !Number.isFinite(n)) return "";
  if (n >= 10000) return `${(n / 10000).toFixed(n >= 100000 ? 0 : 1)}만`;
  if (n >= 1000) return `${(n / 1000).toFixed(1)}천`;
  return n.toLocaleString("ko-KR");
}

/* ── 60일 저점 ────────────────────────────────────────── */

function buildLowInfo() {
  state.low = {};
  const entries = state.priceHistory || {};
  Object.entries(entries).forEach(([id, e]) => {
    const st = e.stats || {};
    const series = e.series || [];
    const has = e.status === "history" && st.min != null && series.length > 1;
    state.low[id] = {
      hasHistory: has,
      min: st.min,
      avg: st.avg,
      max: st.max,
      minDate: st.minDate,
      days: st.days,
      observations: st.observations,
      volatile: !!(e.couprice && e.couprice.crosscheck && e.couprice.crosscheck.sourceWarnsVolatile),
      series,
    };
  });
}
function historyOf(p) {
  return state.low[p.id] || null;
}
function lowStats(p) {
  const info = historyOf(p);
  if (!info) return { state: "none" };
  if (!info.hasHistory) return { state: "tracking", info };
  if (p.price == null || info.min == null) return { state: "none", info };
  const pct = Math.round((p.price / info.min - 1) * 100);
  const pctAvg = info.avg ? Math.round((p.price / info.avg - 1) * 100) : null;
  const s = pct <= 0 ? "low" : pct <= 3 ? "near" : "above";
  return { state: s, pct, pctAvg, info };
}

/* 하루 단위 마지막 가격만 남긴 시계열 */
function dailySeries(p) {
  const info = historyOf(p);
  if (!info || !info.series || info.series.length < 2) return [];
  const byDate = new Map();
  info.series.forEach((s) => {
    if (!s || !Number.isFinite(s.price)) return;
    byDate.set(String(s.date).slice(0, 10), s.price);
  });
  return [...byDate.entries()].map(([date, price]) => ({ date, price })).sort((a, b) => (a.date < b.date ? -1 : 1));
}

/* 미니 스파크라인 (사진 아래) */
function sparkSVG(p) {
  const series = dailySeries(p);
  if (series.length < 2) return null;
  const W = 108;
  const H = 30;
  const pad = 2;
  const vals = series.map((s) => s.price);
  let lo = Math.min(...vals);
  let hi = Math.max(...vals);
  if (hi === lo) {
    hi += Math.max(100, Math.round(lo * 0.02));
    lo = Math.max(0, lo - Math.max(100, Math.round(lo * 0.02)));
  }
  const x = (i) => pad + (i / (series.length - 1)) * (W - pad * 2);
  const y = (v) => pad + (1 - (v - lo) / (hi - lo)) * (H - pad * 2);
  const line = series.map((s, i) => `${i ? "L" : "M"}${x(i).toFixed(1)} ${y(s.price).toFixed(1)}`).join(" ");
  const area = `${line} L${x(series.length - 1).toFixed(1)} ${H - pad} L${pad} ${H - pad} Z`;
  const last = series[series.length - 1];
  const lowIdx = vals.indexOf(Math.min(...vals));
  const down = last.price <= series[0].price;
  const stroke = down ? "#1f8a5f" : "#c8442a";
  return `<svg class="spark-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="60일 가격 추이">
    <path d="${area}" fill="${down ? "rgba(31,138,95,0.14)" : "rgba(200,68,42,0.12)"}"/>
    <path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(series.length - 1).toFixed(1)}" cy="${y(last.price).toFixed(1)}" r="2.2" fill="${stroke}"/>
    <circle cx="${x(lowIdx).toFixed(1)}" cy="${y(vals[lowIdx]).toFixed(1)}" r="1.8" fill="#0f172a" opacity="0.55"/>
  </svg>`;
}

function sparkBlock(p) {
  const svg = sparkSVG(p);
  if (!svg) {
    return `<div class="spark is-none" title="60일 가격 기록을 모으는 중이에요"><span>조사 중</span></div>`;
  }
  const info = historyOf(p);
  return `<div class="spark">${svg}<span class="spark-cap">60일 최저 ${won(info.min)}</span></div>`;
}

/* 할인 시작일 — 기록에서 '지금 가격보다 비쌌던 마지막 날' 다음 날부터 */
function discountSince(p) {
  const series = dailySeries(p);
  if (series.length < 2 || p.price == null) return null;
  const cur = p.price;
  let idx = -1;
  for (let i = series.length - 1; i >= 0; i -= 1) {
    if (series[i].price > cur * 1.01) {
      idx = i;
      break;
    }
  }
  if (idx === -1) return null;
  const startIdx = idx + 1;
  if (startIdx >= series.length) return null;
  const start = series[startIdx].date;
  const today = new Date();
  const d = new Date(`${start}T00:00:00+09:00`);
  const days = Math.max(1, Math.round((today - d) / 86400000) + 1);
  if (days > 60) return null;
  const [, m, dd] = start.split("-");
  return { date: `${Number(m)}/${Number(dd)}`, days };
}

/* ── 목록 · 정렬 ──────────────────────────────────────── */

/* 플랫폼 3색: 쿠팡=레드 · 토스=파랑 · 네이버=초록 */
const PLATFORMS = {
  coupang: { label: "쿠팡", mark: "❤️", cls: "is-coupang" },
  toss: { label: "토스", mark: "💙", cls: "is-toss" },
  naver: { label: "네이버", mark: "💚", cls: "is-naver" },
};
function platformOf(p) {
  if (p.platform === "toss") return "toss";
  if (p.platform === "naver") return "naver";
  return "coupang";
}
function isToss(p) {
  return p.platform === "toss";
}
/* 네이버 최저가(배송비 포함)가 붙은 카드만 초록 버튼을 같이 띄운다 */
function naverAlt(p) {
  const a = p.altPrice;
  return a && a.source === "naver" && typeof a.price === "number" && a.url ? a : null;
}
/* 카드에 노출할 구매 버튼 — 같은 상품이면 플랫폼별 버튼을 싼 순서로 나란히 */
function buyOptions(p) {
  const out = [];
  if (p.affiliateUrl) out.push({ key: platformOf(p), price: p.price, url: p.affiliateUrl });
  const nv = naverAlt(p);
  if (nv) out.push({ key: "naver", price: nv.price, url: nv.url });
  return out.sort((a, b) => a.price - b.price || (a.key === "naver" ? 1 : -1));
}
/* 카드 대표 가격 = 지금 제일 싼 플랫폼 가격 */
function cheapView(p) {
  const nv = naverAlt(p);
  if (nv && nv.price < p.price) {
    const ratio = p.price ? nv.price / p.price : 1;
    return {
      price: nv.price,
      platform: "naver",
      perValue: typeof p.perValue === "number" ? p.perValue * ratio : null,
      eachPrice: typeof p.eachPrice === "number" ? p.eachPrice * ratio : null,
    };
  }
  return { price: p.price, platform: platformOf(p), perValue: p.perValue, eachPrice: p.eachPrice };
}
function matchesSource(p) {
  const k = platformOf(p);
  if (k === "toss") return state.sources.toss;
  if (k === "naver") return true;
  return state.sources.coupang;
}
function normText(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/[\s()\[\]{},·\-–—/]+/g, "");
}
function searchTokens() {
  return String(state.query || "").toLowerCase().split(/\s+/).map(normText).filter(Boolean);
}
function haystack(p) {
  if (!p.__hay) {
    p.__hay = normText([p.name, p.brand, p.kind, p.flavor, p.group, categoryLabel(p.category)].join(" "));
  }
  return p.__hay;
}
function matchesQuery(p) {
  const tokens = searchTokens();
  if (!tokens.length) return true;
  const hay = haystack(p);
  return tokens.every((t) => hay.includes(t));
}
function basePool() {
  const all = (state.data.products || []).filter((p) => matchesSource(p));
  return state.tab === "search" ? all.filter(matchesQuery) : all;
}

function sortValue(p, key) {
  if (key === "popular") return typeof p.popularScore === "number" ? p.popularScore : null;
  if (key === "basis") {
    const v = cheapView(p).perValue;
    return typeof v === "number" ? v : measureValue(p);
  }
  if (key === "discount") return typeof p.discountPct === "number" ? p.discountPct : null;
  if (key === "price") return typeof cheapView(p).price === "number" ? cheapView(p).price : null;
  if (key === "low") {
    const s = lowStats(p);
    if (s.state === "low" || s.state === "near" || s.state === "above") return s.pct;
    return null;
  }
  return null;
}
function sortList(list, key) {
  const k = key || state.sort;
  const desc = k === "popular" || k === "discount";
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

/* 프리미엄(100g당 5,000원 이상)은 정렬 결과에서 항상 맨 아래로 */
function isPremium(p) {
  return p.category === "premium" || p.premium === true;
}
function withPremiumLast(list) {
  if (!list.some(isPremium)) return list;
  const normal = [];
  const premium = [];
  list.forEach((p) => (isPremium(p) ? premium : normal).push(p));
  return normal.concat(premium);
}

/* 옵션 묶음: 대표 1개만 목록에 보이고, 나머지는 카드 안 옵션 버튼으로 */
function buildVariantIndex() {
  state.vgroups = {};
  (state.data.products || []).forEach((p) => {
    if (!p.variantGroup) return;
    (state.vgroups[p.variantGroup] = state.vgroups[p.variantGroup] || []).push(p);
  });
  Object.values(state.vgroups).forEach((arr) =>
    arr.sort((a, b) => (a.packCount || 0) - (b.packCount || 0))
  );
}
function defaultVariantIds() {
  const ids = new Set();
  Object.values(state.vgroups).forEach((arr) => {
    const base = arr.find((x) => !String(x.id).includes("#")) || arr[Math.min(1, arr.length - 1)];
    ids.add(base.id);
  });
  return ids;
}
let DEFAULTS = new Set();
function collapseVariants(list) {
  const hasGroup = (p) => p.variantGroup && state.vgroups[p.variantGroup] && state.vgroups[p.variantGroup].length > 1;
  const present = new Set(list.map((p) => p.id));
  return list.filter((p) => {
    if (!hasGroup(p)) return true;
    if (DEFAULTS.has(p.id)) return true;
    const def = state.vgroups[p.variantGroup].find((x) => DEFAULTS.has(x.id));
    return !def || !present.has(def.id);
  });
}

/* ── 카드 ─────────────────────────────────────────────── */

function offBadge(p) {
  if (typeof p.discountPct !== "number" || p.discountPct <= 0) return "";
  const hot = p.discountPct >= 40 ? " is-hot" : "";
  return `<span class="pc-off${hot}">-${p.discountPct}%</span>`;
}

function unitLine(p, view) {
  const v = view && typeof view.perValue === "number" ? view.perValue : measureValue(p);
  if (v == null) return "";
  const kind = measureKind(p);
  const eachVal = view && typeof view.eachPrice === "number" ? view.eachPrice : p.eachPrice;
  const each =
    kind !== "each" && eachVal
      ? `<span class="dot">·</span>1${escapeHtml(p.eachLabel || "개")}당 <b>${won(Math.round(eachVal))}</b>`
      : "";
  return `<p class="pc-unit"><b>${won(Math.round(v))}</b><span class="per">/${measureLabel(p).replace("당", "")}</span>${each}</p>`;
}

function subLine(p) {
  const bits = [];
  if (partOf(p) === "protein" || p.category === "shake") {
    const src = p.proteinSourceDetail || p.proteinSource;
    if (src) bits.push(`🧬 ${src}`);
    const g = proteinValue(p);
    if (g != null) bits.push(`${p.proteinBasis || (p.category === "shake" ? "1회" : "병당")} 단백질 ${g}g`);
    const k = kcalLabel(p);
    if (k) bits.push(k);
    if (p.sugarPerServing != null) bits.push(`당류 ${p.sugarPerServing}g`);
    if (!bits.length && p.kind) bits.push(p.kind);
  } else if (isGadget(p)) {
    if (p.kind) bits.push(p.kind);
  } else {
    if (p.kind && p.category !== "rice" && p.category !== "can") bits.push(p.kind);
    if (p.weightG) bits.push(p.weightG >= 1000 ? `${p.weightG / 1000}kg` : `${p.weightG}g`);
    if (p.volumeMl) bits.push(`${p.volumeMl}ml`);
    if (p.packCount && !p.variantGroup) bits.push(`${p.packCount}개`);
    if (typeof p.proteinPer100g === "number") bits.push(`단백질 ${p.proteinPer100g}g/100g`);
  }
  return bits.filter(Boolean).join(" · ");
}

function rateLine(p) {
  if (p.rating == null && p.reviewCount == null) return "";
  const star = p.rating != null ? `★ ${Number(p.rating).toFixed(1)}` : "";
  const rv = p.reviewCount != null ? `${star ? " " : ""}리뷰 ${reviewLabel(p.reviewCount)}` : "";
  return `<span class="pc-rate">${star}${rv}</span>`;
}

function dealBadges(p) {
  const out = [];
  const s = lowStats(p);
  if (s.state === "low") out.push(`<span class="bd bd-low">60일 최저가!</span>`);
  else if (s.state === "near") out.push(`<span class="bd bd-near">저점 +${s.pct}%</span>`);
  else if (s.state === "above" && s.pct <= 12) out.push(`<span class="bd bd-up">저점 +${s.pct}%</span>`);
  const since = discountSince(p);
  if (since) out.push(`<span class="bd bd-since">${since.date}부터 할인 · ${since.days}일째</span>`);
  if (p.shipNote) out.push(`<span class="bd bd-track">${escapeHtml(p.shipNote)}</span>`);
  const nv = naverAlt(p);
  if (nv && nv.price < p.price) out.push(`<span class="bd bd-naver">💚 네이버가 ${won(p.price - nv.price)} 싸요</span>`);
  return out.join("");
}

function optionRow(p) {
  const arr = p.variantGroup ? state.vgroups[p.variantGroup] || [] : [];
  if (arr.length < 2) return "";
  return `<div class="pc-opts" role="group" aria-label="묶음 수량 선택">${arr
    .map(
      (v) =>
        `<button type="button" class="opt${v.id === p.id ? " is-on" : ""}" data-var="${escapeHtml(v.id)}">${escapeHtml(
          v.variantLabel || `${v.packCount}개`
        )}</button>`
    )
    .join("")}</div>`;
}

/* 구매 버튼: 한 카드에 플랫폼별 버튼을 나란히 (쿠팡 레드 · 토스 파랑 · 네이버 초록) */
function buyHTML(p) {
  const opts = buyOptions(p);
  if (!opts.length) return `<span class="pending-label">링크 준비 중</span>`;
  const multi = opts.length > 1;
  const html = opts
    .map((o) => {
      const meta = PLATFORMS[o.key];
      /* 라벨 통일: 한 버튼이면 "쿠팡/토스/네이버", 두 버튼이면 "네이버 24,580" */
      const label = multi
        ? `<span class="bp-lab">${meta.label}</span><span class="bp-price">${Number(o.price).toLocaleString(
            "ko-KR"
          )}</span>`
        : `<span class="buy-lab">${meta.label}</span>`;
      return `<a class="btn-buy ${meta.cls}${multi ? " is-pair" : ""}" href="${escapeHtml(
        o.url
      )}" target="_blank" rel="noopener noreferrer" aria-label="${meta.label}에서 사기 ${
        won(o.price)
      }">${label}</a>`;
    })
    .join("");
  return `<div class="pc-buys${multi ? " is-multi" : ""}">${html}</div>`;
}

function cardEl(p, opts = {}) {
  const el = document.createElement("article");
  el.className = "pc";
  el.dataset.id = p.id;
  el.__opts = opts;
  const view = cheapView(p);
  const buys = buyOptions(p);
  const multiBuy = buys.length > 1;
  const srcKey = platformOf(p);
  const rank = opts.rank
    ? `<span class="pc-rank${opts.rank <= 3 ? " is-top" : ""}">${opts.rank}</span>`
    : "";
  const photo = p.image
    ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async">`
    : `<span class="photo-blank">사진 준비 중</span>`;
  const was = p.listPrice && p.listPrice > p.price ? `<span class="was">${won(p.listPrice)}</span>` : "";
  el.innerHTML = `
    ${rank}
    <div class="pc-left">
      <div class="pc-photo">${photo}${offBadge(p)}</div>
      ${sparkBlock(p)}
    </div>
    <div class="pc-body">
      <p class="pc-top"><span class="pc-brand">${escapeHtml(p.brand || categoryLabel(p.category))}</span>
        <span class="src src-${srcKey}">${PLATFORMS[srcKey].label}</span>
        ${opts.showPart ? `<span class="pc-parttag">${escapeHtml((partById(partOf(p)) || {}).label || "")}</span>` : ""}
        ${rateLine(p)}</p>
      <h3 class="pc-name">${escapeHtml(p.name)}</h3>
      ${optionRow(p)}
      <div class="pc-price"><strong>${won(view.price)}</strong>${
        view.platform === "naver" ? `<span class="pc-nvtag">네이버 최저</span>` : ""
      }${was}</div>
      ${unitLine(p, view)}
      <p class="pc-sub">${escapeHtml(subLine(p))}</p>
      ${typeof gradeLineHTML === "function" ? gradeLineHTML(p) : ""}
      <div class="pc-deal">${dealBadges(p)}</div>
      <div class="pc-acts${multiBuy ? " is-pair" : ""}">
        ${typeof alertIconHTML === "function" ? alertIconHTML(p) : ""}
        <button type="button" class="btn-ghost" data-chart="${escapeHtml(p.id)}">📊 <span class="ghost-lab">추이</span></button>
        ${buyHTML(p)}
      </div>
    </div>`;
  return el;
}

/* 옵션 버튼 → 카드만 다시 그린다 */
function switchVariant(card, id) {
  const p = (state.data.products || []).find((x) => x.id === id);
  if (!p) return;
  const opts = card.__opts || {};
  const next = cardEl(p, opts);
  card.replaceWith(next);
  next.classList.add("is-flash");
  setTimeout(() => next.classList.remove("is-flash"), 1600);
}

/* ── 목록 그리기 ──────────────────────────────────────── */

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
    : `<p>이 분류에 상품이 없어요.</p>
       <div class="empty-actions"><button type="button" class="empty-btn is-primary" id="empty-reset">전체에서 다시 찾기</button></div>`;
  return box;
}

function groupedByCategory(list) {
  const order = (state.data.categories || []).map((c) => c.id);
  const ids = order.filter((id) => list.some((p) => p.category === id));
  return ids.map((id) => ({ id, items: list.filter((p) => p.category === id) }));
}

function renderCardsInto(target, list, opts = {}) {
  target.innerHTML = "";
  const items = collapseVariants(list);
  if (!items.length) {
    target.appendChild(emptyNode());
    return;
  }
  const limit = opts.limit || 0;
  const shown = limit ? items.slice(0, limit) : items;
  const grid = document.createElement("div");
  grid.className = opts.twoCol ? "list list--grid" : "list";
  const push = (arr, groupOpts) => arr.forEach((p) => grid.appendChild(cardEl(p, { ...opts, ...groupOpts })));

  if (opts.grouped) {
    groupedByCategory(shown).forEach((g) => {
      const head = document.createElement("div");
      head.className = "group-head";
      head.innerHTML = `<h2>${escapeHtml(categoryLabel(g.id))}</h2><span class="group-hint">${
        sortHint()
      }</span>`;
      grid.appendChild(head);
      push(g.items);
    });
  } else {
    push(shown);
  }
  target.appendChild(grid);

  if (limit && items.length > shown.length) {
    const more = document.createElement("button");
    more.type = "button";
    more.className = "more-btn";
    more.dataset.more = opts.moreKey || "";
    more.textContent = `더 보기 (${items.length - shown.length}개 남음)`;
    target.appendChild(more);
  }
}

function sortHint() {
  const map = {
    popular: "인기·할인 순",
    basis: "단가 낮은 순",
    discount: "할인율 높은 순",
    low: "저점 가까운 순",
    price: "가격 낮은 순",
  };
  return map[state.sort] || "";
}

/* ── 컨트롤 (한 줄 칩) ────────────────────────────────── */

function ctlBarHTML(extra = "") {
  const chips = SORT_OPTIONS.map(
    (o) =>
      `<button type="button" class="cchip${state.sort === o.id ? " is-on" : ""}" data-sort="${o.id}">${o.label}</button>`
  ).join("");
  const srcs =
    `<button type="button" class="cchip is-src${state.sources.coupang ? " is-on" : ""}" data-src="coupang">쿠팡</button>` +
    `<button type="button" class="cchip is-src${state.sources.toss ? " is-on" : ""}" data-src="toss">토스</button>`;
  return `<div class="ctlbar-scroll">${chips}<span class="ctl-sep"></span>${srcs}${extra}</div>`;
}

function renderControls() {
  document.querySelectorAll("[data-controls]").forEach((box) => {
    const kind = box.dataset.controls;
    box.innerHTML = ctlBarHTML();
  });
}

/* ── 홈 ──────────────────────────────────────────────── */

/* 한 상품을 목록 맨 앞으로 (홈 1등 고정) */
function pinFirst(list, id) {
  const i = list.findIndex((p) => p.id === id);
  if (i <= 0) return list;
  const out = list.slice();
  out.unshift(out.splice(i, 1)[0]);
  return out;
}

/* ── 🔥 오늘의 역대급 할인 (가로 스와이프) ─────────────── */

/* 할인율 높은 순 Top 5 — 사진·구매링크가 있는 상품만 */
function spotlightPicks(n) {
  const pool = collapseVariants((state.data.products || []).filter(matchesSource));
  return pool
    .filter(
      (p) =>
        p.image &&
        p.affiliateUrl &&
        typeof p.price === "number" &&
        typeof p.discountPct === "number" &&
        p.discountPct > 0
    )
    .sort((a, b) => b.discountPct - a.discountPct || (a.perValue || 0) - (b.perValue || 0))
    .slice(0, n || 5);
}

function spotUnitText(p) {
  const v = measureValue(p);
  if (v == null) return "";
  return `${measureLabel(p)} ${won(Math.round(v))}`;
}

function spotCardHTML(p) {
  const view = cheapView(p);
  const srcKey = view.platform || platformOf(p);
  const was =
    p.listPrice && p.listPrice > view.price
      ? `<s class="spot-was">${won(p.listPrice)}</s>`
      : "";
  const unit = spotUnitText(p);
  const buys = buyOptions(p);
  const buyHTML = buys.length
    ? buys
        .map((o) => {
          const m = PLATFORMS[o.key];
          return `<a class="spot-buy ${m.cls}" href="${escapeHtml(o.url)}" target="_blank" rel="noopener noreferrer" aria-label="${
            m.label
          }에서 사기 ${won(o.price)}">${m.label}</a>`;
        })
        .join("")
    : `<span class="spot-buy is-pending">준비 중</span>`;
  return `<article class="spot-card">
    <div class="spot-tap" data-chart="${escapeHtml(p.id)}" role="button" tabindex="0" aria-label="${escapeHtml(
      p.name
    )} 가격 추이 보기">
      <span class="spot-photo">
        <img src="${escapeHtml(p.image)}" alt="" width="72" height="72" loading="lazy" decoding="async">
        <span class="spot-off">-${p.discountPct}%</span>
      </span>
      <div class="spot-body">
        <p class="spot-meta"><span class="spot-brand">${escapeHtml(
          p.brand || categoryLabel(p.category)
        )}</span><span class="spot-src src-${srcKey}">${PLATFORMS[srcKey].label}</span></p>
        <h3 class="spot-name">${escapeHtml(p.name)}</h3>
        <p class="spot-price"><strong>${won(view.price)}</strong>${was}</p>
        ${unit ? `<p class="spot-unit">${escapeHtml(unit)}</p>` : ""}
      </div>
    </div>
    <div class="spot-buys">${buyHTML}</div>
  </article>`;
}

function renderSpotlight() {
  const box = $("home-spot");
  if (!box) return;
  const picks = spotlightPicks(5);
  if (!picks.length) {
    box.innerHTML = "";
    box.hidden = true;
    return;
  }
  box.hidden = false;
  box.innerHTML = `<div class="spot-head">
      <h2 class="spot-title">🔥 오늘의 역대급 할인</h2>
      <span class="spot-hint">좌우로 넘기기 →</span>
    </div>
    <div class="spot-rail">${picks.map(spotCardHTML).join("")}</div>`;
}

function renderHome() {
  renderSpotlight();
  let list = sortList(basePool(), state.sort);
  if (state.sort === "popular") list = pinFirst(list, HOME_PIN_ID);
  renderCardsInto($("home-list"), list, {
    limit: state.limit.home,
    moreKey: "home",
    showPart: true,
    twoCol: true,
  });
  const first = $("home-list") && $("home-list").querySelector(".pc");
  if (first && first.dataset.id === HOME_PIN_ID) first.classList.add("is-first");
  const count = $("home-count");
  if (count) count.textContent = `${collapseVariants(list).length}개`;
}

/* ── 카테고리 ────────────────────────────────────────── */

function renderTiles() {
  const box = $("cattiles");
  if (!box) return;
  const pool = basePool();
  box.innerHTML = PART_TILES.map((t) => {
    const n = pool.filter((p) => partOf(p) === t.part).length;
    return `<button type="button" class="tile" data-part-tile="${t.part}">
      <span class="tile-photo"><img src="${escapeHtml(t.image)}" alt="" loading="lazy" decoding="async"></span>
      <span class="tile-body">
        <span class="tile-name">${t.emoji} ${escapeHtml(t.label)}</span>
        <span class="tile-sub">${escapeHtml(t.sub)}</span>
        <span class="tile-n">${n}개</span>
      </span>
    </button>`;
  }).join("");
}

function renderCategoryList() {
  const wrap = $("cat-browse");
  const tiles = $("cattiles");
  const list = $("cat-list");
  if (!list) return;
  const browsing = state.part !== "all";
  if (tiles) tiles.hidden = browsing;
  if (wrap) wrap.hidden = !browsing;
  if (!browsing) {
    list.innerHTML = "";
    return;
  }
  const f = currentFilter();
  let items = basePool().filter((p) => partOf(p) === state.part && matchesFilter(p, f));
  items = sortList(items, state.sort);
  if (state.part === "meat") items = withPremiumLast(items);
  const part = partById(state.part);
  const head = $("cat-head");
  if (head) {
    head.innerHTML = `<h2>${escapeHtml(part.label)}</h2><span>${collapseVariants(items).length}개 · ${escapeHtml(
      sortHint()
    )}</span>`;
  }
  renderFilters();
  renderCardsInto(list, items, { limit: state.limit.category, moreKey: "category", grouped: state.filter === "all", twoCol: true });
}

function renderFilters() {
  const nav = $("part-filters");
  if (!nav) return;
  const items = partFilters();
  nav.innerHTML = items
    .map(
      (f) =>
        `<button type="button" class="filter${f.id === state.filter ? " is-on" : ""}" data-filter="${f.id}">${escapeHtml(
          f.label
        )}</button>`
    )
    .join("");
}

/* ── 랭킹 ────────────────────────────────────────────── */

function rankParts() {
  return [{ id: "all", label: "전체" }].concat(
    PART_TILES.map((t) => ({ id: t.part, label: t.label }))
  );
}
function renderRanking() {
  const parts = $("rank-parts");
  if (parts) {
    parts.innerHTML = rankParts()
      .map(
        (p) =>
          `<button type="button" class="${p.id === state.rankPart ? "is-on" : ""}" data-rankpart="${p.id}">${escapeHtml(
            p.label
          )}</button>`
      )
      .join("");
  }
  const pool = basePool().filter((p) => (state.rankPart === "all" ? true : partOf(p) === state.rankPart) && !isGadget(p));
  const items = collapseVariants(pool);

  const disc = items
    .filter((p) => typeof p.discountPct === "number" && p.discountPct > 0)
    .sort((a, b) => b.discountPct - a.discountPct || (a.perValue || 0) - (b.perValue || 0))
    .slice(0, 5);
  renderRankBlock("rank-discount", disc, "할인");

  /* 단가 최저: 같은 단위(100ml/100g/개) 안에서만 견준다 */
  const kinds = {};
  items.forEach((p) => {
    const k = measureKind(p);
    kinds[k] = (kinds[k] || 0) + 1;
  });
  const mainKind = Object.entries(kinds).sort((a, b) => b[1] - a[1])[0];
  const unit = mainKind ? mainKind[0] : "per100g";
  const unitItems = items
    .filter((p) => measureKind(p) === unit && measureValue(p) != null)
    .sort((a, b) => measureValue(a) - measureValue(b))
    .slice(0, 5);
  renderRankBlock("rank-unit", unitItems, "단가");
  const note = $("rank-note");
  if (note) note.textContent = `단가 최저는 ${MEASURE_LABEL[unit]} 기준으로 비교했어요 · 값이 같으면 가격이 낮은 순.`;
}

function renderRankBlock(id, items, mode) {
  const box = $(id);
  if (!box) return;
  box.innerHTML = "";
  if (!items.length) {
    box.appendChild(emptyNode());
    return;
  }
  items.forEach((p, i) => {
    const el = cardEl(p, { rank: i + 1, showPart: state.rankPart === "all" });
    if (mode === "단가") {
      const badge = el.querySelector(".pc-price");
      if (badge) badge.insertAdjacentHTML("beforeend", `<span class="rank-metric">${won(Math.round(measureValue(p)))}/${measureLabel(p).replace("당", "")}</span>`);
    }
    box.appendChild(el);
  });
}

/* ── 핫딜 ────────────────────────────────────────────── */

function renderHotdeal() {
  const ctl = $("hot-ctl");
  if (ctl) {
    ctl.innerHTML = ctlBarHTML(
      `<button type="button" class="cchip is-src${state.dealLow ? " is-on" : ""}" data-deallow="1">60일 저점만</button>`
    );
  }
  const pool = collapseVariants(basePool());
  const wall = pool
    .filter((p) => p.price != null)
    .map((p) => ({ p, has: dailySeries(p).length > 1 }))
    .sort((a, b) => (b.has - a.has) || (b.p.popularScore || 0) - (a.p.popularScore || 0))
    .slice(0, 12)
    .map((x) => x.p);
  const wallBox = $("chartwall");
  if (wallBox) {
    wallBox.innerHTML = wall
      .map((p) => {
        const svg = sparkSVG(p);
        const s = lowStats(p);
        const tag =
          s.state === "low"
            ? `<span class="wall-tag is-low">최저가</span>`
            : typeof p.discountPct === "number" && p.discountPct > 0
            ? `<span class="wall-tag">-${p.discountPct}%</span>`
            : "";
        return `<button type="button" class="wall-card" data-chart="${escapeHtml(p.id)}">
          <span class="wall-head"><b>${escapeHtml(p.name)}</b>${tag}</span>
          <span class="wall-body">${svg || `<span class="wall-none">조사 중</span>`}</span>
          <span class="wall-foot">${won(p.price)}<em>${escapeHtml(measureLabel(p))} ${won(
          Math.round(measureValue(p) || 0)
        )}</em></span>
        </button>`;
      })
      .join("");
  }
  let list = pool.filter((p) => typeof p.discountPct === "number" && p.discountPct > 0);
  if (state.dealLow) {
    list = pool.filter((p) => {
      const s = lowStats(p);
      return s.state === "low" || s.state === "near" || (s.state === "above" && s.pct <= 5);
    });
  }
  const lowPct = (p) => {
    const s = lowStats(p);
    return s.pct == null ? 99 : s.pct;
  };
  list.sort((a, b) =>
    state.dealLow ? lowPct(a) - lowPct(b) : b.discountPct - a.discountPct
  );
  const dealLimit = state.limit.hotdeal || 30;
  renderCardsInto($("deal-list"), list, { limit: dealLimit, moreKey: "hotdeal", showPart: true });
  const note = $("deal-note");
  if (note) {
    const shownN = Math.min(dealLimit, list.length);
    note.textContent = state.dealLow
      ? `60일 최저가에 붙은 상품만 · ${list.length}개 중 ${shownN}개.`
      : `할인율 높은 순 · ${list.length}개 중 ${shownN}개.`;
  }
}

/* ── 검색 ────────────────────────────────────────────── */

function renderSearchView() {
  const q = String(state.query || "").trim();
  const chips = $("search-chips");
  const lead = $("search-lead");
  const head = $("search-head");
  const panel = $("search-controls");
  const list = $("search-list");
  if (chips) chips.hidden = !!q;
  if (lead) lead.hidden = !!q;
  if (head) head.hidden = !q;
  if (panel) panel.hidden = !q;
  if (!list) return;
  if (!q) {
    list.innerHTML = "";
    if ($("search-count")) $("search-count").textContent = "";
    return;
  }
  const items = sortList(basePool(), state.sort);
  if ($("search-count")) $("search-count").textContent = `(${collapseVariants(items).length})`;
  renderCardsInto(list, items, { twoCol: true });
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
  state.sort = "popular";
  state.sources = { coupang: true, toss: true };
  state.highlightId = null;
  state.limit = { home: 24, category: 30, hotdeal: 30 };
  const input = $("search-input");
  if (input) input.value = "";
  paint();
}

/* ── 탭 · 내비 ───────────────────────────────────────── */

function renderNav() {
  const top = $("topnav");
  if (top) {
    top.innerHTML = TABS.map(
      (t) =>
        `<a href="?tab=${t.id}" data-goto="${t.id}" class="tab-${t.id}"${
          state.tab === t.id ? ' aria-current="page"' : ""
        }>${t.label}</a>`
    ).join("");
  }
  const bar = $("tabbar");
  if (bar) {
    bar.innerHTML = TABS.map(
      (t) =>
        `<a href="?tab=${t.id}" data-goto="${t.id}" class="tab-${t.id}"${
          state.tab === t.id ? ' aria-current="page"' : ""
        }><span class="ico" aria-hidden="true">${t.icon}</span><span>${t.label}</span></a>`
    ).join("");
  }
}

function focusSearchInput() {
  const input = $("search-input");
  if (!input) return;
  requestAnimationFrame(() => {
    try {
      input.focus({ preventScroll: true });
    } catch {
      input.focus();
    }
  });
}

function setTab(id, scroll = true) {
  if (!TABS.some((t) => t.id === id)) return;
  state.tab = id;
  document.body.dataset.tab = id;
  document.title =
    id === "home" ? "띠니마트 | 제로음료·단백질·고기·간편식 단가 비교" : `${TABS.find((t) => t.id === id).label} | 띠니마트`;
  TABS.forEach((t) => {
    const view = $(`view-${t.id}`);
    if (view) view.hidden = t.id !== id;
  });
  const hero = $("hero");
  if (hero) hero.hidden = id !== "home";
  renderNav();
  paint();
  if (scroll) window.scrollTo({ top: 0, behavior: "auto" });
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
  state.sources = { coupang: true, toss: true };
  state.highlightId = p.variantGroup ? (state.vgroups[p.variantGroup].find((x) => DEFAULTS.has(x.id)) || p).id : id;
  if (state.tab !== "home") setTab("home", false);
  paint();
  requestAnimationFrame(() => {
    const el = document.querySelector(`.pc[data-id="${CSS.escape(state.highlightId)}"]`);
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
  if (!p) return "제로 음료·단백질·식단 고기·간편식을 단가로 비교하는 띠니마트예요.";
  const price = p.price != null ? `${won(p.price)} · ` : "";
  const v = measureValue(p);
  const unit = v != null ? `${Math.round(v)}원 / ${measureLabel(p)}` : "";
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
      const p = (state.data.products || []).find((x) => x.id === copyBtn.getAttribute("data-copy"));
      if (!p) return;
      const link = p.affiliateUrl || shareLinkFor(p);
      const ok = await copyText(link);
      showToast(ok ? "구매 링크를 복사했어요 (제휴 링크)" : `직접 복사해 주세요: ${link}`);
      return;
    }
    const go = e.target.closest("[data-goto]");
    if (go) {
      e.preventDefault();
      const target = go.getAttribute("data-goto");
      setTab(target);
      if (target === "search") focusSearchInput();
      return;
    }
    if (e.target.closest("[data-share]")) shareMart(null);
  });
}

/* ── 홈 화면 바로가기 ────────────────────────────────── */

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
  document.querySelectorAll("[data-shortcut]").forEach((btn) => (btn.hidden = true));
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
function showInstallModal(guide) {
  const modal = $("install-modal");
  if (!modal) return;
  if ($("install-title")) $("install-title").textContent = guide.title || "홈 화면에 추가하기";
  if ($("install-device")) $("install-device").textContent = guide.device || "";
  if ($("install-steps")) $("install-steps").innerHTML = (guide.steps || []).map((s) => `<li>${escapeHtml(s)}</li>`).join("");
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
      if (choice && choice.outcome === "accepted") hideShortcutBanners();
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
      const url = location.origin + location.pathname;
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
  protein: ["protein", "all"],
  shake: ["shake", "all"],
  beef: ["meat", "beef"],
  pork: ["meat", "pork"],
  chicken: ["meat", "chicken"],
};
const LEGACY_SORT = { per100: "basis", per100g: "basis", reviews: "popular", rating: "popular" };

function syncUrl() {
  const url = new URL(location.href);
  const put = (k, v) => {
    if (v == null || v === "" || v === "all") url.searchParams.delete(k);
    else url.searchParams.set(k, v);
  };
  put("tab", state.tab === "home" ? "" : state.tab);
  put("part", state.part);
  put("f", state.filter);
  put("sort", state.sort === "popular" ? "" : state.sort);
  const srcOn =
    state.sources.coupang && state.sources.toss
      ? ""
      : [state.sources.coupang ? "coupang" : "", state.sources.toss ? "toss" : ""].filter(Boolean).join(",");
  put("src", srcOn);
  put("q", state.query.trim());
  put("p", state.highlightId);
  ["basis", "pack", "ing", "cat"].forEach((k) => url.searchParams.delete(k));
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
  const filterId = q.get("f") || (legacy ? legacy[1] : "all");
  if (partFilters(state.part).some((f) => f.id === filterId)) state.filter = filterId;
  const sort = q.get("sort");
  if (sort) {
    const mapped = LEGACY_SORT[sort] || sort;
    if (SORT_IDS.has(mapped)) state.sort = mapped;
  }
  const pid = q.get("p");
  if (pid && (state.data.products || []).some((p) => p.id === pid)) state.highlightId = pid;
  const query = q.get("q");
  if (query) {
    state.query = query;
    const input = $("search-input");
    if (input) input.value = query;
    if (!tab) state.tab = "search";
  }
  if (!tab && (q.get("part") || q.get("f"))) state.tab = "category";
  if (!TABS.some((t) => t.id === state.tab)) state.tab = "home";
}

/* ── 이벤트 ──────────────────────────────────────────── */

function initControls() {
  document.addEventListener("click", (e) => {
    const sortBtn = e.target.closest("[data-sort]");
    if (sortBtn) {
      state.sort = sortBtn.getAttribute("data-sort");
      state.limit.home = 24;
      state.limit.category = 30;
      paint();
      return;
    }
    const srcBtn = e.target.closest("[data-src]");
    if (srcBtn) {
      const key = srcBtn.getAttribute("data-src");
      state.sources[key] = !state.sources[key];
      if (!state.sources.coupang && !state.sources.toss) {
        state.sources[key] = true;
        showToast("출처는 하나 이상 골라야 해요");
      }
      paint();
      return;
    }
    const dealLow = e.target.closest("[data-deallow]");
    if (dealLow) {
      state.dealLow = !state.dealLow;
      state.limit.hotdeal = 30;
      paint();
      return;
    }
    const tile = e.target.closest("[data-part-tile]");
    if (tile) {
      state.part = tile.getAttribute("data-part-tile");
      state.filter = "all";
      state.limit.category = 30;
      paint();
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const back = e.target.closest("[data-backpart]");
    if (back) {
      state.part = "all";
      state.filter = "all";
      paint();
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const filt = e.target.closest("[data-filter]");
    if (filt) {
      state.filter = filt.getAttribute("data-filter");
      state.limit.category = 30;
      paint();
      return;
    }
    const rp = e.target.closest("[data-rankpart]");
    if (rp) {
      state.rankPart = rp.getAttribute("data-rankpart");
      paint();
      return;
    }
    const more = e.target.closest("[data-more]");
    if (more) {
      const key = more.getAttribute("data-more");
      if (key === "home") state.limit.home += 24;
      else if (key === "category") state.limit.category += 30;
      else if (key === "hotdeal") state.limit.hotdeal = (state.limit.hotdeal || 30) + 30;
      paint();
      return;
    }
    const varBtn = e.target.closest("[data-var]");
    if (varBtn) {
      const card = varBtn.closest(".pc");
      if (card) switchVariant(card, varBtn.getAttribute("data-var"));
      return;
    }
  });
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
    const chip = e.target.closest("[data-keyword]");
    if (chip) {
      state.query = chip.getAttribute("data-keyword");
      state.highlightId = null;
      const el = $("search-input");
      if (el) el.value = state.query;
      paint();
    }
  });
}

function renderSearchStatus() {
  const clear = $("search-clear");
  const input = $("search-input");
  const q = String(state.query || "").trim();
  if (clear) clear.hidden = !q;
  if (input && document.activeElement !== input && input.value !== state.query) input.value = state.query;
}

/* ── 시작 ────────────────────────────────────────────── */

function paint() {
  syncUrl();
  renderSearchStatus();
  renderControls();
  if (state.tab === "home") renderHome();
  else if (state.tab === "category") {
    renderTiles();
    renderCategoryList();
  } else if (state.tab === "search") renderSearchView();
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
  const latest = latestChecked();
  if (latest && $("update-date-big")) {
    const wd = WEEKDAY_KO[new Date(latest.y, latest.mo - 1, latest.d).getDay()] || "";
    $("update-date-big").textContent = `${latest.mo}/${latest.d}`;
    if ($("update-weekday")) $("update-weekday").textContent = wd ? `(${wd})` : "";
    if ($("update-time")) {
      $("update-time").textContent = latest.time || "";
      $("update-time").hidden = !latest.time;
    }
  }
  if ($("update-cycle-main")) $("update-cycle-main").textContent = "오전·오후 9시 할인·인기 베스트 상품 지속 모니터";
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
  buildVariantIndex();
  DEFAULTS = defaultVariantIds();
  if (typeof buildMarketIndex === "function") buildMarketIndex(state.data.products, state.data.categories);
  if (typeof initPushUI === "function") initPushUI();
  if (typeof initPush === "function") initPush();
  state.rankPart = state.rankPart || "zero";
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
  if (box) box.innerHTML = `<div class="empty"><p>상품 정보를 불러오지 못했어요. 잠시 후 다시 시도해 주세요.</p></div>`;
  console.error(err);
});
