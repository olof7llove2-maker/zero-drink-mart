/* 띠니 v5 — 5대 카테고리 · 옵션 묶음 · 미니 가격그래프
   데이터: js/products.js (PRODUCTS · PARTS · CATEGORIES …), data/price-history.json */
const won = (n) => Number(n).toLocaleString("ko-KR") + "원";
const $ = (id) => document.getElementById(id);
const SHARE_BASE = "https://ttini.kr";

/* r57 — 이모지 대신 라인 SVG 아이콘(토스 톤). 색은 CSS가 currentColor로 정합니다. */
const TAB_ICONS = {
  home: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M4 10.5 12 4l8 6.5V19a1.5 1.5 0 0 1-1.5 1.5h-13A1.5 1.5 0 0 1 4 19z"></path><path d="M9.5 20.5v-6h5v6"></path></svg>',
  category: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><rect x="3.5" y="3.5" width="7" height="7" rx="1.8"></rect><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"></rect><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"></rect><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"></rect></svg>',
  search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><circle cx="11" cy="11" r="6.6"></circle><path d="m16.2 16.2 4.3 4.3"></path></svg>',
  ranking: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false"><path d="M5 20V13"></path><path d="M12 20V4.5"></path><path d="M19 20v-9.5"></path></svg>',
};
const TABS = [
  { id: "home", label: "홈", icon: TAB_ICONS.home },
  { id: "category", label: "카테고리", icon: TAB_ICONS.category },
  { id: "search", label: "검색", icon: TAB_ICONS.search },
  { id: "ranking", label: "랭킹", icon: TAB_ICONS.ranking },
];
/* r55 — '핫딜' 탭 제거(재영 님 2026-11-19: "핫딜칸은 걍없애도 되겟어").
   홈 최상단 '🔥 오늘의 역대급 할인'과 역할이 겹쳐서 없앴고, 예전 주소(?tab=hotdeal)는 홈으로 보냅니다. */
const LEGACY_TABS = { hotdeal: "home" };

/* 카테고리 탭 대표 사진 — 재영 님이 고른 대표 상품 */
const PART_TILES = [
  { part: "zero", label: "제로음료·생수", emoji: "🥤", sub: "펩시·나랑드·초정·생수", image: "images/toss-pepsi-jero-syugeo-raimhyang-355ml-24gae.jpeg" },
  { part: "protein", label: "단백질 쉐이크·음료", emoji: "💪", sub: "더단백·셀렉스·하이뮨·뉴욕웨이", image: "images/deodanbaek-deuringkeu-choko-250ml-18gae.jpg" },
  { part: "chicken", label: "닭가슴살·안심", emoji: "🍗", sub: "하림·한강·더바른닭", image: "images/meat-chicken-harim-jayeonsilrok-breast-400g.jpg" },
  { part: "meat", label: "소·돼지고기", emoji: "🥩", sub: "부채살·삼겹·목살·대패", image: "images/meat-beef-au-buchaesal-steak-600g.jpg" },
];

/* r58 — 정렬은 소비자가 실제로 고르는 5기준으로 정리(재영 님 2026-11-19).
   기본은 '할인율 높은 순' — 열자마자 특가가 먼저 보이게.
   화면에는 짧은 이름(할인순 ▾)만 두고, 누르면 아래 시트에서 긴 설명과 함께 고릅니다. */
const SORT_OPTIONS = [
  { id: "discount", label: "할인율 높은 순", short: "할인순", desc: "정가에서 많이 빠진 순" },
  { id: "popular", label: "인기·리뷰 많은 순", short: "인기순", desc: "리뷰·구매가 많은 순" },
  { id: "basis", label: "단가 낮은 순 (100ml·g)", short: "단가순", desc: "100ml·g당 가격이 싼 순" },
  { id: "price", label: "가격 낮은 순", short: "가격순", desc: "한 번에 내는 금액이 적은 순" },
  { id: "recent", label: "방금·최근 확인 순", short: "확인순", desc: "가격을 최근에 확인한 순" },
];
function sortOptionOf(id) {
  return SORT_OPTIONS.find((o) => o.id === id) || SORT_OPTIONS[0];
}
const SORT_IDS = new Set(SORT_OPTIONS.map((s) => s.id));

/* r55 — 홈 '🟢 지금 사기 좋아요' 기본 노출 개수(모바일 2열 4줄 · 데스크톱 4열 2줄) */
const HOME_LIMIT = 8;
/* r55 — 홈 첫 진입 기본 정렬 */
const HOME_DEFAULT_SORT = "discount";

const state = {
  data: null,
  priceHistory: null,
  priceMeta: null,
  low: {},
  vgroups: {},
  tab: "home",
  part: "all",
  filter: "all",
  filters: [], /* r39 — 종류 다중 선택(소고기+닭고기처럼 여러 개를 함께) */
  stores: [], /* r39 — 보관 다중 선택(냉장·냉동) */
  pick: "", /* r39 — 빠른 필터: "" | "good"(지금 사기 좋아요) | "wow"(역대급) */
  sources: { coupang: true, toss: true },
  sort: "popular",
  goal: "all",
  homeCat: "all", /* r53 — 홈 맨 위 카테고리 버튼 선택값 */
  rankMode: "popular", /* r55 — 랭킹 기준: "popular"(인기·구매 순) | "discount"(할인율 순) */
  catStore: "", /* r55 — 카테고리 탭 판매처 모아보기: "" | "coupang" | "toss" | "naver" */
  query: "",
  highlightId: null,
  limit: { home: 8, category: 30, hotdeal: 30 },
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
function selectedFilters() {
  const list = partFilters();
  return (state.filters || []).map((id) => list.find((f) => f.id === id)).filter(Boolean);
}
function matchesFilter(p, f) {
  if (!f) return true;
  const cats = f.cats || [];
  if (cats.length && !cats.includes(p.category)) return false;
  return true;
}

/* r39 — 보관 구분: 상품에 적힌 '냉장·냉동' 표기만 근거로 삼습니다(추측해서 채우지 않음). */
function storageOf(p) {
  const t = `${p.kind || ""} ${p.name || ""} ${p.cutGroup || ""}`;
  if (/냉동|IQF|개별동결|급속동결/.test(t)) return "frozen";
  if (/냉장/.test(t)) return "chilled";
  return "";
}

/* 목록 필터 한곳에 모음: 종류(선택한 것 중 하나라도 맞으면) + 보관(선택한 것 중 하나라도 맞으면) */
function matchesListFilters(p) {
  if (!matchesCategoryFilters(p)) return false;
  const stores = state.stores || [];
  if (stores.length && stores.indexOf(storageOf(p)) < 0) return false;
  return true;
}
function matchesCategoryFilters(p) {
  const sel = selectedFilters();
  return !sel.length || sel.some((f) => matchesFilter(p, f));
}

/* r39 — 빠른 필터: 판정(judgeOf) 하나만 근거로 씁니다 */
function matchesPick(p) {
  if (!state.pick) return true;
  const j = typeof judgeOf === "function" ? judgeOf(p) : null;
  if (!j || !j.tier || j.tier.id === "none") return false;
  const badge = typeof verdictBadgeOf === "function" ? verdictBadgeOf(j) : null;
  if (state.pick === "good") return badge ? badge.id === "good" : j.tier.id === "good";
  if (state.pick === "wow") return badge ? badge.id === "best" : !!j.badge && j.badge.id === "역대급";
  return true;
}

function setFilters(ids) {
  const valid = partFilters().filter((f) => f.id !== "all").map((f) => f.id);
  state.filters = (ids || []).filter((id, i, arr) => valid.includes(id) && arr.indexOf(id) === i);
  state.filter = state.filters[0] || "all"; /* 예전 코드 호환용 대표값 */
}
function clearFilters() {
  state.filters = [];
  state.filter = "all";
  state.stores = [];
}

/* ── 단가 · 영양 ──────────────────────────────────────── */

const MEASURE_LABEL = { per100ml: "100ml당", per100g: "100g당", each: "개당" };

function isMeat(p) {
  return partOf(p) === "meat" || partOf(p) === "chicken";
}
function isGadget(p) {
  return p.category === "gadget";
}
function measureKind(p) {
  if (p.measure) return p.measure;
  if (isGadget(p)) return "each";
  if (p.category === "shake" || p.category === "breast" || p.category === "tenderloin" || p.container === "powder") return "per100g";
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

/* 단백질 1g당 가격 — 단백질 음료·두유·쉐이크 카드에서 한눈에 보이게 */
function proteinUnitHTML(p, view) {
  if (partOf(p) !== "protein") return "";
  const g = proteinValue(p);
  if (!g || g <= 0) return "";
  const each = view && typeof view.eachPrice === "number" ? view.eachPrice : p.eachPrice;
  const per1 = each ? Math.round(each / g) : proteinPerG(p);
  if (!per1) return "";
  const p20 = protein20(p);
  return `<p class="pc-prot"><span class="pc-prot-k">단백질 1g당</span> <b>${won(per1)}</b>${
    p20 ? `<span class="pc-prot-sub">20g당 ${won(p20)}</span>` : ""
  }</p>`;
}

/* r59 — '단백질 20g당 가격'을 고기·단백질 음료·쉐이크에서 같은 규칙으로.
   계산 근거는 화면에 보이는 가격(카드 대표가·네이버가)과 100g당 단백질(또는 1병 단백질)을 씁니다.
   함량을 모르는 상품(우삼겹·뒷고기·계란 등)은 값을 만들지 않고 표시도 하지 않습니다. */
function protein20Info(p, view) {
  if (!p || isGadget(p)) return null;
  const kind = measureKind(p);
  if (kind === "each") return null;
  const g100 = typeof p.proteinPer100g === "number" && p.proteinPer100g > 0 ? p.proteinPer100g : null;
  const per = view && typeof view.perValue === "number" ? view.perValue : measureValue(p);
  if (kind === "per100g" && g100 && per != null) {
    return {
      value: Math.round((per * 20) / g100),
      note: p.nutritionBasis === "부위 기준 참고치" ? "부위 기준 참고치" : "",
    };
  }
  const gb = proteinValue(p);
  const each = view && typeof view.eachPrice === "number" ? view.eachPrice : p.eachPrice;
  if (gb && gb > 0 && each) {
    return { value: Math.round((each / gb) * 20), note: "" };
  }
  const stored = protein20(p);
  if (stored != null) return { value: stored, note: "" };
  return null;
}

/* ── 확인 시각 신선도 (48시간 룰 · 내부용) ──────────────
   재영 님(2026-11-19): "아니면 아싸리 48시간 지남을 없애거나"
   → '48시간+ 전 확인' 배지는 화면에서 없애고, 이 계산은 정기 점검용으로만 남깁니다. */
const STALE_HOURS = 48;

function checkedAtMs(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})(?:[ T](\d{2}):(\d{2}))?/.exec(String(value || ""));
  if (!m) return null;
  /* 상품 확인 시각은 한국 시간(KST)으로 적혀 있어요 */
  return Date.UTC(+m[1], +m[2] - 1, +m[3], m[4] ? +m[4] : 0, m[5] ? +m[5] : 0) - 9 * 60 * 60 * 1000;
}
function shortStamp(ts) {
  const m = /^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})/.exec(String(ts || ""));
  return m ? `${Number(m[2])}/${Number(m[3])} ${m[4]}:${m[5]}` : String(ts || "");
}
function staleInfoOf(p) {
  const t = checkedAtMs(p && p.priceCheckedAt);
  if (!t) return null;
  const hours = Math.floor((Date.now() - t) / 3600000);
  const stale = hours >= STALE_HOURS;
  return {
    hours,
    stale,
    label: stale ? `48시간+ 전 확인(${shortStamp(p.priceCheckedAt)})` : `${shortStamp(p.priceCheckedAt)} 확인`,
    short: stale ? "48시간+ 전 확인" : `${shortStamp(p.priceCheckedAt)} 확인`,
  };
}
/* 오래된 확인값 배지는 화면에서 쓰지 않습니다(2026-11-19 재영 님). */
function staleBadgeHTML() {
  return "";
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
  const stroke = down ? "#16a34a" : "#f04438";
  return `<svg class="spark-svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="none" role="img" aria-label="60일 가격 추이">
    <path d="${area}" fill="${down ? "rgba(52,211,153,0.14)" : "rgba(255,107,107,0.12)"}"/>
    <path d="${line}" fill="none" stroke="${stroke}" stroke-width="1.6" stroke-linejoin="round" stroke-linecap="round"/>
    <circle cx="${x(series.length - 1).toFixed(1)}" cy="${y(last.price).toFixed(1)}" r="2.2" fill="${stroke}"/>
    <circle cx="${x(lowIdx).toFixed(1)}" cy="${y(vals[lowIdx]).toFixed(1)}" r="1.8" fill="#1c1917" opacity="0.7"/>
  </svg>`;
}

