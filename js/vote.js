/* 🤔 애매해요 — 상품별 익명 누적 투표 (r58)
   재영 님(2026-11-19): "의미없는 투표버튼일 수 있는데, 조금 애매해요 버튼 작게 만들어서 누적되게 만들자."

   · 카드 구매 버튼 옆, 상세 시트 구매 칸 아래에 작은 알약 버튼 하나.
   · 누르면 POST /api/vote → Upstash Redis(HINCRBY ttini:vote:meh:v1)에 1 누적.
   · 새로고침해도 숫자는 서버에서 다시 받아오고, 한 사람(브라우저)은 한 번만 셉니다(localStorage).
   · 저장소가 없거나 요청이 실패하면 숫자를 지어내지 않고 조용히 되돌립니다. */

const MEH_STORE_KEY = "ttini:vote:voted:v1";

function mehVotedLoad() {
  try {
    const raw = JSON.parse(localStorage.getItem(MEH_STORE_KEY) || "[]");
    return new Set(Array.isArray(raw) ? raw.filter((x) => typeof x === "string") : []);
  } catch (err) {
    return new Set();
  }
}

const mehState = {
  counts: {}, /* 상품ID → 누적 수 */
  loaded: new Set(), /* 서버에서 숫자를 받아온 상품ID */
  asked: new Set(), /* 요청을 보낸 상품ID(중복 요청 방지) */
  voted: mehVotedLoad(), /* 이 브라우저가 이미 누른 상품ID */
  inflight: false,
};

function mehVotedSave() {
  try {
    localStorage.setItem(MEH_STORE_KEY, JSON.stringify(Array.from(mehState.voted).slice(-600)));
  } catch (err) {
    /* 저장이 막혀도 이번 화면에서는 동작 */
  }
}

/* 카드·시트에 들어가는 작은 알약 버튼 */
function mehBtnHTML(p) {
  const id = p && p.id;
  if (!id) return "";
  const voted = mehState.voted.has(id);
  const n = mehState.counts[id];
  const has = typeof n === "number" && n > 0;
  return `<button type="button" class="meh${voted ? " is-on" : ""}" data-meh="${escapeHtml(
    id
  )}" aria-pressed="${voted}" title="가격이 애매해요? 눌러서 알려 주세요"><span class="meh-e" aria-hidden="true">🤔</span><span class="meh-t">애매해요</span><b class="meh-n"${
    has ? "" : " hidden"
  }>${has ? n : 0}</b></button>`;
}

/* 상세 시트용 — 버튼 하나 + 짧은 설명 */
function mehRowHTML(p) {
  if (!p || !p.id) return "";
  return `<div class="meh-row"><span class="meh-q">이 가격, 사기 애매한가요?</span>${mehBtnHTML(p)}</div>`;
}

function mehPaintBtn(btn) {
  if (!btn) return;
  const id = btn.getAttribute("data-meh");
  const n = mehState.counts[id];
  const has = typeof n === "number" && n > 0;
  const voted = mehState.voted.has(id);
  btn.classList.toggle("is-on", voted);
  btn.setAttribute("aria-pressed", String(voted));
  const num = btn.querySelector(".meh-n");
  if (num) {
    const text = has ? String(n) : "0";
    if (num.textContent !== text) num.textContent = text;
    if (num.hidden !== !has) num.hidden = !has;
  }
}

async function mehLoad(ids) {
  const list = (ids || []).filter(Boolean).slice(0, 60);
  if (!list.length) return;
  try {
    const res = await fetch(`/api/vote?ids=${encodeURIComponent(list.join(","))}`, { cache: "no-store" });
    const json = await res.json().catch(() => null);
    if (!json || !json.ok || !json.counts) return;
    list.forEach((id) => {
      const v = Number(json.counts[id]);
      if (Number.isFinite(v)) {
        mehState.counts[id] = v;
        mehState.loaded.add(id);
      }
    });
    document.querySelectorAll("[data-meh]").forEach(mehPaintBtn);
  } catch (err) {
    /* 숫자는 나중에 다시 시도 */
  }
}

/* 새로 그려진 카드 중 아직 숫자를 모르는 상품만 모아서 한 번에 물어봅니다. */
function mehRefresh() {
  const btns = Array.from(document.querySelectorAll("[data-meh]"));
  if (!btns.length) return;
  const need = [];
  btns.forEach((b) => {
    const id = b.getAttribute("data-meh");
    if (!id) return;
    if (!mehState.loaded.has(id) && !mehState.asked.has(id)) {
      mehState.asked.add(id);
      need.push(id);
    }
  });
  btns.forEach(mehPaintBtn);
  if (need.length) mehLoad(need);
}

document.addEventListener("click", async (e) => {
  const btn = e.target.closest ? e.target.closest("[data-meh]") : null;
  if (!btn) return;
  e.preventDefault();
  e.stopPropagation();
  const id = btn.getAttribute("data-meh");
  if (!id) return;
  if (mehState.voted.has(id)) {
    if (typeof showToast === "function") showToast("이미 애매하다고 눌렀어요");
    return;
  }
  const before = Number(mehState.counts[id]) || 0;
  mehState.voted.add(id);
  mehVotedSave();
  mehState.counts[id] = before + 1;
  mehPaintBtn(btn);
  try {
    const res = await fetch("/api/vote", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ productId: id }),
    });
    const json = await res.json().catch(() => null);
    if (json && json.ok && Number.isFinite(Number(json.count))) {
      mehState.counts[id] = Number(json.count);
      mehState.loaded.add(id);
      mehPaintBtn(btn);
      return;
    }
    throw new Error("vote-failed");
  } catch (err) {
    mehState.counts[id] = before;
    mehState.voted.delete(id);
    mehVotedSave();
    mehPaintBtn(btn);
    if (typeof showToast === "function") showToast("지금은 집계가 안 돼요. 잠시 뒤 다시 눌러 주세요");
  }
});

/* 목록이 다시 그려질 때마다 숫자를 채웁니다(무한 반복 방지: 값이 달라질 때만 글자를 바꿉니다). */
(function watchMeh() {
  if (typeof MutationObserver !== "function") return;
  let timer = null;
  const schedule = () => {
    if (timer) return;
    timer = setTimeout(() => {
      timer = null;
      mehRefresh();
    }, 120);
  };
  const start = () => {
    ["home-list", "cat-list", "search-list", "pm-body", "rank-main", "rank-unit"].forEach((id) => {
      const box = document.getElementById(id);
      if (box) new MutationObserver(schedule).observe(box, { childList: true, subtree: true });
    });
    schedule();
  };
  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", start);
  else start();
})();
