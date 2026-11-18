/* ── 웹푸시 가격(목표가) 알림 ───────────────────────────
   개인정보(전화번호·이메일)는 받지 않습니다. 브라우저가 만든 구독 객체(endpoint·키)와
   관심 상품 ID·목표가만 서버에 저장합니다. 켜고 끄는 상태는 이 브라우저에만 둡니다. */

const ALERT_KEY = "ttini:alerts:v1";
const pushState = { configured: false, publicKey: null, ready: false, alerts: {}, productId: null };

function loadAlerts() {
  try {
    const raw = localStorage.getItem(ALERT_KEY);
    const parsed = raw ? JSON.parse(raw) : null;
    pushState.alerts = parsed && typeof parsed === "object" ? parsed : {};
  } catch (err) {
    pushState.alerts = {};
  }
}

function saveAlerts() {
  try {
    localStorage.setItem(ALERT_KEY, JSON.stringify(pushState.alerts));
  } catch (err) {
    /* 저장 공간이 없으면 이번 세션만 켜 둡니다 */
  }
}

function alertOn(id) {
  return Boolean(pushState.alerts[id]);
}

/* ── 🔥 새 초특가 전체 알림 ────────────────────────────
   상품 하나를 고르지 않고 '새 특가가 뜨면' 알림을 받는 별도 구독입니다.
   상품별 목표가 알림과 같은 구독(브라우저)을 쓰지만, 서버에는 productId
   "__hotdeal_all__" 로 따로 저장해 서로 섞이지 않습니다. */

const HOTDEAL_SUB_ID = "__hotdeal_all__";

function hotdealOn() {
  return Boolean(pushState.alerts && pushState.alerts[HOTDEAL_SUB_ID]);
}

function hotdealNote() {
  if (!pushState.ready) return "알림 상태를 확인하는 중이에요…";
  if (!pushState.configured) return "알림 서버를 마지막으로 켜는 중이에요. 켜지면 알려드릴게요.";
  const env = deviceEnv();
  if (env.iOS && !isStandalone()) {
    return "아이폰은 '홈 화면에 추가'한 뒤에 켜야 알림이 와요(아이폰 16.4 이상).";
  }
  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return "이 브라우저는 알림을 지원하지 않아요. 크롬·사파리 최신 버전에서 열어 주세요.";
  }
  if (typeof Notification !== "undefined" && Notification.permission === "denied") {
    return "이 브라우저에서 알림이 차단돼 있어요. 주소창 옆 사이트 설정에서 알림을 허용으로 바꿔 주세요.";
  }
  if (hotdealOn()) return "켜 뒀어요. 새 초특가가 올라오면 이 브라우저로 알려드려요.";
  return env.iOS
    ? "홈 화면에 추가한 띠니마트에서 켜면 초특가가 뜰 때 바로 와요."
    : "상품을 하나하나 고르지 않아도 돼요. 새 초특가가 뜨면 한 번에 알려드려요.";
}

/* 아이폰은 홈 화면 앱에서만 웹푸시가 되므로 설치 안내를 같이 보여 줍니다. */
function hotdealInstallHint() {
  if (!pushState.ready || !pushState.configured) return "";
  const env = deviceEnv();
  if (!env.iOS || isStandalone()) return "";
  return `<button type="button" class="hot-install" data-hotdeal-install>📲 홈 화면에 추가하는 방법 보기</button>`;
}

function hotdealCardHTML() {
  const on = hotdealOn();
  const ready = pushState.ready && pushState.configured;
  const env = deviceEnv();
  const iosNeedsInstall = env.iOS && !isStandalone();
  /* 아이폰은 홈 화면 앱이 아니어도 토글이 눌려야 설치 안내로 이어집니다 */
  const blocked =
    ready &&
    !iosNeedsInstall &&
    (!("serviceWorker" in navigator) ||
      !("PushManager" in window) ||
      (typeof Notification !== "undefined" && Notification.permission === "denied"));
  const sub = on
    ? "켜짐 · 새 초특가·타임세일이 뜰 때 알려드려요"
    : "상품 하나씩 고르지 않아도 돼요 · 새 특가만 골라 알림";
  return `<section class="hot-card${on ? " is-on" : ""}" aria-labelledby="hot-title">
    <div class="hot-top">
      <span class="hot-ico" aria-hidden="true">🔥</span>
      <div class="hot-mid">
        <p class="hot-title" id="hot-title">새 초특가 뜨면 알림 받기</p>
        <p class="hot-sub">${sub}</p>
      </div>
      <button type="button" class="hot-switch${on ? " is-on" : ""}" role="switch" aria-checked="${
        on ? "true" : "false"
      }" data-hotdeal-toggle aria-label="새 초특가 알림 ${on ? "끄기" : "켜기"}"${
        blocked ? " disabled" : ""
      }><span class="hot-knob" aria-hidden="true"></span></button>
    </div>
    <p class="hot-note${on ? " is-on" : ""}">${hotdealNote()}</p>
    ${hotdealInstallHint()}
    <p class="hot-fine">개별 상품 목표가 알림과 <b>따로</b> 동작해요 · 전화번호·이메일 없이 브라우저 구독으로만 보내요</p>
  </section>`;
}

