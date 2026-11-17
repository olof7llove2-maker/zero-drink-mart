/* 띠니마트 — 잔잔한 로파이 BGM 토글
   헤더의 🎧 BGM 버튼을 누르면 audio/lofi-bgm.mp3(105초 루프)를 볼륨 0.25로 부드럽게 올려 재생하고,
   다시 누르면 볼륨을 줄인 뒤 멈춥니다. 브라우저 정책상 자동재생은 하지 않습니다(기본 OFF). */

(function () {
  "use strict";

  var btn = document.getElementById("bgm-toggle");
  var audio = document.getElementById("bgm-audio");
  if (!btn || !audio) return;

  var TARGET = 0.25;
  var FADE_IN = 900;
  var FADE_OUT = 600;

  var vol = 0;
  var raf = 0;
  var on = false;
  var ctx = null;
  var gain = null;

  /* iOS 사파리처럼 audio.volume 설정이 반영되지 않는 브라우저는
     WebAudio 게인으로 볼륨을 맞춘다. */
  function ensureGraph() {
    if (ctx) return;
    try {
      var probe = document.createElement("audio");
      probe.volume = 0.5;
      if (probe.volume === 0.5) return; // element.volume이 정상 동작하는 브라우저
      var AC = window.AudioContext || window.webkitAudioContext;
      if (!AC) return;
      ctx = new AC();
      var src = ctx.createMediaElementSource(audio);
      gain = ctx.createGain();
      gain.gain.value = 0;
      src.connect(gain);
      gain.connect(ctx.destination);
      audio.volume = 1;
    } catch (err) {
      ctx = null;
      gain = null;
    }
  }

  function apply(v) {
    vol = v;
    if (gain && ctx) gain.gain.value = v;
    else audio.volume = v;
  }

  function fadeTo(to, ms, done) {
    if (raf) cancelAnimationFrame(raf);
    var from = vol;
    var t0 = 0;
    function step(t) {
      if (!t0) t0 = t;
      var k = ms > 0 ? Math.min(1, (t - t0) / ms) : 1;
      var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease-in-out
      apply(from + (to - from) * e);
      if (k < 1) raf = requestAnimationFrame(step);
      else {
        raf = 0;
        if (done) done();
      }
    }
    raf = requestAnimationFrame(step);
  }

  function mark(isOn) {
    on = isOn;
    btn.classList.toggle("is-on", isOn);
    btn.setAttribute("aria-pressed", isOn ? "true" : "false");
    btn.setAttribute("aria-label", isOn ? "로파이 배경음악 끄기" : "로파이 배경음악 켜기");
  }

  function stop() {
    mark(false);
    fadeTo(0, FADE_OUT, function () {
      audio.pause();
    });
  }

  function start() {
    ensureGraph();
    if (ctx && ctx.state === "suspended") {
      try {
        ctx.resume();
      } catch (err) {}
    }
    apply(0);
    var played = audio.play();
    if (played && typeof played.then === "function") {
      played.then(function () {
        if (!on) return;
        fadeTo(TARGET, FADE_IN);
      }).catch(function () {
        // 자동재생 차단·음원 오류: 조용히 OFF 상태로 되돌린다
        apply(0);
        mark(false);
      });
    } else {
      fadeTo(TARGET, FADE_IN);
    }
    mark(true);
  }

  btn.addEventListener("click", function () {
    if (on) stop();
    else start();
  });

  audio.addEventListener("error", function () {
    apply(0);
    mark(false);
  });
})();
