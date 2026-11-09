/* MZHX — GSAP timelines: intro + scroll-step transitions (each is reverse-safe) */
window.MZT = (function () {
  'use strict';
  const MZ = window.MZ;

  const cache = [];

  /* ---------- intro (auto, plays once on load) ---------- */
  function buildIntro() {
    const S = MZ.S;
    const tl = gsap.timeline({ paused: true });

    // 1) letters drop in one-by-one, stacked vertically filling the height
    MZ.els.letters.forEach((el, i) => {
      const p = MZ.stackedPos(i);
      tl.fromTo(el,
        { x: p.x, y: p.y - S.lh * 0.33, scale: 1.14, rotation: -5, autoAlpha: 0 },
        { x: p.x, y: p.y, scale: 1, rotation: 0, autoAlpha: 1, duration: 0.9, ease: 'back.out(1.3)', immediateRender: false },
        0.25 + i * 0.34);
    });

    // 2) fly left: M first, then Z, H, X -> compact MZHX
    const cl = MZ.compactLayout();
    const t1 = 2.4;
    for (let i = 0; i < 4; i++) {
      const p = cl.pos(i);
      tl.to(MZ.els.letters[i], { x: p.x, y: cl.y, scale: cl.s, duration: 1.05, ease: 'power4.inOut' }, t1 + i * 0.13);
    }
    const flyEnd = t1 + 3 * 0.13 + 1.05;

    // pendulum pivot dot above X
    tl.fromTo(MZ.els.joint, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, flyEnd - 0.15);

    // 3) the river fades in (baked procedural water on canvas) — then the little boat rides in
    tl.fromTo(MZ.els.riverCanvas,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 1.5, ease: 'power2.inOut', immediateRender: false },
      flyEnd - 0.10);
    boatTo(tl, 0, 0.05, flyEnd + 0.75, 1.3, 'power1.inOut');      // boat peeks in from the top
    tl.fromTo(MZ.els.boat, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, immediateRender: false }, flyEnd + 0.85);

    // 4) first stack row splash: "Websites" falls from the top viewport,
    //    "Development" flies in from the right and joins it with a double bump
    stageSplash(tl, MZ.services[0], 0, flyEnd + 0.5);

    return tl;
  }

  /* ---------- boat travel along the river ---------- */
  const BOATP = [0.05, 0.164, 0.284, 0.403, 0.523, 0.642, 0.762, 0.881, 1.0];
  function boatTo(tl, pFrom, pTo, at, dur, ease) {
    tl.fromTo(MZ.boat,
      { p: pFrom },
      {
        p: pTo, duration: dur, ease: ease || 'power1.inOut', immediateRender: false,
        onUpdate: () => { MZ.placeBoat(); if (MZ.riverBoost) MZ.riverBoost(); },   // current quickens while sculling
      },
      at);
  }

  /* ---------- helper builders ---------- */

  // step i -> i+1 for services i in 0..5: the incoming row stages into the right-column
  // stack below the previous ones (nothing moves — the rows accumulate)
  function buildSvcAdvance(i) {
    const S = MZ.S;
    const tl = gsap.timeline({ paused: true });
    const inc = MZ.services[i + 1];

    boatTo(tl, BOATP[i], BOATP[i + 1], 0, 1.35, 'power1.inOut');
    stageRise(tl, inc, i + 1, 0.25);
    return tl;
  }

  /* the first row is the splash: the first word falls from above the viewport,
     every following word flies in from beyond the right panel edge and JOINS the
     line with a double bump (elastic settle). Reversing undoes it exactly. */
  function stageSplash(tl, sv, rowIdx, at) {
    const S = MZ.S;
    const sg = MZ.svcStackGeom();
    const panelL = S.vw - S.pw;                    // panel-local == viewport-y (panel top = 0)
    const anchorWx = panelL + sg.cx;               // the row anchor's absolute x
    tl.set(sv.anchor, { x: sg.cx, y: sg.rowY(rowIdx), autoAlpha: 1, immediateRender: false }, at);
    sv.words.forEach((wi, j) => {
      const mask = wi.parentNode;                  // .w (the overflow-hidden mask)
      const t0 = at + j * 0.2;
      tl.set(wi, { yPercent: 0, immediateRender: false }, t0);
      if (j === 0) {
        // drop from above the viewport top; gravity-ease intrusion
        const drop = sg.rowY(rowIdx) + mask.offsetHeight * 1.25;
        const dur = 0.24 + drop / 1600;
        tl.fromTo(mask, { y: -drop }, { y: 0, duration: dur, ease: 'power2.in', immediateRender: false }, t0);
      } else {
        // enter from beyond the right edge, lands with a two-bump elastic
        const bLeft = anchorWx - sv.inner.offsetWidth / 2;   // .bcenter left incl. its -50% translate
        const wLeft = bLeft + mask.offsetLeft;               // this .w's left edge (absolute)
        const dx = (panelL + S.pw) - wLeft + mask.offsetWidth + 42;
        tl.fromTo(mask, { x: dx }, { x: 0, duration: 0.95, ease: 'elastic.out(1, 0.42)', immediateRender: false }, t0);
      }
    });
  }

  /* every later row rises from below the viewport bottom all the way up to its
     slot — the whole line visibly travels, so the .wi masks open at the start */
  function stageRise(tl, sv, rowIdx, at) {
    const S = MZ.S;
    const sg = MZ.svcStackGeom();
    tl.set(sv.anchor, { x: sg.cx, immediateRender: false }, at);
    tl.fromTo(sv.anchor,
      { y: S.ph + 120, autoAlpha: 0 },
      { y: sg.rowY(rowIdx), autoAlpha: 1, duration: 1.1, ease: 'power3.out', immediateRender: false }, at);
    sv.words.forEach((wi) => {
      tl.set(wi, { yPercent: 0, immediateRender: false }, at);
    });
  }

  // 6 -> 7: "Your Idea to Launch" punches in as the 8th stack row
  function buildYitl() {
    const S = MZ.S;
    const tl = gsap.timeline({ paused: true });
    const sg = MZ.svcStackGeom();
    const x = sg.cx, y = sg.rowY(7);
    boatTo(tl, BOATP[6], BOATP[7], 0, 1.5, 'power1.inOut');
    tl.fromTo(MZ.els.yitl,
      { x, y: y - S.ph * 0.09, scale: 0.35, rotation: -8, autoAlpha: 0 },
      { x, y, scale: 1, rotation: 0, autoAlpha: 1, duration: 0.95, ease: 'elastic.out(1, 0.55)', immediateRender: false }, 0.05);
    return tl;
  }

  // 7 -> 8: everything circles out, "10+ years of grilling" pops with kinetic jitter
  function buildWipe() {
    const S = MZ.S;
    const tl = gsap.timeline({ paused: true });
    const st = MZ.els.svcLayer;
    const g = MZ.els.grillWrap;
    const p = MZ.midPos();

    boatTo(tl, BOATP[7], BOATP[8], 0, 1.7, 'power1.inOut');   // boat reaches the river's bottom
    tl.to(st, { clipPath: 'circle(38% at 50% 52%)', scale: 0.88, duration: 0.55, ease: 'power2.in' }, 0);
    tl.to(st, { clipPath: 'circle(0% at 50% 52%)', scale: 0.4, autoAlpha: 0, duration: 0.5, ease: 'power3.in' }, 0.55);

    tl.fromTo(g,
      { x: p.x, y: p.y - S.ph * 0.10, scale: 0.3, rotation: -9, autoAlpha: 0 },
      { x: p.x, y: p.y, scale: 1, rotation: 0, autoAlpha: 1, duration: 0.55, ease: 'back.out(2.8)', immediateRender: false }, 1.05);

    // kinetic jitter (absolute values so reversal is exact)
    const jx = S.pw * 0.012, jy = S.ph * 0.009;
    tl.to(g, { x: p.x + jx, y: p.y - jy, rotation: 1.6, duration: 0.06, ease: 'none' }, 1.65);
    tl.to(g, { x: p.x - jx * 0.8, y: p.y + jy * 0.7, rotation: -1.3, duration: 0.06, ease: 'none' }, 1.72);
    tl.to(g, { x: p.x + jx * 0.5, y: p.y - jy * 0.4, rotation: 0.7, duration: 0.05, ease: 'none' }, 1.79);
    tl.to(g, { x: p.x, y: p.y, rotation: 0, duration: 0.05, ease: 'none' }, 1.85);
    return tl;
  }

  // 8 -> 9: line + left panel fade out (full-width section); MZHX becomes header icon;
  // "Our way of work" unveils dead center of the whole viewport
  function buildHeader() {
    const tl = gsap.timeline({ paused: true });
    const hl = MZ.headerLayout();
    const oc = MZ.owsCenter();

    tl.to(MZ.els.grillWrap, { y: oc.y - MZ.S.vh * 0.10, scale: 0.8, autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, 0);
    boatTo(tl, 1.0, 1.10, 0, 1.2, 'power1.in');                    // boat drifts off the bottom
    tl.to(MZ.els.boat, { autoAlpha: 0, duration: 0.7, ease: 'power2.in' }, 0.3);
    tl.to(MZ.els.riverCanvas, { autoAlpha: 0, duration: 0.7, ease: 'power2.inOut' }, 0.15);
    tl.to(MZ.els.leftPanel, { autoAlpha: 0, duration: 0.9, ease: 'power2.inOut' }, 0.15);
    MZ.els.letters.forEach((el, i) => {
      tl.to(el, { x: hl.pos(i).x, y: hl.y, scale: hl.s, duration: 1.05, ease: 'power4.inOut' }, 0.08 + i * 0.045);
    });

    // persistent companion rides along: the Book Scoping Call chip leaves its
    // spot over the mid-left wordmark and claims the top-right home it keeps
    // in every later section, landing with a small overshoot settle
    const jc = MZ.jumpCtaGeom('compact');
    const jh = MZ.jumpCtaGeom('corner');
    tl.fromTo(MZ.els.jumpCta, { x: jc.x, y: jc.y },
      { x: jh.x, y: jh.y, duration: 1.2, ease: 'power3.inOut', immediateRender: false }, 0.12);
    tl.fromTo(MZ.els.jumpCta, { scale: 1.06, rotation: 2.5 },
      { scale: 1, rotation: 0, duration: 0.38, ease: 'back.out(1.6)', immediateRender: false }, 1.32);

    tl.to(MZ.els.ows, { x: oc.x, y: oc.y, scale: 1, autoAlpha: 1, duration: 0.01, immediateRender: false }, 0.55);
    MZ.els.owsWords.forEach((w, i) => {
      tl.fromTo(w, { yPercent: 115 }, { yPercent: 0, duration: 0.65, ease: 'power4.out', immediateRender: false }, 0.72 + i * 0.11);
    });
    return tl;
  }

  // 9 -> 10: title sticks on top; Plan box slides in rotating, unveils
  function buildPlanIn() {
    const tl = gsap.timeline({ paused: true });
    const s = MZ.boxS();
    const pc = MZ.planP();
    const ot = MZ.owsTop();

    tl.to(MZ.els.ows, { x: ot.x, y: ot.y, scale: 0.42, duration: 0.8, ease: 'power3.inOut' }, 0);

    tl.fromTo(MZ.els.plan,
      { x: -s * 0.5 - 40, y: pc.y, autoAlpha: 0 },
      { x: pc.x, y: pc.y, autoAlpha: 1, duration: 1.05, ease: 'power3.out', immediateRender: false }, 0.15);
    tl.fromTo(MZ.els.plan, { rotation: -160 }, { rotation: 0, duration: 1.05, ease: 'back.out(1.6)', immediateRender: false }, 0.15);
    tl.fromTo(MZ.els.planLbl, { yPercent: 115 }, { yPercent: 0, duration: 0.55, ease: 'power4.out', immediateRender: false }, 1.2);
    return tl;
  }

  // 10 -> 11: Plan slides left, arrow draws to the right, Design slides in from right
  function buildPlanDesign() {
    const tl = gsap.timeline({ paused: true });
    const S = MZ.S;
    const p2 = MZ.p2();
    const s = MZ.boxS();
    const a1 = MZ.arrow1Geom();

    tl.to(MZ.els.plan, { x: MZ.p1().x, y: MZ.p1().y, duration: 0.85, ease: 'power3.inOut' }, 0);
    tl.set(MZ.els.arrow1, { autoAlpha: 1, immediateRender: false }, 0.85);
    tl.fromTo(MZ.els.a1shaft, { strokeDashoffset: a1.len }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, 0.88);
    // head pops in with a small local slide along the arrow axis (no svgOrigin —
    // it leaves residual translations when ancestors are scaled, e.g. flowGroup)
    tl.fromTo(MZ.els.a1head,
      { autoAlpha: 0, x: -9 },
      { autoAlpha: 1, x: 0, duration: 0.3, ease: 'back.out(2)', immediateRender: false }, 1.3);

    tl.fromTo(MZ.els.design,
      { x: S.vw + s, y: p2.y, autoAlpha: 0 },
      { x: p2.x, y: p2.y, autoAlpha: 1, duration: 0.95, ease: 'power3.out', immediateRender: false }, 1.0);
    tl.fromTo(MZ.els.design, { rotation: 165 }, { rotation: 0, duration: 0.9, ease: 'back.out(1.5)', immediateRender: false }, 1.0);
    tl.fromTo(MZ.els.designLbl, { yPercent: 115 }, { yPercent: 0, duration: 0.55, ease: 'power4.out', immediateRender: false }, 1.9);
    return tl;
  }

  // 11 -> 12: encapsulator fades in; whole cluster flies left, compressed
  function buildEncap() {
    const tl = gsap.timeline({ paused: true });
    const B = MZ.encapBounds();
    const g = MZ.groupGeom();

    tl.fromTo(MZ.els.encap,
      { x: B.x, y: B.y, width: B.w, height: B.h, autoAlpha: 0, scale: 0.97 },
      { x: B.x, y: B.y, width: B.w, height: B.h, autoAlpha: 0.95, scale: 1, duration: 0.6, ease: 'power2.out', immediateRender: false, transformOrigin: '50% 50%' }, 0.05);

    tl.to(MZ.els.flowGroup, { x: g.tx, y: g.ty, scale: g.G, transformOrigin: '0 0', duration: 1.0, ease: 'power3.inOut' }, 0.4);
    return tl;
  }

  // 12 -> 13: arrow from design to big gradient circle "Execution"
  function buildExec() {
    const tl = gsap.timeline({ paused: true });
    const a2 = MZ.arrow2Geom();
    const C = MZ.execGeom().C;

    tl.set(MZ.els.arrow2, { autoAlpha: 1, immediateRender: false }, 0);
    tl.fromTo(MZ.els.a2shaft, { strokeDashoffset: a2.len }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.out', immediateRender: false }, 0.02);
    // head pops with a local slide (see arrow1 note — avoids svgOrigin residuals)
    tl.fromTo(MZ.els.a2head,
      { autoAlpha: 0, x: -9 },
      { autoAlpha: 1, x: 0, duration: 0.32, ease: 'back.out(2)', immediateRender: false }, 0.5);

    tl.fromTo(MZ.els.exec,
      { x: C.x, y: C.y, scale: 0.25, autoAlpha: 0 },
      { x: C.x, y: C.y, scale: 1, autoAlpha: 1, duration: 0.95, ease: 'back.out(1.6)', immediateRender: false }, 0.25);
    tl.fromTo(MZ.els.execLbl, { yPercent: 115 }, { yPercent: 0, duration: 0.6, ease: 'power4.out', immediateRender: false }, 1.15);
    return tl;
  }

  // 13 -> 14: plain rectangle grows from a small box about the composition's
  // center until it encloses Plan + Design + Execution entirely
  function buildTester() {
    const tl = gsap.timeline({ paused: true });
    const tg = MZ.testerGeom();

    tl.fromTo(MZ.els.tester,
      { x: tg.center.x, y: tg.center.y, width: tg.w0, height: tg.h0, autoAlpha: 0 },
      { width: tg.wF, height: tg.hF, autoAlpha: 1, duration: 1.0, ease: 'power3.inOut', immediateRender: false }, 0);
    tl.fromTo(MZ.els.testerLbl, { yPercent: 115 }, { yPercent: 0, duration: 0.55, ease: 'power4.out', immediateRender: false }, 0.85);
    return tl;
  }

  // 14 -> 15: box pops in wherever space allows right of the Testing rect;
  // the same arrow draws from Testing to its left edge, then a pile of bars
  // drops from the top of the box and stacks, with "Publish" landing under it
  function buildPublish() {
    const tl = gsap.timeline({ paused: true });
    const a3 = MZ.arrow3Geom();
    const pg = MZ.publishGeom();

    tl.set(MZ.els.publish, { xPercent: -50, yPercent: -50, immediateRender: false }, 0);
    tl.set(MZ.els.pubBars, { y: 0, autoAlpha: 0, immediateRender: false }, 0);
    tl.fromTo(MZ.els.publish,
      { x: pg.x, y: pg.y, scale: 0.62, autoAlpha: 0 },
      { x: pg.x, y: pg.y, scale: 1, autoAlpha: 1, duration: 0.75, ease: 'back.out(1.5)', immediateRender: false }, 0);

    tl.set(MZ.els.arrow3, { autoAlpha: 1, immediateRender: false }, 0.3);
    tl.fromTo(MZ.els.a3shaft, { strokeDashoffset: a3.len }, { strokeDashoffset: 0, duration: 0.48, ease: 'power2.out', immediateRender: false }, 0.32);
    tl.fromTo(MZ.els.a3head,
      { autoAlpha: 0, x: -9 },
      { autoAlpha: 1, x: 0, duration: 0.3, ease: 'back.out(2)', immediateRender: false }, 0.74);

    // bars cascade from above the box and pile downward, one per beat
    MZ.els.pubBars.forEach((bar, i) => {
      tl.fromTo(bar,
        { y: -(pg.h * 1.02), autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.52, ease: 'power2.in', immediateRender: false },
        1.05 + i * 0.17);
    });
    tl.fromTo(MZ.els.pubLbl, { yPercent: 115 }, { yPercent: 0, duration: 0.55, ease: 'power4.out', immediateRender: false }, 1.62);
    return tl;
  }

  /* a landing card's internals assemble: browser dots pop, canvas bricks slide
     up into place, the watermark drifts in, caption lines rise */
  function stageCardInner(tl, pr, at) {
    pr.el.querySelectorAll('.tb i').forEach((d, i) => {
      tl.fromTo(d, { scale: 0 }, { scale: 1, duration: 0.4, ease: 'back.out(2.2)', immediateRender: false }, at + 0.28 + i * 0.09);
    });
    pr.el.querySelectorAll('.brick').forEach((b, i) => {
      tl.fromTo(b,
        { yPercent: 130, autoAlpha: 0 },
        { yPercent: 0, autoAlpha: 1, duration: 0.55, ease: 'power3.out', immediateRender: false },
        at + 0.42 + i * 0.09);
    });
    tl.fromTo(pr.wm,
      { x: 46, autoAlpha: 0 },
      { x: 0, autoAlpha: 1, duration: 0.6, ease: 'power3.out', immediateRender: false }, at + 0.72);
    const cap = pr.el.querySelector('.cap');
    ['strong', 'em', '.tags'].forEach((sel, i) => {
      tl.fromTo(cap.querySelector(sel),
        { y: 16, autoAlpha: 0 },
        { y: 0, autoAlpha: 1, duration: 0.5, ease: 'power3.out', immediateRender: false },
        at + 0.92 + i * 0.13);
    });
  }

  /* ---------- lazy cache ---------- */
  // 15 -> 16: tester rail pinches in and its caption lifts off while the
  // improving loop spins up: arrow to the Feedback cluster (avatars + caption),
  // then into the Improve box, then straight back onto the Testing box
  function buildLoop() {
    const tl = gsap.timeline({ paused: true });
    const lg = MZ.loopGeom();
    const a4 = MZ.arrow4Geom();
    const a5 = MZ.arrow5Geom();
    const a6 = MZ.arrow6Geom();

    // tester rail pinches in (caption stays put)
    tl.to(MZ.els.tester, { height: lg.tester.h, duration: 0.9, ease: 'power3.inOut' }, 0);

    // Publish tips down to Feedback
    tl.set(MZ.els.arrow4, { autoAlpha: 1, immediateRender: false }, 0.25);
    tl.fromTo(MZ.els.a4shaft, { strokeDashoffset: a4.len }, { strokeDashoffset: 0, duration: 0.6, ease: 'power2.out', immediateRender: false }, 0.27);
    tl.fromTo(MZ.els.a4head,
      { autoAlpha: 0, y: -9 },
      { autoAlpha: 1, y: 0, duration: 0.3, ease: 'back.out(2)', immediateRender: false }, 0.82);

    // feedback cluster: avatars pop singly, caption slides up through its mask
    tl.set(MZ.els.fbGroup, { xPercent: -50, yPercent: -50, immediateRender: false }, 0.55);
    tl.fromTo(MZ.els.fbGroup,
      { x: lg.fb.x, y: lg.fb.grpY, scale: 0.72, autoAlpha: 0 },
      { x: lg.fb.x, y: lg.fb.grpY, scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(1.6)', immediateRender: false }, 0.55);
    MZ.els.users.forEach((u, i) => {
      tl.fromTo(u,
        { scale: 0.3, autoAlpha: 0 },
        { scale: 1, autoAlpha: 1, duration: 0.42, ease: 'back.out(2.2)', immediateRender: false },
        1.0 + i * 0.13);
    });
    tl.fromTo(MZ.els.fbLbl, { yPercent: 115 }, { yPercent: 0, duration: 0.55, ease: 'power4.out', immediateRender: false }, 1.32);

    // feedback hands left into Improve
    tl.set(MZ.els.impBox, { xPercent: -50, yPercent: -50, immediateRender: false }, 1.3);
    tl.fromTo(MZ.els.impBox,
      { x: lg.imp.x, y: lg.imp.y, scale: 0.62, autoAlpha: 0 },
      { x: lg.imp.x, y: lg.imp.y, scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(1.5)', immediateRender: false }, 1.4);
    tl.fromTo(MZ.els.impLbl, { yPercent: 115 }, { yPercent: 0, duration: 0.5, ease: 'power4.out', immediateRender: false }, 1.98);
    tl.set(MZ.els.arrow5, { autoAlpha: 1, immediateRender: false }, 1.28);
    tl.fromTo(MZ.els.a5shaft, { strokeDashoffset: a5.len }, { strokeDashoffset: 0, duration: 0.55, ease: 'power2.out', immediateRender: false }, 1.3);
    tl.fromTo(MZ.els.a5head,
      { autoAlpha: 0, x: 9 },
      { autoAlpha: 1, x: 0, duration: 0.3, ease: 'back.out(2)', immediateRender: false }, 1.8);

    // Improve feeds straight back up into Testing — the loop closes; the rail's
    // border glows for a beat the moment the arrowhead touches it
    tl.set(MZ.els.arrow6, { autoAlpha: 1, immediateRender: false }, 2.0);
    tl.fromTo(MZ.els.a6shaft, { strokeDashoffset: a6.len }, { strokeDashoffset: 0, duration: 0.5, ease: 'power2.out', immediateRender: false }, 2.02);
    tl.fromTo(MZ.els.a6head,
      { autoAlpha: 0, y: 9 },
      { autoAlpha: 1, y: 0, duration: 0.3, ease: 'back.out(2)', immediateRender: false }, 2.45);
    tl.to(MZ.els.tester, {
      boxShadow: '0 12px 44px rgba(0,0,0,.55), 0 0 46px 10px rgba(166,173,255,.5)',
      borderColor: 'rgba(255,255,255,.8)', duration: 0.85, ease: 'sine.inOut',
    }, 2.2);
    tl.to(MZ.els.tester, {
      boxShadow: '0 12px 44px rgba(0,0,0,.55), inset 0 0 32px rgba(255,255,255,.045)',
      borderColor: 'rgba(255,255,255,.38)', duration: 0.9, ease: 'sine.inOut',
    }, 3.08);
    return tl;
  }

  // 16 -> 17: tester contracts, flow fades, "Selected Works" + card 01 arrive
  function buildWorksIn() {
    const tl = gsap.timeline({ paused: true });
    const S = MZ.S;
    const wg = MZ.worksGeom();
    const tg = MZ.testerGeom();

    tl.to(MZ.els.tester, { width: tg.w0, height: tg.h0, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 0);
    tl.to([MZ.els.plan, MZ.els.design, MZ.els.exec, MZ.els.encap, MZ.els.arrow1, MZ.els.arrow2, MZ.els.publish, MZ.els.arrow3, MZ.els.fbGroup, MZ.els.impBox, MZ.els.arrow4, MZ.els.arrow5, MZ.els.arrow6], { autoAlpha: 0, duration: 0.45 }, 0.05);
    tl.to(MZ.els.ows, { scale: 0.88, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 0.1);
    MZ.els.owsWords.forEach((w, i) => {
      tl.to(w, { yPercent: -140, duration: 0.5, ease: 'power3.in' }, 0.12 + i * 0.05);
    });

    // title drops in word by word
    tl.set(MZ.els.worksTitle, { x: wg.tC.x, y: wg.tC.y, scale: 1, autoAlpha: 1, immediateRender: false }, 0.62);
    MZ.els.worksWords.forEach((w, i) => {
      tl.fromTo(w,
        { yPercent: -135 },
        { yPercent: 0, duration: i === 0 ? 0.85 : 0.6, ease: i === 0 ? 'bounce.out' : 'power4.out', immediateRender: false },
        0.68 + i * 0.16);
    });

    // card 01 slides in, index number follows, then its internals assemble
    tl.fromTo(MZ.els.projs[0].el,
      { x: wg.cC.x + S.vw * 0.30, y: wg.cC.y + S.vh * 0.10, scale: 0.92, rotation: 2, autoAlpha: 0 },
      { x: wg.cC.x, y: wg.cC.y, scale: 1, rotation: 0, autoAlpha: 1, duration: 1.0, ease: 'power3.out', immediateRender: false }, 0.75);
    tl.fromTo(MZ.els.idxNums[0],
      { x: wg.nC.x + S.vw * 0.14, y: wg.nC.y, autoAlpha: 0 },
      { x: wg.nC.x, autoAlpha: 1, duration: 0.9, ease: 'power3.out', immediateRender: false }, 0.95);
    stageCardInner(tl, MZ.els.projs[0], 0.75);
    return tl;
  }

  // works step k -> k+1 (k = 1..3): card k-1 flies out left, card k in with its
  // internals assembling as it lands
  function buildWorksNext(k) {
    const tl = gsap.timeline({ paused: true });
    const S = MZ.S;
    const wg = MZ.worksGeom();

    tl.to(MZ.els.projs[k - 1].el,
      { x: wg.cC.x - S.vw * 0.72, rotation: -3.5, autoAlpha: 0, duration: 0.8, ease: 'power3.in' }, 0);
    tl.fromTo(MZ.els.projs[k].el,
      { x: wg.cC.x + S.vw * 0.72, y: wg.cC.y, scale: 1.04, rotation: 3.5, autoAlpha: 0 },
      { x: wg.cC.x, y: wg.cC.y, scale: 1, rotation: 0, autoAlpha: 1, duration: 0.95, ease: 'power3.out', immediateRender: false }, 0.42);
    tl.to(MZ.els.idxNums[k - 1],
      { x: wg.nC.x - S.vw * 0.22, autoAlpha: 0, duration: 0.55, ease: 'power2.in' }, 0.08);
    tl.fromTo(MZ.els.idxNums[k],
      { x: wg.nC.x + S.vw * 0.22, y: wg.nC.y, autoAlpha: 0 },
      { x: wg.nC.x, autoAlpha: 1, duration: 0.8, ease: 'power3.out', immediateRender: false }, 0.5);
    stageCardInner(tl, MZ.els.projs[k], 0.42);
    return tl;
  }

  // 20 -> 21: works exit; "TRUST" slides in from the left, "THE" fades up,
  // "PROCESS" slides in from the right
  function buildTrustIn() {
    const tl = gsap.timeline({ paused: true });
    const S = MZ.S;
    const wg = MZ.worksGeom();
    const tgm = MZ.trustGeom();

    tl.to(MZ.els.projs[3].el,
      { x: wg.cC.x - S.vw * 0.72, rotation: -4, autoAlpha: 0, duration: 0.75, ease: 'power3.in' }, 0);
    tl.to(MZ.els.idxNums[3],
      { x: wg.nC.x + S.vw * 0.22, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 0);
    MZ.els.worksWords.forEach((w, i) => {
      tl.to(w, { yPercent: -140, duration: 0.5, ease: 'power3.in' }, 0.1 + i * 0.05);
    });
    tl.to(MZ.els.worksTitle, { autoAlpha: 0, duration: 0.3 }, 0.5);

    // TRUST: the whole display line rides in from the left and settles centered
    tl.fromTo(MZ.els.trust1,
      { x: tgm.x - S.vw * 0.30, y: tgm.y, autoAlpha: 0 },
      { x: tgm.x, y: tgm.y, autoAlpha: 1, duration: 0.95, ease: 'power3.out', immediateRender: false }, 0.55);
    return tl;
  }

  // 21 -> 22 / 22 -> 23 / 23 -> 24: one pledge row per scroll, strictly after
  // the previous one has finished — each with its own effect:
  //   row 1 — stagger grid: the line's 30 chars sit in a 2x15 tile grid and
  //           pulse outward from its center
  //   row 2 — reveal wave: characters surface at a fixed per-second rate
  //   row 3 — scramble: random characters unravel left-to-right into the line

  function pledgeRise(tl, i) {
    const S = MZ.S;
    const pgm = MZ.pledGeom();
    const pb = MZ.els.pledges[i];
    tl.fromTo(pb.el,
      { y: pgm.ys[i] + S.vh * 0.30, autoAlpha: 0 },
      { y: pgm.ys[i], autoAlpha: 1, duration: 0.6, ease: 'power3.out', immediateRender: false },
      0.16);
    return pb;
  }

  function buildPledge1() {
    const tl = gsap.timeline({ paused: true });
    const S = MZ.S;
    const tgm = MZ.trustGeom();
    const pb = pledgeRise(tl, 0);
    // one scroll past its entrance, the display line lifts a touch so the
    // stack stays a clean vertical column; as it settles, the Margin-Note
    // annotation un-parks and draws from a fresh 0 (pure CSS fx)
    tl.to(MZ.els.trust1, { y: tgm.yLift, duration: 0.62, ease: 'power2.inOut' }, 0.1);
    tl.call(() => { if (MZ.els.trustAnnot) MZ.els.trustAnnot(true); }, null, 0.8);
    const D = 0.42 + 29 * 0.045 + 0.3;   // moment the grid pulse finishes
    tl.fromTo(pb.charsLbl,
      { scale: 0.2, autoAlpha: 0 },
      { scale: 1, autoAlpha: 1, duration: 0.3, ease: 'power1.out', immediateRender: false,
        stagger: { each: 0.045, grid: [2, 15], from: 'center' } },
      0.42);
    // settle: the letters fold out of the matrix back into a clean text line
    tl.to(pb.lbl, { autoAlpha: 0, duration: 0.12 }, D - 0.14);
    tl.call(() => { pb.lbl.classList.remove('pgrid'); }, null, D);
    tl.to(pb.lbl, { autoAlpha: 1, duration: 0.12 }, D + 0.02);
    return tl;
  }

  function buildPledge2() {
    const tl = gsap.timeline({ paused: true });
    const pb = pledgeRise(tl, 1);
    tl.fromTo(pb.charsLbl,
      { autoAlpha: 0 },
      { autoAlpha: 1, duration: 0.09, stagger: { each: 0.02 }, ease: 'none', immediateRender: false },
      0.42);
    return tl;
  }

  function buildPledge3() {
    const tl = gsap.timeline({ paused: true });
    const pb = pledgeRise(tl, 2);
    const POOL = 'MZHX*#/0427';   // character pool driven live by the scramble
    const scTxt = (txt, p) => {
      let out = '';
      const n = txt.length;
      for (let i = 0; i < n; i++) {
        const ch = txt[i];
        if (ch === ' ') { out += ' '; continue; }
        out += p * n >= i + 1 ? ch : POOL[(Math.random() * POOL.length) | 0];
      }
      return out;
    };
    tl.call(() => { pb.lbl.textContent = scTxt(pb.finalTxt, 0); }, null, 0.16);
    const proxy = { p: 0 };
    tl.to(proxy, {
      p: 1, duration: 0.85, ease: 'none', immediateRender: false,
      onUpdate: () => { pb.lbl.textContent = scTxt(pb.finalTxt, proxy.p); },
    }, 0.42);
    return tl;
  }

  // close any open FAQ answer as a new question rises in (the question above
  // closes when the next one arrives)
  function faqShutAll(tl, at) {
    tl.call(() => { if (MZ.els.faqCollapseAll) MZ.els.faqCollapseAll(); }, null, at);
  }

  // 24 -> 25: pledges exit upward; the FAQ stage clicks into place — caption
  // first, then the first question rises from the bottom of the viewport into
  // its stack slot
  function buildFaqQ1() {
    const tl = gsap.timeline({ paused: true });
    const S = MZ.S;
    const tgm = MZ.trustGeom();
    const pgm = MZ.pledGeom();
    const fg = MZ.faqGeom();

    tl.to(MZ.els.trust1, { y: tgm.yLift - S.vh * 0.10, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 0.02);
    MZ.els.pledges.forEach((pb, i) => {
      tl.to(pb.el, {
        y: pgm.ys[i] - S.vh * 0.36, autoAlpha: 0, rotation: 0,
        duration: 0.6, ease: 'power2.in',
      }, 0.05 + i * 0.05);
    });

    tl.set(MZ.els.faqCap, { x: S.vw / 2, y: fg.capY, immediateRender: false }, 0.42);
    tl.fromTo(MZ.els.faqCap, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.5, immediateRender: false }, 0.42);
    tl.set(MZ.els.faqList, { xPercent: -50, x: fg.x, y: fg.topY, immediateRender: false }, 0.5);
    tl.fromTo(MZ.els.faqList, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, immediateRender: false }, 0.5);
    faqShutAll(tl, 0.5);
    tl.fromTo(MZ.els.faqs[0].el,
      { y: S.vh * 0.26, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.72, ease: 'power3.out', immediateRender: false }, 0.6);
    return tl;
  }

  // 25..29 -> next: one more question rises from the bottom and stacks below
  // the previous one; an open answer closes as it arrives
  function buildFaqQk(k) {   // k = index of the arriving question (1..5)
    const tl = gsap.timeline({ paused: true });
    const S = MZ.S;
    faqShutAll(tl, 0.02);
    tl.fromTo(MZ.els.faqs[k].el,
      { y: S.vh * 0.26, autoAlpha: 0 },
      { y: 0, autoAlpha: 1, duration: 0.72, ease: 'power3.out', immediateRender: false }, 0.3);
    return tl;
  }

  // 23 -> 24: FAQ grid exits up; finale — MZHX reassembles center, CTA lines,
  // contact pill, footer
  function buildFinale() {
    const tl = gsap.timeline({ paused: true });
    const S = MZ.S;
    const fg = MZ.faqGeom();
    const cg = MZ.ctaGeom();
    const fl = MZ.finaleLayout();

    MZ.els.faqs.forEach((q, k) => {
      tl.to(q.el, { y: -S.vh * 0.16, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 0.05 + k * 0.03);
    });
    tl.to(MZ.els.faqCap, { y: fg.capY - S.vh * 0.07, autoAlpha: 0, duration: 0.4, ease: 'power2.in' }, 0.05);
    // once the rows are gone the (sized) container must stop eating clicks over
    // the CTA band — it stays in the tree for resize, so park it pointer-dead
    tl.set(MZ.els.faqList, { autoAlpha: 0, pointerEvents: 'none' }, 0.75);

    // hero letters fly from the header into the big centered wordmark
    MZ.els.letters.forEach((el, i) => {
      tl.to(el, { x: fl.pos(i).x, y: fl.y, scale: fl.s, duration: 1.05, ease: 'power4.inOut' }, 0.3 + i * 0.045);
    });

    // persistent companion docks: the Book Scoping Call chip glides down from
    // its top-right home into the CTA slot and fades into its idle twin — the
    // booking pill's identical "Book Scoping Call" button pops up at exactly
    // this point right before it lands. After a jump arrival it stays
    // dissolved (MZ.chipFlightSkip parks it hidden through this flight).
    const jCorner = MZ.jumpCtaGeom('corner');
    tl.call(() => {                                       // per-play: safe across cached replays
      const chip = MZ.els.jumpCta;
      if (!chip) return;
      gsap.set(chip, { x: jCorner.x, y: jCorner.y, scale: 1, rotation: 0,
        autoAlpha: MZ.chipFlightSkip ? 0 : 1 });
    }, null, 1.0);
    tl.fromTo(MZ.els.jumpCta, { x: jCorner.x, y: jCorner.y },
      { x: cg.pill.x, y: cg.pill.y, duration: 1.55, ease: 'power3.inOut', immediateRender: false }, 1.0);
    tl.call(() => {
      const chip = MZ.els.jumpCta;
      if (chip) gsap.to(chip, { autoAlpha: 0, duration: 0.3, ease: 'power1.in' });
    }, null, 2.55);

    // CTA lines: left-anchored; the pure-CSS Teletype fx draws them in
    tl.set(MZ.els.cta1, { x: cg.l1.x - (MZ.els.ctaFullW ? MZ.els.ctaFullW[0] / 2 : 0), y: cg.l1.y, immediateRender: false }, 1.15);
    tl.fromTo(MZ.els.cta1, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, 1.15);
    tl.set(MZ.els.cta2, { x: cg.l2.x - (MZ.els.ctaFullW ? MZ.els.ctaFullW[1] / 2 : 0), y: cg.l2.y, immediateRender: false }, 1.45);
    tl.fromTo(MZ.els.cta2, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, 1.45);
    // un-park both typed lines (once): line 1 types, CSS delay hands off to line 2
    tl.call(() => { if (MZ.els.ctaType) MZ.els.ctaType(true); }, null, 1.35);

    tl.set(MZ.els.pill, { x: cg.pill.x, y: cg.pill.y, immediateRender: false }, 1.95);
    tl.fromTo(MZ.els.pill,
      { autoAlpha: 0, y: cg.pill.y + 30, scale: 0.92 },
      { y: cg.pill.y, scale: 1, autoAlpha: 1, duration: 0.7, ease: 'back.out(1.5)', immediateRender: false }, 1.95);

    tl.set(MZ.els.footLine, { x: S.vw / 2, y: cg.foot, immediateRender: false }, 2.15);
    tl.fromTo(MZ.els.footLine, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, immediateRender: false }, 2.15);
    return tl;
  }

  function getTrans(i) {
    if (!cache[i]) {
      cache[i] = (i <= 5) ? buildSvcAdvance(i)
        : i === 6 ? buildYitl()
        : i === 7 ? buildWipe()
        : i === 8 ? buildHeader()
        : i === 9 ? buildPlanIn()
        : i === 10 ? buildPlanDesign()
        : i === 11 ? buildEncap()
        : i === 12 ? buildExec()
        : i === 13 ? buildTester()
        : i === 14 ? buildPublish()
        : i === 15 ? buildLoop()
        : i === 16 ? buildWorksIn()
        : i === 17 ? buildWorksNext(1)
        : i === 18 ? buildWorksNext(2)
        : i === 19 ? buildWorksNext(3)
        : i === 20 ? buildTrustIn()
        : i === 21 ? buildPledge1()
        : i === 22 ? buildPledge2()
        : i === 23 ? buildPledge3()
        : i === 24 ? buildFaqQ1()
        : i >= 25 && i <= 29 ? buildFaqQk(i - 24)
        : buildFinale();
    }
    return cache[i];
  }

  return { buildIntro, getTrans };
})();
