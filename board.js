/* Shadow Heist - board drawing, animation and swipe input. */
(function (G) {
  const SH = (G.SH = G.SH || {});
  const $ = (id) => document.getElementById(id);
  const B = (SH.board = {});
  let cv, cx, wrap, lv = null, cur = null, avatar = '🥷', face = null, arrowsOn = true, calm = false;
  let W = 10, H = 10, dpr = 1, cs = 10, ox = 0, oy = 0, hintDir = null, shakeT = 0, parts = [], msgT = null, running = false, lastDraw = 0;
  const A = { t0: 0, dur: 0, p0: { x: 0, y: 0 }, p1: { x: 0, y: 0 }, g0: [], g1: [], b0: [], b1: [] };
  const PORTAL = ['#9b7bff', '#35d0ff', '#ff6fb1', '#7dff6f'];
  const PORTAL_EMOJI = ['🌀', '🔮', '🧿', '🌐'];
  const xy = (i) => ({ x: i % lv.w, y: (i / lv.w) | 0 });
  const rr = (x, y, w, h, r) => { cx.beginPath(); cx.moveTo(x + r, y); cx.arcTo(x + w, y, x + w, y + h, r); cx.arcTo(x + w, y + h, x, y + h, r); cx.arcTo(x, y + h, x, y, r); cx.arcTo(x, y, x + w, y, r); cx.closePath(); };

  function guardNext(s, k) {
    const w = lv.w, h = lv.h, gi = s.gd[k], gx = gi % w, gy = (gi / w) | 0, boxes = s.boxes;
    const solid = (x, y) => x < 0 || y < 0 || x >= w || y >= h || lv.wall[y * w + x] === 1 || boxes.includes(y * w + x);
    let ax = s.gd[k + 1], ay = s.gd[k + 2];
    if (solid(gx + ax, gy + ay)) { ax = -ax; ay = -ay; if (solid(gx + ax, gy + ay)) return { x: gx, y: gy, ax, ay, stuck: true }; }
    return { x: gx + ax, y: gy + ay, ax, ay };
  }

  B.resize = function () {
    if (!wrap) return;
    const r = wrap.getBoundingClientRect();
    dpr = Math.min(G.devicePixelRatio || 1, 3);
    W = Math.max(10, Math.floor(r.width * dpr)); H = Math.max(10, Math.floor(r.height * dpr));
    cv.width = W; cv.height = H; layout(); B.draw(performance.now());
  };
  function layout() {
    if (!lv) return;
    const pad = 8 * dpr;
    cs = Math.floor(Math.min((W - pad * 2) / lv.w, (H - pad * 2) / lv.h));
    cs = Math.max(8, Math.min(cs, Math.floor(104 * dpr)));
    ox = Math.floor((W - cs * lv.w) / 2); oy = Math.floor((H - cs * lv.h) / 2);
  }

  B.load = function (level, av, opts) {
    lv = level; cur = null; avatar = av; face = null; hintDir = null; parts = []; arrowsOn = opts.arrows; calm = opts.reduce;
    layout();
  };
  B.options = function (opts) { arrowsOn = opts.arrows; calm = opts.reduce; };
  B.face = (e) => { face = e; };
  B.hint = (c) => { hintDir = c; };

  // Move everything toward state s (prev = state before, for animation).
  B.set = function (s, prev, ev, instant) {
    cur = s;
    const p1 = xy(s.p), p0 = prev && !(ev && ev.tp) ? xy(prev.p) : p1;
    A.t0 = performance.now(); A.dur = instant || calm ? 0 : (ev && ev.slide ? 200 : 130);
    A.p0 = p0; A.p1 = p1; A.g0 = []; A.g1 = []; A.b0 = []; A.b1 = [];
    for (let k = 0; k < s.gd.length; k += 3) { A.g1.push(xy(s.gd[k])); A.g0.push(prev ? xy(prev.gd[k]) : xy(s.gd[k])); }
    const old = prev ? prev.boxes : s.boxes, gone = old.filter((b) => !s.boxes.includes(b));
    s.boxes.forEach((b) => { A.b1.push(xy(b)); A.b0.push(xy(old.includes(b) || !gone.length ? b : gone[0])); });
    if (ev && ev.gem) B.burst(p1.x, p1.y, '#ffd75e');
    if (ev && ev.tp) B.burst(p1.x, p1.y, '#9b7bff');
    B.draw(performance.now());
  };

  B.burst = function (gx, gy, color) {
    if (calm) return;
    for (let i = 0; i < 14; i++) { const a = Math.random() * 6.283, v = 1 + Math.random() * 2.6; parts.push({ x: gx + 0.5, y: gy + 0.5, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 1, c: color }); }
  };
  B.confetti = function () {
    if (calm || !lv) return;
    for (let i = 0; i < 70; i++) parts.push({ x: Math.random() * lv.w, y: -0.5, vx: (Math.random() - 0.5) * 1.5, vy: 1 + Math.random() * 2, life: 2, c: ['#ffcc4d', '#3ddc97', '#62b6ff', '#ff6fb1', '#9b7bff'][i % 5] });
  };
  B.shake = function () { shakeT = calm ? 0 : 1; };
  B.msg = function (text, ms) {
    const m = $('board-msg'); m.innerHTML = text ? `<span>${text}</span>` : ''; m.classList.toggle('show', !!text);
    clearTimeout(msgT); if (text && ms) msgT = setTimeout(() => m.classList.remove('show'), ms);
  };

  B.draw = function (now) {
    if (!cx || !lv || !cur) return;
    const t = A.dur ? Math.min(1, (now - A.t0) / A.dur) : 1, e = 1 - (1 - t) * (1 - t);
    const L = (a, b) => ({ x: a.x + (b.x - a.x) * e, y: a.y + (b.y - a.y) * e });
    cx.clearRect(0, 0, W, H);
    cx.save();
    const sh = shakeT > 0 ? Math.sin(now / 18) * 6 * dpr * shakeT : 0; if (shakeT > 0) shakeT = Math.max(0, shakeT - 0.06);
    cx.translate(ox + sh, oy);
    const ready = cur.mask === 0, w = lv.w, h = lv.h, g = Math.max(1, cs * 0.03);
    cx.textAlign = 'center'; cx.textBaseline = 'middle';
    const em = (s, x, y, sc, a) => { cx.globalAlpha = a == null ? 1 : a; cx.fillStyle = '#fff'; cx.font = Math.floor(cs * sc) + "px 'Apple Color Emoji','Segoe UI Emoji','Noto Color Emoji',sans-serif"; cx.fillText(s, x * cs + cs / 2, y * cs + cs / 2 + cs * 0.04); cx.globalAlpha = 1; };

    for (let y = 0; y < h; y++) for (let x = 0; x < w; x++) {
      const i = y * w + x, px = x * cs + g, py = y * cs + g, s = cs - g * 2;
      if (lv.wall[i]) {
        const gr = cx.createLinearGradient(px, py, px, py + s); gr.addColorStop(0, '#5a63b8'); gr.addColorStop(1, '#343c80');
        cx.fillStyle = gr; rr(px, py, s, s, cs * 0.16); cx.fill();
        cx.fillStyle = 'rgba(255,255,255,.12)'; rr(px + s * 0.1, py + s * 0.08, s * 0.8, s * 0.14, cs * 0.06); cx.fill();
      } else {
        cx.fillStyle = (x + y) % 2 ? '#1a1f42' : '#20274f'; rr(px, py, s, s, cs * 0.14); cx.fill();
        if (lv.ice[i]) {
          cx.fillStyle = 'rgba(110,205,255,.38)'; rr(px, py, s, s, cs * 0.14); cx.fill();
          cx.strokeStyle = 'rgba(255,255,255,.55)'; cx.lineWidth = Math.max(1, cs * 0.04); cx.beginPath();
          cx.moveTo(px + s * 0.2, py + s * 0.75); cx.lineTo(px + s * 0.5, py + s * 0.25); cx.moveTo(px + s * 0.5, py + s * 0.8); cx.lineTo(px + s * 0.78, py + s * 0.4); cx.stroke();
        }
      }
    }
    for (const i in lv.portalKind) {
      const k = (lv.portalKind[i] - 1) % 4, c = xy(+i), gr = cx.createRadialGradient((c.x + .5) * cs, (c.y + .5) * cs, cs * .05, (c.x + .5) * cs, (c.y + .5) * cs, cs * .5);
      gr.addColorStop(0, PORTAL[k] + 'ee'); gr.addColorStop(1, PORTAL[k] + '11');
      cx.fillStyle = gr; cx.beginPath(); cx.arc((c.x + .5) * cs, (c.y + .5) * cs, cs * .46, 0, 6.283); cx.fill();
      em(PORTAL_EMOJI[k], c.x, c.y, .6);
    }
    // exit
    const ex = xy(lv.exit);
    if (ready) { const pu = 0.5 + 0.5 * Math.sin(now / 220); cx.strokeStyle = `rgba(255,204,77,${0.55 + pu * 0.45})`; cx.lineWidth = Math.max(2, cs * 0.07); rr(ex.x * cs + g * 2, ex.y * cs + g * 2, cs - g * 4, cs - g * 4, cs * 0.16); cx.stroke(); }
    em('🚪', ex.x, ex.y, .74, ready ? 1 : 0.4);
    // gems
    for (let k = 0; k < lv.gemCells.length; k++) if ((cur.mask >> k) & 1) { const c = xy(lv.gemCells[k]); em('💎', c.x, c.y - Math.sin(now / 300 + k) * 0.04, .66 + Math.sin(now / 250 + k) * 0.03); }
    // hint
    if (hintDir) {
      const pc = L(A.p0, A.p1), d = SH.DIRS[hintDir], pu = 0.5 + 0.5 * Math.sin(now / 160);
      if (hintDir === 'W') em('⏳', pc.x, pc.y - 0.55, .5, 0.6 + pu * 0.4);
      else {
        cx.fillStyle = `rgba(255,204,77,${0.25 + pu * 0.35})`; rr((pc.x + d[0]) * cs + g, (pc.y + d[1]) * cs + g, cs - g * 2, cs - g * 2, cs * 0.14); cx.fill();
        em({ U: '⬆️', D: '⬇️', L: '⬅️', R: '➡️' }[hintDir], pc.x + d[0] * (0.55 + pu * 0.15), pc.y + d[1] * (0.55 + pu * 0.15), .5);
      }
    }
    // guards: danger tile + arrow, then crates, guards, player
    for (let k = 0; k < cur.gd.length; k += 3) {
      const n = guardNext(cur, k);
      if (arrowsOn && !n.stuck) { cx.fillStyle = 'rgba(255,80,100,.26)'; rr(n.x * cs + g, n.y * cs + g, cs - g * 2, cs - g * 2, cs * 0.14); cx.fill(); }
    }
    for (let k = 0; k < A.b1.length; k++) { const b = L(A.b0[k], A.b1[k]); em('📦', b.x, b.y, .78); }
    for (let k = 0; k < cur.gd.length; k += 3) {
      const gp = L(A.g0[k / 3], A.g1[k / 3]), n = guardNext(cur, k);
      cx.fillStyle = 'rgba(255,60,80,.22)'; cx.beginPath(); cx.arc((gp.x + .5) * cs, (gp.y + .5) * cs, cs * .44, 0, 6.283); cx.fill();
      em('👮', gp.x, gp.y, .72);
      if (arrowsOn && !n.stuck) {
        const cxp = (gp.x + .5 + n.ax * .36) * cs, cyp = (gp.y + .5 + n.ay * .36) * cs, sz = cs * .13;
        cx.fillStyle = '#ff4d6a'; cx.beginPath();
        cx.moveTo(cxp + n.ax * sz * 1.4, cyp + n.ay * sz * 1.4); cx.lineTo(cxp - n.ay * sz - n.ax * sz * .4, cyp + n.ax * sz - n.ay * sz * .4); cx.lineTo(cxp + n.ay * sz - n.ax * sz * .4, cyp - n.ax * sz - n.ay * sz * .4); cx.closePath(); cx.fill();
      }
    }
    const pp = L(A.p0, A.p1);
    cx.fillStyle = 'rgba(0,0,0,.28)'; cx.beginPath(); cx.ellipse((pp.x + .5) * cs, (pp.y + .86) * cs, cs * .26, cs * .08, 0, 0, 6.283); cx.fill();
    em(face || avatar, pp.x, pp.y - (face ? 0 : Math.abs(Math.sin(now / 400)) * 0.02), .76);
    // particles
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i]; p.x += p.vx * 0.016; p.y += p.vy * 0.016; p.life -= 0.02; if (p.life <= 0) { parts.splice(i, 1); continue; }
      cx.globalAlpha = Math.min(1, p.life); cx.fillStyle = p.c; cx.beginPath(); cx.arc(p.x * cs, p.y * cs, cs * 0.045, 0, 6.283); cx.fill(); cx.globalAlpha = 1;
    }
    cx.restore();
  };

  B.start = function () {
    if (running) return; running = true;
    const loop = (now) => {
      requestAnimationFrame(loop);
      if (!$('s-game').classList.contains('active')) return;
      const busy = parts.length || shakeT > 0 || now - A.t0 < A.dur + 40;
      if (calm && !busy) return;
      if (now - lastDraw < 32 && !busy) return;
      lastDraw = now; B.draw(now);
    };
    requestAnimationFrame(loop);
  };

  // Swipe: fires as soon as the finger moves far enough, so fast play feels responsive.
  B.init = function (onMove) {
    cv = $('board'); cx = cv.getContext('2d'); wrap = $('board-wrap');
    let sx = 0, sy = 0, down = false, fired = false;
    wrap.addEventListener('pointerdown', (e) => { down = true; fired = false; sx = e.clientX; sy = e.clientY; try { wrap.setPointerCapture(e.pointerId); } catch (x) { /* ignore */ } });
    wrap.addEventListener('pointermove', (e) => {
      if (!down || fired) return;
      const dx = e.clientX - sx, dy = e.clientY - sy;
      if (Math.max(Math.abs(dx), Math.abs(dy)) < 26) return;
      fired = true; onMove(Math.abs(dx) > Math.abs(dy) ? (dx > 0 ? 'R' : 'L') : (dy > 0 ? 'D' : 'U'));
    });
    const up = () => { down = false; };
    wrap.addEventListener('pointerup', up); wrap.addEventListener('pointercancel', up);
    G.addEventListener('resize', B.resize); G.addEventListener('orientationchange', () => setTimeout(B.resize, 250));
    B.start();
  };
})(typeof window !== 'undefined' ? window : globalThis);
