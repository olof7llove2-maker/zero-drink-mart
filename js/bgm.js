/* 띠니마트 — 푸터 1줄 신나는 BGM (Kevin MacLeod 업비트 3곡)
   재영 님(2026-11-18): "잔잔한 로파이 말고 신나고 밝은 업비트로" (r37)
   - audio/ 아래 192kbps·2분·페이드인아웃 통일 MP3 3곡을 한 <audio>로 번갈아 틉니다.
       electro-cabello.mp3 · exit-the-premises.mp3 · groove-grove.mp3
       모두 Kevin MacLeod(incompetech.com), CC BY 4.0 → 푸터에 출처를 적어 둡니다.
   - 처음 곡은 열 때 무작위로 고르고, 곡이 끝나면 다른 곡으로 이어 틉니다(같은 곡 연속 없음).
       한 <audio> 요소를 계속 쓰므로 iOS에서도 두 번째 곡부터 자동재생 권한이 유지됩니다.
   - 페이지 어디든 첫 터치(touchend·click·keydown)에 자동으로 시작합니다.
       · 브라우저 자동재생 정책상 '사용자 제스처 안에서 play()'가 조건이라, 첫 터치에 맞춰 겁니다.
       · iOS 사파리는 touchstart·pointerdown 에서는 오디오/AudioContext 잠금을 풀지 않고
         touchend·click 에서만 풉니다. 그래서 시작 신호는 touchend·click·keydown 만 씁니다.
       · 그 탭에서 재생이 거부되면 듣지 않고 다음 탭에서 다시 시도합니다(armed 유지).
       · 끈 기록(localStorage ttini-bgm-off)이 있으면 자동으로 켜지 않습니다.
   - 소리는 0 → 0.28로 0.8초에 걸쳐 올립니다(첫 탭 직후 바로 들리되 놀라지 않게).
   - iOS처럼 audio.volume이 듣지 않는 브라우저는 WebAudio 게인으로 볼륨을 맞춥니다.
   - 끄고 켜는 곳은 푸터의 1줄 컨트롤 하나뿐이고, 그 줄에 지금 곡 이름이 보입니다. */

