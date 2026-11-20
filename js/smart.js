/* ── 띠니 r12 · 똑똑한 결론 레이어 ───────────────────────
   쿠프라이스(가격 이력)와 다르게 "고르는 시간"을 줄이는 쪽입니다.
   ① 목적별 1분 결론 칩   ② 지금 사도 되나 신호등 게이지
   ③ 10초 맞춤 추천       ④ 한 줄 꿀팁

   판정에 쓰는 근거는 이미 있는 데이터뿐입니다.
   - 60일 관측 기록(data/price-history.json)의 최저가
   - 정가 대비 할인율(product.discountPct)
   - 최근 30일 최저가(product.lowest30d)
   없는 값을 지어내지 않고, 근거가 없으면 "데이터 수집 중"으로 둡니다. */

const GOAL_DEFS = [
  { id: "diet", emoji: "🥗", label: "다이어트·저당" },
  { id: "protein", emoji: "💪", label: "운동 후 고단백" },
  { id: "value", emoji: "👑", label: "가성비 1등" },
];

const KIND_DEFS = [
  { id: "drink", emoji: "🥤", label: "제로음료·생수", parts: ["zero"] },
  { id: "shake", emoji: "🥛", label: "단백질 쉐이크·음료", parts: ["protein"] },
  { id: "meal", emoji: "🍗", label: "닭가슴살·소·돼지고기", parts: ["chicken", "meat"] },
];

/* 판정 문구·색은 js/grade.js 의 VERDICT_TIERS 하나를 그대로 씁니다(화면마다 말이 달라지지 않게).
   r58 — 화면 말투는 3단계로: 🟢 지금 사기 좋아요 / 🟡 아쉬워요 (기록 없으면 기록 중). */
const TL_LEVELS = {
  good: { label: "지금 사기 좋아요", short: "지금 사기 좋은 가격", dot: "🟢" },
  mid: { label: "아쉬워요", short: "아쉬워요", dot: "🟡" },
  wait: { label: "아쉬워요", short: "아쉬워요", dot: "🟡" },
  high: { label: "아쉬워요", short: "아쉬워요", dot: "🟡" },
  none: { label: "기록 중", short: "가격 기록을 모으는 중", dot: "⚪" },
};

/* 카테고리별 한 줄 꿀팁 씨앗 — 스펙이 아니라 '언제 쓰면 좋은지' */
const TIP_FLAVOR = {
  cola: "치팅날 제로콜라 한 캔",
  cider: "기름진 식후엔 사이다",
  sparkling: "밥 대신 탄산수 한 병",
  water: "그냥 물이 제일",
  acv: "식후 탄산수+애사비 꿀조합",
  ion: "운동 뒤 이온 한 병",
  energy: "새벽 근무엔 카페인 한 캔",
  icetea: "단 게 당길 때 제로 아이스티",
  tea: "밤에도 부담 없는 차",
  rice: "냉동실에 쟁여두고 한 끼",
  can: "반찬 없을 때 한 캔이면 끝",
  meal: "전자레인지 2분이면 한 끼",
  ready: "데워서 바로 한 끼",
  jeyuk: "밥 위에 얹으면 제육덮밥",
  egg: "삶아두면 간식",
  bakery: "아침 대용으로 한 개",
  snack: "출출할 때 한 봉",
  sauce: "고기에 소스 하나면 충분",
  gadget: "고기 굽는 날 쓸 도구",
  salmon: "샐러드 위에 한 조각",
  duck: "기름 적어 굽기 좋아요",
  lamb: "주말 홈파티용",
  premium: "선물·특식용 한 번",
};

const recState = { goal: null, kind: null };

/* ── 작은 도우미 ──────────────────────────────────────── */

