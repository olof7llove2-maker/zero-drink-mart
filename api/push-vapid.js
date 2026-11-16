/* GET /api/push-vapid → 프론트가 알림을 켤 수 있는 상태인지, 공개키가 무엇인지 알려줍니다. */

const { VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY, storageConfigured, sendJson } = require("./_lib");

module.exports = (req, res) => {
  res.setHeader("Cache-Control", "no-store");
  if (req.method !== "GET" && req.method !== "HEAD") {
    res.setHeader("Allow", "GET");
    return sendJson(res, 405, { error: "method-not-allowed" });
  }
  const storage = storageConfigured();
  const vapid = Boolean(VAPID_PRIVATE_KEY && VAPID_PUBLIC_KEY);
  return sendJson(res, 200, {
    configured: storage && vapid,
    publicKey: VAPID_PUBLIC_KEY,
    storage,
    vapid,
  });
};
