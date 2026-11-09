/* MZHX — scroll-step controller: wheel / touch / keys + idle effects + resize */
(function () {
  'use strict';
  const MZ = window.MZ;
  const MZT = window.MZT;

  let current = -1;      // -1 = intro playing; 0..MAXSTEP = resting steps
  let busy = true;
  let queued = 0;        // pending direction (max 1)
  let lastStep = 0;      // timestamp guard
  const MZR = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  let jumping = false;   // a jump-CTA flight is in progress

  // breathing gap: after a section's entrance animation completes, the next
  // incoming scrolls are dead (absorbed) so sections feel separated; forward
  // only, snapping back is instant and never blocked
  const GAPS = new Set([7, 8, 9, 16, 20, 24, 30]);   // ends of: services, grill, ows, flow, works, pledge rows, FAQ accordion
  let gapLeft = 0;

  let mzhxCycle = null;
  let yitlCycle = null;
  let jitterTween = null;

  /* ---------- idle effects per resting step ---------- */
  function syncIdle(step) {
    // "Your Idea to Launch" per-letter cycle
    if (step === 7) {
      if (!yitlCycle) yitlCycle = MZ.makeLetterCycle(Array.from(MZ.els.yitlInner.querySelectorAll('.yl')), 700);
      yitlCycle.start();
    } else if (yitlCycle) yitlCycle.stop();

    // grill micro-jitter while resting on step 8
    if (step === 8 && !jitterTween) {
      const p = MZ.midPos();
      jitterTween = gsap.to(MZ.els.grillWrap, {
        x: () => p.x + gsap.utils.random(-3, 3),
        y: () => p.y + gsap.utils.random(-2, 2),
        duration: 0.16, repeat: -1, repeatRefresh: true, ease: 'none',
      });
    } else if (step !== 8) stopJitter();

    // river boat: gentle wave rocking while the hero is alive
    if (step >= 0 && step <= 8) startBob();
    else stopBob();

    MZ.els.hint.classList.toggle('on', step >= 0 && step < 8);
  }

  /* ---- boat idle rocking (rides the waves, doesn't move forward) ---- */
  let bobTweens = null;
  function startBob() {
    if (bobTweens) return;
    const b = MZ.boat;
    bobTweens = [
      gsap.to(b, { drift: -7, duration: 2.4, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: () => MZ.placeBoat() }),
      gsap.to(b, { rot: -6.5, duration: 2.95, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: () => MZ.placeBoat() }),
      gsap.to(b, { sway: 5, duration: 2.05, ease: 'sine.inOut', yoyo: true, repeat: -1, onUpdate: () => MZ.placeBoat() }),
    ];
  }
  function stopBob() {
    if (!bobTweens) return;
    bobTweens.forEach((t) => t.kill());
    bobTweens = null;
    gsap.set(MZ.boat, { drift: 0, rot: 0, sway: 0 });
    MZ.placeBoat();
  }

  function stopJitter() {
    if (jitterTween) {
      jitterTween.kill();
      jitterTween = null;
      const p = MZ.midPos();
      gsap.set(MZ.els.grillWrap, { x: p.x, y: p.y, rotation: 0 });
    }
  }

  /* ---------- nudge when hitting the boundaries ---------- */
  function nudge(dir) {
    const target = dir > 0 ? MZ.els.rightPanel : MZ.els.leftPanel;
    const x0 = gsap.getProperty(target, 'x') || 0;
    gsap.fromTo(target, { x: x0 + dir * 6 }, { x: x0, duration: 0.34, ease: 'elastic.out(1, 0.4)', overwrite: 'auto' });
  }

  /* ---------- step machine ---------- */
  function afterStep() {
    busy = false;
    gapLeft = GAPS.has(current) ? 2 : 0;   // arm the dead-scroll beat after a section end
    syncIdle(current);
    jumpSpawn();
    if (resnapPending) { resnapPending = false; reSnap(); }
    pump();
  }

  function tryStep(dir) {
    if (current < 0) { if (dir > 0) queued = 1; return; }   // intro still playing
    if (busy) { queued = dir; return; }
    const next = current + dir;
    if (next < 0 || next > MZ.MAXSTEP) { nudge(dir); return; }
    if (dir > 0 && gapLeft > 0) {
      gapLeft--;                                    // section-gap scroll: stay put
      if (queued) { const qd = queued; queued = 0; tryStep(qd); }   // keep draining the pending beat
      return;
    }
    busy = true;
    if (dir > 0) {
      const tl = MZT.getTrans(current);
      tl.eventCallback('onComplete', () => { current = next; afterStep(); });
      tl.eventCallback('onReverseComplete', null);
      tl.play(0);
    } else {
      if (current === 8) stopJitter();   // free the grill's live jitter before snapping
      // scrolling back: land on the previous resting arrangement in one clean
      // snap — replaying transitions in reverse reads as glitchy mid-flight
      // (boxes un-spiraling, tester un-growing), so instead apply the resting
      // layout directly; it also heals any half-finished states
      current = next;
      applyResting();
      afterStep();
    }
  }

  let queuedTimer = null;
  function schedulePump() {
    if (queuedTimer) clearTimeout(queuedTimer);
    queuedTimer = setTimeout(() => { queuedTimer = null; pump(); }, 245);
  }
  function pump() {
    if (queuedTimer) { clearTimeout(queuedTimer); queuedTimer = null; }
    while (queued) {
      const d = queued;
      queued = 0;
      tryStep(d);
      if (busy) break;   // the transition drives the rest and pumps on completion
    }
  }

  /* ---------- jump CTA chip entrance (one-time) ----------
     Arrives exactly when "Mobile App Development" shows on the right —
     service 1 becomes visible from resting step 1 — then rides above the
     MZHX wordmark until the finale parks it. */
  function jumpSpawn() {
    const chip = MZ.els.jumpCta;
    if (!chip || !MZ.jumpCtaGeom) return;
    if (MZ.jumpIn || current < 1 || current > 30) return;
    MZ.jumpIn = true;
    const jg = MZ.jumpCtaGeom(current >= 9 ? 'header' : 'compact');
    if (MZR) { gsap.set(chip, { x: jg.x, y: jg.y, scale: 1, rotation: 0, autoAlpha: 1 }); return; }
    // flies in from the left while spinning; lands with a little overshoot
    gsap.fromTo(chip,
      { x: jg.x - MZ.S.vw * 0.48, y: jg.y, rotation: -270, scale: 0.55, autoAlpha: 0 },
      { x: jg.x, y: jg.y, rotation: 0, scale: 1, autoAlpha: 1, duration: 0.95, ease: 'back.out(1.2)' });
  }

  /* ---------- jump CTA: skip the whole journey, land on the finale ----------
     Click → particles burst from the chip while a stage-colored wash swallows
     the viewport → under the cover the machine plants resting step 30 and
     plays the real finale transition (30→31) → ~2s later the cover eases away
     mid-composition (word settled, teletype typing, pill expanding) and the
     booking flow pre-opens on its first step (date). */
  function jumpFinale() {
    if (jumping || busy || current < 1 || current >= 31) return;
    jumping = true;
    busy = true; queued = 0;    // hold the machine for the whole flight
    const chip = MZ.els.jumpCta;
    if (chip) gsap.to(chip, { autoAlpha: 0, duration: 0.35, ease: 'power1.in' });

    if (MZR) {   // honor reduced motion: one instant cut, no fog
      current = 31;
      applyResting();
      afterStep();
      if (MZ.bookingOpen) MZ.bookingOpen();
      jumping = false;
      return;
    }

    // burst origin = the button the audience clicked (the anchor is a 0-size point)
    const btn = chip ? chip.querySelector('button') : null;
    const r = btn ? btn.getBoundingClientRect() : { left: 40, top: 40, width: 0, height: 0 };
    const ox = r.left + r.width / 2;
    const oy = r.top + r.height / 2;

    // stage-colored disc grows from the chip until it swallows the screen
    const diag = Math.hypot(window.innerWidth, window.innerHeight);
    const wash = document.createElement('div');
    wash.className = 'jump-wash';
    const washSz = diag * 1.15;
    wash.style.width = wash.style.height = washSz + 'px';
    wash.style.marginLeft = wash.style.marginTop = -(washSz / 2) + 'px';
    wash.style.transform = 'translate(' + ox + 'px,' + oy + 'px) scale(0)';
    document.body.appendChild(wash);
    gsap.to(wash, { scale: 1, duration: 0.95, ease: 'power3.inOut' });

    // burst: one outline ring + small particles from the chip origin
    const ring = document.createElement('div');
    ring.className = 'jump-ring';
    document.body.appendChild(ring);
    gsap.set(ring, { x: ox, y: oy });
    gsap.fromTo(ring, { scale: 0.35, opacity: 0.95 },
      { scale: 3.6, opacity: 0, duration: 1.05, ease: 'power2.out', onComplete: () => ring.remove() });
    const COLS = ['#FFFFFF', '#FFFFFF', '#FFFFFF', '#FF4FD8', '#4FF8FF'];
    for (let i = 0; i < 34; i++) {
      const d = document.createElement('div');
      d.className = 'jump-dot';
      const sz = 3 + Math.random() * 6;
      const a = Math.random() * Math.PI * 2;
      const dist = (0.10 + Math.random() * 0.42) * window.innerWidth;
      d.style.width = sz + 'px';
      d.style.height = sz + 'px';
      d.style.background = COLS[(Math.random() * COLS.length) | 0];
      d.style.left = (ox - sz / 2) + 'px';
      d.style.top = (oy - sz / 2) + 'px';
      document.body.appendChild(d);
      gsap.fromTo(d, { x: 0, y: 0, scale: 1, opacity: 1 }, {
        x: Math.cos(a) * dist,
        y: Math.sin(a) * dist - window.innerHeight * 0.04,
        scale: 0.2, opacity: 0,
        duration: 0.75 + Math.random() * 0.5,
        delay: Math.random() * 0.08,
        ease: 'expo.out',
        onComplete: () => d.remove(),
      });
    }

    // galaxy travel: one canvas, a fixed pool of 3D stars — perspective
    // projection does the engine (screen = origin + pos·W/z), gsap.ticker
    // renders, warp velocity eases up via gsap as the cover settles; every
    // star blinks on its own clock, closes-in stars grow and stretch into
    // streaks (previous->current projection = motion blur) then recycle far
    const cv = document.createElement('canvas');
    cv.className = 'jump-canvas';
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    cv.width = Math.round(window.innerWidth * dpr);
    cv.height = Math.round(window.innerHeight * dpr);
    document.body.appendChild(cv);
    const g2 = cv.getContext('2d');
    const W = cv.width, H = cv.height;
    const gx = ox * dpr, gy = oy * dpr;
    const RND = gsap.utils.random;
    const TINTS = ['255,255,255', '255,255,255', '255,255,255', '255,79,216', '79,248,255', '255,214,165'];
    const DEPTH = 7, NEAR = 0.2;
    const COUNT = Math.round(Math.max(400, Math.min(700, (W * H) / 2000)));
    const mkStar = (far) => ({
      x: RND(-1.15, 1.15), y: RND(-1.15, 1.15),
      z: far ? DEPTH : RND(0.45, DEPTH),
      s: RND(0.8, 2.6),
      tw: RND(0.6, 3.6),                          // own blink clock, phase-offset
      ph: Math.random() * Math.PI * 2,
      tint: TINTS[(Math.random() * TINTS.length) | 0],
      big: Math.random() < 0.09,
    });
    const stars = Array.from({ length: COUNT }, () => mkStar(false));
    const warp = { k: 0.3 };
    gsap.to(warp, { k: 1, duration: 1.2, ease: 'power2.inOut', delay: 0.55 });
    const tick = (time, dtms) => {
      const dt = dtms != null ? Math.min(0.05, dtms / 1000) : 0.016;
      g2.clearRect(0, 0, W, H);
      g2.globalCompositeOperation = 'lighter';
      for (let i = 0; i < stars.length; i++) {
        const st = stars[i];
        const z1 = st.z;
        st.z -= 0.13 * warp.k * dt * 2.4;
        if (st.z <= NEAR) { stars[i] = mkStar(true); continue; }
        const x1 = gx + st.x * (W / z1), y1 = gy + st.y * (W / z1);
        const x2 = gx + st.x * (W / st.z), y2 = gy + st.y * (W / st.z);
        const twk = 0.45 + 0.55 * Math.sin(time * st.tw * Math.PI * 2 + st.ph);
        const px = Math.max(0.85, st.s * dpr * (2.6 / st.z));
        const dx = x2 - x1, dy = y2 - y1;
        const dist = Math.hypot(dx, dy);
        if (dist > px * 1.6) {   // moving fast: streak from prev projection
          g2.strokeStyle = 'rgba(' + st.tint + ',' + Math.min(1, 0.85 * twk + 0.1).toFixed(3) + ')';
          g2.lineWidth = px * 1.1 + 0.7;
          g2.beginPath(); g2.moveTo(x1, y1); g2.lineTo(x2, y2); g2.stroke();
        } else {
          g2.fillStyle = 'rgba(' + st.tint + ',' + Math.min(1, twk).toFixed(3) + ')';
          g2.beginPath(); g2.arc(x2, y2, px, 0, Math.PI * 2); g2.fill();
        }
        if (st.big) {           // large stars carry a soft halo
          g2.fillStyle = 'rgba(' + st.tint + ',' + (0.16 * twk).toFixed(3) + ')';
          g2.beginPath(); g2.arc(x2, y2, px * 3.4, 0, Math.PI * 2); g2.fill();
        }
      }
    };
    gsap.ticker.add(tick);

    // cover is up: plant resting-30 and play the real finale transition,
    // reusing the step machine's own completion bookkeeping
    setTimeout(() => {
      current = 30;
      applyResting();
      const tl = MZT.getTrans(30);
      tl.eventCallback('onComplete', () => { jumping = false; current = 31; afterStep(); });
      tl.eventCallback('onReverseComplete', null);
      tl.play(0);
    }, 1000);

    // ~2s of finale composition happen under the cover, then it eases away —
    // but the galaxy keeps flying: it slows to a calm drift, hangs over the
    // fresh finale for a beat and then dissolves slowly over it, so arrival
    // reads as one continuous handoff instead of a hard cut; the booking
    // shell expands onto its first step (date) as the page reveals
    setTimeout(() => {
      gsap.to(wash, { scale: 1.18, opacity: 0, duration: 0.65, ease: 'power2.inOut', onComplete: () => wash.remove() });
      gsap.to(warp, { k: 0.1, duration: 1.6, ease: 'power2.out' });
      gsap.to(cv, { opacity: 0, delay: 1.15, duration: 1.05, ease: 'power1.inOut',
        onComplete: () => { gsap.ticker.remove(tick); cv.remove(); } });
      if (chip) gsap.set(chip, { autoAlpha: 0 });
      if (MZ.bookingOpen) MZ.bookingOpen();
    }, 3000);
  }

  /* ---------- input: wheel ---------- */
  let acc = 0, accT = 0;
  window.addEventListener('wheel', (e) => {
    if (current < 0) { queued = 1; return; }            // queue first step for after intro
    const now = performance.now();
    if (now - accT > 220) acc = 0;
    accT = now;
    acc += e.deltaY * (e.deltaMode === 1 ? 33 : 1);
    if (Math.abs(acc) >= 45) {
      const dir = acc > 0 ? 1 : -1;
      acc = 0;
      if (now - lastStep > 240) { lastStep = now; tryStep(dir); }
      else { queued = dir; schedulePump(); }
    }
  }, { passive: true });

  /* ---------- input: touch ---------- */
  let ty = null;
  window.addEventListener('touchstart', (e) => { ty = e.touches[0].clientY; }, { passive: true });
  window.addEventListener('touchend', (e) => {
    if (ty == null) return;
    const dy = ty - e.changedTouches[0].clientY;
    ty = null;
    if (Math.abs(dy) > 45) { queued = 0; tryStep(dy > 0 ? 1 : -1); }
  }, { passive: true });

  /* ---------- input: keys ---------- */
  window.addEventListener('keydown', (e) => {
    if (['ArrowDown', 'PageDown', ' ', 'Spacebar', 'Enter'].includes(e.key)) { e.preventDefault(); tryStep(1); }
    else if (['ArrowUp', 'PageUp', 'Backspace'].includes(e.key)) { e.preventDefault(); tryStep(-1); }
  });

  /* ---------- resize: re-snap to the resting layout of the current step ---------- */
  let rzTimer = null;
  window.addEventListener('resize', () => {
    clearTimeout(rzTimer);
    rzTimer = setTimeout(reSnap, 160);
  });

  let resnapPending = false;

  function reSnap() {
    if (current < 0) return;
    if (busy) { resnapPending = true; return; }   // don't fight an active transition
    MZ.metrics();
    MZ.measureLetters();
    MZ.fitAll();
    MZ.prepStatic();
    applyResting();
  }

  function applyResting() {
    const t = current;
    const S = MZ.S;
    MZ.setLetters(t >= 31 ? 'finale' : t >= 9 ? 'header' : 'compact');
    MZ.els.logoBox.classList.toggle('hero-live', t >= 0);

    if (t <= 7) {
      MZ.setServiceResting(t);
      gsap.set(MZ.els.grillWrap, { x: MZ.midPos().x, y: MZ.midPos().y, scale: 0.3, rotation: 0, autoAlpha: 0 });
    } else {
      gsap.set(MZ.els.svcLayer, { autoAlpha: 0, clipPath: 'circle(0% at 50% 52%)', scale: 0.4 });
      const p = MZ.midPos();
      if (t === 8) gsap.set(MZ.els.grillWrap, { x: p.x, y: p.y, scale: 1, rotation: 0, autoAlpha: 1 });
      else gsap.set(MZ.els.grillWrap, { x: p.x, y: p.y - S.ph * 0.10, scale: 0.8, rotation: 0, autoAlpha: 0 });
    }

    // ows title (viewport scope); hides again once works take over (t >= 17)
    const oc = MZ.owsCenter(), ot = MZ.owsTop();
    if (t >= 9 && t <= 16) gsap.set(MZ.els.ows, t >= 10
      ? { x: ot.x, y: ot.y, scale: 0.42, autoAlpha: 1 }
      : { x: oc.x, y: oc.y, scale: 1, autoAlpha: 1 });
    else gsap.set(MZ.els.ows, { x: oc.x, y: oc.y, scale: 1, autoAlpha: 0 });
    MZ.els.owsWords.forEach((w) => gsap.set(w, { yPercent: t >= 9 && t <= 16 ? 0 : 115 }));

    // divider + left panel merge into full-width section at step >= 9
    gsap.set(MZ.els.divider, { autoAlpha: t >= 9 ? 0 : 1 });
    gsap.set(MZ.els.riverCanvas, { autoAlpha: t >= 9 ? 0 : 1 });
    gsap.set(MZ.els.boat, { autoAlpha: t >= 9 ? 0 : 1 });
    gsap.set(MZ.els.leftPanel, { autoAlpha: t >= 9 ? 0 : 1 });

    // plan
    const s = MZ.boxS();
    const pc = MZ.planP(), a1 = MZ.p1(), p2 = MZ.p2();
    if (t >= 10 && t <= 16) gsap.set(MZ.els.plan, { x: t >= 11 ? a1.x : pc.x, y: t >= 11 ? a1.y : pc.y, rotation: 0, autoAlpha: 1 });
    else gsap.set(MZ.els.plan, { x: -s * 0.5 - 40, y: pc.y, rotation: -160, autoAlpha: 0 });
    gsap.set(MZ.els.planLbl, { yPercent: t >= 10 && t <= 16 ? 0 : 115 });

    // arrow1 + design
    const a1g = MZ.arrow1Geom();
    if (t >= 11 && t <= 16) {
      gsap.set(MZ.els.arrow1, { autoAlpha: 1 });
      gsap.set(MZ.els.a1shaft, { strokeDashoffset: 0 });
      gsap.set(MZ.els.a1head, { autoAlpha: 1, x: 0, y: 0 });
      gsap.set(MZ.els.design, { x: p2.x, y: p2.y, rotation: 0, autoAlpha: 1 });
      gsap.set(MZ.els.designLbl, { yPercent: 0 });
    } else {
      gsap.set(MZ.els.arrow1, { autoAlpha: 0 });
      gsap.set(MZ.els.a1shaft, { strokeDashoffset: a1g.len });
      gsap.set(MZ.els.a1head, { autoAlpha: 0, x: -9, y: 0 });
      gsap.set(MZ.els.design, { x: S.pw + s, y: p2.y, rotation: 165, autoAlpha: 0 });
      gsap.set(MZ.els.designLbl, { yPercent: 115 });
    }

    // encap + group compression
    const B = MZ.encapBounds();
    const g = MZ.groupGeom();
    gsap.set(MZ.els.encap, { x: B.x, y: B.y, width: B.w, height: B.h, scale: 1, autoAlpha: t >= 12 && t <= 16 ? 0.95 : 0 });
    gsap.set(MZ.els.flowGroup, t >= 12 && t <= 16
      ? { x: g.tx, y: g.ty, scale: g.G }
      : { x: 0, y: 0, scale: 1 });

    // arrow2 + execution circle
    const a2g = MZ.arrow2Geom();
    const C = MZ.execGeom().C;
    if (t === 13 || t === 14 || t === 15 || t === 16) {
      gsap.set(MZ.els.arrow2, { autoAlpha: 1 });
      gsap.set(MZ.els.a2shaft, { strokeDashoffset: 0 });
      gsap.set(MZ.els.a2head, { autoAlpha: 1, x: 0, y: 0 });
      gsap.set(MZ.els.exec, { x: C.x, y: C.y, scale: 1, autoAlpha: 1 });
      gsap.set(MZ.els.execLbl, { yPercent: 0 });
    } else {
      gsap.set(MZ.els.arrow2, { autoAlpha: 0 });
      gsap.set(MZ.els.a2shaft, { strokeDashoffset: a2g.len });
      gsap.set(MZ.els.a2head, { autoAlpha: 0, x: -9, y: 0 });
      gsap.set(MZ.els.exec, { x: C.x, y: C.y, scale: 0.25, autoAlpha: 0 });
      gsap.set(MZ.els.execLbl, { yPercent: 115 });
    }

    // testing (growing rectangle): full at the Publish step, pinched in during
    // the feedback loop, hidden everywhere else
    const tg = MZ.testerGeom();
    const lg = MZ.loopGeom();
    if (t === 15) gsap.set(MZ.els.tester,
      { x: tg.center.x, y: tg.center.y, width: tg.wF, height: tg.hF, scaleX: 1, scaleY: 1, autoAlpha: 1 });
    else if (t === 16) gsap.set(MZ.els.tester,
      { x: tg.center.x, y: tg.center.y, width: tg.wF, height: lg.tester.h, scaleX: 1, scaleY: 1, autoAlpha: 1 });
    else gsap.set(MZ.els.tester,
      { x: tg.center.x, y: tg.center.y, width: tg.w0, height: tg.h0, scaleX: 1, scaleY: 1, autoAlpha: 0 });
    // glow beat leftovers: return the rail to its plain chrome when snapping
    MZ.els.tester.style.boxShadow = '';
    MZ.els.tester.style.borderColor = '';
    gsap.set(MZ.els.testerLbl, { yPercent: t >= 15 && t <= 16 ? 0 : 115 });

    // ---------- publish (15) + feedback loop (16) ----------
    const pg = MZ.publishGeom();
    const pubOn = t === 15 || t === 16;
    const loopOn = t === 16;
    const a3g = MZ.arrow3Geom();
    const a4g = MZ.arrow4Geom();
    const a5g = MZ.arrow5Geom();
    const a6g = MZ.arrow6Geom();
    gsap.set(MZ.els.publish, { xPercent: -50, yPercent: -50, x: pg.x, y: pg.y, scale: 1, autoAlpha: pubOn ? 1 : 0 });
    gsap.set(MZ.els.pubBars, { y: 0 });
    gsap.set(MZ.els.pubLbl, { yPercent: pubOn ? 0 : 115 });
    if (pubOn) {
      gsap.set(MZ.els.arrow3, { autoAlpha: 1 });
      gsap.set(MZ.els.a3shaft, { strokeDashoffset: 0 });
      gsap.set(MZ.els.a3head, { autoAlpha: 1, x: 0, y: 0 });
    } else {
      gsap.set(MZ.els.arrow3, { autoAlpha: 0 });
      gsap.set(MZ.els.a3shaft, { strokeDashoffset: a3g.len });
      gsap.set(MZ.els.a3head, { autoAlpha: 0, x: -9, y: 0 });
    }
    gsap.set(MZ.els.fbGroup, { xPercent: -50, yPercent: -50, x: lg.fb.x, y: lg.fb.grpY, scale: 1, autoAlpha: loopOn ? 1 : 0 });
    gsap.set(MZ.els.users, { scale: 1 });
    gsap.set(MZ.els.fbLbl, { yPercent: loopOn ? 0 : 115 });
    gsap.set(MZ.els.impBox, { xPercent: -50, yPercent: -50, x: lg.imp.x, y: lg.imp.y, scale: 1, autoAlpha: loopOn ? 1 : 0 });
    gsap.set(MZ.els.impLbl, { yPercent: loopOn ? 0 : 115 });
    if (loopOn) {
      gsap.set([MZ.els.arrow4, MZ.els.arrow5, MZ.els.arrow6], { autoAlpha: 1 });
      gsap.set([MZ.els.a4shaft, MZ.els.a5shaft, MZ.els.a6shaft], { strokeDashoffset: 0 });
      gsap.set(MZ.els.a4head, { autoAlpha: 1, x: 0, y: 0 });
      gsap.set(MZ.els.a5head, { autoAlpha: 1, x: 0, y: 0 });
      gsap.set(MZ.els.a6head, { autoAlpha: 1, x: 0, y: 0 });
    } else {
      gsap.set([MZ.els.arrow4, MZ.els.arrow5, MZ.els.arrow6], { autoAlpha: 0 });
      gsap.set(MZ.els.a4shaft, { strokeDashoffset: a4g.len });
      gsap.set(MZ.els.a5shaft, { strokeDashoffset: a5g.len });
      gsap.set(MZ.els.a6shaft, { strokeDashoffset: a6g.len });
      gsap.set(MZ.els.a4head, { autoAlpha: 0, x: 0, y: -9 });
      gsap.set(MZ.els.a5head, { autoAlpha: 0, x: 9, y: 0 });
      gsap.set(MZ.els.a6head, { autoAlpha: 0, x: 0, y: 9 });
    }

    // ---------- works (steps 17..20, four projects) ----------
    const wg = MZ.worksGeom();
    MZ.els.projs.forEach((pr, k) => {
      const active = t === 17 + k;
      gsap.set(pr.el, { x: wg.cC.x, y: wg.cC.y, rotation: 0, scale: 1, autoAlpha: active ? 1 : 0 });
    });
    const worksOn = t >= 17 && t <= 20;
    gsap.set(MZ.els.worksTitle, { x: wg.tC.x, y: wg.tC.y, scale: 1, autoAlpha: worksOn ? 1 : 0 });
    gsap.set(MZ.els.worksWords, { yPercent: worksOn ? 0 : 115 });
    MZ.els.idxNums.forEach((n, k) => {
      const active = t === 17 + k;
      gsap.set(n, { x: wg.nC.x, y: wg.nC.y, autoAlpha: active ? 1 : 0 });
    });

    // ---------- TRUST THE PROCESS (21) + pledge rows (22..24, one per scroll) ----------
    const tgm = MZ.trustGeom();
    const trustOn = t >= 21 && t <= 24;
    gsap.set(MZ.els.trust1, {
      x: tgm.x,
      y: t >= 22 ? tgm.yLift : tgm.y,
      scale: 1,
      autoAlpha: trustOn ? 1 : 0,
    });
    // annotation rides the lifted state (svg parked everywhere else)
    if (MZ.els.trustAnnot) MZ.els.trustAnnot(t >= 22 && t <= 24);
    const pgm = MZ.pledGeom();
    MZ.els.pledges.forEach((pb, i) => {
      const on = t >= 22 + i && t <= 24;
      gsap.set(pb.el, { x: pgm.x, y: pgm.ys[i], rotation: 0, scale: 1, autoAlpha: on ? 1 : 0 });
      // heal the entrance effects into their settled states (mid-effect snap)
      if (t >= 22 && t <= 24) {
        if (i === 2 && pb.finalTxt) pb.lbl.textContent = pb.finalTxt;   // scramble row: restore the real line
        if (pb.charsLbl) gsap.set(pb.charsLbl, { autoAlpha: 1, scale: 1 });
        if (pb.charsDesc) gsap.set(pb.charsDesc, { autoAlpha: 1 });
        if (pb.lbl) {
          pb.lbl.classList.remove('pgrid');   // settled look: clean text line, not the matrix
          gsap.set(pb.lbl, { autoAlpha: 1 });
        }
      }
    });

    // ---------- FAQ accordion (steps 25..30, one question per scroll) ----------
    const fg = MZ.faqGeom();
    const faqOn = t >= 25 && t <= 30;
    gsap.set(MZ.els.faqCap, { x: S.vw / 2, y: fg.capY, autoAlpha: faqOn ? 1 : 0 });
    gsap.set(MZ.els.faqList, { xPercent: -50, x: fg.x, y: fg.topY, autoAlpha: faqOn ? 1 : 0,
      // back at a FAQ step = rows clickable again; gone = never eat clicks
      pointerEvents: faqOn ? 'auto' : 'none' });
    MZ.els.faqs.forEach((q, k) => {
      gsap.set(q.el, { y: 0, autoAlpha: t >= 25 + k ? 1 : 0 });
      // collapsed resting accordion (heals a snap taken mid-hover)
      gsap.set(q.ansWrap, { height: 0, autoAlpha: 0 });
      gsap.set(q.plus, { rotation: 0 });
    });
    if (faqOn && MZ.els.faqCollapseAll) MZ.els.faqCollapseAll();

    // ---------- finale / CTA (step 31) ----------
    const cg = MZ.ctaGeom();
    gsap.set(MZ.els.cta1, { x: cg.l1.x - (MZ.els.ctaFullW ? MZ.els.ctaFullW[0] / 2 : 0), y: cg.l1.y, autoAlpha: t >= 31 ? 1 : 0 });
    gsap.set(MZ.els.cta2, { x: cg.l2.x - (MZ.els.ctaFullW ? MZ.els.ctaFullW[1] / 2 : 0), y: cg.l2.y, autoAlpha: t >= 31 ? 1 : 0 });
    // typed lines park off-finale (fresh type on every arrival)
    if (MZ.els.ctaType) MZ.els.ctaType(t >= 31);
    gsap.set(MZ.els.pill, { x: cg.pill.x, y: cg.pill.y, scale: 1, autoAlpha: t >= 31 ? 1 : 0 });
    if (t < 31 && MZ.bookingReset) MZ.bookingReset();   // pill parks -> booking flow resets
    gsap.set(MZ.els.footLine, { x: S.vw / 2, y: cg.foot, autoAlpha: t >= 31 ? 1 : 0 });

    // ---------- jump CTA chip: rides above the wordmark, parked at the finale ----------
    if (MZ.els.jumpCta && MZ.jumpCtaGeom) {
      const jg = MZ.jumpCtaGeom(t >= 9 ? 'header' : 'compact');
      // tucked during a jump flight so the finishing sequence never re-shows it
      gsap.set(MZ.els.jumpCta, { x: jg.x, y: jg.y, scale: 1, rotation: 0,
        autoAlpha: t >= 1 && t <= 30 && !jumping ? 1 : 0 });
    }

    syncIdle(t);
  }

  /* ---------- boot ---------- */
  let started = false;

  function onIntroDone() {
    current = 0;
    busy = false;
    MZ.els.logoBox.classList.add('hero-live');   // X pendulum
    if (!mzhxCycle) mzhxCycle = MZ.makeGlowWave(MZ.els.letters, 0.6);   // smooth traveling glow
    mzhxCycle.start();
    syncIdle(0);
    pump();
  }

  function start() {
    if (started) return;
    started = true;
    // re-measure with the web font applied
    MZ.metrics();
    MZ.measureLetters();
    MZ.fitAll();
    MZ.prepStatic();

    // if requestAnimationFrame is suppressed (occluded / background window),
    // fall back to a timer-driven ticker so the intro still plays
    let fired = false;
    requestAnimationFrame(() => { fired = true; });
    setTimeout(() => {
      if (!fired) {
        window.requestAnimationFrame = (cb) => setTimeout(() => cb(performance.now()), 16);
        window.cancelAnimationFrame = (id) => clearTimeout(id);
        gsap.ticker.wake();
      }
      const intro = MZT.buildIntro();
      intro.eventCallback('onComplete', onIntroDone);
      intro.play();
    }, 700);
  }

  function boot() {
    MZ.buildDOM();
    if (MZ.els.jumpCta) {
      const jb = MZ.els.jumpCta.querySelector('button');
      if (jb) jb.addEventListener('click', jumpFinale);
    }
    MZ.metrics();
    MZ.measureLetters();
    MZ.fitAll();
    MZ.prepStatic();

    // initial hidden states
    gsap.set('.wi', { yPercent: 115 });
    gsap.set('.bli', { yPercent: 115 });
    gsap.set('#yitl', { autoAlpha: 0 });
    gsap.set(MZ.els.grillWrap, { autoAlpha: 0 });

    if (document.fonts && document.fonts.ready) {
      document.fonts.ready.then(start).catch(start);
      document.fonts.ready.then(() => {
        // if the webfont landed after the initial fit, refit with the real
        // mono advance (pre-intro only — never resets a running intro)
        if (!started) MZ.prepStatic();
      }).catch(() => {});
      setTimeout(start, 2000);   // safety net if font promise stalls
    } else {
      start();
    }
  }

  boot();
})();
