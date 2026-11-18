/* 띠니픽 푸시 공용 모듈 — 저장소(Upstash Redis REST)와 VAPID 설정만 다룹니다.
   저장하는 값: 브라우저가 만든 구독(endpoint·키), 관심 상품 ID, 목표가, 마지막 발송 시각.
   전화번호·이메일·이름 같은 개인정보는 받지도 저장하지도 않습니다. */

const crypto = require("crypto");

const HASH_KEY = "ttini:push:subs";

/* 새 초특가 전체 알림 전용 productId. 상품 ID와 절대 겹치지 않도록 앞뒤 밑줄을 씁니다.
   api/push-check.js 는 이 값을 일반 상품으로 보지 않고, api/push-broadcast.js 만 발송합니다. */
const HOTDEAL_ID = "__hotdeal_all__";

function isHotdeal(record) {
  return Boolean(record && record.productId === HOTDEAL_ID);
}

const REDIS_URL = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || "";
const REDIS_TOKEN = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || "";

/* 공개키는 공개되어도 되는 값이라 코드에 함께 둡니다(개인키는 환경변수에만). */
const VAPID_PUBLIC_KEY =
  process.env.VAPID_PUBLIC_KEY ||
  "BAlodXA0lfszG4Wo_xTHYmAHMM4TI0KsMx6xmUFdjfNBqUmJyPAufg4aP64P9Qu_W6W-p3DL8Oiu1u9pvztuJcg";
const VAPID_PRIVATE_KEY = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "https://zero-drink-mart.vercel.app";

function storageConfigured() {
  return Boolean(REDIS_URL && REDIS_TOKEN);
}

function pushConfigured() {
  return storageConfigured() && Boolean(VAPID_PRIVATE_KEY && VAPID_PUBLIC_KEY);
}

async function redisCommand(command) {
  const res = await fetch(REDIS_URL, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${REDIS_TOKEN}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify(command),
  });
  const text = await res.text();
  let json = null;
  try {
    json = text ? JSON.parse(text) : null;
  } catch (err) {
    json = null;
  }
  if (!res.ok) {
    const detail = (json && (json.error || json.message)) || text || String(res.status);
    throw new Error(`redis ${res.status}: ${String(detail).slice(0, 200)}`);
  }
  return json ? json.result : null;
}

async function readAll() {
  const flat = (await redisCommand(["HGETALL", HASH_KEY])) || [];
  const out = [];
  for (let i = 0; i + 1 < flat.length; i += 2) {
    try {
      const rec = JSON.parse(flat[i + 1]);
      if (rec && rec.endpoint && rec.productId) out.push(rec);
    } catch (err) {
      /* 깨진 값은 건너뜁니다 */
    }
  }
  return out;
}

async function writeOne(record) {
  await redisCommand(["HSET", HASH_KEY, record.id, JSON.stringify(record)]);
}

async function removeOne(id) {
  await redisCommand(["HDEL", HASH_KEY, id]);
}

function subId(endpoint, productId) {
  return crypto.createHash("sha256").update(`${endpoint}|${productId}`).digest("hex").slice(0, 32);
}

function sendJson(res, status, payload) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(payload));
}

function readBody(req) {
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch (err) {
      body = null;
    }
  }
  return body && typeof body === "object" ? body : null;
}

module.exports = {
  HASH_KEY,
  HOTDEAL_ID,
  isHotdeal,
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
  storageConfigured,
  pushConfigured,
  redisCommand,
  readAll,
  writeOne,
  removeOne,
  subId,
  sendJson,
  readBody,
};
