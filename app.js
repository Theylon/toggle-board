const TOPIC_LABELS = {
  ai: "AI",
  crypto: "Crypto",
  war: "War in the Middle East",
};

const state = {
  ai: { on: false, onAt: null },
  crypto: { on: false, onAt: null },
  war: { on: false, onAt: null },
};

const cards = new Map();

function fmtMeta(isOn) {
  return isOn ? "WE’RE SO BACK" : "IT’S OVER";
}

function onCount() {
  return Object.values(state).filter((x) => x.on).length;
}

function oldestOnKey(excludeKey) {
  let bestKey = null;
  let bestTs = Infinity;
  for (const [key, entry] of Object.entries(state)) {
    if (key === excludeKey) continue;
    if (!entry.on || entry.onAt == null) continue;
    if (entry.onAt < bestTs) {
      bestTs = entry.onAt;
      bestKey = key;
    }
  }
  return bestKey;
}

let toastTimer = null;
function showToast(message) {
  const toast = document.querySelector(".toast");
  const msg = document.querySelector('[data-role="toastMsg"]');
  if (!toast || !msg) return;

  msg.textContent = message;
  toast.hidden = false;
  window.clearTimeout(toastTimer);
  toastTimer = window.setTimeout(() => {
    toast.hidden = true;
  }, 3200);
}

function animateCard(key, kind) {
  const card = cards.get(key);
  if (!card) return;

  const className = kind === "on" ? "pulseOn" : kind === "off" ? "pulseOff" : kind === "bonk" ? "bonk" : null;
  if (!className) return;

  card.classList.remove("pulseOn", "pulseOff", "bonk");
  void card.offsetWidth;
  card.classList.add(className);

  const onEnd = () => {
    card.classList.remove(className);
    card.removeEventListener("animationend", onEnd);
  };
  card.addEventListener("animationend", onEnd);
}

function setTopic(key, nextOn, cause = "user") {
  const entry = state[key];
  if (!entry) return;
  if (entry.on === nextOn) return;

  if (nextOn) {
    if (onCount() >= 2) {
      const toFlip = oldestOnKey(key);
      if (toFlip) {
        state[toFlip].on = false;
        state[toFlip].onAt = null;
        renderTopic(toFlip);
        animateCard(toFlip, "bonk");
        showToast(`Capacity is 2 — BONK: flipped ${TOPIC_LABELS[toFlip]} to “IT’S OVER”.`);
      }
    }
    entry.on = true;
    entry.onAt = Date.now();
  } else {
    entry.on = false;
    entry.onAt = null;
  }

  renderTopic(key);
  if (cause !== "init") animateCard(key, nextOn ? "on" : "off");
}

function renderTopic(key) {
  const card = cards.get(key);
  const entry = state[key];
  if (!card || !entry) return;

  const meta = card.querySelector('[data-role="meta"]');
  const toggle = card.querySelector('[data-role="toggle"]');

  const isOn = entry.on === true;
  card.dataset.state = isOn ? "on" : "off";
  if (meta) meta.textContent = fmtMeta(isOn);
  if (toggle) toggle.setAttribute("aria-checked", isOn ? "true" : "false");
}

function wireCard(card) {
  const key = card.getAttribute("data-key");
  if (!key || !(key in state)) return;
  cards.set(key, card);

  const toggle = card.querySelector('[data-role="toggle"]');
  const track = card.querySelector('[data-role="track"]');

  const setFromClientY = (clientY) => {
    if (!track) return;
    const rect = track.getBoundingClientRect();
    const mid = rect.top + rect.height / 2;
    setTopic(key, clientY < mid);
  };

  track?.addEventListener("click", (e) => {
    setFromClientY(e.clientY);
  });

  toggle?.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (e.key === "ArrowUp") setTopic(key, true);
    else if (e.key === "ArrowDown") setTopic(key, false);
    else setTopic(key, !state[key].on);
  });

  renderTopic(key);
}

function setPepeFallbacks() {
  const fallbackSvg = encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180">
      <defs>
        <radialGradient id="g" cx="35%" cy="30%" r="80%">
          <stop offset="0%" stop-color="#7dffb9" stop-opacity=".26"/>
          <stop offset="55%" stop-color="#7bd3ff" stop-opacity=".10"/>
          <stop offset="100%" stop-color="#0b0c12" stop-opacity="0"/>
        </radialGradient>
      </defs>
      <rect width="180" height="180" rx="28" fill="#0b0c12"/>
      <rect width="180" height="180" rx="28" fill="url(#g)"/>
      <g fill="#eef0ff" opacity=".9">
        <path d="M58 104c10 12 23 18 39 18 17 0 31-7 42-20 4-5-3-12-8-7-9 11-20 16-34 16-13 0-24-5-32-14-5-5-12 2-7 7z"/>
        <circle cx="64" cy="76" r="12"/>
        <circle cx="116" cy="74" r="13"/>
      </g>
      <text x="90" y="156" text-anchor="middle" font-family="ui-monospace,Menlo,monospace" font-size="12" fill="#b0b6da" opacity=".9">drop assets/pepe.gif</text>
    </svg>`
  );

  for (const img of document.querySelectorAll(".pepeImg")) {
    img.addEventListener("error", () => {
      img.src = `data:image/svg+xml;charset=utf-8,${fallbackSvg}`;
    });
  }
}

function init() {
  setPepeFallbacks();
  document.querySelectorAll(".card").forEach(wireCard);

  const toast = document.querySelector(".toast");
  toast?.querySelector(".toastClose")?.addEventListener("click", () => {
    toast.hidden = true;
  });
}

init();
