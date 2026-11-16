/* POST /api/push-subscribe   { subscription, productId, targetPrice }  → 알림 저장(구독/목표가)
   DELETE /api/push-subscribe { endpoint, productId }                  → 알림 해제

   저장하는 것은 브라우저가 만든 구독 객체와 관심 상품·목표가뿐입니다.
   전화번호·이메일·이름은 받지 않습니다. */

const { pushConfigured, subId, writeOne, removeOne, sendJson, readBody } = require("./_lib");

const MAX_TARGET = 10000000;

function validSubscription(sub) {
  if (!sub || typeof sub !== "object") return null;
  const endpoint = String(sub.endpoint || "");
  const keys = sub.keys || {};
  const p256dh = String(keys.p256dh || "");
  const auth = String(keys.auth || "");
  if (!/^https:\/\/[^\s]{10,1500}$/.test(endpoint)) return null;
  if (p256dh.length < 40 || p256dh.length > 200) return null;
  if (auth.length < 8 || auth.length > 100) return null;
  return { endpoint, keys: { p256dh, auth } };
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (!pushConfigured()) {
    return sendJson(res, 503, { error: "push-not-configured" });
  }
  const body = readBody(req);

  try {
    if (req.method === "POST") {
      if (!body) return sendJson(res, 400, { error: "bad-json" });
      const subscription = validSubscription(body.subscription);
      const productId = String(body.productId || "").slice(0, 120);
      const targetPrice = Math.round(Number(body.targetPrice));
      if (!subscription) return sendJson(res, 400, { error: "bad-subscription" });
      if (!/^[a-z0-9][a-z0-9-]{2,119}$/i.test(productId)) return sendJson(res, 400, { error: "bad-product" });
      if (!(targetPrice > 0) || targetPrice > MAX_TARGET) return sendJson(res, 400, { error: "bad-target" });

      const id = subId(subscription.endpoint, productId);
      const now = new Date().toISOString();
      await writeOne({
        id,
        endpoint: subscription.endpoint,
        keys: subscription.keys,
        productId,
        targetPrice,
        createdAt: now,
        updatedAt: now,
        lastNotifiedAt: null,
        lastNotifiedPrice: null,
      });
      return sendJson(res, 200, { ok: true, id, targetPrice });
    }

    if (req.method === "DELETE") {
      if (!body) return sendJson(res, 400, { error: "bad-json" });
      const endpoint = String(body.endpoint || "");
      const productId = String(body.productId || "");
      if (!endpoint || !productId) return sendJson(res, 400, { error: "bad-request" });
      await removeOne(subId(endpoint, productId));
      return sendJson(res, 200, { ok: true });
    }

    res.setHeader("Allow", "POST, DELETE");
    return sendJson(res, 405, { error: "method-not-allowed" });
  } catch (err) {
    console.error("push-subscribe failed", err);
    return sendJson(res, 500, { error: "storage-error" });
  }
};
