/* ── 웹푸시 최저가 알림 ─────────────────────────────────
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
      await navigator.serviceWorker.register("/sw.js", { scope: "/" });
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
  )}" aria-pressed="${on}" aria-label="최저가 알림" title="${on ? "알림 켜짐 · 눌러서 바꾸기" : "최저가 알림 켜기"}">🔔</button>`;
}

function alertInlineHTML(p) {
  const on = alertOn(p.id);
  return `<button type="button" class="alert-inline${on ? " is-on" : ""}" data-alert="${escapeHtml(p.id)}">
    🔔 ${on ? "최저가 알림 켜짐 · 목표가 바꾸기" : "이 상품 최저가 알림 받기"}
  </button>`;
}

function refreshAlertButtons() {
  document.querySelectorAll("[data-alert]").forEach((btn) => {
    const on = alertOn(btn.getAttribute("data-alert"));
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", String(on));
    if (btn.classList.contains("btn-icon")) {
      btn.title = on ? "알림 켜짐 · 눌러서 바꾸기" : "최저가 알림 켜기";
    } else {
      btn.textContent = `🔔 ${on ? "최저가 알림 켜짐 · 목표가 바꾸기" : "이 상품 최저가 알림 받기"}`;
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
  if (i.min && i.min !== i.cur) chips.push(`<button type="button" class="alert-chip" data-alert-set="${i.min}">60일 최저 ${won(i.min)}</button>`);
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
  if (title) title.textContent = alertOn(p.id) ? "🔔 최저가 알림 (켜짐)" : "🔔 최저가 알림";
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
  if (!document.querySelector(".pm-modal:not([hidden]), .install-modal:not([hidden])")) {
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