/* 토글을 누른 직후 화면만 바로 갱신(허브가 닫혀 있으면 표시할 곳이 없습니다) */
function refreshHotdealUI() {
  document.querySelectorAll(".hot-card").forEach((card) => {
    const on = hotdealOn();
    card.classList.toggle("is-on", on);
    const sw = card.querySelector("[data-hotdeal-toggle]");
    if (sw) {
      sw.classList.toggle("is-on", on);
      sw.setAttribute("aria-checked", on ? "true" : "false");
      sw.setAttribute("aria-label", `새 초특가 알림 ${on ? "끄기" : "켜기"}`);
    }
    const note = card.querySelector(".hot-note");
    if (note) {
      note.textContent = hotdealNote();
      note.classList.toggle("is-on", on);
    }
  });
  if (typeof refreshAlertHub === "function") refreshAlertHub();
  if (typeof refreshAlertCTA === "function") refreshAlertCTA();
}

async function enableHotdeal() {
  if (!pushState.ready) {
    showToast("알림 상태를 확인하는 중이에요. 잠깐 뒤 다시 눌러 주세요");
    return;
  }
  if (!pushState.configured) {
    showToast("알림 서버를 켜는 중이에요. 조금 뒤 다시 눌러 주세요");
    return;
  }
  const env = deviceEnv();
  if (env.iOS && !isStandalone()) {
    showToast("아이폰은 홈 화면에 추가한 뒤에 켤 수 있어요");
    if (typeof onShortcutClick === "function") onShortcutClick();
    return;
  }
  try {
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        refreshHotdealUI();
        showToast("브라우저 알림을 허용해야 초특가 알림이 와요");
        return;
      }
    }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushState.publicKey),
      });
    }
    const res = await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), productId: HOTDEAL_SUB_ID }),
    });
    if (!res.ok) throw new Error("save failed");
    pushState.alerts[HOTDEAL_SUB_ID] = { hotdeal: true, endpoint: sub.endpoint, at: Date.now() };
    saveAlerts();
    refreshAlertButtons();
    refreshHotdealUI();
    showToast("🔥 새 초특가 알림을 켰어요");
  } catch (err) {
    showToast("알림을 켜지 못했어요. 잠시 뒤 다시 시도해 주세요");
    console.error(err);
  }
}

async function disableHotdeal() {
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.ready : null;
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    const saved = pushState.alerts[HOTDEAL_SUB_ID];
    const endpoint = (sub && sub.endpoint) || (saved && saved.endpoint);
    if (endpoint) {
      await fetch("/api/push-subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, productId: HOTDEAL_SUB_ID }),
      });
    }
    delete pushState.alerts[HOTDEAL_SUB_ID];
    saveAlerts();
    /* 개별 상품 알림이 하나도 안 남았을 때만 브라우저 구독까지 해제합니다 */
    const rest = Object.keys(pushState.alerts);
    if (sub && !rest.length) {
      try {
        await sub.unsubscribe();
      } catch (err) {
        /* 이미 해제된 구독 */
      }
    }
    refreshAlertButtons();
    refreshHotdealUI();
    showToast("초특가 알림을 껐어요");
  } catch (err) {
    showToast("알림을 끄지 못했어요");
    console.error(err);
  }
}

function urlBase64ToUint8Array(base64String) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i += 1) out[i] = raw.charCodeAt(i);
  return out;
}

