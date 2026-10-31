/* Shadow Heist - hint solver. Breadth-first search over the same engine, so hints are always legal and shortest. */
(function (G) {
  const SH = (G.SH = G.SH || {});
  const ORDER = ['U', 'D', 'L', 'R', 'W'];
  const tick = () => new Promise((r) => setTimeout(r, 0));

  // Resolves to a string of moves from state s0 to a win, or null if none found within the cap.
  SH.solve = async function (lv, s0, opts) {
    opts = opts || {};
    const cap = opts.cap || 600000, slice = opts.slice || 25;
    const states = [s0], parent = [-1], mv = [''];
    const seen = new Set([SH.key(s0)]);
    let head = 0, t0 = Date.now();
    while (head < states.length) {
      const st = states[head];
      for (let d = 0; d < 5; d++) {
        const c = ORDER[d], v = SH.DIRS[c];
        const r = SH.step(lv, st, v[0], v[1]);
        if (r.r === 'blocked' || r.r === 'lose') continue;
        if (r.r === 'win') {
          let out = c, i = head;
          while (parent[i] >= 0) { out = mv[i] + out; i = parent[i]; }
          return out;
        }
        const k = SH.key(r.s);
        if (seen.has(k)) continue;
        seen.add(k); states.push(r.s); parent.push(head); mv.push(c);
        if (states.length > cap) return null;
      }
      head++;
      if (Date.now() - t0 > slice) {
        t0 = Date.now();
        if (opts.onProgress) opts.onProgress(states.length);
        await tick();
        if (opts.cancelled && opts.cancelled()) return null;
      }
    }
    return null;
  };
})(typeof window !== 'undefined' ? window : globalThis);
