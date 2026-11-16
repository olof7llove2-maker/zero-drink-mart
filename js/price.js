/* ── 가격 추이 · 비교 분석 ──────────────────────────────
   과거 값은 data/price-history.json 에 있는 실제 관측 기록만 씁니다.
   기록이 없는 상품은 "추적 시작" 상태로 정가 대비 비교만 보여 줍니다. */

function unitPer(p) {
  return measureValue(p);
}

function unitName(p) {
  /* measureLabel은 "100g당"처럼 단위 뒤에 '당'이 붙어 있어요. 아래 문장에서 다시 '당'을 붙이므로 떼어 냅니다. */
  return String(measureLabel(p) || "").replace(/당$/, "");
}

const compareCache = new Map();

function compareInfo(key, predicate) {
  if (compareCache.has(key)) return compareCache.get(key);
  const rows = (state.data.products || [])
    .filter(predicate)
    .map((x) => ({ p: x, v: unitPer(x) }))
    .filter((x) => x.v != null);
  const avg = rows.length ? rows.reduce((s, x) => s + x.v, 0) / rows.length : null;
  const info = { rows, avg, count: rows.length };
  compareCache.set(key, info);
  return info;
}

function categoryCompare(p) {
  return compareInfo(`cat:${p.category}`, (x) => x.category === p.category);
}

/* 고기 파트 전체(100g 기준)와 비교 — 조리기구는 중량이 없어 뺀다 */
function meatCompare(p) {
  return compareInfo("meat", (x) => isMeat(x) && !isGadget(x));
}

function compareIn(info, p) {
  const v = unitPer(p);
  if (v == null || !info.count) return null;
  const lower = info.rows.filter((x) => x.v < v).length;
  const equal = info.rows.filter((x) => x.v === v).length;
  const rank = lower + 1;
  const topPct = Math.round(((lower + Math.ceil(equal / 2)) / info.count) * 100);
  const diffPct = Math.round(((info.avg - v) / info.avg) * 100);
  return {
    value: v,
    avg: info.avg,
    count: info.count,
    rank,
    topPct: Math.max(1, Math.min(100, topPct)),
    diffPct,
    diffWon: Math.round(info.avg - v),
  };
}

function compareFor(p) {
  return compareIn(categoryCompare(p), p);
}

function wonShort(n) {
  return Number(n).toLocaleString("ko-KR");
}

function mdLabel(dateStr) {
  if (!dateStr) return "";
  const parts = String(dateStr).slice(5).split("-");
  return `${Number(parts[0])}/${Number(parts[1])}`;
}

function cmpMini(p) {
  const cmp = compareFor(p);
  const bits = [];
  if (cmp && cmp.count >= 3) {
    if (cmp.diffPct >= 5) {
      bits.push(`<span class="cmp-tag is-good">평균보다 ${cmp.diffPct}% 저렴</span>`);
    } else if (cmp.diffPct <= -5) {
      bits.push(`<span class="cmp-tag is-high">평균보다 ${Math.abs(cmp.diffPct)}% 비쌈</span>`);
    } else {
      bits.push(`<span class="cmp-tag is-mid">카테고리 평균 수준</span>`);
    }
    if (cmp.count >= 3) {
      bits.push(`<span class="cmp-tag is-rank">${cmp.count}개 중 ${cmp.rank}위</span>`);
    }
  }
  if (!bits.length) return "";
  return `<div class="cmp-row">${bits.join("")}</div>`;
}

function chartButton(p) {
  const entry = state.priceHistory ? state.priceHistory[p.id] : null;
  const hasHistory = entry && entry.status === "history" && (entry.series || []).length > 1;
  const sub = hasHistory
    ? `관측 최저 ${wonShort(entry.stats.min)}원`
    : p.listPrice
    ? "추적 시작 · 정가 대비"
    : "추적 시작 · 매일 기록";
  return `<button type="button" class="chart-btn" data-chart="${escapeHtml(p.id)}">
    📊 가격 추이·비교 <span class="chart-btn-sub">${escapeHtml(sub)}</span>
  </button>`;
}

function signedPhrase(price, base, unitLabel) {
  if (base == null || price == null || !base) return "";
  const diff = base - price;
  const pct = Math.round((Math.abs(diff) / base) * 100);
  if (Math.abs(diff) < 1) return "같은 수준이에요";
  if (diff > 0) {
    return `${wonShort(diff)}원(약 ${pct}%) <b class="minus">더 싸요</b>`;
  }
  return `${wonShort(-diff)}원(약 ${pct}%) <b class="plus">더 비싸요</b>`;
}

