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
const visuals = new Map();

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

function clamp01(value) {
  return Math.max(0, Math.min(1, value));
}

function getVisual(key) {
  return visuals.get(key) || null;
}

function progressForState(isOn) {
  return isOn ? 1 : 0;
}

function progressFromClientY(track, clientY) {
  const rect = track.getBoundingClientRect();
  const t = clamp01((clientY - rect.top) / rect.height);
  return 1 - t;
}

function setHandleFromProgress(visual, progress) {
  if (!visual?.track || !visual?.handle) return;
  const rect = visual.track.getBoundingClientRect();
  const top = 2;
  const handleSize = 60;
  const travel = Math.max(0, rect.height - handleSize - top);
  const y = top + (1 - clamp01(progress)) * travel;
  visual.handle.style.setProperty("--handleY", `${y}px`);
}

function setVideoFromProgress(visual, progress) {
  const video = visual?.video;
  if (!video) return;

  const duration = Number.isFinite(video.duration) ? video.duration : 0;
  if (!duration || duration <= 0) {
    visual.pendingProgress = progress;
    return;
  }

  // This Tenor asset reads happy -> sad; invert so top=happy, bottom=sad.
  const desired = (1 - clamp01(progress)) * duration;
  const safe = Math.max(0, Math.min(duration - 0.001, desired));
  try {
    video.pause();
    video.currentTime = safe;
  } catch {
    // iOS/Safari can throw if seek is too early; keep pending.
    visual.pendingProgress = progress;
  }
}

function setVisualProgress(key, progress) {
  const visual = getVisual(key);
  if (!visual) return;
  visual.progress = progress;
  setHandleFromProgress(visual, progress);
  setVideoFromProgress(visual, progress);
}

function animateVisualProgress(key, targetProgress, durationMs = 420) {
  const visual = getVisual(key);
  if (!visual) return;

  const from = Number.isFinite(visual.progress) ? visual.progress : 0;
  const to = clamp01(targetProgress);
  if (Math.abs(from - to) < 0.001) {
    setVisualProgress(key, to);
    return;
  }

  const start = performance.now();
  const ease = (t) => 1 - Math.pow(1 - t, 3);

  const tick = (now) => {
    const t = clamp01((now - start) / durationMs);
    const v = from + (to - from) * ease(t);
    setVisualProgress(key, v);
    if (t < 1 && !visual.dragging) visual.raf = requestAnimationFrame(tick);
  };

  if (visual.raf) cancelAnimationFrame(visual.raf);
  visual.raf = requestAnimationFrame(tick);
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
        animateVisualProgress(toFlip, 0, 520);
      }
    }
    entry.on = true;
    entry.onAt = Date.now();
  } else {
    entry.on = false;
    entry.onAt = null;
  }

  renderTopic(key);
  if (cause !== "init") {
    animateCard(key, nextOn ? "on" : "off");
    animateVisualProgress(key, progressForState(nextOn), 460);
  } else {
    setVisualProgress(key, progressForState(nextOn));
  }
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
  const handle = card.querySelector('[data-role="handle"]');
  const video = card.querySelector('[data-role="pepeVid"]');
  const img = card.querySelector('[data-role="pepeImg"]');

  visuals.set(key, {
    card,
    track,
    handle,
    video,
    img,
    progress: 0,
    dragging: false,
    raf: null,
    pendingProgress: null,
    suppressClick: false,
  });

  video?.addEventListener("loadedmetadata", () => {
    card.dataset.pepe = "video";
    const visual = getVisual(key);
    if (!visual) return;
    const p = visual.pendingProgress ?? visual.progress ?? progressForState(state[key].on);
    visual.pendingProgress = null;
    setVideoFromProgress(visual, p);
  });
  video?.addEventListener("error", () => {
    card.dataset.pepe = "gif";
  });

  track?.addEventListener("click", (e) => {
    const visual = getVisual(key);
    if (visual?.suppressClick) return;
    const progress = progressFromClientY(track, e.clientY);
    setTopic(key, progress >= 0.5);
  });

  track?.addEventListener("pointerdown", (e) => {
    if (!track) return;
    const visual = getVisual(key);
    if (!visual) return;
    visual.suppressClick = true;
    visual.dragging = true;
    if (visual.raf) cancelAnimationFrame(visual.raf);

    track.setPointerCapture?.(e.pointerId);
    const progress = progressFromClientY(track, e.clientY);
    setVisualProgress(key, progress);

    const move = (ev) => {
      const p = progressFromClientY(track, ev.clientY);
      setVisualProgress(key, p);
    };

    const up = (ev) => {
      track.removeEventListener("pointermove", move);
      track.removeEventListener("pointerup", up);
      track.removeEventListener("pointercancel", up);

      const finalProgress = progressFromClientY(track, ev.clientY);
      visual.dragging = false;
      window.setTimeout(() => {
        visual.suppressClick = false;
      }, 0);
      setTopic(key, finalProgress >= 0.5);
    };

    track.addEventListener("pointermove", move);
    track.addEventListener("pointerup", up);
    track.addEventListener("pointercancel", up);
  });

  toggle?.addEventListener("keydown", (e) => {
    if (e.key !== "ArrowUp" && e.key !== "ArrowDown" && e.key !== " " && e.key !== "Enter") return;
    e.preventDefault();
    if (e.key === "ArrowUp") setTopic(key, true);
    else if (e.key === "ArrowDown") setTopic(key, false);
    else setTopic(key, !state[key].on);
  });

  renderTopic(key);
  setVisualProgress(key, progressForState(state[key].on));
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

  for (const card of document.querySelectorAll(".card")) {
    const img = card.querySelector('[data-role="pepeImg"]');

    img?.addEventListener("error", () => {
      img.src = `data:image/svg+xml;charset=utf-8,${fallbackSvg}`;
    });
    // Default to GIF until per-card video metadata loads.
    card.dataset.pepe = "gif";
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
