/* ── 5단계 시세 등급 · 단가 계산 ──────────────────────────
   - 등급: 같은 용기 안에서 같은 브랜드의 평소 시세(중간값)와 지금 단가를 비교합니다.
   - 용기가 다르면 비교하지 않습니다(캔 355ml와 페트 1.5L를 섞으면 판단이 뒤집힘).
   - 5단계 배지는 실제 관측 이력이 14일 이상 쌓인 상품에만 붙입니다.
   계산식은 scripts/verify_grade.py 로 같은 값을 따로 대조합니다. */

const GRADE_BANDS = [
  { id: "역대급", cls: "is-best", max: -20, verdict: "지금이 역대급 가격이에요. 바로 사세요." },
  { id: "대박급", cls: "is-great", max: -12, verdict: "쟁여둘 만한 가격이에요." },
  { id: "중박급", cls: "is-mid", max: -5, verdict: "필요하면 사도 되는 가격이에요." },
  { id: "쏘쏘", cls: "is-soso", max: 3, verdict: "평소 시세 수준이에요." },
  { id: "비쌈", cls: "is-high", max: Infinity, verdict: "조금 더 기다려 보세요." },
];

const GRADE_MIN_DAYS = 14;

function gradeOf(pct) {
  if (pct == null || !Number.isFinite(pct)) return null;
  return GRADE_BANDS.find((b) => pct <= b.max) || null;
}

function medianOf(list) {
  const arr = (list || []).filter((v) => typeof v === "number" && Number.isFinite(v));
  if (!arr.length) return null;
  const s = arr.slice().sort((a, b) => a - b);
  const mid = Math.floor(s.length / 2);
  return s.length % 2 ? s[mid] : (s[mid - 1] + s[mid]) / 2;
}

const CONTAINER_NAME = { can: "캔", "pet-small": "소형 페트", "pet-large": "대용량", powder: "분말", raw: "100g" };

function containerClass(p) {
  if (!p) return null;
  if (p.category === "gadget") return null;
  if (p.category === "egg" || p.category === "bakery") return null;
  if (p.part === "meat" || p.part === "cheat") return "raw";
  if (p.container === "powder" || p.category === "powder") return "powder";
  if (p.container) return p.container;
  return containerFromVolume(p.volumeMl);
}

function containerFromVolume(volumeMl) {
  const v = Number(volumeMl);
  if (!v) return null;
  /* 캔은 190~360ml(355ml 표준캔 포함), 그 위는 페트 */
  if (v <= 360) return "can";
  if (v <= 700) return "pet-small";
  return "pet-large";
}

function containerLabel(c) {
  return CONTAINER_NAME[c] || "";
}

function unitKindOf(p) {
  if (p.measure) return p.measure;
  if (p.category === "gadget") return "each";
  if (p.part === "meat") return "per100g";
  if (p.category === "shake" || p.category === "powder" || p.container === "powder") return "per100g";
  return "per100ml";
}

function unitLabelOf(p) {
  const k = unitKindOf(p);
  return k === "per100ml" ? "100ml당" : k === "per100g" ? "100g당" : "개당";
}

/* 100ml·100g당 단가. 저장된 반올림 값보다 계산값을 먼저 씁니다. */
function unitValueOf(p) {
  if (!p || p.price == null) return null;
  const kind = unitKindOf(p);
  if (kind === "each") return null;
  if (kind === "per100g") {
    if (typeof p.per100g === "number" && Number.isFinite(p.per100g) && p.per100g > 0) return p.per100g;
    if (p.weightG && p.price) return (p.price / p.weightG) * 100;
    return null;
  }
  if (p.volumeMl && p.packCount && p.price) return (p.price / (p.volumeMl * p.packCount)) * 100;
  if (typeof p.unitPricePer100ml === "number" && Number.isFinite(p.unitPricePer100ml)) return p.unitPricePer100ml;
  return null;
}

/* ── 시세 표(같은 용기 안에서만) ─────────────────────────── */

const marketIndex = { brand: new Map(), group: new Map(), categories: [] };
/* 단백질 음료는 100ml당 가격 대신 단백질 20g당 가격으로 견줍니다(함량이 달라서). */
const p20Index = { brand: new Map(), group: new Map() };

function pushTo(map, key, value) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