function priceChartSVG(entry, cardPrice) {
  const series = (entry.series || []).filter((s) => s && Number.isFinite(s.price));
  if (series.length < 2) return "";
  const st = entry.stats || {};
  const W = 340;
  const H = 178;
  const padL = 46;
  const padR = 12;
  const padT = 14;
  const padB = 26;
  const values = series.map((s) => s.price);
  if (cardPrice != null) values.push(cardPrice);
  let lo = Math.min(...values);
  let hi = Math.max(...values);
  if (hi === lo) {
    const bump = Math.max(100, Math.round(lo * 0.04));
    hi += bump;
    lo = Math.max(0, lo - bump);
  }
  const span = hi - lo;
  const t0 = Date.parse(series[0].ts);
  const t1 = Date.parse(series[series.length - 1].ts);
  const px = (ts) => {
    const r = t1 === t0 ? 0.5 : (Date.parse(ts) - t0) / (t1 - t0);
    return padL + Math.max(0, Math.min(1, r)) * (W - padL - padR);
  };
  const py = (v) => padT + (1 - (v - lo) / span) * (H - padT - padB);
  const pts = series.map((s) => [px(s.ts), py(s.price)]);
  const line = pts
    .map((pt, i) => `${i ? "L" : "M"}${pt[0].toFixed(1)} ${pt[1].toFixed(1)}`)
    .join(" ");
  const last = pts[pts.length - 1];
  const area = `${line} L${last[0].toFixed(1)} ${H - padB} L${pts[0][0].toFixed(1)} ${H - padB} Z`;

  const grid = [0, 0.5, 1]
    .map((f) => {
      const v = lo + span * f;
      const yy = py(v);
      return `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="#eae4da" stroke-width="1"/>
        <text x="${padL - 6}" y="${(yy + 3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#8a847c">${wonShort(Math.round(v))}</text>`;
    })
    .join("");

  const avgY = st.avg != null ? py(st.avg) : null;
  const avgLine =
    avgY != null
      ? `<line x1="${padL}" y1="${avgY.toFixed(1)}" x2="${W - padR}" y2="${avgY.toFixed(1)}" stroke="#2563eb" stroke-width="1.3" stroke-dasharray="4 3"/>
         <text x="${W - padR}" y="${(avgY - 4).toFixed(1)}" text-anchor="end" font-size="8.5" fill="#2563eb">평균 ${wonShort(st.avg)}</text>`
      : "";

  const maxPoint = series.reduce((a, b) => (b.price > a.price ? b : a), series[0]);
  const minPoint = series.reduce((a, b) => (b.price < a.price ? b : a), series[0]);
  const markers = `
    <circle cx="${px(maxPoint.ts).toFixed(1)}" cy="${py(maxPoint.price).toFixed(1)}" r="3.4" fill="#2f6b4f" stroke="#fff" stroke-width="1.4"/>
    <circle cx="${px(minPoint.ts).toFixed(1)}" cy="${py(minPoint.price).toFixed(1)}" r="3.4" fill="#d94b2b" stroke="#fff" stroke-width="1.4"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3" fill="#171412" stroke="#fff" stroke-width="1.4"/>`;

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(
    entry.name || "상품"
  )} 가격 추이 그래프">
    <defs>
      <linearGradient id="pmGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#2f6b4f" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#2f6b4f" stop-opacity="0.01"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${area}" fill="url(#pmGrad)"/>
    <path d="${line}" fill="none" stroke="#2f6b4f" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${avgLine}
    ${markers}
    <text x="${padL}" y="${H - 8}" font-size="9" fill="#8a847c">${mdLabel(series[0].date)}</text>
    <text x="${W - padR}" y="${H - 8}" text-anchor="end" font-size="9" fill="#8a847c">${mdLabel(
      series[series.length - 1].date
    )}</text>
  </svg>`;
}

function historyBlock(p, entry) {
  const st = entry.stats || {};
  const series = entry.series || [];
  const price = p.price;
  const first = series.length ? series[0].date : "";
  const lastDate = series.length ? series[series.length - 1].date : "";
  const warn =
    entry.couprice && entry.couprice.crosscheck && entry.couprice.crosscheck.sourceWarnsVolatile
      ? `<p class="pm-warn">쿠프라이스도 이 상품은 <b>옵션·묶음 구성이 바뀌며 수집 가격이 크게 오르내린다</b>고 표시해요. 최고가·최저가는 지금 구성(묶음 수량)의 가격이 아닐 수 있어서, 비교는 평균가와 카테고리 기준으로 했어요.</p>`
      : "";
  const mismatch =
    price != null && st.latest != null && Math.abs(price - st.latest) >= 1
      ? `<p class="pm-fine">그래프 마지막 점 ${won(st.latest)}은 ${mdLabel(st.latestDate)} 관측가이고, 카드에 적힌 ${won(
          price
        )}은 ${escapeHtml(p.priceCheckedLabel || p.priceCheckedAt || "확인 시점")} 가격이에요. 확인 시점이 달라 조금 다를 수 있어요.</p>`
      : "";
  return `
    <div class="pm-stats">
      <div class="pm-stat pm-max">
        <span class="pm-k">최고가</span>
        <strong>${won(st.max)}</strong>
        <em>${mdLabel(st.maxDate)}</em>
      </div>
      <div class="pm-stat pm-avg">
        <span class="pm-k">평균가</span>
        <strong>${won(st.avg)}</strong>
        <em>관측 ${st.observations}회 평균</em>
      </div>
      <div class="pm-stat pm-min">
        <span class="pm-k">최저가</span>
        <strong>${won(st.min)}</strong>
        <em>${mdLabel(st.minDate)}</em>
      </div>
    </div>
    <div class="pm-chart">
      ${priceChartSVG(entry, price)}
      <div class="pm-legend">
        <span><i style="background:#2f6b4f"></i>판매가</span>
        <span><i style="background:#2563eb"></i>평균가(점선)</span>
        <span><b class="pm-dot" style="background:#2f6b4f"></b>최고가</span>
        <span><b class="pm-dot" style="background:#d94b2b"></b>최저가</span>
      </div>
    </div>
    <p class="pm-fine">${mdLabel(first)} ~ ${mdLabel(
      lastDate
    )} 사이에 쿠프라이스가 쿠팡 판매가를 확인한 ${st.observations}개 값이에요. 확인하지 않은 날의 값은 넣지 않았어요.</p>
    ${warn}
    ${mismatch}`;
}

function trackingBlock(p, entry) {
  const list = p.listPrice;
  const now = p.price;
  const series = (entry && entry.series) || [];
  const startDate = series.length ? series[0].date : "2026-11-16";
  const pct = p.discountPct || (list && now ? Math.round(((list - now) / list) * 100) : null);
  const detail = entry && entry.statusDetail;
  const reason = !entry
      ? "과거 가격 기록을 아직 불러오지 못했어요."
    : detail === "ok"
      ? "아직 관측 기록이 하루치뿐이에요."
    : detail === "item-mismatch"
      ? "이 상품은 같은 상품 페이지의 다른 옵션 기록만 있어서, 그 기록은 쓰지 않았어요."
      : detail === "no-records"
      ? "아직 이 상품의 판매가 관측 기록이 없어요."
      : detail === "fetch-error"
      ? "과거 기록을 확인하지 못했어요. 다음 수집 때 다시 확인해요."
      : p.platform === "toss"
      ? "토스에서 파는 상품이라 쿠팡 과거 관측 기록이 없어요."
      : "이 상품은 아직 과거 관측 기록이 없어요.";
  const max = list || now;
  const listPct = max ? Math.round((now / max) * 100) : 0;
  const bars =
    list && now
      ? `<div class="pm-bars">
          <div class="pm-bar-row">
            <span class="pm-bar-label">정가</span>
            <div class="pm-bar-track"><div class="pm-bar-fill is-list" style="width:100%"></div></div>
            <span class="pm-bar-value">${won(list)}</span>
          </div>
          <div class="pm-bar-row">
            <span class="pm-bar-label">현재가</span>
            <div class="pm-bar-track"><div class="pm-bar-fill is-now" style="width:${listPct}%"></div></div>
            <span class="pm-bar-value">${won(now)}${pct ? ` (-${pct}%)` : ""}</span>
          </div>
        </div>`
      : "";
  return `
    <div class="pm-track">
      <p class="pm-track-start">${longDate(startDate)} 추적 시작 · 기록이 쌓이는 중</p>
      <p class="pm-track-desc">${escapeHtml(reason)} 오늘 확인한 가격을 첫 점으로 저장했어요. 기록이 쌓이면 여기에 실제 꺾은선 그래프가 그려져요.</p>
      ${bars}
    </div>`;
}

function longDate(dateStr) {
  if (!dateStr) return "";
  const [y, m, d] = String(dateStr).slice(0, 10).split("-");
  return `${y}년 ${Number(m)}월 ${Number(d)}일`;
}

function positionBlock(p, entry) {
  const hist = entry && entry.status === "history" ? entry.stats : null;
  const volatile =
    entry && entry.couprice && entry.couprice.crosscheck && entry.couprice.crosscheck.sourceWarnsVolatile;
  const rows = [];
  const price = p.price;
  if (price == null) {
    return `<div class="pm-block"><h4>① 내 가격 위치</h4><ul class="pm-list"><li>가격 정보가 없어 비교할 수 없어요.</li></ul></div>`;
  }
  if (p.listPrice && p.listPrice > 0) {
    rows.push(`정가 ${won(p.listPrice)} 기준 ${signedPhrase(price, p.listPrice)}`);
  }
  if (hist && hist.max != null) {
    if (volatile) {
      rows.push(`관측 평균가 ${won(hist.avg)} 대비 ${signedPhrase(price, hist.avg)}`);
      rows.push(
        `관측 가격대 ${won(hist.min)} ~ ${won(hist.max)} · 옵션·묶음 구성이 바뀐 값이 섞였을 수 있어 최저가·최고가 대비는 단정하지 않았어요.`
      );
    } else {
      rows.push(`관측 최고가 ${won(hist.max)} 대비 ${signedPhrase(price, hist.max)}`);
      rows.push(`관측 평균가 ${won(hist.avg)} 대비 ${signedPhrase(price, hist.avg)}`);
      rows.push(`관측 최저가 ${won(hist.min)} 대비 ${signedPhrase(price, hist.min)}`);
    }
  } else if (rows.length) {
    rows.push("과거 관측 기록은 아직 없어요. 오늘 확인한 가격부터 하루 단위로 쌓고 있어요.");
  } else {
    rows.push("정가와 과거 기록이 아직 없어 비교할 값이 없어요. 기록이 쌓이면 평균가·최저가와 비교해 드릴게요.");
  }
  return `<div class="pm-block">
    <h4>① 내 가격 위치</h4>
    <ul class="pm-list">${rows.map((r) => `<li>${r}</li>`).join("")}</ul>
  </div>`;
}

function categoryBlock(p) {
  const cmp = compareFor(p);
  const label = (state.data.categories || []).find((c) => c.id === p.category);
  const catName = label ? label.label : p.category;
  const u = unitName(p);
  if (!cmp || cmp.count < 2) {
    return `<div class="pm-block">
      <h4>② 카테고리 내 가성비 비교</h4>
      <ul class="pm-list"><li>같은 분류(${escapeHtml(
        catName
      )})에 비교할 상품이 적어 ${u}당 비교를 하지 않았어요.</li></ul>
    </div>`;
  }
  const cheaper = cmp.diffWon >= 0;
  const head = `<li><b>${escapeHtml(catName)}</b> ${cmp.count}개 중 ${u}당 가격이 <b>${
    cmp.rank
  }번째로 낮아요</b>(상위 ${cmp.topPct}%).</li>`;
  const line = `<li>카테고리 평균 <b>${wonShort(Math.round(cmp.avg))}원/${u}</b> · 이 상품 <b>${wonShort(
    cmp.value
  )}원/${u}</b> → ${u}당 ${cheaper ? `<b class="minus">${wonShort(cmp.diffWon)}원 저렴</b>` : `<b class="plus">${wonShort(-cmp.diffWon)}원 비쌈</b>`}</li>`;
  const each = p.unitEach ? `<li>${escapeHtml(p.unitEach)}</li>` : "";
  let meatLine = "";
  if (isMeat(p) && !isGadget(p)) {
    const mc = compareIn(meatCompare(p), p);
    if (mc && mc.count >= 3) {
      meatLine = `<li>식단 고기 <b>${mc.count}개 전체</b> 100g당 평균 <b>${wonShort(
        Math.round(mc.avg)
      )}원</b> · 이 상품 <b>${wonShort(mc.value)}원</b> → ${
        mc.diffWon >= 0
          ? `<b class="minus">100g당 ${wonShort(mc.diffWon)}원 저렴</b>`
          : `<b class="plus">100g당 ${wonShort(-mc.diffWon)}원 비쌈</b>`
      }</li>`;
    }
  }
  const gadgetNote = isGadget(p)
    ? `<li>조리기구는 중량이 없어 <b>개당 가격</b>으로만 비교했어요.</li>`
    : "";
  const ratingLine =
    p.rating != null
      ? `<li>쿠팡 평점 <b>★ ${Number(p.rating).toFixed(1)}</b>${
          p.reviewCount != null ? ` · 리뷰 ${Number(p.reviewCount).toLocaleString("ko-KR")}개` : ""
        }</li>`
      : "";
  let perGram = "";
  if (p.category === "protein") {
    const g = proteinPerG(p);
    const vals = (state.data.products || [])
      .filter((x) => x.category === "protein")
      .map((x) => proteinPerG(x))
      .filter((v) => v != null);
    if (g != null && vals.length >= 3) {
      const avgG = Math.round(vals.reduce((s, v) => s + v, 0) / vals.length);
      perGram = `<li>단백질 1g당 <b>${won(g)}</b> · 같은 분류 평균 ${won(avgG)} → ${
        g <= avgG ? `<b class="minus">1g당 ${won(avgG - g)} 저렴</b>` : `<b class="plus">1g당 ${won(g - avgG)} 비쌈</b>`
      }</li>`;
    }
  }
  return `<div class="pm-block">
    <h4>② 카테고리 내 가성비 비교</h4>
    <ul class="pm-list">${head}${line}${meatLine}${gadgetNote}${perGram}${ratingLine}${each}</ul>
  </div>`;
}

function verdictBlock(p, entry) {
  const cmp = compareFor(p);
  const st = entry && entry.status === "history" ? entry.stats : null;
  const volatile =
    entry && entry.couprice && entry.couprice.crosscheck && entry.couprice.crosscheck.sourceWarnsVolatile;
  const bits = [];
  if (cmp && cmp.count >= 3) {
    if (cmp.topPct <= 25) bits.push(`같은 분류 가성비 상위 ${cmp.topPct}%`);
    else if (cmp.diffPct >= 10) bits.push(`분류 평균보다 ${cmp.diffPct}% 저렴`);
    else if (cmp.diffPct <= -10) bits.push(`분류 평균보다 ${Math.abs(cmp.diffPct)}% 비싼 편`);
    else bits.push("분류 평균 수준");
  }
  if (p.discountPct && p.discountPct >= 20) bits.push(`정가 대비 ${p.discountPct}% 할인 중`);
  if (st && p.price != null && st.min) {
    const toMin = Math.round((p.price / st.min - 1) * 100);
    if (p.price <= st.min) bits.push("관측 최저가와 같은 수준");
    else if (toMin <= 5) bits.push("관측 최저가에 가까워요");
    else if (volatile && st.avg) {
      const vsAvg = Math.round((p.price / st.avg - 1) * 100);
      bits.push(vsAvg <= 0 ? `관측 평균보다 ${Math.abs(vsAvg)}% 낮아요` : `관측 평균보다 ${vsAvg}% 높아요`);
    } else if (!volatile && st.avg && p.price < st.avg) {
      bits.push(`관측 평균보다 ${Math.round((1 - p.price / st.avg) * 100)}% 낮아요`);
    } else {
      bits.push("관측 평균보다 높아요 · 급하지 않으면 기다릴 만");
    }
  } else {
    bits.push("오늘부터 가격 기록 시작");
  }
  if (!bits.length) bits.push("가격 정보를 모으는 중");
  return `<div class="pm-verdict">${escapeHtml(bits.slice(0, 3).join(" · "))}</div>`;
}

/* 5단계 등급 — 이력 14일 이상 + 같은 용기·브랜드 시세가 있을 때만 */
function gradeBlock(p) {
  if (typeof gradeForProduct !== "function") return "";
  if (p.category === "gadget") {
    return `<div class="pm-block"><h4>지금 사도 될까?</h4><ul class="pm-list"><li>조리기구는 중량이 없어 개당 가격으로만 비교했어요.</li></ul></div>`;
  }
  const g = gradeForProduct(p);
  if (g) {
    return `<div class="pm-block"><h4>지금 사도 될까?</h4>
      <div class="grade-line" style="margin:2px 0 8px"><span class="grade-badge ${g.band.cls}">${g.band.id}</span>
        <span class="grade-note">${escapeHtml(g.market.label)} <b>${won(Math.round(g.market.value))}</b>원/${g.label} 대비 <b>${signedPct(g.pct)}</b></span></div>
      <ul class="pm-list"><li>${escapeHtml(g.band.verdict)}</li>
        <li>${escapeHtml(g.market.label)}는 같은 용기 안 같은 브랜드 상품 ${g.market.sample}개의 단가 중간값이고, 이 상품은 ${g.days}일 관측 기록이 있어요.</li></ul></div>`;
  }
  const days = historyDaysOf(p.id);
  const market = marketForProduct(p);
  const why = !days
    ? `관측 기록이 ${GRADE_MIN_DAYS}일에 못 미쳐 아직 등급을 매기지 않았어요. 기록이 쌓이면 자동으로 붙어요.`
    : !market
    ? "같은 용기·같은 분류에 비교할 시세 표본이 적어 등급을 매기지 않았어요."
    : "단가를 계산할 수 없어 등급을 매기지 않았어요.";
  return `<div class="pm-block"><h4>지금 사도 될까?</h4><ul class="pm-list"><li>${why}</li></ul></div>`;
}

function priceModalHTML(p, entry) {
  const hasHistory = entry && entry.status === "history" && (entry.series || []).length > 1;
  const src = hasHistory
    ? `쿠프라이스 관측 기록 · ${entry.stats.days}일 · ${entry.stats.observations}회 확인`
    : `마트 확인 기록 · ${escapeHtml(p.priceCheckedLabel || p.priceCheckedAt || "")}`;
  const st = hasHistory ? entry.stats : null;
  const headline =
    st && p.price != null
      ? `관측 최고가 대비 <b>${Math.round(((st.max - p.price) / st.max) * 100)}%</b> 낮은 가격`
      : "";
  return `
    <p class="pm-eyebrow">가격 추이 · 비교 분석</p>
    <h2 class="pm-title" id="pm-title">${escapeHtml(p.name)}</h2>
    <p class="pm-src">${src}${headline ? ` · ${headline}` : ""}</p>
    ${p.note ? `<p class="pm-fine">${escapeHtml(p.note)}</p>` : ""}
    ${gradeBlock(p)}
    ${hasHistory ? historyBlock(p, entry) : trackingBlock(p, entry)}
    <h3 class="pm-h3">비교 분석</h3>
    ${positionBlock(p, entry)}
    ${categoryBlock(p)}
    ${verdictBlock(p, entry)}
    ${typeof alertInlineHTML === "function" ? alertInlineHTML(p) : ""}
    <p class="pm-foot">
      ${
        hasHistory
          ? `과거 가격은 <a href="https://www.couprice.co.kr" target="_blank" rel="noopener noreferrer">쿠프라이스</a>가 쿠팡 판매가를 확인해 남긴 기록이에요. 확인 사이에 바뀐 가격은 반영되지 않고, 옵션·쿠폰·배송비에 따라 실제 결제 금액은 달라질 수 있어요.`
          : `이 상품은 아직 과거 관측 기록이 없어 오늘 확인한 가격만 있어요. 기록이 쌓이면 실제 꺾은선 그래프로 바뀌어요.`
      }
      가격은 바뀔 수 있으니 구매 전 판매처에서 확인해 주세요.
    </p>`;
}

function openPriceModal(id) {
  const p = (state.data.products || []).find((x) => x.id === id);
  if (!p) return;
  const entry = state.priceHistory ? state.priceHistory[p.id] : null;
  const body = $("pm-body");
  if (!body) return;
  body.innerHTML = priceModalHTML(p, entry);
  body.scrollTop = 0;
  const modal = $("price-modal");
  modal.hidden = false;
  document.body.classList.add("modal-open");
  const x = $("pm-x");
  if (x) x.focus({ preventScroll: true });
}

function closePriceModal() {
  const modal = $("price-modal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  if (!document.querySelector(".install-modal:not([hidden])")) {
    document.body.classList.remove("modal-open");
  }
}

function initPriceModal() {
  document.addEventListener("click", (e) => {
    const btn = e.target.closest("[data-chart]");
    if (btn) {
      openPriceModal(btn.getAttribute("data-chart"));
      return;
    }
    const modal = $("price-modal");
    if (modal && !modal.hidden && e.target === modal) closePriceModal();
  });
  const x = $("pm-x");
  if (x) x.addEventListener("click", closePriceModal);
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closePriceModal();
  });
}

async function loadPriceHistory() {
  try {
    const res = await fetch("data/price-history.json", { cache: "no-store" });
    if (!res.ok) throw new Error("no history");
    const json = await res.json();
    state.priceHistory = json.products || {};
    state.priceMeta = json.meta || {};
  } catch {
    state.priceHistory = {};
  }
}
