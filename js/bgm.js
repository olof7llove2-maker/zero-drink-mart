/* 띠니마트 — 잔잔한 BGM 토글 + 화면에 보이는 미니 유튜브 플레이어
   1순위: 공식 유튜브 임베드 — JINBO, Hersh, PoPoMo 「All That You Wanted」
          (POCLANOS 공식 오디오, videoId 0-DwYWZC870)
   2순위: 로컬 로파이 루프(audio/lofi-bgm.mp3) — 임베드 제한·오류·차단 시 자동 폴백

   아이폰(사파리·크롬 모두 WebKit)에서는 화면 밖에 숨긴 iframe의 재생이 막히므로
   BGM을 켜면 하단에 160×90 미니 플레이어를 실제로 띄우고, 그 안에서 재생을 겁니다.
   그래도 막히면 미니 플레이어 위에 ▶ 버튼을 띄워 한 번 눌러 재생하게 합니다.
   헤더의 🎧 BGM 버튼 하나로 켜고 끕니다(기본 OFF). */

(function () {
  "use strict";

  var btn = document.getElementById("bgm-toggle");
  var audio = document.getElementById("bgm-audio");
  var mini = document.getElementById("bgm-mini");
  var closeBtn = document.getElementById("bgm-mini-x");
  var tapBtn = document.getElementById("bgm-mini-play");
  if (!btn || !audio) return;

  var YT_VIDEO_ID = "0-DwYWZC870";
  var LOCAL_VOLUME = 0.25; // 로컬 로파이 볼륨
  var YT_VOLUME = 25; // 유튜브 볼륨(0~100) = 0.25
  var FADE_IN = 700;
  var FADE_OUT = 500;
  var YT_START_TIMEOUT = 2600;

  var on = false;
  var vol = 0;
  var raf = 0;
  var ctx = null;
  var gain = null;
  var ytTimer = 0;
  var tapTimer = 0;

  var yt = { ready: false, failed: false, playing: false, player: null, loading: false, ramp: 0, warmed: false };
  var ytCbs = [];

  /* ── 로컬 음원(폴백) ─────────────────────────────── */

  /* iOS 사파리처럼 audio.volume 설정이 반영되지 않는 브라우저는
     WebAudio 게인으로 볼륨을 맞춘다. */
  function ensureGraph() {
    if (ctx) return;
    try {
      var probe = document.createElement("audio");
      probe.volume = 0.5;
      if (probe.volume === 0.5) return;
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

  function applyLocal(v) {
    vol = v;
    if (gain && ctx) gain.gain.value = v;
    else audio.volume = v;
  }

  function fadeLocal(to, ms, done) {
    if (raf) cancelAnimationFrame(raf);
    var from = vol;
    var t0 = 0;
    function step(t) {
      if (!t0) t0 = t;
      var k = ms > 0 ? Math.min(1, (t - t0) / ms) : 1;
      var e = k < 0.5 ? 2 * k * k : 1 - Math.pow(-2 * k + 2, 2) / 2; // ease-in-out
      applyLocal(from + (to - from) * e);
      if (k < 1) raf = requestAnimationFrame(step);
      else {
        raf = 0;
        if (done) done();
      }
    }
    raf = requestAnimationFrame(step);
  }

  function playLocal() {
    ensureGraph();
    if (ctx && ctx.state === "suspended") {
      try {
        ctx.resume();
      } catch (err) {}
    }
    if (!audio.paused && vol > 0) return;
    applyLocal(0);
    var played = audio.play();
    if (played && typeof played.then === "function") {
      played
        .then(function () {
          if (on && !yt.playing) fadeLocal(LOCAL_VOLUME, FADE_IN);
        })
        .catch(function () {});
    } else {
      fadeLocal(LOCAL_VOLUME, FADE_IN);
    }
  }

  function pauseLocal() {
    fadeLocal(0, 300, function () {
      audio.pause();
    });
  }

  /* ── 유튜브 임베드 (미니 플레이어) ─────────────────── */

  function loadApi(cb) {
    if (window.YT && window.YT.Player) {
      cb();
      return;
    }
    ytCbs.push(cb);
    if (yt.loading) return;
    yt.loading = true;
    window.onYouTubeIframeAPIReady = function () {
      var list = ytCbs;
      ytCbs = [];
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
      yt.failed = true;
    };
    document.head.appendChild(s);
  }

  function ensurePlayer() {
    if (yt.player || yt.failed) return;
    loadApi(function () {
      if (yt.player || yt.failed) return;
      var host = document.getElementById("bgm-yt");
      if (!host) return;
      try {
        yt.player = new window.YT.Player(host, {
          videoId: YT_VIDEO_ID,
          width: 160,
          height: 90,
          playerVars: {
            autoplay: 0,
            controls: 0,
            disablekb: 1,
            modestbranding: 1,
            rel: 0,
            playsinline: 1,
            loop: 1,
            playlist: YT_VIDEO_ID,
            origin: window.location.origin,
          },
          events: {
            onReady: function () {
              yt.ready = true;
              try {
                yt.player.setVolume(YT_VOLUME);
              } catch (err) {}
              if (on) startYT();
            },
            onStateChange: function (e) {
              handleState(e.data);
            },
            onError: function () {
              // 임베드 제한(101·150)·삭제·재생 불가 → 로컬 로파이로 폴백
              yt.failed = true;
              yt.playing = false;
              setSource("local");
              hideTapHint();
              if (on) playLocal();
            },
          },
        });
      } catch (err) {
        yt.failed = true;
      }
    });
  }

  /* 미니 플레이어에 ▶ 안내 버튼 */
  function showTapHint() {
    if (!tapBtn || !on) return;
    tapBtn.hidden = false;
  }
  function hideTapHint() {
    clearTimeout(tapTimer);
    if (tapBtn) tapBtn.hidden = true;
  }

  function startYT() {
    if (!yt.player || !yt.ready || yt.failed) return;
    hideTapHint();
    try {
      yt.player.setVolume(YT_VOLUME);
      yt.player.playVideo();
    } catch (err) {
      yt.failed = true;
      return;
    }
    clearTimeout(ytTimer);
    ytTimer = setTimeout(function () {
      if (on && !yt.playing) {
        setSource("local");
        if (audio.paused) playLocal();
        showTapHint(); // 한 번 더 눌러야 재생되는 기기(아이폰)용
      }
    }, YT_START_TIMEOUT);
  }

  function rampYT(to, ms) {
    if (!yt.player || !yt.ready) return;
    var t0 = Date.now();
    clearInterval(yt.ramp);
    yt.ramp = setInterval(function () {
      var k = Math.min(1, (Date.now() - t0) / ms);
      try {
        yt.player.setVolume(Math.round(to * k));
      } catch (err) {}
      if (k >= 1) clearInterval(yt.ramp);
    }, 60);
  }

  function handleState(state) {
    if (state === 1) {
      // 유튜브 재생 시작 → 로컬 로파이를 줄이고 유튜브 볼륨을 올린다
      yt.playing = true;
      yt.failed = false;
      clearTimeout(ytTimer);
      hideTapHint();
      if (!on) {
        try {
          yt.player.pauseVideo();
        } catch (err) {}
        return;
      }
      setSource("youtube");
      fadeLocal(0, 400, function () {
        if (yt.playing) audio.pause();
      });
      rampYT(YT_VOLUME, 600);
    } else if (state === 2 || state === 5) {
      yt.playing = false;
    } else if (state === 0) {
      // 한 곡이 끝났을 때(loop 설정이 풀린 경우) 처음부터 다시
      if (on) {
        try {
          yt.player.seekTo(0);
          yt.player.playVideo();
        } catch (err) {}
      }
    }
  }

  /* ── 버튼 ────────────────────────────────────────── */

  function setSource(name) {
    btn.dataset.src = name; // youtube | local
  }

  function mark(isOn) {
    on = isOn;
    btn.classList.toggle("is-on", isOn);
    btn.setAttribute("aria-pressed", isOn ? "true" : "false");
    btn.setAttribute("aria-label", isOn ? "배경음악 끄기" : "배경음악 켜기");
    if (mini) mini.classList.toggle("is-on", isOn);
    if (!isOn) hideTapHint();
  }

  function turnOn() {
    mark(true);
    setSource("local");
    playLocal(); // 임베드가 준비되기 전에도 바로 소리가 나도록
    ensurePlayer();
    if (yt.ready) startYT();
    clearTimeout(tapTimer);
    tapTimer = setTimeout(function () {
      if (on && !yt.playing) showTapHint();
    }, YT_START_TIMEOUT + 400);
  }

  function turnOff() {
    mark(false);
    if (yt.player && yt.ready) {
      try {
        yt.player.pauseVideo();
      } catch (err) {}
    }
    yt.playing = false;
    pauseLocal();
  }

  btn.addEventListener("click", function () {
    if (on) turnOff();
    else turnOn();
  });

  if (closeBtn) {
    closeBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      turnOff();
    });
  }

  if (tapBtn) {
    tapBtn.addEventListener("click", function (e) {
      e.preventDefault();
      e.stopPropagation();
      hideTapHint();
      if (!on) return;
      if (!yt.player) ensurePlayer();
      startYT();
      setTimeout(function () {
        if (on && !yt.playing) {
          showTapHint();
          if (audio.paused) playLocal();
        }
      }, YT_START_TIMEOUT);
    });
  }

  /* 플레이어를 미리 만들어 두면 첫 BGM 클릭에서 바로 재생을 걸 수 있다 */
  function warm() {
    if (yt.warmed) return;
    yt.warmed = true;
    ensurePlayer();
  }
  document.addEventListener("pointerdown", warm, { once: true, passive: true });
  document.addEventListener("keydown", warm, { once: true });

  audio.addEventListener("error", function () {
    if (on && !yt.playing) applyLocal(0);
  });
})();