function buildMarketIndex(products, categories) {
  marketIndex.brand.clear();
  marketIndex.group.clear();
  p20Index.brand.clear();
  p20Index.group.clear();
  marketIndex.categories = categories || [];
  (products || []).forEach((p) => {
    const u = unitValueOf(p);
    const c = containerClass(p);
    if (u != null && c && p.category) {
      pushTo(marketIndex.group, `${c}|${p.category}`, u);
      const brand = String(p.brand || "").trim();
      if (brand) pushTo(marketIndex.brand, `${c}|${p.category}|${brand}`, u);
    }
    /* 단백질 20g당 시세 — 단백질 음료(10g 이상)만. 두유·저단백은 함량이 달라 넣지 않습니다. */
    const v = p.category === "protein" ? p.protein20 : null;
    if (typeof v !== "number" || !Number.isFinite(v) || v <= 0 || !c) return;
    pushTo(p20Index.group, `${c}|protein`, v);
    const pb = String(p.brand || "").trim();
    if (pb) pushTo(p20Index.brand, `${c}|protein|${pb}`, v);
  });
}

function categoryLabelOf(catId) {
  const c = (marketIndex.categories || []).find((x) => x.id === catId);
  return c ? c.label : catId;
}

/* 브랜드 표본이 2개 이상이면 브랜드 시세, 아니면 같은 용기의 분류 시세(3개 이상). */
function marketForValues(category, brand, container) {
  if (!category || !container) return null;
  const b = String(brand || "").trim();
  if (b) {
    const arr = marketIndex.brand.get(`${container}|${category}|${b}`);
    if (arr && arr.length >= 2) {
      const value = medianOf(arr);
      if (value) {
        return {
          value,
          kind: "brand",
          label: `${b} ${containerLabel(container)} 시세`,
          shortLabel: `${b} 시세`,
          sample: arr.length,
        };
      }
    }
  }
  const g = marketIndex.group.get(`${container}|${category}`);
  if (g && g.length >= 3) {
    const value = medianOf(g);
    if (value) {
      return {
        value,
        kind: "group",
        label: `${categoryLabelOf(category)} ${containerLabel(container)} 시세`,
        shortLabel: `${categoryLabelOf(category)} 시세`,
        sample: g.length,
      };
    }
  }
  return null;
}

function marketForProduct(p) {
  if (!p) return null;
  return marketForValues(p.category, p.brand, containerClass(p));
}

/* ── 14일 규칙 ──────────────────────────────────────────── */

function historyDaysOf(id) {
  const entry = state && state.priceHistory ? state.priceHistory[id] : null;
  if (!entry || entry.status !== "history") return 0;
  const days = entry.stats && entry.stats.days;
  const obs = entry.stats && entry.stats.observations;
  if (!days || days < GRADE_MIN_DAYS) return 0;
  if (!obs || obs < 5) return 0;
  return days;
}

/* 상품의 5단계 등급. 이력 14일 미만이거나 시세 표본이 없으면 null. */
function gradeForProduct(p) {
  if (!p || p.price == null) return null;
  if (p.category === "gadget") return null;
  const days = historyDaysOf(p.id);
  if (!days) return null;
  const market = marketForProduct(p);
  if (!market || !market.value) return null;
  const unit = unitValueOf(p);
  if (unit == null) return null;
  const pct = ((unit - market.value) / market.value) * 100;
  const band = gradeOf(pct);
  if (!band) return null;
  return { band, pct, market, unit, days, label: unitLabelOf(p) };
}

function signedPct(pct) {
  const r = Math.round(pct * 10) / 10;
  return `${r > 0 ? "+" : ""}${r.toFixed(1)}%`;
}

/* ── 판정 통일 (r15) ─────────────────────────────────────
   한 상품의 "지금 사도 되나" 답은 하나만 씁니다.
   카드 신호등·5단계 배지·단백질 레일·가격 추이 모달이 모두 이 함수를 씁니다.

   · 판정 축: 이 상품의 **평소가** = 관측 가격(data/price-history.json)의 중간값.
     관측 14일·5회 이상만 인정하고, 그 미만이면 판정 대신 정가 할인·30일 최저로 3단계 톤만 정합니다.
     5단계: −20%↓ 역대급 · −12%↓ 대박급 · −5%↓ 중박급 · +3%까지 쏘쏘 · 그 위 비쌈
     3단계: −5%↓ 좋아요 · +3%까지 무난 · 그 위 비싸요
   · '같은 용기 시세'는 판정이 아니라 참고 숫자로만 적습니다(marketRefOf).
     이유: 100ml당 가격을 단백질 함량이 다른 음료끼리 견주면 고단백 음료가 늘 '비쌈'으로 보입니다.
     그래서 단백질 음료는 단백질 20g당 가격끼리(protein20) 견줍니다. */