function sparkBlock(p) {
  const svg = sparkSVG(p);
  if (!svg) {
    /* 기록이 없으면 배지를 띄우지 않고, 2~13일 쌓인 상품만 '기록 N일'로 작게 알려 줍니다 */
    const info = historyOf(p);
    const days = info && info.days ? Number(info.days) : 0;
    if (days >= 2 && days < 14) {
      return `<div class="spark is-none" title="가격 기록 ${days}일째 쌓는 중이에요"><span>기록 ${days}일</span></div>`;
    }
    return "";
  }
  const info = historyOf(p);
  return `<div class="spark">${svg}<span class="spark-cap">60일 관측 최저 ${won(info.min)}</span></div>`;
}

/* 핫딜 카드용 — 60일 최저와 보통가를 숫자만으로 (그래프 없이)
   재영 님(2026-11-18): "그래프 보다 그냥 숫자로 얘기해주는게 나을거같아. 60일중 최저가 보통가 뭐 이런식으로"
   - 보통가 = 이 상품 관측 가격의 중간값(화면 판정과 같은 값, 14일·5회 이상만)
   - 14일이 안 됐으면 오해 없이 '기록 N일 · 현재 X원' 한 줄만 */
function dealNumBlock(p) {
  const info = historyOf(p) || {};
  const days = Number(info.days) || 0;
  const observations = Number(info.observations) || 0;
  const min = Number.isFinite(info.min) ? info.min : null;
  const prices = (info.series || [])
    .map((s) => (s ? Number(s.price) : null))
    .filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0);
  const typical = prices.length && typeof medianOf === "function" ? Math.round(medianOf(prices)) : null;
  const enough = days >= 14 && observations >= 5 && Number.isFinite(typical);
  if (enough && min != null) {
    return `<div class="pnum" title="60일 관측 ${days}일·${observations}회 기록">
      <div class="pnum-c"><span class="pnum-k">60일 최저</span><b class="pnum-v is-low">${won(min)}</b></div>
      <div class="pnum-c"><span class="pnum-k">보통</span><b class="pnum-v">${won(typical)}</b></div>
    </div>`;
  }
  if (days >= 2) {
    /* 기록이 짧으면 '현재'는 바로 위 가격과 겹치므로, 그동안의 최저가를 보여 줍니다.
       기록 1일이면 최저=현재가라 빈 줄만 되살리므로 띄우지 않습니다. */
    const shown = min != null ? min : typeof p.price === "number" && Number.isFinite(p.price) ? p.price : null;
    if (shown != null) {
      return `<div class="pnum pnum-few" title="60일 기록 ${days}일째 쌓는 중이에요">
        <span class="pnum-k">기록 ${days}일</span><b class="pnum-v">최저 ${won(shown)}</b></div>`;
    }
  }
  return "";
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