async function initPush() {
  loadAlerts();
  if ("serviceWorker" in navigator) {
    try {
      await navigator.serviceWorker.register("/sw.js", { scope: "/", updateViaCache: "none" });
    } catch (err) {
      /* 서비스 워커를 못 올리면 알림만 못 씁니다. 사이트는 그대로 동작해요. */
    }
  }
  try {
    const res = await fetch("/api/push-vapid", { cache: "no-store" });
    if (res.ok) {
      const json = await res.json();
      pushState.configured = Boolean(json.configured);
      pushState.publicKey = json.publicKey || null;
    }
  } catch (err) {
    pushState.configured = false;
  }
  pushState.ready = true;
  refreshAlertButtons();
}

function alertIconHTML(p) {
  const on = alertOn(p.id);
  return `<button type="button" class="btn-icon alert-btn${on ? " is-on" : ""}" data-alert="${escapeHtml(
    p.id
  )}" aria-pressed="${on}" aria-label="가격 알림" title="${on ? "알림 켜짐 · 눌러서 바꾸기" : "가격 알림 켜기"}">🔔</button>`;
}

function alertInlineHTML(p) {
  const on = alertOn(p.id);
  return `<button type="button" class="alert-inline${on ? " is-on" : ""}" data-alert="${escapeHtml(p.id)}">
    🔔 ${on ? "알림 켜짐 · 목표가 바꾸기" : "가격 내리면 알림 받기"}
  </button>`;
}

function refreshAlertButtons() {
  document.querySelectorAll("[data-alert]").forEach((btn) => {
    const on = alertOn(btn.getAttribute("data-alert"));
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", String(on));
    if (btn.classList.contains("btn-icon")) {
      btn.title = on ? "알림 켜짐 · 눌러서 바꾸기" : "가격 알림 켜기";
    } else {
      btn.textContent = `🔔 ${on ? "알림 켜짐 · 목표가 바꾸기" : "가격 내리면 알림 받기"}`;
    }
  });
}

function alertTargetDefault(p) {
  const low = state.low && state.low[p.id];
  const min = low && low.hasHistory ? Math.round(low.min) : null;
  const cur = p.price != null ? Math.round(p.price) : null;
  const suggested = min || cur || null;
  return { min, cur, suggested };
}

function alertBodyHTML(p) {
  const i = alertTargetDefault(p);
  const on = alertOn(p.id);
  const saved = pushState.alerts[p.id];
  const kakao = (state.data.site && state.data.site.kakao) || null;
  const kakaoLine = kakao
    ? `<a class="alert-kakao" href="${escapeHtml(kakao.url)}" target="_blank" rel="noopener noreferrer">💬 카톡 핫딜방에서 먼저 받기</a>`
    : "";

  if (!pushState.ready) {
    return `<p class="alert-note">알림 상태를 확인하는 중이에요…</p>`;
  }

  if (!pushState.configured) {
    return `<div class="alert-note">
        알림 서버를 마지막으로 켜는 중이에요. 켜지면 이 상품이 목표가 아래로 내려갈 때
        이 화면으로 알려드릴게요.
      </div>
      <p class="alert-sub">알림은 <b>전화번호·이메일 없이</b> 브라우저 구독으로만 보내요. 지금은 카톡방이 가장 빨라요.</p>
      ${kakaoLine}`;
  }

  const env = deviceEnv();
  if (env.iOS && !isStandalone()) {
    return `<div class="alert-note">
        아이폰은 <b>홈 화면에 추가</b>한 뒤에 알림을 켤 수 있어요(아이폰 16.4 이상).
      </div>
      <button type="button" class="alert-go" data-alert-install>📲 홈 화면에 추가하는 방법 보기</button>`;
  }

  if (!("serviceWorker" in navigator) || !("PushManager" in window)) {
    return `<div class="alert-note">이 브라우저는 웹푸시를 지원하지 않아요. 크롬·사파리 최신 버전에서 열어 주세요.</div>
      ${kakaoLine}`;
  }

  if (typeof Notification !== "undefined" && Notification.permission === "denied") {
    return `<div class="alert-note">이 브라우저에서 알림이 차단돼 있어요. 주소창 옆 사이트 설정에서 <b>알림 허용</b>으로 바꾼 뒤 다시 눌러 주세요.</div>
      ${kakaoLine}`;
  }

  const target = saved && saved.target ? saved.target : i.suggested;
  const chips = [];
  if (i.cur) chips.push(`<button type="button" class="alert-chip" data-alert-set="${i.cur}">현재가 ${won(i.cur)}</button>`);
  if (i.min && i.min !== i.cur) chips.push(`<button type="button" class="alert-chip" data-alert-set="${i.min}">60일 관측 최저 ${won(i.min)}</button>`);
  if (i.cur) {
    const d = Math.round((i.cur * 0.9) / 10) * 10;
    chips.push(`<button type="button" class="alert-chip" data-alert-set="${d}">10% 더 낮게 ${won(d)}</button>`);
  }

  return `<p class="alert-sub">이 가격 <b>이하</b>로 내려가면 딱 한 번 알려드려요.</p>
    <div class="alert-target">
      <input id="alert-target" type="number" inputmode="numeric" min="1" step="10" value="${target || ""}" aria-label="목표 가격">
      <span>원 이하</span>
    </div>
    <div class="alert-chips">${chips.join("")}</div>
    <button type="button" class="alert-go" data-alert-save>${on ? "목표가 바꾸기" : "🔔 알림 켜기"}</button>
    ${on ? `<button type="button" class="alert-off" data-alert-off>알림 끄기</button>` : ""}
    <p class="alert-fine">알림은 하루 한 번 가격이 갱신될 때 확인해요. 브라우저 알림을 지우면 구독도 함께 사라져요.</p>`;
}

