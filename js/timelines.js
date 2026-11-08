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

    // 3) curvy divider draws itself (gradient animated by CSS/SMIL, flowing shimmer loops)
    tl.fromTo(MZ.els.dBase,
      { strokeDashoffset: 1, autoAlpha: 0 },
      { strokeDashoffset: 0, autoAlpha: 1, duration: 1.3, ease: 'power2.inOut', immediateRender: false },
      flyEnd - 0.25);
    tl.fromTo(MZ.els.dFlow, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.7, immediateRender: false }, flyEnd + 0.85);

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

  /* ---------- helper builders ---------- */

  // step i -> i+1 for services i in 0..5: middle goes to a top slot, next rises from bottom
  function buildSvcAdvance(i) {
    const S = MZ.S;
    const tl = gsap.timeline({ paused: true });
    const out = MZ.services[i];
    const inc = MZ.services[i + 1];
    const slots = MZ.topSlots(i + 1);
    const m = MZ.midPos();

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
        : buildTester();
    }
    return cache[i];
  }

  return { buildIntro, getTrans };
})();
