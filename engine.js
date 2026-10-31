/* Shadow Heist - rules engine. Pure functions, no DOM, so it can be tested in Node. */
(function (G) {
  const SH = (G.SH = G.SH || {});
  const DIRS = { U: [0, -1], D: [0, 1], L: [-1, 0], R: [1, 0], W: [0, 0] };
  SH.DIRS = DIRS;

  // Turn a map (array of strings) into an immutable level description.
  SH.parse = function (rows) {
    const h = rows.length, w = rows[0].length, N = w * h;
    const lv = {
      w, h, N, wall: new Uint8Array(N), ice: new Uint8Array(N),
      por: new Int16Array(N).fill(-1), gemId: new Int8Array(N).fill(-1),
      exit: -1, start: -1, gemCells: [], boxes: [], guards: [],
      mech: { guards: false, crates: false, ice: false, portals: false },
    };
    const pp = {};
    for (let y = 0; y < h; y++) {
      for (let x = 0; x < w; x++) {
        const c = rows[y][x], i = y * w + x;
        if (c === '#') lv.wall[i] = 1;
        else if (c === '~') { lv.ice[i] = 1; lv.mech.ice = true; }
        else if (c === '*') { lv.gemId[i] = lv.gemCells.length; lv.gemCells.push(i); }
        else if (c === 'B') { lv.boxes.push(i); lv.mech.crates = true; }
        else if (c === 'P') lv.start = i;
        else if (c === 'E') lv.exit = i;
        else if (c >= '1' && c <= '9') (pp[c] = pp[c] || []).push(i);
        else if ('hHvV'.includes(c)) {
          lv.guards.push(i, c === 'h' ? 1 : c === 'H' ? -1 : 0, c === 'v' ? 1 : c === 'V' ? -1 : 0);
          lv.mech.guards = true;
        }
      }
    }
    lv.portalKind = {};
    for (const c in pp) {
      if (pp[c].length === 2) {
        lv.por[pp[c][0]] = pp[c][1]; lv.por[pp[c][1]] = pp[c][0];
        lv.portalKind[pp[c][0]] = lv.portalKind[pp[c][1]] = +c;
        lv.mech.portals = true;
      }
    }
    return lv;
  };

  SH.initial = function (lv) {
    return {
      p: lv.start,
      mask: (1 << lv.gemCells.length) - 1, // bit set = gem still on the board
      boxes: lv.boxes.slice().sort((a, b) => a - b),
      gd: lv.guards.slice(),
    };
  };

  SH.key = function (s) { return s.p + '|' + s.mask + '|' + s.boxes.join(',') + '|' + s.gd.join(','); };

  // One turn. dx,dy = 0,0 means wait.
  // Returns { r: 'blocked' | 'ok' | 'lose' | 'win', s: newState, ev: {gem,push,tp,slide} }
  SH.step = function (lv, s, dx, dy) {
    const w = lv.w, h = lv.h, ev = {};
    let p = s.p, mask = s.mask, boxes = s.boxes;
    const gd = s.gd;
    const gAt = (i) => { for (let k = 0; k < gd.length; k += 3) if (gd[k] === i) return true; return false; };

    if (dx || dy) {
      const px = p % w, py = (p / w) | 0, nx = px + dx, ny = py + dy;
      if (nx < 0 || ny < 0 || nx >= w || ny >= h) return { r: 'blocked' };
      let n = ny * w + nx;
      if (lv.wall[n]) return { r: 'blocked' };
      if (boxes.includes(n)) {
        const bx = nx + dx, by = ny + dy;
        if (bx < 0 || by < 0 || bx >= w || by >= h) return { r: 'blocked' };
        const b = by * w + bx, gid = lv.gemId[b];
        if (lv.wall[b] || boxes.includes(b) || (gid >= 0 && (mask >> gid) & 1) ||
            b === lv.exit || lv.por[b] >= 0 || gAt(b)) return { r: 'blocked' };
        boxes = boxes.map((q) => (q === n ? b : q)).sort((a, c) => a - c);
        ev.push = true;
      }
      if (lv.por[n] >= 0) { n = lv.por[n]; ev.tp = true; }
      let cur = n, lost = false;
      for (;;) {
        const id = lv.gemId[cur];
        if (id >= 0 && (mask >> id) & 1) { mask &= ~(1 << id); ev.gem = true; }
        p = cur;
        if (gAt(cur)) { lost = true; break; }
        if (!lv.ice[cur]) break;
        const cx = (cur % w) + dx, cy = ((cur / w) | 0) + dy;
        if (cx < 0 || cy < 0 || cx >= w || cy >= h) break;
        const a = cy * w + cx;
        if (lv.wall[a] || boxes.includes(a)) break;
        cur = a; ev.slide = true;
      }
      if (lost) return { r: 'lose', s: { p, mask, boxes, gd }, ev };
    }
    if (mask === 0 && p === lv.exit) return { r: 'win', s: { p, mask, boxes, gd }, ev };

    // Guards move one step each, turning around at walls and crates.
    const ng = gd.slice();
    let caught = false;
    const solid = (x, y) => x < 0 || y < 0 || x >= w || y >= h || lv.wall[y * w + x] === 1 || boxes.includes(y * w + x);
    for (let k = 0; k < ng.length; k += 3) {
      const gi = ng[k], gx = gi % w, gy = (gi / w) | 0;
      let ax = ng[k + 1], ay = ng[k + 2], tx = gx + ax, ty = gy + ay;
      if (solid(tx, ty)) {
        ax = -ax; ay = -ay; tx = gx + ax; ty = gy + ay;
        if (solid(tx, ty)) { ng[k + 1] = ax; ng[k + 2] = ay; continue; }
      }
      const ti = ty * w + tx;
      ng[k] = ti; ng[k + 1] = ax; ng[k + 2] = ay;
      if (ti === p || (ti === s.p && gi === p)) caught = true;
    }
    return { r: caught ? 'lose' : 'ok', s: { p, mask, boxes, gd: ng }, ev };
  };

  // Play a string of moves (U D L R W) from the start. Returns { s, hist, moves } or null if invalid.
  SH.replay = function (lv, str) {
    let s = SH.initial(lv); const hist = []; let moves = '';
    for (const c of str) {
      const d = DIRS[c]; if (!d) return null;
      const r = SH.step(lv, s, d[0], d[1]);
      if (r.r === 'blocked' || r.r === 'lose') return null;
      hist.push(s); moves += c; s = r.s;
      if (r.r === 'win') return { s, hist, moves, won: true };
    }
    return { s, hist, moves, won: false };
  };

  // Star rating from moves used vs the best possible number of moves.
  SH.stars = function (moves, opt, age) {
    const extra = age === 'kid' ? 1.6 : 1;
    const t3 = opt + Math.floor(opt * 0.1 * extra) + (age === 'kid' ? 2 : 0);
    const t2 = opt + Math.max(2, Math.floor(opt * 0.4 * extra)) + (age === 'kid' ? 3 : 0);
    return moves <= t3 ? 3 : moves <= t2 ? 2 : 1;
  };
})(typeof window !== 'undefined' ? window : globalThis);
