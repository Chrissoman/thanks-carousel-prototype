/* ============================================================
   Thanks offers carousel — v2 (chosen direction: Collage)
   Clean build: single card design, publisher-scoped settings.
   Scroll mechanics modelled on Apple's "Get the highlights"
   media-card gallery (same as the v1 prototype).
   ============================================================ */

(function () {
  "use strict";

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- fixed design decisions (were configs in v1) ----------
     snap: start · text fx: parallax · end of run: stop + replay ·
     card animations replay every visit · no title bar             */
  const MAX_HEIGHT = 400;   // px cap on card height
  const TRAVEL_PCT = 12;    // parallax travel, % of card width
  const FADE_RATE = 3.2;    // text opacity falloff (Apple's constant)

  /* ---------- config ----------
     PUBLISHER-SCOPED keys mirror what our CMS will store per
     publisher — they persist per selected publisher. GLOBAL keys
     ("Other settings") are shared tuning for last-minute testing. */
  const config = {
    // ---- publisher-scoped: Setup ----
    autoplay: true,
    splashIntro: true,        // "You've unlocked x offers" card
    // ---- publisher-scoped: Branding ----
    buttonColorMode: "advertiser",  // advertiser | override
    buttonColor: "#0077c8",         // used when overridden
    buttonRadiusMode: "default",    // default (full pill) | custom
    ctaRadius: 96,                  // px, when custom
    cardRadius: 20,
    theme: "light",                 // light | dark (dark design TBD)
    unitBgAuto: true,
    unitBgColor: "#f5f5f5",
    unitBorder: false,              // drawn as an INSET shadow (no layout shift)
    unitBorderColor: "#e5e5e5",
    unitRadius: 4,
    // ---- publisher-scoped: Layout ----
    unitMargin: 0,
    edgeFade: true,
    // ---- publisher brand (set via page tokens) ----
    accent: "#0077c8",
    // ---- global: Other settings ----
    dwell: 4000,
    transition: 1000,
    easing: "0.4,0,0.6,1",
    maxWidth: 760,
    peekPct: 3,
    gap: 24,
    scaleAmount: 0,           // % shrink of off-centre cards
  };
  const DEFAULTS = { ...config };
  const PUBLISHER_KEYS = [
    "autoplay", "splashIntro", "buttonColorMode", "buttonColor",
    "buttonRadiusMode", "ctaRadius", "cardRadius", "theme",
    "unitBgAuto", "unitBgColor", "unitBorder", "unitBorderColor",
    "unitRadius", "unitMargin", "edgeFade", "accent",
  ];
  const GLOBAL_KEYS = Object.keys(DEFAULTS).filter((k) => !PUBLISHER_KEYS.includes(k));

  /* ---------- publishers (the host pages in ../pages) ---------- */
  const PUBLISHERS = [
    { key: "humanitix-light", label: "Humanitix light" },
    { key: "oztix", label: "Oztix" },
    { key: "humanitix", label: "Humanitix dark" },
    { key: "ebay", label: "eBay" },
    { key: "", label: "None (bare, for testing)" },
  ];
  const IS_STATIC = !!window.__THANKS_STATIC__;
  const currentPublisher = IS_STATIC
    ? (location.pathname.match(/page-([\w-]+)\.html$/) || [])[1] || ""
    : new URLSearchParams(location.search).get("page") || "";

  /* ---------- offer content (Figma "Packaged for Claude") ----------
     `fan` offers render the card-fan art as INDIVIDUAL positioned
     elements (back / mid / front / logo) so each can be animated;
     `art` offers use a composite export. Every asset carries a 40px
     transparent margin (shadow bleed + overflowing elements). */
  const OFFERS = [
    { key: "adidas", fan: true, fanBack: "#072d42", fanMid: "#dfb45a",
      title: "You’ve scored an extra 20% off adidas Outlet",
      desc: "The season’s best styles just got even better prices. Take an extra 20% off adidas outlet picks with our exclusive code...",
      cta: "Reveal Code", color: "#000000" },
    { key: "disney", fan: true, fanBack: "#263044", fanMid: "#0d95a5",
      title: "Save on Disney+ and Hulu!",
      desc: "Get 3 months of Disney+ and Hulu for just $4.99/month.",
      cta: "Claim now", color: "#0a7d8d" },
    { key: "subscribe", fan: false,
      title: "Subscribe to WIN a cruise for 2 to Japan!",
      desc: "Discover a newsfeed that aligns with your specific interests and you could win a trip for 2 to Japan!",
      cta: "Call to action", color: "#475975" },
    { key: "cakes", fan: true, fanBack: "#263044", fanMid: "#fdb0c4",
      title: "You’ve Unlocked 15% OFF CAKES",
      desc: "CAKES are washable, reusable, and made for tricky tops, workouts, swim, and everything in between. Grab 15% off today.",
      cta: "Claim 15% off", color: "#d83466" },
    { key: "chime", fan: true, fanBack: "#f9d731", fanMid: "#1ec677",
      title: "Join Chime in 2 mins and earn up to $350*",
      desc: "Meet the most loved banking app. Get up to $350 with a new Chime Checking Account. No Credit Check. No Monthly Fees. Open an account in 2 minutes.",
      cta: "Claim now", color: "#0b4f30" },
  ];
  const TERMS_TEXT = "Terms apply";

  const slideCount = () => (config.splashIntro ? 1 : 0) + OFFERS.length;

  /* ---------- card rendering (single design: Collage) ---------- */
  // desktop comp 508×248; <440px uses the 302×300 mobile comp
  const heightRatio = (w) => (w < 440 ? 300 / 302 : 248 / 508);

  /* ---------- fan-of-cards geometry (identical for every offer) ----
     Positions/rotations lifted from Figma; x/y/w/h are the element's
     UNROTATED box in the art area (desktop 225.8×248, mobile 254×104,
     Figma rotates about the box origin). Assets are exported
     unrotated with a 40px margin; rotation is applied in CSS so the
     next stage can animate each element. */
  const ART_MARGIN = 40;
  const AREA_D = { w: 225.8, h: 248 };
  const AREA_M = { w: 254, h: 104 };
  const FAN_D = {
    back:  { x: 29.6, y: 78.2, w: 91,    h: 125.7, rot: 19.4 },
    mid:   { x: 52.6, y: 55.5, w: 91,    h: 135,   rot: 6 },
    front: { x: 81.8, y: 47.2, w: 99,    h: 141.2, rot: -7.9 },
    logo:  { x: 46.6, y: 155,  w: 54,    h: 54,    rot: 0 },
  };
  const FAN_M = {
    back:  { x: 89.6, y: 0.1,  w: 74.1,  h: 40.7,  rot: 0 },
    mid:   { x: 76.9, y: 6.7,  w: 99.6,  h: 54.8,  rot: 0 },
    front: { x: 61.4, y: 15.9, w: 130.6, h: 71.8,  rot: 0 },
    logo:  { x: 100,  y: 50.5, w: 54,    h: 54,    rot: 0 },
  };
  // composite art boxes (splash + subscribe), same coordinate spaces
  const COMPOSITE_D = { x: 0, y: 0, w: 225.8, h: 248 };
  const SPLASH_M    = { x: 79, y: -46, w: 95.1, h: 149.9 };
  const SUBSCRIBE_M = { x: 46.8, y: -44, w: 160.2, h: 176 };

  function artStyle(g, area) {
    const pct = (v, base) => +(v / base * 100).toFixed(2) + "%";
    let s = `left:${pct(g.x - ART_MARGIN, area.w)};top:${pct(g.y - ART_MARGIN, area.h)};width:${pct(g.w + ART_MARGIN * 2, area.w)};`;
    if (g.rot) {
      const ox = +(ART_MARGIN / (g.w + ART_MARGIN * 2) * 100).toFixed(2);
      const oy = +(ART_MARGIN / (g.h + ART_MARGIN * 2) * 100).toFixed(2);
      s += `transform:rotate(${-g.rot}deg);transform-origin:${ox}% ${oy}%;`;
    }
    return s;
  }

  /* ---------- fan elements: wrapper/inner split ----------
     .cw (wrapper) = static PLACEMENT only — position, size, resting
     rotation (top-left origin), z-order. Never animated.
     .fan-card (inner) = ALL animation — entrance unfan + hover fan,
     pivoting from its bottom-left corner. Placement and animation
     transforms live on different elements so they can never fight.
     --fan-from = entrance over-fan; --fan-hover = hover delta
     (deltas RELATIVE to the resting pose, back → front). */
  const FAN_Z = { back: 1, mid: 2, front: 3, logo: 4 };
  const FAN_ANIM = {
    back:  "--fan-from:-8deg;--fan-hover:-3deg;",
    mid:   "--fan-from:-3.5deg;--fan-hover:-1deg;",
    front: "--fan-from:2deg;--fan-hover:0.75deg;",
  };
  function fanElStyle(g, area, part) {
    const pct = (v, base) => +(v / base * 100).toFixed(2) + "%";
    let s = `left:${pct(g.x, area.w)};top:${pct(g.y, area.h)};width:${pct(g.w, area.w)};height:${pct(g.h, area.h)};z-index:${FAN_Z[part]};`;
    if (g.rot) s += `transform:rotate(${-g.rot}deg);`;
    return s;
  }
  function fanMarkup(o) {
    const tier = (spec, area, suffix) => `
      <div class="cw" style="${fanElStyle(spec.back, area, "back")}"><div class="fan-card fan-card--back" style="${FAN_ANIM.back}background:${o.fanBack}"></div></div>
      <div class="cw" style="${fanElStyle(spec.mid, area, "mid")}"><div class="fan-card fan-card--mid" style="${FAN_ANIM.mid}background:${o.fanMid}"></div></div>
      <div class="cw" style="${fanElStyle(spec.front, area, "front")}"><div class="fan-card fan-card--front" style="${FAN_ANIM.front}background-image:url(assets/photo-${o.key}${suffix}.jpg)"></div></div>
      <div class="cw" style="${fanElStyle(spec.logo, area, "logo")}"><div class="fan-chip"><img class="fan-chip__logo" src="assets/logomark-${o.key}.png" alt="" draggable="false"></div></div>`;
    // fan--anim scopes the entrance/hover animation system to the
    // card-fan offer type; composites (splash/subscribe) get their
    // own treatments later
    return `
      <div class="fan fan--anim fan--d"><div class="fan__cards">${tier(FAN_D, AREA_D, "")}</div></div>
      <div class="fan fan--anim fan--m"><div class="fan__cards">${tier(FAN_M, AREA_M, "-m")}</div></div>`;
  }
  function compositeMarkup(name, geomM) {
    return `
      <div class="fan fan--d"><div class="fan__cards"><img class="fan__img" src="assets/art-${name}.png" style="${artStyle(COMPOSITE_D, AREA_D)}" alt="" draggable="false"></div></div>
      <div class="fan fan--m"><div class="fan__cards"><img class="fan__img" src="assets/art-${name}-m.png" style="${artStyle(geomM, AREA_M)}" alt="" draggable="false"></div></div>`;
  }

  function renderCard(i) {
    if (config.splashIntro && i === 0) {
      // splash intro — headline with the animated reward-count
      // ticker (rolls 0 → offer count when the card activates).
      // Line breaks differ per tier: desktop "You've unlocked / [n]
      // rewards", mobile "You've unlocked [n] / rewards" — the CSS
      // shows br-d or br-m.
      const n = OFFERS.length;
      const digits = Array.from({ length: n + 1 }, (_, k) =>
        `<span class="collage-ticker__digit">${k}</span>`).join("");
      return `
      <div class="slide__inner collage-card collage-card--intro" style="--tick-n:${n + 1}">
        <div class="collage-card__body fx-text">
          <div class="collage-card__text">
            <h3 class="collage-intro__title">You’ve unlocked<br class="br-d"> <span class="collage-ticker" role="img" aria-label="${n}"><span class="collage-ticker__reel">${digits}</span></span><br class="br-m"> rewards</h3>
          </div>
          <button type="button" class="collage-card__cta" data-goto-next>Claim yours now</button>
        </div>
        <div class="collage-card__media">${compositeMarkup("splash", SPLASH_M)}</div>
      </div>`;
    }
    const o = OFFERS[(i - (config.splashIntro ? 1 : 0)) % OFFERS.length];
    const ctaStyle = config.buttonColorMode === "advertiser" ? ` style="background:${o.color}"` : "";
    const media = o.fan ? fanMarkup(o) : compositeMarkup(o.key, SUBSCRIBE_M);
    return `
    <div class="slide__inner collage-card">
      <div class="collage-card__body fx-text">
        <div class="collage-card__text">
          <h3 class="collage-card__title">${o.title}</h3>
          <p class="collage-card__desc">${o.desc}
            <a class="collage-card__terms" href="#" onclick="return false">${TERMS_TEXT}</a></p>
        </div>
        <button type="button" class="collage-card__cta"${ctaStyle}>${o.cta}</button>
      </div>
      <div class="collage-card__media">${media}</div>
    </div>`;
  }

  /* ---------- persistence ----------
     One store: { global: {…}, publishers: { <key|none>: {…} } }.
     Publisher-scoped settings live under the selected publisher —
     switching publishers switches settings, like our CMS will. */
  const STORE_KEY = "thanks-carousel-v2";
  const PRESET_KEY = "thanks-carousel-v2-presets";
  const publisherSlot = () => currentPublisher || "none";
  function loadStore() {
    try { return JSON.parse(localStorage.getItem(STORE_KEY)) || {}; } catch { return {}; }
  }
  function persistCurrent() {
    const s = loadStore();
    s.global = {};
    GLOBAL_KEYS.forEach((k) => { s.global[k] = config[k]; });
    s.publishers = s.publishers || {};
    const p = {};
    PUBLISHER_KEYS.forEach((k) => { p[k] = config[k]; });
    s.publishers[publisherSlot()] = p;
    try { localStorage.setItem(STORE_KEY, JSON.stringify(s)); } catch {}
  }
  function restoreCurrent() {
    const s = loadStore();
    if (s.global) GLOBAL_KEYS.forEach((k) => { if (k in s.global) config[k] = s.global[k]; });
    const p = (s.publishers || {})[publisherSlot()];
    if (p) PUBLISHER_KEYS.forEach((k) => { if (k in p) config[k] = p[k]; });
  }
  function getPresets() {
    try { return JSON.parse(localStorage.getItem(PRESET_KEY)) || {}; } catch { return {}; }
  }
  function setPresets(p) {
    try { localStorage.setItem(PRESET_KEY, JSON.stringify(p)); } catch {}
  }
  function applyPreset(p) {
    Object.keys(DEFAULTS).forEach((k) => { config[k] = (k in p) ? p[k] : DEFAULTS[k]; });
    persistCurrent();
    applyConfig(true);
  }

  /* ---------- shareable design links ----------
     #cfg=<base64url JSON diff vs DEFAULTS> pins the design for this
     load. localStorage is IGNORED when a link carries a cfg, so the
     link renders identically for every recipient. Composes with the
     publisher page: /?page=key#cfg=… or page-key.html#cfg=… */
  function readSharedConfig() {
    const m = location.hash.match(/[#&]cfg=([^&]+)/) || location.search.match(/[?&]cfg=([^&]+)/);
    if (!m) return null;
    try {
      const parsed = JSON.parse(atob(m[1].replace(/-/g, "+").replace(/_/g, "/")));
      return parsed && typeof parsed === "object" ? parsed : null;
    } catch { return null; }
  }
  function shareLink() {
    const diff = {};
    Object.keys(DEFAULTS).forEach((k) => {
      if (JSON.stringify(config[k]) !== JSON.stringify(DEFAULTS[k])) diff[k] = config[k];
    });
    const b64 = btoa(JSON.stringify(diff)).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    return location.origin + location.pathname + location.search + "#cfg=" + b64;
  }

  const root     = document.querySelector(".thanks-proto");
  const section  = document.querySelector(".carousel");
  const viewport = section.querySelector("[data-viewport]");
  const track    = section.querySelector("[data-track]");
  const progress = section.querySelector("[data-progress]");
  const playBtn  = section.querySelector("[data-playpause]");
  const prevBtn  = section.querySelector("[data-prev]");
  const nextBtn  = section.querySelector("[data-next]");

  /* ============================================================
     cubic-bezier easing (Apple's timing, solved in JS)
     ============================================================ */
  function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const fx = (t) => ((ax * t + bx) * t + cx) * t;
    const fy = (t) => ((ay * t + by) * t + cy) * t;
    const dfx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      let t = x;
      for (let i = 0; i < 6; i++) {
        const d = dfx(t);
        if (Math.abs(d) < 1e-6) break;
        t -= (fx(t) - x) / d;
        t = Math.min(1, Math.max(0, t));
      }
      return fy(t);
    };
  }
  let ease = cubicBezier(0.4, 0, 0.6, 1);
  function setEasing(str) {
    const p = str.split(",").map(Number);
    if (p.length === 4 && p.every((n) => !isNaN(n))) ease = cubicBezier(p[0], p[1], p[2], p[3]);
  }

  /* ---------- state ---------- */
  let slides = [];
  let segments = [];
  let current = 0;
  let autoplayOn = config.autoplay && !REDUCED_MOTION;
  let hoverPause = false;              // hovering the current card's CTA
  let programmatic = false;

  let rafProgress = null;
  let segStartTs = 0;
  let elapsedBeforePause = 0;

  let scrollRaf = null;
  let programmaticClear = null;

  let ended = false;                   // run finished (replay shown)
  let activatedIndex = -1;             // slide that SETTLED as current

  const effectivePlaying = () => autoplayOn && !hoverPause && !ended;

  /* ============================================================
     build / rebuild slides + dots
     ============================================================ */
  function build() {
    track.innerHTML = "";
    progress.innerHTML = "";
    slides = [];
    segments = [];
    for (let i = 0; i < slideCount(); i++) {
      const li = document.createElement("li");
      li.className = "slide";
      li.dataset.index = i;
      li.style.setProperty("--progress", i);
      li.innerHTML = renderCard(i);
      // whole card is tappable: peeked cards navigate; the current
      // card is the offer action (dead in this prototype)
      li.addEventListener("click", () => {
        if (i !== current) userGoTo(i);
      });
      // autoplay pauses while hovering the current card's CTA
      li.querySelectorAll(".collage-card__cta").forEach((cta) => {
        cta.addEventListener("pointerenter", () => {
          if (i === current) { hoverPause = true; pauseProgress(); }
        });
        cta.addEventListener("pointerleave", () => {
          if (i === current) { hoverPause = false; resumeProgress(); }
        });
      });
      track.appendChild(li);
      slides.push(li);

      const seg = document.createElement("button");
      seg.className = "progress-seg";
      seg.type = "button";
      seg.setAttribute("role", "tab");
      seg.setAttribute("aria-label", `Offer ${i + 1}`);
      seg.dataset.index = i;
      seg.style.setProperty("--item-index", i);
      seg.innerHTML = `<span class="progress-seg__track"><span class="progress-seg__fill"></span></span>`;
      seg.addEventListener("click", () => userGoTo(i));
      progress.appendChild(seg);
      segments.push(seg);
    }
    if (current > slideCount() - 1) current = slideCount() - 1;
    activatedIndex = -1;
  }

  /* ============================================================
     activation — fires when a card SETTLES as current
     ============================================================ */
  function commitActivation(idx = current) {
    if (activatedIndex === idx) return;
    const prev = slides[activatedIndex];
    if (prev) {
      prev.classList.remove("is-active");
      prev.dispatchEvent(new CustomEvent("card:deactivate", { bubbles: true, detail: { index: activatedIndex } }));
    }
    const next = slides[idx];
    if (next) {
      next.classList.add("is-active");
      next.dispatchEvent(new CustomEvent("card:activate", { bubbles: true, detail: { index: idx } }));
    }
    activatedIndex = idx;
  }

  /* early activation during manual scroll (before the settle
     debounce) so card animations start as the card lands */
  function maybeEarlyActivate() {
    const idx = nearestIndex();
    if (idx === activatedIndex) return;
    if (Math.abs(scrollVelocity) > 0.35) return;
    const step = cardWpx + config.gap;
    if (step <= 0) return;
    const offset = Math.abs(viewport.scrollLeft / step - idx);
    if (offset < 0.3) commitActivation(idx);
  }

  /* ============================================================
     geometry
     ============================================================ */
  function maxScroll() { return viewport.scrollWidth - viewport.clientWidth; }

  function targetFor(index) {
    const slide = slides[index];
    const vpRect = viewport.getBoundingClientRect();
    const sRect = slide.getBoundingClientRect();
    const leftInContent = viewport.scrollLeft + (sRect.left - vpRect.left);
    // snap: start (fixed in v2), honouring the gutter
    const target = leftInContent - effectiveEdge;
    return Math.max(0, Math.min(target, maxScroll()));
  }

  function nearestIndex() {
    const vpRect = viewport.getBoundingClientRect();
    const center = vpRect.left + viewport.clientWidth / 2;
    let best = 0, bestDist = Infinity;
    for (let i = 0; i < slides.length; i++) {
      const r = slides[i].getBoundingClientRect();
      const d = Math.abs((r.left + r.width / 2) - center);
      if (d < bestDist) { bestDist = d; best = i; }
    }
    return best;
  }

  /* ============================================================
     eased programmatic scroll
     ============================================================ */
  function animateScrollTo(target) {
    if (scrollRaf) { cancelAnimationFrame(scrollRaf); scrollRaf = null; }
    const start = viewport.scrollLeft;
    const dist = target - start;

    programmatic = true;
    clearTimeout(programmaticClear);

    if (REDUCED_MOTION || config.transition <= 0 || Math.abs(dist) < 1) {
      viewport.scrollLeft = target;
      commitActivation();
      programmaticClear = setTimeout(() => { programmatic = false; }, 60);
      return;
    }
    viewport.style.scrollSnapType = "none";
    const t0 = performance.now();
    const dur = config.transition;
    function step(now) {
      const p = Math.min((now - t0) / dur, 1);
      viewport.scrollLeft = start + dist * ease(p);
      publishProgress();
      if (p < 1) {
        scrollRaf = requestAnimationFrame(step);
      } else {
        scrollRaf = null;
        viewport.style.scrollSnapType = "";
        commitActivation();
        programmaticClear = setTimeout(() => { programmatic = false; }, 60);
      }
    }
    scrollRaf = requestAnimationFrame(step);
  }

  function goTo(index) {
    current = Math.max(0, Math.min(index, slideCount() - 1));
    animateScrollTo(targetFor(current));
    render();
  }
  function userGoTo(index) {
    if (index < 0 || index > slideCount() - 1) return;
    goTo(index);
    restartProgress();
  }

  /* ============================================================
     visual state
     ============================================================ */
  function render() {
    slides.forEach((s, i) => s.classList.toggle("is-current", i === current));
    segments.forEach((seg, i) => {
      seg.classList.toggle("is-current", i === current);
      seg.setAttribute("aria-selected", i === current ? "true" : "false");
      const fill = seg.querySelector(".progress-seg__fill");
      if (i !== current) fill.style.setProperty("--fill", "0");
    });
    section.classList.toggle("is-paused", !autoplayOn);
    section.classList.toggle("is-ended", ended);
    playBtn.setAttribute("aria-label",
      ended ? "Replay offers" : autoplayOn ? "Pause offers" : "Play offers");
    prevBtn.disabled = current <= 0;
    nextBtn.disabled = current >= slideCount() - 1;
  }

  /* ============================================================
     autoplay progress (rAF → exact pause/resume; linear fill)
     ============================================================ */
  function setCurrentFill(p) {
    segments[current].querySelector(".progress-seg__fill").style.setProperty("--fill", String(p));
  }
  function progressTick(now) {
    if (!effectivePlaying()) { rafProgress = null; return; }
    const elapsed = elapsedBeforePause + (now - segStartTs);
    const p = Math.min(elapsed / config.dwell, 1);
    setCurrentFill(p);
    if (p >= 1) { advance(); return; }
    rafProgress = requestAnimationFrame(progressTick);
  }

  /* end of run: stop on the last card, button becomes replay ⟳ */
  function advance() {
    if (current >= slideCount() - 1) { endRun(); return; }
    goTo(current + 1);
    restartProgress();
  }
  function endRun() {
    ended = true;
    setCurrentFill(0);
    render();
  }
  function replay() {
    ended = false;
    autoplayOn = config.autoplay && !REDUCED_MOTION;
    goTo(0);
    restartProgress();
    render();
  }
  function restartProgress() {
    if (rafProgress) cancelAnimationFrame(rafProgress);
    rafProgress = null;
    elapsedBeforePause = 0;
    setCurrentFill(0);
    if (effectivePlaying()) { segStartTs = performance.now(); rafProgress = requestAnimationFrame(progressTick); }
  }
  function pauseProgress() {
    if (rafProgress) { elapsedBeforePause += performance.now() - segStartTs; cancelAnimationFrame(rafProgress); rafProgress = null; }
  }
  function resumeProgress() {
    if (!rafProgress && effectivePlaying()) { segStartTs = performance.now(); rafProgress = requestAnimationFrame(progressTick); }
  }

  /* ============================================================
     manual scroll: detect settle, sync state
     ============================================================ */
  function onSettle() {
    section.classList.remove("is-scrubbing");
    section.classList.remove("is-moving");   // hover re-arms once stationary
    if (programmatic) { programmatic = false; return; }
    const idx = nearestIndex();
    if (idx !== current) { current = idx; render(); }
    restartProgress();
    commitActivation();
  }
  let settleTimer = null;
  let lastScrollLeft = 0, lastScrollTs = 0, scrollVelocity = 0;
  viewport.addEventListener("scroll", () => {
    const now = performance.now();
    const sl = viewport.scrollLeft;
    if (lastScrollTs && now > lastScrollTs) {
      scrollVelocity = (sl - lastScrollLeft) / (now - lastScrollTs);
    }
    lastScrollLeft = sl;
    lastScrollTs = now;
    publishProgress();
    section.classList.add("is-moving");   // gates hover during ANY scroll
    if (!programmatic) {
      pauseProgress();
      section.classList.add("is-scrubbing");
      maybeEarlyActivate();
    }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(onSettle, 140);
  }, { passive: true });
  if ("onscrollend" in window) {
    viewport.addEventListener("scrollend", () => { clearTimeout(settleTimer); onSettle(); });
  }

  /* ---------- in-card navigation (splash CTA → first offer) ---------- */
  track.addEventListener("click", (e) => {
    if (!(e.target instanceof Element) || !e.target.closest("[data-goto-next]")) return;
    const li = e.target.closest(".slide");
    if (li && Number(li.dataset.index) === current) userGoTo(current + 1);
  });

  /* ---------- play / pause / replay ---------- */
  playBtn.addEventListener("click", () => {
    if (ended) { replay(); return; }
    autoplayOn = !autoplayOn;
    render();
    if (autoplayOn) resumeProgress(); else pauseProgress();
  });

  /* ---------- prev / next (shown when autoplay is off) ---------- */
  prevBtn.addEventListener("click", () => userGoTo(current - 1));
  nextBtn.addEventListener("click", () => userGoTo(current + 1));

  /* ---------- keyboard ---------- */
  viewport.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); userGoTo(current + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); userGoTo(current - 1); }
  });

  /* ---------- geometry model (single source of truth) ---------- */
  let effectiveEdge = 0;
  let cardWpx = 0;
  function sizeCards() {
    const vw = viewport.clientWidth;
    const desiredEdge = (vw * config.peekPct) / 100 + config.gap;
    let w = vw - 2 * desiredEdge;
    w = Math.min(w, config.maxWidth);
    w = Math.max(160, w);
    cardWpx = Math.round(w);
    effectiveEdge = Math.max(0, (vw - w) / 2);
    const h = Math.round(Math.min(w * heightRatio(w), MAX_HEIGHT));
    section.style.setProperty("--card-w", cardWpx + "px");
    section.style.setProperty("--card-h", h + "px");
    section.style.setProperty("--edge", Math.round(effectiveEdge) + "px");
    section.style.setProperty("--spacer", Math.round(Math.max(0, effectiveEdge - config.gap)) + "px");
    section.style.setProperty("--caption-offset", Math.round(cardWpx * TRAVEL_PCT / 100) + "px");
    // each slide's --progress is its CLAMPED snap target in card units
    const step = cardWpx + config.gap;
    if (step > 0 && slides.length) {
      slides.forEach((s, i) => s.style.setProperty("--progress", (targetFor(i) / step).toFixed(4)));
      segments.forEach((seg, i) => seg.style.setProperty("--item-index", (targetFor(i) / step).toFixed(4)));
    }
    section.style.setProperty("--fade-h", Math.max(0, viewport.clientHeight - 72) + "px");
    // unit chrome rhythm (Figma "Card in unit"): desktop 24/20 ·
    // mobile 20/16
    const mobileUnit = cardWpx < 440;
    section.style.setProperty("--unit-pad-top", mobileUnit ? "20px" : "24px");
    section.style.setProperty("--unit-gap", mobileUnit ? "16px" : "20px");
    publishProgress();
  }

  function publishProgress() {
    const step = cardWpx + config.gap;
    if (step > 0) {
      section.style.setProperty("--autoplay-progress", (viewport.scrollLeft / step).toFixed(4));
    }
  }

  /* ---------- keep sized & centred on resize ---------- */
  function recentre() {
    sizeCards();
    programmatic = true;
    clearTimeout(programmaticClear);
    viewport.scrollLeft = targetFor(current);
    programmaticClear = setTimeout(() => { programmatic = false; }, 60);
  }
  let resizeTimer = null;
  window.addEventListener("resize", () => {
    clearTimeout(resizeTimer);
    resizeTimer = setTimeout(recentre, 100);
  });
  if ("ResizeObserver" in window) {
    let lastW = 0, lastH = 0;
    new ResizeObserver(() => {
      const w = viewport.clientWidth, h = viewport.clientHeight;
      if (Math.abs(w - lastW) > 1 || Math.abs(h - lastH) > 1) {
        lastW = w; lastH = h;
        recentre();
      }
    }).observe(viewport);
  }

  /* ---------- luminance-derived ink for a hex colour ---------- */
  function inkFor(hex) {
    const m = (hex || "").match(/^#(..)(..)(..)$/);
    if (!m) return "#ffffff";
    const lum = 0.2126 * parseInt(m[1], 16) + 0.7152 * parseInt(m[2], 16) + 0.0722 * parseInt(m[3], 16);
    return lum < 150 ? "#ffffff" : "#1d1d1f";
  }

  /* ============================================================
     apply config → DOM
     ============================================================ */
  function applyConfig(rebuild) {
    section.style.setProperty("--gap", config.gap + "px");
    section.style.setProperty("--card-radius", config.cardRadius + "px");
    section.style.setProperty("--unit-radius", config.unitRadius + "px");
    section.style.setProperty("--unit-margin", config.unitMargin + "px");
    // publisher accent + readable label ink
    section.style.setProperty("--accent", config.accent);
    section.style.setProperty("--accent-ink", inkFor(config.accent));
    // button colour override (all CTAs follow the publisher brand)
    section.classList.toggle("btn-override", config.buttonColorMode === "override");
    section.style.setProperty("--cta-color", config.buttonColor);
    section.style.setProperty("--cta-ink", inkFor(config.buttonColor));
    // theme is decided FIRST — the unit-bg composite depends on it
    const dark = config.theme === "dark";
    root.classList.toggle("theme-dark", dark);
    let solid;
    if (config.unitBgAuto) {
      section.style.removeProperty("--unit-bg");
      const base = hostSurfaceRGB() || (dark ? [24, 24, 24] : [255, 255, 255]);
      const ov = dark ? [255, 255, 255, 0.05] : [0, 0, 0, 0.03];
      solid = "rgb(" + base.map((c, i) => Math.round(c * (1 - ov[3]) + ov[i] * ov[3])).join(",") + ")";
    } else {
      section.style.setProperty("--unit-bg", config.unitBgColor);
      solid = config.unitBgColor;
    }
    section.style.setProperty("--unit-bg-solid", solid);
    // unit border: an INSET shadow, so toggling never shifts layout
    section.style.setProperty("--unit-border-shadow",
      config.unitBorder ? `inset 0 0 0 1px ${config.unitBorderColor}` : "none");
    const ctaRadius = config.buttonRadiusMode === "default" ? 96 : config.ctaRadius;
    section.style.setProperty("--cta-radius", ctaRadius + "px");
    section.style.setProperty("--fade-rate", FADE_RATE);
    section.style.setProperty("--scale-amt", config.scaleAmount / 100);
    section.classList.toggle("edge-fade", config.edgeFade);
    section.classList.toggle("no-autoplay", !config.autoplay);
    setEasing(config.easing);
    section.style.setProperty("--ease-apple", `cubic-bezier(${config.easing})`);
    autoplayOn = config.autoplay && !REDUCED_MOTION;
    if (rebuild) build();
    sizeCards();
    render();
    requestAnimationFrame(() => { viewport.scrollLeft = targetFor(current); restartProgress(); commitActivation(); });
  }

  /* ============================================================
     settings panel
     ============================================================ */
  const cog = document.querySelector("[data-settings-open]");
  const panel = document.querySelector("[data-settings-panel]");
  const panelBody = document.querySelector("[data-settings-body]");
  document.querySelector("[data-settings-close]").addEventListener("click", closePanel);
  cog.addEventListener("click", () => panel.classList.contains("is-open") ? closePanel() : openPanel());
  function openPanel() { panel.classList.add("is-open"); panel.setAttribute("aria-hidden", "false"); }
  function closePanel() { panel.classList.remove("is-open"); panel.setAttribute("aria-hidden", "true"); }

  const TABS = ["Publisher", "Other", "Presets"];
  let activeTab = "Publisher";

  /* Publisher tab mirrors the CMS: publisher select + Setup /
     Branding / Layout sections. Other = shared last-minute tuning. */
  const CONTROLS = [
    // Setup ------------------------------------------------------
    { tab: "Publisher", section: "Setup", key: "autoplay", label: "Autoplay", type: "switch" },
    { tab: "Publisher", section: "Setup", key: "splashIntro", label: "Splash intro", type: "switch" },
    // Branding ---------------------------------------------------
    { tab: "Publisher", section: "Branding", key: "buttonColorMode", label: "Button colour", type: "select", options: [
        { v: "advertiser", t: "Aligned with advertiser" },
        { v: "override", t: "Override (publisher brand)" } ] },
    { tab: "Publisher", section: "Branding", key: "buttonColor", label: "Override colour", type: "color",
      showIf: (c) => c.buttonColorMode === "override" },
    { tab: "Publisher", section: "Branding", key: "buttonRadiusMode", label: "Button radius", type: "select", options: [
        { v: "default", t: "Default (fully rounded)" },
        { v: "custom", t: "Custom" } ] },
    { tab: "Publisher", section: "Branding", key: "ctaRadius", label: "Custom button radius", type: "range", min: 0, max: 96, step: 4, unit: "px",
      showIf: (c) => c.buttonRadiusMode === "custom" },
    { tab: "Publisher", section: "Branding", key: "cardRadius", label: "Card corner radius", type: "range", min: 0, max: 40, step: 2, unit: "px" },
    { tab: "Publisher", section: "Branding", key: "theme", label: "Theme", type: "select", options: [
        { v: "light", t: "Light" },
        { v: "dark", t: "Dark" } ] },
    { tab: "Publisher", section: "Branding", key: "unitBgAuto", label: "Unit background: auto", type: "switch" },
    { tab: "Publisher", section: "Branding", key: "unitBgColor", label: "Unit background colour", type: "color",
      showIf: (c) => !c.unitBgAuto },
    { tab: "Publisher", section: "Branding", key: "unitBorder", label: "Unit border", type: "switch" },
    { tab: "Publisher", section: "Branding", key: "unitBorderColor", label: "Unit border colour", type: "color",
      showIf: (c) => c.unitBorder },
    { tab: "Publisher", section: "Branding", key: "unitRadius", label: "Unit corner radius", type: "range", min: 0, max: 40, step: 2, unit: "px" },
    // Layout -----------------------------------------------------
    { tab: "Publisher", section: "Layout", key: "unitMargin", label: "Unit margin", type: "range", min: 0, max: 48, step: 4, unit: "px" },
    { tab: "Publisher", section: "Layout", key: "edgeFade", label: "Edge fade", type: "switch" },
    // Other (global) ---------------------------------------------
    { tab: "Other", key: "dwell", label: "Dwell time", type: "range", min: 1500, max: 8000, step: 250, unit: "ms" },
    { tab: "Other", key: "transition", label: "Scroll duration", type: "range", min: 0, max: 1500, step: 50, unit: "ms" },
    { tab: "Other", key: "easing", label: "Easing", type: "select", options: [
        { v: "0.4,0,0.6,1", t: "Apple ease (0.4,0,0.6,1)" },
        { v: "0,0,0.2,1", t: "Ease-out (0,0,0.2,1)" },
        { v: "0.28,0.11,0.32,1", t: "Apple soft (0.28,0.11,0.32,1)" },
        { v: "0.33,1,0.68,1", t: "Ease-out cubic" },
        { v: "0.25,0.1,0.25,1", t: "Gentle" },
      ] },
    { tab: "Other", key: "maxWidth", label: "Card max width", type: "range", min: 320, max: 1600, step: 20, unit: "px" },
    { tab: "Other", key: "peekPct", label: "Peek (% of container)", type: "range", min: 0, max: 20, step: 0.5, unit: "%" },
    { tab: "Other", key: "gap", label: "Gap", type: "range", min: 0, max: 48, step: 2, unit: "px" },
    { tab: "Other", key: "scaleAmount", label: "Shrink off-centre cards", type: "range", min: 0, max: 20, step: 1, unit: "%" },
  ];

  const tabStrip = document.querySelector("[data-settings-tabs]");
  function renderTabs() {
    tabStrip.innerHTML = "";
    TABS.forEach((t) => {
      const btn = document.createElement("button");
      btn.type = "button";
      btn.className = "settings-tab" + (t === activeTab ? " is-active" : "");
      btn.setAttribute("role", "tab");
      btn.setAttribute("aria-selected", t === activeTab ? "true" : "false");
      btn.textContent = t;
      btn.addEventListener("click", () => {
        activeTab = t;
        renderTabs();
        renderControls();
      });
      tabStrip.appendChild(btn);
    });
  }

  function renderControls() {
    if (activeTab === "Presets") { renderPresetsUI(); return; }
    panelBody.innerHTML = "";
    if (activeTab === "Publisher") renderPublisherSelect();
    let lastSection = null;
    CONTROLS.filter((c) => c.tab === activeTab).forEach((c) => {
      if (c.showIf && !c.showIf(config)) return;
      if (c.section && c.section !== lastSection) {
        const sub = document.createElement("p");
        sub.className = "settings-subhead";
        sub.textContent = c.section;
        panelBody.appendChild(sub);
        lastSection = c.section;
      }
      panelBody.appendChild(buildControl(c));
    });
    if (activeTab === "Other") {
      const note = document.createElement("p");
      note.className = "preset-note";
      note.textContent = "Global tuning shared across publishers — for last-minute testing while we converge.";
      panelBody.appendChild(note);
    }
  }

  /* keys whose value toggles other controls' visibility */
  const RERENDER_KEYS = ["buttonColorMode", "buttonRadiusMode", "unitBgAuto", "unitBorder"];

  function buildControl(c) {
    const wrap = document.createElement("div");
    wrap.className = "setting";
    const val = config[c.key];

    if (c.type === "switch") {
      wrap.innerHTML = `
        <div class="setting__row">
          <span class="setting__label">${c.label}</span>
          <label class="switch">
            <input type="checkbox" ${val ? "checked" : ""} />
            <span class="switch__track"></span>
          </label>
        </div>`;
      wrap.querySelector("input").addEventListener("change", (e) => {
        config[c.key] = e.target.checked;
        onConfigChange(c.key);
      });
    } else if (c.type === "range") {
      wrap.innerHTML = `
        <div class="setting__row">
          <span class="setting__label">${c.label}</span>
          <span class="setting__val" data-val>${val}${c.unit}</span>
        </div>
        <input type="range" min="${c.min}" max="${c.max}" step="${c.step}" value="${val}" />`;
      const out = wrap.querySelector("[data-val]");
      wrap.querySelector("input").addEventListener("input", (e) => {
        const n = Number(e.target.value);
        config[c.key] = n;
        out.textContent = n + c.unit;
        onConfigChange(c.key);
      });
    } else if (c.type === "color") {
      wrap.innerHTML = `
        <div class="setting__row">
          <span class="setting__label">${c.label}</span>
          <input type="color" value="${val}" aria-label="${c.label}" />
        </div>`;
      wrap.querySelector("input").addEventListener("input", (e) => {
        config[c.key] = e.target.value;
        onConfigChange(c.key);
      });
    } else if (c.type === "select") {
      const opts = c.options.map((o) => `<option value="${o.v}" ${o.v === val ? "selected" : ""}>${o.t}</option>`).join("");
      wrap.innerHTML = `
        <div class="setting__row">
          <span class="setting__label">${c.label}</span>
          <select>${opts}</select>
        </div>`;
      wrap.querySelector("select").addEventListener("change", (e) => {
        config[c.key] = e.target.value;
        onConfigChange(c.key);
      });
    }
    return wrap;
  }

  /* publisher switcher — navigates to the saved partner page; the
     publisher's own settings are restored on load */
  function renderPublisherSelect() {
    const wrap = document.createElement("div");
    wrap.className = "setting";
    const opts = PUBLISHERS.map((p) =>
      `<option value="${p.key}" ${p.key === currentPublisher ? "selected" : ""}>${p.label}</option>`).join("");
    wrap.innerHTML = `
      <div class="setting__row">
        <span class="setting__label">Publisher</span>
        <select data-publisher-select>${opts}</select>
      </div>
      <p class="preset-note">Settings below apply to THIS publisher only —
      mirroring what our CMS will store per publisher.</p>`;
    wrap.querySelector("select").addEventListener("change", (e) => {
      const key = e.target.value;
      // carry a shared design (#cfg=…) across publisher switches
      if (IS_STATIC) {
        location.href = (key ? `page-${key}.html` : "./") + location.hash;
      } else {
        location.href = (key ? "/?page=" + encodeURIComponent(key) : "/") + location.hash;
      }
    });
    panelBody.appendChild(wrap);
  }

  /* Walk up from the embed root to the first opaque background —
     composites the translucent unit fill into a solid colour so the
     edge fades can match exactly. */
  function hostSurfaceRGB() {
    let el = root.parentElement;
    while (el) {
      const bg = getComputedStyle(el).backgroundColor;
      const m = bg && bg.match(/rgba?\(\s*([\d.]+)[,\s]+([\d.]+)[,\s]+([\d.]+)(?:[,\s/]+([\d.]+))?\s*\)/);
      if (m && (m[4] === undefined || parseFloat(m[4]) > 0.5)) return [+m[1], +m[2], +m[3]];
      el = el.parentElement;
    }
    return null;
  }

  /* ---------- Presets tab (named snapshots + sharing) ---------- */
  function renderPresetsUI() {
    panelBody.innerHTML = "";

    const saveRow = document.createElement("div");
    saveRow.className = "preset-save";
    saveRow.innerHTML = `<input type="text" placeholder="Preset name" aria-label="Preset name" />
      <button type="button" class="tc-btn tc-btn--primary">Save</button>`;
    const nameInput = saveRow.querySelector("input");
    const doSave = () => {
      const name = nameInput.value.trim();
      if (!name) { nameInput.focus(); return; }
      const p = getPresets();
      p[name] = { ...config };
      setPresets(p);
      nameInput.value = "";
      renderPresetsUI();
    };
    saveRow.querySelector("button").addEventListener("click", doSave);
    nameInput.addEventListener("keydown", (e) => { if (e.key === "Enter") doSave(); });
    panelBody.appendChild(saveRow);

    const presets = getPresets();
    const names = Object.keys(presets);
    if (names.length === 0) {
      const empty = document.createElement("p");
      empty.className = "preset-note";
      empty.textContent = "No saved presets yet — tune the settings, then save them here.";
      panelBody.appendChild(empty);
    }
    names.forEach((name) => {
      const row = document.createElement("div");
      row.className = "preset-item";
      row.innerHTML = `<span class="preset-item__name"></span>
        <button type="button" class="tc-btn" data-load>Load</button>
        <button type="button" class="tc-btn" data-del aria-label="Delete preset ${name}">&times;</button>`;
      row.querySelector(".preset-item__name").textContent = name;
      row.querySelector("[data-load]").addEventListener("click", () => applyPreset(presets[name]));
      row.querySelector("[data-del]").addEventListener("click", () => {
        const p = getPresets();
        delete p[name];
        setPresets(p);
        renderPresetsUI();
      });
      panelBody.appendChild(row);
    });

    const sub = document.createElement("p");
    sub.className = "settings-subhead";
    sub.textContent = "Share";
    panelBody.appendChild(sub);

    const ta = document.createElement("textarea");
    ta.className = "preset-json";
    ta.placeholder = "Copy current config here, or paste a shared preset…";
    panelBody.appendChild(ta);

    const shareRow = document.createElement("div");
    shareRow.className = "preset-save";
    shareRow.innerHTML = `<button type="button" class="tc-btn tc-btn--primary" data-share>Copy share link</button>
      <button type="button" class="tc-btn" data-copy>Copy current</button>
      <button type="button" class="tc-btn" data-apply>Apply pasted</button>
      <button type="button" class="tc-btn" data-reset>Reset all</button>`;
    const shareBtn = shareRow.querySelector("[data-share]");
    shareBtn.addEventListener("click", () => {
      const url = shareLink();
      ta.value = url;
      try { navigator.clipboard.writeText(url); } catch {}
      shareBtn.textContent = "Link copied!";
      setTimeout(() => { shareBtn.textContent = "Copy share link"; }, 1200);
    });
    const copyBtn = shareRow.querySelector("[data-copy]");
    copyBtn.addEventListener("click", () => {
      ta.value = JSON.stringify(config, null, 2);
      ta.select();
      try { navigator.clipboard.writeText(ta.value); } catch {}
      copyBtn.textContent = "Copied!";
      setTimeout(() => { copyBtn.textContent = "Copy current"; }, 1200);
    });
    shareRow.querySelector("[data-apply]").addEventListener("click", () => {
      try {
        const parsed = JSON.parse(ta.value);
        if (parsed && typeof parsed === "object") applyPreset(parsed);
      } catch {
        ta.value = "⚠︎ Couldn't parse that JSON — paste a config copied from this panel.";
      }
    });
    shareRow.querySelector("[data-reset]").addEventListener("click", () => {
      try { localStorage.removeItem(STORE_KEY); } catch {}
      applyPreset(DEFAULTS);
    });
    panelBody.appendChild(shareRow);

    const note = document.createElement("p");
    note.className = "preset-note";
    note.textContent = "Share link pins this publisher page + design for anyone who opens it. Presets live in this browser.";
    panelBody.appendChild(note);
  }

  function onConfigChange(key) {
    const needsRebuild = key === "splashIntro" || key === "buttonColorMode";
    if (["autoplay", "splashIntro"].includes(key)) { ended = false; }
    applyConfig(needsRebuild);
    if (key === "autoplay") { if (autoplayOn) resumeProgress(); else pauseProgress(); }
    if (RERENDER_KEYS.includes(key)) renderControls();   // conditional controls
    persistCurrent();
  }

  /* ============================================================
     init — precedence: DEFAULTS → saved (skipped for shared links)
     → host-page tokens → shared design diff
     ============================================================ */
  const sharedCfg = readSharedConfig();
  if (!sharedCfg) restoreCurrent();
  if (window.__PAGE_TOKENS__) {
    Object.keys(DEFAULTS).forEach((k) => {
      if (k in window.__PAGE_TOKENS__) config[k] = window.__PAGE_TOKENS__[k];
    });
  }
  if (sharedCfg) {
    Object.keys(DEFAULTS).forEach((k) => {
      if (k in sharedCfg) config[k] = sharedCfg[k];
    });
  }
  build();
  renderTabs();
  renderControls();
  applyConfig(false);

  // test/debug hook (prototype only)
  window.__tc = {
    config, advance, goTo, applyConfig, slideCount,
    state: () => ({ current, ended, activatedIndex, autoplayOn }),
  };
})();
