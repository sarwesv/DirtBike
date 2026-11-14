// Ridgeline Moto · weather.js
// Time of day (day, sunset, night, cycle) and weather (clear, rain, snow): sun and moon, sky, fog,
// stars, headlight, rain and snow particles, wet ground and rain sound.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Settings ---------- */
const TIMES = [
  { id: 'day', name: 'Day', tod: 0.40 },
  { id: 'sunset', name: 'Sunset', tod: 0.735 },
  { id: 'night', name: 'Night', tod: 0.03 },
  { id: 'cycle', name: 'Cycle', tod: null }
];
const WEATHERS = ['auto', 'clear', 'rain', 'snow'];
const ENV_KEY = 'ridgeline-moto-env';
let envSet = { time: 'day', weather: 'auto' };
try { Object.assign(envSet, JSON.parse(localStorage.getItem(ENV_KEY) || '{}')); } catch (e) {}
let tod = (TIMES.find(t => t.id === envSet.time) || TIMES[0]).tod || 0.4;
let nightness = 0, envRebuildT = 0;
const activeWeather = () => envSet.weather !== 'auto' ? envSet.weather : W.id === 'tundra' ? 'snow' : W.id === 'swamp' ? 'rain' : 'clear';

/* ---------- Sky objects: stars and headlight ---------- */
const stars = (() => {
  const n = 2200, pos = new Float32Array(n * 3), rnd = mulberry32(5150);
  for (let i = 0; i < n; i++) {
    const u = rnd() * 0.95 + 0.05, a = rnd() * TAU, s = Math.sqrt(1 - u * u);
    pos.set([Math.cos(a) * s * 2500, u * 2500, Math.sin(a) * s * 2500], i * 3);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const m = new THREE.PointsMaterial({ color: 0xffffff, size: 1.6, sizeAttenuation: false, transparent: true, opacity: 0, fog: false, depthWrite: false });
  const p = new THREE.Points(g, m); p.frustumCulled = false; p.renderOrder = -1; scene.add(p);
  return p;
})();
// The headlight stays in the scene at zero intensity in daylight so materials never recompile.
const headlight = new THREE.SpotLight(lin('#fff1d2'), 0, 70, 0.48, 0.55, 1.4);
scene.add(headlight, headlight.target);

/* ---------- Rain and snow ---------- */
const RAIN_N = coarse ? 1400 : 3200, SNOW_N = coarse ? 1200 : 2600;
const rainPos = new Float32Array(RAIN_N * 6), rainGeo = new THREE.BufferGeometry();
rainGeo.setAttribute('position', new THREE.BufferAttribute(rainPos, 3));
const rain = new THREE.LineSegments(rainGeo, new THREE.LineBasicMaterial({ color: lin('#b9c8d6'), transparent: true, opacity: 0.42, depthWrite: false }));
rain.frustumCulled = false; rain.visible = false; scene.add(rain);
const snowPos = new Float32Array(SNOW_N * 3), snowGeo = new THREE.BufferGeometry();
snowGeo.setAttribute('position', new THREE.BufferAttribute(snowPos, 3));
const snow = new THREE.Points(snowGeo, new THREE.PointsMaterial({ color: 0xffffff, size: 0.22, map: dotTex, transparent: true, opacity: 0.9, depthWrite: false }));
snow.frustumCulled = false; snow.visible = false; scene.add(snow);
const rnd01 = Math.random;
for (let i = 0; i < RAIN_N; i++) rainPos.set([(rnd01() - 0.5) * 80, rnd01() * 40, (rnd01() - 0.5) * 80], i * 6);
for (let i = 0; i < SNOW_N; i++) snowPos.set([(rnd01() - 0.5) * 70, rnd01() * 30, (rnd01() - 0.5) * 70], i * 3);
let rainAmt = 0, snowAmt = 0;

/* ---------- Rain sound ---------- */
let rainSound = null;
function rainAudio(v) {
  if (!audio) return;
  if (!rainSound) {
    const ac = audio.ac, buf = ac.createBuffer(1, ac.sampleRate * 2, ac.sampleRate), d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const src = ac.createBufferSource(); src.buffer = buf; src.loop = true;
    const f = ac.createBiquadFilter(); f.type = 'bandpass'; f.frequency.value = 1600; f.Q.value = 0.6;
    const g = ac.createGain(); g.gain.value = 0;
    src.connect(f); f.connect(g); g.connect(audio.master); src.start();
    rainSound = g;
  }
  rainSound.gain.setTargetAtTime(muted || state !== 'play' ? 0 : v * 0.09, audio.ac.currentTime, 0.4);
}

/* ---------- Lighting from time of day ---------- */
const SUNSET_COL = '#ef9e6c', NIGHT_COL = '#0a1019';
const tmpC1 = new THREE.Color(), tmpC2 = new THREE.Color();
function sunDirFor(t) {
  const h = TAU * (t - 0.25);
  return new THREE.Vector3(Math.cos(h) * 0.9, Math.sin(h) * 0.78, 0.42).normalize();
}
// Rebuilding the image-based light is expensive, so `rebuild` is only passed on changes (and every few seconds in Cycle).
function applyTimeOfDay(rebuild) {
  const sd = sunDirFor(tod), y = sd.y, wx = activeWeather();
  const storm = wx === 'rain' ? 1 : wx === 'snow' ? 0.6 : 0;
  nightness = smooth(0.02, -0.16, y);
  const dusk = smooth(0.38, 0.04, y) * smooth(-0.14, 0.0, y);
  // Light: the sun by day, a pale moon by night.
  if (y > -0.04) SUN_DIR.copy(sd);
  else SUN_DIR.set(-sd.x * 0.6, Math.max(0.45, -y), 0.35).normalize();
  sun.intensity = 2.2 * smooth(-0.02, 0.22, y) * (1 - storm * 0.55) + 0.16 * nightness;
  sun.color.copy(lin(W.sun)).lerp(lin('#ff9b55'), dusk * 0.85).lerp(lin('#8fa8e0'), nightness);
  skyMat.uniforms.sunPosition.value.copy(sd).multiplyScalar(4000);
  skyMat.uniforms.nightTint.value.copy(lin('#0c1a33')).multiplyScalar(nightness * 0.9);
  skyMat.uniforms.skyGain.value = 0.42 * (1 - storm * 0.35);
  skyMat.uniforms.turbidity.value = (SKY_AIR[W.id] || SKY_AIR.open).turbidity + storm * 8;
  scene.children.forEach(o => { if (o.isHemisphereLight) o.intensity = 0.22 * (1 - nightness * 0.9) * (1 - storm * 0.2) + 0.02; });
  renderer.toneMappingExposure = 0.98 + nightness * 0.2 + storm * 0.12;
  // Fog and horizon: warm at dusk, deep blue at night, grey in rain.
  tmpC1.set(W.horizon).lerp(tmpC2.set(SUNSET_COL), dusk * 0.6).lerp(tmpC2.set('#9aa3ab'), storm * 0.55).lerp(tmpC2.set(NIGHT_COL), nightness * 0.94);
  HORIZON.copy(typeof post !== 'undefined' && post ? tmpC1.clone().convertSRGBToLinear() : tmpC1);
  scene.fog.density = W.fog * (1 + storm * 0.9 + nightness * 0.3);
  stars.material.opacity = nightness * (1 - storm);
  headlight.intensity = 4.5 * smooth(0.12, -0.06, y);
  if (rebuild) buildEnv();
  envLabels();
}

/* ---------- Per-frame update ---------- */
function weatherTick(dt) {
  const t = TIMES.find(x => x.id === envSet.time) || TIMES[0];
  if (t.tod === null) {
    tod = (tod + dt / 480) % 1; // one full day every 8 minutes
    envRebuildT -= dt;
    applyTimeOfDay(envRebuildT <= 0);
    if (envRebuildT <= 0) envRebuildT = 4;
  }
  // Headlight follows the bike.
  const b = bike, fx = Math.sin(b.yaw), fz = Math.cos(b.yaw);
  headlight.position.set(b.x + fx * 0.8, b.y + 1.15, b.z + fz * 0.8);
  headlight.target.position.set(b.x + fx * 22, b.y - 1.5, b.z + fz * 22);
  stars.position.copy(camera.position);
  // Rain and snow fade in and out.
  const wx = activeWeather();
  rainAmt = lerp(rainAmt, wx === 'rain' ? 1 : 0, damp(1.5, dt));
  snowAmt = lerp(snowAmt, wx === 'snow' ? 1 : 0, damp(1.5, dt));
  wetness = lerp(wetness, wx === 'rain' ? 1 : 0, damp(0.25, dt));
  envU.uWet.value = wetness;
  rain.visible = rainAmt > 0.02; snow.visible = snowAmt > 0.02;
  const cx = camera.position.x, cy = camera.position.y, cz = camera.position.z;
  if (rain.visible) {
    rain.material.opacity = 0.42 * rainAmt;
    const vx = 1.5, vy = -24;
    for (let i = 0; i < RAIN_N; i++) {
      const o = i * 6;
      let x = rainPos[o] + vx * dt, y = rainPos[o + 1] + vy * dt, z = rainPos[o + 2];
      if (y < cy - 12 || Math.abs(x - cx) > 40 || Math.abs(z - cz) > 40) { x = cx + (Math.random() - 0.5) * 80; z = cz + (Math.random() - 0.5) * 80; y = cy + 6 + Math.random() * 26; }
      rainPos[o] = x; rainPos[o + 1] = y; rainPos[o + 2] = z;
      rainPos[o + 3] = x - vx * 0.03; rainPos[o + 4] = y - vy * 0.03; rainPos[o + 5] = z;
    }
    rainGeo.attributes.position.needsUpdate = true;
  }
  if (snow.visible) {
    snow.material.opacity = 0.9 * snowAmt;
    for (let i = 0; i < SNOW_N; i++) {
      const o = i * 3;
      let x = snowPos[o] + Math.sin(time * 0.8 + i) * 0.6 * dt + 0.5 * dt, y = snowPos[o + 1] - 1.4 * dt, z = snowPos[o + 2] + Math.cos(time * 0.6 + i * 1.3) * 0.5 * dt;
      if (y < cy - 8 || Math.abs(x - cx) > 35 || Math.abs(z - cz) > 35) { x = cx + (Math.random() - 0.5) * 70; z = cz + (Math.random() - 0.5) * 70; y = cy + 4 + Math.random() * 22; }
      snowPos[o] = x; snowPos[o + 1] = y; snowPos[o + 2] = z;
    }
    snowGeo.attributes.position.needsUpdate = true;
  }
  rainAudio(rainAmt);
}

/* ---------- Buttons on the title / pause screen ---------- */
function envLabels() {
  const t = TIMES.find(x => x.id === envSet.time) || TIMES[0], wx = envSet.weather;
  document.querySelectorAll('.js-time').forEach(b => { b.textContent = 'Time: ' + t.name; });
  const aw = activeWeather(), names = { auto: 'Auto', clear: 'Clear', rain: 'Rain', snow: 'Snow' };
  document.querySelectorAll('.js-weather').forEach(b => { b.textContent = 'Weather: ' + (wx === 'auto' ? 'Auto · ' + names[aw] : names[wx]); });
}
function saveEnv() { try { localStorage.setItem(ENV_KEY, JSON.stringify(envSet)); } catch (e) {} }
document.querySelectorAll('.js-time').forEach(b => b.addEventListener('click', () => {
  const i = TIMES.findIndex(x => x.id === envSet.time), n = TIMES[(i + 1) % TIMES.length];
  envSet.time = n.id; if (n.tod !== null) tod = n.tod;
  saveEnv(); applyTimeOfDay(true); envLabels();
}));
document.querySelectorAll('.js-weather').forEach(b => b.addEventListener('click', () => {
  envSet.weather = WEATHERS[(WEATHERS.indexOf(envSet.weather) + 1) % WEATHERS.length];
  saveEnv(); applyTimeOfDay(true); envLabels();
}));
