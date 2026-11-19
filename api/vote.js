/* 🤔 애매해요 — 상품별 익명 카운트.

   GET  /api/vote?ids=a,b,c  → { ok, counts: { "상품ID": 누적수 } }
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
    try {
      const url = new URL(req.url || "/api/vote", "https://ttini.kr");
      ids = String(url.searchParams.get("ids") || "")
        .split(",")
        .map((s) => s.trim())
        .filter((s) => ID_RE.test(s))
        .slice(0, MAX_IDS);
    } catch (err) {
      ids = [];
    }
    const counts = await countsOf(ids);
    return sendJson(res, 200, { ok: true, counts });
  } catch (err) {
    const detail = String((err && err.message) || err).slice(0, 160);
    return sendJson(res, 200, { ok: false, error: "redis-error", detail });
  }
};