/* 플랫폼 4색: 쿠팡=레드 · 토스=파랑 · 네이버=초록 · 카톡 톡딜=카카오 옐로 */
const PLATFORMS = {
  coupang: { label: "쿠팡", mark: "❤️", cls: "is-coupang" },
  toss: { label: "토스", mark: "💙", cls: "is-toss" },
  naver: { label: "네이버", mark: "💚", cls: "is-naver" },
  talkdeal: { label: "카톡 톡딜", mark: "💛", cls: "is-talkdeal", buyLabel: "톡딜에서 사기" },
};
function platformOf(p) {
  if (p.platform === "talkdeal") return "talkdeal";
  if (p.platform === "toss") return "toss";
  if (p.platform === "naver") return "naver";
  return "coupang";
}
function isToss(p) {
  return p.platform === "toss";
}
/* 네이버 비교가(배송비 포함)가 붙은 카드만 초록 버튼을 같이 띄운다 */
function naverAlt(p) {
  const a = p.altPrice;
  return a && a.source === "naver" && typeof a.price === "number" && a.url ? a : null;
}
/* 네이버 가격이 같은 구성(수량)인지 — 수량이 다르면 대표가·절약 비교에는 쓰지 않는다 */
function samePack(p, nv) {
  if (!nv || !nv.packCount || !p.packCount) return true;
  return Number(nv.packCount) === Number(p.packCount);
}
function nvPackLabel(nv) {
  return nv.packLabel || `${nv.packCount}개`;
}
/* 네이버 실구매가 = 상품가 + 배송비(있으면) */
function nvCost(nv) {
  return Number(nv.price) + (Number(nv.shippingExtra) || 0);
}
/* 카드에 노출할 구매 버튼 — 같은 상품이면 플랫폼별 버튼을 싼 순서로 나란히 */
function buyOptions(p) {
  const out = [];
  if (p.affiliateUrl) out.push({ key: platformOf(p), price: p.price, url: p.affiliateUrl });
  const nv = naverAlt(p);
  if (nv) out.push({ key: "naver", price: nv.price, url: nv.url, cost: nvCost(nv) });
  return out.sort((a, b) => (a.cost || a.price) - (b.cost || b.price) || (a.key === "naver" ? 1 : -1));
}
/* 카드 대표 가격 = 지금 제일 싼 플랫폼 가격 */
function cheapView(p) {
  const nv = naverAlt(p);
  if (nv && samePack(p, nv) && nvCost(nv) < p.price) {
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
  /* 네이버 비교가·카톡 톡딜은 쿠팡/토스 출처 토글과 무관하게 항상 보여 준다 */
  if (k === "naver" || k === "talkdeal") return true;
  return state.sources.coupang;
}
function normText(s) {
  return String(s == null ? "" : s).toLowerCase().replace(/[\s()\[\]{},·\-–—/]+/g, "");
}

/* r59 — 추천 검색어는 사람 말이고 상품명은 브랜드 말이라, 둘을 이어 주는 별칭.
   예) '제로콜라'로 검색해도 '코카콜라 제로'·'펩시 제로'가 나오도록. */
const SEARCH_ALIASES = {
  "제로콜라": ["제로콜라", "콜라 제로", "코카콜라 제로", "펩시 제로", "맥콜 제로", "부르르콜라 제로"],
  "콜라": ["콜라"],
  "프로틴": ["프로틴", "단백질"],
  "단백질": ["단백질", "프로틴"],
  "애사비": ["애사비", "애플 사이다", "사과식초"],
  "생수": ["생수"],
  "햇반": ["햇반"],
};

function aliasMatches(hay, phrase) {
  const parts = String(phrase)
    .toLowerCase()
    .split(/\s+/)
    .map(normText)
    .filter(Boolean);
  return parts.length > 0 && parts.every((t) => hay.includes(t));
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
  if (tokens.every((t) => hay.includes(t))) return true;
  const raw = String(state.query || "").trim();
  const aliases = SEARCH_ALIASES[raw] || SEARCH_ALIASES[raw.replace(/\s+/g, "")];
  if (aliases) return aliases.some((phrase) => aliasMatches(hay, phrase));
  return false;
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
  if (key === "recent") return checkedAtMs(p.priceCheckedAt);
  if (key === "low") {
    const s = lowStats(p);
    if (s.state === "low" || s.state === "near" || s.state === "above") return s.pct;
    return null;
  }
  return null;
}
function sortList(list, key) {
  const k = key || state.sort;
  const desc = k === "popular" || k === "discount" || k === "recent";
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
  return `<span class="pc-off">-${p.discountPct}%</span>`;
}

/* r57 — 카드·모달에 쓰는 '실제 확인 시점' 표기 (A1).
   상품마다 확인 시각이 다르므로 오늘/1일 전/3일 전으로 정직하게 적습니다. */
function freshLabelOf(p) {
  const t = checkedAtMs(p && p.priceCheckedAt);
  if (!t) return null;
  const diff = Math.max(0, Date.now() - t);
  const days = Math.floor(diff / 86400000);
  const hours = Math.floor(diff / 3600000);
  let text;
  if (days <= 0) text = hours <= 0 ? "방금 확인" : "오늘 확인";
  else if (days === 1) text = "1일 전 확인";
  else text = `${days}일 전 확인`;
  return { text, days, stale: days >= 3, full: shortStamp(p.priceCheckedAt) };
}

function unitLine(p, view) {
  const v = view && typeof view.perValue === "number" ? view.perValue : measureValue(p);
  if (v == null) return "";
  const kind = measureKind(p);
  const eachVal = view && typeof view.eachPrice === "number" ? view.eachPrice : p.eachPrice;
  const each =
    kind !== "each" && eachVal
      ? `<span class="pc-each"> · 1${escapeHtml(p.eachLabel || "개")}당 <b>${won(Math.round(eachVal))}</b></span>`
      : "";
  return `<p class="pc-unit"><b>${won(Math.round(v))}</b><span class="per">/${measureLabel(p).replace("당", "")}</span>${each}</p>${protein20Line(p, view)}`;
}

/* r59 — 단가 바로 아래 한 줄. 고기·단백질 음료·쉐이크가 같은 자리·같은 문구로 보입니다. */
function protein20Line(p, view) {
  const info = protein20Info(p, view);
  if (!info) return "";
  return `<p class="pc-prot20">단백질 20g당 <b>${won(info.value)}</b>${
    info.note ? `<span class="pc-prot20-n">부위 기준</span>` : ""
  }</p>`;
}

/* 상세 시트 상단용 — '100g당 · 단백질 20g당'을 한 줄로 */
function unitSummaryHTML(p) {
  const v = measureValue(p);
  const bits = [];
  if (v != null) {
    bits.push(`<span><b>${won(Math.round(v))}</b>/${measureLabel(p).replace("당", "")}</span>`);
  }
  const info = protein20Info(p, null);
  if (info) {
    bits.push(
      `<span class="pm-unit-p20">단백질 20g당 <b>${won(info.value)}</b>${
        info.note ? `<em>${escapeHtml(info.note)}</em>` : ""
      }</span>`
    );
  }
  if (!bits.length) return "";
  return `<p class="pm-units">${bits.join('<span class="pm-unit-sep">·</span>')}</p>`;
}

/* r57 — 기간 한정 특가(톡딜·타임세일) 마감 시각 */
function dealEndBadge(p) {
  if (!p || !p.dealEndsAt) return "";
  const t = new Date(p.dealEndsAt);
  if (Number.isNaN(t.getTime()) || t.getTime() <= Date.now()) return "";
  const mm = t.getMonth() + 1;
  const dd = t.getDate();
  const hh = String(t.getHours()).padStart(2, "0");
  const mi = String(t.getMinutes()).padStart(2, "0");
  return `<span class="bd bd-deal">${mm}/${dd} ${hh}:${mi}까지</span>`;
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

/* 구매 버튼 — 판매처 고유색 유지, 높이·모서리 통일(r57).
   카드에서는 가장 싼 한 곳만 크게, 상세 모달에서는 판매처 전부를 같은 크기로 보여 줍니다. */
function buyHTML(p, opts = {}) {
  const all = buyOptions(p);
  if (!all.length) return `<span class="pending-label">링크 준비 중</span>`;
  const cardMode = !!opts.card;
  const list = cardMode ? all.slice(0, 1) : all;
  const rest = all.length - list.length;
  return `<div class="pc-buys${list.length > 1 ? " is-multi" : ""}">${list
    .map((o) => {
      const meta = PLATFORMS[o.key];
      const label = cardMode
        ? `<span class="buy-lab">${meta.label} ${Number(o.price).toLocaleString("ko-KR")}원</span>`
        : `<span class="bp-lab">${meta.label}</span><span class="bp-price">${Number(o.price).toLocaleString(
            "ko-KR"
          )}원</span>`;
      return `<a class="btn-buy ${meta.cls}" href="${escapeHtml(o.url)}" target="_blank" rel="noopener noreferrer" data-click-pid="${escapeHtml(
        p.id
      )}" data-click-plat="${o.key}" aria-label="${meta.label}에서 사기 ${won(o.price)}">${label}</a>`;
    })
    .join("")}${cardMode && rest > 0 ? `<span class="buy-more">${rest}곳 더</span>` : ""}</div>`;
}

/* r57 — 토스 톤 카드: 사진 · 브랜드 · 상품명(2줄) · 가격 · 단가 · 배지 하나 · 확인 시점 · 구매 버튼.
   제목·가격을 누르면 상세 모달이 열리고, 알림은 상세 모달 안의 큰 버튼으로 옮겼습니다. */
function cardEl(p, opts = {}) {
  const el = document.createElement("article");
  el.className = "pc" + (opts.rank ? " is-rank" : "");
  el.dataset.id = p.id;
  el.__opts = opts;
  const view = cheapView(p);
  const rank = opts.rank ? `<span class="pc-rank${opts.rank <= 3 ? " is-top" : ""}">${opts.rank}</span>` : "";
  const photo = p.image
    ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async">`
    : `<span class="photo-blank">사진 준비 중</span>`;
  const was = p.listPrice && p.listPrice > p.price ? `<s class="was">${won(p.listPrice)}</s>` : "";
  const nvTag = view.platform === "naver" ? `<span class="pc-nvtag">네이버</span>` : "";
  const pill = typeof signalPillHTML === "function" ? signalPillHTML(p) : "";
  const deal = dealEndBadge(p);
  const fresh = freshLabelOf(p);
  const freshHTML = fresh
    ? `<span class="fresh${fresh.stale ? " is-stale" : ""}" title="${escapeHtml(fresh.full)} 확인">${fresh.text}</span>`
    : "";
  const label = `${p.name} 상세 보기`;
  el.innerHTML = `
    ${rank}
    <button type="button" class="pc-photo" data-chart="${escapeHtml(p.id)}" aria-label="${escapeHtml(label)}">${photo}</button>
    <div class="pc-body">
      <p class="pc-top"><span class="pc-brand">${escapeHtml(p.brand || categoryLabel(p.category))}</span>${freshHTML}</p>
      <div class="pc-main" data-chart="${escapeHtml(p.id)}" role="button" tabindex="0" aria-label="${escapeHtml(label)}">
        <h3 class="pc-name">${escapeHtml(p.name)}</h3>
        <div class="pc-price">${offBadge(p)}<strong>${won(view.price)}</strong>${was}${nvTag}</div>
        ${unitLine(p, view)}
        <p class="pc-flag">${pill}${deal}</p>
      </div>
      ${optionRow(p)}
      <div class="pc-acts">${buyHTML(p, { card: true })}${
        typeof mehBtnHTML === "function" ? mehBtnHTML(p) : ""
      }</div>
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
    popular: "인기·리뷰 많은 순",
    basis: "단가 낮은 순",
    discount: "할인율 높은 순",
    low: "저점 가까운 순",
    price: "가격 낮은 순",
    recent: "방금·최근 확인 순",
  };
  return map[state.sort] || "";
}

/* ── 컨트롤 (한 줄 칩) ────────────────────────────────── */

/* ── 컨트롤 (r58 — 왼쪽 상태 칩 2개 + 오른쪽 작은 '할인순 ▾' 정렬 버튼 한 줄) ──
   재영 님(2026-11-19): "큰 회색 셀렉트 박스는 없애고 터치감 좋은 한 줄 UI로",
   "전체 특가 옆 알림은 개뜬금없어" — 알림은 헤더 오른쪽으로 옮겼습니다. */
function ctlBarHTML(extra = "") {
  const goalOn = state.tab === "home" && state.goal && state.goal !== "all";
  const cur = sortOptionOf(goalOn ? "popular" : state.sort);
  return `<div class="ctlbar">
      <div class="ctl-picks">${pickChipsHTML()}</div>
      <button type="button" class="ctl-sortbtn" data-sortopen aria-haspopup="dialog" aria-label="정렬 방식 바꾸기 (지금 ${escapeHtml(
        cur.label
      )})"><span>${escapeHtml(cur.short)}</span><i aria-hidden="true">▾</i></button>
      ${extra}
    </div>`;
}

/* r39 — 목록 필터 맨 앞의 빠른 필터 칩 두 개(하나만 켜지는 토글)
   r54 — 순서를 '역대급 → 지금 사기 좋아요'로 바꾸고 두 개만 남깁니다.
   r58 — 배지와 같은 3단계 말투로 맞춥니다: 🔥 역대 최저 / 🟢 지금 사기 좋아요 */
function pickChipsHTML() {
  const mk = (id, label, cls) => {
    const on = state.pick === id;
    return `<button type="button" class="cchip ${cls}${on ? " is-on" : ""}" data-pick="${id}" aria-pressed="${on}">${label}</button>`;
  };
  return mk("wow", "🔥 역대 최저", "is-wow") + mk("good", "🟢 지금 사기 좋아요", "is-good");
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

/* r55 — 여러 상품 ID를 적힌 순서대로 목록 맨 앞에 세웁니다(없는 ID는 건너뜀). */
function pinListFirst(list, ids) {
  if (!ids || !ids.length) return list;
  const front = [];
  const rest = list.slice();
  ids.forEach((id) => {
    const i = rest.findIndex((p) => p.id === id);
    if (i >= 0) front.push(rest.splice(i, 1)[0]);
  });
  return front.concat(rest);
}

/* ── 🔥 오늘의 역대급 할인 (가로 스와이프) ─────────────── */

/* 스포트라이트 제외 브랜드 — 재영 님: "링티는 빼줘" */
function isSpotlightOut(p) {
  return (
    /링티/.test(String(p.brand || "")) ||
    /링티/.test(String(p.name || "")) ||
    String(p.id || "").startsWith("ringti-")
  );
}

/* 아는 브랜드 — 재영 님(2026-11-18): "인지도 있거나 남자가 봤을 때 헉 하는 제품들 순으로"
   HERO는 운동하는 사람이 바로 알아보는 단백질 주력, KNOWN은 그 밖의 대표 브랜드·부위입니다. */
const SPOT_HERO_BRANDS = ["더단백", "테이크핏", "셀렉스", "뉴욕웨이", "신타", "옵티멈", "칼로바이"];
const SPOT_KNOWN_BRANDS = SPOT_HERO_BRANDS.concat([
  "하이뮨", "닥터유", "마이프로틴", "잇더핏", "플라이밀", "밀잇", "곰곰", "햇반", "스팸", "비비고", "오뚜기", "동원",
  "하림", "풀토래", "한돈", "미트팜", "대패킹", "도드람", "더바른닭", "한강식품", "목우촌", "다향", "사조원", "케이원푸드",
  "매일두유", "뉴케어", "아몬드브리즈", "연세두유", "베지밀", "미트리", "부채살", "삼겹살", "닭가슴살", "펩시",
]);

/* 레일 구성 — 재영 님(2026-11-18): "너무 단백질쉐이크만 보이니까 1번은 인지도·단백질,
   그 다음엔 핫딜 먼저 보이되 식단고기·제로음료·간편식·단백질음료가 섞이게."
   → 단백질 2 + 식단 고기 2 + 제로 음료 1 + 간편식 1.
   window는 '매일 섞을 상위 후보 수'입니다. 창 안에서만 섞어 품질을 지킵니다. */
const SPOT_GROUPS = [
  { id: "protein", parts: ["protein"], quota: 2, window: 7 },
  { id: "meat", parts: ["meat"], quota: 2, window: 5 },
  { id: "chicken", parts: ["chicken"], quota: 1, window: 4 },
  { id: "zero", parts: ["zero"], quota: 1, window: 6 },
];

/* KST 오늘 날짜 — 로테이션 시드 (YYYY-MM-DD) */
function spotDayKey(date) {
  const d = date || new Date();
  try {
    return new Intl.DateTimeFormat("en-CA", {
      timeZone: "Asia/Seoul",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).format(d);
  } catch (err) {
    const t = new Date(d.getTime() + 9 * 3600 * 1000);
    return t.toISOString().slice(0, 10);
  }
}

/* 날짜+상품ID 해시 → 0~1. 하루 동안은 값이 같고 날짜가 바뀌면 달라집니다. */
function spotHash(key) {
  const s = String(key);
  let h = 2166136261;
  for (let i = 0; i < s.length; i += 1) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 16777619) >>> 0;
  }
  return h / 4294967295;
}

function spotDayGap(fromKey, toKey) {
  const a = Date.parse(`${fromKey}T00:00:00+09:00`);
  const b = Date.parse(`${toKey}T00:00:00+09:00`);
  if (!Number.isFinite(a) || !Number.isFinite(b)) return null;
  return Math.round((b - a) / 86400000);
}

/* 인지도 0~1 — popularScore + 아는 브랜드 + 리뷰 수 */
function spotAwareness(p) {
  const score = typeof p.popularScore === "number" ? p.popularScore : 40;
  let v = Math.max(0, Math.min(1, (score - 40) / 62)) * 0.55;
  const text = `${p.brand || ""} ${p.name || ""}`;
  if (SPOT_HERO_BRANDS.some((k) => text.includes(k))) v += 0.45;
  else if (SPOT_KNOWN_BRANDS.some((k) => text.includes(k))) v += 0.3;
  const reviews = Number(p.reviewCount);
  if (Number.isFinite(reviews) && reviews > 0) v += Math.min(1, Math.log10(reviews + 1) / 5) * 0.15;
  return Math.max(0, Math.min(1, v));
}

/* 최근 관측 가격 인하 — 하루 단위 관측 기록의 마지막 두 점 비교
   40% 넘는 급락은 옵션·묶음 구성이 바뀐 값일 수 있어 '인하'로 세지 않습니다. */
function spotDropOf(p, dayKey) {
  const series = dailySeries(p);
  if (series.length < 2 || typeof p.price !== "number") return null;
  const last = series[series.length - 1];
  const prev = series[series.length - 2];
  if (!(last.price < prev.price)) return null;
  const pct = ((prev.price - last.price) / prev.price) * 100;
  if (pct < 1.5 || pct > 40) return null;
  const days = spotDayGap(String(last.date).slice(0, 10), dayKey);
  if (days == null || days < 0 || days > 6) return null;
  return { days, pct: Math.round(pct * 10) / 10, date: last.date };
}

/* 상품 하나의 오늘 점수 — 인지도·카테고리·실제 가격 메리트·신선도 */
function spotMerit(p, dayKey) {
  if (isSpotlightOut(p)) return null;
  if (!String(p.brand || "").trim()) return null; /* 이름 없는 상품은 '인지도'가 없어 뺍니다 */
  if (!p.image || !p.affiliateUrl || typeof p.price !== "number") return null;
  const aware = spotAwareness(p);
  if (aware < 0.5) return null; /* 웬만큼 알려진 상품만 후보 */
  const low = lowStats(p);
  const drop = spotDropOf(p, dayKey);
  const disc = Math.max(0, Math.min(1, (Number(p.discountPct) || 0) / 60));
  if (!disc && !drop && low.state !== "low" && low.state !== "near") return null;
  const lowV = low.state === "low" ? 1 : low.state === "near" ? 0.55 : low.state === "above" ? 0.12 : 0.2;
  const fresh = drop ? (drop.days <= 0 ? 1 : drop.days <= 2 ? 0.8 : 0.6) : 0;
  const since = discountSince(p);
  const age = since ? (since.days <= 3 ? 1 : since.days <= 10 ? 0.6 : 0.3) : 0.3;
  const judge = typeof judgeOf === "function" ? judgeOf(p) : null;
  const good = judge && judge.tier ? (judge.tier.id === "good" ? 1 : judge.tier.id === "mid" ? 0.5 : 0.15) : 0.4;
  let wow = 0;
  if (p.category === "shake") wow += 0.04; /* 웨이 파우더 큰 통 */
  const g = proteinValue(p);
  if (g != null && g >= 20) wow += 0.04; /* 한 병 단백질 20g 이상 */
  if (/부채살|삼겹|닭가슴살|안심|등심|스테이크/.test(String(p.name || ""))) wow += 0.03;
  const lowBonus = 0.18 * (low.state === "low" || low.state === "near" ? 1 : 0.5);
  return (
    0.28 * aware + 0.16 * disc + 0.12 * lowV + 0.08 * good + 0.1 * fresh + 0.06 * age + lowBonus + wow
  );
}

/* 상품 → 레일 그룹 (단백질 / 식단 고기 / 간편식). 음료·조리기구·소스는 뺍니다. */
function spotGroupOf(p) {
  const part = p.part || "zero";
  if (part === "zero") return "zero";
  if (part === "protein") return "protein";
  if (part === "chicken") return "chicken";
  if (part === "meat") {
    if (p.category === "egg" || p.category === "gadget") return null;
    return "meat";
  }
  return null;
}

function spotBrandKey(p) {
  return String(p.brand || "").trim() || String(p.name || "").slice(0, 8);
}

/* 한 그룹의 오늘 후보 — 점수 높은 순 */
function spotRanked(dayKey, groupId) {
  const rows = [];
  (state.data.products || []).forEach((p) => {
    if (typeof matchesSource === "function" && !matchesSource(p)) return;
    if (spotGroupOf(p) !== groupId) return;
    const m = spotMerit(p, dayKey);
    if (m == null) return;
    rows.push({ p, m });
  });
  rows.sort((a, b) => b.m - a.m || String(a.p.id).localeCompare(String(b.p.id)));
  return rows;
}

/* 오늘의 6개 — 그룹 쿼터(단백질 3·고기 2·간편식 1) 안에서 날짜 시드로 매일 새로 고릅니다.
   상위 후보 창 안에서만 섞기 때문에 엉뚱한 마이너 상품이 1번에 오지 않습니다. */
function spotlightPicks(n) {
  const limit = n || 6;
  const dayKey = spotDayKey();
  const chosen = [];
  SPOT_GROUPS.forEach((group) => {
    const ranked = spotRanked(dayKey, group.id);
    if (!ranked.length) return;
    const window = ranked.slice(0, group.window);
    const rotated = window
      .map((row) => ({ row, k: spotHash(`${row.p.id}|${dayKey}|${group.id}`) }))
      .sort((a, b) => b.k - a.k)
      .map((x) => x.row);
    let got = 0;
    rotated.forEach((row) => {
      if (got >= group.quota || chosen.length >= limit) return;
      if (chosen.some((c) => spotBrandKey(c.p) === spotBrandKey(row.p))) return; /* 같은 브랜드는 하루 한 번 */
      chosen.push(row);
      got += 1;
    });
    if (got < group.quota) {
      ranked.forEach((row) => {
        if (got >= group.quota || chosen.length >= limit) return;
        if (chosen.some((c) => c.p.id === row.p.id || spotBrandKey(c.p) === spotBrandKey(row.p))) return;
        chosen.push(row);
        got += 1;
      });
    }
  });
  if (chosen.length < limit) {
    const rest = [];
    SPOT_GROUPS.forEach((g) => {
      spotRanked(dayKey, g.id).forEach((row) => {
        if (chosen.some((c) => c.p.id === row.p.id)) return;
        rest.push(row);
      });
    });
    rest.sort((a, b) => b.m - a.m);
    rest.forEach((row) => {
      if (chosen.length >= limit) return;
      if (chosen.some((c) => spotBrandKey(c.p) === spotBrandKey(row.p))) return;
      chosen.push(row);
    });
  }
  return spotlightOrder(chosen, dayKey, limit);
}

/* 보이는 순서 — ①1번은 인지도 높은 단백질 대표(음료 쪽 살짝 우대)
   ②2번부터는 오늘 핫딜(메리트 점수) 높은 순서로, 단 같은 카테고리가 연달아 붙지 않게 섞습니다.
   재영 님(2026-11-18): "제일 첫 상품은 인지도·단백질 위주로, 그 다음엔 핫딜 먼저 보이게." */
function spotlightOrder(chosen, dayKey, limit) {
  const left = chosen.slice();
  const groupOf = (row) => spotGroupOf(row.p) || "기타";
  const out = [];

  /* ① 오늘의 대표 — 아는 브랜드 단백질 중 인지도가 가장 높은 1종 */
  let hero = null;
  let heroScore = -1;
  left.forEach((row) => {
    if (groupOf(row) !== "protein") return;
    const s =
      spotAwareness(row.p) +
      (row.p.part === "protein" && row.p.category === "protein" ? 0.06 : 0) /* 큰 통 웨이보다 마시는 단백질 음료를 살짝 앞에 */
      + 0.03 * spotHash(`${row.p.id}|${dayKey}|hero`);
    if (s > heroScore) {
      hero = row;
      heroScore = s;
    }
  });
  /* 단백질 후보가 없으면 그날 메리트 1위로 */
  if (!hero) left.forEach((row) => { if (row.m > heroScore) { hero = row; heroScore = row.m; } });
  if (hero) {
    out.push(hero);
    left.splice(left.indexOf(hero), 1);
  }

  /* ② 나머지 — 핫딜(메리트) 순서대로, 앞 카드와 같은 카테고리는 건너뛰고 고릅니다 */
  left.sort((a, b) => b.m - a.m);
  let prev = hero ? groupOf(hero) : "";
  while (left.length && out.length < limit) {
    const pick = left.find((row) => groupOf(row) !== prev) || left[0];
    out.push(pick);
    left.splice(left.indexOf(pick), 1);
    prev = groupOf(pick);
  }
  return out.map((row) => row.p).slice(0, limit);
}

/* ── 홈 그리드 🏆 1위 ────────────────────────────────
   재영 님(2026-11-18): "각 분야별 인지도 3위 내에 있는 것들 중 오늘 제일 나은 걸 1위로."
   분야 = 단백질 음료·쉐이크 / 식단 고기 / 제로 음료 / 치팅·간편식.
   분야마다 인지도 상위 3종만 후보로 두고, 그중 오늘 메리트(할인·저점·인하)가 가장 높은 1종이
   기본 '인기·할인 순' 홈 그리드 첫 칸(🏆 1위)에 옵니다. 날짜 시드로 매일 바뀝니다. */
const HOME_FIELDS = [
  { id: "protein", parts: ["protein"] },
  { id: "chicken", parts: ["chicken"] },
  { id: "meat", parts: ["meat"] },
  { id: "zero", parts: ["zero"] },
];
const HOME_FIELD_TOP = 3;

function homeFieldOf(p) {
  const part = p.part || "zero";
  const f = HOME_FIELDS.find((x) => x.parts.indexOf(part) >= 0);
  return f ? f.id : "";
}

/* 한 분야의 '인지도 3위 내' 대표 — 사진·제휴링크·가격이 다 있는 상품만 */
function homeFieldTop(fieldId, pool) {
  const rows = pool
    .filter((p) => homeFieldOf(p) === fieldId)
    .filter((p) => p.image && p.affiliateUrl && typeof p.price === "number")
    .map((p) => ({ p, aware: spotAwareness(p) }));
  rows.sort(
    (a, b) =>
      b.aware - a.aware ||
      (Number(b.p.popularScore) || 0) - (Number(a.p.popularScore) || 0) ||
      String(a.p.id).localeCompare(String(b.p.id))
  );
  return rows.slice(0, HOME_FIELD_TOP).map((r) => r.p);
}

/* 오늘의 홈 1위 후보 점수표 — 분야별 인지도 Top 3(최대 12종)를
   spotlightPicks와 같은 잣대(인지도·할인·저점·인하)로 채점하고 날짜 시드로 ±22% 섞습니다. */
function homeChampionRows(dayKey) {
  const pool = basePool().filter((p) => !isSpotlightOut(p));
  const rows = [];
  if (!pool.length) return rows;
  HOME_FIELDS.forEach((f) => {
    homeFieldTop(f.id, pool).forEach((p) => {
      const merit = spotMerit(p, dayKey);
      const aware = spotAwareness(p);
      /* 실제 메리트가 있으면 항상 우선, 없으면 그 분야 대표 중 인지도 순 */
      let score = merit != null ? 0.62 + merit : 0.2 * aware;
      score *= 0.78 + 0.44 * spotHash(`${p.id}|${dayKey}|home`);
      rows.push({ p, score, merit, field: f.id });
    });
  });
  rows.sort((a, b) => b.score - a.score || String(a.p.id).localeCompare(String(b.p.id)));
  return rows;
}

/* 어제 날짜 키 (KST) — 바로 전날과 같은 상품이 1위로 반복되는 것을 막는 데 씁니다 */
function spotPrevDayKey(dayKey) {
  const t = Date.parse(`${dayKey}T00:00:00+09:00`);
  if (!Number.isFinite(t)) return "";
  return spotDayKey(new Date(t - 86400000));
}

/* 오늘의 홈 1위 상품 ID — 분야별 Top 3 중 오늘 점수 최고.
   날마다 시드가 바뀌어 1위가 돌아가고, 하루 동안은 같은 상품으로 고정됩니다.
   어제도 같은 상품이 1위였다면 점수가 80% 이상인 다음 후보로 바꿔 이틀 연속 같은 얼굴을 피합니다. */
function homeChampionId() {
  const dayKey = spotDayKey();
  const rows = homeChampionRows(dayKey);
  if (!rows.length) return "";
  const top = rows[0];
  const prevKey = spotPrevDayKey(dayKey);
  const prev = prevKey ? homeChampionRows(prevKey)[0] : null;
  if (prev && prev.p.id === top.p.id) {
    const next = rows.find((r) => r.p.id !== top.p.id && r.score >= top.score * 0.8);
    if (next) return next.p.id;
  }
  return top.p.id;
}

/* 1위 상품이 옵션 묶음 대표로 접혀 사라지면 그 묶음의 대표 ID로 바꿔 잡습니다. */
function homePinTarget(id, list) {
  if (!id) return "";
  if (list.some((p) => p.id === id)) return id;
  const p = (state.data.products || []).find((x) => x.id === id);
  const group = p && p.variantGroup ? state.vgroups[p.variantGroup] : null;
  if (group && group.length > 1) {
    const def = group.find((x) => DEFAULTS.has(x.id));
    if (def && list.some((x) => x.id === def.id)) return def.id;
  }
  return "";
}

/* 카드 상태 태그 — 실제 데이터가 있을 때만 붙입니다 */
function spotTagOf(p, dayKey) {
  const drop = spotDropOf(p, dayKey);
  const low = lowStats(p);
  if (drop && drop.days <= 0) return { text: "오늘 가격↓", cls: "is-fresh" };
  if (low.state === "low") return { text: "60일 관측 최저", cls: "is-low" };
  if (drop) return { text: drop.days <= 2 ? "최근 가격↓" : "이번 주 가격↓", cls: "is-fresh" };
  if (low.state === "near") return { text: "관측 최저 근처", cls: "is-low" };
  const disc = Number(p.discountPct) || 0;
  const score = typeof p.popularScore === "number" ? p.popularScore : 0;
  const g = proteinValue(p);
  if (p.part === "protein" && p.category !== "shake" && g != null && g >= 20) return { text: `고단백 ${g}g`, cls: "is-prot" };
  if (p.part === "protein") {
    if (p.category === "shake" && score >= 85) return { text: "단백질 인기", cls: "is-prot" };
    if (disc >= 50) return { text: "반값 특가", cls: "is-good" };
    return { text: "단백질 인기", cls: "is-prot" };
  }
  if (disc >= 50) return { text: "반값 특가", cls: "is-good" };
  if (disc >= 40) return { text: "핫딜", cls: "is-good" };
  const judge = typeof judgeOf === "function" ? judgeOf(p) : null;
  if (judge && judge.tier && judge.tier.id === "good") return { text: "지금 사기 좋은 가격", cls: "is-good" };
  return { text: "오늘의 특가", cls: "is-prot" };
}

function spotUnitText(p) {
  const v = measureValue(p);
  if (v == null) return "";
  return `${measureLabel(p)} ${won(Math.round(v))}`;
}

function spotCardHTML(p) {
  const view = cheapView(p);
  const srcKey = view.platform || platformOf(p);
  const tag = spotTagOf(p, spotDayKey());
  const off = typeof p.discountPct === "number" && p.discountPct > 0 ? `-${p.discountPct}%` : "특가";
  const was =
    p.listPrice && p.listPrice > view.price
      ? `<s class="spot-was">${won(p.listPrice)}</s>`
      : "";
  const unit = spotUnitText(p);
  const buys = buyOptions(p);
  const multiBuy = buys.length > 1;
  const buyHTML = buys.length
    ? buys
        .map((o) => {
          const m = PLATFORMS[o.key];
          /* 두 군데 이상이면 가격을 같이 적어 어느 쪽이 얼마인지 보이게 */
          const label = multiBuy
            ? `${m.label} ${Number(o.price).toLocaleString("ko-KR")}`
            : m.label;
          return `<a class="spot-buy ${m.cls}${multiBuy ? " is-price" : ""}" href="${escapeHtml(
            o.url
          )}" target="_blank" rel="noopener noreferrer" data-click-pid="${escapeHtml(
            p.id
          )}" data-click-plat="${o.key}" aria-label="${m.label}에서 사기 ${won(o.price)}">${label}</a>`;
        })
        .join("")
    : `<span class="spot-buy is-pending">준비 중</span>`;
  return `<article class="spot-card">
    <div class="spot-tap" data-chart="${escapeHtml(p.id)}" role="button" tabindex="0" aria-label="${escapeHtml(
      p.name
    )} 가격 추이 보기">
      <span class="spot-photo">
        <img src="${escapeHtml(p.image)}" alt="" width="72" height="72" loading="lazy" decoding="async">
      </span>
      <div class="spot-body">
        <p class="spot-meta"><span class="spot-tag ${tag.cls}">${escapeHtml(tag.text)}</span><span class="spot-brand">${escapeHtml(
          p.brand || categoryLabel(p.category)
        )}</span><span class="spot-src src-${srcKey}">${PLATFORMS[srcKey].label}</span></p>
        <h3 class="spot-name">${escapeHtml(p.name)}</h3>
        <p class="spot-price">${p.discountPct > 0 ? `<span class="pc-off">${off}</span>` : ""}<strong>${won(view.price)}</strong>${was}</p>
        ${unit ? `<p class="spot-unit">${escapeHtml(unit)}</p>` : ""}
      </div>
    </div>
    <div class="spot-buys">${buyHTML}</div>
  </article>`;
}

