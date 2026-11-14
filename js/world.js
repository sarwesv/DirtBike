// Ridgeline Moto · world.js
// Terrain height, Perlin noise trails, ramps and deterministic chunk contents.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- World shape ---------- */
const WATER = 0, CELL = 4, CN = 50, CS = CELL * CN, VIEW_R = 2;
/* Maps. Each one reshapes the same noise world: biome mix, mountain size, tree count, snow line and sky. */
const WORLD_DEFAULTS = { hills: 1, terrace: 0, oak: 0.42, oakMax: 32, foliage: 'summer', ice: false, tint: [1, 1, 1], pal: {}, water: { deep: '#1d4f68', shallow: '#3b8aa0', ice: 0 } };
const WORLDS = [
  { id: 'open', name: 'Open Country', blurb: 'Meadows, pine stands, desert edges, lakes and snowy ridges.', swatch: '#7fa64a',
    desert: null, mount: 1, mountCover: 0, base: 0, forest: 0, trees: 120, bushes: 70, snowLine: 60, treeLine: 64,
    fog: 0.00125, horizon: '#c9d6db', top: '#3d78b6', below: '#97a39a', sun: '#fff1d8' },
  { id: 'forest', name: 'Deep Forest', blurb: 'Dense pines and oaks split by narrow trails. Mind the trunks.', swatch: '#2f5a2c',
    desert: 0, mount: 0.45, mountCover: 0, base: 1.5, forest: 0.6, trees: 400, bushes: 150, snowLine: 90, treeLine: 80,
    fog: 0.0024, horizon: '#b4c4b8', top: '#5d86a4', below: '#7f8f80', sun: '#ffe7c2' },
  { id: 'desert', name: 'Red Desert', blurb: 'Endless dunes, cacti and rock ridges. No lakes, lots of air.', swatch: '#d9995a',
    desert: 1, mount: 0.8, mountCover: 0, base: 7, forest: -1, trees: 130, bushes: 0, snowLine: 200, treeLine: 200,
    fog: 0.0009, horizon: '#e6d2b4', top: '#4a8ac6', below: '#c9b08c', sun: '#fff0cf' },
  { id: 'alpine', name: 'Alpine Ridge', blurb: 'Big mountains, snowfields and steep pine slopes.', swatch: '#dfe8ee',
    desert: 0, mount: 1.6, mountCover: 0.28, base: 4, forest: 0.1, trees: 170, bushes: 40, snowLine: 36, treeLine: 46,
    fog: 0.001, horizon: '#d2dce3', top: '#2c6cb4', below: '#a6b1b6', sun: '#ffffff' }
,
  { id: 'autumn', name: 'Autumn Woods', blurb: 'Red and gold hardwoods over leaf-strewn hills.', swatch: '#c8642a',
    desert: 0, mount: 0.6, mountCover: 0, base: 2, forest: 0.35, trees: 300, bushes: 110, snowLine: 95, treeLine: 85,
    fog: 0.0016, horizon: '#e4d5bf', top: '#5a8cc0', below: '#9b8a70', sun: '#ffe2b0', oak: 0.8, oakMax: 70, foliage: 'autumn',
    pal: { grassA: '#5c5a2c', grassB: '#7a6630', dry: '#8f5a30', dirt: '#6e4a2a', forest: '#7a3c1c' } },
  { id: 'canyon', name: 'Canyonlands', blurb: 'Stepped red-rock mesas, sandstone walls and sandy washes.', swatch: '#b9542e',
    desert: 1, mount: 1.25, mountCover: 0.18, base: 6, forest: -1, trees: 90, bushes: 0, snowLine: 300, treeLine: 300, hills: 1.15, terrace: 0.85,
    fog: 0.0008, horizon: '#ebcaa6', top: '#3f86c8', below: '#c08e66', sun: '#fff0d0',
    pal: { dune: '#c9733e', duneB: '#a8552d', sand: '#d79a62', rock: '#a4553a', rockB: '#7c3b28', dirt: '#9a5a35' } },
  { id: 'tundra', name: 'Frozen Tundra', blurb: 'Snowfields, frosted pines and frozen lakes you can ride across.', swatch: '#e6f0f6',
    desert: 0, mount: 0.9, mountCover: 0.05, base: 1, forest: -0.1, trees: 110, bushes: 20, snowLine: -60, treeLine: 70,
    fog: 0.0019, horizon: '#dde6ee', top: '#6d97c4', below: '#b8c4cc', sun: '#f4f8ff', ice: true, foliage: 'frost', tint: [1.05, 1.08, 1.12],
    water: { deep: '#a9c8d8', shallow: '#d6e8f0', ice: 1 }, pal: { rock: '#7d8590', rockB: '#59606a', snow: '#eef3f8', dirt: '#6d6560' } },
  { id: 'swamp', name: 'Misty Wetlands', blurb: 'Low marsh, winding channels and mossy trees in the fog.', swatch: '#4d6a3a',
    desert: 0, mount: 0.15, mountCover: 0, base: -1.2, hills: 0.55, forest: 0.15, trees: 200, bushes: 160, snowLine: 200, treeLine: 60,
    fog: 0.0032, horizon: '#aebaa8', top: '#7b98a8', below: '#7c8a74', sun: '#f0ead2', oak: 0.7, oakMax: 60, tint: [0.72, 0.82, 0.66],
    water: { deep: '#2a3624', shallow: '#4c5d36', ice: 0 }, pal: { grassA: '#3b5a24', grassB: '#55722c', dry: '#6f7a3a', sand: '#7c7350', wet: '#5a5638', bed: '#3d3a28' } }
].map(w => Object.assign({}, WORLD_DEFAULTS, w));
let W = WORLDS[0];
// Open Country keeps the original flag ids so earlier saves still count.
const flagPrefix = () => W.id === 'open' ? '' : W.id + '/';
function desertness(x, z) { return W.desert !== null ? W.desert : smooth(0.12, 0.38, noise(x * 0.0011 + 77.3, z * 0.0011 - 33.1)); }
function mountainMask(x, z) { return smooth(0.08 - W.mountCover, 0.42 - W.mountCover, noise(x * 0.0008 - 40.7, z * 0.0008 + 21.9)); }
function forestness(x, z) { return clamp(smooth(-0.15, 0.35, noise(x * 0.0045 + 5.2, z * 0.0045 - 8.4)) + W.forest, 0, 1); }
/* Trails: one contour line of domain-warped Perlin noise. Contours never end or branch, so the trail
   winds forever across the map. Dividing by the gradient turns the noise value into metres from the centre line. */
