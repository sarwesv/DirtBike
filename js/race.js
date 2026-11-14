// Ridgeline Moto · race.js
// Races and time trials: trail-following routes, checkpoint gates, timer, medals and ghost replays.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Routes ---------- */
// Walk along the Perlin trail's centre line: step along the contour, then snap back onto it.
function traceTrail(x, z, dir, maxLen) {
  const pts = [[x, z]], grad = (px, pz) => {
    const e = 0.7, gx = trailSigned(px + e, pz) - trailSigned(px - e, pz), gz = trailSigned(px, pz + e) - trailSigned(px, pz - e), gl = Math.hypot(gx, gz) || 1;
    return [gx / gl, gz / gl];
  };
  let px = x, pz = z, prev = null;
  for (let s = 0; s < maxLen / 4; s++) {
    const [gx, gz] = grad(px, pz);
    let tx = -gz, tz = gx;
    if (prev ? tx * prev[0] + tz * prev[1] < 0 : dir < 0) { tx = -tx; tz = -tz; }
    px += tx * 4; pz += tz * 4;
    for (let k = 0; k < 2; k++) { const [hx, hz] = grad(px, pz), d = trailSigned(px, pz); px -= hx * d; pz -= hz * d; }
    if (Math.abs(trailAt(px, pz)) > 20 || (!W.ice && rawHeight(px, pz) < WATER + 0.4)) break;
    pts.push([px, pz]); prev = [tx, tz];
  }
  return pts;
}
const EVENTS = [
  { id: 'sprint', name: 'Trail Sprint', build: () => trailRoute(1, 1200) },
  { id: 'marathon', name: 'Trail Marathon', build: () => trailRoute(1, 3000) },
  { id: 'back', name: 'Backtrail', build: () => trailRoute(-1, 1500) },
  { id: 'loop', name: 'Meadow Loop', build: () => loopRoute() },
  { id: 'mx', name: 'MX Track', build: () => mxRoute() }
];
// Three laps of the motocross park: whoops on the south straight, tabletop and double on the north.
function mxRoute() {
  const lap = [[-200, 0], [-160, 0], [-120, 30], [-160, 60], [-200, 60], [-260, 30], [-226, 0]];
  return { start: [-236, 0], cps: lap.concat(lap, lap), laps: 3 };
}
function trailRoute(dir, len) {
  let pts = traceTrail(20, 10, dir, len);
  if (pts.length < 150) pts = traceTrail(20, 10, -dir, len); // blocked by a lake or ridge: ride it the other way
  if (pts.length < 150) return Object.assign(loopRoute(), { fallback: true }); // no usable trail near the start
  const cps = [];
  for (let i = 30; i < pts.length; i += 30) cps.push(pts[i]);
  if (pts.length - 1 - (cps.length * 30) > 10) cps.push(pts[pts.length - 1]);
  return { start: pts[0], cps, laps: 1 };
}
function loopRoute() {
  const cps = [];
  for (let i = 1; i <= 8; i++) { const a = i / 8 * TAU; cps.push([Math.sin(a) * 120, 60 - Math.cos(a) * 120 + 60]); }
  const one = cps.slice(), all = one.concat(one);
  return { start: [0, 0], cps: all, laps: 2 };
}
function routeLength(r) {
  let L = 0, p = r.start;
  for (const c of r.cps) { L += Math.hypot(c[0] - p[0], c[1] - p[1]); p = c; }
  return L;
}
const fmtTime = t => { const m = Math.floor(t / 60), s = t - m * 60; return `${m}:${s < 10 ? '0' : ''}${s.toFixed(1)}`; };

/* ---------- Records and ghosts (per map and event) ---------- */
const RACE_KEY = 'ridgeline-moto-races';
let raceRecords = {};
try { raceRecords = JSON.parse(localStorage.getItem(RACE_KEY) || '{}'); } catch (e) {}
const recKey = ev => W.id + '/' + ev.id;
function saveRecords() { try { localStorage.setItem(RACE_KEY, JSON.stringify(raceRecords)); } catch (e) {} }
function loadGhost(ev) { try { return JSON.parse(localStorage.getItem('ridgeline-ghost-' + recKey(ev)) || 'null'); } catch (e) { return null; } }
function saveGhost(ev, g) { try { localStorage.setItem('ridgeline-ghost-' + recKey(ev), JSON.stringify(g)); } catch (e) {} }
function medalFor(time, L) {
  if (time <= L / 24) return 'Gold';
  if (time <= L / 19) return 'Silver';
  if (time <= L / 14) return 'Bronze';
  return '';
}