function numOrNull(v) {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function clampNum(n, lo, hi) {
  return Math.max(lo, Math.min(hi, n));
}
function fmtG(v) {
  return String(Math.round(v * 10) / 10);
}

/* ── ② 지금 사도 되나 — 신호등 게이지 ───────────────────
   판정은 js/grade.js 의 judgeOf() 하나만 씁니다. 카드·단백질 레일·모달과 같은 값입니다. */

function signalOf(p) {
  if (typeof judgeOf !== "function") {
    return { level: "none", score: 50, why: "가격 기록을 모으는 중이에요." };
  }
  const j = judgeOf(p);
  const level = j.tier && j.tier.id ? j.tier.id : "none";
  /* 게이지 바늘: 왼쪽(초록)이 싸고 오른쪽(빨강)이 비싼 쪽 */
  const base = j.pct == null ? 48 : 48 + j.pct * 2.2;
  const score = level === "none" ? 48 : clampNum(Math.round(base), 4, 96);
  const why = [j.why, j.ref ? `참고 ${j.ref.label} 대비 ${signedPct(j.ref.pct)}` : ""].filter(Boolean).join(" · ");
  return { level, score, why };
}

function signalBarHTML(p) {
  const s = signalOf(p);
  const meta = TL_LEVELS[s.level] || TL_LEVELS.none;
  const title = `지금 사도 되나: ${meta.label} — ${s.why}`;
  return `<p class="tl tl-${s.level}" title="${escapeHtml(title)}">
    <span class="tl-bar" aria-hidden="true"><i></i><i></i><i></i><b style="left:${Math.round(s.score)}%"></b></span>
    <span class="tl-lab"><span class="tl-dot" aria-hidden="true">${meta.dot}</span>${meta.label}</span>
  </p>`;
}

/* r57 — 카드 배지는 토스식 알약으로 단순화했습니다.
   r58 — 3단계로 통일: 🔥 역대 최저 / 🟢 지금 사기 좋아요 / 🟡 아쉬워요 (+ 기록 중).
   판정은 여전히 grade.js의 judgeOf()·verdictBadgeOf() 하나만 씁니다 — 카드·상세가 같은 값을 씁니다. */
function signalPillHTML(p) {
  const j = typeof judgeOf === "function" ? judgeOf(p) : null;
  const pill = typeof verdictBadgeOf === "function" ? verdictBadgeOf(j) : null;
  const label = pill ? pill.label : "기록 중";
  const cls = pill ? pill.cls : "is-none";
  const why = j && j.why ? j.why : "";
  const title = why ? `${label} — ${why}` : label;
  return `<span class="sig ${cls}" title="${escapeHtml(title)}">${label}</span>`;
}

/* ── ④ 한 줄 꿀팁 ─────────────────────────────────────── */

function tipOf(p) {
  if (!p) return "";
  const bits = [];
  const part = p.part || "zero";
  const sugar = numOrNull(p.sugarPerServing);
  const protein = numOrNull(p.protein_g_per_bottle);
  const kcal = numOrNull(p.kcal_per_bottle);
  /* 상품별 문구(p.tip)가 있으면 카테고리 기본 문구보다 먼저 쓴다 */
  const flavor = p.tip || TIP_FLAVOR[p.category] || "";

  if (part === "protein") {
    if (protein != null && protein >= 20) bits.push(`단백질 ${fmtG(protein)}g · 운동 직후`);
    else if (protein != null) bits.push(`단백질 ${fmtG(protein)}g`);
    if (sugar != null && sugar <= 1) bits.push(`당류 ${fmtG(sugar)}g`);
    else if (kcal != null) bits.push(`${kcal}kcal`);
  } else if (part === "meat" || part === "chicken") {
    const pp = numOrNull(p.proteinPer100g);
    const fat = numOrNull(p.fatPer100g);
    if (pp != null && pp >= 20) bits.push(`단백질 ${fmtG(pp)}g/100g`);
    if (fat != null && fat <= 5) bits.push("지방 적은 부위");
    if (p.airfryerTip) bits.push(`에어프라이어 ${p.airfryerTip}`);
  } else {
    if (flavor) bits.push(flavor);
    if (p.caffeine === "contains") bits.push("카페인 있음");
    else if (p.aspartame === "none") bits.push("아스파탐 없이");
  }
  if (!bits.length && flavor) bits.push(flavor);

  /* 가격 쪽 결론 한 조각 (근거가 있을 때만) */
  const s = signalOf(p);
  if (s.level === "good" && bits.length < 2) {
    const st = typeof lowStats === "function" ? lowStats(p) : null;
    if (st && st.state === "low") bits.push("60일 관측 최저");
    else if (numOrNull(p.discountPct) != null && p.discountPct >= 40) bits.push(`-${p.discountPct}% 할인 중`);
    else if (numOrNull(p.lowest30d) != null && p.price <= p.lowest30d * 1.001) bits.push("30일 관측 최저");
  }
  return bits.filter(Boolean).join(" · ").split(" · ").slice(0, 2).join(" · ");
}

function tipLineHTML(p) {
  const tip = tipOf(p);
  if (!tip) return "";
  return `<p class="tip-line"><span class="tip-ico" aria-hidden="true">💬</span>${escapeHtml(tip)}</p>`;
}

/* ── ① 1분 결론 — 목적별 필터·정렬 ─────────────────────── */

function goalDef(id) {
  return GOAL_DEFS.find((g) => g.id === id) || null;
}
function goalLabelOf(id) {
  const g = goalDef(id);
  return g ? `${g.emoji} ${g.label}` : "";
}

function goalFit(p, goal) {
  if (!p) return false;
  const part = p.part || "zero";
  if (goal === "diet") {
    if (part === "zero") {
      /* 생수는 어느 목적에서나 단가 1등이라 결론이 무의미해져 뺐습니다 */
      return ["cola", "cider", "sparkling", "acv", "ion", "energy", "icetea", "tea"].includes(p.category);
    }
    if (part === "protein" && p.category !== "shake") {
      const s = numOrNull(p.sugarPerServing);
      const k = numOrNull(p.kcal_per_bottle);
      return (s != null && s <= 2) || (k != null && k <= 100);
    }
    if (part === "protein" && p.category === "shake") {
      const s = numOrNull(p.sugarPerServing);
      return s != null && s <= 2;
    }
    if (part === "meat" || part === "chicken") {
      const f = numOrNull(p.fatPer100g);
      return (f != null && f <= 5) || /가슴살|안심/.test(String(p.name || ""));
    }
    return false;
  }
  if (goal === "protein") {
    const g = numOrNull(p.protein_g_per_bottle);
    if (g != null && g >= 20) return true;
    const pp = numOrNull(p.proteinPer100g);
    return pp != null && pp >= 20;
  }
  if (goal === "value") {
    /* 생수·조리기구는 단가 비교의 의미가 달라 빼고, 단가를 낼 수 있는 것만 */
    if (p.category === "water" || p.category === "gadget") return false;
    return numOrNull(measureValue(p)) != null;
  }
  return true;
}

function goalKey(p, goal) {
  const disc = numOrNull(p.discountPct) || 0;
  /* 화면에 보이는 값(카드 대표가 = 제일 싼 판매처)과 순서를 맞춥니다 */
  const cv = typeof cheapView === "function" ? cheapView(p) : null;
  let per = numOrNull(measureValue(p));
  if (cv && numOrNull(cv.perValue) != null) per = numOrNull(cv.perValue);
  if (goal === "protein") {
    const v = numOrNull(p.protein20);
    return [v, per, -disc];
  }
  if (goal === "value") {
    const cmp = typeof compareFor === "function" ? compareFor(p) : null;
    return [cmp ? cmp.topPct : null, -disc, per];
  }
  return [per, -disc];
}

function cmpKeys(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i += 1) {
    const va = a[i] === undefined ? null : a[i];
    const vb = b[i] === undefined ? null : b[i];
    if (va == null && vb == null) continue;
    if (va == null) return 1;
    if (vb == null) return -1;
    if (va !== vb) return va - vb;
  }
  return 0;
}