const VERDICT_MIN_DAYS = GRADE_MIN_DAYS;

/* r55 — '조금 비싸요(🟠)'와 '비싸요(🔴)'를 나눠 5단계로 (재영 님 2026-11-19) */
const VERDICT_TIERS = [
  { id: "good", label: "지금 사기 좋아요", short: "지금 사기 좋은 가격", dot: "🟢", max: -5 },
  { id: "mid", label: "무난한 가격", short: "무난한 가격", dot: "🟡", max: 3 },
  { id: "wait", label: "조금 비싸요", short: "지금은 조금 비싼 편", dot: "🟠", max: 8 },
  { id: "high", label: "비싸요", short: "지금은 비싼 편", dot: "🔴", max: Infinity },
];

/* r55 — 정가 대비 70% 이상 할인이면 60일 이력과 무관하게 '역대급' (재영 님 2026-11-19) */
const DEEP_CUT_PCT = 70;
const VERDICT_NONE = { id: "none", label: "가격 기록 모으는 중", short: "가격 기록을 모으는 중", dot: "⚪", max: null };

function verdictTierOf(pct) {
  if (pct == null || !Number.isFinite(pct)) return VERDICT_NONE;
  return VERDICT_TIERS.find((t) => pct <= t.max) || VERDICT_TIERS[VERDICT_TIERS.length - 1];
}

/* 이 상품의 평소가(관측 가격 중간값) — 14일·5회 이상만 */
function baselineOf(p) {
  const entry = p && state && state.priceHistory ? state.priceHistory[p.id] : null;
  if (!entry || entry.status !== "history") return null;
  const st = entry.stats || {};
  const days = Number(st.days) || 0;
  const observations = Number(st.observations) || 0;
  if (days < VERDICT_MIN_DAYS || observations < 5) return null;
  const prices = (entry.series || [])
    .map((s) => (s ? Number(s.price) : null))
    .filter((v) => typeof v === "number" && Number.isFinite(v) && v > 0);
  const median = medianOf(prices);
  if (!median) return null;
  return { median, days, observations, min: st.min, max: st.max, avg: st.avg };
}

/* 참고용 '같은 용기 시세' — 판정에 쓰지 않습니다. */
function marketRefOf(p) {
  if (!p || typeof p.price !== "number") return null;
  if (p.category === "protein") {
    const c = containerClass(p);
    const v = typeof p.protein20 === "number" && Number.isFinite(p.protein20) ? p.protein20 : null;
    if (!c || !v) return null;
    const b = String(p.brand || "").trim();
    const brandArr = b ? p20Index.brand.get(`${c}|protein|${b}`) : null;
    if (brandArr && brandArr.length >= 2) {
      const value = medianOf(brandArr);
      if (value) {
        return {
          pct: (v / value - 1) * 100,
          value,
          amount: won(Math.round(value)),
          unit: "",
          label: `${b} 20g당 시세`,
          sample: brandArr.length,
        };
      }
    }
    const groupArr = p20Index.group.get(`${c}|protein`);
    if (groupArr && groupArr.length >= 3) {
      const value = medianOf(groupArr);
      if (value) {
        return {
          pct: (v / value - 1) * 100,
          value,
          amount: won(Math.round(value)),
          unit: "",
          label: `단백질 음료 ${containerLabel(c)} 20g당 시세`,
          sample: groupArr.length,
        };
      }
    }
    return null;
  }
  const m = marketForProduct(p);
  const u = unitValueOf(p);
  if (!m || u == null) return null;
  return {
    pct: (u - m.value) / m.value * 100,
    value: m.value,
    amount: `${won(Math.round(m.value))}/${unitLabelOf(p).replace("당", "")}`,
    unit: unitLabelOf(p).replace("당", ""),
    label: m.label,
    shortLabel: m.shortLabel,
    sample: m.sample,
    kind: m.kind,
  };
}

/* r55 — 정가 대비 70% 이상이면 이력·점수와 무관하게 역대급으로 올립니다. */
function applyDeepCut(p, out) {
  const disc = Number(p && p.discountPct);
  if (!Number.isFinite(disc) || disc < DEEP_CUT_PCT) return out;
  out.tier = VERDICT_TIERS[0];
  out.badge = GRADE_BANDS[0];
  out.deepCut = true;
  out.why = `정가 대비 ${disc}% 할인 — 역대급${out.pct != null ? ` (60일 평소가 ${signedPct(out.pct)})` : ""}`;
  return out;
}