const TR_F = 0.0021, WARP_F = 0.0042, WARP_A = 38, TR_K = WARP_A * WARP_F, TR_HALF = 2.6;
let trailC = 0, trN = 0;
function trailSigned(x, z) {
  noiseD(x * WARP_F + 17.1, z * WARP_F - 3.3); const a0 = nd0, ax = nd1, az = nd2;
  noiseD(x * WARP_F - 9.7, z * WARP_F + 12.9); const b0 = nd0, bx = nd1, bz = nd2;
  noiseD((x + a0 * WARP_A) * TR_F, (z + b0 * WARP_A) * TR_F);
  trN = nd0;
  const nx = nd1 * TR_F, nz = nd2 * TR_F;
  const gx = nx * (1 + TR_K * ax) + nz * TR_K * bx, gz = nx * TR_K * az + nz * (1 + TR_K * bz);
  return (nd0 - trailC) / Math.max(1e-7, Math.hypot(gx, gz));
}
trailSigned(20, 10); trailC = trN; // put a trail right through the starting meadow
// Signed metres from the trail centre. Trails thin out and vanish on tall mountain ridges.
function trailDistS(x, z, mount) {
  const s = 1 - smooth(22, 50, mount);
  if (s < 0.02) return 99;
  return clamp(trailSigned(x, z) / s, -99, 99);
}
function mountainAt(x, z) {
  const mm = mountainMask(x, z);
  if (mm <= 0) return 0;
  const r = 1 - Math.abs(fbm(x * 0.0026 + 3.1, z * 0.0026 + 9.4, 3));
  const d2 = x * x + z * z;
  return mm * r * r * r * 95 * W.mount * (d2 < 170 * 170 ? smooth(90, 170, Math.sqrt(d2)) : 1);
}
const trailAt = (x, z) => trailDistS(x, z, mountainAt(x, z));
let lastTrailD = 99;
function rawHeight(x, z) {
  const hills = fbm(x * 0.0032 + 11.3, z * 0.0032 - 7.7, 4) * 24 * W.hills;
  const mm = mountainMask(x, z);
  let mount = 0;
  if (mm > 0) { const r = 1 - Math.abs(fbm(x * 0.0026 + 3.1, z * 0.0026 + 9.4, 3)); mount = mm * r * r * r * 95 * W.mount; }
  const des = desertness(x, z);
  let dunes = 0;
  if (des > 0) dunes = des * (Math.sin(x * 0.05 + z * 0.018 + noise(x * 0.008, z * 0.008) * 4) * 0.5 + 0.5) * 3.2;
  const bumps = noise(x * 0.07 + .5, z * 0.07 + .5) * 0.45;
  let h = 6 + W.base + hills + mount + dunes + bumps, hs = 6 + W.base + hills + mount + dunes * 0.4;
  if (W.terrace) {
    // Mesas: squeeze height into flat benches separated by steep sandstone steps.
    const step = 7, q = (hs - W.base) / step, k = Math.floor(q), f = q - k, t = (k + smooth(0.55, 0.92, f)) * step + W.base;
    const dh = (t - hs) * W.terrace; h += dh; hs += dh;
  }
  const d2 = x * x + z * z;
  let padK = 1;
  if (d2 < 170 * 170) { padK = smooth(90, 170, Math.sqrt(d2)); h = lerp(9 + W.base + bumps * 0.4, h, padK); hs = lerp(9 + W.base, hs, padK); }
  // Grade the trail: drop the bumps and half the dunes, sink it a touch, fade it out where it fords a lake.
  const td = trailDistS(x, z, mount * padK), ad = Math.abs(td);
  lastTrailD = td;
  if (ad < TR_HALF + 6) h = lerp(h, hs - 0.18, (1 - smooth(TR_HALF, TR_HALF + 6, ad)) * smooth(WATER - 0.5, WATER + 1.5, hs));
  return h;
}
const gridH = (ix, iz) => rawHeight(ix * CELL, iz * CELL);
// Same triangle split as the rendered mesh, so wheels sit exactly on what you see.
function terrainH(x, z) {
  const gx = x / CELL, gz = z / CELL, ix = Math.floor(gx), iz = Math.floor(gz), fx = gx - ix, fz = gz - iz;
  const h00 = gridH(ix, iz), h11 = gridH(ix + 1, iz + 1);
  if (fx > fz) { const h10 = gridH(ix + 1, iz); return h00 + (h10 - h00) * fx + (h11 - h10) * fz; }
  const h01 = gridH(ix, iz + 1); return h00 + (h11 - h01) * fx + (h01 - h00) * fz;
}
function slopeAt(x, z) { return (Math.abs(rawHeight(x + 2, z) - rawHeight(x - 2, z)) + Math.abs(rawHeight(x, z + 2) - rawHeight(x, z - 2))) / 4; }

