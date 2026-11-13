// Ridgeline Moto · audio.js
// Engine sound, landing thumps and flag chime.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Audio ---------- */
let audio = null, muted = false;
function initAudio() {
  if (audio) { if (audio.ac.state === 'suspended') audio.ac.resume(); return; }
  try {
    const ac = new (window.AudioContext || window.webkitAudioContext)();
    const o1 = ac.createOscillator(), o2 = ac.createOscillator(), f = ac.createBiquadFilter(), g = ac.createGain(), g2 = ac.createGain(), master = ac.createGain();
    o1.type = 'sawtooth'; o2.type = 'square'; f.type = 'lowpass'; f.frequency.value = 700; f.Q.value = 3; g.gain.value = 0; g2.gain.value = 0.3; master.gain.value = 1;
    o1.connect(f); o2.connect(g2); g2.connect(f); f.connect(g); g.connect(master); master.connect(ac.destination);
    o1.start(); o2.start();
    const nb = ac.createBuffer(1, ac.sampleRate * 0.4, ac.sampleRate), nd = nb.getChannelData(0);
    for (let i = 0; i < nd.length; i++) nd[i] = (Math.random() * 2 - 1) * Math.pow(1 - i / nd.length, 2);
    audio = { ac, o1, o2, f, g, master, nb };
  } catch (e) { audio = null; }
}
function thump(vol) {
  if (!audio || muted) return;
  const { ac, nb, master } = audio, s = ac.createBufferSource(), g = ac.createGain(), f = ac.createBiquadFilter();
  s.buffer = nb; f.type = 'lowpass'; f.frequency.value = 380; g.gain.value = clamp(vol, 0, 1) * 0.6;
  s.connect(f); f.connect(g); g.connect(master); s.start();
}
function chime() {
  if (!audio || muted) return;
  const { ac, master } = audio;
  [660, 880, 1320].forEach((fr, i) => {
    const o = ac.createOscillator(), g = ac.createGain(), t = ac.currentTime + i * 0.09;
    o.type = 'triangle'; o.frequency.value = fr; g.gain.setValueAtTime(0, t); g.gain.linearRampToValueAtTime(0.12, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.5);
    o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.55);
  });
}
function updAudio(rpm, thr) {
  if (!audio) return;
  const t = audio.ac.currentTime, fr = 34 + rpm * 100 + thr * 8;
  audio.o1.frequency.setTargetAtTime(fr, t, 0.04);
  audio.o2.frequency.setTargetAtTime(fr * 0.5, t, 0.04);
  audio.f.frequency.setTargetAtTime(420 + rpm * 1500 + thr * 400, t, 0.05);
  audio.g.gain.setTargetAtTime(muted || state !== 'play' ? 0 : 0.045 + thr * 0.05, t, 0.08);
}