/* ── 홈 카테고리 정의 (전체·제로음료·단백질·식단고기·간편식) ──
   r54 — 재영 님(2026-11-19): "중복된 카테고리 버튼 2줄을 1줄로", "보기좋게 두줄로".
   홈 맨 위 5개 버튼 하나만 남기고, 그 선택값(state.homeCat)이
   ① 오늘의 역대급 할인 카드(가로 레일)와 ② 아래 상품 비교 리스트를 함께 필터링합니다. */
/* r55 — 위 '오늘의 역대급 할인' 레일 노출 개수. 재영 님(2026-11-19): 5개 → 4개 */
const SPOT_LIMIT = 4;

const SPOT_CATS = [
  { id: "all", emoji: "🔥", label: "전체", parts: null },
  { id: "zero", emoji: "🥤", label: "제로음료·생수", parts: ["zero"] },
  { id: "protein", emoji: "💪", label: "단백질", parts: ["protein"] },
  { id: "chicken", emoji: "🍗", label: "닭가슴살·안심", parts: ["chicken"] },
  { id: "meat", emoji: "🥩", label: "소·돼지고기", parts: ["meat"] },
];

/* r53 — '오늘의 역대급 할인' Top 5 기준 (재영 님 2026-11-19: "인지도(리뷰 수) × 할인 매력도")
   단백질·고기 가중치는 빼고, 리뷰가 많은 상품과 국민 브랜드가 오늘 진짜 싼지를 봅니다. */
