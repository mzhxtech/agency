/* MZHX — layout, geometry, element factory, color cycles */
window.MZ = (function () {
  'use strict';

  const S = {};            // live metrics
  const els = {};
  const services = [];     // per-service {anchor, inner, words[], midFont}
  const data = {
    services: [
      ['Websites', 'Development'],
      ['Mobile', 'App', 'Development'],
      ['Storefront', 'Development'],
      ['Themes', 'Customizations'],
      ['AI', 'Integrations'],
      ['SEO/AEO'],
      ['Custom', 'Software', 'Development'],
    ],
    oww: ['Our', 'way', 'of', 'work'],
  };
  const MAXSTEP = 14;      // resting steps after intro: intro=0 ... tester=13 end

  const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

  /* ---------------- DOM boot ---------------- */
  function buildDOM() {
    els.app        = document.querySelector('#app');
    els.leftPanel  = document.querySelector('#leftPanel');
    els.divider    = document.querySelector('#divider');
    els.rightPanel = document.querySelector('#rightPanel');
    els.logoBox    = document.querySelector('#logoBox');
    els.letters    = Array.from(document.querySelectorAll('#logoBox .hl'));
    els.swingX     = document.querySelector('#logoBox .swing');
    els.joint      = document.querySelector('#logoBox .joint');
    els.dBase      = document.querySelector('#dBase');
    els.dFlow      = document.querySelector('#dFlow');
    els.svcLayer   = document.querySelector('#svcLayer');
    els.grillWrap  = document.querySelector('#grillWrap');
    els.grill      = document.querySelector('#grill');
    els.fullLayer  = document.querySelector('#fullLayer');
    els.flowLayer  = document.querySelector('#flowLayer');
    els.flowGroup  = document.querySelector('#flowGroup');
    els.encap      = document.querySelector('#encap');
    els.arrow1     = document.querySelector('#arrow1');
    els.arrow2     = document.querySelector('#arrow2');
    els.plan       = document.querySelector('#planBox');
    els.design     = document.querySelector('#designBox');
    els.exec       = document.querySelector('#exec');
    els.tester     = document.querySelector('#testerBox');
    els.ows        = document.querySelector('#ows');
    els.owsInner   = document.querySelector('#owsText');
    els.hint       = document.querySelector('#scrollHint');

    // re-parent: logo + full-width section layer live at viewport scope
    els.app.appendChild(els.logoBox);          // out of leftPanel -> whole viewport
    els.fullLayer.appendChild(els.ows);        // justifyCenter on full width
    els.fullLayer.appendChild(els.flowLayer);
    els.app.appendChild(els.fullLayer);        // out of rightPanel -> whole viewport

    const NS = 'http://www.w3.org/2000/svg';

    // services
    data.services.forEach((words) => {
      const anchor = document.createElement('div');
      anchor.className = 'svc posbase';
      const inner = document.createElement('span');
      inner.className = 'bcenter';
      words.forEach((t, j) => {
        if (j) inner.appendChild(document.createTextNode(' '));
        const w = document.createElement('span'); w.className = 'w';
        const wi = document.createElement('span'); wi.className = 'wi';
        wi.textContent = t;
        w.appendChild(wi);
        inner.appendChild(w);
      });
      anchor.appendChild(inner);
      els.svcLayer.appendChild(anchor);
      services.push({ anchor, inner, words: Array.from(inner.querySelectorAll('.wi')), midFont: 40 });
    });

    // "Your Idea to Launch" letter spans
    els.yitl = document.createElement('div');
    els.yitl.className = 'posbase';
    els.yitl.id = 'yitl';
    const yInner = document.createElement('span');
    yInner.className = 'bcenter';
    'Your Idea to Launch'.split('').forEach((ch) => {
      if (ch === ' ') yInner.appendChild(document.createTextNode(' '));
      else {
        const l = document.createElement('span');
        l.className = 'yl'; l.textContent = ch;
        yInner.appendChild(l);
      }
    });
    els.yitl.appendChild(yInner);
    els.yitlInner = yInner;
    els.svcLayer.appendChild(els.yitl);

    // "Our way of work" masked words
    data.oww.forEach((t, j) => {
      if (j) els.owsInner.appendChild(document.createTextNode(' '));
      const w = document.createElement('span'); w.className = 'w';
      const wi = document.createElement('span'); wi.className = 'wi';
      wi.textContent = t;
      w.appendChild(wi);
      els.owsInner.appendChild(w);
    });
    els.owsWords = Array.from(els.owsInner.querySelectorAll('.wi'));

    // box labels
    els.planLbl   = els.plan.querySelector('.bli');
    els.designLbl = els.design.querySelector('.bli');
    els.execLbl   = els.exec.querySelector('.bli');
    els.testerLbl = els.tester.querySelector('.bli');
    els.testerBl  = els.tester.querySelector('.bl');

    // arrows: shaft + head paths
    [els.arrow1, els.arrow2].forEach((svg) => {
      svg.innerHTML = '';
      const shaft = document.createElementNS(NS, 'path'); shaft.setAttribute('class', 'shaft');
      const head = document.createElementNS(NS, 'path'); head.setAttribute('class', 'head');
      svg.appendChild(shaft); svg.appendChild(head);
      if (svg === els.arrow1) { els.a1shaft = shaft; els.a1head = head; }
      else { els.a2shaft = shaft; els.a2head = head; }
    });
  }

  /* ---------------- metrics ---------------- */
  function metrics() {
    const lr = els.leftPanel.getBoundingClientRect();
    const pr = els.rightPanel.getBoundingClientRect();
    S.lw = lr.width; S.lh = lr.height;
    S.pw = pr.width; S.ph = pr.height;
    S.vw = window.innerWidth; S.vh = window.innerHeight;
  }

  /* fit a nowrap text element to width (2 passes), returns font px */
  function fitText(el, base, maxW) {
    const max = maxW;
    let f = base;
    for (let i = 0; i < 2; i++) {
      el.style.fontSize = f + 'px';
      const w = el.offsetWidth;
      if (w > max) f = f * (max / w);
    }
    el.style.fontSize = f + 'px';
    return f;
  }

  /* recompute fitted fonts (boot + resize) */
  function fitAll() {
    const midBase = Math.min(S.pw * 0.088, S.ph * 0.115);
    services.forEach((sv) => { sv.midFont = fitText(sv.inner, midBase, S.pw * 0.84); });
    els.yitlFont = fitText(els.yitlInner, Math.min(S.pw * 0.075, S.ph * 0.092), S.pw * 0.86);
    els.grillFont = fitText(els.grill, Math.min(S.pw * 0.098, S.ph * 0.125), S.pw * 0.86);
    els.owsFont = fitText(els.owsInner, Math.min(S.vw * 0.058, S.vh * 0.115), S.vw * 0.9);
  }

  /* ---------------- hero letters (viewport scope) ---------------- */
  function measureLetters() {
    els.letterW = els.letters.map((el) => el.querySelector('.self').offsetWidth);
    els.letterFs = parseFloat(getComputedStyle(els.letters[0].querySelector('.self')).fontSize);
    els.letterGap = els.letterFs * 0.10;
    els.wordSpan = els.letterW.reduce((a, b) => a + b, 0) + els.letterGap * 3;
  }

  /* stacked intro: letters centered in the viewport, filling full height */
  function stackedPos(i) {
    return { x: S.vw * 0.5, y: S.vh * (0.125 + 0.25 * i), s: 1 };
  }

  function compactLayout() {
    const s = clamp((S.vw * 0.155) / els.wordSpan, 0.08, 0.55);
    const startX = S.vw * 0.045;
    const y = S.lh * 0.5;
    return {
      s, y,
      pos(i) {
        let cum = 0;
        for (let j = 0; j < i; j++) cum += els.letterW[j] + els.letterGap;
        return { x: startX + s * (cum + els.letterW[i] / 2) };
      },
    };
  }

  function headerLayout() {
    const s = clamp((S.vw * 0.115) / els.wordSpan, 0.05, 0.4);
    const startX = S.vw * 0.045;
    const y = S.vh * 0.075;
    return {
      s, y,
      pos(i) {
        let cum = 0;
        for (let j = 0; j < i; j++) cum += els.letterW[j] + els.letterGap;
        return { x: startX + s * (cum + els.letterW[i] / 2) };
      },
    };
  }

  /* ---------------- right stage geometry (services stay panel-based) ---------------- */
  function topSlots(n) {
    const yTop = S.ph * 0.075;
    const area = S.ph * 0.27;
    const slotH = area / n;
    const font = Math.min(slotH * 0.62, S.pw * 0.036);
    return Array.from({ length: n }, (_, i) => ({ y: yTop + slotH * (i + 0.5), font }));
  }

  const midPos = () => ({ x: S.pw * 0.5, y: S.ph * 0.52 });

  /* ---------------- flow geometry (full-width viewport scope) ---------------- */
  const boxS = () => Math.min(S.vw * 0.125, S.vh * 0.165);
  const planP = () => ({ x: S.vw * 0.5, y: S.vh * 0.55 });
  const p1 = () => ({ x: S.vw * 0.30, y: S.vh * 0.55 });
  const p2 = () => ({ x: S.vw * 0.70, y: S.vh * 0.55 });

  /* encap wraps plan+design+arrow at scale 1 */
  function encapBounds() {
    const s = boxS(), a = p1(), b = p2();
    const padX = s * 0.10, padY = s * 0.12;
    const x = a.x - s / 2 - padX;
    const y = a.y - s / 2 - padY;
    const w = (b.x + s / 2 + padX) - x;
    const h = (b.y + s / 2 + padY) - y;
    return { x, y, w, h };
  }

  /* group compression (step >= 12 resting) */
  function groupGeom() {
    const B = encapBounds();
    const G = 0.62;
    const cx0 = B.x + B.w / 2, cy0 = B.y + B.h / 2;
    const tx = S.vw * 0.20 - G * cx0;
    const ty = S.vh * 0.27 - G * cy0;
    return { G, tx, ty, cx0, cy0 };
  }
  function groupPt(x, y) {          // viewport point after group transform
    const g = groupGeom();
    return { x: g.tx + g.G * x, y: g.ty + g.G * y };
  }

  /* execution circle */
  function execGeom() {
    const C = { x: S.vw * 0.60, y: S.vh * 0.62 };
    const R = Math.min(S.vw * 0.105, S.vh * 0.23);
    return { C, R };
  }

  /* testing: one big rectangle that grows to enclose plan+design+execution.
     start = small box about the composition's center -> grows to the union bounds */
  function testerGeom() {
    const s = boxS();
    const g = groupGeom();
    const B = encapBounds();
    const gw = B.w * g.G, gh = B.h * g.G;      // compressed cluster bounds
    const gx = g.tx + g.G * B.x, gy = g.ty + g.G * B.y;   // on-screen top-left of the cluster
    const { C, R } = execGeom();
    const pad = s * 0.18;
    const x1 = Math.min(gx, C.x - R) - pad;
    const y1 = Math.min(gy, C.y - R) - pad;
    const x2 = Math.max(gx + gw, C.x + R) + pad;
    const y2 = Math.max(gy + gh, C.y + R) + pad;
    return {
      center: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
      wF: x2 - x1, hF: y2 - y1,
      w0: s * 0.42, h0: s * 0.42,
      label: Math.min(x2 - x1, y2 - y1) * 0.105,
    };
  }

  /* ows anchors (viewport scope) */
  const owsCenter = () => ({ x: S.vw * 0.5, y: S.vh * 0.5 });
  const owsTop = () => ({ x: S.vw * 0.5, y: S.vh * 0.115 });

  /* ---------------- arrows ---------------- */
  function placeArrow(svg, shaft, head, x1, y1, x2, y2, bow, tip) {
    const dx = x2 - x1, dy = y2 - y1;
    const L = Math.hypot(dx, dy);
    const ux = dx / L, uy = dy / L;
    const px = -uy, py = ux;           // normal
    const cx = (x1 + x2) / 2 + px * bow, cy = (y1 + y2) / 2 + py * bow;
    const txx = x2 - cx, tyy = y2 - cy;
    const tl = Math.hypot(txx, tyy) || 1;
    const tx2 = txx / tl, ty2 = tyy / tl;
    const tipLen = tip;
    const wing = tipLen * 0.52;
    const w1x = x2 - tx2 * tipLen + px * wing, w1y = y2 - ty2 * tipLen + py * wing;
    const w2x = x2 - tx2 * tipLen - px * wing, w2y = y2 - ty2 * tipLen - py * wing;
    const ox = Math.min(x1, x2, w1x, w2x) - 24;
    const oy = Math.min(y1, y2, w1y, w2y) - 24;
    const W = Math.max(x1, x2, w1x, w2x) - ox + 24;
    const H = Math.max(y1, y2, w1y, w2y) - oy + 24;
    svg.setAttribute('viewBox', `0 0 ${W} ${H}`);
    svg.setAttribute('width', W); svg.setAttribute('height', H);
    gsap.set(svg, { x: ox, y: oy, autoAlpha: 0 });
    // shaft stops just under the head so the tip is the exact end of the line
    const pull = 2.2;
    const sx2 = x2 - tx2 * pull, sy2 = y2 - ty2 * pull;
    shaft.setAttribute('d', `M ${x1 - ox} ${y1 - oy} Q ${cx - ox} ${cy - oy} ${sx2 - ox} ${sy2 - oy}`);
    head.setAttribute('d',
      `M ${x2 - ox} ${y2 - oy} L ${w1x - ox} ${w1y - oy} L ${w2x - ox} ${w2y - oy} Z`);
    const len = shaft.getTotalLength();
    shaft.style.strokeDasharray = len + ' ' + len;
    shaft.style.strokeDashoffset = len;
    return { len, tip: { x: x2 - ox, y: y2 - oy } };
  }

  function arrow1Geom() {
    const s = boxS(), a = p1(), b = p2();
    const x1 = a.x + s / 2, x2 = b.x - s / 2;   // exactly on Plan's edge / Design's edge
    return placeArrow(els.arrow1, els.a1shaft, els.a1head, x1, a.y, x2, b.y, 0, Math.max(14, s * 0.11));
  }
  function arrow2Geom() {
    const s = boxS(), d = p2();
    const de = groupPt(d.x + s / 2, d.y);        // design box edge after compression (exact)
    const { C, R } = execGeom();
    const vx = de.x - C.x, vy = de.y - C.y;
    const vl = Math.hypot(vx, vy) || 1;
    const ex = C.x + (vx / vl) * R, ey = C.y + (vy / vl) * R;   // exactly on the circle
    return placeArrow(els.arrow2, els.a2shaft, els.a2head, de.x, de.y, ex, ey, 46, Math.max(14, s * 0.11));
  }

  /* ---------------- static prep (boot / resize, no animation) ---------------- */
  function prepStatic() {
    const s = boxS(), sg = execGeom(), tg = testerGeom();
    [els.plan, els.design].forEach((b) => {
      b.style.width = s + 'px'; b.style.height = s + 'px';
      gsap.set(b, { xPercent: -50, yPercent: -50 });
    });
    els.planLbl.style.fontSize = s * 0.185 + 'px';
    els.designLbl.style.fontSize = s * 0.185 + 'px';
    els.testerLbl.style.fontSize = tg.label + 'px';
    els.execLbl.style.fontSize = sg.R * 0.28 + 'px';
    els.exec.style.width = (2 * sg.R) + 'px';
    els.exec.style.height = (2 * sg.R) + 'px';
    gsap.set(els.exec, { xPercent: -50, yPercent: -50 });
    gsap.set(els.tester, {
      xPercent: -50, yPercent: -50,
      x: tg.center.x, y: tg.center.y,
      width: tg.w0, height: tg.h0, autoAlpha: 0,
    });
    // label centered in the free band under the compressed cluster
    const cg = groupGeom(), cB = encapBounds();
    const cCx = cg.tx + cg.G * (cB.x + cB.w / 2);
    const cBottom = cg.ty + cg.G * (cB.y + cB.h);
    const rx1 = tg.center.x - tg.wF / 2, ry1 = tg.center.y - tg.hF / 2, ry2 = tg.center.y + tg.hF / 2;
    els.testerBl.style.left = clamp((cCx - rx1) / tg.wF * 100, 10, 90).toFixed(2) + '%';
    els.testerBl.style.top = clamp(((cBottom + ry2) / 2 - ry1) / tg.hF * 100, 30, 86).toFixed(2) + '%';
    gsap.set([els.grillWrap, els.ows], { autoAlpha: 0 });
    gsap.set([els.plan, els.design, els.exec, els.tester], { autoAlpha: 0 });
    gsap.set(els.flowGroup, { x: 0, y: 0, scale: 1 });
    arrow1Geom();
    arrow2Geom();
  }

  /* letters resting setters (resize-safe) */
  function setLetters(mode) {   // 'compact' | 'header' | 'stacked'
    if (mode === 'stacked') {
      els.letters.forEach((el, i) => {
        const p = stackedPos(i);
        gsap.set(el, { x: p.x, y: p.y, scale: 1 });
      });
      return;
    }
    const lay = mode === 'header' ? headerLayout() : compactLayout();
    els.letters.forEach((el, i) => {
      const p = lay.pos(i);
      gsap.set(el, { x: p.x, y: lay.y, scale: lay.s });
    });
  }

  /* services resting layout for step t (0..7); t>=8 => fully hidden */
  function setServiceResting(t) {
    const visible = t >= 0 && t <= 7;
    gsap.set(els.svcLayer, {
      autoAlpha: visible ? 1 : 0,
      clipPath: visible ? 'circle(140% at 50% 52%)' : 'circle(0% at 50% 52%)',
      scale: visible ? 1 : 0.4,
    });
    if (!visible) return;
    const topCount = t === 7 ? 7 : t;
    const slots = topSlots(Math.max(1, topCount));
    const m = midPos();
    for (let i = 0; i < topCount; i++) {
      gsap.set(services[i].anchor, { x: m.x, y: slots[i].y, fontSize: slots[i].font, autoAlpha: 1 });
    }
    if (t <= 6) {
      gsap.set(services[t].anchor, { x: m.x, y: m.y, fontSize: services[t].midFont, autoAlpha: 1 });
    }
    if (t === 7) {
      gsap.set(els.yitl, { x: m.x, y: S.ph * 0.80, scale: 1, rotation: 0, autoAlpha: 1 });
    } else {
      gsap.set(els.yitl, { autoAlpha: 0, scale: 0.35, y: S.ph * 0.71 });
    }
    for (let i = Math.max(topCount, t <= 6 ? t + 1 : 7); i < services.length; i++) {
      gsap.set(services[i].anchor, { autoAlpha: 0, y: S.ph });
    }
  }

  /* color cycle factory */
  function makeLetterCycle(spans, ms) {
    let k = 0, id = null;
    const light = (i) => spans.forEach((sp, j) => sp.classList.toggle('lit', j === i));
    return {
      spans,
      start() { if (id) return; light(0); id = setInterval(() => { k = (k + 1) % spans.length; light(k); }, ms); },
      stop() { if (!id) return; clearInterval(id); id = null; spans.forEach((sp) => sp.classList.remove('lit')); },
      get running() { return !!id; },
    };
  }

  return {
    S, els, services, data, MAXSTEP,
    buildDOM, metrics, fitAll, measureLetters, prepStatic,
    stackedPos, compactLayout, headerLayout,
    topSlots, midPos, boxS, planP, p1, p2,
    encapBounds, groupGeom, groupPt, execGeom, testerGeom,
    owsCenter, owsTop, arrow1Geom, arrow2Geom,
    setLetters, setServiceResting,
    makeLetterCycle, fitText, clamp,
  };
})();
