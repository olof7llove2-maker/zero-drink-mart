/* 띠니마트 서비스 워커
   하는 일은 두 가지뿐입니다: 푸시 알림 받기, 알림을 누르면 그 상품으로 이동.
   사이트 파일은 캐시하지 않아요(가격이 항상 새로 보이도록). */

self.addEventListener("install", () => {
  self.skipWaiting();
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

self.addEventListener("push", (event) => {
  let data = {};
  try {
    data = event.data ? event.data.json() : {};
  } catch (err) {
    data = { body: event.data ? event.data.text() : "목표 가격에 도달했어요" };
  }
  const title = data.title || "띠니마트 최저가 알림";
  const options = {
    body: data.body || "목표 가격에 도달했어요",
    icon: "/images/icon-192.png",
    badge: "/images/icon-192.png",
    tag: data.tag || "ttini-price",
    data: { url: data.url || "/", productId: data.productId || null },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const target = (event.notification.data && event.notification.data.url) || "/";
  const abs = new URL(target, self.location.origin).href;
  event.waitUntil(
    (async () => {
      const windows = await self.clients.matchAll({ type: "window", includeUncontrolled: true });
      for (const client of windows) {
        if (client.url === abs) {
          return client.focus();
        }
      }
      for (const client of windows) {
        if (client.url.startsWith(self.location.origin) && "navigate" in client) {
          await client.navigate(abs);
          return client.focus();
        }
      }
      if (self.clients.openWindow) return self.clients.openWindow(abs);
      return null;
    })()
  );
});
