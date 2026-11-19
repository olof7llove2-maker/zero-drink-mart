/* 띠니픽 — BGM: 유튜브 (JINBO, Hersh, PoPoMo 「All That You Wanted」)
   재영 님(2026-11-19): "그때처럼 걍 유툽으로 틀자"
   - POCLANOS 공식 오디오(videoId 0-DwYWZC870 · 4분 5초)를 YouTube IFrame API로 재생합니다.
     임베드·재생 가능 여부는 ttini.kr에서 직접 띄워 확인했습니다(2026-11-19).
   - 아이폰(사파리·크롬 모두 WebKit)은 화면 밖(left:-10000px)·display:none 플레이어의 소리를
     막습니다. 그래서 플레이어는 화면 안(좌하단)에 1px로 깔아 두고 그 안에서 재생합니다.
   - 첫 로드에는 소리 없는 미리 재생만 걸어 둡니다(무음 자동재생은 iOS도 허용).
     사용자가 화면을 탭하거나 우하단 🔇 버튼을 누르면 그 제스처 안에서
     unMute() + playVideo()로 바로 소리가 납니다. 첫 소리 때는 곡을 처음부터.
   - 켜짐 표시는 실제로 소리가 나는지(unMute + 재생 상태) 확인한 뒤에만 켭니다.
     막히면 표시를 되돌리고, 다음 탭에서 다시 시도합니다.
   - 끈 기록(localStorage ttini-bgm-off)이 있으면 자동으로 켜지도, 미리 받지도 않습니다.
   - 끄고 켜는 곳은 푸터의 1줄 컨트롤과 화면 우하단 떠 있는 작은 버튼 두 곳이고(r39),
     둘 다 같은 상태를 보고 같이 바뀝니다. */

