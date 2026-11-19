/* 🤔 애매해요 — 상품별 익명 카운트.

   GET  /api/vote?ids=a,b,c  → { ok, counts: { "상품ID": 누적수 } }
   GET  /api/vote?flagged=1  → { ok, flagged: [{ id, count }], min }   ← 5표 이상 점검 목록(r59)
        ?min=5 로 기준을 바꿀 수 있어요(기본 5, 1~100).
        가격 재확인 루틴(scripts/flagged_recheck_r59.py)이 이 목록을 먼저 봅니다.
   POST /api/vote  { "productId": "…" }
        → 그 상품의 '애매해요'를 1 올리고 { ok, productId, count } 를 돌려줍니다.

   저장(Upstash Redis REST): HINCRBY ttini:vote:meh:v1 "상품ID" 1
   개인정보는 받지도 저장하지도 않습니다 — 상품 ID와 누적 개수만 남기고,
   IP·쿠키·브라우저 정보·누른 시각은 저장하지 않습니다.
   중복 방지는 브라우저(localStorage)가 하고, 여기서는 상품 ID 형식만 검사합니다.
   저장소가 없으면 ok:false 만 돌려주고 화면은 숫자를 숨깁니다(가짜 숫자를 만들지 않음). */

const { storageConfigured, redisCommand, sendJson, readBody } = require("./_lib");

const KEY = "ttini:vote:meh:v1";
const ID_RE = /^[A-Za-z0-9#._-]{1,80}$/;
const MAX_BODY = 300;
const MAX_IDS = 60;
const FLAG_MIN = 5;
const FLAG_LIMIT = 50;

async function countsOf(ids) {
  const counts = {};
  if (!ids.length) return counts;
  if (ids.length === 1) {
    counts[ids[0]] = Number((await redisCommand(["HGET", KEY, ids[0]])) || 0);
    return counts;
  }
  const vals = (await redisCommand(["HMGET", KEY, ...ids])) || [];
  ids.forEach((id, i) => {
    counts[id] = Number((Array.isArray(vals) ? vals[i] : 0) || 0);
  });
  return counts;
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { ok: false, error: "method-not-allowed" });
  }

  if (!storageConfigured()) {
    return sendJson(res, 200, { ok: false, error: "storage-not-configured" });
  }

  try {
    if (req.method === "POST") {
      const raw = typeof req.body === "string" ? req.body : JSON.stringify(req.body || {});
      if (raw.length > MAX_BODY) return sendJson(res, 413, { ok: false, error: "body-too-large" });
      const body = readBody(req);
      const productId = body && typeof body.productId === "string" ? body.productId.trim() : "";
      if (!ID_RE.test(productId)) return sendJson(res, 400, { ok: false, error: "bad-request" });
      const count = await redisCommand(["HINCRBY", KEY, productId, 1]);
      return sendJson(res, 200, { ok: true, productId, count: Number(count || 0) });
    }

    let ids = [];
    let flagged = false;
    let min = FLAG_MIN;
    try {
      const url = new URL(req.url || "/api/vote", "https://ttini.kr");
      flagged = url.searchParams.get("flagged") === "1" || url.searchParams.get("flagged") === "true";
      const minParam = Number(url.searchParams.get("min"));
      if (Number.isFinite(minParam) && minParam >= 1) min = Math.min(100, Math.round(minParam));
      ids = String(url.searchParams.get("ids") || "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => ID_RE.test(s))
        .slice(0, MAX_IDS);
    } catch (err) {
      ids = [];
    }

    /* 5표 이상 쌓인 상품 = 가격이 애매하다는 신호. 가격 재확인 루틴이 먼저 볼 목록. */
    if (flagged) {
      const flat = (await redisCommand(["HGETALL", KEY])) || [];
      const list = [];
      for (let i = 0; i + 1 < flat.length; i += 2) {
        const id = String(flat[i] || "");
        const count = Number(flat[i + 1]) || 0;
        if (!ID_RE.test(id) || count < min) continue;
        list.push({ id, count });
      }
      list.sort((a, b) => b.count - a.count || a.id.localeCompare(b.id));
      return sendJson(res, 200, { ok: true, flagged: list.slice(0, FLAG_LIMIT), min });
    }

    const counts = await countsOf(ids);
    return sendJson(res, 200, { ok: true, counts });
  } catch (err) {
    const detail = String((err && err.message) || err).slice(0, 160);
    return sendJson(res, 200, { ok: false, error: "redis-error", detail });
  }
};
