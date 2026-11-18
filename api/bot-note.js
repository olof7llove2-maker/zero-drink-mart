/* 띠니 ↔ 그록봇 쪽지함 — 두 AI가 사람을 거치지 않고 메모·가격 변동·패치 내역을 주고받습니다.

   POST   /api/bot-note
     body: { from: "grok"|"ttini", kind: "price"|"audit"|"ad"|"note",
             title?: string, body: string, data?: object }
     → 최신 쪽지 1건 저장. 최대 50건만 남기고 오래된 것부터 지웁니다.
     → 201 { ok:true, note:{ id, ts, tsKst, from, kind, title, body, data, acked:false }, stored }

   GET    /api/bot-note?limit=20&from=grok|ttini&kind=price&after=<ISO시각|쪽지ID>&unacked=1
     → 최신순 쪽지 목록 { ok:true, count, stored, notes:[…], serverTime }
     `after`는 새 쪽지만 받을 때 씁니다. ISO 시각이면 그 시각보다 새 것,
     쪽지 ID면 그 쪽지보다 새 것을 돌려줍니다.

   POST   /api/bot-note   { ack: "<쪽지ID>" }   (또는 { action:"ack", id:"<쪽지ID>" })
     → 읽음/처리 표시(acked=true, ackedAt). 쪽지는 지우지 않습니다.
   DELETE /api/bot-note?id=<쪽지ID>          → 쪽지 1건 삭제
   DELETE /api/bot-note?ack=<쪽지ID>         → 읽음 표시(위 POST와 같음)

   저장(Upstash Redis REST):
     ttini:bot:notes:v1        HASH  쪽지ID → JSON
     ttini:bot:notes:v1:order  LIST  쪽지ID (0이 가장 최신)
   개인정보는 저장하지 않습니다 — 쪽지 내용과 시각, 보낸 쪽(ttini/grok)만 남깁니다.
   과호출 제한을 위해 IP를 그날 날짜로만 해시한 값(되돌릴 수 없음)을 1~2시간 TTL 카운터
   키에만 쓰고, 원래 IP·브라우저 정보는 저장하지 않습니다.

   보안: BOT_NOTE_SECRET(없으면 CRON_SECRET)이 설정돼 있으면 모든 요청에
   `Authorization: Bearer <secret>` 이 필요합니다. 설정이 없으면 열린 상태로 동작하되
   본문 16KB·시간당 호출 수 제한이 걸립니다. */

const crypto = require("crypto");
const { storageConfigured, redisCommand, sendJson, readBody } = require("./_lib");

const NOTES_KEY = "ttini:bot:notes:v1";
const ORDER_KEY = "ttini:bot:notes:v1:order";
const RATE_NS = "ttini:bot:notes:v1:rl";

const MAX_NOTES = 50; // 보관 건수
const MAX_REQUEST = 16 * 1024; // 요청 본문 16KB
const MAX_TITLE = 120;
const MAX_TEXT = 4000;
const MAX_DATA = 8 * 1024; // data 직렬화 길이
const DEFAULT_LIMIT = 20;

const FROMS = ["grok", "ttini"];
const KINDS = ["price", "audit", "ad", "note"];
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;

const REQUESTS_PER_HOUR = 120; // 출처 1곳당
const WRITES_PER_HOUR = 30; // 출처 1곳당 쓰기(POST·DELETE)
const GLOBAL_REQUESTS_PER_HOUR = 1200; // 전체

const SECRET = process.env.BOT_NOTE_SECRET || process.env.CRON_SECRET || "";

function nowKst(ms) {
  const t = new Date((ms || Date.now()) + 9 * 60 * 60 * 1000);
  return `${t.toISOString().slice(0, 10)} ${t.toISOString().slice(11, 16)} KST`;
}

function authorized(req) {
  if (!SECRET) return true;
  const auth = String(req.headers.authorization || "");
  const given = auth.startsWith("Bearer ") ? auth.slice(7).trim() : "";
  if (!given) return false;
  const a = Buffer.from(given);
  const b = Buffer.from(SECRET);
  return a.length === b.length && crypto.timingSafeEqual(a, b);
}

