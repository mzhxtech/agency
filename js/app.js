/* MZHX — scroll-step controller: wheel / touch / keys + idle effects + resize */
(function () {
  'use strict';
  const MZ = window.MZ;
  const MZT = window.MZT;

  let current = -1;      // -1 = intro playing; 0..MAXSTEP = resting steps
  let busy = true;
  let queued = 0;        // pending direction (max 1)
  let lastStep = 0;      // timestamp guard

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
    MZ.els.trustEls.forEach((el, i) => {
      gsap.set(el, { x: tgm.cx[i], y: tgm.y, scale: 1, autoAlpha: trustOn ? 1 : 0 });
    });
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
    gsap.set(MZ.els.faqList, { xPercent: -50, x: fg.x, y: fg.topY, autoAlpha: faqOn ? 1 : 0 });
    MZ.els.faqs.forEach((q, k) => {
      gsap.set(q.el, { y: 0, autoAlpha: t >= 25 + k ? 1 : 0 });
      // collapsed resting accordion (heals a snap taken mid-hover)
      gsap.set(q.ansWrap, { height: 0, autoAlpha: 0 });
      gsap.set(q.plus, { rotation: 0 });
    });
    if (faqOn && MZ.els.faqCollapseAll) MZ.els.faqCollapseAll();

    // ---------- finale / CTA (step 31) ----------
    const cg = MZ.ctaGeom();
    gsap.set(MZ.els.cta1, { x: cg.l1.x, y: cg.l1.y, autoAlpha: t >= 31 ? 1 : 0 });
    gsap.set(MZ.els.cta2, { x: cg.l2.x, y: cg.l2.y, autoAlpha: t >= 31 ? 1 : 0 });
    gsap.set(MZ.els.cta1Words, { yPercent: t >= 31 ? 0 : 120 });
    gsap.set(MZ.els.cta2Words, { yPercent: t >= 31 ? 0 : 120 });
    gsap.set(MZ.els.pill, { x: cg.pill.x, y: cg.pill.y, scale: 1, autoAlpha: t >= 31 ? 1 : 0 });
    gsap.set(MZ.els.footLine, { x: S.vw / 2, y: cg.foot, autoAlpha: t >= 31 ? 1 : 0 });

    syncIdle(t);
  }

  /* ---------- boot ---------- */
  let started = false;

  function onIntroDone() {
    current = 0;
    busy = false;
    MZ.els.logoBox.classList.add('hero-live');   // X pendulum
    // per-letter JS glow retired — the MZHX letters now wear the CSS chrome sheen
    // (the .hl .self gradient sweep in styles.css), which travels M -> Z -> H -> X
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