function renderAlertBody(p) {
  const body = $("alert-body");
  if (!body) return;
  body.innerHTML = alertBodyHTML(p);
  const name = $("alert-name");
  if (name) name.textContent = p.name || "";
  const title = $("alert-title");
  if (title) title.textContent = alertOn(p.id) ? "🔔 가격 알림 (켜짐)" : "🔔 가격 알림";
}

function openAlert(id) {
  const p = (state.data.products || []).find((x) => x.id === id);
  const modal = $("alert-modal");
  if (!p || !modal) return;
  pushState.productId = id;
  renderAlertBody(p);
  modal.hidden = false;
  document.body.classList.add("modal-open");
  const x = $("alert-x");
  if (x) x.focus({ preventScroll: true });
}

function closeAlert() {
  const modal = $("alert-modal");
  if (!modal || modal.hidden) return;
  modal.hidden = true;
  if (!document.querySelector(".pm-modal:not([hidden]), .install-modal:not([hidden]), .rec-modal:not([hidden]), .hub-modal:not([hidden])")) {
    document.body.classList.remove("modal-open");
  }
}

async function enableAlert(p, target) {
  if (!(target > 0)) {
    showToast("목표 가격을 넣어 주세요");
    return;
  }
  try {
    if (typeof Notification !== "undefined" && Notification.permission !== "granted") {
      const perm = await Notification.requestPermission();
      if (perm !== "granted") {
        renderAlertBody(p);
        return;
      }
    }
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) {
      sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(pushState.publicKey),
      });
    }
    const res = await fetch("/api/push-subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ subscription: sub.toJSON(), productId: p.id, targetPrice: Math.round(target) }),
    });
    if (!res.ok) throw new Error("save failed");
    pushState.alerts[p.id] = { target: Math.round(target), endpoint: sub.endpoint };
    saveAlerts();
    refreshAlertButtons();
    renderAlertBody(p);
    showToast(`알림 켰어요 · ${won(Math.round(target))} 이하가 되면 알려드려요`);
  } catch (err) {
    showToast("알림을 켜지 못했어요. 잠시 뒤 다시 시도해 주세요");
    console.error(err);
  }
}

async function disableAlert(p) {
  try {
    const reg = "serviceWorker" in navigator ? await navigator.serviceWorker.ready : null;
    const sub = reg ? await reg.pushManager.getSubscription() : null;
    const endpoint = (sub && sub.endpoint) || (pushState.alerts[p.id] && pushState.alerts[p.id].endpoint);
    if (endpoint) {
      await fetch("/api/push-subscribe", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ endpoint, productId: p.id }),
      });
    }
    delete pushState.alerts[p.id];
    saveAlerts();
    if (sub && !Object.keys(pushState.alerts).length) {
      try {
        await sub.unsubscribe();
      } catch (err) {
        /* 이미 해제된 구독 */
      }
    }
    refreshAlertButtons();
    renderAlertBody(p);
    showToast("알림을 껐어요");
  } catch (err) {
    showToast("알림을 끄지 못했어요");
    console.error(err);
  }
}

