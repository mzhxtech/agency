/* ============ Selected Works — screenshot cycler (steps 17..20) ============

   Each project card keeps its gradient, browser chrome, bricks and the
   big letter mark. A screenshot layer fades in beneath the letter once
   the card's internals have assembled, then resolves through every
   images/<project><n>.png found in the folder (cards are discovered by
   name-probe, so newly dropped screenshots join automatically).

   The swap is a two-phase staggered wall (gsap stagger, ~100 boxes in the
   card's own ink): boxes fade in one by one in random order to cover the
   current screenshot; the screenshot swaps beneath the closed wall; the
   boxes then fade out one by one (random order again) unveiling the new
   image — an in/out mirror of the same dissolve.
   The four cards run on independent clocks so swaps never happen in sync. */
window.MZG = (function () {
  'use strict';

  const RM = window.matchMedia && window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  const COLS = 10, ROWS = 10; // 100-box stagger wall (5x the box count)
  const HOLD = 2.6;           // seconds a screenshot rests before the next resolves
  const MAXN = 8;             // probe <slug>1..8.png, stop at the first miss

  const cards = [];           // { el, canvas, shots, base, tiles[], arts[], fills[], urls[], i, shown, busy, chain }
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
    card.fills = [];
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
        tile.style.width = (100 / COLS) + '%';
        tile.style.height = (100 / ROWS) + '%';
        // the box fill sits above the art slice and paints the stagger wall
        const fill = document.createElement('div');
        fill.className = 'fill';
        tile.appendChild(art);
        tile.appendChild(fill);
        shots.appendChild(tile);
        card.tiles.push(tile);
        card.arts.push(art);
        card.fills.push(fill);
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
    if (card.tl) { card.tl.kill(); card.tl = null; }   // a wall may be mid-flight
    card.busy = false;
    const url = card.urls[card.i];
    card.base.style.backgroundImage = 'url("' + url + '")';
    gsap.set(card.tiles, { autoAlpha: 1, scale: 1, rotation: 0 });
    gsap.set(card.fills, { opacity: 0 });                // rest: tiles show the current image
    card.arts.forEach((a) => { a.style.backgroundImage = 'url("' + url + '")'; });
    prime(url).then((im) => {   // first shot decoded -> THEN fade the layer in
      if (card.shown) gsap.to(card.shots, { autoAlpha: 1, duration: RM ? 0.12 : 0.6, ease: 'power2.out' });
    });
  }

  function hideCard(card) {
    if (!card.shown) return;
    card.shown = false;
    if (card.tl) { card.tl.kill(); card.tl = null; }
    card.busy = false;
    gsap.to(card.shots, { autoAlpha: 0, duration: 0.35, ease: 'power1.in' });
    gsap.set(card.fills, { opacity: 0 });               // go to rest even mid-wall
    gsap.set(card.tiles, { scale: 1, rotation: 0 });
  }

  /* neutral ink per box — charcoal in the site's chrome tone, a touch of
     per-box luminance jitter so the wall reads textured, never flat gray */
  function ink(k) {
    const l = 15 + ((k * 2654435761 + 12345) % 7);   // rgb(15..21) charcoal band
    return 'rgba(' + l + ',' + (l + 1) + ',' + (l + 3) + ',0.94)';
  }

  /* ---------- the staggered grid swap ----------
     phase 1 — ink boxes fade in one by one in random order, building the
                cover over the still-visible image
     (cover) — under the completed wall the old image becomes the new one
     phase 2 — the same random one-by-one fade runs in reverse: boxes
                dissolve one by one, unveiling the new image */
  function resolve(card) {
    const next = (card.i + 1) % card.urls.length;
    const url = card.urls[next];
    // decode the incoming screenshot first — never let tiles paint blanks
    Promise.race([prime(url), new Promise((r) => setTimeout(() => r(null), 450))]).then(() => {
      if (!card.shown) { card.busy = false; schedule(card, HOLD * 1000); return; }
      card.fills.forEach((f, k) => { f.style.background = ink(k); });   // neutral wall ink, refreshed each swap
      card.arts.forEach((art) => { art.style.backgroundImage = 'url("' + url + '")'; });
      card.arts.forEach((art) => { art.style.backgroundImage = 'url("' + url + '")'; });
      if (card.tl) card.tl.kill();            // never two walls at once
      card.tl = gsap.timeline({
        onComplete() {
          card.tl = null;
          card.base.style.backgroundImage = 'url("' + url + '")';
          gsap.set(card.fills, { opacity: 0 });
          gsap.set(card.tiles, { scale: 1, rotation: 0 });
          card.i = next;
          card.busy = false;
          schedule(card, HOLD * 1000);
        },
      });
      // symmetrical random one-by-one dissolves: in builds the cover, out unveils
      card.tl.fromTo(card.fills,
        { opacity: 0 },
        { opacity: 1, duration: 0.3, ease: 'power2.out', stagger: { each: 0.011, from: 'random' } }, 0.02);
      card.tl.call(() => {                                  // under-cover hand-off
        card.base.style.backgroundImage = 'url("' + url + '")';
      }, null, 1.44);                                       // wall fully covered first
      card.tl.to(card.fills,
        { opacity: 0, duration: 0.3, ease: 'power1.out', stagger: { each: 0.011, from: 'random' } }, 1.46);
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
      try {
        build(card);
        cards.push(card);
      } catch (e) {
        // one broken card must never take the whole page's boot down
        console.warn('MZG: build failed for "' + slug + '"', e);
      }
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

  return { init, onCardLand, restSync, stat: () => cards.map((c) => ({ slug: c.slug, shown: c.shown, busy: c.busy, imgs: c.urls.length, cur: c.urls[c.i] ? c.urls[c.i].replace(/^.*images\//, '') : '-', wall: !!c.tl })) };
})();