const NATIONAL_BRANDS = [
  "코카콜라", "코크", "펩시", "나랑드", "몬스터", "핫식스", "레드불", "삼다수", "제주삼다수", "아이시스", "트레비", "칠성",
  "게토레이", "파워에이드", "하림", "동원", "오뚜기", "CJ", "햇반", "비비고", "스팸", "종가", "청정원", "풀무원", "대상",
  "매일", "매일유업", "남양", "빙그레", "서울우유", "웅진", "농심", "롯데", "곰곰", "더단백", "셀렉스", "테이크핏", "칼로바이",
  "옵티멈", "뉴욕웨이", "신타", "명인이만든", "미트팜", "도드람", "목우촌", "마이프로틴", "하이뮨", "아몬드브리즈", "베지밀",
];

/* 리뷰 수 인지도 — 10만 개 이상이면 1.0, 리뷰가 없어도 국민 브랜드면 0.6 */
function reviewAwarenessOf(p) {
  const n = Number(p.reviewCount || p.reviews || 0);
  const byReview = n > 0 ? Math.min(1, Math.log10(n + 1) / 5) : 0;
  const text = `${p.brand || ""} ${p.name || ""}`;
  const known = NATIONAL_BRANDS.some((k) => text.includes(k));
  if (byReview > 0) return Math.min(1, byReview + (known ? 0.12 : 0));
  return known ? 0.6 : 0.2;
}

/* 할인 매력도 — 할인율·60일 저점·판정을 함께 */
function discountAppealOf(p) {
  const disc = Math.max(0, Math.min(1, (Number(p.discountPct) || 0) / 50));
  const low = lowStats(p);
  const lowV = low.state === "low" ? 1 : low.state === "near" ? 0.7 : low.state === "above" ? 0.3 : 0.5;
  const judge = typeof judgeOf === "function" ? judgeOf(p) : null;
  const good = judge && judge.tier ? (judge.tier.id === "good" ? 1 : judge.tier.id === "mid" ? 0.55 : 0.2) : 0.5;
  return 0.5 * disc + 0.25 * lowV + 0.25 * good;
}

/* 오늘의 Top 5 — 인지도 62% + 할인 매력도 38%, 같은 브랜드는 한 번만 */
function spotTopPicks(n) {
  const limit = n || 5;
  const rows = [];
  (state.data.products || []).forEach((p) => {
    if (isSpotlightOut(p)) return;
    if (typeof matchesSource === "function" && !matchesSource(p)) return;
    if (!p.image || !p.affiliateUrl || typeof p.price !== "number") return;
    if (!String(p.brand || "").trim()) return;
    const aware = reviewAwarenessOf(p);
    const appeal = discountAppealOf(p);
    if (appeal <= 0.25) return; /* 할인 매력이 없는 상품은 빠집니다 */
    rows.push({ p, score: 0.62 * aware + 0.38 * appeal, aware });
  });
  rows.sort((a, b) => b.score - a.score || b.aware - a.aware || String(a.p.id).localeCompare(String(b.p.id)));
  const out = [];
  rows.forEach((r) => {
    if (out.length >= limit) return;
    if (out.some((p) => spotBrandKey(p) === spotBrandKey(r.p))) return;
    out.push(r.p);
  });
  if (out.length < limit) rows.forEach((r) => { if (out.length < limit && out.indexOf(r.p) < 0) out.push(r.p); });
  return out.slice(0, limit);
}

/* 카테고리 안의 오늘 추천 — 메리트 점수(할인·저점·인하) 우선, 같으면 인지도 순.
   날짜 시드로 조금씩 섞어 매일 같은 칩이 1번에 오지 않게 합니다. */
function spotCatPicks(cat, n) {
  const limit = n || 6;
  if (cat === "all") return spotTopPicks(limit);
  const def = SPOT_CATS.find((c) => c.id === cat);
  if (!def || !def.parts) return spotlightPicks(limit);
  const dayKey = spotDayKey();
  const rows = [];
  (state.data.products || []).forEach((p) => {
    if (isSpotlightOut(p)) return;
    if (typeof matchesSource === "function" && !matchesSource(p)) return;
    if (!p.image || !p.affiliateUrl || typeof p.price !== "number") return;
    if (def.parts.indexOf(p.part || "zero") < 0) return;
    const merit = spotMerit(p, dayKey);
    const aware = spotAwareness(p);
    const score = (merit == null ? 0 : merit) * (0.88 + 0.24 * spotHash(`${p.id}|${dayKey}|${cat}`));
    rows.push({ p, score, aware });
  });
  rows.sort((a, b) => b.score - a.score || b.aware - a.aware || String(a.p.id).localeCompare(String(b.p.id)));
  const out = [];
  const push = (p) => {
    if (out.length < limit && out.indexOf(p) < 0) out.push(p);
  };
  rows.forEach((r) => {
    if (out.length >= limit) return;
    if (out.some((p) => spotBrandKey(p) === spotBrandKey(r.p))) return; /* 한 칩에 같은 브랜드는 한 번 */
    push(r.p);
  });
  if (out.length < limit) rows.forEach((r) => push(r.p)); /* 모자라면 브랜드 중복 허용 */
  return out.slice(0, limit);
}

/* ── 홈 분류 선택값
   r55 — 홈 맨 위 카테고리 버튼 줄(#home-cats)을 없애고 분류는 하단 '카테고리' 탭으로 통합했습니다.
   홈에서는 늘 "전체"라서 homeCatDef()는 SPOT_CATS[0](= 전체)만 돌려줍니다. */
function homeCatDef() {
  return SPOT_CATS.find((c) => c.id === state.homeCat) || SPOT_CATS[0];
}

/* r58 — 목록 섹션 헤더는 제목만 남기고, 정렬 표시는 컨트롤 줄의 '할인순 ▾' 버튼이 맡습니다. */
function renderHomeHead() {
  const box = $("home-head");
  if (!box) return;
  const sel = box.querySelector("[data-sortsel]");
  if (!sel) return;
  sel.innerHTML = SORT_OPTIONS.map(
    (o) => `<option value="${o.id}"${state.sort === o.id ? " selected" : ""}>${o.label}</option>`
  ).join("");
}