(function () {
  "use strict";

  var audio = document.getElementById("bgm-audio");
  var btn = document.getElementById("bgm-toggle");
  var stateEl = document.getElementById("bgm-state");
  var nameEl = document.getElementById("bgm-name");
  var bar = document.getElementById("foot-bgm");
  if (!audio || !btn) return;

  var TRACKS = [
    { src: "audio/electro-cabello.mp3", title: "Electro Cabello" },
    { src: "audio/exit-the-premises.mp3", title: "Exit the Premises" },
    { src: "audio/groove-grove.mp3", title: "Groove Grove" }
  ];
  var LABEL = "신나는 비트 · ";

  var VOLUME = 0.28; /* 첫 탭 직후 바로 존재감 있게, 그래도 대화를 덮지 않게 */
  var FADE_IN = 800;
  var FADE_OUT = 900;
  var KEY_OFF = "ttini-bgm-off";
  /* iOS 사파리는 touchstart/pointerdown 에서 오디오·AudioContext 잠금을 풀지 않습니다.
     touchend·click 에서만 풀리므로, 시작 신호를 이 셋으로만 겁니다. */
  var GESTURES = ["touchend", "click", "keydown"];

  var on = false;
  var starting = false;
  var armed = false;
  var ctx = null;
  var gain = null;
  var vol = 0;
  var raf = 0;
  var fails = 0;
  /* 처음 곡은 무작위 — 들어올 때마다 첫 곡이 달라집니다. */
  var idx = Math.floor(Math.random() * TRACKS.length);

  /* ── 곡 고르기 ─────────────────────────────────────── */

  function pickOther(cur) {
    var others = [];
    for (var i = 0; i < TRACKS.length; i++) if (i !== cur) others.push(i);
    if (!others.length) return cur;
    return others[Math.floor(Math.random() * others.length)];
  }

  /* 곡 이름 표시 + 필요하면 <audio> src 교체(같은 요소를 계속 씁니다). */
  function setTrack(i) {
    idx = i;
    var t = TRACKS[i];
    if (String(audio.src || "").indexOf(t.src) === -1) {
      try {
        audio.src = t.src;
        audio.load();
      } catch (err) {}
    }
    if (nameEl) nameEl.textContent = LABEL + t.title;
  }

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
    btn.setAttribute("aria-label", on ? "배경음악 끄기" : "신나는 배경음악 켜기");
    if (stateEl) stateEl.textContent = on ? "ON" : "OFF";
  }

  /* ── 볼륨 ──────────────────────────────────────────── */

  /* iOS 사파리는 audio.volume 설정이 무시되므로 WebAudio 게인을 먼저 씁니다.
     첫 제스처 안에서 만들어야 AudioContext가 잠기지 않습니다. */
  function ensureChain() {
    if (gain) return true;
    var AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return false;
    try {
      ctx = new AC();
      var src = ctx.createMediaElementSource(audio);
      gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain);
      gain.connect(ctx.destination);
      audio.volume = 1;
      return true;
    } catch (err) {
      ctx = null;
      gain = null;
      return false;
    }
  }

  function applyVol(v) {
    vol = v;
    if (gain && ctx) {
      try {
        gain.gain.value = v;
        return;
      } catch (err) {}
    }
    try {
      audio.volume = v;
    } catch (err) {}
  }

  function fadeTo(to, ms, done) {
    if (raf) {
      cancelAnimationFrame(raf);
      raf = 0;
    }
    if (gain && ctx) {
      try {
        var t = ctx.currentTime;
        gain.gain.cancelScheduledValues(t);
        gain.gain.setValueAtTime(gain.gain.value, t);
        gain.gain.linearRampToValueAtTime(to, t + Math.max(0.05, ms / 1000));
        vol = to;
        if (done) setTimeout(done, ms + 40);
        return;
      } catch (err) {}
    }
    var from = vol;
    var t0 = 0;
    function step(now) {
      if (!t0) t0 = now;
      var k = ms > 0 ? Math.min(1, (now - t0) / ms) : 1;
      var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; /* ease-in-out */
      applyVol(from + (to - from) * e);
      if (k < 1) raf = requestAnimationFrame(step);
      else {
        raf = 0;
        if (done) done();
      }
    }
    raf = requestAnimationFrame(step);
  }

  /* ── 재생/정지 ─────────────────────────────────────── */

  function play() {
    if (on || starting) return;
    starting = true;
    ensureChain();
    if (ctx && ctx.state === "suspended") {
      try {
        ctx.resume();
      } catch (err) {}
    }
    setTrack(idx);
    applyVol(0);
    var p = null;
    try {
      p = audio.play();
    } catch (err) {
      p = null;
    }
    var ok = function () {
      starting = false;
      on = true;
      fails = 0;
      paint();
      fadeTo(VOLUME, FADE_IN);
      unarm();
    };
    var fail = function () {
      starting = false;
      on = false;
      paint();
      if (readOff()) unarm();
      else arm(); /* disarm 하지 않고 armed 유지 — 다음 탭에서 다시 시도 */
    };
    if (p && typeof p.then === "function") p.then(ok).catch(fail);
    else if (audio.paused) fail();
    else ok();
  }

  function stop(save) {
    on = false;
    starting = false;
    paint();
    if (save) writeOff(true);
    fadeTo(0, FADE_OUT, function () {
      try {
        audio.pause();
      } catch (err) {}
    });
  }

  /* ── 곡이 끝나면 다음 곡 ───────────────────────────── */

  audio.addEventListener("ended", function () {
    if (!on) return;
    setTrack(pickOther(idx));
    /* 이미 VOLUME으로 맞춰 둔 게인을 그대로 씁니다 — 곡마다 페이드가 들어 있어 이어 붙입니다. */
    var p = null;
    try {
      p = audio.play();
    } catch (err) {
      p = null;
    }
    if (p && typeof p.then === "function") {
      p.catch(function () {
        /* 다음 곡 자동재생이 막히면 조용히 멈춰 두고, 다음 탭에서 이어집니다. */
        on = false;
        paint();
        if (!readOff()) arm();
      });
    }
  });

  /* ── 첫 터치에 자동 시작 ───────────────────────────── */

  function onGesture(e) {
    /* 푸터 BGM 버튼은 직접 켜고 끄는 곳이라 자동 시작 대상에서 뺍니다 */
    var t = e && e.target;
    if (t && t.closest && t.closest("#foot-bgm")) return;
    if (on) {
      unarm();
      return;
    }
    if (starting) return; /* 이미 시작 중 — 이 탭이 끝나기를 기다립니다 */
    if (readOff()) {
      unarm();
      return;
    }
    play();
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
    if (on) stop(true);
    else {
      writeOff(false);
      play();
    }
  });

  /* 한 곡이라도 못 받으면 다른 곡으로 넘어가고, 3곡 다 실패하면 죽은 버튼을 남기지 않습니다. */
  audio.addEventListener("error", function () {
    fails += 1;
    if (fails < TRACKS.length) {
      setTrack(pickOther(idx));
      if (on) {
        try {
          audio.play();
        } catch (err) {}
      }
      return;
    }
    if (bar) bar.hidden = true;
  });

  setTrack(idx); /* 첫 곡 이름을 바로 띄우고 그 곡을 미리 받아 둡니다 */
  try {
    audio.load();
  } catch (err) {}
  paint();
  if (!readOff()) arm();
})();