function initPushUI() {
  document.addEventListener("click", (e) => {
    const opener = e.target.closest("[data-alert]");
    if (opener) {
      e.preventDefault();
      openAlert(opener.getAttribute("data-alert"));
      return;
    }
    const modal = $("alert-modal");
    if (modal && !modal.hidden && e.target === modal) {
      closeAlert();
      return;
    }
    if (e.target.closest("#alert-x")) {
      closeAlert();
      return;
    }
    if (e.target.closest("[data-alert-install]")) {
      closeAlert();
      if (typeof onShortcutClick === "function") onShortcutClick();
      return;
    }
    if (e.target.closest("[data-hotdeal-install]")) {
      if (typeof closeAlertHub === "function") closeAlertHub();
      else closeAlert();
      if (typeof onShortcutClick === "function") onShortcutClick();
      return;
    }
    const hotToggle = e.target.closest("[data-hotdeal-toggle]");
    if (hotToggle) {
      if (hotToggle.disabled) return;
      if (hotdealOn()) disableHotdeal();
      else enableHotdeal();
      return;
    }
    const chip = e.target.closest("[data-alert-set]");
    if (chip) {
      const input = $("alert-target");
      if (input) input.value = chip.getAttribute("data-alert-set");
      return;
    }
    if (e.target.closest("[data-alert-save]")) {
      const p = (state.data.products || []).find((x) => x.id === pushState.productId);
      const input = $("alert-target");
      if (p && input) enableAlert(p, Number(input.value));
      return;
    }
    if (e.target.closest("[data-alert-off]")) {
      const p = (state.data.products || []).find((x) => x.id === pushState.productId);
      if (p) disableAlert(p);
    }
  });
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") closeAlert();
  });
}

/* ── 알림 허브 '지금 많이 보는 상품' ───────────────────
   고정 배열 대신 오늘의 역대급 할인 · 실제 가격 인하/저점 · 단백질 인기 상품에서
   KST 날짜 시드로 6개를 골라 매일 바뀌게 합니다 (재영 님 2026-11-18 지시). */
function hubPicks(n) {
  const limit = n || 6;
  const dayKey = typeof spotDayKey === "function" ? spotDayKey() : "";
  const out = [];
  const seen = new Set();
  const usable = (p) =>
    p && p.image && p.affiliateUrl && typeof p.price === "number" &&
    (typeof matchesSource !== "function" || matchesSource(p));
  const add = (p) => {
    if (!usable(p) || out.length >= limit || seen.has(p.id)) return;
    seen.add(p.id);
    out.push(p);
  };

  /* ① 오늘의 역대급 할인 앞쪽 2개 */
  const spot = typeof spotlightPicks === "function" ? spotlightPicks(limit) : [];
  spot.slice(0, 2).forEach(add);

  /* ② 실제로 가격이 내렸거나 60일 저점에 붙은 상품 */
  const deals = (state.data.products || [])
    .filter(usable)
    .map((p) => {
      const drop = typeof spotDropOf === "function" ? spotDropOf(p, dayKey) : null;
      const low = typeof lowStats === "function" ? lowStats(p) : { state: "none" };
      let score = 0;
      if (drop) score = 2 + Math.min(drop.pct, 30) / 30 + (drop.days <= 0 ? 1 : 0);
      else if (low.state === "low") score = 1.4;
      else if (low.state === "near") score = 0.8;
      return { p, score };
    })
    .filter((x) => x.score > 0)
    .sort((a, b) => b.score - a.score || (b.p.popularScore || 0) - (a.p.popularScore || 0));
  deals.slice(0, 2).forEach((x) => add(x.p));

  /* ③ 단백질 인기 — 상위 10개를 오늘 시드로 섞어, 아직 없는 것 중 첫 상품 */
  const prot = (state.data.products || [])
    .filter((p) => usable(p) && (p.part === "protein" || p.part === "shake"))
    .sort(
      (a, b) =>
        (b.popularScore || 0) - (a.popularScore || 0) || (b.reviewCount || 0) - (a.reviewCount || 0)
    )
    .slice(0, 10);
  const protOrder = prot
    .map((p) => ({ p, k: typeof spotHash === "function" ? spotHash(`${p.id}|${dayKey}|hub`) : 0 }))
    .sort((a, b) => b.k - a.k)
    .map((x) => x.p);
  protOrder.slice(0, 2).forEach(add);

  /* ④ 모자라면 가격 인하 → 오늘의 할인 → 단백질 인기 순으로 채웁니다 */
  deals.forEach((x) => add(x.p));
  spot.forEach(add);
  protOrder.forEach(add);
  return out.slice(0, limit);
}