/* 통일 판정 — 모든 화면이 이 값만 씁니다. */
function judgeOf(p) {
  const out = { pct: null, tier: VERDICT_NONE, badge: null, base: null, ref: null, why: "", basis: "none", days: 0 };
  if (!p || typeof p.price !== "number" || !Number.isFinite(p.price)) {
    out.why = "가격을 아직 확인하지 못했어요.";
    return out;
  }
  out.base = baselineOf(p);
  out.ref = marketRefOf(p);
  if (out.base) {
    const pct = (p.price / out.base.median - 1) * 100;
    out.pct = pct;
    out.basis = "history";
    out.days = out.base.days;
    out.tier = verdictTierOf(pct);
    out.badge = gradeOf(pct);
    out.why = `내 60일 평소가 ${won(Math.round(out.base.median))} 대비 ${signedPct(pct)}`;
    return applyDeepCut(p, out);
  }
  /* 기록이 14일 미만 — 5단계 배지 없이 정가 할인·30일 최저로만 톤을 정합니다 */
  const disc = typeof p.discountPct === "number" && Number.isFinite(p.discountPct) ? p.discountPct : null;
  const l30 =
    p.id && String(p.id).includes("#") ? null : typeof p.lowest30d === "number" && Number.isFinite(p.lowest30d) ? p.lowest30d : null;
  if (disc == null && l30 == null) {
    out.why = "가격 기록과 정가 할인 정보가 아직 없어요.";
    return out;
  }
  let score = disc == null ? 50 : 46 + Math.min(32, disc * 0.6);
  const at30 = l30 != null && p.price <= l30 * 1.001;
  if (at30) score += 6;
  if (l30 != null && p.price > l30 * 1.12) score -= 14;
  score = Math.max(6, Math.min(92, score));
  out.basis = "discount";
  out.tier = score >= 70 ? VERDICT_TIERS[0] : score >= 44 ? VERDICT_TIERS[1] : VERDICT_TIERS[2];
  const bits = [];
  if (disc != null) bits.push(`정가 대비 ${disc}% 할인`);
  if (at30) bits.push("30일 최저와 같은 수준");
  else if (l30 != null) bits.push(`30일 최저 ${won(l30)}보다 높아요`);
  out.why = bits.join(" · ") || "가격을 모으는 중이에요.";
  return applyDeepCut(p, out);
}

/* 참고 시세 한 줄 — 판정 단어 없이 숫자만 */
function marketRefNoteOf(p) {
  const j = judgeOf(p);
  const r = j.ref;
  if (!r) return "";
  return `같은 용기 시세 ${r.amount || won(Math.round(r.value))} 대비 ${signedPct(r.pct)}`;
}

/* 카드 1줄: 5단계 배지(판정) + 평소가 근거 + 참고 시세 */
function gradeLineHTML(p) {
  const j = judgeOf(p);
  /* 시세 줄은 판정(5단계 배지)이 있는 카드에서만 덧붙입니다.
     판정이 할인율 기준인 카드에 시세 숫자만 붙으면 서로 말이 엇갈려 보입니다. */
  const showRef = j.ref && j.badge;
  if (!j.badge) return "";
  const notes = [];
  if (j.base) notes.push(`평소가 <b>${won(Math.round(j.base.median))}</b> 대비 <b>${signedPct(j.pct)}</b>`);
  if (showRef) notes.push(`같은 용기 시세 대비 ${signedPct(j.ref.pct)}`);
  const title = [
    j.badge ? `${j.badge.id} — ${j.tier.label}` : j.tier.label,
    j.base ? `평소가 ${won(Math.round(j.base.median))} (관측 ${j.base.days}일·${j.base.observations}회 중간값) 대비 ${signedPct(j.pct)}` : "",
    j.ref ? `참고: ${j.ref.label} ${j.ref.amount || won(Math.round(j.ref.value))} (표본 ${j.ref.sample}개) 대비 ${signedPct(j.ref.pct)} — 판정에는 쓰지 않아요` : "",
  ]
    .filter(Boolean)
    .join(" · ");
  return `<p class="grade-line" title="${escapeHtml(title)}">${
    j.badge ? `<span class="grade-badge ${j.badge.cls}">${j.badge.id}</span>` : ""
  }<span class="grade-note">${notes.join(" · ")}</span></p>`;
}

/* ── 제목에서 값 읽기 ───────────────────────────────────── */

function toNumber(raw) {
  if (raw == null) return null;
  const n = Number(String(raw).replace(/[,\s]/g, ""));
  return Number.isFinite(n) && n > 0 ? n : null;
}