/* r58 — 정렬 시트: 5개 기준을 긴 이름·한 줄 설명과 함께 보여 주고, 지금 고른 것에 체크 */
function renderSortSheet() {
  const list = $("sort-list");
  if (!list) return;
  const goalOn = state.tab === "home" && state.goal && state.goal !== "all";
  const cur = goalOn ? "popular" : state.sort;
  list.innerHTML = SORT_OPTIONS.map((o) => {
    const on = o.id === cur;
    return `<button type="button" class="sort-opt${on ? " is-on" : ""}" data-sortpick="${o.id}" aria-pressed="${on}">
        <span class="sort-opt-main"><b>${escapeHtml(o.label)}</b><em>${escapeHtml(o.desc)}</em></span>
        <span class="sort-opt-check" aria-hidden="true">${on ? "✓" : ""}</span>
      </button>`;
  }).join("");
}
function openSortSheet() {
  const modal = $("sort-modal");
  if (!modal) return;
  renderSortSheet();
  modal.hidden = false;
  document.body.classList.add("modal-open");
  const first = modal.querySelector(".sort-opt.is-on") || modal.querySelector(".sort-opt");
  if (first) first.focus({ preventScroll: true });
}
function closeSortSheet() {
  const modal = $("sort-modal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  document.body.classList.remove("modal-open");
}
function setSort(id) {
  if (!SORT_IDS.has(id)) return;
  if (state.pick) state.pick = "";
  state.sort = id;
  state.goal = "all";
  state.limit.home = HOME_LIMIT;
  state.limit.category = 30;
  paint();
}

function renderHome() {
  renderHomeHead();
  const goalOn = state.goal && state.goal !== "all" && typeof goalList === "function";
  let list;
  let topId = "";
  if (goalOn) {
    /* 목적을 고르면 그 목적에 맞는 것만, 목적 기준 순서로 */
    list = goalList(state.goal).filter(matchesPick);
  } else {
    list = collapseVariants(sortList(basePool(), state.sort)).filter(matchesPick);
  }
  const hcat = homeCatDef();
  if (hcat.parts) list = list.filter((p) => hcat.parts.indexOf(partOf(p)) >= 0);
  if (!goalOn && state.sort === "popular") {
    /* r55 — 홈이 한 섹션으로 합쳐지면서, '오늘의 역대급 할인' 상위 4개(인지도×할인)가
       추천순일 때 목록 맨 위 4칸에 자연스럽게 오도록 그 순서대로 앞에 세웁니다. */
    const todayTop = spotTopPicks(SPOT_LIMIT).map((p) => homePinTarget(p.id, list) || p.id);
    list = pinListFirst(list, todayTop);
    topId = todayTop.find((id) => list.some((p) => p.id === id)) || homePinTarget(homeChampionId(), list);
  }
  const catFiltered = !!hcat.parts || (state.filters || []).length > 0 || !!state.pick || !!state.query || goalOn;
  renderCardsInto($("home-list"), list, {
    limit: catFiltered ? 0 : state.limit.home,
    moreKey: "home",
    showPart: true,
    twoCol: true,
  });
  const first = $("home-list") && $("home-list").querySelector(".pc");
  if (first && !goalOn && topId && first.dataset.id === topId) first.classList.add("is-first");
  const count = $("home-count");
  if (count) {
    count.textContent = goalOn
      ? `${goalLabelOf(state.goal)} ${collapseVariants(list).length}개`
      : `${collapseVariants(list).length}개`;
  }
}

/* ── 카테고리 ────────────────────────────────────────── */

function renderTiles() {
  const box = $("cattiles");
  if (!box) return;
  const pool = basePool();
  /* r58 — 맨 위에 '전체' 칸을 명시적으로 놓고, 그 아래 5개 분야(재영 님 2026-11-19) */
  const total = collapseVariants(pool).length;
  const totalBox = $("cat-total");
  if (totalBox) totalBox.textContent = `${total}개`;
  const allTile = `<button type="button" class="tile is-all${state.part === "all" ? " is-on" : ""}" data-part-tile="all">
      <span class="tile-photo is-all" aria-hidden="true">
        <svg viewBox="0 0 24 24" width="26" height="26" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round"><rect x="3.5" y="3.5" width="7" height="7" rx="1.8"></rect><rect x="13.5" y="3.5" width="7" height="7" rx="1.8"></rect><rect x="3.5" y="13.5" width="7" height="7" rx="1.8"></rect><rect x="13.5" y="13.5" width="7" height="7" rx="1.8"></rect></svg>
      </span>
      <span class="tile-body">
        <span class="tile-name">전체</span>
        <span class="tile-sub">모든 상품 보기</span>
      </span>
      <span class="tile-n">${total}개</span>
    </button>`;
  box.innerHTML =
    allTile +
    PART_TILES.map((t) => {
      /* r57 — 개수는 목록과 같은 기준(묶음 접기)으로 셀니다(A5). */
      const n = collapseVariants(pool.filter((p) => partOf(p) === t.part)).length;
      return `<button type="button" class="tile" data-part-tile="${t.part}">
      <span class="tile-photo"><img src="${escapeHtml(t.image)}" alt="" loading="lazy" decoding="async"></span>
      <span class="tile-body">
        <span class="tile-name">${escapeHtml(t.label)}</span>
        <span class="tile-sub">${escapeHtml(t.sub)}</span>
      </span>
      <span class="tile-n">${n}개</span>
    </button>`;
    }).join("");
}

/* r55 — 카테고리 탭 '판매처별 모아보기' 칩 (재영 님: 카톡 톡딜은 빼고 쿠팡·토스·네이버 3개만) */
const STORE_TILES = [
  { id: "coupang", label: "쿠팡" },
  { id: "toss", label: "토스" },
  { id: "naver", label: "네이버" },
];
function storeKeysOf(p) {
  return buyOptions(p).map((o) => o.key);
}
function renderCategoryStores() {
  const box = $("cat-stores");
  if (!box) return;
  const pool = basePool();
  /* r58 — 판매처 앞에 '전체'를 먼저 두고, 카테고리 영역 밑의 작은 서브 필터로 내립니다 */
  const total = collapseVariants(pool).length;
  const allChip = `<button type="button" class="store-chip is-all${state.catStore ? "" : " is-on"}" data-catstore="all" aria-pressed="${
    !state.catStore
  }">전체<span class="n">${total}</span></button>`;
  box.innerHTML = allChip + STORE_TILES.map((s) => {
    const on = state.catStore === s.id;
    const n = collapseVariants(pool.filter((p) => storeKeysOf(p).includes(s.id))).length;
    return `<button type="button" class="store-chip is-${s.id}${on ? " is-on" : ""}" data-catstore="${s.id}" aria-pressed="${on}">${escapeHtml(
      s.label
    )}<span class="n">${n}</span></button>`;
  }).join("");
}

/* ── 카테고리 안쪽 1줄 쿠팡 기획전 (홈에는 절대 안 띄움) ─────────
   아버님 쿠팡 파트너스(AF5520784) 단축 링크 — 누르면 새 탭으로 열립니다. */
const CAT_PROMOS = {
  meat: {
    label: "쿠팡 로켓프레시 고기역전 기획전 보기 →",
    href: "https://link.coupang.com/a/iLYqwMeRCm",
  },
  protein: {
    label: "쿠팡 올해는 건강 챙기세요! (단백질·저당) →",
    href: "https://link.coupang.com/a/iLYxco3wHc",
  },
  gadget: {
    label: "쿠팡 가전디지털 블랙 프라이데이 (~11/29) →",
    href: "https://link.coupang.com/a/iLYxOpEHhk",
  },
  diet: {
    label: "쿠팡 로켓프레시 식단관리 기획전 보기 →",
    href: "https://link.coupang.com/a/iLYm0PH9C8",
  },
};

function catPromoOf() {
  if (state.part === "meat" || state.part === "chicken") return CAT_PROMOS.meat;
  if (state.part === "protein") return CAT_PROMOS.protein;
  return CAT_PROMOS.diet; /* 전체(타일) · 제로 음료 · 치팅·간편식 · 기타 */
}

function renderCatPromo() {
  const box = $("cat-promo");
  if (!box) return;
  const p = catPromoOf();
  box.innerHTML = `<a class="promo-link" href="${p.href}" target="_blank" rel="noopener noreferrer"><span class="promo-txt">${escapeHtml(
    p.label
  )}</span></a>`;
  box.hidden = false;
}

function renderCategoryList() {
  const wrap = $("cat-browse");
  const tiles = $("cattiles");
  const list = $("cat-list");
  const filtersWrap = document.querySelector("#view-category .filters-wrap");
  if (!list) return;
  renderCategoryStores();
  const storeMode = !!state.catStore;
  const browsing = state.part !== "all" || storeMode;
  if (tiles) tiles.hidden = browsing;
  /* r58 — 판매처 서브 필터는 카테고리 영역(전체+5분야) 밑에서만 보입니다 */
  const storeWrap = $("cat-stores-wrap");
  if (storeWrap) storeWrap.hidden = browsing;
  if (wrap) wrap.hidden = !browsing;
  if (!browsing) {
    list.innerHTML = "";
    return;
  }

  /* r55 — 판매처별 모아보기: 그 판매처 링크가 붙은 상품만 (홈은 그대로, 이 탭에서만) */
  if (storeMode) {
    const def = STORE_TILES.find((s) => s.id === state.catStore) || STORE_TILES[0];
    let items = basePool().filter((p) => storeKeysOf(p).includes(def.id) && matchesPick(p));
    items = sortList(items, state.sort);
    const head = $("cat-head");
    if (head) {
      head.innerHTML = `<h2>${escapeHtml(def.label)}에서 살 수 있는 상품</h2><span>${collapseVariants(items).length}개 · ${escapeHtml(
        sortHint()
      )}</span>`;
    }
    if (filtersWrap) filtersWrap.hidden = true;
    renderCardsInto(list, items, { limit: state.limit.category, moreKey: "category", twoCol: true, showPart: true });
    return;
  }
  if (filtersWrap) filtersWrap.hidden = false;

  let items = basePool().filter(
    (p) => partOf(p) === state.part && matchesListFilters(p) && matchesPick(p)
  );
  items = sortList(items, state.sort);
  if (state.part === "meat") items = withPremiumLast(items);
  const part = partById(state.part);
  const head = $("cat-head");
  const picking = (state.filters || []).length + (state.stores || []).length > 0;
  if (head) {
    head.innerHTML = `<h2>${escapeHtml(part.label)}</h2><span>${collapseVariants(items).length}개 · ${escapeHtml(
      sortHint()
    )}</span>${
      picking ? `<button type="button" class="cat-reset" data-clear-filters>필터 해제</button>` : ""
    }`;
  }
  renderFilters();
  renderCardsInto(list, items, {
    limit: state.limit.category,
    moreKey: "category",
    grouped: (state.filters || []).length === 0,
    twoCol: true,
  });
}

/* r39 — 종류는 다중 체크(소고기+닭고기), 식단 고기는 보관(냉장·냉동)까지 한 줄 더.
   · 종류 안에서는 OR(고르면 고를수록 넓게), 보관과는 AND로 좁힙니다. */
function filterCount(f) {
  return basePool().filter((p) => partOf(p) === state.part && matchesFilter(p, f)).length;
}
function storeCount(kind) {
  return basePool().filter(
    (p) => partOf(p) === state.part && matchesCategoryFilters(p) && storageOf(p) === kind
  ).length;
}
function renderFilters() {
  const nav = $("part-filters");
  if (!nav) return;
  const items = partFilters().filter((f) => f.id !== "all");
  const sel = state.filters || [];
  const anySel = sel.length > 0;
  const all = `<button type="button" class="filter${!anySel ? " is-on" : ""}" data-filter="all" aria-selected="${!anySel}">전체</button>`;
  nav.innerHTML =
    all +
    items
      .map((f) => {
        const on = sel.includes(f.id);
        return `<button type="button" class="filter${on ? " is-on" : ""}" data-filter="${f.id}" aria-selected="${on}" aria-pressed="${on}">${
          on ? `<span class="chip-tick" aria-hidden="true">✓</span>` : ""
        }${escapeHtml(f.label)}<span class="chip-n">${filterCount(f)}</span></button>`;
      })
      .join("");

  const row = $("store-row");
  const snav = $("store-filters");
  if (!row || !snav) return;
  if (state.part !== "meat") {
    row.hidden = true;
    snav.innerHTML = "";
    return;
  }
  row.hidden = false;
  const defs = [
    { id: "chilled", emoji: "🧊", label: "냉장" },
    { id: "frozen", emoji: "❄️", label: "냉동" },
  ];
  /* 고를 때는 ✓로 바꿔 아이콘 두 개가 나란히 붙지 않게 합니다 */
  snav.innerHTML = defs
    .map((d) => {
      const on = (state.stores || []).includes(d.id);
      return `<button type="button" class="filter${on ? " is-on" : ""}" data-store="${d.id}" aria-selected="${on}" aria-pressed="${on}">${
        on ? `<span class="chip-tick" aria-hidden="true">✓</span>` : `<span class="chip-ico" aria-hidden="true">${d.emoji}</span>`
      }${d.label}<span class="chip-n">${storeCount(d.id)}</span></button>`;
    })
    .join("");
}

/* ── 랭킹 ────────────────────────────────────────────── */
/* r55 — 랭킹 기본 기준을 '할인율' → '인기·구매 순'으로 바꾸고, 할인율 순도 기준 칩으로 남깁니다.
   재영 님(2026-11-19): "랭킹에 할인율보다 구매율로 하자" / "할인율도 두고" */
const RANK_MODES = [
  { id: "popular", label: "인기·구매 순" },
  { id: "discount", label: "할인율 순" },
];

/* 인기·구매 점수 — 리뷰 수(구매 인기) 70% + 사이트 인기 점수 20% + 할인·가성비 보정 10%.
   리뷰가 아예 없는 상품도 인기 점수·할인율로 뒤에 붙을 수 있게 합니다. */
function popularityOf(p) {
  const reviews = Number(p.reviewCount || 0);
  const rev = reviews > 0 ? Math.min(1, Math.log10(reviews + 1) / 6) : 0;
  const pop = typeof p.popularScore === "number" ? Math.max(0, Math.min(1, p.popularScore / 100)) : 0;
  const disc = Math.max(0, Math.min(1, (Number(p.discountPct) || 0) / 60));
  return 0.7 * rev + 0.2 * pop + 0.1 * disc;
}

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
          `<button type="button" class="${p.id === state.rankPart ? "is-on" : ""}" data-rankpart="${p.id}" aria-pressed="${
            p.id === state.rankPart
          }">${escapeHtml(p.label)}</button>`
      )
      .join("");
  }
  /* 랭킹 기준 칩 — 기본은 인기·구매 순 */
  const modeBox = $("rank-mode");
  if (modeBox) {
    modeBox.innerHTML = RANK_MODES.map(
      (m) =>
        `<button type="button" class="${state.rankMode === m.id ? "is-on" : ""}" data-rankmode="${m.id}" aria-pressed="${
          state.rankMode === m.id
        }">${m.label}</button>`
    ).join("");
  }

  const pool = basePool().filter((p) => (state.rankPart === "all" ? true : partOf(p) === state.rankPart) && !isGadget(p));
  const items = collapseVariants(pool);

  /* ① 기본: 인기·구매 순(리뷰·인기 점수 위주) / ② 기준 칩으로 할인율 순 */
  const mainTitle = $("rank-main-title");
  const mainSub = $("rank-main-sub");
  if (state.rankMode === "discount") {
    const disc = items
      .filter((p) => typeof p.discountPct === "number" && p.discountPct > 0)
      .sort((a, b) => b.discountPct - a.discountPct || (a.perValue || 0) - (b.perValue || 0))
      .slice(0, 5);
    if (mainTitle) mainTitle.textContent = "할인율 TOP 5";
    if (mainSub) mainSub.textContent = "정가 대비";
    renderRankBlock("rank-main", disc, "할인");
  } else {
    const popular = items
      .slice()
      .sort(
        (a, b) =>
          popularityOf(b) - popularityOf(a) ||
          (Number(b.reviewCount) || 0) - (Number(a.reviewCount) || 0) ||
          (Number(b.discountPct) || 0) - (Number(a.discountPct) || 0)
      )
      .slice(0, 10);
    if (mainTitle) mainTitle.textContent = "인기 TOP 10";
    if (mainSub) mainSub.textContent = "리뷰·구매 기준";
    renderRankBlock("rank-main", popular, "인기");
  }

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
  if (note) {
    const basis =
      state.rankMode === "discount"
        ? "할인율 순은 정가 대비 할인율이 큰 순서예요."
        : "인기·구매 순은 리뷰 수(구매 인기) 70% · 사이트 인기 20% · 할인·가성비 10%로 매겼어요.";
    note.textContent = `${basis} 단가 최저는 ${MEASURE_LABEL[unit]} 기준 · 값이 같으면 가격이 낮은 순.`;
  }
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
    box.appendChild(el);
  });
}

