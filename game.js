/* Shadow Heist - game flow: levels, moves, hints, win/lose, menus, boot. */
(function (G) {
  const SH = (G.SH = G.SH || {});
  const ui = SH.ui, $ = ui.$, store = SH.store, board = SH.board;
  const game = (SH.game = {});
  let i = 0, lv = null, s = null, hist = [], moves = '', status = 'play', daily = false;
  let hintPlan = null, hintsUsed = 0, solving = false, lockUntil = 0, token = 0, playerId = null, breakShown = false, session = 0;
  const me = () => store.me();
  const pop = (m) => { let n = 0; while (m) { n += m & 1; m >>= 1; } return n; };
  const NAMES = { U: '▲ Up', D: '▼ Down', L: '◀ Left', R: '▶ Right', W: '⏳ Wait' };

  function hud() {
    const p = me(); if (!p || !lv) return;
    const W = WORLDS[LEVELS[i].w], total = lv.gemCells.length;
    $('g-title').textContent = daily ? '🎯 Daily Challenge' : 'Level ' + (i + 1);
    $('g-sub').textContent = W.emoji + ' ' + W.name;
    $('g-hints').textContent = p.hints;
    $('g-gems').textContent = '💎 ' + (total - pop(s.mask)) + '/' + total;
    $('g-moves').textContent = '👣 ' + moves.length;
    $('g-best').textContent = '🎯 Par ' + LEVELS[i].o;
    $('g-hint').classList.toggle('glow', hintsUsed === 0 && moves.length >= 30 && status === 'play');
  }
  function save() {
    const p = me(); if (!p) return;
    if (!daily && i === p.progress && status === 'play') p.saved = { lv: i, moves };
    store.commit();
  }

  /* ---------- starting a level ---------- */
  game.start = function (idx, opts) {
    opts = opts || {};
    const p = me(); if (!p) return ui.profileForm(onPlayer, false);
    ui.close(true);
    i = Math.max(0, Math.min(LEVELS.length - 1, idx)); daily = !!opts.daily; playerId = p.id; token++;
    lv = SH.parse(LEVELS[i].m); s = SH.initial(lv); hist = []; moves = ''; status = 'play'; hintPlan = null; hintsUsed = 0; solving = false; lockUntil = 0;
    if (!daily && i === p.progress && p.saved && p.saved.lv === i && !opts.fresh) {
      const r = SH.replay(lv, p.saved.moves);
      if (r && !r.won) { s = r.s; hist = r.hist; moves = r.moves; } else p.saved = null;
    }
    if (!daily) p.lastLevel = i;
    store.commit();
    board.load(lv, p.avatar, { arrows: p.set.arrows, reduce: p.set.reduce });
    ui.show('s-game'); board.msg('');
    requestAnimationFrame(() => { board.resize(); board.set(s, null, null, true); });
    hud(); intro();
  };

  function intro() {
    const p = me(), L = LEVELS[i], steps = [];
    if (!daily && LEVELS.findIndex((l) => l.w === L.w) === i && !moves) steps.push((d) => ui.worldIntro(L.w, d));
    if (i === 0 && !daily) { steps.push((d) => ui.mech('move', d)); steps.push((d) => ui.mech('goal', d)); }
    ['guards', 'crates', 'ice', 'portals'].forEach((k) => { if (lv.mech[k]) steps.push((d) => ui.mech(k, d)); });
    steps.push((d) => {
      if (!p.set.study || moves) return d();
      let n = 3; lockUntil = Infinity;
      const tick = () => { if (n === 0) { lockUntil = 0; board.msg('Go! 🥷', 900); return d(); } board.msg('🧘 Study the board… ' + n); n--; setTimeout(tick, 1000); };
      tick();
    });
    (function next() { const f = steps.shift(); if (f) f(next); })();
  }

  /* ---------- moving ---------- */
  const canAct = () => status === 'play' && !ui.isOpen() && Date.now() >= lockUntil && $('s-game').classList.contains('active');

  function doMove(c) {
    if (!canAct() || !lv) return;
    const d = SH.DIRS[c], r = SH.step(lv, s, d[0], d[1]);
    if (r.r === 'blocked') { board.shake(); SH.sfx('push'); SH.vibe(15); return; }
    const prev = s; hist.push(prev); moves += c; s = r.s;
    if (hintPlan) { if (hintPlan.m[hintPlan.i] === c) { hintPlan.i++; if (hintPlan.i >= hintPlan.m.length) hintPlan = null; } else hintPlan = null; }
    board.hint(null); board.msg('');
    const ev = r.ev || {};
    if (r.r === 'lose') { status = 'lose'; }
    else {
      if (ev.gem) { SH.sfx('gem'); SH.vibe(15); } else if (ev.tp) SH.sfx('tp'); else if (ev.slide) SH.sfx('slide'); else if (ev.push) SH.sfx('push'); else SH.sfx('move');
      if (r.r === 'win') status = 'win';
    }
    board.set(s, prev, ev); hud();
    if (r.r === 'win') win(); else if (r.r === 'lose') lose(); else save();
  }
  function undo() {
    if (!hist.length || (status !== 'play' && status !== 'lose') || ui.isOpen() && status !== 'lose') return;
    ui.close(true);
    const prev = s; s = hist.pop(); moves = moves.slice(0, -1); status = 'play'; hintPlan = null;
    me().stats.undos++; board.face(null); board.hint(null); board.msg('');
    board.set(s, prev, null); SH.sfx('click'); hud(); save();
  }
  function restart(force) {
    if (!force && moves.length > 5 && status === 'play') {
      return ui.modal({ em: '🔁', title: 'Start over?', html: '<p>Your moves in this level will be cleared.</p>', row: true, btns: [{ t: 'Keep going', cls: 'good' }, { t: 'Restart', cls: 'bad', fn: () => restart(true) }] });
    }
    me().stats.restarts++; game.start(i, { daily, fresh: true });
  }

  /* ---------- hints ---------- */
  async function hint() {
    if (status !== 'play' || solving || ui.isOpen()) return;
    const p = me();
    if (hintPlan && hintPlan.i < hintPlan.m.length) return showHint();
    if (p.hints <= 0) return outOfHints();
    solving = true; const tok = token; board.msg('<span class="spin">💡</span> Thinking…');
    const res = await SH.solve(lv, s, { cancelled: () => tok !== token });
    solving = false; if (tok !== token) return;
    if (!res) { board.msg('🤔 No safe path from here. Try ↶ Undo.', 3500); SH.sfx('lose'); return; }
    p.hints--; p.stats.hints++; hintsUsed++; store.commit();
    hintPlan = { m: res, i: 0 }; hud(); showHint();
  }
  function showHint() { const c = hintPlan.m[hintPlan.i]; board.hint(c); SH.sfx('hint'); board.msg('💡 Best next move: ' + NAMES[c]); }
  function outOfHints() {
    const p = me(), can = p.coins >= 10;
    ui.modal({
      em: '💡', title: 'Out of hints',
      html: `<p>Hints help you learn the idea behind a level. Earn 🪙 coins by finishing levels and collecting daily rewards.</p><div class="kv"><span>🪙 ${p.coins} coins</span></div>`,
      btns: [{ t: can ? 'Buy 1 hint · 🪙 10' : 'Need 🪙 10 for a hint', cls: can ? 'primary' : '', fn: can ? () => { p.coins -= 10; p.hints++; store.commit(); hud(); ui.toast('Got 1 hint 💡'); } : null }, { t: 'Close' }],
    });
  }

  /* ---------- win / lose ---------- */
  function win() {
    const p = me(), L = LEVELS[i], n = moves.length, stars = SH.stars(n, L.o, p.age);
    board.face('🎉'); board.confetti(); SH.sfx('win'); SH.vibe([40, 60, 40]);
    let gain = 0;
    if (daily) { gain = 20; p.dailyDone = store.day(); }
    else {
      const prevStars = p.stars[i] || 0;
      gain = prevStars ? Math.max(0, stars - prevStars) * 5 : stars * 5 + 10;
      p.stars[i] = Math.max(prevStars, stars); p.best[i] = Math.min(p.best[i] || 999, n);
      delete p.skipped[i]; if (i >= p.progress) p.progress = i + 1;
      p.saved = null;
    }
    p.coins += gain; const st = p.stats; st.wins++; st.moves += n; if (stars === 3) st.perfect++; if (!hintsUsed) st.noHint++;
    store.commit(); hud();
    setTimeout(() => showWin(stars, gain, n), 650);
  }
  function showWin(stars, gain, n) {
    const L = LEVELS[i], next = i + 1, hasNext = next < LEVELS.length, worldDone = hasNext && LEVELS[next].w !== L.w;
    const sh = [1, 2, 3].map((k) => `<i class="${k <= stars ? 'on' : ''}" style="animation-delay:${0.15 + k * 0.22}s">⭐</i>`).join('');
    for (let k = 0; k < stars; k++) setTimeout(() => SH.sfx('star', k), 350 + k * 220);
    const verdict = stars === 3 ? 'Perfect plan!' : stars === 2 ? 'Great job!' : 'Solved it!';
    let extra = '';
    if (!daily && worldDone) extra = `<p>🎊 <b>World ${L.w + 1} complete!</b> Next: ${WORLDS[LEVELS[next].w].emoji} ${WORLDS[LEVELS[next].w].name}</p>`;
    if (!daily && !hasNext) extra = `<p>🏆 You finished all ${LEVELS.length} levels. You are a Master Thief!</p>`;
    const btns = [];
    if (daily) btns.push({ t: '🏠 Home', cls: 'primary', fn: () => ui.landing() }, { t: '🗺️ Levels', fn: () => ui.map() });
    else {
      if (hasNext) btns.push({ t: 'Next level ▶', cls: 'primary', fn: () => game.start(next) });
      if (stars < 3) btns.push({ t: '🔁 Try for ⭐⭐⭐', fn: () => game.start(i, { fresh: true }) });
      btns.push({ t: '🗺️ Levels', fn: () => ui.map() });
    }
    ui.modal({
      em: !daily && !hasNext ? '🏆' : '🎉', title: daily ? 'Daily challenge done!' : verdict, dismiss: false,
      html: `<div class="stars">${sh}</div><div class="kv"><span>👣 ${n} moves</span><span>🎯 Par ${L.o}</span><span>🪙 +${gain}</span></div>${extra}`,
      tip: ui.tip(), btns,
    });
  }
  function lose() {
    me().stats.busts++; board.face('😵'); board.shake(); SH.sfx('lose'); SH.vibe(120);
    setTimeout(() => {
      if (status !== 'lose') return;
      ui.modal({
        em: '🚨', title: 'Busted!', html: '<p>A guard caught you. No worries, mistakes are how brains grow!</p>', tip: ui.tip(),
        btns: [{ t: '↶ Undo and try again', cls: 'primary', fn: undo }, { t: '💡 Undo + hint', fn: () => { undo(); hint(); } }, { t: '⟳ Restart level', fn: () => restart(true) }],
      });
    }, 600);
  }

  /* ---------- menus ---------- */
  function applyBoard() { const p = me(); board.options({ arrows: p.set.arrows, reduce: p.set.reduce }); hud(); board.resize(); }
  function pause() {
    if (ui.isOpen()) return; const p = me();
    const canSkip = !daily && i === p.progress && i < LEVELS.length - 1;
    ui.modal({
      em: '⏸️', title: 'Paused', html: `<div class="kv"><span>🪙 ${p.coins}</span><span>💡 ${p.hints}</span></div>`,
      btns: [{ t: '▶ Resume', cls: 'primary' }, { t: '🔁 Restart level', fn: () => restart(false) }]
        .concat(canSkip ? [{ t: '⏭️ Skip level · 🪙 20', fn: skipAsk }] : [])
        .concat([{ t: '🗺️ Levels', fn: () => ui.map() }, { t: '⚙️ Settings', fn: () => ui.settings(() => { if (me() && me().id === playerId) applyBoard(); else ui.landing(); }) }, { t: '🏠 Home', fn: () => ui.landing() }]),
    });
  }
  function skipAsk() {
    const p = me(), can = p.coins >= 20;
    ui.modal({
      em: '⏭️', title: 'Skip this level?', html: `<p>${can ? 'It costs 🪙 20. You can come back to it later for stars.' : 'You need 🪙 20 coins. Finish other levels or collect daily rewards to earn more.'}</p><div class="kv"><span>🪙 ${p.coins}</span></div>`, row: true,
      btns: can ? [{ t: 'Not now', cls: 'good' }, { t: 'Skip', cls: 'bad', fn: () => { p.coins -= 20; p.skipped[i] = 1; p.progress = Math.max(p.progress, i + 1); p.saved = null; store.commit(); game.start(i + 1); } }] : [{ t: 'OK', cls: 'primary' }],
    });
  }
  game.daily = function () {
    const p = me(); if (!p) return ui.profileForm(onPlayer, false);
    if (p.dailyDone === store.day()) return ui.toast('Daily challenge done! Come back tomorrow 🌙');
    if (p.progress < 3) return ui.toast('Finish 3 levels to unlock the daily challenge 🔒');
    const t = store.day(); let h = 0; for (const ch of t) h = (h * 31 + ch.charCodeAt(0)) >>> 0;
    const top = Math.min(p.progress, LEVELS.length - 1), idx = 3 + (h % Math.max(1, top - 2));
    game.start(Math.min(idx, top), { daily: true });
  };

  /* ---------- boot ---------- */
  function onPlayer(p, isNew) { ui.landing(); ui.applySettings(); if (isNew && p) game.start(0); }
  game.boot = function () {
    store.load(); ui.applySettings(); board.init(doMove);
    const on = (id, f) => ($(id).onclick = () => { SH.sfx('click'); f(); });
    on('b-play', () => { const p = me(); if (!p) return ui.profileForm(onPlayer, false); if (p.progress >= LEVELS.length && !p.saved) return ui.map(); game.start(p.saved ? p.saved.lv : p.progress); });
    on('b-levels', ui.map); on('b-daily', game.daily); on('b-brain', ui.brain); on('b-howto', ui.howto);
    on('b-settings', () => ui.settings(() => ui.landing())); on('b-install', ui.install);
    on('pf-chip', () => (me() ? ui.profiles(onPlayer) : ui.profileForm(onPlayer, false)));
    on('m-back', ui.landing);
    on('g-pause', pause); on('g-hint', hint); on('g-undo', undo); on('g-restart', () => restart(false));
    $('g-wait').onclick = () => doMove('W');
    document.querySelectorAll('#dpad button').forEach((b) => (b.onpointerdown = (e) => { e.preventDefault(); doMove(b.dataset.m); }));
    const keys = { ArrowUp: 'U', ArrowDown: 'D', ArrowLeft: 'L', ArrowRight: 'R', w: 'U', s: 'D', a: 'L', d: 'R', ' ': 'W' };
    G.addEventListener('keydown', (e) => {
      if (e.target && e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (keys[e.key]) { e.preventDefault(); doMove(keys[e.key]); } else if (e.key === 'z' || e.key === 'u') undo(); else if (e.key === 'h') hint(); else if (e.key === 'Escape') pause();
    });
    G.addEventListener('pagehide', () => store.commit());
    document.addEventListener('visibilitychange', () => { if (document.hidden) store.commit(); });

    $('b-install').hidden = !ui.installable();
    ui.landing();
    const p = me();
    if (!p) ui.profileForm(onPlayer, false);
    else { const r = store.claimDaily(); if (r) ui.daily(r, () => {}); else ui.toast('Welcome back, ' + p.name + '! 👋'); }

    setInterval(() => { // practice time + gentle break reminder
      const pl = me(); if (!pl || document.hidden || !$('s-game').classList.contains('active')) return;
      pl.stats.minutes += 10 / 60; session += 10; store.commit();
      if (session >= 1500 && !breakShown && !ui.isOpen()) {
        breakShown = true;
        ui.modal({ em: '🌿', title: 'Brain break!', html: '<p>You have been playing for 25 minutes. Look away from the screen, stretch, and drink some water. Your brain learns best with rests!</p>', btns: [{ t: 'Take a break', cls: 'primary', fn: () => ui.landing() }, { t: 'Keep playing' }] });
      }
    }, 10000);
    if ('serviceWorker' in navigator && location.protocol.indexOf('http') === 0) navigator.serviceWorker.register('/sw.js').catch(() => {});
  };
  if (typeof document !== 'undefined') {
    if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', game.boot); else game.boot();
  }
})(typeof window !== 'undefined' ? window : globalThis);
