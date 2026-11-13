// Ridgeline Moto · core.js
// Math helpers and seeded Perlin noise (with analytic derivatives).
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

const TAU = Math.PI * 2;
const lerp = (a, b, t) => a + (b - a) * t;
const clamp = (v, a, b) => v < a ? a : v > b ? b : v;
const smooth = (e0, e1, x) => { const t = clamp((x - e0) / (e1 - e0), 0, 1); return t * t * (3 - 2 * t); };
const wrapA = a => a - TAU * Math.round(a / TAU);
const damp = (k, dt) => 1 - Math.exp(-k * dt);
const hash01 = (x, z) => Math.abs(Math.sin(x * 12.9898 + z * 78.233) * 43758.5453) % 1;
const hash3 = (x, y, z) => Math.abs(Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453) % 1;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const coarse = matchMedia('(pointer: coarse)').matches;
const $ = id => document.getElementById(id);
const lin = hex => new THREE.Color(hex).convertSRGBToLinear();

/* ---------- Noise ---------- */
function mulberry32(a) { return function () { a |= 0; a = a + 0x6D2B79F5 | 0; let t = Math.imul(a ^ a >>> 15, 1 | a); t = t + Math.imul(t ^ t >>> 7, 61 | t) ^ t; return ((t ^ t >>> 14) >>> 0) / 4294967296; }; }
const perm = new Uint8Array(512);
{ const r = mulberry32(20261112); const p = [...Array(256).keys()]; for (let i = 255; i > 0; i--) { const j = Math.floor(r() * (i + 1)); [p[i], p[j]] = [p[j], p[i]]; } for (let i = 0; i < 512; i++) perm[i] = p[i & 255]; }
const GX = [1, -1, 0, 0, .7071, -.7071, .7071, -.7071], GZ = [0, 0, 1, -1, .7071, .7071, -.7071, -.7071];
function noise(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const aa = perm[perm[X] + Y] & 7, ab = perm[perm[X] + Y + 1] & 7, ba = perm[perm[X + 1] + Y] & 7, bb = perm[perm[X + 1] + Y + 1] & 7;
  const x1 = lerp(GX[aa] * xf + GZ[aa] * yf, GX[ba] * (xf - 1) + GZ[ba] * yf, u);
  const x2 = lerp(GX[ab] * xf + GZ[ab] * (yf - 1), GX[bb] * (xf - 1) + GZ[bb] * (yf - 1), u);
  return lerp(x1, x2, v) * 1.4;
}
// Same Perlin noise, also returning its x/y derivatives (in nd0, nd1, nd2) so the trail width can be measured in metres.
let nd0 = 0, nd1 = 0, nd2 = 0;
function noiseD(x, y) {
  const xi = Math.floor(x), yi = Math.floor(y), xf = x - xi, yf = y - yi, X = xi & 255, Y = yi & 255;
  const u = xf * xf * xf * (xf * (xf * 6 - 15) + 10), v = yf * yf * yf * (yf * (yf * 6 - 15) + 10);
  const du = 30 * xf * xf * (xf - 1) * (xf - 1), dv = 30 * yf * yf * (yf - 1) * (yf - 1);
  const aa = perm[perm[X] + Y] & 7, ab = perm[perm[X] + Y + 1] & 7, ba = perm[perm[X + 1] + Y] & 7, bb = perm[perm[X + 1] + Y + 1] & 7;
  const g00 = GX[aa] * xf + GZ[aa] * yf, g10 = GX[ba] * (xf - 1) + GZ[ba] * yf, g01 = GX[ab] * xf + GZ[ab] * (yf - 1), g11 = GX[bb] * (xf - 1) + GZ[bb] * (yf - 1);
  const x1 = g00 + u * (g10 - g00), x2 = g01 + u * (g11 - g01);
  const x1dx = GX[aa] + du * (g10 - g00) + u * (GX[ba] - GX[aa]), x2dx = GX[ab] + du * (g11 - g01) + u * (GX[bb] - GX[ab]);
  const x1dy = GZ[aa] + u * (GZ[ba] - GZ[aa]), x2dy = GZ[ab] + u * (GZ[bb] - GZ[ab]);
  nd0 = (x1 + v * (x2 - x1)) * 1.4;
  nd1 = (x1dx + v * (x2dx - x1dx)) * 1.4;
  nd2 = (x1dy + v * (x2dy - x1dy) + dv * (x2 - x1)) * 1.4;
}
function fbm(x, y, o) { let s = 0, a = .5, f = 1, n = 0; for (let i = 0; i < o; i++) { s += a * noise(x * f, y * f); n += a; a *= .5; f *= 2.03; } return s / n; }
