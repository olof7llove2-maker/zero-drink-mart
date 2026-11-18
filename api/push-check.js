/* GET /api/push-check — 매일 가격 갱신 뒤 한 번 돌면서 목표가에 닿은 구독에 푸시를 보냅니다.
   Vercel Cron(vercel.json)이 하루 한 번 호출합니다. ?dry=1 이면 발송 없이 대상만 알려줍니다. */

const webpush = require("web-push");
const {
  VAPID_PUBLIC_KEY,
  VAPID_PRIVATE_KEY,
  VAPID_SUBJECT,
  HOTDEAL_ID,
  pushConfigured,
  readAll,
  writeOne,
  removeOne,
  sendJson,
} = require("./_lib");

function todayKst() {
  return new Date(Date.now() + 9 * 60 * 60 * 1000).toISOString().slice(0, 10);
}

module.exports = async (req, res) => {
  res.setHeader("Cache-Control", "no-store");

  const secret = process.env.CRON_SECRET;
  if (secret) {
    const auth = req.headers.authorization || "";
    if (auth !== `Bearer ${secret}`) return sendJson(res, 401, { error: "unauthorized" });
  }

  if (!pushConfigured()) {
    return sendJson(res, 200, { ok: false, reason: "push-not-configured", checked: 0, sent: 0 });
  }

  const dry = Boolean(req.query && (req.query.dry === "1" || req.query.dry === "true"));
  const host = req.headers["x-forwarded-host"] || req.headers.host || "zero-drink-mart.vercel.app";
  const proto = req.headers["x-forwarded-proto"] || "https";
  const base = `${proto}://${host}`;

  try {
    webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

    const productsRes = await fetch(`${base}/data/products.json?ts=${Date.now()}`, { headers: { "Cache-Control": "no-cache" } });
    if (!productsRes.ok) throw new Error(`products ${productsRes.status}`);
    const catalog = await productsRes.json();
    const byId = new Map((catalog.products || []).map((p) => [p.id, p]));

    const subs = await readAll();
    /* 새 초특가 전체 알림(__hotdeal_all__)은 상품이 아니라서 이 검사에서 건너뜁니다.
       상품 목록에 없다고 지우거나 실패로 세지 않습니다 — 발송은 api/push-broadcast.js 담당. */
    const priceSubs = subs.filter((rec) => rec.productId !== HOTDEAL_ID);
    const hotdealSubs = subs.length - priceSubs.length;
    const today = todayKst();
    let sent = 0;
    let hit = 0;
    let dropped = 0;
    const matched = [];

    for (const rec of priceSubs) {
      const product = byId.get(rec.productId);
      if (!product || product.price == null) continue;
      if (product.price > rec.targetPrice) continue;
      hit += 1;
      matched.push({ productId: rec.productId, price: product.price, target: rec.targetPrice });
      if (dry) continue;
      if (rec.lastNotifiedAt && String(rec.lastNotifiedAt).slice(0, 10) === today) continue;

      const payload = {
        title: `🔔 ${product.brand || "띠니마트"} 목표가 도달`,
        body: `${product.name}\n${Number(product.price).toLocaleString("ko-KR")}원 (목표 ${Number(
          rec.targetPrice
        ).toLocaleString("ko-KR")}원)`,
        url: `${base}/?p=${encodeURIComponent(rec.productId)}`,
        tag: `ttini-${rec.productId}`,
        productId: rec.productId,
      };

      try {
        await webpush.sendNotification(
          { endpoint: rec.endpoint, keys: rec.keys },
          JSON.stringify(payload),
          { TTL: 60 * 60 * 24 }
        );
        sent += 1;
        rec.lastNotifiedAt = new Date().toISOString();
        rec.lastNotifiedPrice = product.price;
        await writeOne(rec);
      } catch (err) {
        const code = err && err.statusCode;
        if (code === 404 || code === 410) {
          await removeOne(rec.id);
          dropped += 1;
        } else {
          console.error("push send failed", code, err && err.body ? String(err.body).slice(0, 200) : err);
        }
      }
    }

    return sendJson(res, 200, {
      ok: true,
      checked: priceSubs.length,
      hotdeal: hotdealSubs,
      hit,
      sent,
      dropped,
      dry,
      matched: dry ? matched.slice(0, 20) : undefined,
    });
  } catch (err) {
    console.error("push-check failed", err);
    return sendJson(res, 500, { error: "check-failed", detail: String(err && err.message ? err.message : err).slice(0, 200) });
  }
};
