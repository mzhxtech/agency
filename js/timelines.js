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

    // 3) the river pours in as one continuous band: banks, water, glints — then the little boat rides in
    [[MZ.els.dBank, -0.10], [MZ.els.dChan, 0.0], [MZ.els.dWater, 0.14]].forEach(([el, off]) => {
      tl.fromTo(el,
        { strokeDashoffset: 1, autoAlpha: 0 },
        { strokeDashoffset: 0, autoAlpha: 1, duration: 1.3, ease: 'power2.inOut', immediateRender: false },
        flyEnd + off);
    });
    tl.fromTo(MZ.els.dCrest, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.9, immediateRender: false }, flyEnd + 0.55);
    boatTo(tl, 0, 0.05, flyEnd + 0.75, 1.3, 'power1.inOut');      // boat peeks in from the top
    tl.fromTo(MZ.els.boat, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.8, immediateRender: false }, flyEnd + 0.85);

    // 4) first service: "Websites" drops from top, "Development" unveils word by word
    const sv0 = MZ.services[0];
    const m = MZ.midPos();
    tl.set(sv0.anchor, { x: m.x, y: m.y, autoAlpha: 1, immediateRender: false }, flyEnd + 0.45);
    tl.fromTo(sv0.words[0], { yPercent: -135 }, { yPercent: 0, duration: 0.8, ease: 'bounce.out', immediateRender: false }, flyEnd + 0.5);
    sv0.words.slice(1).forEach((w, j) => {
      tl.fromTo(w, { yPercent: 115 }, { yPercent: 0, duration: 0.6, ease: 'power4.out', immediateRender: false }, flyEnd + 1.35 + j * 0.14);
    });

    return tl;
  }

  /* ---------- boat travel along the river ---------- */
  const BOATP = [0.05, 0.164, 0.284, 0.403, 0.523, 0.642, 0.762, 0.881, 1.0];
  function boatTo(tl, pFrom, pTo, at, dur, ease) {
    tl.fromTo(MZ.boat,
      { p: pFrom },
      { p: pTo, duration: dur, ease: ease || 'power1.inOut', immediateRender: false, onUpdate: () => MZ.placeBoat() },
      at);
  }

  /* ---------- helper builders ---------- */

  // step i -> i+1 for services i in 0..5: middle goes to a top slot, next rises from bottom
  function buildSvcAdvance(i) {
    const S = MZ.S;
    const tl = gsap.timeline({ paused: true });
    const out = MZ.services[i];
    const inc = MZ.services[i + 1];
    const slots = MZ.topSlots(i + 1);
    const m = MZ.midPos();

    boatTo(tl, BOATP[i], BOATP[i + 1], 0, 1.35, 'power1.inOut');
    tl.to(out.anchor, { x: m.x, y: slots[i].y, fontSize: slots[i].font, opacity: 0.55, duration: 1.0, ease: 'power3.inOut' }, 0);
    for (let j = 0; j < i; j++) {
      tl.to(MZ.services[j].anchor, { y: slots[j].y, fontSize: slots[j].font, duration: 1.0, ease: 'power3.inOut' }, 0);
    }

    tl.fromTo(inc.anchor,
      { x: m.x, y: m.y + S.ph * 0.55, autoAlpha: 0 },
      { x: m.x, y: m.y, autoAlpha: 1, duration: 0.95, ease: 'power3.out', immediateRender: false }, 0.12);
    inc.words.forEach((w, j) => {
      tl.fromTo(w, { yPercent: 115 }, { yPercent: 0, duration: 0.6, ease: 'power4.out', immediateRender: false }, 0.55 + j * 0.11);
    });
    return tl;
  }

  // 6 -> 7: "Your Idea to Launch" punches in at the bottom
  function buildYitl() {
    const S = MZ.S;
    const tl = gsap.timeline({ paused: true });
    const m = MZ.midPos();
    const y = S.ph * 0.80;
    boatTo(tl, BOATP[6], BOATP[7], 0, 1.5, 'power1.inOut');
    tl.fromTo(MZ.els.yitl,
      { x: m.x, y: y - S.ph * 0.09, scale: 0.35, rotation: -8, autoAlpha: 0 },
      { x: m.x, y: y, scale: 1, rotation: 0, autoAlpha: 1, duration: 0.95, ease: 'elastic.out(1, 0.55)', immediateRender: false }, 0.05);
    tl.to(MZ.services[6].anchor, { opacity: 0.85, duration: 0.5, ease: 'power2.out' }, 0.1);
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
    tl.to(MZ.els.divider, { autoAlpha: 0, duration: 0.7, ease: 'power2.inOut' }, 0.15);
    tl.to(MZ.els.leftPanel, { autoAlpha: 0, duration: 0.9, ease: 'power2.inOut' }, 0.15);
    MZ.els.letters.forEach((el, i) => {
      tl.to(el, { x: hl.pos(i).x, y: hl.y, scale: hl.s, duration: 1.05, ease: 'power4.inOut' }, 0.08 + i * 0.045);
    });

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
    tl.fromTo(MZ.els.a1head,
      { autoAlpha: 0, scale: 0.2 },
      { autoAlpha: 1, scale: 1, duration: 0.3, ease: 'back.out(2)', immediateRender: false, svgOrigin: `${a1.tip.x} ${a1.tip.y}` }, 1.3);

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
    tl.fromTo(MZ.els.a2head,
      { autoAlpha: 0, scale: 0.2 },
      { autoAlpha: 1, scale: 1, duration: 0.32, ease: 'back.out(2)', immediateRender: false, svgOrigin: `${a2.tip.x} ${a2.tip.y}` }, 0.5);

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

  /* ---------- lazy cache ---------- */
  // 14 -> 15: tester contracts, flow fades, "Selected Works" + card 01 arrive
  function buildWorksIn() {
    const tl = gsap.timeline({ paused: true });
    const S = MZ.S;
    const wg = MZ.worksGeom();
    const tg = MZ.testerGeom();

    tl.to(MZ.els.tester, { width: tg.w0, height: tg.h0, autoAlpha: 0, duration: 0.6, ease: 'power2.in' }, 0);
    tl.to([MZ.els.plan, MZ.els.design, MZ.els.exec, MZ.els.encap, MZ.els.arrow2], { autoAlpha: 0, duration: 0.45 }, 0.05);
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

    // card 01 slides in, index number follows
    tl.fromTo(MZ.els.projs[0].el,
      { x: wg.cC.x + S.vw * 0.30, y: wg.cC.y + S.vh * 0.10, scale: 0.92, rotation: 2, autoAlpha: 0 },
      { x: wg.cC.x, y: wg.cC.y, scale: 1, rotation: 0, autoAlpha: 1, duration: 1.0, ease: 'power3.out', immediateRender: false }, 0.75);
    tl.fromTo(MZ.els.idxNums[0],
      { x: wg.nC.x + S.vw * 0.14, y: wg.nC.y, autoAlpha: 0 },
      { x: wg.nC.x, autoAlpha: 1, duration: 0.9, ease: 'power3.out', immediateRender: false }, 0.95);
    return tl;
  }

  // works step k -> k+1 (k = 1..2): card k-1 flies out left, card k in from right
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
    return tl;
  }

  // 17 -> 18: works exit, "By the numbers" — stats punch in with count-up
  function buildStatsIn() {
    const tl = gsap.timeline({ paused: true });
    const S = MZ.S;
    const wg = MZ.worksGeom();
    const sg = MZ.statsGeom();

    tl.to(MZ.els.projs[2].el,
      { x: wg.cC.x - S.vw * 0.72, rotation: -4, autoAlpha: 0, duration: 0.75, ease: 'power3.in' }, 0);
    tl.to(MZ.els.idxNums[2],
      { x: wg.nC.x + S.vw * 0.22, autoAlpha: 0, duration: 0.5, ease: 'power2.in' }, 0);
    MZ.els.worksWords.forEach((w, i) => {
      tl.to(w, { yPercent: -140, duration: 0.5, ease: 'power3.in' }, 0.1 + i * 0.05);
    });
    tl.to(MZ.els.worksTitle, { autoAlpha: 0, duration: 0.3 }, 0.5);

    tl.set(MZ.els.statOver, { x: sg.ol.x, y: sg.ol.y, immediateRender: false }, 0.4);
    tl.fromTo(MZ.els.statOver, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.6, immediateRender: false }, 0.4);

    MZ.els.stats.forEach((st, k) => {
      const at = 0.55 + k * 0.18;
      tl.set(st.el, { x: sg.xs[k], y: sg.y, immediateRender: false }, at);
      tl.fromTo(st.el, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.4, immediateRender: false }, at);
      tl.fromTo(st.wi, { yPercent: 130 }, { yPercent: 0, duration: 0.7, ease: 'power4.out', immediateRender: false }, at);
      const counter = { v: 0 };
      tl.fromTo(counter, { v: 0 },
        {
          v: MZ.data.stats[k].n, duration: 1.15, ease: 'power2.out', immediateRender: false,
          onUpdate: () => { st.n.textContent = String(Math.round(counter.v)); },
        }, at + 0.05);
      tl.fromTo(st.cap, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.5, immediateRender: false }, at + 0.42);
    });
    return tl;
  }

  // 18 -> 19: finale — MZHX reassembles center, CTA, contact pill, footer
  function buildFinale() {
    const tl = gsap.timeline({ paused: true });
    const S = MZ.S;
    const sg = MZ.statsGeom();
    const cg = MZ.ctaGeom();
    const fl = MZ.finaleLayout();

    MZ.els.stats.forEach((st, k) => {
      tl.to(st.el, { y: sg.y - S.vh * 0.09, autoAlpha: 0, duration: 0.55, ease: 'power2.in' }, 0 + k * 0.05);
    });
    tl.to(MZ.els.statOver, { autoAlpha: 0, duration: 0.4 }, 0.1);

    // hero letters fly from the header into the big centered wordmark
    MZ.els.letters.forEach((el, i) => {
      tl.to(el, { x: fl.pos(i).x, y: fl.y, scale: fl.s, duration: 1.05, ease: 'power4.inOut' }, 0.3 + i * 0.045);
    });

    tl.set(MZ.els.cta1, { x: cg.l1.x, y: cg.l1.y, immediateRender: false }, 1.15);
    tl.fromTo(MZ.els.cta1, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, 1.15);
    MZ.els.cta1Words.forEach((w, i) => {
      tl.fromTo(w, { yPercent: 120 }, { yPercent: 0, duration: 0.65, ease: 'power4.out', immediateRender: false }, 1.25 + i * 0.1);
    });
    tl.set(MZ.els.cta2, { x: cg.l2.x, y: cg.l2.y, immediateRender: false }, 1.5);
    tl.fromTo(MZ.els.cta2, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2, immediateRender: false }, 1.5);
    MZ.els.cta2Words.forEach((w, i) => {
      tl.fromTo(w, { yPercent: 120 }, { yPercent: 0, duration: 0.65, ease: 'power4.out', immediateRender: false }, 1.6 + i * 0.09);
    });

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
        : i === 14 ? buildWorksIn()
        : i === 15 ? buildWorksNext(1)
        : i === 16 ? buildWorksNext(2)
        : i === 17 ? buildStatsIn()
        : buildFinale();
    }
    return cache[i];
  }

  return { buildIntro, getTrans };
})();