/* ---------- Ramps ---------- */
function makeRamp(x, z, a, L, W, H) {
  const sa = Math.sin(a), ca = Math.cos(a);
  const pts = [[-L / 2, -W / 2], [-L / 2, W / 2], [L / 2, -W / 2], [L / 2, W / 2], [0, 0]];
  let lo = Infinity, hi = -Infinity;
  for (const [u, w] of pts) { const h = terrainH(x + sa * u + ca * w, z + ca * u - sa * w); lo = Math.min(lo, h); hi = Math.max(hi, h); }
  return { x, z, a, sa, ca, L, W, H, base: lo - 0.05, spread: hi - lo };
}
function rampH(r, x, z) {
  const dx = x - r.x, dz = z - r.z, u = dx * r.sa + dz * r.ca, w = dx * r.ca - dz * r.sa;
  if (u < -r.L / 2 || u > r.L / 2 || w < -r.W / 2 || w > r.W / 2) return -Infinity;
  const t = (u + r.L / 2) / r.L;
  return r.base + r.H * (1 - Math.cos(t * Math.PI / 2));
}
const PRESET_RAMPS = [
  [0, 40, 0, 12, 4.5, 3], [0, 72, Math.PI, 14, 5, 3], [-45, 25, -0.5, 10, 4, 2.2],
  [40, 15, 0.45, 15, 5, 4.4], [-20, -45, Math.PI, 9, 4, 1.6], [55, -35, 2.2, 11, 4.5, 2.8]
];
const PRESET_FLAGS = [[0, 104], [-72, 52], [66, 70]];

