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

function setTopic(key, nextOn) {
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
        showToast(`Only two can be “WE’RE SO BACK” — flipped ${TOPIC_LABELS[toFlip]} to “IT’S OVER”.`);
      }
    }
    entry.on = true;
    entry.onAt = Date.now();
  } else {
    entry.on = false;
    entry.onAt = null;
  }

  renderTopic(key);
}

function renderTopic(key) {
  const card = cards.get(key);
  const entry = state[key];
  if (!card || !entry) return;

  const segmented = card.querySelector(".segmented");
  const meta = card.querySelector('[data-role="meta"]');
  const buttons = card.querySelectorAll(".segBtn");

  const isOn = entry.on === true;
  card.dataset.state = isOn ? "on" : "off";
  if (segmented) segmented.dataset.state = isOn ? "on" : "off";
  if (meta) meta.textContent = fmtMeta(isOn);

  for (const btn of buttons) {
    const value = btn.getAttribute("data-value");
    const checked = isOn ? value === "on" : value === "off";
    btn.dataset.checked = checked ? "true" : "false";
    btn.setAttribute("aria-checked", checked ? "true" : "false");
  }
}

function wireCard(card) {
  const key = card.getAttribute("data-key");
  if (!key || !(key in state)) return;
  cards.set(key, card);

  const segmented = card.querySelector(".segmented");
  const buttons = Array.from(card.querySelectorAll(".segBtn"));

  for (const btn of buttons) {
    btn.addEventListener("click", () => {
      const value = btn.getAttribute("data-value");
      setTopic(key, value === "on");
    });
  }

  segmented?.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowLeft" && e.key !== "ArrowRight") return;
    e.preventDefault();
    const nextOn = e.key === "ArrowRight";
    setTopic(key, nextOn);
    const nextBtn = buttons.find((b) => b.getAttribute("data-value") === (nextOn ? "on" : "off"));
    nextBtn?.focus();
  });

  renderTopic(key);
}

function init() {
  document.querySelectorAll(".card").forEach(wireCard);

  const toast = document.querySelector(".toast");
  toast?.querySelector(".toastClose")?.addEventListener("click", () => {
    toast.hidden = true;
  });
}

init();