function goalRank(list, goal) {
  return list
    .map((p, i) => ({ p, i, key: goalKey(p, goal) }))
    .sort((x, y) => cmpKeys(x.key, y.key) || x.i - y.i)
    .map((x) => x.p);
}

function goalList(goal) {
  const pool = typeof basePool === "function" ? basePool() : state.data.products || [];
  const items = (typeof collapseVariants === "function" ? collapseVariants(pool) : pool).filter((p) => goalFit(p, goal));
  return goalRank(items, goal);
}

function goalWhy(p, goal) {
  if (!p) return "";
  const bits = [];
  if (goal === "protein") {
    const g = numOrNull(p.protein_g_per_bottle);
    const v = numOrNull(p.protein20);
    if (g != null) bits.push(`단백질 ${fmtG(g)}g`);
    if (v != null) bits.push(`20g당 ${won(Math.round(v))}`);
    else if (numOrNull(measureValue(p)) != null) bits.push(`${measureLabel(p)} ${won(Math.round(measureValue(p)))}`);
    return bits.join(" · ");
  }
  if (goal === "value") {
    const cmp = typeof compareFor === "function" ? compareFor(p) : null;
    const disc = numOrNull(p.discountPct);
    if (cmp && cmp.count >= 3) bits.push(`${categoryLabel(p.category)} ${cmp.count}개 중 ${cmp.rank}위`);
    if (disc) bits.push(`정가보다 ${disc}% 할인`);
    if (!bits.length && numOrNull(measureValue(p)) != null) {
      bits.push(`${measureLabel(p)} ${won(Math.round(measureValue(p)))}`);
    }
    return bits.join(" · ");
  }
  const sugar = numOrNull(p.sugarPerServing);
  const kcal = numOrNull(p.kcal_per_bottle);
  if (sugar != null) bits.push(`당류 ${fmtG(sugar)}g`);
  else if (/제로/.test(`${p.name || ""}${p.kind || ""}`)) bits.push("제로");
  if (kcal != null) bits.push(`${kcal}kcal`);
  if (p.caffeine === "contains") bits.push("카페인 있음");
  else if (p.aspartame === "none") bits.push("아스파탐 없이");
  if (numOrNull(measureValue(p)) != null) bits.push(`${measureLabel(p)} ${won(Math.round(measureValue(p)))}`);
  return bits.slice(0, 3).join(" · ");
}

