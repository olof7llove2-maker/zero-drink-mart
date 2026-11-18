/* 띠니픽 조회수 표시 — 서버(/api/views)가 실제 방문을 센 값만 보여 줍니다.
   · 한 세션에 한 번만 카운트됩니다(sessionStorage 표시).
   · 저장소(Upstash Redis)가 연결되지 않았으면 숫자를 지어내지 않고 그냥 숨깁니다. */

(function () {
  "use strict";

  var KEY = "ttini:views:hit";
  var box = document.getElementById("view-stat");
  var todayEl = document.getElementById("view-today");
  var totalEl = document.getElementById("view-total");
  if (!box || !todayEl || !totalEl) return;

  function fmt(n) {
    return Number(n).toLocaleString("ko-KR");
  }

  var counted = false;
  try {
    counted = sessionStorage.getItem(KEY) === "1";
  } catch (err) {
    counted = false;
  }

  var url = counted ? "/api/views" : "/api/views?hit=1";
  var ctrl = typeof AbortController === "function" ? new AbortController() : null;
  if (ctrl) setTimeout(function () { ctrl.abort(); }, 6000);

  fetch(url, {
    method: "GET",
    cache: "no-store",
    headers: { Accept: "application/json" },
    signal: ctrl ? ctrl.signal : undefined,
  })
    .then(function (res) {
      return res.ok ? res.json() : null;
    })
    .then(function (data) {
      if (!data || !data.ok || typeof data.total !== "number") return;
      totalEl.textContent = fmt(data.total);
      todayEl.textContent = typeof data.today === "number" ? fmt(data.today) : "-";
      box.hidden = false;
      if (!counted) {
        try {
          sessionStorage.setItem(KEY, "1");
        } catch (err) {}
      }
    })
    .catch(function () {
      /* 조회수를 못 받아도 사이트는 그대로 씁니다 */
    });
})();
