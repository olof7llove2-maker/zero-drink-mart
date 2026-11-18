/* 띠니마트 — 푸터 1줄 잔잔한 BGM
   재영 님(2026-11-18): "헤더 BGM 버튼 빼고 푸터로, 잔잔한 음악이 첫 터치에 바로"
   - 유튜브 임베드를 떼고 audio/lofi-bgm.mp3(CC0, 105초 루프) 하나만 씁니다.
       · 유튜브 iframe은 iOS에서 화면에 띄워야만 재생되고, 뜨기까지 2~3초 걸려 "바로 안 나오는" 원인이었습니다.
   - 페이지 어디든 첫 터치(touchend·click·keydown)에 자동으로 시작합니다.
       · 브라우저 자동재생 정책상 '사용자 제스처 안에서 play()'가 조건이라, 첫 터치에 맞춰 겁니다.
       · iOS 사파리는 touchstart·pointerdown 에서는 오디오/AudioContext 잠금을 풀지 않고
         touchend·click 에서만 풉니다. 그래서 시작 신호는 touchend·click·keydown 만 씁니다.
       · 그 탭에서 재생이 거부되면 듣지 않고 다음 탭에서 다시 시도합니다(armed 유지).
       · 끈 기록(localStorage ttini-bgm-off)이 있으면 자동으로 켜지 않습니다.
   - 소리는 0 → 0.28로 0.8초에 걸쳐 올립니다(첫 탭 직후 바로 들리되 놀라지 않게).
   - iOS처럼 audio.volume이 듣지 않는 브라우저는 WebAudio 게인으로 볼륨을 맞춥니다.
   - 끄고 켜는 곳은 푸터의 1줄 컨트롤 하나뿐입니다. */

(function () {
  "use strict";

  var audio = document.getElementById("bgm-audio");
  var btn = document.getElementById("bgm-toggle");
  var stateEl = document.getElementById("bgm-state");
  var bar = document.getElementById("foot-bgm");
  if (!audio || !btn) return;

  var VOLUME = 0.28; /* 첫 탭 직후 바로 존재감 있게, 그래도 잔잔하게 */
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
    btn.setAttribute("aria-label", on ? "배경음악 끄기" : "잔잔한 배경음악 켜기");
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

  audio.addEventListener("error", function () {
    if (bar) bar.hidden = true; /* 음원을 못 받으면 죽은 버튼을 남기지 않습니다 */
  });

  paint();
  if (!readOff()) arm();
})();
