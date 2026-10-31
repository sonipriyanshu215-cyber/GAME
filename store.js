/* Shadow Heist - player profiles and progress. Saved on this device (localStorage). */
(function (G) {
  const SH = (G.SH = G.SH || {});
  const KEY = 'shadowheist.v2';
  let mem = null;
  let data = { active: null, profiles: {} };

  function read() { try { return localStorage.getItem(KEY); } catch (e) { return mem; } }
  function write(t) { mem = t; try { localStorage.setItem(KEY, t); } catch (e) { /* private mode */ } }

  const day = (d) => { d = d || new Date(); return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0'); };

  function blank(o) {
    return {
      id: 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5),
      name: o.name, avatar: o.avatar, age: o.age, created: Date.now(),
      progress: 0,            // how many levels passed in order (also = index of the next level to play)
      stars: {},              // levelIndex -> 1..3
      best: {},               // levelIndex -> best move count
      skipped: {},
      coins: 0, hints: o.age === 'kid' ? 8 : 5,
      streak: 0, lastDay: '', dailyDone: '',
      lastLevel: 0,           // level the player was on when they last left
      saved: null,            // { lv, moves } unfinished level, restored exactly on return
      seen: {},               // tutorials already shown
      stats: { wins: 0, moves: 0, undos: 0, hints: 0, busts: 0, perfect: 0, noHint: 0, minutes: 0, restarts: 0 },
      set: { sound: true, vibe: true, arrows: true, pad: false, study: false, reduce: false },
    };
  }

  const S = (SH.store = {
    load() {
      try { const t = read(); if (t) { const d = JSON.parse(t); if (d && d.profiles) data = d; } } catch (e) { /* ignore */ }
      if (data.active && !data.profiles[data.active]) data.active = null;
      return S;
    },
    commit() { write(JSON.stringify(data)); },
    day,
    list() { return Object.values(data.profiles).sort((a, b) => b.created - a.created); },
    me() { return data.active ? data.profiles[data.active] : null; },
    create(o) {
      const p = blank({ name: (o.name || 'Player').trim().slice(0, 14) || 'Player', avatar: o.avatar || '🥷', age: o.age || 'teen' });
      data.profiles[p.id] = p; data.active = p.id; S.commit(); return p;
    },
    switchTo(id) { if (data.profiles[id]) { data.active = id; S.commit(); } return S.me(); },
    remove(id) {
      delete data.profiles[id];
      if (data.active === id) { const l = S.list(); data.active = l.length ? l[0].id : null; }
      S.commit();
    },
    // Daily login reward. Returns null if already claimed today.
    claimDaily() {
      const p = S.me(); if (!p) return null;
      const today = day();
      if (p.lastDay === today) return null;
      const y = new Date(); y.setDate(y.getDate() - 1);
      p.streak = p.lastDay === day(y) ? p.streak + 1 : 1;
      p.lastDay = today;
      const coins = Math.min(50, 10 * p.streak), hints = p.streak % 3 === 0 ? 2 : 1;
      p.coins += coins; p.hints += hints; S.commit();
      return { streak: p.streak, coins, hints };
    },
    // Copy/paste backup so progress can move to another phone.
    exportCode() { const p = S.me(); return p ? btoa(unescape(encodeURIComponent(JSON.stringify(p)))) : ''; },
    importCode(code) {
      try {
        const p = JSON.parse(decodeURIComponent(escape(atob(code.trim()))));
        if (!p || !p.name || typeof p.progress !== 'number' || !p.set) return null;
        p.id = 'p' + Date.now().toString(36) + Math.random().toString(36).slice(2, 5);
        p.name = String(p.name).slice(0, 14);
        data.profiles[p.id] = p; data.active = p.id; S.commit(); return p;
      } catch (e) { return null; }
    },
    totalStars(p) { let t = 0; for (const k in p.stars) t += p.stars[k]; return t; },
  });
})(typeof window !== 'undefined' ? window : globalThis);
