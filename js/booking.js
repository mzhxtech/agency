/* ============ Booking pill (finale CTA) ============
   Port of the "Book Scoping Call" artifact into the scroll stage:
   idle pill -> date -> time -> hour -> email -> confirming -> scheduled.
   Pure DOM + CSS (no GSAP): hover ring on the idle pill, inset-fill
   option cells, morphing shell widths, chrome sheen on the scheduled
   text, bar-shake on an invalid email, Escape climbs back one step.
   Two site skins: shells/pill stay white with #0F191E ink; the idle
   ring and focus rings draw white so they read on the dark stage.
   Scramble tail uses the site's brand pool. */
(function () {
  'use strict';
  const MZ = (window.MZ = window.MZ || {});

  const POOL = 'MZHX*#/0427';
  const ICONS = {
    left: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="m12 19-7-7 7-7"/><path d="M19 12H5"/></svg>',
    right: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M5 12h14"/><path d="m12 5 7 7-7 7"/></svg>',
    x: '<svg viewBox="0 0 24 24" width="16" height="16" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'
  };

  const QUICK = [
    { key: 'today', label: 'Today' },
    { key: 'tomorrow', label: 'Tomorrow' },
    { key: 'thisWeek', label: 'This Week' },
    { key: 'nextWeek', label: 'Next Week' }
  ];
  const PERIODS = [
    { key: 'morning', label: 'Morning' },
    { key: 'afternoon', label: 'Afternoon' },
    { key: 'evening', label: 'Evening' },
    { key: 'night', label: 'Night' }
  ];
  const HOURS = {
    morning: ['9 AM', '10 AM', '11 AM', '12 PM'],
    afternoon: ['1 PM', '2 PM', '3 PM', '4 PM'],
    evening: ['5 PM', '6 PM', '7 PM', '8 PM'],
    night: ['8 PM', '9 PM', '10 PM', '11 PM']
  };

  const startOfDay = d => { const n = new Date(d); n.setHours(0, 0, 0, 0); return n; };
  const addDays = (d, n) => { const t = new Date(d); t.setDate(t.getDate() + n); return t; };
  const fmtChip = d => new Intl.DateTimeFormat('en-US', { weekday: 'short' }).format(d) + ' ' + d.getDate();
  const fmtDate = d => new Intl.DateTimeFormat('en-US', { weekday: 'short', month: 'short', day: 'numeric' }).format(d);
  const tz = () => {
    try { return Intl.DateTimeFormat().resolvedOptions().timeZone || ''; }
    catch (e) { return ''; }
  };

  const RM = !!(window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches);

  let shell = null, st = 'idle', view = 'main';
  let quick = null, date = null, period = null, hour = null, email = '';
  let confirmStep = 0, schedText = '', schedTick = 0, timers = [];
  let escBound = false;

  function mk(tag, cls, txt) {
    const e = document.createElement(tag);
    if (cls) e.className = cls;
    if (txt != null) e.textContent = txt;
    return e;
  }

  function clearTimeouts() {
    timers.forEach(clearTimeout); timers = [];
    if (schedTick) { clearInterval(schedTick); schedTick = 0; }
  }

  /* shell widths — same beats as the artifact */
  function widthFor() {
    if (st === 'idle') return 'min(230px, calc(100vw - 32px))';
    if (st === 'email') return 'min(430px, calc(100vw - 32px))';
    if (st === 'confirming') return 'min(' + (confirmStep === 0 ? 180 : 170) + 'px, calc(100vw - 32px))';
    if (st === 'scheduled') return 'min(' + Math.min(720, schedText.length * 8 + 48) + 'px, calc(100vw - 32px))';
    return 'min(720px, calc(100vw - 32px))';
  }

  function opt(label, selected, fn) {
    const b = mk('button', 'bk-opt', label);
    b.type = 'button';
    b.setAttribute('aria-pressed', selected ? 'true' : 'false');
    b.addEventListener('click', fn);
    return b;
  }

  function sideBtn(icon, label, fn) {
    const b = mk('button', 'bk-side');
    b.type = 'button';
    b.setAttribute('aria-label', label);
    const ic = mk('span', 'bk-ic');
    ic.innerHTML = ICONS[icon];
    b.appendChild(ic);
    b.addEventListener('click', fn);
    return b;
  }

  /* back one step; at the start (or confirming/scheduled) that means close */
  function back() {
    if (st === 'confirming' || st === 'scheduled') return reset();
    if (st === 'email') st = 'hour';
    else if (st === 'hour') st = 'time';
    else if (st === 'time') { st = 'date'; view = 'main'; }
    else if (st === 'date') {
      if (view !== 'main') { view = 'main'; }
      else return reset();
    }
    else return;
    clearTimeouts();
    render();
  }

  function reset() {
    const dirty = st !== 'idle' || timers.length > 0 || schedTick !== 0;
    clearTimeouts();
    st = 'idle'; view = 'main'; quick = null; date = period = hour = null; email = '';
    confirmStep = 0; schedText = '';
    if (!shell || !dirty) return;   // idle re-entry during applyResting: no-op
    render();
  }

  function render() {
    if (!shell) return;
    // NOTE: renders must NOT clear the pending flow timers (the 700ms
    // confirmStep->1400ms scheduled chain relies on them); cleanup happens
    // on reset()/back() only.
    shell.classList.remove('bk-shake');
    shell.className = 'bk-shell' + (st === 'idle' ? ' bk-open' : ' bk-flow');
    shell.style.width = widthFor();
    while (shell.firstChild) shell.removeChild(shell.firstChild);
    if (st === 'idle') return renderIdle();
    if (st === 'scheduled') return renderSched();
    if (st === 'confirming') return renderConfirm();
    return renderFlow();
  }

  function renderIdle() {
    const b = mk('button', 'bk bk-ring');
    b.type = 'button';
    b.setAttribute('aria-label', 'Book Scoping Call');
    b.appendChild(mk('span', 'bk-label', 'Book Scoping Call'));
    b.addEventListener('click', () => { st = 'date'; view = 'main'; render(); });
    shell.appendChild(b);
  }

  function renderFlow() {
    shell.appendChild(sideBtn('left', 'Go back', back));
    const body = mk('div', 'bk-body');
    if (st === 'date') body.appendChild(dateBody());
    else if (st === 'time') body.appendChild(timeBody());
    else if (st === 'hour') body.appendChild(hourBody());
    else if (st === 'email') body.appendChild(emailBody());
    shell.appendChild(body);
    shell.appendChild(sideBtn('x', 'Close booking', reset));
  }

  function chooseDay(d) { date = d; st = 'time'; render(); }

  function dateBody() {
    if (view === 'main') {
      const g = mk('div', 'bk-grid');
      g.setAttribute('role', 'group');
      g.setAttribute('aria-label', 'Choose a date');
      QUICK.forEach(q => {
        const sel = (q.key === 'today' && quick === 'today') ||
                    (q.key === 'tomorrow' && quick === 'tomorrow');
        g.appendChild(opt(q.label, sel, () => {
          if (q.key === 'today') { date = startOfDay(new Date()); quick = 'today'; st = 'time'; render(); }
          else if (q.key === 'tomorrow') { date = addDays(new Date(), 1); quick = 'tomorrow'; st = 'time'; render(); }
          else { view = q.key; render(); }
        }));
      });
      return g;
    }
    /* this week: remaining days at least two out; next week: Mon..Sun */
    const S = startOfDay(new Date());
    let days;
    if (view === 'thisWeek') {
      days = [];
      const sunday = addDays(S, (7 - S.getDay()) % 7);
      for (let d = addDays(S, 2); d <= sunday; d = addDays(d, 1)) days.push(d);
    } else {
      const monday = addDays(S, 7 - ((S.getDay() + 6) % 7));
      days = Array.from({ length: 7 }, (x, i) => addDays(monday, i));
    }
    const g = mk('div', 'bk-grid');
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', view === 'thisWeek' ? 'Choose a day this week' : 'Choose a day next week');
    const ab = mk('button', 'bk-opt bk-optback');
    ab.type = 'button';
    ab.setAttribute('aria-label', 'Back to date options');
    ab.addEventListener('click', () => { view = 'main'; render(); });
    const ic = mk('span', 'bk-ic');
    ic.innerHTML = ICONS.left;
    ab.appendChild(ic);
    g.appendChild(ab);
    if (view === 'thisWeek' && days.length === 0) {
      g.appendChild(mk('span', 'bk-empty', 'No more days this week'));
    } else {
      days.forEach(d => {
        g.appendChild(opt(fmtChip(d), !!date && date.getTime() === d.getTime(), () => chooseDay(d)));
      });
    }
    return g;
  }

  function timeBody() {
    const g = mk('div', 'bk-grid');
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', 'Choose a time');
    PERIODS.forEach(p => {
      g.appendChild(opt(p.label, period === p.key, () => { period = p.key; st = 'hour'; render(); }));
    });
    return g;
  }

  function hourBody() {
    const g = mk('div', 'bk-grid');
    g.setAttribute('role', 'group');
    g.setAttribute('aria-label', 'Choose an hour');
    (HOURS[period] || []).forEach(h => {
      g.appendChild(opt(h, hour === h, () => { hour = h; st = 'email'; render(); }));
    });
    return g;
  }

  function emailBody() {
    const f = mk('form', 'bk-form');
    f.noValidate = true;   // our own validation drives the bar-shake UX
    const lbl = mk('label', 'sr-only', 'Email');
    lbl.setAttribute('for', 'bk-email');
    const inp = mk('input', 'bk-input');
    inp.id = 'bk-email';
    inp.type = 'email';
    inp.value = email;
    inp.autocomplete = 'email';
    inp.setAttribute('placeholder', "Type your email and we'll reach out");
    const submit = mk('button', 'bk-side bk-go');
    submit.type = 'submit';
    submit.setAttribute('aria-label', 'Submit email');
    const ic = mk('span', 'bk-ic');
    ic.innerHTML = ICONS.right;
    submit.appendChild(ic);
    inp.addEventListener('input', () => {
      email = inp.value;
      inp.setAttribute('aria-invalid', 'false');
      shell.classList.remove('bk-shake');
    });
    f.addEventListener('submit', e => { e.preventDefault(); submitEmail(); });
    f.appendChild(lbl); f.appendChild(inp); f.appendChild(submit);
    timers.push(setTimeout(() => { inp.focus(); }, 60));
    return f;
  }

  function submitEmail() {
    const v = email.trim();
    const ok = v.includes('@') && v.includes('.') &&
      v.indexOf('@') > 0 && v.lastIndexOf('.') > v.indexOf('@');
    const inp = shell.querySelector('.bk-input');
    if (!ok) {
      if (inp) inp.setAttribute('aria-invalid', 'true');
      shell.classList.remove('bk-shake');
      void shell.offsetWidth;   // restart the shake animation
      shell.classList.add('bk-shake');
      timers.push(setTimeout(() => { shell.classList.remove('bk-shake'); }, 460));
      if (inp) inp.focus();
      return;
    }
    schedText = "We'll reach you on " + v + " at " + hour + " on " + fmtDate(date) + " • " + tz();
    confirmStep = 0; st = 'confirming'; render();
    if (RM) {
      // reduced motion: skip the confirming beat, land on the final text
      timers.push(setTimeout(() => { confirmStep = 1; st = 'scheduled'; render(); }, 60));
      return;
    }
    timers.push(setTimeout(() => { confirmStep = 1; render(); }, 700));
    timers.push(setTimeout(() => { st = 'scheduled'; render(); }, 1400));
  }

  function renderConfirm() {
    const d = mk('div', 'bk-confirm');
    d.appendChild(mk('span', 'confirm-text', confirmStep === 0 ? 'Confirming...' : 'Confirmed'));
    shell.appendChild(d);
  }

  /* scheduled: the summary text sweeps a chrome sheen on hover; click restarts */
  function renderSched() {
    const f = mk('div', 'bk-final');
    f.tabIndex = 0;
    f.setAttribute('data-text', '');
    f.setAttribute('title', 'Click to book again');
    f.setAttribute('aria-label', schedText + '. Click to book again');
    const s = mk('span', 'fx-chrome-base');
    f.appendChild(s);
    const set = cur => { s.textContent = cur; f.setAttribute('data-text', cur); };
    f.addEventListener('click', reset);
    f.addEventListener('keydown', e => {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); reset(); }
    });
    shell.appendChild(f);
    if (RM) { set(schedText); return; }
    // reveal: type forward with a scrambled tail in the site brand pool
    let c = 0;
    const interval = Math.max(10, Math.floor(800 / Math.max(1, schedText.length)));
    schedTick = setInterval(() => {
      c++;
      if (c >= schedText.length) {
        set(schedText);
        clearInterval(schedTick); schedTick = 0;
        return;
      }
      let cur = schedText.slice(0, c);
      for (let i = c; i < schedText.length; i++) {
        cur += schedText[i] === ' ' ? ' ' : POOL[(Math.random() * POOL.length) | 0];
      }
      set(cur);
    }, interval);
  }

  function buildHost(pill) {
    pill.textContent = '';
    const c = mk('span', 'bcenter');
    shell = mk('div', 'bk-shell');
    shell.setAttribute('aria-live', 'polite');
    c.appendChild(shell);
    pill.appendChild(c);
    if (!escBound) {
      escBound = true;
      document.addEventListener('keydown', e => {
        if (e.key === 'Escape' && st !== 'idle') back();
      });
    }
    MZ.bookingReset = reset;
    render();
  }

  MZ.buildBooking = buildHost;
  MZ.bookingReset = reset;
})();