function parseDealText(text) {
  const t = String(text || "");
  const out = { price: null, ship: null, volume: null, unit: null, qty: null, protein: null, freeShip: false };

  /* 가격: "25,760원" 처럼 천 단위가 있는 숫자를 우선 */
  const price = t.match(/(\d{1,3}(?:,\d{3})+|\d{4,})\s*원/);
  if (price) out.price = toNumber(price[1]);

  /* 배송비 */
  if (/무료\s*배송|배송비\s*무료|무료배송|무배|무료/.test(t)) out.freeShip = true;
  const ship = t.match(/배송비\s*[:：]?\s*(\d{1,3}(?:,\d{3})+|\d+)\s*원/);
  if (ship) {
    out.ship = toNumber(ship[1]);
    out.freeShip = out.ship === 0;
  }

  /* 용량: ml → g → kg → L 순서로 먼저 걸리는 하나 */
  const ml = t.match(/(\d+(?:[.,]\d+)?)\s*(ml|mL|ML|미리리터|미리)(?![a-zA-Z])/);
  const gram = t.match(/(\d+(?:[.,]\d+)?)\s*(g|G|그램)(?![a-zA-Z])/);
  const kg = t.match(/(\d+(?:[.,]\d+)?)\s*(kg|KG|킬로그램|킬로)(?![a-zA-Z])/i);
  const liter = t.match(/(\d+(?:[.,]\d+)?)\s*(l|L|리터)(?![a-zA-Z])/);
  if (ml) {
    out.volume = toNumber(ml[1].replace(",", "."));
    out.unit = "ml";
  } else if (kg) {
    const v = toNumber(kg[1].replace(",", "."));
    out.volume = v ? Math.round(v * 1000) : null;
    out.unit = "g";
  } else if (gram) {
    out.volume = toNumber(gram[1].replace(",", "."));
    out.unit = "g";
  } else if (liter) {
    const v = toNumber(liter[1].replace(",", "."));
    out.volume = v ? Math.round(v * 1000) : null;
    out.unit = "ml";
  }

  /* 수량: 개·캔·병·팩·입·봉·세트 */
  const qty = t.match(/(\d{1,4}(?:,\d{3})*)\s*(개|캔|병|팩|입|봉|박스|세트)/);
  if (qty) out.qty = toNumber(qty[1]);

  /* 병당 단백질 */
  const protein = t.match(/단백질\s*(\d+(?:\.\d+)?)\s*(?:g|G|그램)/);
  if (protein) out.protein = toNumber(protein[1]);

  return out;
}

/* 제목에서 분류·브랜드 짐작하기 (사용자가 바꿀 수 있음) */
const CATEGORY_HINTS = [
  ["cola", ["콜라"]],
  ["cider", ["사이다"]],
  ["sparkling", ["탄산수", "스파클링"]],
  ["water", ["생수", "샘물"]],
  ["acv", ["애사비", "애플사이다", "사과식초"]],
  ["ion", ["이온", "게토레이", "포카리", "토레타"]],
  ["energy", ["에너지", "핫식스", "몬스터", "레드불", "박카스"]],
  ["icetea", ["아이스티", "복숭아티"]],
  ["tea", ["보리", "옥수수수염", "차음료", "쌍화"]],
  ["protein", ["단백질", "프로틴", "두유", "고단백", "아몬드브리즈", "셀렉스", "마이밀", "뉴케어"]],
  ["shake", ["쉐이크", "웨이", "WPI", "WPC"]],
  ["beef", ["소고기", "한우", "부채살", "등심", "갈비살", "살치살", "채끝"]],
  ["pork", ["돼지", "삼겹", "목살", "앞다리", "뒷다리", "갈매기"]],
  ["chicken", ["닭", "가슴살", "안심"]],
  ["lamb", ["양고기", "램", "숄더랙", "프랜치랙"]],
  ["duck", ["오리"]],
  ["salmon", ["연어"]],
];

function guessCategory(text, categories) {
  const t = String(text || "");
  const known = new Set((categories || []).map((c) => c.id));
  for (const [id, words] of CATEGORY_HINTS) {
    if (!known.has(id)) continue;
    if (words.some((w) => t.toUpperCase().includes(w.toUpperCase()))) return id;
  }
  return null;
}

function guessBrand(text, brands) {
  const t = String(text || "").toUpperCase();
  const list = (brands || [])
    .filter((b) => b && b.length >= 2)
    .slice()
    .sort((a, b) => b.length - a.length);
  for (const b of list) {
    if (t.includes(String(b).toUpperCase())) return b;
  }
  return null;
}