/* IP 원문은 저장하지 않습니다. 날짜별 소금으로 해시한 값만 시간당 카운터 키에 씁니다. */
function sourceHash(req) {
  const fwd = String(req.headers["x-forwarded-for"] || "");
  const ip = fwd.split(",")[0].trim() || String(req.headers["x-real-ip"] || "").trim() || "unknown";
  const day = new Date().toISOString().slice(0, 10);
  return crypto.createHash("sha256").update(`ttini-bot-note|${day}|${ip}`).digest("hex").slice(0, 20);
}

async function bump(key, ttlSeconds) {
  const n = Number(await redisCommand(["INCR", key]));
  if (n === 1) await redisCommand(["EXPIRE", key, ttlSeconds]);
  return n;
}

async function checkRate(req, write) {
  const hour = new Date().toISOString().slice(0, 13);
  const src = sourceHash(req);
  const mine = await bump(`${RATE_NS}:${hour}:${src}`, 7200);
  if (mine > REQUESTS_PER_HOUR) return { ok: false, scope: "source", limit: REQUESTS_PER_HOUR };
  const all = await bump(`${RATE_NS}:${hour}:all`, 7200);
  if (all > GLOBAL_REQUESTS_PER_HOUR) return { ok: false, scope: "global", limit: GLOBAL_REQUESTS_PER_HOUR };
  if (write) {
    const w = await bump(`${RATE_NS}:${hour}:w:${src}`, 7200);
    if (w > WRITES_PER_HOUR) return { ok: false, scope: "source-write", limit: WRITES_PER_HOUR };
  }
  return { ok: true };
}

async function readNotes() {
  const ids = (await redisCommand(["LRANGE", ORDER_KEY, 0, -1])) || [];
  const flat = (await redisCommand(["HGETALL", NOTES_KEY])) || [];
  const byId = new Map();
  for (let i = 0; i + 1 < flat.length; i += 2) {
    try {
      const rec = JSON.parse(flat[i + 1]);
      if (rec && rec.id) byId.set(String(flat[i]), rec);
    } catch (err) {
      /* 깨진 값은 건너뜁니다 */
    }
  }
  const notes = [];
  for (const id of ids) {
    const rec = byId.get(String(id));
    if (rec) {
      notes.push(rec);
      byId.delete(String(id));
    }
  }
  /* 순서 키에 없는 쪽지(고아)는 최신순으로 뒤에 붙여 잃지 않습니다. */
  const orphans = [...byId.values()].sort((a, b) => String(b.ts).localeCompare(String(a.ts)));
  return notes.concat(orphans);
}

async function ackNote(res, id) {
  if (!ID_RE.test(id)) return sendJson(res, 400, { ok: false, error: "bad-id" });
  const raw = await redisCommand(["HGET", NOTES_KEY, id]);
  if (!raw) return sendJson(res, 404, { ok: false, error: "not-found", id });
  let rec;
  try {
    rec = JSON.parse(raw);
  } catch (err) {
    return sendJson(res, 500, { ok: false, error: "corrupt-note", id });
  }
  if (!rec || typeof rec !== "object") return sendJson(res, 500, { ok: false, error: "corrupt-note", id });
  if (!rec.acked) {
    rec.acked = true;
    rec.ackedAt = new Date().toISOString();
    await redisCommand(["HSET", NOTES_KEY, id, JSON.stringify(rec)]);
  }
  return sendJson(res, 200, { ok: true, acked: true, note: rec });
}

