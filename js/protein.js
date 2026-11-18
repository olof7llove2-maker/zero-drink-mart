/* ── 💪 단백질 음료, 지금 사도 될까? ──────────────────────
   홈 '🔥 오늘의 역대급 할인' 바로 아래에 붙는 컴팩트 판정 레일.

   판정은 js/grade.js 의 judgeOf() 하나만 씁니다 — 카드 신호등·5단계 배지·모달과 같은 값입니다.
   - 평소가 = 이 상품의 관측 가격(쿠프라이스·마트 확인) 중간값, 14일·관측 5회 이상만
   - −5% 이하 = 핫딜 · +3%까지 = 보통 · 그 위 = 비쌈 · 기록이 모자라면 = 기록중
   - 같은 용기 시세는 판정이 아니라 카드에 숫자로만 덧붙입니다(100ml당 대신 단백질 20g당).
   없는 가격·기록은 만들지 않고 data/price-history.json 에 있는 값만 씁니다. */

const PROT_MIN_PROTEIN_G = 10;
const PROT_MIN_DAYS = 14;

const PROT_STATES = [
  { id: "hot", label: "핫딜" },
  { id: "mid", label: "보통" },
  { id: "high", label: "비쌈" },
  { id: "track", label: "기록중" },
];
const PROT_STATE = {
  hot: { label: "핫딜", cls: "is-hot" },
  mid: { label: "보통", cls: "is-mid" },
  high: { label: "비쌈", cls: "is-high" },
  track: { label: "기록중", cls: "is-track" },
};

/* 핫딜 / 보통 / 비쌈 / 기록중 — 통일 판정(judgeOf)을 그대로 옮긴 것 */
function protVerdict(p) {
  const j = typeof judgeOf === "function" ? judgeOf(p) : null;
  const base = j && j.base ? j.base : null;
  if (!j || j.basis !== "history" || j.pct == null || !base) {
    return {
      id: "track",
      pct: null,
      median: null,
      days: base ? base.days : 0,
      observations: base ? base.observations : 0,
      judge: j,
    };
  }
  const id = j.tier.id === "good" ? "hot" : j.tier.id === "mid" ? "mid" : "high";
  return { id, pct: j.pct, median: base.median, days: base.days, observations: base.observations, judge: j };
}

/* 대상: 단백질 음료 중 1병 단백질 10g 이상 + 20g당 가격을 계산할 수 있는 상품.
   두유·저단백(1병 10g 미만)은 카테고리에서 따로 보므로 여기 섞지 않습니다. */
function protPool() {
  return (state.data.products || []).filter((p) => {
    if (p.category !== "protein") return false;
    const g = proteinValue(p);
    if (g == null || g < PROT_MIN_PROTEIN_G) return false;
    return protein20(p) != null;
  });
}

/* 인지도 순 — 재영 님 지시(2026-11-18): "유명 제품부터".
   아는 브랜드를 앞에 두고, 그 안에서는 popularScore → 리뷰 수 → 단백질 20g당 가격 순.
   새 브랜드가 들어오면 목록에 넣어 주면 됩니다(없으면 점수·리뷰로 자동 정렬). */
const PROT_BRAND_RANK = [
  "더단백",
  "테이크핏",
  "셀렉스",
  "하이뮨",
  "닥터유",
  "칼로바이",
  "뉴케어",
  "마이프로틴",
  "매일두유",
  "연세두유",
  "베지밀",
  "맛있는두유GT",
  "요플레",
  "빙그레",
];

function protBrandRank(p) {
  const brand = String((p && p.brand) || "").trim();
  const name = String((p && p.name) || "");
  for (let i = 0; i < PROT_BRAND_RANK.length; i += 1) {
    const key = PROT_BRAND_RANK[i];
    if (brand.includes(key) || name.includes(key)) return i;
  }
  return PROT_BRAND_RANK.length;
}

/* 인지도 순 정렬 (판정 유무와 상관없이) */
function protSorted(list) {
  return list
    .map((p, i) => ({ p, i }))
    .sort((a, b) => {
      const ra = protBrandRank(a.p);
      const rb = protBrandRank(b.p);
      if (ra !== rb) return ra - rb;
      const pa = typeof a.p.popularScore === "number" ? a.p.popularScore : -1;
      const pb = typeof b.p.popularScore === "number" ? b.p.popularScore : -1;
      if (pa !== pb) return pb - pa;
      const va = typeof a.p.reviewCount === "number" ? a.p.reviewCount : -1;
      const vb = typeof b.p.reviewCount === "number" ? b.p.reviewCount : -1;
      if (va !== vb) return vb - va;
      const ap = protein20(a.p);
      const bp = protein20(b.p);
      if (ap !== bp) return ap - bp;
      return a.i - b.i;
    })
    .map((x) => x.p);
}

/* 1병 단백질 25g 이상 = 고함량 배지 (30g 이상은 더 진하게) */
const PROT_HIGH_G = 25;
const PROT_HIGH_STRONG_G = 30;

function protHighBadge(g) {
  if (g == null || g < PROT_HIGH_G) return "";
  const strong = g >= PROT_HIGH_STRONG_G;
  return `<span class="prot-hi${strong ? " is-strong" : ""}" title="1병 단백질 ${g}g — ${strong ? "고함량" : "일반 20g 제품보다 많아요"}">🔥 고함량 ${g}g</span>`;
}