/* ── 검색 ────────────────────────────────────────────── */

/* r59 — 최근 검색어. 이 브라우저(localStorage)에만 남기고, 누구와도 공유하지 않습니다.
   서버로 보내지 않으므로 계정·IP와 묶여 저장되는 일이 없어요. */
const RECENT_KEY = "ttini:recent:v1";
const RECENT_MAX = 8;

function loadRecent() {
  try {
    const arr = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    return Array.isArray(arr)
      ? arr.filter((x) => typeof x === "string" && x.trim()).map((x) => x.trim()).slice(0, RECENT_MAX)
      : [];
  } catch (err) {
    return [];
  }
}

function saveRecent(list) {
  try {
    localStorage.setItem(RECENT_KEY, JSON.stringify(list.slice(0, RECENT_MAX)));
  } catch (err) {
    /* 저장 공간이 없으면 이번 화면에서만 보입니다 */
  }
}

function pushRecent(value) {
  const q = String(value || "").trim();
  if (q.length < 2) return;
  saveRecent([q, ...loadRecent().filter((x) => x !== q)]);
  renderRecent();
}

function removeRecent(value) {
  saveRecent(loadRecent().filter((x) => x !== value));
  renderRecent();
}

function clearRecent() {
  saveRecent([]);
  renderRecent();
}

function renderRecent() {
  const box = $("search-recent");
  const list = $("search-recent-list");
  if (!box || !list) return;
  const items = loadRecent();
  const typing = !!String(state.query || "").trim();
  box.hidden = typing || !items.length;
  if (!items.length) {
    list.innerHTML = "";
    return;
  }
  list.innerHTML = items
    .map(
      (q) => `<span class="chip-recent">
        <button type="button" class="chip-recent-go" data-recent="${escapeHtml(q)}">${escapeHtml(q)}</button>
        <button type="button" class="chip-recent-x" data-recent-del="${escapeHtml(q)}" aria-label="${escapeHtml(
        q
      )} 검색어 지우기">✕</button>
      </span>`
    )
    .join("");
}

/* 추천어·최근어·직접 입력을 모두 같은 경로로 */
function applyQuery(value) {
  const q = String(value || "");
  state.query = q;
  state.highlightId = null;
  const input = $("search-input");
  if (input) input.value = q;
  const hdr = $("hdr-find-input");
  if (hdr) hdr.value = q;
  paint();
}

function renderSearchView() {
  const q = String(state.query || "").trim();
  const chips = $("search-chips");
  const rec = $("search-rec");
  const lead = $("search-lead");
  const promos = $("search-promos");
  const head = $("search-head");
  const panel = $("search-controls");
  const list = $("search-list");
  if (chips) chips.hidden = !!q;
  if (rec) rec.hidden = !!q;
  if (lead) lead.hidden = !!q;
  renderRecent();
  if (promos) promos.hidden = !!q; /* 검색어를 넣으면 결과가 먼저 보이도록 기획전은 접습니다 */
  if (head) head.hidden = !q;
  if (panel) panel.hidden = !q;
  if (!list) return;
  if (!q) {
    list.innerHTML = "";
    if ($("search-count")) $("search-count").textContent = "";
    return;
  }
  const items = sortList(basePool().filter(matchesPick), state.sort);
  if ($("search-count")) $("search-count").textContent = `(${collapseVariants(items).length})`;
  renderCardsInto(list, items, { twoCol: true });
}

function resetSearch() {
  state.query = "";
  state.highlightId = null;
  const input = $("search-input");
  if (input) input.value = "";
  const hdr = $("hdr-find-input");
  if (hdr) hdr.value = "";
  paint();
}

