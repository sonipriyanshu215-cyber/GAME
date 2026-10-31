/* Shadow Heist - screens, popups, profiles UI. */
(function (G) {
  const SH = (G.SH = G.SH || {});
  const $ = (id) => document.getElementById(id);
  const ui = (SH.ui = { $ });
  const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  ui.esc = esc;

  ui.AVATARS = ['🥷', '🦊', '🐼', '🐯', '🦉', '🐸', '🤖', '👾', '🦄', '🐙', '🧙', '🕵️'];
  ui.AGES = [{ id: 'kid', t: 'Kids', s: 'age 5–9' }, { id: 'teen', t: 'Teens', s: 'age 10–17' }, { id: 'adult', t: 'Adults', s: '18 and up' }];
  ui.TIPS = [
    'Look at every guard before your first move. Good players plan first, then act.',
    'Stuck? Take a slow breath. A calm brain finds answers faster.',
    'Mistakes are practice. Every "Busted!" teaches you something new.',
    'Try to picture each guard\'s next 3 steps in your head.',
    'Waiting is a move too. Sometimes the best plan is patience.',
    'Work backwards: start at the exit and ask how you could get there.',
    'Say your plan out loud: first this, then that, then the exit.',
    'Crates block guards too. Use them as tools, not just obstacles.',
    'On ice, decide where you will stop before you slide.',
    'Portals connect two places. Trace the whole path in your mind.',
    'Collect the hardest gem first. Easy ones can wait.',
    'Short breaks help memory. Look away from the screen and stretch your eyes.',
    'Hints are for learning. Try to guess the next move before you use one.',
    'Fewer moves means a better plan. Try a level again to beat your best.',
  ];
  ui.tip = () => ui.TIPS[Math.floor(Math.random() * ui.TIPS.length)];

  ui.MECH = {
    move: { em: '👆', title: 'Move your thief', text: 'Swipe on the board (or use the pad) to move one tile. Every time you move, the guards also take one step.' },
    goal: { em: '💎', title: 'Your mission', text: 'Collect every 💎 first. Then the 🚪 exit lights up. Walk to it to win!' },
    guards: { em: '👮', title: 'Guards!', text: 'Guards patrol back and forth. The little arrow shows their next step. If a guard touches you, you are busted. Use ⏳ Wait to time your move.' },
    crates: { em: '📦', title: 'Crates', text: 'You can push crates. Guards cannot walk through them, so a crate can protect you. You cannot push a crate into a wall, a gem, the exit or another crate.' },
    ice: { em: '❄️', title: 'Ice', text: 'Ice makes you slide until something stops you. Guards only move once for the whole slide. Think about where you will end up!' },
    portals: { em: '🌀', title: 'Portals', text: 'Step on a portal and you appear on its twin with the same symbol. Guards ignore portals, and you cannot push crates onto them.' },
  };

  ui.show = (id) => document.querySelectorAll('.screen').forEach((s) => s.classList.toggle('active', s.id === id));

  /* ---------- modal + toast ---------- */
  let onCloseCb = null;
  ui.modal = function (o) {
    const w = $('modal');
    let h = '<div class="modal">';
    if (o.em) h += `<div class="em">${o.em}</div>`;
    if (o.title) h += `<h2>${o.title}</h2>`;
    if (o.html) h += o.html;
    if (o.tip) h += `<div class="tip"><b>🧠 Brain tip:</b> ${o.tip}</div>`;
    h += `<div class="btns ${o.row ? 'row' : ''}">` + (o.btns || []).map((b, i) => `<button class="btn ${b.cls || ''}" data-i="${i}">${b.t}</button>`).join('') + '</div></div>';
    w.innerHTML = h; w.classList.add('open'); w._dismiss = o.dismiss !== false; onCloseCb = o.onClose || null;
    w.querySelectorAll('[data-i]').forEach((b) => {
      b.onclick = () => {
        SH.sfx('click');
        const x = o.btns[+b.dataset.i];
        if (x.keep) { if (x.fn) x.fn(w); return; }
        ui.close(true); if (x.fn) x.fn();
      };
    });
    if (o.after) o.after(w);
  };
  ui.close = function (viaButton) {
    const w = $('modal'); w.classList.remove('open'); w.innerHTML = '';
    const cb = onCloseCb; onCloseCb = null; if (!viaButton && cb) cb();
  };
  ui.isOpen = () => $('modal').classList.contains('open');
  let tt; ui.toast = (m) => { const t = $('toast'); t.textContent = m; t.classList.add('show'); clearTimeout(tt); tt = setTimeout(() => t.classList.remove('show'), 2200); };

  ui.applySettings = function () {
    const p = SH.store.me(), s = p ? p.set : { sound: true, vibe: true, reduce: false, pad: false };
    SH.soundOn = !!s.sound; SH.vibeOn = !!s.vibe;
    document.body.classList.toggle('reduce', !!s.reduce);
    $('dpad').hidden = !s.pad;
  };

  /* ---------- landing ---------- */
  ui.landing = function () {
    const p = SH.store.me(), chip = $('pf-chip'), play = $('b-play');
    if (p) {
      chip.innerHTML = `<span class="av">${p.avatar}</span>${esc(p.name)} · ⭐${SH.store.totalStars(p)}`;
      const lv = p.saved ? p.saved.lv : Math.min(p.progress, LEVELS.length - 1);
      play.textContent = p.progress > 0 || p.saved ? `▶ Continue · Level ${lv + 1}` : '▶ Play';
    } else { chip.innerHTML = '<span class="av">➕</span>New player'; play.textContent = '▶ Play'; }
    const pr = $('prog');
    if (p) {
      const L = LEVELS[Math.min(p.progress, LEVELS.length - 1)], W = WORLDS[L.w], done = Math.min(p.progress, LEVELS.length);
      pr.innerHTML = `<b>${W.emoji} ${W.name}</b> <span style="color:var(--mute)">· trains ${W.skill.toLowerCase()}</span><div class="t"><i style="width:${Math.max(3, (done / LEVELS.length) * 100)}%"></i></div><div class="m"><span>Level ${Math.min(done + 1, LEVELS.length)} of ${LEVELS.length}</span><span>🔥 ${p.streak}</span><span>🪙 ${p.coins}</span><span>💡 ${p.hints}</span></div>`;
    } else pr.innerHTML = '<b>Welcome! 👋</b><div class="m" style="margin-top:6px"><span>Make a player to begin. Your progress is saved automatically.</span></div>';
    const bg = document.querySelector('.bg-float');
    if (bg && !bg.children.length) {
      '💎📦🌀❄️👮🚪🧠⭐💡🔮'.match(/./gu).concat('💎', '⭐').forEach((e, i) => {
        const s = document.createElement('span'); s.textContent = e;
        s.style.left = (i * 9 + 3) % 94 + '%'; s.style.animationDuration = 14 + (i * 3) % 12 + 's'; s.style.animationDelay = -(i * 2.3) + 's';
        bg.appendChild(s);
      });
    }
    ui.show('s-landing');
  };

  /* ---------- level map ---------- */
  ui.map = function () {
    const p = SH.store.me(); if (!p) return ui.profileForm(ui.landing, false);
    let h = '';
    for (let w = 0; w < WORLDS.length; w++) {
      const idx = []; LEVELS.forEach((l, i) => { if (l.w === w) idx.push(i); });
      const done = idx.filter((i) => p.stars[i] || p.skipped[i]).length, locked = idx[0] > p.progress, W = WORLDS[w];
      h += `<div class="world ${locked ? 'locked' : ''}"><h3>${W.emoji} World ${w + 1}: ${W.name}<span style="margin-left:auto;font-size:12px;color:var(--mute)">${done}/${idx.length}</span></h3><p>${W.desc}</p><span class="skill">🧠 Trains: ${W.skill}</span><div class="grid">`;
      idx.forEach((i) => {
        const st = p.stars[i] || 0, lock = i > p.progress, now = i === p.progress;
        const cls = lock ? 'lock' : now ? 'now' : st ? 'done' : p.skipped[i] ? 'skip' : '';
        h += `<button class="lvl ${cls}" data-i="${i}" aria-label="Level ${i + 1}">${lock ? '🔒' : i + 1}${st ? `<small>${'★'.repeat(st)}</small>` : ''}</button>`;
      });
      h += '</div></div>';
    }
    const body = $('map-body'); body.innerHTML = h;
    body.querySelectorAll('.lvl').forEach((b) => (b.onclick = () => {
      const i = +b.dataset.i;
      if (i > p.progress) { ui.toast('Finish the earlier levels first 🔒'); SH.sfx('lose'); return; }
      SH.game.start(i);
    }));
    $('m-stars').textContent = '⭐ ' + SH.store.totalStars(p) + ' / ' + LEVELS.length * 3;
    ui.show('s-map');
    const cur = body.querySelector('.now'); if (cur && cur.scrollIntoView) cur.scrollIntoView({ block: 'center' });
  };

  /* ---------- players ---------- */
  ui.profileForm = function (cb, cancelable) {
    let av = ui.AVATARS[0], age = 'teen';
    ui.modal({
      em: '👋', title: 'Who is playing?', dismiss: !!cancelable,
      html: `<p>Create a player so the game remembers exactly where you stopped.</p>
        <input id="pf-name" class="field" maxlength="14" placeholder="Your name" autocomplete="off">
        <div class="lab">Pick a buddy</div><div class="avatars" id="pf-av">${ui.AVATARS.map((a, i) => `<button data-a="${a}" class="${i === 0 ? 'sel' : ''}">${a}</button>`).join('')}</div>
        <div class="lab">Age group</div><div class="seg" id="pf-age">${ui.AGES.map((a) => `<button data-g="${a.id}" class="${a.id === 'teen' ? 'sel' : ''}">${a.t}<small>${a.s}</small></button>`).join('')}</div>`,
      btns: [{
        t: 'Start playing', cls: 'primary', keep: true,
        fn: () => {
          const name = $('pf-name').value;
          const p = SH.store.create({ name, avatar: av, age });
          ui.close(true); ui.applySettings(); cb(p, true);
        },
      }].concat(cancelable ? [{ t: 'Cancel' }] : []),
      after: (w) => {
        w.querySelectorAll('#pf-av button').forEach((b) => (b.onclick = () => { av = b.dataset.a; w.querySelectorAll('#pf-av button').forEach((x) => x.classList.toggle('sel', x === b)); SH.sfx('click'); }));
        w.querySelectorAll('#pf-age button').forEach((b) => (b.onclick = () => { age = b.dataset.g; w.querySelectorAll('#pf-age button').forEach((x) => x.classList.toggle('sel', x === b)); SH.sfx('click'); }));
      },
    });
  };

  ui.profiles = function (cb) {
    const list = SH.store.list(), me = SH.store.me();
    const items = list.map((p) => `<div class="item ${me && p.id === me.id ? 'sel' : ''}" data-id="${p.id}" role="button"><span class="av">${p.avatar}</span><span class="meta"><b>${esc(p.name)}</b><small>Level ${Math.min(p.progress + 1, LEVELS.length)} · ⭐${SH.store.totalStars(p)}</small></span><span data-del="${p.id}" style="font-size:20px;padding:6px" aria-label="Delete player">🗑️</span></div>`).join('');
    ui.modal({
      em: '👥', title: 'Players', html: `<div class="list">${items}</div>`,
      btns: [{ t: '➕ New player', cls: 'primary', fn: () => ui.profileForm(cb, true) }, { t: '📥 Load save code', fn: () => ui.loadCode(cb) }, { t: 'Close' }],
      after: (w) => w.querySelectorAll('.item').forEach((b) => (b.onclick = (e) => {
        const d = e.target.closest('[data-del]');
        if (d) return ui.confirmDelete(d.dataset.del, cb);
        SH.store.switchTo(b.dataset.id); ui.close(true); ui.applySettings(); cb(SH.store.me(), false);
      })),
    });
  };
  ui.confirmDelete = function (id, cb) {
    ui.modal({
      em: '🗑️', title: 'Delete this player?', html: '<p>All their stars and progress on this device will be lost.</p>', row: true,
      btns: [{ t: 'Keep', cls: 'good' }, { t: 'Delete', cls: 'bad', fn: () => { SH.store.remove(id); if (!SH.store.me()) ui.profileForm(cb, false); else { ui.applySettings(); cb(SH.store.me(), false); } } }],
    });
  };
  ui.loadCode = function (cb) {
    ui.modal({
      em: '📥', title: 'Load save code', html: '<p>Paste a save code from another phone.</p><textarea id="sc-in" class="field" placeholder="Paste code here"></textarea>',
      btns: [{ t: 'Load', cls: 'primary', keep: true, fn: () => { const p = SH.store.importCode($('sc-in').value); if (!p) return ui.toast('That code did not work'); ui.close(true); ui.applySettings(); cb(p, false); } }, { t: 'Cancel' }],
    });
  };
  ui.showCode = function () {
    const code = SH.store.exportCode();
    ui.modal({
      em: '📋', title: 'Your save code', html: '<p>Copy this code. On another phone choose Players → Load save code to continue there.</p><textarea id="sc-out" class="field" readonly></textarea>',
      btns: [{ t: 'Copy', cls: 'primary', keep: true, fn: () => { const t = $('sc-out'); t.select(); try { navigator.clipboard.writeText(code); } catch (e) { document.execCommand && document.execCommand('copy'); } ui.toast('Copied!'); } }, { t: 'Close' }],
      after: () => { $('sc-out').value = code; },
    });
  };

  /* ---------- settings / brain gym / how to ---------- */
  ui.settings = function (cb) {
    const p = SH.store.me(); if (!p) return ui.profileForm(cb, false);
    const rows = [
      ['sound', '🔊 Sound'], ['vibe', '📳 Vibration'], ['arrows', '➡️ Show guard arrows'], ['pad', '🎮 On-screen arrow pad'],
      ['study', '🧘 Focus mode (3 second study time)'], ['reduce', '🐢 Reduce motion'],
    ];
    ui.modal({
      em: '⚙️', title: 'Settings',
      html: `<div class="list">${rows.map(([k, t]) => `<button class="sw ${p.set[k] ? 'on' : ''}" data-k="${k}">${t}<i></i></button>`).join('')}</div><p style="font-size:12px;color:var(--mute)">Tip: switch off guard arrows for a real brain workout.</p>`,
      btns: [{ t: '👥 Players', fn: () => ui.profiles(cb) }, { t: '📋 Save code', fn: ui.showCode }, { t: 'Done', cls: 'primary', fn: cb ? () => cb(null, false) : null }],
      after: (w) => w.querySelectorAll('.sw').forEach((b) => (b.onclick = () => { const k = b.dataset.k; p.set[k] = !p.set[k]; b.classList.toggle('on', p.set[k]); SH.store.commit(); ui.applySettings(); SH.sfx('click'); })),
    });
  };

  ui.brain = function () {
    const p = SH.store.me(); if (!p) return ui.profileForm(ui.landing, false);
    const st = p.stats, done = Object.keys(p.stars).length, bar = (l, v, note) => `<div class="bar"><div class="l"><span>${l}</span><span>${Math.round(v)}%</span></div><div class="t"><i style="width:${Math.max(2, Math.min(100, v))}%"></i></div>${note ? `<small style="color:var(--mute)">${note}</small>` : ''}</div>`;
    let h = `<div class="kv"><span>🏁 ${done}/${LEVELS.length} levels</span><span>⭐ ${SH.store.totalStars(p)}</span><span>🪙 ${p.coins}</span></div><div class="kv"><span>🔥 ${p.streak} day streak</span><span>⏱️ ${Math.round(st.minutes)} min</span></div>`;
    h += bar('Planning (perfect solves)', st.wins ? (st.perfect / st.wins) * 100 : 0, 'How often you solve a level in the fewest moves.');
    h += bar('Focus (no hints)', st.wins ? (st.noHint / st.wins) * 100 : 0, 'How often you solve a level on your own.');
    h += '<div class="lab">Skills by world</div>';
    WORLDS.forEach((W, w) => { const idx = []; LEVELS.forEach((l, i) => { if (l.w === w) idx.push(i); }); const d = idx.filter((i) => p.stars[i] || p.skipped[i]).length; h += bar(`${W.emoji} ${W.skill}`, (d / idx.length) * 100); });
    ui.modal({ em: '🧠', title: 'Brain Gym', html: h, tip: ui.tip(), btns: [{ t: 'Close', cls: 'primary' }] });
  };

  ui.howto = function () {
    ui.modal({
      em: '❓', title: 'How to play',
      html: `<ol class="how"><li>👆 <b>Swipe</b> to move your thief 🥷 one tile.</li><li>💎 Collect <b>all gems</b>, then reach the 🚪 exit.</li><li>👮 Guards move <b>one step every time you move</b>. The arrow shows where they go next.</li><li>⏳ <b>Wait</b> skips a turn. ↶ <b>Undo</b> takes back a move.</li><li>📦 Push crates. ❄️ Slide on ice. 🌀 Use portals.</li><li>💡 Stuck? A hint shows the best next move.</li><li>⭐ Fewer moves = more stars.</li></ol>`,
      tip: 'Plan first, then move. Your brain is the real hero.', btns: [{ t: 'Got it!', cls: 'primary' }],
    });
  };

  ui.mech = function (key, cb) {
    const p = SH.store.me(), m = ui.MECH[key];
    if (!p || !m || p.seen[key]) return cb && cb();
    p.seen[key] = 1; SH.store.commit();
    ui.modal({ em: m.em, title: 'New: ' + m.title, html: `<p>${m.text}</p>`, dismiss: false, btns: [{ t: 'Got it!', cls: 'primary', fn: cb }] });
  };
  ui.worldIntro = function (w, cb) {
    const p = SH.store.me(), W = WORLDS[w], k = 'w' + w;
    if (!p || p.seen[k]) return cb && cb();
    p.seen[k] = 1; SH.store.commit();
    ui.modal({ em: W.emoji, title: `World ${w + 1}: ${W.name}`, html: `<p>${W.desc}</p><div class="kv"><span>🧠 Trains: ${W.skill}</span></div>`, dismiss: false, btns: [{ t: "Let's go!", cls: 'primary', fn: cb }] });
  };

  ui.daily = function (r, cb) {
    ui.modal({ em: '🎁', title: `Day ${r.streak} streak! 🔥`, html: `<p>Welcome back! Here is your daily reward.</p><div class="kv"><span>🪙 +${r.coins}</span><span>💡 +${r.hints}</span></div>`, tip: ui.tip(), btns: [{ t: 'Collect', cls: 'primary', fn: cb }] });
  };

  /* ---------- install help ---------- */
  let deferred = null;
  G.addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); deferred = e; });
  ui.installable = () => !(G.matchMedia && G.matchMedia('(display-mode: standalone)').matches) && !navigator.standalone;
  ui.install = function () {
    if (deferred) { deferred.prompt(); deferred = null; return; }
    ui.modal({
      em: '📲', title: 'Install the game',
      html: '<p><b>iPhone / iPad (Safari):</b> tap Share, then <b>Add to Home Screen</b>.</p><p><b>Android (Chrome):</b> tap the ⋮ menu, then <b>Install app</b> or <b>Add to Home screen</b>.</p><p>Then it opens like a real app and works with no internet.</p>',
      btns: [{ t: 'OK', cls: 'primary' }],
    });
  };
})(typeof window !== 'undefined' ? window : globalThis);
