/* MZHX — procedural top-down river painted on <canvas>:
   textured water (seamless fractal noise), flow streaks, glints, bank foam,
   shoreline shadows, and a wake trailing the boat. No assets, no deps. */
(function () {
  'use strict';
  const MZ = window.MZ;
  if (!MZ) return;

  const TAU = Math.PI * 2;
  let cvs = null, ctx = null, staticLayer = null;
  let dpr = 1, LW = 0, LH = 0;
  let N = 0;
  let px, py, tx, ty, wq, cum;      // sampled centerline geometry (screen space)
  let Lscr = 1;                     // total screen-arc length of the river
  let streaks = [], glints = [], specks = [];
  let flowMul = 1, time = 0, inited = false;

  /* ---------- deterministic rng ---------- */
  function rng(seed) {
    let s = seed >>> 0;
    return () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
  }

  /* ---------- seamless 4-octave value-noise tile (white clouds, alpha = crests) ---------- */
  function noiseTile(size, baseCells, seed) {
    const c = document.createElement('canvas');
    c.width = c.height = size;
    const g = c.getContext('2d');
    const img = g.createImageData(size, size);
    const d = img.data;
    const hash = (x, y, s2) => {
      let h = (x * 374761393 + y * 668265263 + s2 * 2246822519) >>> 0;
      h = (h ^ (h >> 13)) >>> 0;
      h = (h * 1274126177) >>> 0;
      return ((h ^ (h >> 16)) >>> 0) / 4294967296;
    };
    const wrap = (v, m) => ((v % m) + m) % m;
    for (let yy = 0; yy < size; yy++) {
      for (let xx = 0; xx < size; xx++) {
        let n = 0, amp = 0.52;
        for (let o = 0; o < 4; o++) {
          const cn = baseCells << o;
          const sx = (xx / size) * cn, sy = (yy / size) * cn;
          const xi = Math.floor(sx), yi = Math.floor(sy);
          const fx = sx - xi, fy = sy - yi;
          const ux = fx * fx * (3 - 2 * fx), uy = fy * fy * (3 - 2 * fy);
          const A = hash(wrap(xi, cn), wrap(yi, cn), seed + o * 911);
          const B = hash(wrap(xi + 1, cn), wrap(yi, cn), seed + o * 911);
          const C = hash(wrap(xi, cn), wrap(yi + 1, cn), seed + o * 911);
          const D = hash(wrap(xi + 1, cn), wrap(yi + 1, cn), seed + o * 911);
          n += amp * (A + (B - A) * ux + (C - A) * uy + (A - B - C + D) * ux * uy);
          amp *= 0.55;
        }
        const i4 = (yy * size + xx) * 4;
        const lum = Math.max(0, n - 0.52) / 0.48;      // keep the bright crests of the field
        d[i4] = 232; d[i4 + 1] = 240; d[i4 + 2] = 255;
        d[i4 + 3] = Math.round(Math.min(1, lum * lum * 2.6) * 255);
      }
    }
    g.putImageData(img, 0, 0);
    return c;
  }

  /* ---------- sample the centerline into screen-space arrays ---------- */
  function sampleGeometry() {
    const S = MZ.S;
    const path = MZ.els.dPath;
    const vb = MZ.els.divider.viewBox.baseVal;
    const VBW = vb.width || 100, VBH = vb.height || 100;
    const L = path.getTotalLength() || 0.001;
    const rw = MZ.riverW || 90;
    N = Math.max(120, Math.min(240, Math.round(S.vh / 5.5)));
    px = new Float32Array(N); py = new Float32Array(N);
    tx = new Float32Array(N); ty = new Float32Array(N);
    wq = new Float32Array(N);
    for (let i = 0; i < N; i++) {
      const pt = path.getPointAtLength((i / (N - 1)) * L);
      px[i] = (pt.x / VBW) * S.vw;
      py[i] = (pt.y / VBH) * S.vh;
    }
    for (let i = 0; i < N; i++) {
      const a = Math.max(0, i - 1), b = Math.min(N - 1, i + 1);
      const dx = px[b] - px[a], dy = py[b] - py[a];
      const l = Math.hypot(dx, dy) || 1;
      tx[i] = dx / l; ty[i] = dy / l;
      wq[i] = rw * (0.945 + 0.055 * Math.sin(i * 0.215 + 1.4) * Math.cos(i * 0.083 - 0.6));
    }
    cum = new Float32Array(N);
    for (let i = 1; i < N; i++) cum[i] = cum[i - 1] + Math.hypot(px[i] - px[i - 1], py[i] - py[i - 1]);
    Lscr = cum[N - 1] || 1;
  }

  /* point + unit normal + local width at param f (fraction of river, same space as boat p) */
  function pointAt(f) {
    const u = Math.max(0, Math.min(1, f)) * (N - 1);
    const i = Math.min(N - 2, Math.floor(u));
    const t = u - i;
    const nx0 = -ty[i], ny0 = tx[i], nx1 = -ty[i + 1], ny1 = tx[i + 1];
    return {
      x: px[i] + (px[i + 1] - px[i]) * t,
      y: py[i] + (py[i + 1] - py[i]) * t,
      tx: tx[i] + (tx[i + 1] - tx[i]) * t,
      ty: ty[i] + (ty[i + 1] - ty[i]) * t,
      nx: nx0 + (nx1 - nx0) * t,
      ny: ny0 + (ny1 - ny0) * t,
      w: wq[i] + (wq[i + 1] - wq[i]) * t,
    };
  }

  /* ---------- static river painting (baked once per resize) ---------- */
  function paintStatic() {
    staticLayer = document.createElement('canvas');
    staticLayer.width = Math.round(LW * dpr);
    staticLayer.height = Math.round(LH * dpr);
    const g = staticLayer.getContext('2d');
    g.setTransform(dpr, 0, 0, dpr, 0, 0);
    g.lineJoin = 'round';

    const ribbon = () => {
      g.beginPath();
      for (let i = 0; i < N; i++) {
        const nx = -ty[i] * (wq[i] / 2), ny = tx[i] * (wq[i] / 2);
        i ? g.lineTo(px[i] + nx, py[i] + ny) : g.moveTo(px[i] + nx, py[i] + ny);
      }
      for (let i = N - 1; i >= 0; i--) {
        const nx = -ty[i] * (wq[i] / 2), ny = tx[i] * (wq[i] / 2);
        g.lineTo(px[i] - nx, py[i] - ny);
      }
      g.closePath();
    };
    const edgePath = (side) => {
      g.beginPath();
      for (let i = 0; i < N; i++) {
        const off = (side * wq[i]) / 2;
        const X = px[i] - ty[i] * off, Y = py[i] + tx[i] * off;
        i ? g.lineTo(X, Y) : g.moveTo(X, Y);
      }
    };

    // soft ridge glow just outside the water (painted first; water covers its inner half)
    g.strokeStyle = 'rgba(150,175,225,0.10)';
    g.lineWidth = 14;
    ribbon(); g.stroke();

    // land shadow hugging the outside of the banks (clip = everything but ribbon)
    g.save();
    g.beginPath(); g.rect(0, 0, LW, LH); ribbon();
    g.clip('evenodd');
    g.strokeStyle = 'rgba(0,2,8,0.62)';
    g.lineWidth = 10;
    ribbon(); g.stroke();
    g.restore();

    // ---- water body ----
    g.save();
    ribbon(); g.clip();

    const grad = g.createLinearGradient(0, 0, 0, LH);
    grad.addColorStop(0, '#152238');
    grad.addColorStop(0.5, '#20406e');
    grad.addColorStop(1, '#131f37');
    g.fillStyle = grad;
    g.fill();

    // macro noise clouds (big stretched pass)
    const T1 = noiseTile(320, 5, 77);
    g.save();
    g.globalAlpha = 0.5;
    g.translate(LW / 2, LH / 2);
    g.rotate(0.7);
    g.drawImage(T1, -LW * 0.75, -LH * 0.75, LW * 1.5, LH * 1.5);
    g.restore();

    // micro ripple tiling (fine grain, slight rotation)
    const T2 = noiseTile(256, 9, 301);
    g.save();
    g.globalAlpha = 0.30;
    g.rotate(-0.35);
    g.scale(0.42, 0.42);
    g.fillStyle = g.createPattern(T2, 'repeat');
    g.fillRect(0, 0, (LW / 0.42) * 1.6 + 256, (LH / 0.42) * 1.6 + 256);
    g.restore();

    // gentle sheen band down the middle of the channel
    g.strokeStyle = 'rgba(140,180,255,0.10)';
    g.lineWidth = (MZ.riverW || 90) * 0.55;
    g.beginPath();
    for (let i = 0; i < N; i++) { i ? g.lineTo(px[i], py[i]) : g.moveTo(px[i], py[i]); }
    g.stroke();

    // shoreline depth shading inside both edges (outer half clipped away)
    g.strokeStyle = 'rgba(3,7,16,0.40)';
    g.lineWidth = 16;
    edgePath(1); g.stroke();
    edgePath(-1); g.stroke();

    g.restore();

    // gravel bank edge (thin, crisp, half-in/half-out)
    g.strokeStyle = 'rgba(205,214,232,0.25)';
    g.lineWidth = 2.5;
    ribbon(); g.stroke();
  }

  /* ---------- particles: streaks (flow), glints (twinkle), specks (bank foam) ---------- */
  function seedParticles() {
    const r = rng(20260);
    streaks = []; glints = []; specks = [];
    for (let k = 0; k < 36; k++) {
      streaks.push({
        s: r(), lane: (r() * 2 - 1) * 0.72,
        len: 34 + r() * 72, v: 26 + r() * 38,
        w: 1.2 + r() * 2.4, a: 0.05 + r() * 0.20,
      });
    }
    for (let k = 0; k < 22; k++) {
      glints.push({
        s: r(), lane: (r() * 2 - 1) * 0.30,
        len: 7 + r() * 10, v: 46 + r() * 42,
        w: 0.9 + r() * 1.1, a: 0.10 + r() * 0.16,
        f: 1.5 + r() * 2.2, ph: r() * TAU,
      });
    }
    for (let k = 0; k < 26; k++) {
      const side = k % 2 ? 1 : -1;
      specks.push({
        s: r(), lane: side * (0.62 + r() * 0.27),
        r0: 0.7 + r() * 1.2, v: 12 + r() * 14,
        a: 0.10 + r() * 0.12, f: 0.8 + r() * 1.6, ph: r() * TAU,
      });
    }
  }

  /* ---------- animated frame ---------- */
  function drawStreak(st, alpha) {
    const k = (st.len / Lscr) / 2;
    const A = pointAt(st.s - k), B = pointAt(st.s + k);
    const hA = st.lane * (A.w / 2) * 0.86, hB = st.lane * (B.w / 2) * 0.86;
    ctx.strokeStyle = 'rgba(205,225,255,' + alpha.toFixed(3) + ')';
    ctx.lineWidth = st.w;
    ctx.beginPath();
    ctx.moveTo(A.x + A.nx * hA, A.y + A.ny * hA);
    ctx.lineTo(B.x + B.nx * hB, B.y + B.ny * hB);
    ctx.stroke();
  }

  function drawWake(p) {
    const B = pointAt(p);
    const bw = (MZ.riverW || 90) * 0.8;
    const tailx = B.x - B.tx * bw * 0.42, taily = B.y - B.ty * bw * 0.42;
    ctx.strokeStyle = 'rgba(214,234,255,0.28)';
    ctx.lineWidth = 1.6;
    for (const sgn of [-1, 1]) {
      ctx.beginPath();
      ctx.moveTo(tailx + B.nx * sgn * 6, taily + B.ny * sgn * 6);
      ctx.quadraticCurveTo(
        tailx - B.tx * 22 + B.nx * sgn * 13, taily - B.ty * 22 + B.ny * sgn * 13,
        tailx - B.tx * 40 + B.nx * sgn * 23, taily - B.ty * 40 + B.ny * sgn * 23);
      ctx.stroke();
    }
    ctx.fillStyle = 'rgba(222,238,255,0.38)';
    for (let k = 0; k < 3; k++) {
      const wob = Math.sin(time * 7 + k * 2.1);
      ctx.beginPath();
      ctx.arc(tailx - B.tx * (8 + k * 9) + B.nx * wob * 4, taily - B.ty * (8 + k * 9) + B.ny * wob * 4, 1.4, 0, TAU);
      ctx.fill();
    }
  }

  function tick(tms, dtms) {
    if (!ctx || !cvs) return;
    const dt = Math.min(0.05, Math.max(0.001, (dtms || 16) / 1000));
    if (cvs.style.visibility === 'hidden' || gsap.getProperty(cvs, 'opacity') < 0.01) return;
    time += dt;
    if (flowMul !== 1) flowMul += (1 - flowMul) * Math.min(1, dt * 1.9);

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, LW, LH);
    ctx.drawImage(staticLayer, 0, 0, LW, LH);
    ctx.lineCap = 'round';

    for (const st of streaks) {
      st.s += (st.v * dt * flowMul) / Lscr;
      if (st.s > 1) st.s -= 1;
      drawStreak(st, st.a);
    }
    for (const gl of glints) {
      gl.s += (gl.v * dt * flowMul) / Lscr;
      if (gl.s > 1) gl.s -= 1;
      drawStreak(gl, gl.a * (0.5 + 0.5 * Math.sin(time * gl.f + gl.ph)));
    }
    ctx.fillStyle = 'rgba(224,238,255,1)';
    for (const sp of specks) {
      sp.s = (sp.s + (sp.v * dt * flowMul) / Lscr) % 1;
      const P = pointAt(sp.s);
      const a = sp.a * (0.55 + 0.45 * Math.sin(time * sp.f + sp.ph));
      if (a <= 0.01) continue;
      ctx.globalAlpha = a;
      ctx.beginPath();
      ctx.arc(P.x + P.nx * sp.lane * (P.w / 2) * 0.94, P.y + P.ny * sp.lane * (P.w / 2) * 0.94, sp.r0, 0, TAU);
      ctx.fill();
    }
    ctx.globalAlpha = 1;

    drawWake(Math.max(0, Math.min(1, MZ.boat.p)));
  }

  /* ---------- boot / resize ---------- */
  function rebuild() {
    if (!MZ.S || !MZ.els.riverCanvas || !MZ.els.dPath || !MZ.els.divider) return;
    const S = MZ.S;
    LW = S.vw; LH = S.vh;
    dpr = Math.min(window.devicePixelRatio || 1, 2);
    cvs = MZ.els.riverCanvas;
    cvs.width = Math.round(LW * dpr);
    cvs.height = Math.round(LH * dpr);
    cvs.style.width = LW + 'px';
    cvs.style.height = LH + 'px';
    ctx = cvs.getContext('2d');
    sampleGeometry();
    paintStatic();
    if (!inited) {
      seedParticles();
      inited = true;
      gsap.ticker.add(tick);
    }
  }

  MZ.riverRebuild = rebuild;
  MZ.riverBoost = () => { flowMul = 2.2; };
  MZ.riverDebug = () => ({ N, Lscr: Math.round(Lscr), flowMul: Math.round(flowMul * 100) / 100,
    st0: streaks[0] && Math.round(streaks[0].s * 1000) / 1000, time: Math.round(time * 100) / 100 });
})();
