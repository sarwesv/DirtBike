// Ridgeline Moto · controls.js
// Save data, game state, keyboard and touch input, menu buttons.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Persistence ---------- */
const SAVE_KEY = 'ridgeline-moto-v1';
let best = 0, collected = new Set(), odo = 0, savedBike = 'trail', savedWorld = 'open';
try { const s = JSON.parse(localStorage.getItem(SAVE_KEY) || '{}'); best = s.best || 0; collected = new Set(s.flags || []); odo = s.odo || 0; savedBike = s.bike || 'trail'; savedWorld = s.world || 'open'; } catch (e) {}
function save() { try { localStorage.setItem(SAVE_KEY, JSON.stringify({ best, flags: [...collected], odo, bike: bikeSpec.id, world: W.id })); } catch (e) {} }

/* ---------- Bike state & input ---------- */
const bike = { x: 0, y: 9, z: 5, yaw: 0, speed: 0, vy: 0, vx: 0, vz: 0, pitch: 0, pitchVel: 0, yawVel: 0, lean: 0, steer: 0, wheelie: 0, grounded: true, air: 0, flip: 0, spin: 0, crashed: false, crashT: 0, crashSpin: 0, roll: 0, nitro: 0.6, wheelieT: 0, susp: 0, spinW: 0 };
let score = 0, state = 'title', camMode = 0, camYaw = 0, shake = 0, time = 0;
const keys = {}, armed = {};
const hist = [];
const KEYMAP = { KeyW: 'up', ArrowUp: 'up', KeyS: 'down', ArrowDown: 'down', KeyA: 'left', ArrowLeft: 'left', KeyD: 'right', ArrowRight: 'right', Space: 'lean', ShiftLeft: 'boost', ShiftRight: 'boost' };
addEventListener('keydown', e => {
  const k = KEYMAP[e.code];
  if (k) { keys[k] = true; e.preventDefault(); }
  if (e.repeat) return;
  if (e.code === 'Escape' || e.code === 'KeyP') togglePause();
  else if (state !== 'play') { if (e.code === 'Enter') startRide(); }
  else if (e.code === 'KeyR') resetBike(false);
  else if (e.code === 'KeyC') cycleCam();
  else if (e.code === 'KeyM') toggleMute();
});
addEventListener('keyup', e => { const k = KEYMAP[e.code]; if (k) keys[k] = false; });
addEventListener('blur', () => { for (const k in keys) keys[k] = false; });
document.querySelectorAll('#touch button').forEach(btn => {
  const k = btn.dataset.k;
  const on = e => { e.preventDefault(); keys[k] = true; btn.classList.add('on'); try { btn.setPointerCapture(e.pointerId); } catch (_) {} initAudio(); };
  const off = () => { keys[k] = false; btn.classList.remove('on'); };
  btn.addEventListener('pointerdown', on); btn.addEventListener('pointerup', off); btn.addEventListener('pointercancel', off); btn.addEventListener('lostpointercapture', off);
});

// Analog thumb steering: slide anywhere on the pad, release to centre.
let touchSteer = null;
{
  const pad = $('steerPad'), knob = pad.querySelector('.knob');
  let pid = null;
  const setV = v => {
    touchSteer = v;
    keys.left = v !== null && v < -0.35; keys.right = v !== null && v > 0.35;
    knob.style.transform = v === null ? '' : `translateX(${(v * (pad.clientWidth / 2 - 38)).toFixed(1)}px)`;
    pad.setAttribute('aria-valuenow', v === null ? '0' : v.toFixed(2));
  };
  const read = e => { const r = pad.getBoundingClientRect(); return clamp((e.clientX - (r.left + r.width / 2)) / (r.width / 2 - 30), -1, 1); };
  pad.addEventListener('pointerdown', e => { e.preventDefault(); pid = e.pointerId; try { pad.setPointerCapture(pid); } catch (_) {} pad.classList.add('active'); setV(read(e)); initAudio(); });
  pad.addEventListener('pointermove', e => { if (e.pointerId === pid) setV(read(e)); });
  const end = e => { if (e.pointerId !== pid) return; pid = null; pad.classList.remove('active'); setV(null); };
  pad.addEventListener('pointerup', end); pad.addEventListener('pointercancel', end); pad.addEventListener('lostpointercapture', end);
}
$('touch').addEventListener('contextmenu', e => e.preventDefault());
document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'play') togglePause(); });
{
  const btns = document.querySelectorAll('.js-full'), root = document.documentElement;
  const req = root.requestFullscreen || root.webkitRequestFullscreen, exit = document.exitFullscreen || document.webkitExitFullscreen;
  const hideAll = () => btns.forEach(b => { b.hidden = true; });
  if (!req) hideAll();
  btns.forEach(btn => btn.addEventListener('click', () => {
    try {
      if (document.fullscreenElement || document.webkitFullscreenElement) { const r = exit.call(document); if (r && r.catch) r.catch(() => {}); }
      else {
        const r = req.call(root);
        if (r && r.then) r.then(() => screen.orientation && screen.orientation.lock && screen.orientation.lock('landscape').catch(() => {})).catch(hideAll);
      }
    } catch (e) { hideAll(); }
  }));
  const sync = () => { const t = (document.fullscreenElement || document.webkitFullscreenElement) ? 'Exit full screen' : 'Full screen'; btns.forEach(b => { b.textContent = t; }); };
  document.addEventListener('fullscreenchange', sync); document.addEventListener('webkitfullscreenchange', sync);
}

/* ---------- HUD ---------- */
const hud = $('hud'), titleEl = $('title');
const el = { score: $('score'), best: $('best'), flags: $('flags'), odo: $('odo'), speed: $('speed'), gear: $('gear'), nitro: $('nitro'), trick: $('trick'), bail: $('bail'), air: $('air'), flagDist: $('flagDist'), surf: $('surf') };
const shown = {};
function setText(k, v) { if (shown[k] !== v) { shown[k] = v; el[k].textContent = v; } }
function flash(node, html) { node.innerHTML = html; node.classList.remove('show'); void node.offsetWidth; node.classList.add('show'); }
function cycleCam() { camMode = (camMode + 1) % 3; }
function toggleMute() { muted = !muted; document.querySelectorAll('.js-sound').forEach(b => { b.textContent = muted ? 'Sound off' : 'Sound on'; }); }
$('btnCam').addEventListener('click', cycleCam);
document.querySelectorAll('.js-sound').forEach(b => b.addEventListener('click', () => { initAudio(); toggleMute(); }));
$('btnPause').addEventListener('click', togglePause);
$('btnRide').addEventListener('click', startRide);
function startRide() { initAudio(); state = 'play'; titleEl.hidden = true; hud.hidden = false; last = performance.now(); }
function togglePause() {
  if (state === 'play') {
    state = 'paused'; titleEl.hidden = false; $('titleHead').textContent = 'Paused';
    $('titleSub').textContent = `Score ${score.toLocaleString()} · ${collected.size} flags found. The trail is waiting.`;
    $('btnRide').textContent = 'Resume'; $('btnRide').focus();
  } else if (state === 'paused') startRide();
}
