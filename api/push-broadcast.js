/* POST /api/push-broadcast  { title, body, url, tag, dry, force }  → 새 초특가 알림을 전체 구독자에게 발송
   GET  /api/push-broadcast?dry=1                                    → 발송 없이 대상 수만 확인
   GET  /api/push-broadcast?send=1&title=..&body=..&url=..           → (cron·띠니용) 실제 발송

   대상은 productId 가 "__hotdeal_all__" 인 구독, 즉 알림 허브의
   '🔥 새 초특가 뜨면 알림 받기'를 켠 브라우저뿐입니다. 개별 상품 목표가 알림은 건드리지 않습니다.

   인증: CRON_SECRET(또는 PUSH_BROADCAST_SECRET)이 설정돼 있으면
        Authorization: Bearer <secret> 헤더가 있어야 합니다(push-check와 같은 방식).
   안전장치: 같은 제목·내용·링크를 10분 안에 두 번 보내려 하면 건너뜁니다(force=1로 해제).
   저장하는 개인정보는 없습니다 — 브라우저 구독 객체뿐입니다. */

const webpush = require("web-push");
const crypto = require("crypto");
const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
  HOTDEAL_ID,
  pushConfigured,
  redisCommand,
  readAll,
  writeOne,
  removeOne,
  sendJson,
  readBody,
} = require("./_lib");

const SITE_URL = "https://zero-drink-mart.vercel.app";
const LAST_KEY = "ttini:push:broadcast:last";
const RATE_KEY = "ttini:push:broadcast:rate";
const RATE_LIMIT = 6; /* 한 시간에 최대 6번까지만 */
const DEDUPE_SECONDS = 600;
const MAX_TITLE = 60;
const MAX_BODY = 200;
const MAX_URL = 500;

function clampText(value, max) {
  return String(value == null ? "" : value).replace(/\s+/g, " ")
    .trim()
    .slice(0, max);
}

/* 사이트 주소이거나 http(s) 링크만 허용합니다(외부로 튀는 링크·스크립트 방지). */
function safeUrl(value) {
  const raw = String(value == null ? "" : value).trim().slice(0, MAX_URL);
  if (!raw) return SITE_URL;
  if (!/^https?:\/\//i.test(raw)) return SITE_URL;
  try {
    const u = new URL(raw);
    if (u.protocol !== "https:" && u.protocol !== "http:") return SITE_URL;
    return u.href;
  } catch (err) {
    return SITE_URL;
  }
}

function param(source, key) {
  if (!source || typeof source !== "object") return undefined;
  return source[key];
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const secret = process.env.PUSH_BROADCAST_SECRET || process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${secret}`) return sendJson(res, 401, { error: "unauthorized" });
  }

  if (req.method !== "GET" && req.method !== "POST") {
    res.setHeader("Allow", "GET, POST");
    return sendJson(res, 405, { error: "method-not-allowed" });
  }

  if (!pushConfigured()) {
    return sendJson(res, 503, { ok: false, error: "push-not-configured", targeted: 0, sent: 0 });
  }

  const body = readBody(req) || {};
  const query = req.query || {};
  const src = req.method === "POST" ? body : query;

  const dry = String(param(src, "dry") || param(query, "dry") || "") === "1" || String(param(src, "dry")) === "true";
  const force = String(param(src, "force") || param(query, "force") || "") === "1";

  /* GET은 발송 실수·미리보기 크롤러를 막기 위해 send=1 을 명시해야 실제 발송합니다. */
  if (req.method === "GET" && !dry && String(query.send || "") !== "1") {
    return sendJson(res, 400, {
      error: "dry-or-send-required",
      hint: "확인만 하려면 ?dry=1, 실제 발송은 POST 또는 ?send=1 을 함께 보내세요.",
    });
  }

  const title = clampText(param(src, "title") || "🔥 띠니마트 새 초특가", MAX_TITLE);
  const text = clampText(param(src, "body") || param(src, "message") || "새 초특가가 올라왔어요", MAX_BODY);
  const url = safeUrl(param(src, "url") || SITE_URL);
  const tag = clampText(param(src, "tag") || "ttini-hotdeal", 40);

  try {
    const subs = (await readAll()).filter((rec) => rec.productId === HOTDEAL_ID);

    if (!dry && !subs.length) {
      return sendJson(res, 200, { ok: true, dry: false, targeted: 0, sent: 0, dropped: 0, reason: "no-subscribers" });
    }

    if (dry) {
      return sendJson(res, 200, {
        ok: true,
        dry: true,
        targeted: subs.length,
        sent: 0,
        dropped: 0,
        payload: { title, body: text, url, tag },
      });
    }

    /* 같은 알림을 10분 안에 다시 보내는 사고(중복 호출) 방지 */
    const digest = crypto
      .createHash("sha256")
      .update(`${title}|${text}|${url}`)
      .digest("hex")
      .slice(0, 32);
    if (!force) {
      try {
        const lastRaw = await redisCommand(["GET", LAST_KEY]);
        if (lastRaw) {
          const last = JSON.parse(lastRaw);
          if (last && last.hash === digest && Date.now() - Number(last.at || 0) < DEDUPE_SECONDS * 1000) {
            return sendJson(res, 200, {
              ok: true,
              dry: false,
              skipped: "duplicate",
              targeted: subs.length,
              sent: 0,
              dropped: 0,
              lastAt: new Date(Number(last.at)).toISOString(),
            });
          }
        }
      } catch (err) {
        /* Redis를 못 읽어도 발송은 계속합니다 */
      }
    }

    /* 공개 주소로 들어오는 호출을 막기 위한 시간당 상한(CRON_SECRET이 없을 때도 피해를 좁힘) */
    try {
      const hits = Number(await redisCommand(["INCR", RATE_KEY]));
      /* 매번 만료를 다시 걸어 카운트가 영원히 남지 않게 합니다 */
      await redisCommand(["EXPIRE", RATE_KEY, "3600"]);
      if (hits > RATE_LIMIT) {
        return sendJson(res, 429, { ok: false, error: "rate-limited", limitPerHour: RATE_LIMIT });
      }
    } catch (err) {
      /* Redis를 못 읽어도 발송은 계속합니다 */
    }

    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const payload = JSON.stringify({ title, body: text, url, tag, productId: null });
    let sent = 0;
    let dropped = 0;
    const now = new Date().toISOString();

    for (const rec of subs) {
      try {
        await webpush.sendNotification({ endpoint: rec.endpoint, keys: rec.keys }, payload, { TTL: 60 * 60 * 24 });
        sent += 1;
        rec.lastNotifiedAt = now;
        await writeOne(rec);
      } catch (err) {
        const code = err && err.statusCode;
        if (code === 404 || code === 410) {
          await removeOne(rec.id);
          dropped += 1;
        } else {
          console.error("broadcast send failed", code, err && err.body ? String(err.body).slice(0, 200) : err);
        }
      }
    }

    try {
      await redisCommand(["SET", LAST_KEY, JSON.stringify({ hash: digest, at: Date.now(), title }), "EX", String(DEDUPE_SECONDS)]);
    } catch (err) {
      /* 기록 실패는 발송 결과에 영향 없음 */
    }

    return sendJson(res, 200, { ok: true, dry: false, targeted: subs.length, sent, dropped, title, url });
  } catch (err) {
    console.error("push-broadcast failed", err);
    return sendJson(res, 500, {
      error: "broadcast-failed",
      detail: String(err && err.message ? err.message : err).slice(0, 200),
    });
  }
};
