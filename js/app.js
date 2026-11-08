/* MZHX — scroll-step controller: wheel / touch / keys + idle effects + resize */
(function () {
  'use strict';
  const MZ = window.MZ;
  const MZT = window.MZT;

  let current = -1;      // -1 = intro playing; 0..14 = resting steps
  let busy = true;
  let queued = 0;        // pending direction (max 1)
  let lastStep = 0;      // timestamp guard

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

    MZ.els.hint.classList.toggle('on', step >= 0 && step < 8);
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
    syncIdle(current);
    if (resnapPending) { resnapPending = false; reSnap(); }
    pump();
  }

  function tryStep(dir) {
    if (current < 0) { if (dir > 0) queued = 1; return; }   // intro still playing
    if (busy) { queued = dir; return; }
    const next = current + dir;
    if (next < 0 || next > MZ.MAXSTEP) { nudge(dir); return; }
    busy = true;
    if (dir > 0) {
      const tl = MZT.getTrans(current);
      tl.eventCallback('onComplete', () => { current = next; afterStep(); });
      tl.eventCallback('onReverseComplete', null);
      tl.play(0);
    } else {
      if (current === 8) stopJitter();   // free the grill transform before reversing
      const tl = MZT.getTrans(current - 1);
      tl.eventCallback('onReverseComplete', () => { current = next; afterStep(); });
      tl.eventCallback('onComplete', null);
      tl.reverse();
    }
  }

  function pump() {
    if (queued) {
      const d = queued;
      queued = 0;
      tryStep(d);
    }
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
      else queued = dir;
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
    MZ.setLetters(t >= 9 ? 'header' : 'compact');
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

    // ows title (viewport scope)
    const oc = MZ.owsCenter(), ot = MZ.owsTop();
    if (t >= 9) gsap.set(MZ.els.ows, t >= 10
      ? { x: ot.x, y: ot.y, scale: 0.42, autoAlpha: 1 }
      : { x: oc.x, y: oc.y, scale: 1, autoAlpha: 1 });
    else gsap.set(MZ.els.ows, { x: oc.x, y: oc.y, scale: 1, autoAlpha: 0 });
    MZ.els.owsWords.forEach((w) => gsap.set(w, { yPercent: t >= 9 ? 0 : 115 }));

    // divider + left panel merge into full-width section at step >= 9
    gsap.set(MZ.els.divider, { autoAlpha: t >= 9 ? 0 : 1 });
    gsap.set(MZ.els.leftPanel, { autoAlpha: t >= 9 ? 0 : 1 });

    // plan
    const s = MZ.boxS();
    const pc = MZ.planP(), a1 = MZ.p1(), p2 = MZ.p2();
    if (t >= 10) gsap.set(MZ.els.plan, { x: t >= 11 ? a1.x : pc.x, y: t >= 11 ? a1.y : pc.y, rotation: 0, autoAlpha: 1 });
    else gsap.set(MZ.els.plan, { x: -s * 0.5 - 40, y: pc.y, rotation: -160, autoAlpha: 0 });
    gsap.set(MZ.els.planLbl, { yPercent: t >= 10 ? 0 : 115 });

    // arrow1 + design
    const a1g = MZ.arrow1Geom();
    if (t >= 11) {
      gsap.set(MZ.els.arrow1, { autoAlpha: 1 });
      gsap.set(MZ.els.a1shaft, { strokeDashoffset: 0 });
      gsap.set(MZ.els.a1head, { autoAlpha: 1, scale: 1, svgOrigin: `${a1g.tip.x} ${a1g.tip.y}` });
      gsap.set(MZ.els.design, { x: p2.x, y: p2.y, rotation: 0, autoAlpha: 1 });
      gsap.set(MZ.els.designLbl, { yPercent: 0 });
    } else {
      gsap.set(MZ.els.arrow1, { autoAlpha: 0 });
      gsap.set(MZ.els.a1shaft, { strokeDashoffset: a1g.len });
      gsap.set(MZ.els.design, { x: S.pw + s, y: p2.y, rotation: 165, autoAlpha: 0 });
      gsap.set(MZ.els.designLbl, { yPercent: 115 });
    }

    // encap + group compression
    const B = MZ.encapBounds();
    const g = MZ.groupGeom();
    gsap.set(MZ.els.encap, { x: B.x, y: B.y, width: B.w, height: B.h, scale: 1, autoAlpha: t >= 12 ? 0.95 : 0 });
    gsap.set(MZ.els.flowGroup, t >= 12
      ? { x: g.tx, y: g.ty, scale: g.G }
      : { x: 0, y: 0, scale: 1 });

    // arrow2 + execution circle
    const a2g = MZ.arrow2Geom();
    const C = MZ.execGeom().C;
    if (t >= 13) {
      gsap.set(MZ.els.arrow2, { autoAlpha: 1 });
      gsap.set(MZ.els.a2shaft, { strokeDashoffset: 0 });
      gsap.set(MZ.els.a2head, { autoAlpha: 1, scale: 1, svgOrigin: `${a2g.tip.x} ${a2g.tip.y}` });
      gsap.set(MZ.els.exec, { x: C.x, y: C.y, scale: 1, autoAlpha: 1 });
      gsap.set(MZ.els.execLbl, { yPercent: 0 });
    } else {
      gsap.set(MZ.els.arrow2, { autoAlpha: 0 });
      gsap.set(MZ.els.a2shaft, { strokeDashoffset: a2g.len });
      gsap.set(MZ.els.exec, { x: C.x, y: C.y, scale: 0.25, autoAlpha: 0 });
      gsap.set(MZ.els.execLbl, { yPercent: 115 });
    }

    // testing (growing rectangle)
    const tg = MZ.testerGeom();
    if (t >= 14) gsap.set(MZ.els.tester,
      { x: tg.center.x, y: tg.center.y, width: tg.wF, height: tg.hF, scaleX: 1, scaleY: 1, autoAlpha: 1 });
    else gsap.set(MZ.els.tester,
      { x: tg.center.x, y: tg.center.y, width: tg.w0, height: tg.h0, scaleX: 1, scaleY: 1, autoAlpha: 0 });
    gsap.set(MZ.els.testerLbl, { yPercent: t >= 14 ? 0 : 115 });

    syncIdle(t);
  }

  /* ---------- boot ---------- */
  let started = false;

  function onIntroDone() {
    current = 0;
    busy = false;
    MZ.els.logoBox.classList.add('hero-live');   // X pendulum
    if (!mzhxCycle) mzhxCycle = MZ.makeLetterCycle(MZ.els.letters, 950);
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
      setTimeout(start, 2000);   // safety net if font promise stalls
    } else {
      start();
    }
  }

  boot();
})();
