// Ridgeline Moto · hud.js
// Speedometer, gears, surface, score and engine pitch.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- HUD update ---------- */
const GEARS = [0, 7, 13, 19, 25, 32];
function updHud() {
  const b = bike, hs = b.grounded ? Math.abs(b.speed) : Math.hypot(b.vx, b.vz);
  setText('speed', String(Math.round(hs * 3.6)));
  const gs = hs * 31 / bikeSpec.top;
  let gear = 1; for (let i = 1; i < GEARS.length; i++) if (gs > GEARS[i]) gear = i + 1;
  gear = Math.min(gear, 5);
  setText('gear', b.speed < -0.5 && b.grounded ? 'R' : hs < 0.5 && !keys.up ? 'N' : String(gear));
  setText('score', score.toLocaleString());
  if (score > best) { best = score; }
  setText('best', best.toLocaleString());
  setText('flags', String(collected.size));
  setText('odo', (odo / 1000).toFixed(1) + ' km');
  let surf = 'Grass';
  if (!b.grounded) surf = 'Airborne';
  else if (terrainH(b.x, b.z) < WATER) surf = 'Water';
  else if (groundH(b.x, b.z) > terrainH(b.x, b.z) + 0.05) surf = 'Ramp';
  else if (b.onTrail) surf = 'Trail';
  else if (b.y > 64) surf = 'Snow';
  else if (mountainMask(b.x, b.z) > 0.45 && b.y > 40) surf = 'Rock';
  else if (desertness(b.x, b.z) > 0.5) surf = 'Sand';
  if (shown.surf !== surf) el.surf.classList.toggle('trail', surf === 'Trail');
  setText('surf', surf);
  el.nitro.style.width = (b.nitro * 100).toFixed(1) + '%';
  if (!b.grounded && !b.crashed && b.air > 0.35) {
    const f = b.flip / TAU, s = b.spin / TAU;
    let t = `Air ${b.air.toFixed(1)} s`;
    if (Math.abs(f) > 0.25) t += ` · ${f > 0 ? 'back' : 'front'} ${Math.abs(f).toFixed(1)}`;
    if (Math.abs(s) > 0.25) t += ` · spin ${(Math.abs(s) * 360).toFixed(0)}°`;
    setText('air', t);
  } else setText('air', '');
  if (nearest) setText('flagDist', `Nearest flag ${Math.round(Math.hypot(nearest.x - b.x, nearest.z - b.z))} m`);
  else setText('flagDist', 'No flags within 1 km');
  let rpm, thr = keys.up ? 1 : 0;
  if (!b.grounded) rpm = keys.up ? 0.95 : 0.35;
  else { const lo = GEARS[gear - 1], hi = GEARS[gear] || 44; rpm = hs < 0.5 ? (keys.up ? 0.5 : 0.12) : 0.22 + clamp((gs - lo) / (hi - lo), 0, 1) * 0.7; }
  if (b.crashed) { rpm = 0.12; thr = 0; }
  updAudio(rpm, thr);
}