/* ---------- Deterministic chunk contents ---------- */
const dataCache = new Map();
function getChunkData(cx, cz) {
  const key = cx + ',' + cz;
  let d = dataCache.get(key);
  if (d) return d;
  const seed = (Math.imul(cx, 73856093) ^ Math.imul(cz, 19349663) ^ 0x5bd1e995) >>> 0;
  const rng = mulberry32(seed);
  d = { trees: [], oaks: [], cacti: [], rocks: [], bushes: [], ramps: [], flags: [], obs: [] };
  const x0 = cx * CS, z0 = cz * CS;
  const inChunk = (x, z) => x >= x0 && x < x0 + CS && z >= z0 && z < z0 + CS;
  PRESET_RAMPS.forEach(p => { if (inChunk(p[0], p[1])) d.ramps.push(makeRamp(...p)); });
  PRESET_FLAGS.forEach((p, i) => { if (inChunk(p[0], p[1])) d.flags.push({ id: flagPrefix() + 'p' + i, x: p[0], z: p[1], y: terrainH(p[0], p[1]) }); });
  for (let i = 0; i < 2; i++) {
    const roll = rng(), x = x0 + 15 + rng() * (CS - 30), z = z0 + 15 + rng() * (CS - 30), a = rng() * TAU, L = 9 + rng() * 6, W = 4 + rng() * 1.5, H = 1.6 + rng() * 2.4;
    if (roll > 0.38 || Math.hypot(x, z) < 110) continue;
    if (rawHeight(x, z) < WATER + 1.5 || slopeAt(x, z) > 0.18) continue;
    const r = makeRamp(x, z, a, L, W, H);
    if (r.spread < H * 0.45 && r.base > WATER + 0.6) d.ramps.push(r);
  }
  const nearRamp = (x, z) => d.ramps.some(r => (x - r.x) ** 2 + (z - r.z) ** 2 < (r.L * 0.75 + 3) ** 2) ||
    PRESET_RAMPS.some(p => (x - p[0]) ** 2 + (z - p[1]) ** 2 < 144);
  const treeTries = Math.round(W.trees * (coarse ? 0.7 : 1));
  for (let i = 0; i < treeTries; i++) {
    const x = x0 + rng() * CS, z = z0 + rng() * CS, r = rng(), s = rng(), rot = rng(), tint = rng();
    if (x * x + z * z < 45 * 45 || nearRamp(x, z)) continue;
    const h = rawHeight(x, z);
    if (Math.abs(lastTrailD) < 5.5) continue;
    if (h < WATER + 1.4 || h > W.treeLine || slopeAt(x, z) > 0.6) continue;
    const des = desertness(x, z);
    if (des > 0.55) {
      if (r < (W.desert === 1 ? 0.11 : 0.07)) { const sc = 0.8 + s * 0.6; const o = { x, z, y: terrainH(x, z) - 0.1, s: sc, rot, tint }; d.cacti.push(o); d.obs.push({ x, z, y: o.y, r: 0.42 * sc, top: 3.2 * sc, kind: 'cactus' }); }
    } else if (r < forestness(x, z) * 0.75 + 0.025) {
      const oak = tint < W.oak && h < W.oakMax;
      const sc = oak ? 0.85 + s * 0.5 : 0.8 + s * 0.7;
      const o = { x, z, y: terrainH(x, z) - 0.15, s: sc, rot, tint: oak ? tint / W.oak : tint };
      (oak ? d.oaks : d.trees).push(o);
      d.obs.push({ x, z, y: o.y, r: (oak ? 0.42 : 0.38) * sc, top: 6.5 * sc, kind: 'tree' });
    }
  }
  for (let i = 0; i < 22; i++) {
    const x = x0 + rng() * CS, z = z0 + rng() * CS, r = rng(), s = rng(), rot = rng(), tint = rng(), sq = rng();
    if (x * x + z * z < 45 * 45 || nearRamp(x, z)) continue;
    const h = rawHeight(x, z);
    if (h < WATER - 0.5 || Math.abs(lastTrailD) < 5) continue;
    if (r > 0.18 + mountainMask(x, z) * 0.6) continue;
    const sc = 0.6 + s * s * 2.2;
    const o = { x, z, y: terrainH(x, z) - sc * 0.25, s: sc, sy: sc * (0.55 + sq * 0.4), rot, tint, tilt: true };
    d.rocks.push(o); d.obs.push({ x, z, y: o.y, r: 0.85 * sc, top: o.sy * 0.9, kind: 'rock' });
  }
  if (rng() < 0.42) {
    for (let t = 0; t < 8; t++) {
      const x = x0 + 10 + rng() * (CS - 20), z = z0 + 10 + rng() * (CS - 20);
      if (Math.hypot(x, z) < 130 || rawHeight(x, z) < WATER + 1 || nearRamp(x, z)) continue;
      if (d.obs.some(o => (o.x - x) ** 2 + (o.z - z) ** 2 < 25)) continue;
      d.flags.push({ id: flagPrefix() + key + ':' + t, x, z, y: terrainH(x, z) });
      break;
    }
  }
  // Decorative bushes use their own stream so they never shift flags or obstacles.
  const r2 = mulberry32(seed ^ 0xa5a5a5);
  for (let i = 0; i < W.bushes; i++) {
    const x = x0 + r2() * CS, z = z0 + r2() * CS, r = r2(), s = r2(), rot = r2(), tint = r2();
    if (x * x + z * z < 30 * 30 || nearRamp(x, z)) continue;
    const h = rawHeight(x, z);
    if (Math.abs(lastTrailD) < 4.5) continue;
    if (h < WATER + 1.2 || h > W.treeLine - 6 || desertness(x, z) > 0.45 || slopeAt(x, z) > 0.45) continue;
    if (r > 0.25 + forestness(x, z) * 0.5) continue;
    d.bushes.push({ x, z, y: terrainH(x, z) - 0.1, s: 0.6 + s * 0.9, sy: (0.6 + s * 0.9) * 0.75, rot, tint });
  }
  dataCache.set(key, d);
  return d;
}
let nearRamps = [];
function rampsAround(x, z) {
  const cx = Math.floor(x / CS), cz = Math.floor(z / CS), out = [];
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) out.push(...getChunkData(cx + i, cz + j).ramps);
  return out;
}
function refreshNearRamps(x, z) { nearRamps = rampsAround(x, z); }
function groundH(x, z) {
  let h = terrainH(x, z);
  if (W.ice && h < WATER) h = WATER; // frozen lakes carry the bike
  for (const r of nearRamps) { const rh = rampH(r, x, z); if (rh > h) h = rh; }
  return h;
}