async function createNote(req, res) {
  const raw = typeof req.body === "string" ? req.body : req.body ? JSON.stringify(req.body) : "";
  if (raw.length > MAX_REQUEST) {
    return sendJson(res, 413, { ok: false, error: "payload-too-large", max: MAX_REQUEST });
  }
  const body = readBody(req);
  if (!body) return sendJson(res, 400, { ok: false, error: "bad-json", hint: "JSON 본문이 필요합니다" });

  /* 읽음 표시는 from·kind 없이도 되게 먼저 처리합니다. */
  const ackId =
    typeof body.ack === "string"
      ? body.ack.trim()
      : body.action === "ack" && typeof body.id === "string"
        ? body.id.trim()
        : "";
  if (ackId) return ackNote(res, ackId);

  const warnings = [];
  const from = String(body.from || "").trim().toLowerCase();
  if (!FROMS.includes(from)) {
    return sendJson(res, 400, { ok: false, error: "bad-from", allowed: FROMS });
  }
  const kindGiven = String(body.kind || "note").trim().toLowerCase();
  let kind = kindGiven;
  if (!KINDS.includes(kind)) {
    kind = "note";
    warnings.push(`kind-normalized:${kindGiven || "(empty)"}->note`);
  }

  let text = typeof body.body === "string" ? body.body : "";
  if (!text.trim()) {
    return sendJson(res, 400, { ok: false, error: "body-required", hint: "body: string 이 필요합니다" });
  }
  if (text.length > MAX_TEXT) {
    text = text.slice(0, MAX_TEXT);
    warnings.push(`body-truncated:${MAX_TEXT}`);
  }

  let title = typeof body.title === "string" ? body.title.trim() : "";
  if (title.length > MAX_TITLE) {
    title = title.slice(0, MAX_TITLE);
    warnings.push(`title-truncated:${MAX_TITLE}`);
  }

  let data;
  if (body.data !== undefined && body.data !== null) {
    if (typeof body.data !== "object" || Array.isArray(body.data)) {
      return sendJson(res, 400, { ok: false, error: "bad-data", hint: "data는 객체(JSON object)여야 합니다" });
    }
    const serialized = JSON.stringify(body.data);
    if (serialized.length > MAX_DATA) {
      return sendJson(res, 413, { ok: false, error: "data-too-large", max: MAX_DATA });
    }
    data = body.data;
  }

  const createdMs = Date.now();
  const note = {
    id: `${createdMs.toString(36)}-${crypto.randomBytes(3).toString("hex")}`,
    ts: new Date(createdMs).toISOString(),
    tsKst: nowKst(createdMs),
    from,
    kind,
    title,
    body: text,
    data: data === undefined ? null : data,
    acked: false,
  };

  await redisCommand(["HSET", NOTES_KEY, note.id, JSON.stringify(note)]);
  await redisCommand(["LPUSH", ORDER_KEY, note.id]);
  const stored = Number(await redisCommand(["LLEN", ORDER_KEY])) || 0;
  const overflow = Math.min(stored - MAX_NOTES, MAX_NOTES);
  for (let i = 0; i < overflow; i += 1) {
    const old = await redisCommand(["RPOP", ORDER_KEY]);
    if (old) await redisCommand(["HDEL", NOTES_KEY, old]);
  }

  return sendJson(res, 201, {
    ok: true,
    note,
    stored: Math.min(stored, MAX_NOTES),
    warnings: warnings.length ? warnings : undefined,
  });
}