/* ---------- Gates ---------- */
const gateTex = canvasTex(256, 64, (x, W2, H) => {
  for (let i = 0; i < 16; i++) for (let j = 0; j < 4; j++) { x.fillStyle = (i + j) % 2 ? '#15140f' : '#f4f1e8'; x.fillRect(i * 16, j * 16, 16, 16); }
});
const gatePost = new THREE.CylinderGeometry(0.12, 0.14, 4.6, 10).translate(0, 2.3, 0);
const gateBanner = new THREE.PlaneGeometry(10.4, 1.1);
function makeGate(x, z, ang, kind) {
  const g = new THREE.Group(), y = groundH(x, z);
  const col = kind === 'finish' ? '#ffcf33' : '#3fd0ff';
  const glow = new THREE.MeshStandardMaterial({ color: lin(col), emissive: lin(col), emissiveIntensity: 0.8, roughness: 0.4 });
  for (const s of [-1, 1]) { const p = new THREE.Mesh(gatePost, glow); p.position.set(s * 5.2, 0, 0); p.castShadow = true; g.add(p); }
  const b = new THREE.Mesh(gateBanner, new THREE.MeshStandardMaterial({ map: gateTex, side: THREE.DoubleSide, roughness: 0.6 }));
  b.position.y = 4.3; g.add(b);
  g.position.set(x, y, z); g.rotation.y = ang;
  g.userData.glow = glow;
  scene.add(g);
  return g;
}