/* 결론 카드·추천 카드에 쓰는 이유 한 줄 — 근거가 한 마디뿐이면 꿀팁을 붙여 문장을 만듭니다 */
function reasonLine(p, goal) {
  const main = goalWhy(p, goal) || "";
  const segs = main.split(" · ").filter(Boolean);
  if (segs.length >= 2) return main;
  const tip = (tipOf(p) || "").split(" · ").filter(Boolean)[0];
  if (!tip) return main;
  return main ? `${main} · ${tip}` : tip;
}

/* 목적별 결론 카드 — "지금은 이거예요" */
function goalVerdictHTML(goal) {
  const list = goalList(goal);
  const g = goalDef(goal);
  if (!list.length) {
    return `<div class="gv"><p class="gv-empty">이 조건에 맞는 상품을 아직 못 찾았어요. 다른 목적을 눌러 보세요.</p></div>`;
  }
  const p = list[0];
  const view = cheapView(p);
  const head = `<p class="gv-head">
      <span class="gv-goal">${g.emoji} ${escapeHtml(g.label)}</span>
      <b>지금은 이거예요</b>
      <span class="gv-n">${list.length}개 중 1위</span>
      <button type="button" class="gv-x" data-goal="all" aria-label="목적 선택 해제">해제</button>
    </p>`;
  const photo = p.image
    ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async">`
    : "";
  const unit = numOrNull(measureValue(p)) != null ? `${measureLabel(p)} ${won(Math.round(measureValue(p)))}` : "";
  return `<div class="gv">
    ${head}
    <div class="gv-body">
      <span class="gv-photo">${photo}</span>
      <div class="gv-txt">
        <p class="gv-name">${escapeHtml(p.name)}</p>
        <p class="gv-why">💬 ${escapeHtml(reasonLine(p, goal) || tipOf(p))}</p>
      </div>
    </div>
    <div class="gv-foot">
      <span class="gv-price"><strong>${won(view.price)}</strong>${unit ? `<em>${escapeHtml(unit)}</em>` : ""}</span>
      <div class="gv-buys">${buyHTML(p)}</div>
      <button type="button" class="btn-icon gv-bell" data-alert="${escapeHtml(p.id)}" aria-label="이 상품 가격 알림">🔔</button>
    </div>
  </div>`;
}

