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
    works: ['Selected', 'Works'],
    projects: [
      { name: 'Recall', tag: 'Your memory, encrypted', tags: 'Product · Encryption · Cross-platform', g: 'g1', init: 'R' },
      { name: 'WhyBoard', tag: 'The AI storyteller for your data', tags: 'SaaS · AI · Analytics · SQL trail', g: 'g2', init: 'W' },
      { name: 'RideShare', tag: 'Share the ride, split the fare', tags: 'Mobile · Maps · Ride sharing', g: 'g3', init: 'R' },
      { name: 'Planisher', tag: 'Calm construction planning workspace', tags: 'Web app · Scheduling · Cost control', g: 'g4', init: 'P' },
    ],
    cta1: ['Book', 'a', 'free', '30', 'minute', 'scoping', 'call,'],
    cta2: ['or', 'get', 'a', 'free', 'audit', 'of', 'your', 'current', 'site.'],
    pledges: [
      { txt: 'Direct access to the developer' },
      { txt: 'Weekly demos' },
      { txt: 'Transparency' },
    ],
    faqs: [
      { q: 'How much does a website cost?', a: "It depends on scope. A simple business website with 5 to 8 pages costs less than a booking system, dashboard, or e-commerce store. After a free scoping call, we give you a fixed quote so there are no surprises later." },
      { q: 'How long will it take?', a: 'A simple business website takes 1 to 2 weeks. A website with booking, payments, or a custom dashboard takes 3 to 6 weeks. An MVP with AI features or user accounts usually takes 4 to 8 weeks. We share a timeline before we start and show you a demo every week.' },
      { q: 'Do you have previous client work to show?', a: 'We started our company after years of building products inside other teams, so most of our early work was internal. We have published full case studies of that work and built live concept projects you can try. On a call, we walk you through the code, decisions, and demos.' },
      { q: 'Will I own my website and code?', a: 'Yes, 100 percent. After final payment, you own the code, design, domain, and content. We also give you a handover document with logins and how to update it.' },
      { q: 'What is your process?', a: '1. Scoping call to understand your goal. 2. We share a proposal with features, timeline, and price. 3. Design and development with weekly demos. 4. Testing, revisions, and launch. 5. Handover and support. You talk directly to the developer building your project.' },
      { q: 'What do you need from me to start?', a: 'Just your business name, what you want the website to do, and any examples you like. If you do not have content, logo, or images yet, we help you with that too. We handle the rest from the scoping call to launch.' },
    ],
    foot: '© MZHX Studio — slow-grilled w/ intent · Dribbble · GitHub · X',
  };
  const MAXSTEP = 31;      // resting steps: 0..7 services, 8 grill, 9 ows, 10..16 flow (15 publish, 16 feedback loop), 17..20 works (4 projects), 21 trust, 22..24 pledge rows (one per scroll), 25..30 FAQ accordion (one question per scroll), 31 finale/CTA

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
    els.dPath      = document.querySelector('#dPath');
    els.riverCanvas = document.querySelector('#riverCanvas');
    els.boat       = document.querySelector('#riverBoat');
    els.svcLayer   = document.querySelector('#svcLayer');
    els.grillWrap  = document.querySelector('#grillWrap');
    els.grill      = document.querySelector('#grill');
    els.fullLayer  = document.querySelector('#fullLayer');
    els.flowLayer  = document.querySelector('#flowLayer');
    els.flowGroup  = document.querySelector('#flowGroup');
    els.encap      = document.querySelector('#encap');
    els.arrow1     = document.querySelector('#arrow1');
    els.arrow2     = document.querySelector('#arrow2');
    els.arrow3     = document.querySelector('#arrow3');
    els.arrow4     = document.querySelector('#arrow4');
    els.arrow5     = document.querySelector('#arrow5');
    els.arrow6     = document.querySelector('#arrow6');
    els.plan       = document.querySelector('#planBox');
    els.design     = document.querySelector('#designBox');
    els.exec       = document.querySelector('#exec');
    els.tester     = document.querySelector('#testerBox');
    els.publish    = document.querySelector('#publishBox');
    els.fbGroup    = document.querySelector('#fbGroup');
    els.impBox     = document.querySelector('#improveBox');
    els.ows        = document.querySelector('#ows');
    els.owsInner   = document.querySelector('#owsText');
    els.nextLayer  = document.querySelector('#nextLayer');
    els.hint       = document.querySelector('#scrollHint');

    // re-parent: logo + full-width section layer live at viewport scope
    els.app.appendChild(els.logoBox);          // out of leftPanel -> whole viewport
    els.fullLayer.appendChild(els.ows);        // justifyCenter on full width
    els.fullLayer.appendChild(els.flowLayer);
    els.fullLayer.appendChild(els.nextLayer);  // works / trust / pledges / faqs / CTA finale
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
      services.push({ anchor, inner, words: Array.from(inner.querySelectorAll('.wi')), font: 40 });
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

    // ---------- works section ----------
    els.worksTitle = document.createElement('div');
    els.worksTitle.className = 'posbase';
    els.worksTitle.id = 'worksTitle';
    const wtC = document.createElement('span');
    wtC.className = 'bcenter';
    els.worksText = document.createElement('h2');
    els.worksText.id = 'worksText';
    data.works.forEach((t) => {
      const w = document.createElement('span'); w.className = 'w';
      const wi = document.createElement('span'); wi.className = 'wi';
      wi.textContent = t;
      w.appendChild(wi);
      els.worksText.appendChild(w);
    });
    wtC.appendChild(els.worksText);
    els.worksTitle.appendChild(wtC);
    els.nextLayer.appendChild(els.worksTitle);
    els.worksWords = Array.from(els.worksText.querySelectorAll('.wi'));

    // project cards
    els.projs = [];
    data.projects.forEach((p) => {
      const el = document.createElement('div');
      el.className = 'proj';
      el.innerHTML =
        '<div class="mock"><div class="tb"><i></i><i></i><i></i></div>' +
        `<div class="canvas ${p.g}"><span class="brick b1"></span><span class="brick b2"></span>` +
        '<span class="brick b3"></span><span class="brick b4"></span><span class="brick b5"></span>' +
        '<span class="wm"></span></div></div>' +
        '<div class="cap"><strong></strong><em></em><div class="tags"></div></div>';
      el.querySelector('strong').textContent = p.name;
      el.querySelector('em').textContent = p.tag;
      el.querySelector('.tags').textContent = p.tags;
      el.querySelector('.wm').textContent = p.init;
      els.nextLayer.appendChild(el);
      els.projs.push({ el, wm: el.querySelector('.wm') });
    });

    // giant index numbers
    els.idxNums = ['01', '02', '03', '04'].map((t) => {
      const d = document.createElement('div');
      d.className = 'posbase idxn';
      const c = document.createElement('span'); c.className = 'bcenter'; c.textContent = t;
      d.appendChild(c);
      els.nextLayer.appendChild(d);
      return d;
    });

    // ---------- TRUST THE PROCESS ----------
    const mkTrust = (id, txt, cls) => {
      const a = document.createElement('div');
      a.className = 'posbase'; a.id = id;
      const c = document.createElement('span'); c.className = 'bcenter';
      const h = document.createElement('h2'); h.className = cls; h.textContent = txt;
      c.appendChild(h); a.appendChild(c);
      els.nextLayer.appendChild(a);
      return { a, h };
    };
    const tw1 = mkTrust('trust1', 'TRUST', 'trustW');
    const tw2 = mkTrust('trust2', 'THE', 'trustW');
    const tw3 = mkTrust('trust3', 'PROCESS', 'trustW');
    els.trust1 = tw1.a; els.trust2 = tw2.a; els.trust3 = tw3.a;
    els.trust1Inner = tw1.h; els.trust2Inner = tw2.h; els.trust3Inner = tw3.h;
    els.trustEls = [els.trust1, els.trust2, els.trust3];
    els.trustInners = [els.trust1Inner, els.trust2Inner, els.trust3Inner];

    // ---------- pledge blocks: borderless text rows stacked vertically ----------
    // hooks per row for the entrance effects: row 1 = scramble (plain text,
    // rewritten per frame), rows 2/3 = char spans for the reveal wave, row 3
    // also gets a 3x5 dot grid for the stagger-grid pulse
    const splitChars = (host, txt) => {
      host.textContent = '';
      const out = [];
      for (const ch of txt) {
        const sp = document.createElement('span');
        sp.style.display = 'inline-block';
        sp.style.whiteSpace = 'pre';
        sp.textContent = ch;
        host.appendChild(sp);
        out.push(sp);
      }
      return out;
    };
    const splitWordChars = (host, txt) => {  // words stay whole so the paragraph wraps normally
      host.textContent = '';
      const out = [];
      const words = txt.split(/ +/);
      words.forEach((w, wi) => {
        if (wi) host.appendChild(document.createTextNode(' '));
        const wsp = document.createElement('span');
        wsp.style.display = 'inline-block';
        wsp.style.whiteSpace = 'nowrap';
        for (const ch of w) {
          const sp = document.createElement('span');
          sp.style.display = 'inline-block';
          sp.textContent = ch;
          wsp.appendChild(sp);
          out.push(sp);
        }
        host.appendChild(wsp);
      });
      return out;
    };
    els.pledges = data.pledges.map((t, i) => {
      const a = document.createElement('div');
      a.className = 'posbase'; a.id = 'pledge' + (i + 1);
      const c = document.createElement('span');
      c.className = 'pledge bcenter';
      const lbl = document.createElement('span'); lbl.className = 'pbl';
      if (i === 0) {                              // row 1 gets the stagger-grid pulse: chars in a 2x15 tile grid
        lbl.classList.add('pgrid');
        lbl.style.gridTemplateColumns = 'repeat(15, auto)';
      }
      lbl.textContent = t.txt;
      c.appendChild(lbl);
      let desc = null;
      if (t.desc) {
        desc = document.createElement('span'); desc.className = 'pbd';
        desc.textContent = t.desc;
        c.appendChild(desc);
      }
      let charsLbl = null, charsDesc = null;
      if (i <= 1) charsLbl = splitChars(lbl, t.txt);   // rows 1 (grid) + 2 (wave); row 3 stays plain for the scramble
      if (desc) charsDesc = splitWordChars(desc, t.desc);
      a.appendChild(c);
      els.nextLayer.appendChild(a);
      return { el: a, box: c, lbl, desc, finalTxt: t.txt, charsLbl, charsDesc };
    });

    // ---------- FAQ accordion: caption + stacked question rows; each question
    // appears on its own scroll, hover expands its answer ----------
    els.faqCap = document.createElement('div');
    els.faqCap.className = 'posbase'; els.faqCap.id = 'faqCap';
    const fCap = document.createElement('span'); fCap.className = 'bcenter';
    const fCapS = document.createElement('span'); fCapS.textContent = 'FAQs';
    fCap.appendChild(fCapS); els.faqCap.appendChild(fCap);
    els.nextLayer.appendChild(els.faqCap);

    els.faqList = document.createElement('div');
    els.faqList.className = 'faqList';
    els.nextLayer.appendChild(els.faqList);

    els.faqs = data.faqs.map((f, i) => {
      const row = document.createElement('div');
      row.className = 'faqQ';
      const num = document.createElement('span'); num.className = 'fnum';
      num.textContent = (i < 9 ? '0' : '') + (i + 1);
      const qEl = document.createElement('h4'); qEl.className = 'fqq';
      qEl.textContent = f.q;
      const plus = document.createElement('span'); plus.className = 'fplus';
      plus.innerHTML = '<i></i><i></i>';
      const ansWrap = document.createElement('div'); ansWrap.className = 'fan';
      const ansP = document.createElement('p'); ansP.textContent = f.a;
      ansWrap.appendChild(ansP);
      row.appendChild(num); row.appendChild(qEl); row.appendChild(plus); row.appendChild(ansWrap);
      els.faqList.appendChild(row);
      return { el: row, num, qEl, ansWrap, plus, ansP };
    });

    // ---------- FAQ accordion: hover a row and the answer expands beneath it —
    // no click needed; leaving the row collapses it again after a short grace
    // (touch taps also expand). New questions rising in close any open one. ----------
    let faqOpen = null;
    let closeTimer = null;
    const cancelClose = () => { if (closeTimer) { clearTimeout(closeTimer); closeTimer = null; } };
    const closeFaq = (q) => {
      if (!q) return;
      gsap.to(q.ansWrap, { height: 0, autoAlpha: 0, duration: 0.42, ease: 'power3.inOut', overwrite: 'auto' });
      gsap.to(q.plus, { rotation: 0, duration: 0.36, ease: 'power3.inOut', overwrite: 'auto' });
    };
    const openFaq = (q) => {
      gsap.to(q.ansWrap, { height: 'auto', autoAlpha: 1, duration: 0.5, ease: 'power3.inOut', overwrite: 'auto' });
      gsap.to(q.plus, { rotation: 135, duration: 0.42, ease: 'power3.inOut', overwrite: 'auto' });
    };
    const activate = (q) => {
      cancelClose();
      if (q === faqOpen) return;
      if (faqOpen) closeFaq(faqOpen);
      openFaq(q);
      faqOpen = q;
    };
    els.faqs.forEach((q) => {
      q.el.addEventListener('mouseenter', () => activate(q));
      q.el.addEventListener('click', () => activate(q));   // touch fallback
      q.el.addEventListener('mouseleave', () => {
        if (faqOpen !== q) return;
        cancelClose();
        closeTimer = setTimeout(() => { if (faqOpen === q) { closeFaq(q); faqOpen = null; } closeTimer = null; }, 160);
      });
    });
    els.faqCollapseAll = () => { cancelClose(); if (faqOpen) { closeFaq(faqOpen); faqOpen = null; } };

    // ---------- finale ----------
    const buildCta = (id, words) => {
      const a = document.createElement('div');
      a.className = 'posbase'; a.id = id;
      const c = document.createElement('span'); c.className = 'bcenter';
      const h = document.createElement('h2'); h.id = id + 'Text';
      words.forEach((t) => {
        const w = document.createElement('span'); w.className = 'w';
        const wi = document.createElement('span'); wi.className = 'wi';
        wi.textContent = t;
        w.appendChild(wi); h.appendChild(w);
      });
      c.appendChild(h); a.appendChild(c);
      els.nextLayer.appendChild(a);
      return { a, h };
    };
    const c1 = buildCta('cta1', data.cta1);
    const c2 = buildCta('cta2', data.cta2);
    els.cta1 = c1.a; els.cta1Inner = c1.h;
    els.cta2 = c2.a; els.cta2Inner = c2.h;
    els.cta1Words = Array.from(els.cta1Inner.querySelectorAll('.wi'));
    els.cta2Words = Array.from(els.cta2Inner.querySelectorAll('.wi'));

    els.pill = document.createElement('div');
    els.pill.className = 'posbase'; els.pill.id = 'mailPill';
    const pC = document.createElement('span'); pC.className = 'bcenter';
    const pS = document.createElement('span'); pS.textContent = 'hello@mzhx.studio';
    pC.appendChild(pS); els.pill.appendChild(pC);
    els.nextLayer.appendChild(els.pill);

    els.footLine = document.createElement('div');
    els.footLine.className = 'posbase'; els.footLine.id = 'footLine';
    const fC = document.createElement('span'); fC.className = 'bcenter';
    const fS = document.createElement('span'); fS.textContent = data.foot;
    fC.appendChild(fS); els.footLine.appendChild(fC);
    els.nextLayer.appendChild(els.footLine);

    // box labels
    els.planLbl   = els.plan.querySelector('.bli');
    els.designLbl = els.design.querySelector('.bli');
    els.execLbl   = els.exec.querySelector('.bli');
    els.testerLbl = els.tester.querySelector('.bli');
    els.testerBl  = els.tester.querySelector('.bl');
    els.pubLbl    = els.publish.querySelector('.bli');
    els.pubBars   = Array.from(els.publish.querySelectorAll('.pile i'));
    els.impLbl    = els.impBox.querySelector('.bli');
    els.fbLbl     = els.fbGroup.querySelector('.bli');
    els.users     = Array.from(els.fbGroup.querySelectorAll('.users i'));

    // arrows: shaft + head paths
    const aNames = ['a1', 'a2', 'a3', 'a4', 'a5', 'a6'];
    [els.arrow1, els.arrow2, els.arrow3, els.arrow4, els.arrow5, els.arrow6].forEach((svg, i) => {
      svg.innerHTML = '';
      const shaft = document.createElementNS(NS, 'path'); shaft.setAttribute('class', 'shaft');
      const head = document.createElementNS(NS, 'path'); head.setAttribute('class', 'head');
      svg.appendChild(shaft); svg.appendChild(head);
      els[aNames[i] + 'shaft'] = shaft;
      els[aNames[i] + 'head'] = head;
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
    // right-column stack rows (7 services + YITL): equal spacing, width-fitted
    const sg = svcStackGeom();
    const baseF = sg.gap * 0.52;
    services.forEach((sv) => { sv.font = fitText(sv.inner, baseF, sg.colW * 0.92); });
    els.yitlFont = fitText(els.yitlInner, baseF, sg.colW * 0.92);
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
    const s = clamp((S.vw * 0.40) / els.wordSpan, 0.08, 1.0);
    const startX = S.vw * 0.02;
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
    const s = clamp((S.vw * 0.15) / els.wordSpan, 0.05, 0.4);
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

  /* ---------------- right stage geometry ---------------- */
  const midPos = () => ({ x: S.pw * 0.5, y: S.ph * 0.52 });

  /* right-column stack: 7 service rows + YITL fill the panel height with
     equal spacing — the column sits right of the river and uses its full width */
  function svcStackGeom() {
    const N = 8;                                   // 7 services + YITL
    const y0 = S.ph * 0.115, y1 = S.ph * 0.885;
    const gap = (y1 - y0) / (N - 1);
    const cx = S.pw * 0.555;                       // column center (panel-local)
    const colW = S.pw * 0.74;                      // usable width (panel-local)
    return { N, gap, cx, colW, rowY(i) { return y0 + gap * i; } };
  }

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
      x1, y1, x2, y2,
      center: { x: (x1 + x2) / 2, y: (y1 + y2) / 2 },
      wF: x2 - x1, hF: y2 - y1,
      w0: s * 0.42, h0: s * 0.42,
      label: Math.min(x2 - x1, y2 - y1) * 0.105,
    };
  }

  /* publish box: parked right of the full tester rect, wherever space allows */
  function publishGeom() {
    const s = boxS();
    const tg = testerGeom();
    const w = s, h = s;
    let left = tg.x2 + s * 0.62;                 // gap: room for the arrow
    const availR = S.vw * 0.985;
    if (left + w > availR) left = availR - w;
    const y = (tg.y1 + tg.y2) / 2;
    return { x: left + w / 2, y, w, h, leftX: left };
  }

  /* arrow Testing -> Publish: horizontal, tip lands exactly on the box edge */
  function arrow3Geom() {
    const s = boxS(), tg = testerGeom(), pg = publishGeom();
    return placeArrow(els.arrow3, els.a3shaft, els.a3head,
      tg.x2, pg.y, pg.leftX, pg.y, 0, Math.max(14, s * 0.11));
  }

  /* the improvement loop: the tester rail pinches in vertically a touch to open
     a return lane; a feedback cluster (avatar stack + caption) hangs under
     Publish; the Improve box sits bottom-left; arrows run
     Publish->Feedback->Improve and land straight back onto Testing */
  function loopGeom() {
    const s = boxS();
    const tg = testerGeom();
    const pg = publishGeom();
    const d = s * 0.8;                              // improve box side
    const iconD = s * 0.233;                        // avatar diameter
    const wf = s * 0.115;                           // "Feedback" caption size
    const fitBottom = S.vh - 14 - d / 2;            // lowest improve center
    let LS = 0.925;                                 // tester vertical pinch
    let tb = tg.center.y + (tg.hF / 2) * LS;
    let impCy = tb + 56 + d / 2;
    while (impCy > fitBottom && LS > 0.7) {
      LS -= 0.02;
      tb = tg.center.y + (tg.hF / 2) * LS;
      impCy = tb + 56 + d / 2;
    }
    const impCx = Math.min(tg.center.x + tg.wF * 0.34, pg.leftX - d * 0.9);
    const iconsCy = Math.min(impCy - iconD * 0.55, S.vh - 46);
    const wordCy = iconsCy + iconD * 0.85;
    const rowW = iconD * 2.24;                      // 3 avatars, 62% stack
    const grpTop = iconsCy - iconD / 2;
    return {
      LS, wordFont: wf,
      tester: { w: tg.wF, h: tg.hF * LS, center: tg.center },
      imp: { x: impCx, y: impCy, w: d, h: d },
      fb: { x: pg.x, iconsCy, wordCy, rowW, iconD,
            grpY: (grpTop + wordCy + wf * 0.6) / 2 },
    };
  }

  /* arrow4: Publish's bottom edge -> down to just above the avatars */
  function arrow4Geom() {
    const s = boxS(), pg = publishGeom(), lg = loopGeom();
    return placeArrow(els.arrow4, els.a4shaft, els.a4head,
      pg.x, pg.y + pg.h / 2,
      pg.x, lg.fb.iconsCy - lg.fb.iconD / 2 - 8, 0, Math.max(14, s * 0.11));
  }

  /* arrow5: avatars' left edge -> into the Improve box's right edge */
  function arrow5Geom() {
    const s = boxS(), lg = loopGeom();
    return placeArrow(els.arrow5, els.a5shaft, els.a5head,
      lg.fb.x - lg.fb.rowW / 2 - 8, lg.fb.iconsCy,
      lg.imp.x + lg.imp.w / 2, lg.fb.iconsCy, 0, Math.max(14, s * 0.11));
  }

  /* arrow6: Improve's top edge -> tip lands on the pinched Testing rail */
  function arrow6Geom() {
    const s = boxS(), lg = loopGeom();
    return placeArrow(els.arrow6, els.a6shaft, els.a6head,
      lg.imp.x, lg.imp.y - lg.imp.h / 2,
      lg.imp.x, lg.tester.center.y + lg.tester.h / 2, 0, Math.max(14, s * 0.11));
  }

  /* ows anchors (viewport scope) */
  const owsCenter = () => ({ x: S.vw * 0.5, y: S.vh * 0.5 });
  const owsTop = () => ({ x: S.vw * 0.5, y: S.vh * 0.115 });

  /* ---------------- next sections ---------------- */

  /* selected works: title top, card center-left, giant index right */
  function worksGeom() {
    const cC = { x: S.vw * 0.42, y: S.vh * 0.545 };          // card anchor (centered incl. caption)
    const cw = Math.min(S.vw * 0.44, S.vh * 0.52);           // card width
    return {
      tC: { x: S.vw * 0.5, y: S.vh * 0.15 },                 // title center
      cC, cw,
      ch: cw * 0.62,                                          // mockup height
      nC: { x: S.vw * 0.805, y: S.vh * 0.53 },               // index number center
    };
  }

  /* TRUST THE PROCESS: three words sharing one centered row */
  function trustGeom() {
    const y = S.vh * 0.485;
    const fs = Math.min(S.vw * 0.062, S.vh * 0.135);
    const gap = S.vw * 0.02;
    const w = els.trustW || [0, 0, 0];
    const tot = w[0] + gap + w[1] + gap + w[2];
    const x0 = S.vw * 0.5 - tot / 2;
    return {
      y, fs, gap,
      cx: [x0 + w[0] / 2, x0 + w[0] + gap + w[1] / 2, x0 + tot - w[2] / 2],
    };
  }

  /* pledge blocks: borderless text rows stacked straight under the wordmark;
     the wordmark itself does not move or restyle when the blocks appear */
  function pledGeom() {
    const pf = Math.min(S.vw * 0.0165, S.vh * 0.032);        // heading font
    const df = Math.min(S.vw * 0.0122, S.vh * 0.019);        // description font
    const w = S.vw * 0.6;                                     // block width
    return {
      pf, df, w,
      x: S.vw / 2,
      ys: [S.vh * 0.625, S.vh * 0.755, S.vh * 0.875],
    };
  }

  /* FAQ accordion: caption + stacked question rows anchored under it */
  function faqGeom() {
    const qf = Math.min(S.vw * 0.0165, S.vh * 0.032);
    const af = Math.min(S.vw * 0.0122, S.vh * 0.019);
    return {
      capY: S.vh * 0.135,
      x: S.vw / 2,
      topY: S.vh * 0.215,
      w: S.vw * 0.74,
      qf, af,
    };
  }

  /* finale: big centered MZHX + CTA lines + contact pill */
  function finaleLayout() {
    const s = clamp((S.vw * 0.34) / els.wordSpan, 0.12, 0.6);
    const startX = S.vw / 2 - (s * els.wordSpan) / 2;
    const y = S.vh * 0.40;
    return {
      s, y,
      pos(i) {
        let cum = 0;
        for (let j = 0; j < i; j++) cum += els.letterW[j] + els.letterGap;
        return { x: startX + s * (cum + els.letterW[i] / 2) };
      },
    };
  }

  function ctaGeom() {
    return {
      l1: { x: S.vw * 0.5, y: S.vh * 0.565 },
      l2: { x: S.vw * 0.5, y: S.vh * 0.648 },
      pill: { x: S.vw * 0.5, y: S.vh * 0.745 },
      foot: S.vh * 0.925,
    };
  }

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

  /* ---------------- divider river + boat ---------------- */

  /* boat state: p = progress along the river path (0 top -> 1 bottom);
     drift/sway/rot are idle wave-rocking offsets, driven from app.js */
  const boat = { p: 0, drift: 0, rot: 0, sway: 0 };

  function placeBoat() {
    if (!els.boat || !els.dPath) return;
    if (!placeBoat.len) placeBoat.len = els.dPath.getTotalLength();
    const vb = els.divider.viewBox.baseVal;
    const VBW = vb.width || 100, VBH = vb.height || 100;
    const L = placeBoat.len;
    const p = clamp(boat.p, -0.03, 1.08);
    const l = p * L;
    const pt = els.dPath.getPointAtLength(Math.max(0.0001, Math.min(l, L)));
    const ahead = els.dPath.getPointAtLength(l >= L - 0.001 ? L - 0.001 : Math.min(l + 2.5, L - 0.001));
    // map to screen space (viewBox stretches non-uniformly)
    const uvx = (ahead.x - pt.x) * (S.vw / VBW);
    const uvy = (ahead.y - pt.y) * (S.vh / VBH);
    const ul = Math.hypot(uvx, uvy) || 1;
    const ux = uvx / ul, uy = uvy / ul;
    const nx = -uy, ny = ux;                     // river normal
    gsap.set(els.boat, {
      x: (pt.x / VBW) * S.vw + ux * boat.drift + nx * boat.sway,
      y: (pt.y / VBH) * S.vh + uy * boat.drift + ny * boat.sway,
      rotation: Math.atan2(uvy, uvx) * 180 / Math.PI - 90 + boat.rot,
    });
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
    els.tester.style.boxShadow = '';
    els.tester.style.borderColor = '';
    // publish box: sized + parked, bars prepped for their drop
    const pg = publishGeom();
    els.publish.style.width = pg.w + 'px';
    els.publish.style.height = pg.h + 'px';
    els.pubLbl.style.fontSize = s * 0.185 + 'px';
    gsap.set(els.publish, { xPercent: -50, yPercent: -50, x: pg.x, y: pg.y, scale: 1, autoAlpha: 0 });
    gsap.set(els.pubBars, { y: 0 });
    gsap.set(els.pubLbl, { yPercent: 115 });
    arrow3Geom();
    gsap.set(els.arrow3, { autoAlpha: 0 });

    // feedback loop: improve box + avatars + caption, arrows pre-placed
    const lg = loopGeom();
    els.impBox.style.width = lg.imp.w + 'px';
    els.impBox.style.height = lg.imp.h + 'px';
    els.impLbl.style.fontSize = s * 0.15 + 'px';
    gsap.set(els.impBox, { xPercent: -50, yPercent: -50, x: lg.imp.x, y: lg.imp.y, scale: 1, autoAlpha: 0 });
    gsap.set(els.impLbl, { yPercent: 115 });
    els.users.forEach((u, i) => {
      u.style.width = u.style.height = lg.fb.iconD + 'px';
      u.style.marginLeft = i ? -(lg.fb.iconD * 0.38) + 'px' : '0px';
    });
    els.fbLbl.style.fontSize = lg.wordFont + 'px';
    gsap.set(els.fbGroup, { xPercent: -50, yPercent: -50, x: lg.fb.x, y: lg.fb.grpY, scale: 1, autoAlpha: 0 });
    gsap.set(els.users, { scale: 1 });
    gsap.set(els.fbLbl, { yPercent: 115 });
    arrow4Geom(); arrow5Geom(); arrow6Geom();
    gsap.set([els.arrow4, els.arrow5, els.arrow6], { autoAlpha: 0 });

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

    // ---------- next sections (works / trust / pledges / faqs / finale) ----------
    const wg = worksGeom();
    els.projs.forEach((pr) => {
      const el = pr.el;
      el.style.width = wg.cw + 'px';
      el.querySelector('.mock').style.height = wg.ch + 'px';
      pr.wm.style.fontSize = Math.round(wg.cw * 0.52) + 'px';
      const cap = el.querySelector('.cap');
      cap.querySelector('strong').style.fontSize = Math.max(15, wg.cw * 0.052) + 'px';
      cap.querySelector('em').style.fontSize = Math.max(11.5, wg.cw * 0.034) + 'px';
      cap.querySelector('.tags').style.fontSize = Math.max(10.5, wg.cw * 0.031) + 'px';
      gsap.set(el, { xPercent: -50, yPercent: -50, x: wg.cC.x, y: wg.cC.y, rotation: 0, scale: 1, autoAlpha: 0 });
      // internals rest in their SHOWN state; the builders' fromTos stage them
      gsap.set(el.querySelectorAll('.tb i'), { scale: 1 });
      gsap.set(el.querySelectorAll('.brick'), { yPercent: 0 });
      gsap.set(pr.wm, { x: 0 });
    });
    gsap.set(els.worksTitle, { xPercent: -50, yPercent: -50, x: wg.tC.x, y: wg.tC.y, scale: 1, autoAlpha: 0 });
    els.worksText.style.fontSize = Math.min(S.vw * 0.040, S.vh * 0.075) + 'px';
    els.worksWords.forEach((w) => gsap.set(w, { yPercent: 115 }));
    const nFont = Math.min(S.vw * 0.17, S.vh * 0.30);
    els.idxNums.forEach((n) => {
      n.querySelector('span').style.fontSize = nFont + 'px';
      gsap.set(n, { xPercent: -50, yPercent: -50, x: wg.nC.x, y: wg.nC.y, autoAlpha: 0 });
    });

    // trust trio: fitted fonts, then measure each word width for the shared row
    let tgm = trustGeom();
    els.trustInners.forEach((h) => { h.style.fontSize = tgm.fs + 'px'; });
    els.trustW = els.trustInners.map((h) => h.offsetWidth);
    tgm = trustGeom();
    els.trustEls.forEach((el, i) => {
      gsap.set(el, { x: tgm.cx[i], y: tgm.y, scale: 1, autoAlpha: 0 });
    });

    // pledge blocks: fonts + block width; stacked straight under the wordmark
    const pgm = pledGeom();
    els.pledges.forEach((pb, i) => {
      pb.lbl.style.fontSize = pgm.pf + 'px';
      if (pb.desc) pb.desc.style.fontSize = pgm.df + 'px';
      pb.box.style.width = pgm.w + 'px';
      gsap.set(pb.el, { x: pgm.x, y: pgm.ys[i], rotation: 0, scale: 1, autoAlpha: 0 });
    });

    // FAQ accordion: caption + list sized; rows reset to collapsed resting state
    const fg = faqGeom();
    gsap.set(els.faqCap, { x: S.vw / 2, y: fg.capY, autoAlpha: 0 });
    els.faqCap.querySelector('span').style.fontSize = Math.min(S.vw * 0.0125, 14.5) + 'px';
    els.faqList.style.width = fg.w + 'px';
    els.faqList.style.gap = Math.max(0, S.vh * 0.009) + 'px';
    gsap.set(els.faqList, { xPercent: -50, x: fg.x, y: fg.topY, autoAlpha: 0 });
    els.faqs.forEach((q) => {
      q.el.style.fontSize = fg.qf + 'px';          // row paddings/icons scale off this
      q.num.style.fontSize = Math.max(10, fg.qf * 0.6) + 'px';
      q.ansP.style.fontSize = fg.af + 'px';
      gsap.set(q.el, { y: 0, autoAlpha: 0 });
      gsap.set(q.ansWrap, { height: 0, autoAlpha: 0 });
      gsap.set(q.plus, { rotation: 0 });
    });
    if (els.faqCollapseAll) els.faqCollapseAll();

    const ctg = ctaGeom();
    els.cta1Inner.style.fontSize = fitText(els.cta1Inner, Math.min(S.vw * 0.044, S.vh * 0.088), S.vw * 0.74) + 'px';
    els.cta2Inner.style.fontSize = fitText(els.cta2Inner, Math.min(S.vw * 0.044, S.vh * 0.088), S.vw * 0.80) + 'px';
    [[els.cta1, ctg.l1, els.cta1Words], [els.cta2, ctg.l2, els.cta2Words]].forEach(([a, pos, words]) => {
      gsap.set(a, { xPercent: -50, yPercent: -50, x: pos.x, y: pos.y, autoAlpha: 0 });
      gsap.set(words, { yPercent: 115 });
    });
    els.pill.querySelector('span').style.fontSize = Math.min(S.vw * 0.017, 21) + 'px';
    gsap.set(els.pill, { xPercent: -50, yPercent: -50, x: ctg.pill.x, y: ctg.pill.y, scale: 1, autoAlpha: 0 });
    els.footLine.querySelector('span').style.fontSize = Math.min(13.5, S.vw * 0.011) + 'px';
    gsap.set(els.footLine, { xPercent: -50, yPercent: -50, x: S.vw / 2, y: ctg.foot, autoAlpha: 0 });

    // ---------- river canvas + boat sizing ----------
    const riverW = clamp(S.vh * 0.105, 62, 128);
    MZ.riverW = riverW;
    els.boat.style.width = Math.round(riverW * 0.80) + 'px';
    gsap.set(els.boat, { xPercent: -50, yPercent: -50 });   // placeBoat drives the box CENTER
    placeBoat();
    if (MZ.riverRebuild) MZ.riverRebuild();
  }

  /* letters resting setters (resize-safe) */
  function setLetters(mode) {   // 'compact' | 'header' | 'finale' | 'stacked'
    if (mode === 'stacked') {
      els.letters.forEach((el, i) => {
        const p = stackedPos(i);
        gsap.set(el, { x: p.x, y: p.y, scale: 1 });
      });
      return;
    }
    if (mode === 'finale') {
      const lay = finaleLayout();
      els.letters.forEach((el, i) => {
        const p = lay.pos(i);
        gsap.set(el, { x: p.x, y: lay.y, scale: lay.s });
      });
      return;
    }
    const lay = mode === 'header' ? headerLayout() : compactLayout();
    els.letters.forEach((el, i) => {
      const p = lay.pos(i);
      gsap.set(el, { x: p.x, y: lay.y, scale: lay.s });
    });
  }

  /* services resting layout for step t: rows 0..t stay stacked in the right column
     (t===7 adds YITL as the 8th row); t >= 8 => fully hidden */
  function setServiceResting(t) {
    const visible = t >= 0 && t <= 7;
    gsap.set(els.svcLayer, {
      autoAlpha: visible ? 1 : 0,
      clipPath: visible ? 'circle(140% at 50% 52%)' : 'circle(0% at 50% 52%)',
      scale: visible ? 1 : 0.4,
    });
    const sg = svcStackGeom();
    services.forEach((sv, i) => {
      const shown = visible && i <= Math.min(t, 6);
      gsap.set(sv.anchor, shown
        ? { x: sg.cx, y: sg.rowY(i), autoAlpha: 1 }
        : { x: sg.cx, y: S.ph + 140, autoAlpha: 0 });
      sv.inner.querySelectorAll('.w').forEach((w) => gsap.set(w, { x: 0, y: 0 }));
      sv.words.forEach((w) => gsap.set(w, { yPercent: shown ? 0 : 115 }));
    });
    // YITL lives on the 8th stack row, revealed at step 7
    if (visible && t === 7) {
      gsap.set(els.yitl, { x: sg.cx, y: sg.rowY(7), scale: 1, rotation: 0, autoAlpha: 1 });
    } else {
      gsap.set(els.yitl, { autoAlpha: 0, x: sg.cx, y: sg.rowY(7), scale: 0.35 });
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

  /* smooth traveling glow wave: each letter crawls up into white (long ease-in),
     lingers at full brightness for a beat, then releases to gray along the exact
     same curve and timing as the rise — the ease-out is the ease-in mirrored in
     time — and finally SETTLES at the resting gray for a beat before the next
     crawl begins. The whole journey is seamless and slope-continuous: never
     jerky, never snapping, colors walked evenly through the mid-tones. The long
     phases overlap letter to letter, so a gradient of in-between colors travels
     across MZHX. During the handoff a small glowing mote arcs from the fading
     letter to the rising one — as if it carries the light over (moon drawing
     its light from the sun). */
  function makeGlowWave(spans, perLetter) {
    const n = spans.length || 4;
    const rest = (getComputedStyle(spans[0]).color || 'rgb(138,138,144)').match(/\d+/g) || [138, 138, 144];
    const C0 = { r: +rest[0], g: +rest[1], b: +rest[2] };
    const C1 = { r: 255, g: 255, b: 255 };
    // glow profile, in letter-step units (1 step = perLetter seconds; the wave moves
    // one letter per step, so the travel rhythm is untouched):
    //   HOLD — linger at full white for a beat once the pulse lands
    //   REST — settle at the resting gray: the fade must dissolve into the original
    //          color and sit there a moment before the next crawl starts
    //   RISE = FALL — the release mirrors the ease-in exactly (same duration, same
    //          S-shaped animation); rise + hold + fall + rest share the wave cycle
    //          (2 x RISE + HOLD + REST === n) so no phase truncates on the wrap
    const HOLD = 0.4, REST = 0.5;
    const RISE = (n - HOLD - REST) / 2, FALL = RISE;
    // easing shared by both directions: a single smoothstep S — zero slope at both
    // ends (seamless into the hold at white and out again at gray) with an even,
    // steady walk through every color in between (peak speed 1.5x average; the old
    // cosine+smoothstep blend peaked at ~2.4x and snapped through the mid-tones)
    const bump = (u) => u * u * (3 - 2 * u);
    let proxy = { k: 0 }, tween = null, mote = null, glyphs = null;

    function anchorRects() {
      return glyphs.map((g2) => {
        const r = g2.rect.getBoundingClientRect();
        return { x: r.left + r.width / 2, y: r.top + r.height / 2, w: r.width, h: Math.max(r.height, r.width) };
      });
    }

    function ensureMote() {
      if (mote) return;
      glyphs = spans.map((sp) => ({
        el: sp,
        rect: sp.querySelector('.self') || sp,
      }));
      mote = document.createElement('div');
      mote.className = 'glowMote';
      mote.setAttribute('aria-hidden', 'true');
      (MZ.els.app || document.body).appendChild(mote);
      gsap.set(mote, { xPercent: -50, yPercent: -50, autoAlpha: 0 });
    }

    function paint() {
      for (let i = 0; i < n; i++) {
        // unfolded per-letter phase: time since this letter's pulse landed, wrapped
        // to [0, n) — 0 = white just landed, n = the next pulse is arriving
        const p = (((proxy.k - i) % n) + n) % n;
        let t = 0;
        if (p < HOLD) t = 1;                                          // sit at full white
        else if (p < HOLD + FALL) t = bump(1 - (p - HOLD) / FALL);     // dissolve toward gray
        else {
          const u = (p - (n - RISE)) / RISE;
          if (u > 0) t = bump(u);                                     // crawl toward next white
        }                                                             // (u <= 0: REST at gray)
        const r = Math.round(C0.r + (C1.r - C0.r) * t);
        const g2 = Math.round(C0.g + (C1.g - C0.g) * t);
        const b = Math.round(C0.b + (C1.b - C0.b) * t);
        spans[i].style.color = 'rgb(' + r + ',' + g2 + ',' + b + ')';
        spans[i].style.textShadow = t > 0.02
          ? '0 0 ' + (5 + 21 * t).toFixed(1) + 'px rgba(255,255,255,' + (0.35 * t).toFixed(3) + ')'
          : 'none';
      }
      // ---- the extracted shadow: peels off the fading letter, drifts facing the
      // next one, decelerates and dissolves while it is still en-route ----
      const kk = proxy.k;
      const rawA = Math.floor(kk - 0.15);          // handoff window starts 15% before the next center
      const from = ((rawA % n) + n) % n;
      const to = (((rawA + 1) % n) + n) % n;
      const u = (kk - (rawA + 0.15)) / 0.6;        // flight spans 0.6 letter-units
      if (u > 0.002 && u < 0.998 && mote) {
        const cs = anchorRects();
        const P0 = cs[from], P1 = cs[to];
        const dx = P1.x - P0.x, dy = P1.y - P0.y;
        const dist = Math.max(1, Math.hypot(dx, dy));
        const nx = dx / dist, ny = dy / dist;
        // emit from the glyph's edge facing the target (never deeper than mid-gap),
        // so the wisp is visible the moment it peels off
        const off = Math.min(P0.w * 0.55, dist * 0.42);
        const S0 = { x: P0.x + nx * off, y: P0.y + ny * off };
        const hop = Math.min(64, Math.max(18, P0.h * 0.6));
        const mx = (S0.x + P1.x) / 2;
        const my = Math.min(S0.y, P1.y) - hop;     // arcing over the glyph tops
        const tt = u * u * (3 - 2 * u);            // easeInOut pull: clings, lifts, settles
        const bx = (1 - tt) * (1 - tt) * S0.x + 2 * (1 - tt) * tt * mx + tt * tt * P1.x;
        const by = (1 - tt) * (1 - tt) * S0.y + 2 * (1 - tt) * tt * my + tt * tt * P1.y;
        const tt2 = Math.min(0.999, tt + 0.06);
        const bx2 = (1 - tt2) * (1 - tt2) * S0.x + 2 * (1 - tt2) * tt2 * mx + tt2 * tt2 * P1.x;
        const by2 = (1 - tt2) * (1 - tt2) * S0.y + 2 * (1 - tt2) * tt2 * my + tt2 * tt2 * P1.y;
        gsap.set(mote, {
          x: bx, y: by,
          rotation: Math.atan2(by2 - by, bx2 - bx) * 180 / Math.PI * 0.45,  // wisp leans into its drift
          scale: 0.6 + 0.8 * u,                                      // dispersing as it travels
          autoAlpha: 0.66 * Math.pow(1 - u, 1.1),                    // holds light, then dissolves
        });
      } else if (mote) {
        gsap.set(mote, { autoAlpha: 0 });
      }
    }
    return {
      spans,
      start() {
        if (tween) return;
        ensureMote();
        proxy.k = 0;
        paint();
        tween = gsap.to(proxy, {
          k: n, duration: perLetter * n, ease: 'none', repeat: -1,
          onUpdate() { proxy.k = proxy.k % n; paint(); },
        });
      },
      stop() {
        if (!tween) return;
        tween.kill(); tween = null;
        spans.forEach((sp) => { sp.style.color = ''; sp.style.textShadow = ''; });
        if (mote) gsap.set(mote, { autoAlpha: 0 });
      },
      get running() { return !!tween; },
    };
  }

  return {
    S, els, services, data, MAXSTEP,
    buildDOM, metrics, fitAll, measureLetters, prepStatic,
    stackedPos, compactLayout, headerLayout,
    midPos, svcStackGeom, boxS, planP, p1, p2,
    encapBounds, groupGeom, groupPt, execGeom, testerGeom,
    owsCenter, owsTop, arrow1Geom, arrow2Geom, arrow3Geom, publishGeom,
    loopGeom, arrow4Geom, arrow5Geom, arrow6Geom,
    worksGeom, trustGeom, pledGeom, faqGeom, finaleLayout, ctaGeom,
    boat, placeBoat,
    setLetters, setServiceResting,
    makeLetterCycle, makeGlowWave, fitText, clamp,
  };
})();