(function () {
  "use strict";

  var btn = document.getElementById("bgm-toggle");
  var stateEl = document.getElementById("bgm-state");
  var nameEl = document.getElementById("bgm-name");
  var bar = document.getElementById("foot-bgm");
  var fab = document.getElementById("bgm-fab");
  var fabIco = document.getElementById("bgm-fab-ico");
  var host = document.getElementById("bgm-yt");
  if (!btn || !host) return;

  var VIDEO_ID = "0-DwYWZC870"; /* [Official Audio] JINBO, Hersh, PoPoMo - All That You Wanted */
  var SONG = "All That You Wanted";
  var ARTIST = "Hersh";
  var LABEL = SONG + " · ";

  var VOLUME = 30; /* 0~100 — 대화를 덮지 않을 만큼만 */
  var FADE_IN = 700;
  var VERIFY_MS = 2200;
  var KEY_OFF = "ttini-bgm-off";
  /* iOS 사파리는 touchstart·pointerdown 에서 오디오 잠금을 풀지 않습니다.
     touchend·click 에서만 풀리므로, 시작 신호를 이 셋으로만 겁니다. */
  var GESTURES = ["touchend", "click", "keydown"];

  var player = null;
  var ready = false;
  var want = false; /* 사용자가 소리를 원하는 상태 */
  var on = false; /* 실제로 소리가 나고 있다고 확인된 상태(버튼 표시) */
  var firstSound = true;
  var retried = false;
  var armed = false;
  var apiLoading = false;
  var apiFailed = false;
  var apiCbs = [];
  var bootTimer = 0;
  var verifyTimer = 0;
  var rampTimer = 0;

  if (nameEl) nameEl.textContent = LABEL + ARTIST;

  /* ── 설정 기억 ─────────────────────────────────────── */

  function readOff() {
    try {
      return window.localStorage.getItem(KEY_OFF) === "1";
    } catch (err) {
      return false;
    }
  }
  function writeOff(off) {
    try {
      if (off) window.localStorage.setItem(KEY_OFF, "1");
      else window.localStorage.removeItem(KEY_OFF);
    } catch (err) {}
  }

  /* ── 화면 표시 ─────────────────────────────────────── */

  function paint() {
    btn.classList.toggle("is-on", on);
    btn.setAttribute("aria-pressed", on ? "true" : "false");
    btn.setAttribute("aria-label", on ? "배경음악 끄기" : "배경음악 켜기");
    if (stateEl) stateEl.textContent = on ? "ON" : "OFF";
    /* r39 — 바로 꺼야 하니까 문구보다 아이콘으로 상태를 보여 줍니다 */
    if (fab) {
      fab.classList.toggle("is-on", on);
      fab.setAttribute("aria-pressed", on ? "true" : "false");
      fab.setAttribute("aria-label", on ? "배경음악 끄기" : "배경음악 켜기");
      fab.title = on ? "배경음악 끄기" : "배경음악 켜기";
    }
    if (fabIco) fabIco.textContent = on ? "🔊" : "🔇";
  }

  /* 플레이어를 아예 못 쓰는 상황이면 죽은 버튼을 남기지 않습니다 */
  function dead() {
    want = false;
    on = false;
    paint();
    if (bar) bar.hidden = true;
    if (fab) fab.hidden = true;
    unarm();
  }

  /* ── 유튜브 IFrame API ─────────────────────────────── */

  function loadApi(cb) {
    if (window.YT && window.YT.Player) {
      cb();
      return;
    }
    if (apiFailed) return;
    apiCbs.push(cb);
    if (apiLoading) return;
    apiLoading = true;
    var prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = function () {
      apiLoading = false;
      if (typeof prev === "function") {
        try {
          prev();
        } catch (err) {}
      }
      var list = apiCbs;
      apiCbs = [];
      for (var i = 0; i < list.length; i++) {
        try {
          list[i]();
        } catch (err) {}
      }
    };
    var s = document.createElement("script");
    s.src = "https://www.youtube.com/iframe_api";
    s.async = true;
    s.onerror = function () {
      apiFailed = true;
      dead();
    };
    document.head.appendChild(s);
  }

  function ensurePlayer() {
    if (player || apiFailed) return;
    loadApi(function () {
      if (player || apiFailed) return;
      try {
        player = new window.YT.Player(host, {
          videoId: VIDEO_ID,
          width: 200,
          height: 112,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            loop: 1,
            playlist: VIDEO_ID,
            mute: 1,
            origin: window.location.origin
          },
          events: {
            onReady: onReady,
            onStateChange: onState,
            onError: onError
          }
        });
      } catch (err) {
        apiFailed = true;
        dead();
      }
    });
  }

  function onReady() {
    ready = true;
    try {
      player.setVolume(0);
      player.mute();
    } catch (err) {}
    /* 아직 소리를 원하기 전이면 ‘소리 없는 미리 재생’만 걸어 둡니다.
       아이폰도 무음 재생은 허용하고, 그 뒤 제스처에서 unMute하면 바로 소리가 납니다. */
    if (!want && !readOff()) {
      try {
        player.playVideo();
      } catch (err) {}
    }
    if (want) requestSound();
  }

  function state() {
    try {
      return player.getPlayerState();
    } catch (err) {
      return -1;
    }
  }

  function isMuted() {
    try {
      return player.isMuted();
    } catch (err) {
      return true;
    }
  }

  /* ── 소리 켜기 ─────────────────────────────────────── */

  /* 제스처 안에서 그대로 불립니다 — 사파리가 소리를 내는 조건. */
  function requestSound() {
    want = true;
    if (!ready || !player) {
      ensurePlayer();
      return;
    }
    try {
      player.setVolume(0);
      player.unMute();
      player.playVideo();
    } catch (err) {}
    /* 첫 소리 때는 곡을 처음부터 — 미리 재생이 앞서 있으면 되감습니다.
       기기에 따라 unMute 직후의 seekTo가 무시되므로 한 번 더 확인해 되감습니다. */
    if (firstSound || state() === 0) rewind();
    ramp(VOLUME, FADE_IN);
    clearTimeout(verifyTimer);
    verifyTimer = setTimeout(checkSound, VERIFY_MS);
  }

  function rewind() {
    try {
      player.seekTo(0, true);
    } catch (err) {}
    setTimeout(function () {
      if (!want || !player) return;
      var t = -1;
      try {
        t = player.getCurrentTime();
      } catch (err) {}
      if (t > 3) {
        try {
          player.seekTo(0, true);
        } catch (err) {}
      }
    }, 450);
  }

  /* 실제로 소리가 나는지 확인 — 안 되면 표시를 되돌리고 다음 탭에서 다시 시도합니다. */
  function checkSound() {
    if (!want || !player) return;
    var s = state();
    if (!isMuted() && (s === 1 || s === 3)) {
      found();
      return;
    }
    /* 한 번 더: 음소거로 재생을 걸었다가 바로 풀어 봅니다(아이폰에서 자주 통하는 순서) */
    if (!retried) {
      retried = true;
      try {
        player.mute();
        player.playVideo();
      } catch (err) {}
      setTimeout(function () {
        if (!want || !player) return;
        try {
          player.unMute();
          player.setVolume(VOLUME);
        } catch (err) {}
        setTimeout(function () {
          if (!want || !player) return;
          var s2 = state();
          if (!isMuted() && (s2 === 1 || s2 === 3)) found();
          else lost();
        }, 900);
      }, 350);
      return;
    }
    lost();
  }

  function found() {
    on = true;
    firstSound = false;
    clearTimeout(verifyTimer);
    paint();
    unarm();
  }

  function lost() {
    on = false;
    paint();
    if (!readOff()) arm(); /* 다음 탭에서 다시 시도 */
  }

  function ramp(to, ms) {
    if (!player) return;
    var t0 = Date.now();
    clearInterval(rampTimer);
    rampTimer = setInterval(function () {
      if (!player || !want) {
        clearInterval(rampTimer);
        return;
      }
      var k = Math.min(1, (Date.now() - t0) / ms);
      try {
        player.setVolume(Math.round(to * k));
      } catch (err) {}
      if (k >= 1) clearInterval(rampTimer);
    }, 60);
  }

  function onState(e) {
    var s = e && e.data;
    if (s === 1) {
      if (want && !isMuted()) found();
    } else if (s === 0) {
      /* loop 설정이 풀린 경우에도 한 곡을 계속 이어서 */
      if (want && player) {
        try {
          player.seekTo(0, true);
          player.playVideo();
        } catch (err) {}
      }
    }
  }

  function onError() {
    /* 101·150 = 임베드 제한, 100 = 비공개·삭제, 2·5 = 재생 불가 */
    apiFailed = true;
    dead();
  }

  /* ── 켜고 끄기 ─────────────────────────────────────── */

  function turnOn() {
    writeOff(false);
    retried = false;
    want = true;
    on = true; /* 곧바로 눌린 느낌을 주고, 실제 소리는 확인해서 확정합니다 */
    paint();
    unarm();
    requestSound();
  }

  function turnOff() {
    want = false;
    on = false;
    clearTimeout(verifyTimer);
    clearInterval(rampTimer);
    paint();
    writeOff(true);
    if (player) {
      try {
        player.mute();
        player.setVolume(0);
        player.pauseVideo();
      } catch (err) {}
    }
  }

  /* ── 첫 터치에 자동 시작 ───────────────────────────── */

  function onGesture(e) {
    /* 푸터 BGM 버튼·우하단 버튼은 직접 켜고 끄는 곳이라 자동 시작 대상에서 뺍니다 */
    var t = e && e.target;
    if (t && t.closest && t.closest("#foot-bgm, #bgm-fab")) return;
    if (want) {
      unarm();
      return;
    }
    if (readOff()) {
      unarm();
      return;
    }
    if (!ready) return; /* 플레이어가 아직이면 이 탭은 넘기고 다음 탭에서 */
    turnOn();
  }

  function arm() {
    if (armed) return;
    armed = true;
    GESTURES.forEach(function (name) {
      document.addEventListener(name, onGesture, { passive: true });
    });
  }

  function unarm() {
    if (!armed) return;
    armed = false;
    GESTURES.forEach(function (name) {
      document.removeEventListener(name, onGesture, { passive: true });
    });
  }

  /* ── 버튼 ──────────────────────────────────────────── */

  btn.addEventListener("click", function (e) {
    e.preventDefault();
    if (on) turnOff();
    else turnOn();
  });

  /* r39 — 우하단 떠 있는 버튼도 같은 동작(푸터와 상태 동기화) */
  if (fab) {
    fab.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      if (on) turnOff();
      else turnOn();
    });
  }

  /* ── 미리 받기 ─────────────────────────────────────── */

  function warmNow() {
    clearTimeout(bootTimer);
    if (readOff()) return;
    ensurePlayer();
  }

  /* 첫 터치가 오면 바로, 아니면 화면이 다 뜨고 1.2초 뒤에 플레이어를 만들어 둡니다. */
  document.addEventListener("pointerdown", warmNow, { once: true, passive: true });
  document.addEventListener("keydown", warmNow, { once: true });

  function boot() {
    if (readOff()) return;
    bootTimer = setTimeout(ensurePlayer, 1200);
  }
  if (document.readyState === "complete") boot();
  else window.addEventListener("load", boot, { once: true });

  paint();
  if (!readOff()) arm();
})();
