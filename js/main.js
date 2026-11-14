// Ridgeline Moto · main.js
// Resize, adaptive quality, the frame loop and start-up.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Loop ---------- */
let baseFov = 66;
function resize() {
  const w = innerWidth, h = innerHeight;
  renderer.setSize(w, h, false); camera.aspect = w / h;
  // Keep roughly a 70 degree horizontal view, so an upright phone still sees the trail ahead.
  baseFov = camera.aspect < 1 ? clamp(2 * Math.atan(Math.tan(35 * Math.PI / 180) / camera.aspect) * 180 / Math.PI, 66, 92) : 66;
  camera.fov = baseFov; camera.updateProjectionMatrix();
  if (post) post.resize();
}
// Drop render resolution step by step when the frame rate sags (never raises it, to avoid flicker).
// Graphics tiers. When the frame rate sags, Auto drops expensive features first (shadow detail, then
// leafy trees) and only then lowers resolution, never below native on desktop, so the image stays sharp.
const QUALITY = [
  { name: 'Ultra', shadow: 4096, cards: true },
  { name: 'High', shadow: 2048, cards: true },
  { name: 'Fast', shadow: 1024, cards: false }
];
const maxDpr = renderer.getPixelRatio(), minDpr = coarse ? 0.75 : Math.min(1, maxDpr);
let qLevel = coarse ? 2 : 0, qAuto = true, dpr = maxDpr, fpsT = 0, fpsN = 0;
try { const s = JSON.parse(localStorage.getItem('ridgeline-moto-gfx') || 'null'); if (s) { qAuto = s.auto; qLevel = clamp(s.level, 0, 2); } } catch (e) {}
function applyQuality() {
  const q = QUALITY[qLevel], size = coarse ? Math.min(q.shadow, 1024) : q.shadow;
  if (sun.shadow.mapSize.x !== size) { sun.shadow.mapSize.set(size, size); if (sun.shadow.map) { sun.shadow.map.dispose(); sun.shadow.map = null; } }
  if (LOD_CARDS !== (q.cards && !coarse)) { LOD_CARDS = q.cards && !coarse; for (const ch of chunks.values()) ch.near = null; }
  const label = 'Graphics: ' + (qAuto ? 'Auto · ' : '') + q.name;
  document.querySelectorAll('.js-gfx').forEach(b => { b.textContent = label; });
}
function cycleQuality() {
  // Auto -> Ultra -> High -> Fast -> Auto
  if (qAuto) { qAuto = false; qLevel = 0; } else if (qLevel < 2) qLevel++; else { qAuto = true; qLevel = coarse ? 2 : 0; }
  dpr = maxDpr; renderer.setPixelRatio(dpr); resize(); applyQuality();
  try { localStorage.setItem('ridgeline-moto-gfx', JSON.stringify({ auto: qAuto, level: qLevel })); } catch (e) {}
}
document.querySelectorAll('.js-gfx').forEach(b => b.addEventListener('click', cycleQuality));
function adaptQuality(dt) {
  fpsT += dt; fpsN++;
  if (fpsT < 2.5) return;
  const fps = fpsN / fpsT; fpsT = 0; fpsN = 0;
  if (!qAuto || fps >= 40) return;
  if (qLevel < 2) { qLevel++; applyQuality(); }
  else if (dpr > minDpr) { dpr = Math.max(minDpr, dpr - 0.25); renderer.setPixelRatio(dpr); resize(); }
}
addEventListener('resize', resize);
let last = performance.now(), saveT = 0;
function frame(now) {
  const dt = Math.min(0.05, (now - last) / 1000); last = now; time += dt;
  if (state === 'play') {
    const n = dt > 0.02 ? 2 : 1;
    for (let i = 0; i < n; i++) step(dt / n);
    bikeParticles(dt);
    saveT += dt; if (saveT > 5) { saveT = 0; save(); }
    adaptQuality(dt);
  }
  updateFar(false);
  updateChunks(false);
  updateGrass(false);
  syncBike(dt);
  if (state === 'play') layTracks();
  updParticles(dt);
  updCamera(dt);
  sun.position.set(bike.x + SUN_DIR.x * 160, bike.y + SUN_DIR.y * 160, bike.z + SUN_DIR.z * 160);
  sun.target.position.set(bike.x, bike.y, bike.z);
  water.position.x = Math.round(bike.x / 50) * 50; water.position.z = Math.round(bike.z / 50) * 50;
  waterMat.uniforms.uTime.value = time;
  grassU.uTime.value = time; grassU.uCenter.value.copy(camera.position);
  grassU.uBike.value.set(bike.x, bike.y, bike.z);
  updClouds();
  sky.position.copy(camera.position);
  beamMat.opacity = 0.12 + Math.sin(time * 2.4) * 0.05;
  for (const ch of chunks.values()) for (const fg of ch.flagObjs.values()) fg.userData.cloth.rotation.y = Math.sin(time * 3 + fg.position.x) * 0.35;
  mapT -= dt; nearestT -= dt;
  if (nearestT <= 0) { nearestT = 0.6; findNearest(); }
  if (mapT <= 0 || Math.hypot(bike.x - mapCx, bike.z - mapCz) > 24) { mapT = 0.4; refreshMap(); }
  if (state === 'play') { drawMap(); updHud(); }
  else updAudio(0.1, 0);
  renderFrame();
  requestAnimationFrame(frame);
}

function start(data) {
  renderGarage();
  applyQuality();
  setWorld((data && data.world) || savedWorld, true);
  renderWorlds();
  setBike((data && data.bike) || savedBike);
  if (data && typeof data.x === 'number') {
    refreshNearRamps(data.x, data.z);
    Object.assign(bike, { x: data.x, z: data.z, yaw: data.yaw || 0, y: groundH(data.x, data.z) });
    score = data.score || 0; camMode = data.camMode || 0;
  } else {
    refreshNearRamps(bike.x, bike.z);
    bike.y = groundH(bike.x, bike.z);
  }
  camYaw = bike.yaw;
  resize();
  updateFar(true);
  updateChunks(true);
  updateGrass(true);
  refreshMap(); findNearest();
  camera.position.set(bike.x, bike.y + 3, bike.z - 7);
  if ((data && data.playing) || location.hash === '#ride') { state = 'play'; titleEl.hidden = true; hud.hidden = false; }
  requestAnimationFrame(t => { last = t; frame(t); });
}
try { window.claude?.hot?.snapshot?.(() => ({ x: bike.x, z: bike.z, yaw: bike.yaw, score, camMode, bike: bikeSpec.id, world: W.id, playing: state === 'play' })); } catch (e) {}
window.claude?.hot?.ready ? window.claude.hot.ready(start) : start(window.claude?.hot?.data ?? {});
