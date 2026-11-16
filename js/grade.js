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
  if (p.part === "meat") return "raw";
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

function pushTo(map, key, value) {
  const arr = map.get(key);
  if (arr) arr.push(value);
  else map.set(key, [value]);
}

function buildMarketIndex(products, categories) {
  marketIndex.brand.clear();
  marketIndex.group.clear();
  marketIndex.categories = categories || [];
  (products || []).forEach((p) => {
    const u = unitValueOf(p);
    const c = containerClass(p);
    if (u == null || !c || !p.category) return;
    pushTo(marketIndex.group, `${c}|${p.category}`, u);
    const brand = String(p.brand || "").trim();
    if (brand) pushTo(marketIndex.brand, `${c}|${p.category}|${brand}`, u);
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

/* 카드 1줄: 배지 + 근거 */
function gradeLineHTML(p) {
  const g = gradeForProduct(p);
  if (!g) return "";
  const title = `${g.market.label} ${won(Math.round(g.market.value))}/${g.label} (표본 ${g.market.sample}개) · ${g.days}일 관측 기록 기준`;
  return `<p class="grade-line" title="${escapeHtml(title)}"><span class="grade-badge ${g.band.cls}">${g.band.id}</span><span class="grade-note">${escapeHtml(
    g.market.shortLabel
  )} <b>${won(Math.round(g.market.value))}</b>/${g.label} 대비 <b>${signedPct(g.pct)}</b></span></p>`;
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