/* 1분 결론 칩은 없앴습니다(재영 님 2026-11-18: "1분 결론은 빠지는 거긴 해").
   같은 목적별 추천은 홈 '🔥 오늘의 역대급 할인' 안의 카테고리 칩으로 옮겼습니다(js/app.js).
   여기서는 상단 알림 버튼 상태만 최신으로 맞춥니다. */
function renderGoalBar() {
  if (!state.data) return;
  hookAlertRefresh();
  refreshAlertCTA();
}

/* ── 상단 알림 버튼 상태 ──────────────────────────────── */

/* 새 초특가 전체 알림은 상품 알림 개수에서 빼고 따로 셉니다. */
const HUB_HOT_ID = "__hotdeal_all__";

function hubHotOn() {
  return typeof pushState !== "undefined" && pushState.alerts ? Boolean(pushState.alerts[HUB_HOT_ID]) : false;
}

function alertCount() {
  if (typeof pushState === "undefined" || !pushState.alerts) return 0;
  return Object.keys(pushState.alerts).filter((id) => id !== HUB_HOT_ID).length;
}

function refreshAlertCTA() {
  const btn = $("alert-cta");
  if (!btn) return;
  const n = alertCount();
  const hot = hubHotOn();
  const on = n > 0 || hot;
  /* r38 — 역대급 할인 제목 옆 작은 종 버튼은 숫자 배지만 쓰고, 라벨은 짧게
     r58 — 종은 헤더 오른쪽 동그란 버튼(.hdr-bell)으로 옮겼고, 숫자 배지는 그대로 것입니다. */
  const isBell = btn.classList.contains("spot-bell") || btn.classList.contains("hdr-bell");
  const lab = btn.querySelector(".smart-btn-lab");
  const num = btn.querySelector(".spot-bell-n");
  btn.classList.toggle("is-on", on);
  if (isBell) {
    if (lab) lab.textContent = on ? "알림 켜짐" : "알림";
    if (num) {
      num.hidden = !on;
      num.textContent = n > 0 ? String(n) : "";
      num.classList.toggle("is-dot", n === 0); /* 초특가 알림만 켰을 때는 점 하나 */
    }
  } else {
    btn.setAttribute("aria-pressed", String(on));
    if (lab) lab.textContent = n > 0 ? (hot ? `알림 ${n}개 + 초특가` : `알림 ${n}개 켜짐`) : hot ? "초특가 알림 켜짐" : "가격 내리면 알림";
  }
  btn.setAttribute(
    "aria-label",
    n > 0 || hot ? `알림 켜짐${hot ? " · 새 초특가 포함" : ""} · 알림 관리` : "가격 내리면 알림 받기"
  );
}

/* ── ③ 10초 맞춤 추천 ─────────────────────────────────── */

function recParts(kindId) {
  const k = KIND_DEFS.find((x) => x.id === kindId);
  return k ? k.parts : [];
}

function recPicks(goal, kind) {
  const parts = recParts(kind);
  const pool = (typeof basePool === "function" ? basePool() : state.data.products || []).filter(
    (p) => parts.includes(p.part || "zero") && goalFit(p, goal)
  );
  const collapsed = typeof collapseVariants === "function" ? collapseVariants(pool) : pool;
  let picks = goalRank(collapsed, goal).slice(0, 3);
  let relaxed = false;
  if (picks.length < 3) {
    const taken = new Set(picks.map((p) => p.id));
    const rest = (typeof basePool === "function" ? basePool() : state.data.products || []).filter(
      (p) => parts.includes(p.part || "zero") && !taken.has(p.id) && !goalFit(p, goal)
    );
    const fill = goalRank(typeof collapseVariants === "function" ? collapseVariants(rest) : rest, goal).slice(
      0,
      3 - picks.length
    );
    if (fill.length) relaxed = true;
    picks = picks.concat(fill);
  }
  return { picks, relaxed };
}

