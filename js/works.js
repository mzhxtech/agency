/* ============ Selected Works — screenshot cycler (steps 17..20) ============

   Each project card keeps its gradient, browser chrome, bricks and the
   big letter mark. A screenshot layer fades in beneath the letter once
   the card's internals have assembled, then resolves through every
   images/<project><n>.png found in the folder (cards are discovered by
   name-probe, so newly dropped screenshots join automatically).

   The resolve is a staggered grid: the incoming screenshot is sliced into
   a grid of tiles that flip on one by one (gsap stagger, random order,
   tiny zoom settle) on top of the still-visible current screenshot.
   The four cards run on independent clocks so swaps never happen in sync. */
window.MZG = (function () {
  'use strict';

  const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLS = 5, ROWS = 4;   // 20-tile resolve grid
  const HOLD = 2.6;           // seconds a screenshot rests before the next resolves
  const MAXN = 8;             // probe <slug>1..8.png, stop at the first miss

  const cards = [];           // { el, canvas, shots, base, tiles[], arts[], urls[], i, shown, busy, chain }
  const PRIME = new Map();    // url -> Promise<Image> — loaded AND decoded, paint-ready
  let booted = false;

  /* ---------- decode priming: big PNGs must be paint-ready before the
     tiles ever show them, or the grid flashes gray/white blanks ---------- */
  function prime(url) {
    if (!PRIME.has(url)) {
      PRIME.set(url, new Promise((res) => {
        const im = new Image();
        im.onload = () => { if (im.decode) im.decode().then(() => res(im), () => res(im)); else res(im); };
        im.onerror = () => res(null);
        im.src = url;
      }));
    }
    return PRIME.get(url);
  }

  /* ---------- layer build (above the bricks, below the letter mark) ---------- */
  function build(card) {
    const canvas = card.canvas;
    const shots = document.createElement('div');
    shots.className = 'shots';
    const base = document.createElement('div');
    base.className = 'base';
    shots.appendChild(base);
    card.tiles = [];
    card.arts = [];
    for (let i = 0; i < ROWS; i++) {
      for (let j = 0; j < COLS; j++) {
        const tile = document.createElement('div');
        tile.className = 'tile';
        // the art child spans the whole canvas and offsets opposite the cell,
        // so the tile shows exactly its slice — same cover crop as the base
        const art = document.createElement('div');
        art.className = 'art';
        art.style.width = (COLS * 100) + '%';
        art.style.height = (ROWS * 100) + '%';
        art.style.left = -(j * 100) + '%';
        art.style.top = -(i * 100) + '%';
        tile.style.left = (j * 100 / COLS) + '%';
        tile.style.top = (i * 100 / ROWS) + '%';
        tile.appendChild(art);
        shots.appendChild(tile);
        card.tiles.push(tile);
        card.arts.push(art);
      }
    }
    const wm = canvas.querySelector('.wm');
    canvas.insertBefore(shots, wm);        // bricks below, letter mark above
    card.shots = shots;
    card.base = base;
  }

  /* ---------- folder discovery (future-proof: add shots, they join) ---------- */
  async function discover(card) {
    const list = [];
    for (let n = 1; n <= MAXN; n++) {
      const url = 'images/' + card.slug + n + '.png';
      const im = await prime(url);
      if (!im) break;                       // first miss ends the folder walk
      list.push(url);
    }
    card.urls = list;
    if (card.pending && list.length) {    // a reveal asked before shots arrived
      card.pending = false;
      showCard(card);
    }
    schedule(card, HOLD * 1000 * (0.55 + Math.random() * 0.3));
  }

  /* ---------- show / hide ---------- */
  function showCard(card) {
    if (card.shown) return;
    if (!card.urls.length) { card.pending = true; return; }
    card.shown = true;
    card.base.style.backgroundImage = 'url("' + card.urls[card.i] + '")';
    gsap.set(card.tiles, { autoAlpha: 0 });
    prime(card.urls[card.i]).then((im) => {   // first shot decoded -> THEN fade the layer in
      if (card.shown) gsap.to(card.shots, { autoAlpha: 1, duration: RM ? 0.12 : 0.6, ease: 'power2.out' });
    });
  }

  function hideCard(card) {
    if (!card.shown) return;
    card.shown = false;
    gsap.to(card.shots, { autoAlpha: 0, duration: 0.35, ease: 'power1.in' });
  }

  /* ---------- the staggered grid resolve: next image lands tile by tile ---------- */
  function resolve(card) {
    const next = (card.i + 1) % card.urls.length;
    const url = card.urls[next];
    // decode the incoming screenshot first — never let tiles paint blanks
    Promise.race([prime(url), new Promise((r) => setTimeout(() => r(null), 450))]).then(() => {
      if (!card.shown) { card.busy = false; schedule(card, HOLD * 1000); return; }
      card.tiles.forEach((tile, k) => {
        card.arts[k].style.backgroundImage = 'url("' + url + '")';
      });
      // visible cascade: random tile order, tiny zoom settle, one tile at a time
      gsap.fromTo(card.tiles,
        { autoAlpha: 0, scale: 1.16 },
        {
          autoAlpha: 1, scale: 1, duration: 0.6, ease: 'power2.out',
          stagger: { each: 0.05, from: 'random' },
          onComplete() {
            // every tile now carries the incoming screenshot — hand the base
            // over and tuck the tiles away for the next resolve
            card.base.style.backgroundImage = 'url("' + url + '")';
            gsap.set(card.tiles, { autoAlpha: 0, scale: 1 });
            card.i = next;
            card.busy = false;
            schedule(card, HOLD * 1000);
          },
        });
    });
  }

  /* ---------- per-card clock (independent phases, skips while hidden) ---------- */
  function schedule(card, ms) {
    clearTimeout(card.chain);
    card.chain = setTimeout(() => {
      if (document.hidden) { schedule(card, 900); return; }
      if (!card.shown || card.busy || RM) { schedule(card, 700); return; }
      card.busy = true;
      resolve(card);
    }, ms);
  }

  /* ---------- public surface ---------- */
  function init() {
    if (booted || !window.MZ || !MZ.els || !MZ.els.projs) return;
    booted = true;
    MZ.els.projs.forEach((pr) => {
      const canvas = pr.el.querySelector('.canvas');
      if (!canvas) return;
      const name = pr.el.querySelector('.cap strong');
      const slug = (name ? name.textContent : 'project').toLowerCase().replace(/[^a-z0-9]+/g, '');
      const card = { el: pr.el, canvas, slug, urls: [], i: 0, shown: false, busy: false, chain: null };
      build(card);
      cards.push(card);
    });
    cards.forEach((card, k) => {
      setTimeout(() => { discover(card); }, 250 + k * 180);   // interleave the folder probes
    });
  }

  // stageCardInner calls this when a card finishes assembling its internals
  function onCardLand(pr) {
    const card = cards.find((c) => c.el === pr.el);
    if (card) showCard(card);
  }

  // applyResting calls this with the resting works step (or -1 when off works)
  function restSync(activeIdx) {
    cards.forEach((card, k) => {
      if (k === activeIdx) showCard(card);
      else hideCard(card);
    });
  }

  return { init, onCardLand, restSync };
})();
