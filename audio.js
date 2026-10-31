/* Shadow Heist - tiny synthesized sounds (no audio files, so it stays offline and small). */
(function (G) {
  const SH = (G.SH = G.SH || {});
  let ctx = null;
  SH.soundOn = true; SH.vibeOn = true;

  function ac() {
    if (!ctx) { const A = G.AudioContext || G.webkitAudioContext; if (!A) return null; try { ctx = new A(); } catch (e) { return null; } }
    if (ctx.state === 'suspended') ctx.resume();
    return ctx;
  }
  function tone(f, t0, dur, type, vol) {
    const c = ac(); if (!c) return;
    const o = c.createOscillator(), g = c.createGain();
    o.type = type || 'sine'; o.frequency.setValueAtTime(f, c.currentTime + t0);
    g.gain.setValueAtTime(0.0001, c.currentTime + t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, c.currentTime + t0 + 0.01);
    g.gain.exponentialRampToValueAtTime(0.0001, c.currentTime + t0 + dur);
    o.connect(g); g.connect(c.destination); o.start(c.currentTime + t0); o.stop(c.currentTime + t0 + dur + 0.02);
  }
  const SFX = {
    move: () => tone(220, 0, 0.06, 'triangle', 0.06),
    click: () => tone(520, 0, 0.05, 'sine', 0.08),
    gem: () => { tone(880, 0, 0.1, 'sine'); tone(1320, 0.08, 0.14, 'sine'); },
    push: () => tone(110, 0, 0.12, 'square', 0.07),
    slide: () => { tone(700, 0, 0.12, 'sine', 0.06); tone(500, 0.08, 0.12, 'sine', 0.05); },
    tp: () => { tone(400, 0, 0.1, 'sine'); tone(800, 0.07, 0.15, 'sine'); },
    hint: () => { tone(660, 0, 0.1, 'triangle'); tone(990, 0.1, 0.2, 'triangle'); },
    lose: () => { tone(300, 0, 0.18, 'sawtooth', 0.1); tone(200, 0.16, 0.3, 'sawtooth', 0.1); },
    star: (i) => tone(660 + (i || 0) * 220, 0, 0.25, 'triangle', 0.14),
    win: () => [523, 659, 784, 1047].forEach((f, i) => tone(f, i * 0.11, 0.25, 'triangle', 0.14)),
  };
  SH.sfx = function (name, a) { if (SH.soundOn && SFX[name]) { try { SFX[name](a); } catch (e) { /* ignore */ } } };
  SH.vibe = function (ms) { if (SH.vibeOn) { try { navigator.vibrate && navigator.vibrate(ms); } catch (e) { /* ignore */ } } };
})(typeof window !== 'undefined' ? window : globalThis);