function recPickHTML(p, i, goal) {
  const view = cheapView(p);
  const s = signalOf(p);
  const meta = TL_LEVELS[s.level] || TL_LEVELS.none;
  const unit = numOrNull(measureValue(p)) != null ? `${measureLabel(p)} ${won(Math.round(measureValue(p)))}` : "";
  const why = reasonLine(p, goal) || tipOf(p);
  const tag = i === 0 ? `<span class="rec-best">가장 먼저</span>` : "";
  return `<article class="rec-pick">
    <div class="rec-pick-head">
      <span class="rec-rank">${i + 1}</span>
      <span class="rec-photo">${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async">` : ""}</span>
      <div class="rec-txt">
        ${tag}
        <p class="rec-name">${escapeHtml(p.name)}</p>
        <p class="rec-why">💬 ${escapeHtml(why)}</p>
      </div>
    </div>
    <div class="rec-foot">
      <span class="rec-price"><strong>${won(view.price)}</strong>${unit ? `<em>${escapeHtml(unit)}</em>` : ""}</span>
      <span class="tl tl-${s.level} tl-mini"><span class="tl-lab"><span class="tl-dot" aria-hidden="true">${meta.dot}</span>${meta.label}</span></span>
    </div>
    <div class="rec-acts">
      <button type="button" class="btn-icon rec-bell" data-alert="${escapeHtml(p.id)}" aria-label="이 상품 가격 알림">🔔</button>
      ${buyHTML(p)}
    </div>
  </article>`;
}

function recBodyHTML() {
  const goal = recState.goal;
  const kind = recState.kind;
  if (!goal) {
    return `<p class="rec-step">1/2 · 목적을 골라 주세요</p>
      <div class="rec-opts">${GOAL_DEFS.map(
        (g) =>
          `<button type="button" class="rec-opt" data-rec-goal="${g.id}"><b>${g.emoji} ${escapeHtml(
            g.label
          )}</b><em>${escapeHtml(goalHint(g.id))}</em></button>`
      ).join("")}</div>
      <p class="rec-fine">두 번만 누르면 끝나요. 가격·영양은 확인한 값만 씁니다.</p>`;
  }
  if (!kind) {
    return `<p class="rec-step">2/2 · 어떤 종류로 드실까요?</p>
      <div class="rec-picked"><span class="rec-tag">${goalLabelOf(goal)}</span><button type="button" class="rec-back" data-rec-back>← 목적 다시 고르기</button></div>
      <div class="rec-opts is-kind">${KIND_DEFS.map(
        (k) =>
          `<button type="button" class="rec-opt" data-rec-kind="${k.id}"><b>${k.emoji} ${escapeHtml(k.label)}</b><em>${escapeHtml(
            kindHint(k.id)
          )}</em></button>`
      ).join("")}</div>`;
  }
  const { picks, relaxed } = recPicks(goal, kind);
  const kdef = KIND_DEFS.find((k) => k.id === kind);
  const head = `<div class="rec-picked">
      <span class="rec-tag">${goalLabelOf(goal)} · ${kdef.emoji} ${escapeHtml(kdef.label)}</span>
      <button type="button" class="rec-back" data-rec-restart>다시 고르기</button>
    </div>`;
  if (!picks.length) {
    return `${head}<p class="rec-empty">이 조합에 맞는 상품이 없어요. 종류를 바꿔 보세요.</p>`;
  }
  return `${head}
    <p class="rec-res-lead">지금 조건에 맞는 <b>TOP ${picks.length}</b>${relaxed ? " · 조건에 맞는 게 적어 가까운 것도 넣었어요" : ""}</p>
    <div class="rec-list">${picks.map((p, i) => recPickHTML(p, i, goal)).join("")}</div>
    <p class="rec-fine">표시 가격은 마트가 마지막으로 확인한 값이에요. 구매 전 판매처에서 한 번 더 확인해 주세요.</p>`;
}

function goalHint(id) {
  if (id === "diet") return "당류 적고 가볍게";
  if (id === "protein") return "단백질 20g 이상";
  return "단위당 가격 최저";
}
function kindHint(id) {
  if (id === "drink") return "제로음료·생수";
  if (id === "shake") return "마시는 단백질·가루 쉐이크";
  return "닭가슴살·안심·소·돼지고기";
}

function renderRec() {
  const body = $("rec-body");
  if (!body) return;
  body.innerHTML = recBodyHTML();
  body.scrollTop = 0;
}

function openRec() {
  const modal = $("rec-modal");
  if (!modal) return;
  renderRec();
  modal.hidden = false;
  document.body.classList.add("modal-open");
  const x = $("rec-x");
  if (x) x.focus({ preventScroll: true });
}

function closeRec() {
  const modal = $("rec-modal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  releaseModalLock();
}

function releaseModalLock() {
  const open = document.querySelector(
    ".pm-modal:not([hidden]), .install-modal:not([hidden]), .alert-modal:not([hidden]), .hub-modal:not([hidden]), .info-modal:not([hidden])"
  );
  if (!open) document.body.classList.remove("modal-open");
}

/* ── 🔔 알림 허브 (상단 알림 버튼) ──────────────────────── */

function alertHubHTML() {
  const picks = typeof hubPicks === "function" ? hubPicks(6) : typeof spotlightPicks === "function" ? spotlightPicks(6) : [];
  const on = typeof pushState !== "undefined" && pushState.alerts ? pushState.alerts : {};
  /* 상품 알림만 목록에 올립니다(__hotdeal_all__ 은 맨 위 전용 카드가 따로 그립니다) */
  const ids = Object.keys(on).filter((id) => id !== HUB_HOT_ID);
  const findProduct = (id) => (state.data.products || []).find((p) => p.id === id);
  /* r59 — 목표가 알림 목록: 상품·현재가·걸어 둔 목표가를 보여 주고, 각 줄에 삭제(✕) 버튼 */
  const mine = ids
    .map((id) => ({ id, rec: on[id] || {}, p: findProduct(id) }))
    .filter((x) => x.p)
    .slice(0, 8);
  const rowHTML = (p, isOn, rec) => {
    const view = cheapView(p);
    const unit = numOrNull(measureValue(p)) != null ? `${measureLabel(p)} ${won(Math.round(measureValue(p)))}` : "";
    const target = isOn && rec && rec.target ? ` · 목표 ${won(rec.target)} 이하` : "";
    const name = escapeHtml(p.name);
    return `<div class="hub-row${isOn ? " is-on" : ""}">
      <button type="button" class="hub-open" data-alert="${escapeHtml(p.id)}" aria-label="${name} 알림 ${
      isOn ? "설정 바꾸기" : "켜기"
    }">
        <span class="hub-photo">${p.image ? `<img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async">` : ""}</span>
        <span class="hub-txt"><b>${escapeHtml(p.name)}</b><em>${won(view.price)}${unit ? ` · ${escapeHtml(
      unit
    )}` : ""}${target}</em></span>
      </button>
      ${
        isOn
          ? `<button type="button" class="hub-del" data-alert-del="${escapeHtml(p.id)}" aria-label="${name} 알림 삭제" title="알림 삭제">✕</button>`
          : `<span class="hub-bell" aria-hidden="true">🔔</span>`
      }
    </div>`;
  };
  const mineBlock = mine.length
    ? `<p class="hub-sec">내가 걸어 둔 목표가 알림 <b>${ids.length}개</b><span class="hub-sec-hint">✕ 를 누르면 지워져요</span></p>
       <div class="hub-list">${mine.map((x) => rowHTML(x.p, true, x.rec)).join("")}</div>`
    : `<p class="hub-sec">내가 걸어 둔 목표가 알림</p>
       <p class="hub-empty">아직 걸어 둔 알림이 없어요. 아래 상품을 눌러 <b>목표가</b>를 정하면 그 가격 이하로 내려갈 때 알려드려요.</p>`;
  const pickBlock = picks.length
    ? `<p class="hub-sec">지금 많이 보는 상품</p>
       <div class="hub-list">${picks
         .filter((p) => !mine.some((m) => m.p.id === p.id))
         .map((p) => rowHTML(p, false, null))
         .join("")}</div>`
    : "";
  return `${typeof hotdealCardHTML === "function" ? hotdealCardHTML() : ""}
    <p class="hub-lead">아래에서 관심 상품을 골라 <b>목표가</b>를 정할 수도 있어요. 목표가 이하로 내려갈 때 <b>딱 한 번</b> 알려드려요.</p>
    ${mineBlock}
    ${pickBlock}
    <p class="hub-fine">전화번호·이메일은 받지 않고, 브라우저 구독으로만 보내요. 아이폰은 홈 화면에 추가한 뒤에 알림을 켤 수 있어요(16.4 이상).</p>`;
}

function openAlertHub() {
  const modal = $("hub-modal");
  const body = $("hub-body");
  if (!modal || !body) return;
  body.innerHTML = alertHubHTML();
  body.scrollTop = 0;
  modal.hidden = false;
  document.body.classList.add("modal-open");
  const x = $("hub-x");
  if (x) x.focus({ preventScroll: true });
}

/* 허브가 열려 있을 때만 다시 그립니다(토글·알림 저장 뒤) */
function refreshAlertHub() {
  const modal = $("hub-modal");
  const body = $("hub-body");
  if (!modal || !body || modal.hidden) return;
  const scroll = body.scrollTop;
  body.innerHTML = alertHubHTML();
  body.scrollTop = scroll;
}

function closeAlertHub() {
  const modal = $("hub-modal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  releaseModalLock();
}

/* ── 이벤트 ───────────────────────────────────────────── */

function initSmart() {
  document.addEventListener("click", (e) => {
    const goalBtn = e.target.closest("[data-goal]");
    if (goalBtn) {
      const id = goalBtn.getAttribute("data-goal");
      state.goal = state.goal === id ? "all" : id;
      state.limit.home = 24;
      paint();
      if (state.goal !== "all") {
        const box = $("goal-verdict");
        if (box && typeof box.scrollIntoView === "function") box.scrollIntoView({ behavior: "smooth", block: "nearest" });
      }
      return;
    }
    if (e.target.closest("#rec-open")) {
      openRec();
      return;
    }
    if (e.target.closest("[data-rec-goal]")) {
      recState.goal = e.target.closest("[data-rec-goal]").getAttribute("data-rec-goal");
      recState.kind = null;
      renderRec();
      return;
    }
    if (e.target.closest("[data-rec-kind]")) {
      recState.kind = e.target.closest("[data-rec-kind]").getAttribute("data-rec-kind");
      renderRec();
      return;
    }
    if (e.target.closest("[data-rec-back]")) {
      recState.goal = null;
      recState.kind = null;
      renderRec();
      return;
    }
    if (e.target.closest("[data-rec-restart]")) {
      recState.goal = null;
      recState.kind = null;
      renderRec();
      return;
    }
    if (e.target.closest("#rec-x")) {
      closeRec();
      return;
    }
    const recModal = $("rec-modal");
    if (recModal && !recModal.hidden && e.target === recModal) {
      closeRec();
      return;
    }
    if (e.target.closest("#alert-cta")) {
      openAlertHub();
      return;
    }
    if (e.target.closest("#hub-x")) {
      closeAlertHub();
      return;
    }
    const hub = $("hub-modal");
    if (hub && !hub.hidden && e.target === hub) {
      closeAlertHub();
      return;
    }
  });

  document.addEventListener("keydown", (e) => {
    if (e.key !== "Escape") return;
    closeRec();
    closeAlertHub();
  });

  /* 알림을 켜고 끈 뒤 상단 버튼 숫자 갱신 */
  hookAlertRefresh();
  refreshAlertCTA();
}

/* push.js의 refreshAlertButtons 뒤에 상단 버튼 갱신을 덧붙인다.
   (initSmart는 push.js보다 먼저 실행되므로 실제 호출 시점에 한 번 더 붙입니다) */
function hookAlertRefresh() {
  const prevRefresh = typeof refreshAlertButtons === "function" ? refreshAlertButtons : null;
  if (!prevRefresh || prevRefresh.__smart) return;
  window.refreshAlertButtons = function () {
    prevRefresh.apply(this, arguments);
    refreshAlertCTA();
    refreshAlertHub();
  };
  window.refreshAlertButtons.__smart = true;
}
