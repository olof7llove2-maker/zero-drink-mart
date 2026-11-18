/* 구매 버튼 클릭 수 — 익명 카운트만 셉니다.
   POST /api/clicks  { "productId": "…", "platform": "coupang|toss|naver" }
        → 그 상품·플랫폼 클릭을 1 올리고 { ok, total } 을 돌려줍니다.
   GET  /api/clicks?top=20
        → { ok, total, top: [{ productId, platform, clicks }] } (많이 누른 순)

   저장: Upstash Redis HINCRBY ttini:clicks:items "상품ID|플랫폼" 1
                                   INCR    ttini:clicks:total
   개인정보는 받지도 저장하지도 않습니다 — IP·쿠키·브라우저 정보·시각(초 단위) 모두 남기지 않고,
   상품 ID와 플랫폼 이름, 누적 개수만 셉니다. 저장소가 없으면 ok:false 만 돌려줍니다. */

const { storageConfigured, redisCommand, sendJson, readBody } = require("./_lib");

const ITEMS_KEY = "ttini:clicks:items";
const TOTAL_KEY = "ttini:clicks:total";
const PLATFORMS = new Set(["coupang", "toss", "naver"]);
const ID_RE = /^[A-Za-z0-9#._-]{1,80}$/;
const MAX_BODY = 400;

function parseHit(req) {
  const body = readBody(req);
  if (!body) return null;
  const productId = typeof body.productId === "string" ? body.productId.trim() : "";
  const platform = typeof body.platform === "string" ? body.platform.trim().toLowerCase() : "";
  if (!ID_RE.test(productId)) return null;
  if (platform && !PLATFORMS.has(platform)) return null;
  return { productId, platform: platform || "unknown" };
}

async function topItems(limit) {
  const flat = (await redisCommand(["HGETALL", ITEMS_KEY])) || [];
  const rows = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    const [productId, platform] = String(flat[i]).split("|");
    const clicks = Number(flat[i + 1]) || 0;
    if (!productId || clicks <= 0) continue;
    rows.push({ productId, platform: platform || "unknown", clicks });
  }
  rows.sort((a, b) => b.clicks - a.clicks);
  return rows.slice(0, limit);
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
      const hit = parseHit(req);
      if (!hit) return sendJson(res, 400, { ok: false, error: "bad-request" });
      const total = await redisCommand(["INCR", TOTAL_KEY]);
      await redisCommand(["HINCRBY", ITEMS_KEY, `${hit.productId}|${hit.platform}`, 1]);
      return sendJson(res, 200, { ok: true, total: Number(total || 0) });
    }

    let limit = 20;
    try {
      const url = new URL(req.url || "/api/clicks", "https://zero-drink-mart.vercel.app");
      const q = Number(url.searchParams.get("top"));
      if (Number.isFinite(q) && q > 0) limit = Math.min(100, Math.floor(q));
    } catch (err) {
      limit = 20;
    }
    const total = Number((await redisCommand(["GET", TOTAL_KEY])) || 0);
    const top = await topItems(limit);
    return sendJson(res, 200, { ok: true, total, top });
  } catch (err) {
    return sendJson(res, 200, { ok: false, error: "redis-error" });
  }
};