function resetAllFilters() {
  state.query = "";
  state.part = "all";
  clearFilters();
  state.pick = "";
  state.sort = "popular";
  state.goal = "all";
  state.sources = { coupang: true, toss: true };
  state.highlightId = null;
  state.limit = { home: 8, category: 30, hotdeal: 30 };
  const input = $("search-input");
  if (input) input.value = "";
  const hdr = $("hdr-find-input");
  if (hdr) hdr.value = "";
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

function headerSearchOn() {
  try {
    return !!(window.matchMedia && window.matchMedia("(min-width: 900px)").matches);
  } catch (err) {
    return false;
  }
}

function focusSearchInput() {
  const input = headerSearchOn() ? $("hdr-find-input") || $("search-input") : $("search-input");
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
    id === "home" ? "띠니 | 제로음료·단백질·고기 최저가 비교" : `${TABS.find((t) => t.id === id).label} | 띠니`;
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
  clearFilters();
  state.pick = "";
  state.goal = "all";
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
  if (!p) return "쿠팡·토스·네이버·카톡 톡딜 최저가를 모아 비교하는 띠니예요. 직접 팔지 않고 원래 판매처로 연결해요.";
  const price = p.price != null ? `${won(p.price)} · ` : "";
  const v = measureValue(p);
  const unit = v != null ? `${Math.round(v)}원 / ${measureLabel(p)}` : "";
  return `띠니에서 본 상품: ${p.name} / ${price}${unit}`.trim();
}
async function shareMart(p) {
  const url = shareLinkFor(p);
  const title = p ? `띠니 · ${p.name}` : "띠니 · 최저가 비교";
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
  /* 이미 홈 화면 앱으로 열렸으면 헤더의 '홈 화면 추가' 버튼은 숨깁니다. */
  document.querySelectorAll("[data-shortcut]").forEach((btn) => (btn.hidden = true));
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
      hint: "홈 화면에 '띠니' 아이콘으로 추가돼요.",
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
      hint: "설치하면 홈 화면에 '띠니'로 보여요.",
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
  if (!document.querySelector(MODAL_OPEN_SEL)) document.body.classList.remove("modal-open");
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
/* ── 📖 이용 안내 모달 (헤더 문서 아이콘) ─────────────── */

const MODAL_OPEN_SEL =
  ".pm-modal:not([hidden]), .install-modal:not([hidden]), .alert-modal:not([hidden]), .hub-modal:not([hidden]), .info-modal:not([hidden])";

function closeInfoModal() {
  const modal = $("info-modal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  if (!document.querySelector(MODAL_OPEN_SEL)) document.body.classList.remove("modal-open");
}
function initInfo() {
  const modal = $("info-modal");
  if (!modal) return;
  document.addEventListener("click", (e) => {
    if (!e.target || !e.target.closest) return;
    if (e.target.closest("#info-open")) {
      modal.hidden = false;
      document.body.classList.add("modal-open");
      const btn = $("info-close");
      if (btn) btn.focus({ preventScroll: true });
      return;
    }
    if (e.target.closest("#info-x") || e.target.closest("#info-close") || e.target === modal) closeInfoModal();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeInfoModal();
  });
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
  protein: ["protein", "protein"],
  shake: ["protein", "shake"],
  beef: ["meat", "beef"],
  pork: ["meat", "pork"],
  chicken: ["chicken", "all"],
  breast: ["chicken", "breast"],
  tenderloin: ["chicken", "tenderloin"],
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
  put("f", (state.filters || []).join(","));
  put("store", (state.stores || []).join(","));
  put("pick", state.pick);
  put("sort", state.sort === "popular" ? "" : state.sort || "");
  put("goal", state.goal);
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
  const tabId = LEGACY_TABS[tab] || tab;
  if (tabId && TABS.some((t) => t.id === tabId)) state.tab = tabId;
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
  if (filterId && filterId !== "all") setFilters(filterId.split(",").map((s) => s.trim()).filter(Boolean));
  const storeParam = q.get("store");
  if (storeParam) {
    const set = new Set(storeParam.split(",").map((s) => s.trim()));
    state.stores = ["chilled", "frozen"].filter((k) => set.has(k));
  }
  const pickParam = q.get("pick");
  if (pickParam === "good" || pickParam === "wow") state.pick = pickParam;
  const sort = q.get("sort");
  if (sort) {
    const mapped = LEGACY_SORT[sort] || sort;
    if (SORT_IDS.has(mapped)) state.sort = mapped;
  } else if (state.tab === "home") {
    /* r55 — 홈 첫 진입은 '할인율 높은 순' (재영 님 2026-11-19: "열자마자 역대급이 바로 보이게").
       URL에 ?sort= 가 있거나 다른 탭으로 들어오면 그 화면의 기본(추천순)을 그대로 씁니다. */
    state.sort = HOME_DEFAULT_SORT;
  }
  const goalParam = q.get("goal");
  if (goalParam && typeof GOAL_DEFS !== "undefined" && GOAL_DEFS.some((g) => g.id === goalParam)) state.goal = goalParam;
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
  /* r58 — 정렬은 작은 '할인순 ▾' 버튼 + 시트 하나로 (큰 셀렉트 박스 삭제) */
  document.addEventListener("click", (e) => {
    if (e.target.closest("[data-sortopen]")) {
      openSortSheet();
      return;
    }
    const pickBtn = e.target.closest("[data-sortpick]");
    if (pickBtn) {
      closeSortSheet();
      setSort(pickBtn.getAttribute("data-sortpick"));
      return;
    }
    if (e.target.closest("#sort-x")) {
      closeSortSheet();
      return;
    }
    const sm = $("sort-modal");
    if (sm && !sm.hidden && e.target === sm) closeSortSheet();
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeSortSheet();
  });
  document.addEventListener("click", (e) => {
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
    const tile = e.target.closest("[data-part-tile]");
    if (tile) {
      state.catStore = "";
      state.part = tile.getAttribute("data-part-tile");
      clearFilters();
      state.limit.category = 30;
      paint();
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const storeChip = e.target.closest("[data-catstore]");
    if (storeChip) {
      const id = storeChip.getAttribute("data-catstore");
      /* r58 — '전체' 칩은 판매처 필터를 끄는 것입니다 */
      state.catStore = id === "all" || state.catStore === id ? "" : id;
      if (state.catStore) {
        state.part = "all";
        clearFilters();
      }
      state.limit.category = 30;
      paint();
      return;
    }
    const back = e.target.closest("[data-backpart]");
    if (back) {
      state.part = "all";
      state.catStore = "";
      clearFilters();
      paint();
      window.scrollTo({ top: 0, behavior: "auto" });
      return;
    }
    const pickBtn = e.target.closest("[data-pick]");
    if (pickBtn) {
      const id = pickBtn.getAttribute("data-pick");
      state.pick = state.pick === id ? "" : id;
      state.limit.home = HOME_LIMIT;
      state.limit.category = 30;
      state.limit.hotdeal = 30;
      paint();
      return;
    }
    const clearF = e.target.closest("[data-clear-filters]");
    if (clearF) {
      clearFilters();
      paint();
      return;
    }
    const filt = e.target.closest("[data-filter]");
    if (filt) {
      const id = filt.getAttribute("data-filter");
      if (id === "all") {
        setFilters([]);
      } else {
        const cur = (state.filters || []).slice();
        const at = cur.indexOf(id);
        if (at >= 0) cur.splice(at, 1);
        else cur.push(id);
        setFilters(cur);
      }
      state.limit.category = 30;
      paint();
      return;
    }
    const storeBtn = e.target.closest("[data-store]");
    if (storeBtn) {
      const id = storeBtn.getAttribute("data-store");
      const cur = (state.stores || []).slice();
      const at = cur.indexOf(id);
      if (at >= 0) cur.splice(at, 1);
      else cur.push(id);
      state.stores = cur;
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
    const rm = e.target.closest("[data-rankmode]");
    if (rm) {
      const id = rm.getAttribute("data-rankmode");
      if (id === "popular" || id === "discount") {
        state.rankMode = id;
        paint();
      }
      return;
    }
    const more = e.target.closest("[data-more]");
    if (more) {
      const key = more.getAttribute("data-more");
      if (key === "home") state.limit.home += 24;
      else if (key === "category") state.limit.category += 30;
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
        return;
      }
      /* r59 — 검색을 마쳤을 때(엔터) 최근 검색어에 남깁니다 */
      if (e.key === "Enter") {
        e.preventDefault();
        pushRecent(input.value);
        input.blur();
      }
    });
    input.addEventListener("blur", () => pushRecent(input.value));
  }
  if (clear) {
    clear.addEventListener("click", () => {
      resetSearch();
      if (input) input.focus();
    });
  }

  /* r39 — PC·태블릿 헤더 상시 검색창. 첫 글자를 치면 바로 검색 탭 결과로 이어집니다. */
  const hdr = $("hdr-find-input");
  const hdrForm = $("hdr-find");
  const hdrClear = $("hdr-find-clear");
  if (hdrForm) {
    hdrForm.addEventListener("submit", (e) => e.preventDefault());
  }
  if (hdr) {
    hdr.addEventListener("input", () => {
      state.query = hdr.value;
      state.highlightId = null;
      if (state.tab !== "search") setTab("search", false);
      else paint();
    });
    hdr.addEventListener("keydown", (e) => {
      if (e.key === "Escape") {
        e.preventDefault();
        resetSearch();
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        pushRecent(hdr.value);
      }
    });
    hdr.addEventListener("blur", () => pushRecent(hdr.value));
  }
  if (hdrClear) {
    hdrClear.addEventListener("click", () => {
      resetSearch();
      if (hdr) hdr.focus();
    });
  }
  document.addEventListener("click", (e) => {
    if (e.target && e.target.id === "empty-clear") resetSearch();
    if (e.target && e.target.id === "empty-reset") resetAllFilters();
    /* r59 — 최근 검색어: 누르면 그 검색어로, ✕는 그 하나만, '전체 삭제'는 모두 */
    const delRecent = e.target.closest("[data-recent-del]");
    if (delRecent) {
      removeRecent(delRecent.getAttribute("data-recent-del"));
      return;
    }
    if (e.target.closest("#search-recent-clear")) {
      clearRecent();
      return;
    }
    const recent = e.target.closest("[data-recent]");
    if (recent) {
      const q = recent.getAttribute("data-recent");
      applyQuery(q);
      pushRecent(q);
      return;
    }
    const chip = e.target.closest("[data-keyword]");
    if (chip) {
      const q = chip.getAttribute("data-keyword");
      applyQuery(q);
      pushRecent(q);
    }
  });
}

function renderSearchStatus() {
  const clear = $("search-clear");
  const input = $("search-input");
  const hdr = $("hdr-find-input");
  const hdrClear = $("hdr-find-clear");
  const q = String(state.query || "").trim();
  if (clear) clear.hidden = !q;
  if (hdrClear) hdrClear.hidden = !q;
  if (input && document.activeElement !== input && input.value !== state.query) input.value = state.query;
  if (hdr && document.activeElement !== hdr && hdr.value !== state.query) hdr.value = state.query;
}

/* ── 시작 ────────────────────────────────────────────── */

function paint() {
  syncUrl();
  renderSearchStatus();
  renderControls();
  if (state.tab === "home") {
    if (typeof renderGoalBar === "function") renderGoalBar();
    renderHome();
  }
  else if (state.tab === "category") {
    renderCatPromo();
    renderTiles();
    renderCategoryList();
  } else if (state.tab === "search") renderSearchView();
  else if (state.tab === "ranking") renderRanking();
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
  /* r57 (A1) — '오늘 19:05 기준'처럼 전체 가격이 방금 갱신된 것처럼 보이던 문구를 없앴습니다.
     가장 최근에 확인한 상품의 시각만 적고, 상품마다 다르다는 사실을 함께 적습니다. */
  if (latest && $("update-date-big")) {
    const wd = WEEKDAY_KO[new Date(latest.y, latest.mo - 1, latest.d).getDay()] || "";
    $("update-date-big").textContent = `${latest.mo}/${latest.d}`;
    if ($("update-weekday")) $("update-weekday").textContent = wd ? `(${wd})` : "";
    if ($("update-time")) {
      $("update-time").textContent = latest.time ? ` ${latest.time}` : "";
      $("update-time").hidden = !latest.time;
    }
  }
  const cyc = $("update-cycle-main");
  if (cyc) {
    cyc.textContent = "상품마다 확인한 시각이 달라요 · 카드에 표시돼요";
  }
  const band = $("update-band");
  if (band && latest) {
    band.title = `가장 최근 확인 ${latest.mo}/${latest.d}${latest.time ? ` ${latest.time}` : ""} · 상품마다 확인 시각이 달라요`;
    band.setAttribute(
      "aria-label",
      `가장 최근 확인 ${latest.mo}/${latest.d}${latest.time ? ` ${latest.time}` : ""}, 상품마다 확인 시각이 달라요.`
    );
  }
}

/* ── 구매 버튼 클릭 수 (익명 카운트) ─────────────────
   상품 ID·플랫폼만 셈니다. IP·쿠키·개인정보는 보내지도 저장하지도 않습니다. */
function trackBuyClick(pid, plat) {
  if (!pid) return;
  const body = JSON.stringify({ productId: pid, platform: plat || "" });
  try {
    if (typeof navigator !== "undefined" && typeof navigator.sendBeacon === "function") {
      const blob = new Blob([body], { type: "application/json" });
      if (navigator.sendBeacon("/api/clicks", blob)) return;
    }
    fetch("/api/clicks", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body,
      keepalive: true,
    }).catch(() => {});
  } catch (err) {
    /* 카운트를 못 남겨도 구매 이동은 그대로 */
  }
}

function initClickTracking() {
  document.addEventListener("click", (e) => {
    const a = e.target && e.target.closest ? e.target.closest("a[data-click-pid]") : null;
    if (!a) return;
    trackBuyClick(a.getAttribute("data-click-pid"), a.getAttribute("data-click-plat"));
  });
}

async function init() {
  setLegalOffset();
  initShortcut();
  initInfo();
  initShare();
  initSearch();
  initControls();
  initClickTracking();
  if (typeof initSmart === "function") initSmart();
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
  state.rankPart = state.rankPart || "all";
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