/* ---------- Race state ---------- */
let race = null;
function startRace(i) {
  endRace(false);
  const ev = EVENTS[i], r = ev.build(), L = routeLength(r);
  const s = r.start, c0 = r.cps[0], yaw = Math.atan2(c0[0] - s[0], c0[1] - s[1]);
  refreshNearRamps(s[0], s[1]);
  bike.x = s[0]; bike.z = s[1]; bike.yaw = yaw; hist.length = 0;
  resetBike(false);
  const gates = r.cps.map((c, k) => {
    const prev = k ? r.cps[k - 1] : s, ang = Math.atan2(c[0] - prev[0], c[1] - prev[1]);
    return k < r.cps.length / r.laps ? makeGate(c[0], c[1], ang, k === r.cps.length - 1 ? 'finish' : 'cp') : null;
  });
  // Laps reuse the first lap's gates; the last checkpoint of the last lap is the finish.
  const lapLen = r.cps.length / r.laps;
  if (r.laps > 1) gates[lapLen - 1].userData.glow.color.copy(lin('#ffcf33'));
  const rec = raceRecords[recKey(ev)] || null, ghostData = loadGhost(ev);
  race = {
    ev, idx: i, route: r, L, gates, lapLen, next: 0, t: 0, countdown: 3, splits: [], rec, samples: [], sampleT: 0,
    ghostData, ghost: ghostData ? buildGhost(ghostData.bike) : null, last: { x: s[0], z: s[1], yaw }
  };
  updateGateLook();
  renderEvents();
  startRide();
}
function buildGhost(bikeId) {
  const spec = BIKES.find(b => b.id === bikeId) || BIKES[0], m = buildBike(spec);
  const mat = new THREE.MeshStandardMaterial({ color: lin('#9fdcff'), emissive: lin('#3a8fd0'), emissiveIntensity: 0.6, transparent: true, opacity: 0.32, depthWrite: false });
  m.root.traverse(o => { if (o.isMesh) { o.material = mat; o.castShadow = false; } });
  return m;
}
function updateGateLook() {
  if (!race) return;
  const cur = race.next % race.lapLen;
  race.gates.forEach((g, k) => {
    if (!g) return;
    g.visible = true;
    g.userData.glow.emissiveIntensity = k === cur ? 2.2 : 0.35;
    g.scale.setScalar(k === cur ? 1.06 : 1);
  });
}
function endRace(finished) {
  if (!race) return;
  for (const g of race.gates) if (g) scene.remove(g);
  if (race.ghost) scene.remove(race.ghost.root);
  race = null;
  $('raceHud').hidden = true;
  renderEvents();
}
function raceRespawn() {
  return race ? { x: race.last.x, z: race.last.z, yaw: race.last.yaw } : null;
}
// Called from the physics step: checkpoint passing.
function raceStep() {
  if (!race || race.countdown > 0) return;
  const c = race.route.cps[race.next];
  if ((bike.x - c[0]) ** 2 + (bike.z - c[1]) ** 2 > 81) return;
  race.splits.push(race.t);
  const prev = race.next ? race.route.cps[race.next - 1] : race.route.start;
  race.last = { x: c[0], z: c[1], yaw: Math.atan2(c[0] - prev[0], c[1] - prev[1]) };
  race.next++;
  chime();
  const recSplit = race.rec && race.rec.splits[race.next - 1];
  const delta = recSplit !== undefined ? race.t - recSplit : null;
  if (race.next >= race.route.cps.length) return finishRace();
  const lapDone = race.route.laps > 1 && race.next % race.lapLen === 0;
  flash(el.trick, `${lapDone ? 'Lap ' + (race.next / race.lapLen) + ' done' : 'Checkpoint ' + race.next}<small>${fmtTime(race.t)}${delta !== null ? ' · ' + (delta <= 0 ? '−' : '+') + Math.abs(delta).toFixed(1) + ' s' : ''}</small>`);
  updateGateLook();
}
function finishRace() {
  const r = race, ev = r.ev, t = r.t, medal = medalFor(t, r.L), key = recKey(ev);
  const prevBest = r.rec ? r.rec.time : Infinity, isBest = t < prevBest;
  if (isBest) {
    raceRecords[key] = { time: t, splits: r.splits.slice(), medal: medalFor(t, r.L) || (r.rec && r.rec.medal) || '' };
    saveRecords();
    saveGhost(ev, { bike: bikeSpec.id, dt: 0.1, s: r.samples });
  }
  const coins = 40 + Math.round(r.L / 100) * 5 + (medal === 'Gold' ? 300 : medal === 'Silver' ? 160 : medal === 'Bronze' ? 80 : 0);
  if (typeof earn === 'function') earn(coins);
  score += Math.round(coins * 10);
  flash(el.trick, `${medal ? medal + ' medal' : 'Finished'}<small>${ev.name} · ${fmtTime(t)}${isBest && isFinite(prevBest) ? ' · new best by ' + (prevBest - t).toFixed(1) + ' s' : isBest ? ' · first record' : ''} · +${coins} coins</small>`);
  chime();
  endRace(true);
}
// Called every frame while playing: countdown, timer, ghost sampling and playback, HUD.
function raceTick(dt) {
  if (!race) return;
  const hudEl = $('raceHud'); hudEl.hidden = false;
  if (race.countdown > 0) {
    race.countdown -= dt;
    bike.speed = 0; bike.slide = 0; bike.x = race.route.start[0]; bike.z = race.route.start[1]; bike.y = groundH(bike.x, bike.z);
    $('raceTime').textContent = race.countdown > 0 ? String(Math.ceil(race.countdown)) : 'GO';
    $('raceInfo').textContent = race.ev.name + ' · ' + (race.L / 1000).toFixed(1) + ' km';
    return;
  }
  race.t += dt;
  race.sampleT += dt;
  if (race.sampleT >= 0.1) {
    race.sampleT -= 0.1;
    const b = bike, r2 = v => Math.round(v * 100) / 100;
    race.samples.push([r2(b.x), r2(b.y), r2(b.z), r2(b.yaw), r2(b.pitch), r2(b.lean + (b.whip || 0))]);
  }
  if (race.ghost && race.ghostData) {
    const s = race.ghostData.s, f = race.t / race.ghostData.dt, i = Math.min(Math.floor(f), s.length - 2), k = clamp(f - i, 0, 1);
    if (i >= 0 && s.length > 1) {
      const a = s[i], b2 = s[i + 1], m = race.ghost;
      m.root.position.set(lerp(a[0], b2[0], k), lerp(a[1], b2[1], k), lerp(a[2], b2[2], k));
      m.root.rotation.set(-lerp(a[4], b2[4], k), a[3] + wrapA(b2[3] - a[3]) * k, lerp(a[5], b2[5], k));
    }
  }
  $('raceTime').textContent = fmtTime(race.t);
  const lap = race.route.laps > 1 ? ` · lap ${Math.min(race.route.laps, Math.floor(race.next / race.lapLen) + 1)}/${race.route.laps}` : '';
  $('raceInfo').textContent = `Checkpoint ${race.next + 1}/${race.route.cps.length}${lap}` + (race.rec ? ` · best ${fmtTime(race.rec.time)}` : '');
}
// Next checkpoint for the minimap.
function raceTargets() {
  if (!race) return null;
  return race.route.cps.slice(race.next, race.next + 4);
}

/* ---------- Event list on the title / pause screen ---------- */
function renderEvents() {
  const wrap = $('events');
  if (!wrap) return;
  wrap.textContent = '';
  EVENTS.forEach((ev, i) => {
    if (ev.id !== 'loop' && ev.build().fallback) return; // this map's trail is blocked; only the loop runs here
    const rec = raceRecords[recKey(ev)];
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'event';
    btn.innerHTML = `<b>${ev.name}</b><span>${rec ? fmtTime(rec.time) : 'No time yet'}</span>${rec && rec.medal ? `<i class="medal ${rec.medal.toLowerCase()}">${rec.medal}</i>` : ''}`;
    btn.addEventListener('click', () => startRace(i));
    wrap.appendChild(btn);
  });
  const leave = $('btnLeaveRace');
  if (leave) leave.hidden = !race;
}
$('btnLeaveRace').addEventListener('click', () => { endRace(false); });
