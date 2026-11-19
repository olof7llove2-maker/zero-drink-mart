/* GET  /api/views           → 지금까지의 { total, today }
   GET  /api/views?hit=1     → 오늘·누적을 1씩 올린 뒤 같은 값을 돌려줍니다.
   POST /api/views           → hit=1과 같습니다.

   저장(Upstash Redis REST): INCR ttini:views:total / INCR ttini:views:YYYY-MM-DD (KST)
   개인정보(IP·쿠키·이름)는 저장하지 않습니다. 저장소가 없으면 ok:false만 돌려주고
   화면은 숫자를 숨깁니다(가짜 숫자를 만들지 않음). */

const { storageConfigured, redisCommand, sendJson } = require("./_lib");

const TOTAL_KEY = "ttini:views:total";
const DAY_TTL = 60 * 60 * 24 * 400; // 날짜별 키는 400일만 보관

function dayKey(date) {
  return `ttini:views:${date}`;
}

/* 한국 시간(KST, UTC+9) 기준 날짜 */
function kstDate(nowMs) {
  const t = new Date((nowMs || Date.now()) + 9 * 60 * 60 * 1000);
  return t.toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { ok: false, error: "method-not-allowed" });
  }

  const date = kstDate();
  if (!storageConfigured()) {
    return sendJson(res, 200, { ok: false, error: "storage-not-configured", date });
  }

  let hit = req.method === "POST";
  if (!hit) {
    try {
      const url = new URL(req.url || "/api/views", "https://ttini.kr");
      hit = url.searchParams.get("hit") === "1";
    } catch (err) {
      hit = false;
    }
  }

  try {
    let total;
    let today;
    if (hit) {
      total = await redisCommand(["INCR", TOTAL_KEY]);
      today = await redisCommand(["INCR", dayKey(date)]);
      await redisCommand(["EXPIRE", dayKey(date), DAY_TTL]);
    } else {
      total = await redisCommand(["GET", TOTAL_KEY]);
      today = await redisCommand(["GET", dayKey(date)]);
    }
    return sendJson(res, 200, {
      ok: true,
      date,
      total: Number(total || 0),
      today: Number(today || 0),
    });
  } catch (err) {
    return sendJson(res, 200, { ok: false, error: "redis-error", date });
  }
};