/* 카드 1장 — 뒤에 상품 사진을 은은하게 깔고, 앞은 텍스트만.
   탭하면 가격 추이 모달, 아래는 플랫폼 3색 구매 버튼. */
function protCardHTML(p) {
  const v = protVerdict(p);
  const meta = PROT_STATE[v.id] || PROT_STATE.track;
  const srcKey = platformOf(p);
  const g = proteinValue(p);
  const p20 = protein20(p);
  const per1 = typeof proteinPerG === "function" ? proteinPerG(p) : null;
  const stale = typeof staleInfoOf === "function" ? staleInfoOf(p) : null;
  const fine = [
    g != null ? `1병 단백질 ${g}g` : "",
    stale ? stale.short : p.priceCheckedLabel || "",
  ]
    .filter(Boolean)
    .join(" · ");
  const bg = p.image
    ? `<span class="prot-bg" aria-hidden="true"><img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async"></span>`
    : "";
  return `<article class="prot-card ${meta.cls}${stale && stale.stale ? " is-stale" : ""}">
    ${bg}
    <div class="prot-tap" data-chart="${escapeHtml(p.id)}" role="button" tabindex="0" aria-label="${escapeHtml(
    p.name
  )} 가격 추이 보기">
      <p class="prot-top">
        <span class="prot-badge ${meta.cls}">${meta.label}</span>
        <span class="prot-brand">${escapeHtml(p.brand || categoryLabel(p.category))}</span>
        <span class="prot-src src-${srcKey}">${PLATFORMS[srcKey].label}</span>
      </p>
      <h3 class="prot-name">${escapeHtml(p.name)}</h3>
      <p class="prot-price"><strong>${won(p.price)}</strong>${protHighBadge(g)}</p>
      <p class="prot-p20">단백질 20g당 <strong>${won(p20)}</strong>${
    per1 ? `<span class="prot-p1g">1g당 ${won(per1)}</span>` : ""
  }</p>
    </div>
    <div class="prot-buys">${typeof buyHTML === "function" ? buyHTML(p) : ""}</div>
    ${fine ? `<p class="prot-fine" title="${escapeHtml(
      (stale && stale.stale ? `${stale.label} · 구매 전 판매처에서 다시 확인해 주세요. ` : "") + (p.priceCheckedLabel || "")
    )}">${escapeHtml(fine)}</p>` : ""}
  </article>`;
}

function renderProteinSection() {
  const box = $("home-protein");
  if (!box) return;
  const pool = protPool();
  if (!pool.length) {
    box.hidden = true;
    box.innerHTML = "";
    return;
  }
  box.hidden = false;

  const verdicts = new Map(pool.map((p) => [p.id, protVerdict(p)]));
  const counts = { hot: 0, mid: 0, high: 0, track: 0 };
  verdicts.forEach((v) => (counts[v.id] = (counts[v.id] || 0) + 1));

  const active = state.protState && counts[state.protState] != null ? state.protState : "all";
  const list = active === "all" ? pool : pool.filter((p) => verdicts.get(p.id).id === active);
  const sorted = protSorted(list);

  const chips = PROT_STATES.map(
    (s) =>
      `<button type="button" class="prot-chip ${PROT_STATE[s.id].cls}${
        active === s.id ? " is-on" : ""
      }" data-prot-state="${s.id}" aria-pressed="${active === s.id ? "true" : "false"}">${s.label} <b>${
        counts[s.id]
      }</b></button>`
  ).join("");

  const body = sorted.length
    ? `<div class="prot-rail">${sorted.map(protCardHTML).join("")}</div>`
    : `<p class="prot-empty">지금 ${PROT_STATE[active] ? PROT_STATE[active].label : ""} 판정인 상품이 없어요. <button type="button" class="prot-reset" data-prot-state="all">전체 보기</button></p>`;

  box.innerHTML = `<div class="prot-head">
      <h2 class="prot-title">💪 단백질 음료, 지금 사도 될까?</h2>
      <button type="button" class="prot-more" data-prot-all>전체 ${pool.length}개 →</button>
    </div>
    <div class="prot-chips" role="group" aria-label="판정으로 보기">${chips}</div>
    ${body}
    <p class="prot-note">평소가 = 이 상품 가격 기록의 중간값 · −5% 이하 핫딜 · +3%까지 보통 · 그 위 비쌈 · 기록 ${PROT_MIN_DAYS}일 미만은 기록중 · 인지도 높은 브랜드부터 · 카드를 누르면 가격 추이</p>`;
}

/* 칩으로 판정 필터 · '전체 보기'는 카테고리 탭의 단백질 음료로 */
document.addEventListener("click", (e) => {
  const chip = e.target.closest("[data-prot-state]");
  if (chip) {
    const id = chip.getAttribute("data-prot-state");
    if (!id) return;
    if (typeof state === "undefined") return;
    state.protState = id === "all" || state.protState === id ? "all" : id;
    renderProteinSection();
    return;
  }
  const more = e.target.closest("[data-prot-all]");
  if (more) {
    if (typeof state === "undefined") return;
    state.tab = "category";
    state.part = "protein";
    if (typeof clearFilters === "function") clearFilters();
    else state.filter = "all";
    state.pick = "";
    state.goal = "all";
    if (typeof setTab === "function") setTab("category", false);
    else if (typeof paint === "function") paint();
    window.scrollTo({ top: 0, behavior: "auto" });
  }
});