async function listNotes(req, res, url) {
  const warnings = [];

  let limit = DEFAULT_LIMIT;
  const qLimit = Number(url.searchParams.get("limit"));
  if (Number.isFinite(qLimit) && qLimit > 0) limit = Math.min(MAX_NOTES, Math.floor(qLimit));

  const from = String(url.searchParams.get("from") || "").trim().toLowerCase();
  if (from && !FROMS.includes(from)) {
    return sendJson(res, 400, { ok: false, error: "bad-from", allowed: FROMS });
  }
  const kind = String(url.searchParams.get("kind") || "").trim().toLowerCase();
  if (kind && !KINDS.includes(kind)) {
    return sendJson(res, 400, { ok: false, error: "bad-kind", allowed: KINDS });
  }
  const after = String(url.searchParams.get("after") || "").trim();
  const unackedOnly = url.searchParams.get("unacked") === "1" || url.searchParams.get("unacked") === "true";

  const all = await readNotes();
  let notes = all;
  if (from) notes = notes.filter((n) => n.from === from);
  if (kind) notes = notes.filter((n) => n.kind === kind);
  if (unackedOnly) notes = notes.filter((n) => !n.acked);
  if (after) {
    const asDate = Date.parse(after);
    if (Number.isFinite(asDate)) {
      const iso = new Date(asDate).toISOString();
      notes = notes.filter((n) => String(n.ts) > iso);
    } else {
      const idx = notes.findIndex((n) => n.id === after);
      if (idx >= 0) notes = notes.slice(0, idx);
      else warnings.push("after-not-found");
    }
  }

  const total = notes.length;
  return sendJson(res, 200, {
    ok: true,
    count: Math.min(total, limit),
    matched: total,
    stored: all.length,
    notes: notes.slice(0, limit),
    serverTime: new Date().toISOString(),
    serverTimeKst: nowKst(),
    open: SECRET ? undefined : true,
    warnings: warnings.length ? warnings : undefined,
  });
}

async function deleteNote(res, url) {
  const ackParam = String(url.searchParams.get("ack") || "").trim();
  if (ackParam) return ackNote(res, ackParam);

  const id = String(url.searchParams.get("id") || "").trim();
  if (!id) return sendJson(res, 400, { ok: false, error: "id-required", hint: "?id=<쪽지ID>" });
  if (!ID_RE.test(id)) return sendJson(res, 400, { ok: false, error: "bad-id" });

  const exists = await redisCommand(["HGET", NOTES_KEY, id]);
  if (!exists) return sendJson(res, 404, { ok: false, error: "not-found", id });
  await redisCommand(["HDEL", NOTES_KEY, id]);
  await redisCommand(["LREM", ORDER_KEY, 0, id]);
  return sendJson(res, 200, { ok: true, deleted: id });
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  res.setHeader("X-Robots-Tag", "noindex");

  const method = String(req.method || "GET").toUpperCase();
  if (method === "OPTIONS") {
    res.setHeader("Allow", "GET, POST, DELETE");
    res.statusCode = 204;
    return res.end();
  }
  if (method !== "GET" && method !== "POST" && method !== "DELETE") {
    res.setHeader("Allow", "GET, POST, DELETE");
    return sendJson(res, 405, { ok: false, error: "method-not-allowed" });
  }
  if (!storageConfigured()) {
    return sendJson(res, method === "GET" ? 200 : 503, { ok: false, error: "storage-not-configured" });
  }
  if (!authorized(req)) {
    return sendJson(res, 401, {
      ok: false,
      error: "unauthorized",
      hint: "Authorization: Bearer <BOT_NOTE_SECRET> 헤더가 필요합니다",
    });
  }

  const write = method !== "GET";
  try {
    const gate = await checkRate(req, write);
    if (!gate.ok) {
      res.setHeader("Retry-After", "3600");
      return sendJson(res, 429, {
        ok: false,
        error: "rate-limited",
        scope: gate.scope,
        limit: `${gate.limit}/h`,
        retryAfterSeconds: 3600,
      });
    }

    const url = new URL(req.url || "/api/bot-note", "https://zero-drink-mart.vercel.app");
    if (method === "POST") return await createNote(req, res);
    if (method === "DELETE") return await deleteNote(res, url);
    return await listNotes(req, res, url);
  } catch (err) {
    console.error("bot-note failed", err);
    const detail = String((err && err.message) || err).slice(0, 160);
    return sendJson(res, 500, { ok: false, error: "redis-error", detail });
  }
};

/* 테스트에서 내부 함수를 쓸 수 있게 열어 둡니다. (Vercel은 module.exports 함수만 호출합니다) */
module.exports._internal = { LIST_KEY: ORDER_KEY, HASH_KEY: NOTES_KEY, readNotes, MAX_NOTES };
