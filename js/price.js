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

/* r62 — 같은 축(닭가슴살·안심 / 소·돼지고기) 안에서만 100g당으로 비교한다.
   닭가슴살과 소고기를 한 줄에 세우면 100g 단가 차이가 커서 비교가 의미를 잃는다. */
function meatPartOf(p) {
  return p && p.part === "chicken" ? "chicken" : "meat";
}
function meatPartLabel(p) {
  return meatPartOf(p) === "chicken" ? "닭가슴살·안심" : "소·돼지고기";
}
function meatCompare(p) {
  const part = meatPartOf(p);
  return compareInfo("meat", (x) => isMeat(x) && !isGadget(x) && meatPartOf(x) === part);
}

/* r59 — 식단 고기를 '단백질 20g당 가격'으로 비교. 함량 참고치가 있는 고기끼리만. */
function protein20Compare(p) {
  if (!isMeat(p) || isGadget(p)) return null;
  if (typeof protein20Info !== "function") return null;
  const info = protein20Info(p, null);
  if (!info) return null;
  const rows = (state.data.products || [])
    .filter((x) => isMeat(x) && !isGadget(x) && meatPartOf(x) === meatPartOf(p))
    .map((x) => protein20Info(x, null))
    .filter((x) => x && typeof x.value === "number");
  if (rows.length < 3) return null;
  const lower = rows.filter((x) => x.value < info.value).length;
  const avg = Math.round(rows.reduce((s, x) => s + x.value, 0) / rows.length);
  return { value: info.value, count: rows.length, rank: lower + 1, avg };
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
      return `<line x1="${padL}" y1="${yy.toFixed(1)}" x2="${W - padR}" y2="${yy.toFixed(1)}" stroke="#ece9e3" stroke-width="1"/>
        <text x="${padL - 6}" y="${(yy + 3.5).toFixed(1)}" text-anchor="end" font-size="9" fill="#8c867f">${wonShort(Math.round(v))}</text>`;
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
    <circle cx="${px(maxPoint.ts).toFixed(1)}" cy="${py(maxPoint.price).toFixed(1)}" r="3.4" fill="#16a34a" stroke="#ffffff" stroke-width="1.4"/>
    <circle cx="${px(minPoint.ts).toFixed(1)}" cy="${py(minPoint.price).toFixed(1)}" r="3.4" fill="#f04438" stroke="#ffffff" stroke-width="1.4"/>
    <circle cx="${last[0].toFixed(1)}" cy="${last[1].toFixed(1)}" r="3" fill="#1c1917" stroke="#ffffff" stroke-width="1.4"/>`;

  return `<svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${escapeHtml(
    entry.name || "상품"
  )} 가격 추이 그래프">
    <defs>
      <linearGradient id="pmGrad" x1="0" y1="0" x2="0" y2="1">
        <stop offset="0%" stop-color="#16a34a" stop-opacity="0.18"/>
        <stop offset="100%" stop-color="#16a34a" stop-opacity="0.01"/>
      </linearGradient>
    </defs>
    ${grid}
    <path d="${area}" fill="url(#pmGrad)"/>
    <path d="${line}" fill="none" stroke="#15803d" stroke-width="2" stroke-linejoin="round" stroke-linecap="round"/>
    ${avgLine}
    ${markers}
    <text x="${padL}" y="${H - 8}" font-size="9" fill="#8c867f">${mdLabel(series[0].date)}</text>
    <text x="${W - padR}" y="${H - 8}" text-anchor="end" font-size="9" fill="#8c867f">${mdLabel(
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
        <span><i style="background:#15803d"></i>판매가</span>
        <span><i style="background:#2563eb"></i>평균가(점선)</span>
        <span><b class="pm-dot" style="background:#16a34a"></b>최고가</span>
        <span><b class="pm-dot" style="background:#f04438"></b>최저가</span>
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
      : p.platform === "talkdeal"
      ? "카톡 톡딜은 기간 한정 판매라 쿠팡 과거 관측 기록이 없어요."
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
  }번째로 낮아요</b>.</li>`;
  const line = `<li>카테고리 평균 <b>${wonShort(Math.round(cmp.avg))}원/${u}</b> · 이 상품 <b>${wonShort(
    Math.round(cmp.value)
  )}원/${u}</b> (평균보다 ${cheaper ? `${wonShort(cmp.diffWon)}원 낮음` : `${wonShort(-cmp.diffWon)}원 높음`})</li>`;
  const each = p.unitEach ? `<li>${escapeHtml(p.unitEach)}</li>` : "";
  let meatLine = "";
  if (isMeat(p) && !isGadget(p)) {
    const mc = compareIn(meatCompare(p), p);
    if (mc && mc.count >= 3) {
      meatLine = `<li>${escapeHtml(meatPartLabel(p))} <b>${mc.count}개 전체</b> 100g당 평균 <b>${wonShort(
        Math.round(mc.avg)
      )}원</b> · 이 상품 <b>${wonShort(Math.round(mc.value))}원</b> → ${
        mc.diffWon >= 0
          ? `<b class="minus">100g당 ${wonShort(mc.diffWon)}원 저렴</b>`
          : `<b class="plus">100g당 ${wonShort(-mc.diffWon)}원 비쌈</b>`
      }</li>`;
    }
  }
  const gadgetNote = isGadget(p)
    ? `<li>조리기구는 중량이 없어 <b>개당 가격</b>으로만 비교했어요.</li>`
    : "";
  /* r59 — 식단 고기도 '단백질 20g당'으로 같은 기준 비교 */
  const meatP20 = protein20Compare(p);
  const meatP20Line = meatP20
    ? `<li>단백질 20g당 <b class="minus">${won(meatP20.value)}</b> — ${escapeHtml(meatPartLabel(p))} <b>${
        meatP20.count
      }개 중 ${meatP20.rank}번째</b>로 저렴해요(평균 ${won(meatP20.avg)})</li>`
    : isMeat(p) && !isGadget(p)
    ? `<li>이 부위는 부위 표준 단백질 참고치가 없어 <b>단백질 20g당 비교에서 뺐어요</b>(없는 값을 만들지 않습니다).</li>`
    : "";
  const ratingLine =
    p.rating != null
      ? `<li>쿠팡 평점 <b>★ ${Number(p.rating).toFixed(1)}</b>${
          p.reviewCount != null ? ` · 리뷰 ${Number(p.reviewCount).toLocaleString("ko-KR")}개` : ""
        }</li>`
      : "";
  let perGram = "";
  if (p.category === "protein" || p.category === "lowsoy") {
    const g = proteinPerG(p);
    const p20 = protein20(p);
    const vals = (state.data.products || [])
      .filter((x) => x.category === p.category)
      .map((x) => proteinPerG(x))
      .filter((v) => v != null);
    if (g != null) {
      const avgG = vals.length >= 3 ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : null;
      perGram = `<li>단백질 <b>20g당 ${p20 ? won(p20) : "—"}</b>${g ? ` · 1g당 ${won(g)}` : ""}${
        avgG != null
          ? ` · 같은 분류 평균 1g당 ${won(avgG)} (${g <= avgG ? `평균보다 ${won(avgG - g)} 낮아요` : `평균보다 ${won(g - avgG)} 높아요`})`
          : ""
      }</li>`;
    }
  }
  return `<div class="pm-block">
    <h4>② 카테고리 내 가성비 비교</h4>
    <ul class="pm-list">${head}${line}${meatLine}${meatP20Line}${gadgetNote}${perGram}${ratingLine}${each}</ul>
  </div>`;
}

function verdictBlock(p, entry) {
  const j = typeof judgeOf === "function" ? judgeOf(p) : null;
  if (!j) return "";
  const bits = [j.tier.label];
  if (j.why) bits.push(j.why);
  if (j.ref) bits.push(`참고 ${j.ref.label} 대비 ${signedPct(j.ref.pct)}`);
  return `<div class="pm-verdict">${escapeHtml(bits.join(" · "))}</div>`;
}

/* r57 — 카드와 같은 배지로 통일. 판정 근거는 judgeOf() 하나.
   r58 — 3단계(🔥 역대 최저 · 🟢 지금 사기 좋아요 · 🟡 아쉬워요)로 grade.js의 verdictBadgeOf()를 그대로 씁니다. */
function pillLabelOf(j) {
  if (typeof verdictBadgeOf === "function") {
    const b = verdictBadgeOf(j);
    return { label: b.label, cls: b.cls };
  }
  const id = j && j.badge ? j.badge.id : "";
  if (id === "역대급" || id === "대박급") return { label: "🔥 역대 최저", cls: "is-best" };
  if (j && j.tier && j.tier.id === "good") return { label: "🟢 지금 사기 좋아요", cls: "is-good" };
  return { label: "🟡 아쉬워요", cls: "is-meh" };
}

function gradeBlock(p) {
  if (typeof judgeOf !== "function") return "";
  if (p.category === "gadget") {
    return `<div class="pm-block"><h4>지금 사도 될까?</h4><ul class="pm-list"><li>조리기구는 중량이 없어 개당 가격으로만 비교했어요.</li></ul></div>`;
  }
  const j = judgeOf(p);
  const pill = pillLabelOf(j);
  const rows = [];
  if (j.base) {
    rows.push(
      `60일 평소가 <b>${won(Math.round(j.base.median))}</b>(관측 ${j.base.days}일·${j.base.observations}회 중간값) 대비 <b>${signedPct(j.pct)}</b>이에요.`
    );
  } else if (j.basis === "discount") {
    rows.push(`가격 기록이 ${GRADE_MIN_DAYS}일·5회에 못 미쳐, 정가 할인과 30일 최저로만 봤어요. 기록이 쌓이면 평소가와 비교해 드려요.`);
  } else {
    rows.push(escapeHtml(j.why || "가격 기록이 아직 없어 판정하지 않았어요."));
  }
  if (j.ref) {
    rows.push(
      `참고 — ${escapeHtml(j.ref.label)} <b>${j.ref.amount || won(Math.round(j.ref.value))}</b> (표본 ${j.ref.sample}개) 대비 <b>${signedPct(
        j.ref.pct
      )}</b>. 판정에는 쓰지 않았어요.`
    );
  }
  return `<div class="pm-block"><h4>지금 사도 될까?</h4>
    <div class="grade-line"><span class="grade-badge ${pill.cls}">${pill.label}</span></div>
    <ul class="pm-list" style="margin-top:8px">${rows.map((r) => `<li>${r}</li>`).join("")}</ul></div>`;
}

/* 다른 판매처(네이버 쇼핑커넥트) — 구성이 다르면 수량을 같이 적는다 */
function altShopBlock(p) {
  const nv = p.altPrice;
  if (!nv || nv.source !== "naver" || typeof nv.price !== "number" || !nv.url) return "";
  const mine = Number(p.price);
  const ship = Number(nv.shippingExtra) || 0;
  const diff = mine - (Number(nv.price) + ship);
  const samePack = !nv.packCount || !p.packCount || Number(nv.packCount) === Number(p.packCount);
  const mineLabel = p.packCount ? `${p.packCount}${p.eachLabel || "개"}` : "";
  const nvLabel = nv.packLabel || (nv.packCount ? `${nv.packCount}개` : "");
  let cmp;
  if (!samePack) {
    cmp = `구성이 달라요 — 이 상품 ${mineLabel}, 네이버 ${nvLabel}`;
  } else if (diff > 0) {
    cmp = `이 상품이 ${won(diff)} 싸요`;
  } else if (diff < 0) {
    cmp = `네이버가 ${won(-diff)} 비싸요`;
  } else {
    cmp = "같은 가격이에요";
  }
  return `<div class="pm-block"><h4>다른 판매처</h4><ul class="pm-list">
      <li>💚 <a href="${escapeHtml(nv.url)}" target="_blank" rel="noopener noreferrer">네이버 쇼핑에서 보기</a> — <b>${won(
    nv.price
  )}</b>${nvLabel ? ` (${escapeHtml(nvLabel)})` : ""}${
    ship ? ` + 배송 ${won(ship)}` : ""
  } · ${escapeHtml(cmp)}</li>
      ${nv.note ? `<li>${escapeHtml(nv.note)}</li>` : ""}
    </ul></div>`;
}

/* 모달 안에서도 바로 구매 — 카드와 같은 3색 버튼 규칙(buyHTML)을 그대로 쓴다.
   쿠팡 레드 · 토스 블루 · 네이버 그린 · 카톡 톡딜 옐로, 두 곳 이상이면 플랫폼명과 가격을 함께 적는다. */
function modalBuyBlock(p) {
  if (typeof buyHTML !== "function" || typeof buyOptions !== "function") return "";
  const opts = buyOptions(p);
  if (!opts.length) return "";
  const view = typeof cheapView === "function" ? cheapView(p) : { price: p.price, platform: platformOf(p) };
  /* r57 — 위 '가격 확인' 줄과 같은 시각을 두 번 적지 않습니다(B8 중복 정리) */
  const head = opts.length > 1 ? `${opts.length}곳 가격 비교` : "가격은 바뀔 수 있어요";
  return `<div class="pm-buy">
    <p class="pm-buy-head">
      <span class="pm-buy-k">지금 사러 가기</span>
      <strong>${wonShort(view.price)}원</strong>
      <em>${head}</em>
    </p>
    ${buyHTML(p)}
    ${typeof mehRowHTML === "function" ? mehRowHTML(p) : ""}
  </div>`;
}

/* 확인 시각 표기는 app.js의 shortStamp()를 씁니다 (11/17 14:55 형식). */

/* r59 — 상세 시트 상단: 상품 사진(88px 둥근 썸네일) + 분류·판매처 + 확인 시각 */
function modalHeroHTML(p, freshText, headline) {
  const photo = p.image
    ? `<span class="pm-thumb"><img src="${escapeHtml(p.image)}" alt="" loading="lazy" decoding="async"></span>`
    : `<span class="pm-thumb is-blank" aria-hidden="true">${escapeHtml((p.brand || "띠니").slice(0, 2))}</span>`;
  return `<div class="pm-hero">
    ${photo}
    <div class="pm-hero-meta">
      <p class="pm-eyebrow">${escapeHtml(categoryLabel(p.category))} · ${escapeHtml(
    PLATFORMS[platformOf(p)].label
  )}</p>
      <p class="pm-hero-brand">${escapeHtml(p.brand || "")}</p>
      <p class="pm-src">가격 확인 <b>${escapeHtml(freshText)}</b>${headline ? ` · ${headline}` : ""}</p>
    </div>
  </div>`;
}

/* r57 — 상세 시트: 가격·구매를 맨 위로, 판정은 한 번만(B8), 확인 시점은 정직하게(A1) */
function priceModalHTML(p, entry) {
  const hasHistory = entry && entry.status === "history" && (entry.series || []).length > 1;
  const fresh = typeof freshLabelOf === "function" ? freshLabelOf(p) : null;
  const stamp = p.priceCheckedLabel || (p.priceCheckedAt ? shortStamp(p.priceCheckedAt) : "");
  const freshText = fresh ? `${fresh.text}${fresh.days >= 1 ? ` · ${shortStamp(p.priceCheckedAt)}` : ""}` : stamp;
  const st = hasHistory ? entry.stats : null;
  const headline =
    st && p.price != null
      ? `관측 최고가 대비 <b>${Math.round(((st.max - p.price) / st.max) * 100)}%</b> 낮은 가격`
      : "";
  return `
    ${modalHeroHTML(p, freshText, headline)}
    <h2 class="pm-title" id="pm-title">${escapeHtml(p.name)}</h2>
    ${typeof unitSummaryHTML === "function" ? unitSummaryHTML(p) : ""}
    ${modalBuyBlock(p)}
    ${gradeBlock(p)}
    <h3 class="pm-h3">가격 비교</h3>
    ${positionBlock(p, entry)}
    ${categoryBlock(p)}
    ${altShopBlock(p)}
    ${hasHistory ? historyBlock(p, entry) : trackingBlock(p, entry)}
    ${typeof alertInlineHTML === "function" ? alertInlineHTML(p) : ""}
    <p class="pm-foot">
      ${
        hasHistory
          ? `과거 가격은 <a href="https://www.couprice.co.kr" target="_blank" rel="noopener noreferrer">쿠프라이스</a>가 쿠팡 판매가를 확인해 남긴 기록이에요. 확인 사이에 바뀐 가격은 반영되지 않고, 옵션·쿠폰·배송비에 따라 실제 결제 금액은 달라질 수 있어요.`
          : `과거 관측 기록이 아직 없어 이번에 확인한 가격만 있어요. 기록이 쌓이면 가격 흐름으로 바뀌어요.`
      }
      구매 전 판매처에서 가격을 한 번 더 확인해 주세요.
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
      /* 카드 안 구매 버튼(링크)은 링크대로 열고 모달은 열지 않는다 */
      if (e.target.closest("a[href]")) return;
      openPriceModal(btn.getAttribute("data-chart"));
      return;
    }
    const modal = $("price-modal");
    if (modal && !modal.hidden && e.target === modal) closePriceModal();
  });
  const x = $("pm-x");
  if (x) x.addEventListener("click", closePriceModal);
  document.addEventListener("keydown", (e) => {
    if (e.key !== "Enter" && e.key !== " ") return;
    const card = e.target.closest ? e.target.closest('[data-chart][role="button"]') : null;
    if (!card) return;
    e.preventDefault();
    openPriceModal(card.getAttribute("data-chart"));
  });
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
