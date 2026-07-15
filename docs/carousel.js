/* ============================================================
   Thanks offers carousel — interaction prototype
   Modelled on Apple's "Get the highlights" media-card gallery.
   ============================================================ */

(function () {
  "use strict";

  const REDUCED_MOTION = window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  /* ---------- tunable config (editable via settings panel) ---------- */
  const config = {
    slides: 6,
    autoplay: true,
    dwell: 4000,          // ms a slide stays before advancing
    transition: 1000,     // ms of the eased scroll animation (Apple: 1s)
    easing: "0.4,0,0.6,1",// Apple's standard easing
    peekPct: 4,           // neighbour peek, % of container width
    gap: 20,              // px between slides
    maxWidth: 1100,       // px cap on card width (surplus becomes peek)
    maxHeight: 400,       // px cap on card height
    snap: "center",       // center | start
    cardRadius: 20,       // px card corner radius
    unitRadius: 0,        // px outer wrapper corner radius
    textFx: "parallax",   // parallax | fade | fade-up | scale | none
    travelPct: 12,        // parallax travel, % of card width (Apple's 120px
                          // ≈ 12% of their gallery card — scales with size)
    fadeRate: 3.2,        // opacity falloff — Apple's constant
    textRise: 28,         // px rise for fade-up mode
    textScale: 50,        // % shrink at one card away, for scale mode
    dimAmount: 20,        // % dim of off-centre cards (0 = off)
    scaleAmount: 2,       // % shrink of off-centre cards (0 = off)
    shadowAmount: 0,      // % shadow opacity on centred card (0 = off)
    hoverFx: "none",      // none | lift | grow | glow
    pauseOnHoverActive: false,
    showTitle: true,      // section title visible
    showPlayPause: true,  // play/pause icon visible in pagination
    endMode: "rewind",    // rewind | none (stop + replay) | pingpong
    cycles: 0,            // stop autoplay after N full passes (0 = forever)
    cardPack: "numbers",  // numbers | skeleton | brand
    replayAnim: "every",  // every | once — card animation replay policy
    theme: "auto",        // auto (detect host surface) | light | dark
    // brand/page tokens (also settable per host page via pages.json)
    accent: "#0077c8",    // CTA / accent colour (publisher brand)
    unitBgAuto: true,     // unit background follows theme (3% black / 5% white)
    unitBgColor: "#f5f5f5", // custom unit background when auto is off
    unitMargin: 0,        // px outer margin around the unit
    showFooter: true,     // "A Thanks moment · Privacy Policy / Terms apply"
    edgeFade: false,      // fade the peeking cards into the unit bg
    ctaRadius: 96,        // px CTA corner radius (96 = full pill)
    imageParallax: true,  // brand pack: image scales up + slides with scroll
  };
  const DEFAULTS = { ...config };   // pristine copy for reset / preset merging

  /* ============================================================
     CARD PACKS — the card-side of the shell/card contract.
     A pack provides: render(i) markup, and a heightRatio(width)
     so each design can own its responsive rules (incl. portrait
     mobile). Packs may also use, inside their markup/CSS:
       - .fx-text            → element gets the shell's text fx
       - .is-active class    → set when the card SETTLES as current
       - card:activate / card:deactivate DOM events (bubbles)
       - the shared scroll vars --offset / --abs / --centred
     ============================================================ */
  /* Sample offer content for the brand pack — the four examples from
     the Figma direction ("Keep publisher brand - Use images"). */
  const OFFERS = [
    { brand: "adidas", title: "You’ve scored an extra 20% off adidas Outlet",
      desc: "The season’s best styles just got even better prices. Take an extra 20% off adidas outlet picks with our exclusive code...",
      cta: "Reveal Code", img: "assets/offer-adidas.png", imgMobile: "assets/offer-adidas-mobile.jpg", logo: "assets/logo-adidas.png" },
    { brand: "CAKES", title: "You’ve Unlocked 15% OFF CAKES",
      desc: "Treat yourself — 15% off the entire CAKES range for new customers, delivered fresh to your door...",
      cta: "Claim 15% off", img: "assets/offer-cakes.png", imgMobile: "assets/offer-cakes-mobile.jpg", logo: "assets/logo-cakes.png" },
    { brand: "Disney+", title: "Get 10% off your Disney+ Gift Card",
      desc: "Stream the movies and series everyone’s talking about. Grab a discounted gift card for yourself or a friend...",
      cta: "Get it now", img: "assets/offer-disney.png", imgMobile: "assets/offer-disney-mobile.jpg", logo: "assets/logo-disney.png" },
    { brand: "HelloFresh", title: "You’ve earned 30 FREE HelloFresh meals",
      desc: "Fresh ingredients and easy recipes delivered weekly. Claim 30 free meals across your first boxes...",
      cta: "Complete survey", img: "assets/offer-hellofresh.png", imgMobile: "assets/offer-hellofresh-mobile.jpg", logo: "assets/logo-hellofresh.png" },
  ];

  /* Offer content for the collage pack — Figma "Direction 2":
     advertiser-coloured CTAs, collage art exported per card (with a
     40px transparent margin so shadows / overflowing chips survive). */
  const COLLAGE_OFFERS = [
    { title: "Join Chime in 2 mins and earn up to $350*",
      desc: "Meet the most loved banking app. Get up to $350 with a new Chime Checking Account. No Credit Check. No Monthly Fees. Open an account in 2 minutes.*",
      cta: "Claim now", color: "#0b4f30", img: "assets/collage-chime.png" },
    { title: "Subscribe to WIN a cruise for 2 to Japan!",
      desc: "Discover a newsfeed that aligns with your specific interests and you could win a trip for 2 to Japan!",
      cta: "Call to action", color: "#475975", img: "assets/collage-subscribe.png" },
    { title: "You’ve Unlocked 15% OFF CAKES",
      desc: "CAKES are washable, reusable, and made for tricky tops, workouts, swim, and everything in between. Grab 15% off today.*",
      cta: "Claim 15% off", color: "#d83466", img: "assets/collage-cakes.png" },
    { title: "Save on Disney+ and Hulu!",
      desc: "Get 3 months of Disney+ and Hulu for just $4.99/month *",
      cta: "Claim now", color: "#0a7d8d", img: "assets/collage-disney.png" },
  ];

  const CARD_PACKS = {
    numbers: {
      heightRatio: () => 0.75,
      render: (i) => `<div class="slide__inner"><span class="slide__number fx-text">${i + 1}</span></div>`,
    },
    brand: {
      // Figma "Offer - Image style" variants: Mobile 357×282 (0.79),
      // Desktop small 508×266 (0.5236), Desktop large 701×306 (0.4365).
      // Thresholds match the @container queries in styles.css.
      heightRatio: (w) => (w < 440 ? 0.79 : w < 640 ? 0.5236 : 0.4365),
      // settings this direction was designed around (applied on switch)
      recommends: {
        snap: "start", peekPct: 3, gap: 24, slides: 4,
        unitRadius: 4, cardRadius: 20, maxHeight: 400,
        showTitle: false, dimAmount: 0, scaleAmount: 0, edgeFade: true,
      },
      render: (i) => {
        const o = OFFERS[i % OFFERS.length];
        return `
        <div class="slide__inner brand-card">
          <div class="brand-card__media">
            <img class="brand-card__img brand-card__img--desktop" src="${o.img}" alt="" draggable="false">
            <img class="brand-card__img brand-card__img--mobile" src="${o.imgMobile || o.img}" alt="" draggable="false">
            <img class="brand-card__logo" src="${o.logo}" alt="${o.brand} logo" draggable="false">
          </div>
          <div class="brand-card__body fx-text">
            <div class="brand-card__text">
              <h3 class="brand-card__title">${o.title}</h3>
              <p class="brand-card__desc">${o.desc}</p>
            </div>
            <button type="button" class="brand-card__cta">${o.cta}</button>
          </div>
        </div>`;
      },
    },
    collage: {
      // Figma "Direction 2": one desktop comp, 508×264 (0.5197).
      // Type/spacing scale proportionally with the card (cqw units in
      // styles.css); below 440px the card stacks (no mobile comp yet).
      heightRatio: (w) => (w < 440 ? 1.0 : 0.5197),
      // settings this direction was designed around (applied on switch);
      // maxWidth 760 keeps the card under the maxHeight clamp so the
      // 508:264 aspect (and the collage art geometry) holds.
      recommends: {
        snap: "start", peekPct: 3, gap: 24, slides: 5,
        unitRadius: 4, cardRadius: 20, maxWidth: 760, maxHeight: 400,
        showTitle: false, dimAmount: 0, scaleAmount: 0, edgeFade: true,
      },
      render: (i) => {
        if (i === 0) {
          // intro card — headline with the animated reward-count ticker
          // (rolls 0 → offer count when the card activates)
          const n = Math.max(1, config.slides - 1);
          const digits = Array.from({ length: n + 1 }, (_, k) =>
            `<span class="collage-ticker__digit">${k}</span>`).join("");
          return `
          <div class="slide__inner collage-card collage-card--intro" style="--tick-n:${n + 1}">
            <div class="collage-card__body fx-text">
              <h3 class="collage-intro__title">You’ve unlocked<br>
                <span class="collage-ticker" role="img" aria-label="${n}"><span class="collage-ticker__reel">${digits}</span></span>&nbsp;rewards</h3>
              <button type="button" class="collage-card__cta" data-goto-next>Claim yours now</button>
            </div>
            <div class="collage-card__media">
              <img class="collage-card__art" src="assets/collage-intro.png" alt="" draggable="false">
            </div>
          </div>`;
        }
        const o = COLLAGE_OFFERS[(i - 1) % COLLAGE_OFFERS.length];
        return `
        <div class="slide__inner collage-card">
          <div class="collage-card__body fx-text">
            <div class="collage-card__text">
              <h3 class="collage-card__title">${o.title}</h3>
              <p class="collage-card__desc">${o.desc}</p>
            </div>
            <button type="button" class="collage-card__cta" style="background:${o.color}">${o.cta}</button>
          </div>
          <div class="collage-card__media">
            <img class="collage-card__art" src="${o.img}" alt="" draggable="false">
          </div>
        </div>`;
      },
    },
    skeleton: {
      // portrait on narrow cards, landscape on wide — the pack owns this
      // (threshold matches the @container query in styles.css)
      heightRatio: (w) => (w < 400 ? 1.25 : 0.7),
      render: (i) => `
        <div class="slide__inner card-skel">
          <div class="card-skel__graphic" aria-hidden="true">
            <div class="skel-chart">
              <div class="skel-bar" style="--h:.55"></div>
              <div class="skel-bar" style="--h:.8"></div>
              <div class="skel-bar" style="--h:1"></div>
            </div>
          </div>
          <div class="card-skel__body fx-text">
            <h3 class="card-skel__title">Offer title ${i + 1}</h3>
            <p class="card-skel__desc">Supporting description copy for this offer goes here.</p>
            <button type="button" class="card-skel__btn">Claim offer</button>
          </div>
        </div>`,
    },
  };

  /* ---------- persistence (current config + named presets) ---------- */
  // v4: key bumped so stale persisted configs don't shadow the new
  // defaults (bump this whenever DEFAULTS change on purpose)
  const CURRENT_KEY = "thanks-carousel-config-v4";
  const PRESET_KEY  = "thanks-carousel-presets";
  function persistCurrent() {
    try { localStorage.setItem(CURRENT_KEY, JSON.stringify(config)); } catch {}
  }
  function restoreCurrent() {
    try {
      const saved = JSON.parse(localStorage.getItem(CURRENT_KEY));
      if (saved) Object.keys(DEFAULTS).forEach((k) => { if (k in saved) config[k] = saved[k]; });
    } catch {}
  }
  function getPresets() {
    try { return JSON.parse(localStorage.getItem(PRESET_KEY)) || {}; } catch { return {}; }
  }
  function setPresets(p) {
    try { localStorage.setItem(PRESET_KEY, JSON.stringify(p)); } catch {}
  }
  /* Apply a preset (or defaults): known keys only, missing keys reset */
  function applyPreset(p) {
    Object.keys(DEFAULTS).forEach((k) => { config[k] = (k in p) ? p[k] : DEFAULTS[k]; });
    persistCurrent();
    applyConfig(true);
  }

  const root     = document.querySelector(".thanks-proto");
  const section  = document.querySelector(".carousel");
  const viewport = section.querySelector("[data-viewport]");
  const track    = section.querySelector("[data-track]");
  const progress = section.querySelector("[data-progress]");
  const playBtn  = section.querySelector("[data-playpause]");

  /* ============================================================
     cubic-bezier easing (so we can copy Apple's timing exactly)
     ============================================================ */
  function cubicBezier(x1, y1, x2, y2) {
    const cx = 3 * x1, bx = 3 * (x2 - x1) - cx, ax = 1 - cx - bx;
    const cy = 3 * y1, by = 3 * (y2 - y1) - cy, ay = 1 - cy - by;
    const fx = (t) => ((ax * t + bx) * t + cx) * t;
    const fy = (t) => ((ay * t + by) * t + cy) * t;
    const dfx = (t) => (3 * ax * t + 2 * bx) * t + cx;
    return (x) => {
      let t = x;
      for (let i = 0; i < 6; i++) {           // Newton–Raphson solve
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
  let hoverPause = false;              // hovering the ACTIVE card
  let programmatic = false;            // we're driving the scroll

  let rafProgress = null;
  let segStartTs = 0;
  let elapsedBeforePause = 0;

  let scrollRaf = null;
  let programmaticClear = null;

  // end-of-carousel run state
  let dir = 1;                         // pingpong direction
  let cycleCount = 0;                  // completed full passes
  let ended = false;                   // autoplay finished (replay shown)

  // activation: which slide has SETTLED as current (drives card anims)
  let activatedIndex = -1;

  const effectivePlaying = () => autoplayOn && !hoverPause && !ended;

  /* ============================================================
     build / rebuild slides + dots
     ============================================================ */
  function build() {
    track.innerHTML = "";
    progress.innerHTML = "";
    slides = [];
    segments = [];
    for (let i = 0; i < config.slides; i++) {
      const li = document.createElement("li");
      li.className = "slide";
      li.dataset.index = i;
      li.style.setProperty("--progress", i);   // its index, for the parallax calc
      li.innerHTML = CARD_PACKS[config.cardPack].render(i);
      // pause only while hovering the ACTIVE card
      li.addEventListener("pointerenter", () => {
        if (config.pauseOnHoverActive && i === current) { hoverPause = true; pauseProgress(); }
      });
      li.addEventListener("pointerleave", () => {
        if (i === current) { hoverPause = false; resumeProgress(); }
      });
      // whole card is tappable: peeked cards navigate; the current
      // card is the offer action (dead in this prototype)
      li.addEventListener("click", () => {
        if (i !== current) userGoTo(i);
      });
      track.appendChild(li);
      slides.push(li);

      const seg = document.createElement("button");
      seg.className = "progress-seg";
      seg.type = "button";
      seg.setAttribute("role", "tab");
      seg.setAttribute("aria-label", `Offer ${i + 1}`);
      seg.dataset.index = i;
      seg.style.setProperty("--item-index", i);   // feeds Apple's width formula
      seg.innerHTML = `<span class="progress-seg__track"><span class="progress-seg__fill"></span></span>`;
      seg.addEventListener("click", () => userGoTo(i));
      progress.appendChild(seg);
      segments.push(seg);
    }
    if (current > config.slides - 1) current = config.slides - 1;
    activatedIndex = -1;               // fresh DOM → activation state resets
  }

  /* ============================================================
     activation — fires when a card SETTLES as current (not while
     scrubbing past it). Packs hook animations off .is-active or
     the card:activate / card:deactivate events.
     ============================================================ */
  function commitActivation(idx = current) {
    if (activatedIndex === idx) return;
    const prev = slides[activatedIndex];
    if (prev) {
      prev.classList.remove("is-active");
      prev.dataset.played = "1";       // for the replay-once policy
      prev.dispatchEvent(new CustomEvent("card:deactivate", { bubbles: true, detail: { index: activatedIndex } }));
    }
    const next = slides[idx];
    if (next) {
      next.classList.add("is-active");
      next.dispatchEvent(new CustomEvent("card:activate", { bubbles: true, detail: { index: idx } }));
    }
    activatedIndex = idx;
  }

  /* During MANUAL scrolling, don't wait for the settle debounce (the
     momentum tail makes the card animation feel broken-late). Activate
     as soon as the nearest card is close to centre AND the scroll has
     decelerated — flings through cards stay fast, so they don't fire. */
  function maybeEarlyActivate() {
    const idx = nearestIndex();
    if (idx === activatedIndex) return;
    if (Math.abs(scrollVelocity) > 0.35) return;      // px/ms — still travelling
    const step = cardWpx + config.gap;
    if (step <= 0) return;
    const offset = Math.abs(viewport.scrollLeft / step - idx);
    if (offset < 0.3) commitActivation(idx);
  }

  /* ============================================================
     geometry (viewport-relative so page layout can't skew it)
     ============================================================ */
  function maxScroll() { return viewport.scrollWidth - viewport.clientWidth; }

  function targetFor(index) {
    const slide = slides[index];
    const vpRect = viewport.getBoundingClientRect();
    const sRect = slide.getBoundingClientRect();
    const leftInContent = viewport.scrollLeft + (sRect.left - vpRect.left);
    let target;
    if (config.snap === "center") {
      target = leftInContent - (viewport.clientWidth - slide.clientWidth) / 2;
    } else {
      target = leftInContent - effectiveEdge;   // start, honouring the gutter
    }
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
     eased programmatic scroll (Apple copies scroll-behavior:none
     and animates the advance itself — so do we)
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
    // disable snap during the tween so it doesn't fight us, then restore
    viewport.style.scrollSnapType = "none";
    const t0 = performance.now();
    const dur = config.transition;
    function step(now) {
      const p = Math.min((now - t0) / dur, 1);
      viewport.scrollLeft = start + dist * ease(p);
      publishProgress();               // keep the parallax fed during the tween
      if (p < 1) {
        scrollRaf = requestAnimationFrame(step);
      } else {
        scrollRaf = null;
        viewport.style.scrollSnapType = "";       // re-enable mandatory snap
        commitActivation();                       // the card has LANDED
        programmaticClear = setTimeout(() => { programmatic = false; }, 60);
      }
    }
    scrollRaf = requestAnimationFrame(step);
  }

  function goTo(index) {
    current = Math.max(0, Math.min(index, config.slides - 1));
    animateScrollTo(targetFor(current));
    render();
  }
  function userGoTo(index) {
    if (index < 0 || index > config.slides - 1) return;
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
      if (i !== current) fill.style.setProperty("--fill", "0");   // non-current: no fill
    });
    section.classList.toggle("is-paused", !autoplayOn);
    section.classList.toggle("is-ended", ended);
    playBtn.setAttribute("aria-label",
      ended ? "Replay offers" : autoplayOn ? "Pause offers" : "Play offers");
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

  /* ---------- end-of-carousel behaviour ----------
     rewind   : scroll back to the start and go again
     none     : stop on the last card, button becomes replay ⟳
     pingpong : reverse direction at each end
     cycles>0 : after N full passes, stop (as "none")             */
  const cyclesReached = () => config.cycles > 0 && cycleCount >= config.cycles;
  function advance() {
    const last = config.slides - 1;
    if (config.endMode === "none") {
      if (current >= last) { endRun(); return; }
      goTo(current + 1); restartProgress(); return;
    }
    if (config.endMode === "pingpong") {
      let next = current + dir;
      if (next > last || next < 0) {
        cycleCount++;
        if (cyclesReached()) { endRun(); return; }
        dir = -dir;
        next = current + dir;
      }
      goTo(next); restartProgress(); return;
    }
    // rewind (default)
    if (current >= last) {
      cycleCount++;
      if (cyclesReached()) { endRun(); return; }
      goTo(0); restartProgress(); return;
    }
    goTo(current + 1); restartProgress();
  }
  function endRun() {
    ended = true;
    setCurrentFill(0);
    render();
  }
  function replay() {
    ended = false;
    cycleCount = 0;
    dir = 1;
    autoplayOn = !REDUCED_MOTION;
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
    section.classList.remove("is-scrubbing");   // fill may fade back in
    if (programmatic) { programmatic = false; return; }
    const idx = nearestIndex();
    if (idx !== current) { current = idx; render(); }
    restartProgress();
    commitActivation();                // user-scrolled card has landed
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
    publishProgress();                 // feed the CSS parallax every frame
    if (!programmatic) {
      pauseProgress();
      section.classList.add("is-scrubbing");   // hide the time-fill while position is in flux
      maybeEarlyActivate();            // card anim starts as the card lands, not after settle
    }
    clearTimeout(settleTimer);
    settleTimer = setTimeout(onSettle, 140);
  }, { passive: true });
  if ("onscrollend" in window) {
    viewport.addEventListener("scrollend", () => { clearTimeout(settleTimer); onSettle(); });
  }

  /* ---------- in-card navigation (pack contract) ----------
     a pack may mark a control [data-goto-next] (e.g. the intro CTA):
     on the CURRENT card it advances; on a peeked card the standard
     card-click navigation wins. */
  track.addEventListener("click", (e) => {
    if (!(e.target instanceof Element) || !e.target.closest("[data-goto-next]")) return;
    const li = e.target.closest(".slide");
    if (li && Number(li.dataset.index) === current) userGoTo(current + 1);
  });

  /* ---------- play / pause ---------- */
  playBtn.addEventListener("click", () => {
    if (ended) { replay(); return; }
    autoplayOn = !autoplayOn;
    render();
    if (autoplayOn) resumeProgress(); else pauseProgress();
  });

  /* ---------- keyboard ---------- */
  viewport.addEventListener("keydown", (e) => {
    if (e.key === "ArrowRight") { e.preventDefault(); userGoTo(current + 1); }
    else if (e.key === "ArrowLeft") { e.preventDefault(); userGoTo(current - 1); }
  });

  /* ---------- geometry model (single source of truth) ----------
     peek% → desired edge → card width, clamped by maxWidth.
     If the clamp bites, the surplus space becomes extra peek.
     Height is proportional (0.75 × width) clamped by maxHeight. */
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
    // height model belongs to the active card pack (portrait mobile etc.)
    const ratio = CARD_PACKS[config.cardPack].heightRatio(w);
    const h = Math.round(Math.min(w * ratio, config.maxHeight));
    section.style.setProperty("--card-w", cardWpx + "px");
    section.style.setProperty("--card-h", h + "px");
    section.style.setProperty("--edge", Math.round(effectiveEdge) + "px");
    section.style.setProperty("--spacer", Math.round(Math.max(0, effectiveEdge - config.gap)) + "px");
    // parallax travel scales with the card, so small cards move less
    section.style.setProperty("--caption-offset", Math.round(cardWpx * config.travelPct / 100) + "px");
    // Each slide's --progress is its CLAMPED snap target in card units,
    // not its raw index: near the ends of the track (esp. snap-start)
    // a card can never reach index×step, and an index-based offset
    // would leave its text/dots permanently faded. Target-based
    // progress zeroes out exactly when the card sits at its snap point.
    const step = cardWpx + config.gap;
    if (step > 0 && slides.length) {
      slides.forEach((s, i) => s.style.setProperty("--progress", (targetFor(i) / step).toFixed(4)));
      segments.forEach((seg, i) => seg.style.setProperty("--item-index", (targetFor(i) / step).toFixed(4)));
    }
    // edge fades span the ACTUAL card row height (cards may be
    // content-driven and taller than --card-h, e.g. brand mobile)
    section.style.setProperty("--fade-h", Math.max(0, viewport.clientHeight - 72) + "px");
    // unit chrome spacing is responsive in the design (Figma "Card
    // in unit", Direction 2): desktop 32 top / 20 card→controls,
    // mobile 24 / 15 — switch with the same card-width threshold
    // as the pack tiers
    const mobileUnit = cardWpx < 440;
    section.style.setProperty("--unit-pad-top", mobileUnit ? "24px" : "32px");
    section.style.setProperty("--unit-gap", mobileUnit ? "15px" : "20px");
    publishProgress();
  }

  /* Continuous scroll position in card units (Apple's
     --autoplay-progress): drives the text parallax in CSS. */
  function publishProgress() {
    const step = cardWpx + config.gap;
    if (step > 0) {
      section.style.setProperty("--autoplay-progress", (viewport.scrollLeft / step).toFixed(4));
    }
  }

  /* ---------- keep sized & centred on resize ----------
     ResizeObserver watches the CONTAINER (not the window): host-page
     slots start at 0 width while their scripts settle, then expand —
     the carousel re-derives its geometry whenever that happens. */
  function recentre() {
    sizeCards();
    programmatic = true;               // don't treat the re-centre as a user scrub
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

  /* ============================================================
     apply config → DOM (called on init + whenever a setting changes)
     ============================================================ */
  function applyConfig(rebuild) {
    section.style.setProperty("--gap", config.gap + "px");
    section.style.setProperty("--card-radius", config.cardRadius + "px");
    section.style.setProperty("--unit-radius", config.unitRadius + "px");
    section.style.setProperty("--unit-margin", config.unitMargin + "px");
    // accent + readable label colour derived from its luminance
    section.style.setProperty("--accent", config.accent);
    const am = config.accent.match(/^#(..)(..)(..)$/);
    if (am) {
      const lum = 0.2126 * parseInt(am[1], 16) + 0.7152 * parseInt(am[2], 16) + 0.0722 * parseInt(am[3], 16);
      section.style.setProperty("--accent-ink", lum < 150 ? "#ffffff" : "#1d1d1f");
    }
    // Theme is decided FIRST — the unit-bg composite depends on it
    const dark = config.theme === "dark" || (config.theme === "auto" && hostSurfaceIsDark());
    root.classList.toggle("theme-dark", dark);
    // --unit-bg-solid is ALWAYS the effective flat colour of the unit,
    // so the edge fades match the background exactly in every mode
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
    section.style.setProperty("--cta-radius", config.ctaRadius + "px");
    section.style.setProperty("--fade-rate", config.fadeRate);
    section.style.setProperty("--text-rise", config.textRise + "px");
    section.style.setProperty("--text-scale", config.textScale / 100);
    section.style.setProperty("--dim-amt", config.dimAmount / 100);
    section.style.setProperty("--scale-amt", config.scaleAmount / 100);
    section.style.setProperty("--shadow-amt", config.shadowAmount / 100);
    section.classList.toggle("snap-start", config.snap === "start");
    ["parallax", "fade", "fade-up", "scale"].forEach((m) =>
      section.classList.toggle("textfx-" + m, config.textFx === m));
    ["lift", "grow", "glow"].forEach((m) =>
      section.classList.toggle("hover-" + m, config.hoverFx === m));
    Object.keys(CARD_PACKS).forEach((p) =>
      section.classList.toggle("pack-" + p, config.cardPack === p));
    section.classList.toggle("replay-once", config.replayAnim === "once");
    section.classList.toggle("no-title", !config.showTitle);
    section.classList.toggle("no-playpause", !config.showPlayPause);
    section.classList.toggle("no-footer", !config.showFooter);
    section.classList.toggle("edge-fade", config.edgeFade);
    section.classList.toggle("img-parallax", config.imageParallax);
    setEasing(config.easing);
    section.style.setProperty("--ease-apple", `cubic-bezier(${config.easing})`);
    autoplayOn = config.autoplay && !REDUCED_MOTION;
    if (rebuild) build();
    sizeCards();
    render();
    // snap into place after layout settles
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

  const TABS = ["Page", "Brand", "Motion", "Layout", "Cards", "Text", "Presets"];
  let activeTab = "Page";

  const CONTROLS = [
    // Motion ---------------------------------------------------
    { tab: "Motion", key: "autoplay", label: "Autoplay", type: "switch" },
    { tab: "Motion", key: "dwell", label: "Dwell time", type: "range", min: 1500, max: 8000, step: 250, unit: "ms" },
    { tab: "Motion", key: "transition", label: "Scroll duration", type: "range", min: 0, max: 1500, step: 50, unit: "ms" },
    { tab: "Motion", key: "easing", label: "Easing", type: "select", options: [
        { v: "0.4,0,0.6,1", t: "Apple ease (0.4,0,0.6,1)" },
        { v: "0,0,0.2,1", t: "Ease-out (0,0,0.2,1)" },
        { v: "0.28,0.11,0.32,1", t: "Apple soft (0.28,0.11,0.32,1)" },
        { v: "0.33,1,0.68,1", t: "Ease-out cubic" },
        { v: "0.25,0.1,0.25,1", t: "Gentle" },
      ] },
    { tab: "Motion", key: "endMode", label: "At the end", type: "select", options: [
        { v: "rewind", t: "Rewind to start" },
        { v: "none", t: "Stop (show replay)" },
        { v: "pingpong", t: "Ping-pong" } ] },
    { tab: "Motion", key: "cycles", label: "Cycles (0 = forever)", type: "range", min: 0, max: 5, step: 1, unit: "" },
    { tab: "Motion", key: "pauseOnHoverActive", label: "Pause on hover (active card)", type: "switch" },
    { tab: "Motion", key: "showPlayPause", label: "Show play/pause", type: "switch" },
    // Layout ---------------------------------------------------
    { tab: "Layout", key: "peekPct", label: "Peek (% of container)", type: "range", min: 0, max: 20, step: 0.5, unit: "%" },
    { tab: "Layout", key: "gap", label: "Gap", type: "range", min: 0, max: 48, step: 2, unit: "px" },
    { tab: "Layout", key: "maxWidth", label: "Card max width", type: "range", min: 320, max: 1600, step: 20, unit: "px" },
    { tab: "Layout", key: "maxHeight", label: "Card max height", type: "range", min: 200, max: 800, step: 20, unit: "px" },
    { tab: "Layout", key: "cardRadius", label: "Card corner radius", type: "range", min: 0, max: 40, step: 2, unit: "px" },
    { tab: "Layout", key: "showTitle", label: "Show title", type: "switch" },
    { tab: "Layout", key: "showFooter", label: "Show footer (attribution)", type: "switch" },
    // Brand / page tokens — the CMS-configurable surface ----------
    { tab: "Brand", key: "accent", label: "Accent colour (CTA)", type: "color" },
    { tab: "Brand", key: "unitBgAuto", label: "Unit background: auto", type: "switch" },
    { tab: "Brand", key: "unitBgColor", label: "Unit background colour", type: "color" },
    { tab: "Brand", key: "unitRadius", label: "Unit corner radius", type: "range", min: 0, max: 40, step: 2, unit: "px" },
    { tab: "Brand", key: "unitMargin", label: "Unit margin", type: "range", min: 0, max: 48, step: 4, unit: "px" },
    { tab: "Brand", key: "ctaRadius", label: "Button corner radius", type: "range", min: 0, max: 96, step: 4, unit: "px" },
    { tab: "Brand", key: "edgeFade", label: "Edge fade over peek", type: "switch" },
    { tab: "Layout", key: "slides", label: "Slides", type: "range", min: 2, max: 10, step: 1, unit: "" },
    { tab: "Layout", key: "snap", label: "Snap align", type: "select", options: [
        { v: "center", t: "Center" }, { v: "start", t: "Start" } ] },
    // Cards (all scroll-driven; 0 = off) ------------------------
    { tab: "Cards", key: "cardPack", label: "Card design", type: "select", options: [
        { v: "numbers", t: "Numbers (placeholder)" },
        { v: "skeleton", t: "Skeleton (title + graphic)" },
        { v: "brand", t: "Brand (publisher, images)" },
        { v: "collage", t: "Collage (advertiser art)" } ] },
    { tab: "Cards", key: "replayAnim", label: "Card animation replays", type: "select", options: [
        { v: "every", t: "Every visit" },
        { v: "once", t: "Once per session" } ] },
    { tab: "Cards", key: "imageParallax", label: "Image parallax (brand)", type: "switch" },
    { tab: "Cards", key: "dimAmount", label: "Dim off-centre cards", type: "range", min: 0, max: 90, step: 5, unit: "%" },
    { tab: "Cards", key: "scaleAmount", label: "Shrink off-centre cards", type: "range", min: 0, max: 20, step: 1, unit: "%" },
    { tab: "Cards", key: "shadowAmount", label: "Shadow on centred card", type: "range", min: 0, max: 40, step: 2, unit: "%" },
    { tab: "Cards", key: "hoverFx", label: "Hover effect (active card)", type: "select", options: [
        { v: "none", t: "None" },
        { v: "lift", t: "Lift" },
        { v: "grow", t: "Grow" },
        { v: "glow", t: "Glow" } ] },
    // Text (all scroll-driven) ----------------------------------
    { tab: "Text", key: "textFx", label: "Text transition", type: "select", options: [
        { v: "parallax", t: "Parallax (Apple)" },
        { v: "fade", t: "Fade" },
        { v: "fade-up", t: "Fade up" },
        { v: "scale", t: "Scale" },
        { v: "none", t: "None" } ] },
    { key: "travelPct", tab: "Text", label: "Travel (% of card width)", type: "range", min: 0, max: 30, step: 1, unit: "%" },
    { key: "textRise", tab: "Text", label: "Rise (fade up)", type: "range", min: 0, max: 80, step: 4, unit: "px" },
    { key: "textScale", tab: "Text", label: "Shrink (scale)", type: "range", min: 0, max: 100, step: 5, unit: "%" },
    { key: "fadeRate", tab: "Text", label: "Fade rate", type: "range", min: 1, max: 6, step: 0.2, unit: "×" },
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
    if (activeTab === "Page") { renderPageUI(); return; }
    panelBody.innerHTML = "";
    CONTROLS.filter((c) => c.tab === activeTab).forEach((c) => {
      panelBody.appendChild(buildControl(c));
    });
  }

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

  /* ---------- Page tab (host-page context switcher) ----------
     Pages are SingleFile snapshots in ../pages, listed in pages.json.
     Selection is URL state (?page=key), not part of the config —
     changing it navigates, and the carousel re-inits inside the
     partner's Thanks placement. Config persists across the switch. */
  function renderPageUI() {
    panelBody.innerHTML = "";
    const wrap = document.createElement("div");
    wrap.className = "setting";
    wrap.innerHTML = `
      <div class="setting__row">
        <span class="setting__label">Host page</span>
        <select data-page-select><option value="">None (bare)</option></select>
      </div>
      <p class="preset-note">Renders the prototype inside a saved partner page,
      in their Thanks placement slot. Add pages by dropping SingleFile snapshots
      into the pages folder and registering them in pages.json.</p>`;
    const sel = wrap.querySelector("select");
    // Static build (GitHub Pages) navigates between pre-assembled
    // page-<key>.html files; the local server uses /?page=<key>.
    const IS_STATIC = !!window.__THANKS_STATIC__;
    const currentPage = IS_STATIC
      ? (location.pathname.match(/page-([\w-]+)\.html$/) || [])[1] || ""
      : new URLSearchParams(location.search).get("page") || "";
    fetch("pages.json")
      .then((r) => r.json())
      .then((manifest) => {
        Object.entries(manifest).forEach(([key, p]) => {
          const o = document.createElement("option");
          o.value = key;
          o.textContent = p.title || key;
          if (key === currentPage) o.selected = true;
          sel.appendChild(o);
        });
      })
      .catch(() => {});
    sel.addEventListener("change", () => {
      if (IS_STATIC) {
        location.href = sel.value ? `page-${sel.value}.html` : "./";
      } else {
        location.href = sel.value ? "/?page=" + encodeURIComponent(sel.value) : "/";
      }
    });
    panelBody.appendChild(wrap);
    // theme lives here too — it's about fitting the host surface
    panelBody.appendChild(buildControl({
      key: "theme", label: "Theme", type: "select", options: [
        { v: "auto", t: "Auto (detect host surface)" },
        { v: "light", t: "Light" },
        { v: "dark", t: "Dark" },
      ],
    }));
  }

  /* Walk up from the embed root to the first opaque background —
     used for "auto" theme AND to composite the translucent unit fill
     into a solid colour the edge fades can match exactly. */
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
  function hostSurfaceIsDark() {
    const c = hostSurfaceRGB();
    return !!c && (0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2]) < 110;
  }

  /* ---------- Presets tab ---------- */
  function renderPresetsUI() {
    panelBody.innerHTML = "";

    // save current config under a name
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

    // saved presets list
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

    // share: copy current / paste + apply
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
    shareRow.innerHTML = `<button type="button" class="tc-btn" data-copy>Copy current</button>
      <button type="button" class="tc-btn" data-apply>Apply pasted</button>
      <button type="button" class="tc-btn" data-reset>Reset all</button>`;
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
      try { localStorage.removeItem(CURRENT_KEY); } catch {}
      applyPreset(DEFAULTS);
    });
    panelBody.appendChild(shareRow);

    const note = document.createElement("p");
    note.className = "preset-note";
    note.textContent = "Presets live in this browser (localStorage). Use Copy to share one with the team.";
    panelBody.appendChild(note);
  }

  function onConfigChange(key) {
    const needsRebuild = key === "slides" || key === "cardPack";
    // structural / run-shape changes restart the run
    if (["endMode", "cycles", "slides", "cardPack", "autoplay"].includes(key)) {
      ended = false; dir = 1; cycleCount = 0;
    }
    // switching design direction applies its recommended settings
    if (key === "cardPack") {
      const rec = CARD_PACKS[config.cardPack].recommends;
      if (rec) { Object.assign(config, rec); renderControls(); }
    }
    applyConfig(needsRebuild);
    if (key === "autoplay") { if (autoplayOn) resumeProgress(); else pauseProgress(); }
    persistCurrent();     // current tuning survives reloads
  }

  /* ============================================================
     init
     ============================================================ */
  restoreCurrent();     // pick up where you left off (Reset all clears)
  // host-page brand tokens (from pages.json) win on load; panel
  // changes still apply live and persist for the session
  if (window.__PAGE_TOKENS__) {
    Object.keys(DEFAULTS).forEach((k) => {
      if (k in window.__PAGE_TOKENS__) config[k] = window.__PAGE_TOKENS__[k];
    });
  }
  build();
  renderTabs();
  renderControls();
  applyConfig(false);

  // test/debug hook (prototype only)
  window.__tc = {
    config, advance, goTo, applyConfig,
    state: () => ({ current, ended, dir, cycleCount, activatedIndex, autoplayOn }),
  };
})();
