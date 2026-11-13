// Ridgeline Moto · bikes.js
// Bike specs, 3D bike and rider model, garage picker.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Bike model ---------- */
const R_WHEEL = 0.36;
const BIKES = [
  { id: 'trail', name: 'Trail 250', num: '27', blurb: 'The all-rounder. Forgiving landings, steady in the air.',
    plastic: '#f2642a', plastic2: '#f2642a', jersey: '#23596a', accent: '#d9a441', plateBg: '#ffcf33', plateInk: '#15140f', numInk: '#15140f',
    scale: 1, top: 31, boostTop: 44, acc: 15, boostAcc: 24, turn: 1, air: 1, tough: 1 },
  { id: 'pit', name: 'Pit 125', num: '7', blurb: 'Tiny and twitchy. Flips and spins fastest, runs out of puff early.',
    plastic: '#46b04a', plastic2: '#2d2f33', jersey: '#2b2d6e', accent: '#c4c9ce', plateBg: '#f4f1e8', plateInk: '#15140f', numInk: '#0f2a10',
    scale: 0.82, top: 24, boostTop: 34, acc: 17, boostAcc: 26, turn: 1.3, air: 1.45, tough: 0.85 },
  { id: 'enduro', name: 'Enduro 450', num: '45', blurb: 'Torquey and planted. Shrugs off hard landings.',
    plastic: '#2f6fd6', plastic2: '#f4f1e8', jersey: '#ece7da', accent: '#d9a441', plateBg: '#f4f1e8', plateInk: '#1d3f86', numInk: '#ffffff',
    scale: 1.05, top: 36, boostTop: 50, acc: 18, boostAcc: 28, turn: 0.9, air: 0.85, tough: 1.35 },
  { id: 'rally', name: 'Rally 500', num: '1', blurb: 'Built for flat-out desert stages. Heavy to throw around.',
    plastic: '#f1eee6', plastic2: '#d42b2b', jersey: '#d42b2b', accent: '#3a3d42', plateBg: '#f1eee6', plateInk: '#d42b2b', numInk: '#d42b2b',
    scale: 1.1, top: 42, boostTop: 56, acc: 16, boostAcc: 26, turn: 0.78, air: 0.7, tough: 1.2, rally: true },
  { id: 'super', name: 'Supermoto 690', num: '69', blurb: 'Road-bred and brutal. Highest top speed, clumsy off a jump.',
    plastic: '#1e1f23', plastic2: '#ffcf33', jersey: '#1e1f23', accent: '#ffcf33', plateBg: '#ffcf33', plateInk: '#15140f', numInk: '#ffcf33',
    scale: 1.06, top: 46, boostTop: 60, acc: 17, boostAcc: 28, turn: 0.95, air: 0.75, tough: 1.0 },
  { id: 'volt', name: 'Volt E-MX', num: 'E1', blurb: 'Electric. Instant torque off every corner, light in the air.',
    plastic: '#e9f1f2', plastic2: '#1fb8b0', jersey: '#1fb8b0', accent: '#1fb8b0', plateBg: '#1fb8b0', plateInk: '#f4f1e8', numInk: '#0d5c58',
    scale: 0.96, top: 33, boostTop: 47, acc: 21, boostAcc: 30, turn: 1.12, air: 1.2, tough: 0.95, electric: true },
  { id: 'scrambler', name: 'Scrambler 74', num: '74', blurb: 'A 1970s classic. Gentle power, soft and forgiving.',
    plastic: '#e8dcc0', plastic2: '#7a3b22', jersey: '#7a3b22', accent: '#d6dade', plateBg: '#f1eadb', plateInk: '#7a3b22', numInk: '#7a3b22',
    scale: 1.02, top: 29, boostTop: 41, acc: 13, boostAcc: 21, turn: 1.05, air: 0.9, tough: 1.3, vintage: true }
];
let bikeSpec = BIKES[0];
// Per-bike colours that are not part of the handling spec.
const LOOKS = {
  trail:  { frame: '#2a2c31', pants: '#2c3a44', helmet: '#f4f1e8', lens: '#ff9a3c', rim: '#1d1d20' },
  pit:    { frame: '#c4c9ce', pants: '#2b2d6e', helmet: '#46b04a', lens: '#7ad8ff', rim: '#c4c9ce' },
  enduro: { frame: '#2f6fd6', pants: '#1f2f55', helmet: '#2f6fd6', lens: '#ffd84a', rim: '#d9a441' },
  rally:  { frame: '#c4c9ce', pants: '#e9e5da', helmet: '#f1eee6', lens: '#ff5a3c', rim: '#1d1d20' },
  super:  { frame: '#c8323a', pants: '#1e1f23', helmet: '#ffcf33', lens: '#9a6bff', rim: '#ffcf33' },
  volt:   { frame: '#2a2c31', pants: '#2a2c31', helmet: '#e9f1f2', lens: '#7ad8ff', rim: '#1fb8b0' },
  scrambler: { frame: '#1d1d20', pants: '#3b4a5a', helmet: '#e8dcc0', lens: '#c7a24a', rim: '#d6dade' }
};
function plateTexture(spec, transparent) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96;
  const x = cv.getContext('2d');
  if (!transparent) { x.fillStyle = spec.plateBg; x.fillRect(0, 0, 128, 96); }
  x.fillStyle = transparent ? '#f4f1e8' : spec.plateInk; x.font = '700 72px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(spec.num, 64, 52);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t;
}
// Shroud graphics: race stripes in the bike's colours, laid out in metres on the panel.
function shroudTexture(spec, z0, z1, y0, y1) {
  const cv = document.createElement('canvas'); cv.width = 256; cv.height = 160;
  const x = cv.getContext('2d');
  x.fillStyle = spec.plastic; x.fillRect(0, 0, 256, 160);
  x.save(); x.transform(1, 0, -0.55, 1, 0, 0);
  x.fillStyle = spec.plastic2 === spec.plastic ? '#15140f' : spec.plastic2; x.fillRect(70, 0, 46, 160); x.fillRect(150, 0, 18, 160);
  x.fillStyle = '#f4f1e8'; x.fillRect(122, 0, 14, 160); x.fillRect(176, 0, 8, 160);
  x.restore();
  x.fillStyle = 'rgba(0,0,0,0.18)'; x.fillRect(0, 130, 256, 30);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding;
  t.repeat.set(1 / (z1 - z0), 1 / (y1 - y0)); t.offset.set(-z0 / (z1 - z0), -y0 / (y1 - y0));
  return t;
}
function buildBike(spec) {
  const look = LOOKS[spec.id] || LOOKS.trail;
  const root = new THREE.Group();
  const wheelie = new THREE.Group(); wheelie.position.set(0, 0, -0.72); root.add(wheelie);
  const body = new THREE.Group(); body.position.set(0, 0, 0.72); wheelie.add(body);
  const steer = new THREE.Group(); steer.position.set(0, 0, 0.6); body.add(steer);

  const S = (c, rough = 0.55, metal = 0) => new THREE.MeshStandardMaterial({ color: lin(c), roughness: rough, metalness: metal });
  const G = (c, rough = 0.3) => new THREE.MeshPhysicalMaterial({ color: lin(c), roughness: rough, metalness: 0, clearcoat: 0.9, clearcoatRoughness: 0.12 });
  const plastic = G(spec.plastic), plastic2 = G(spec.plastic2), plateMat = G(spec.plateBg, 0.4);
  const rubber = S('#18181b', 0.92), black = S('#1d1d20', 0.6), chrome = S('#d6dade', 0.18, 1), alu = S('#a7adb3', 0.32, 0.9);
  const darkMetal = S('#3a3d42', 0.45, 0.7), mag = S('#7d8075', 0.5, 0.6), frameMat = S(look.frame, 0.35, 0.6), accent = S(spec.accent, 0.3, 0.9);
  const rimMat = S(look.rim, 0.3, 0.9), seatMat = S('#232327', 0.85), spring = S('#e8b92e', 0.35, 0.6);
  const jersey = S(spec.jersey, 0.85), pants = S(look.pants, 0.85), bootMat = G('#efece4', 0.45), glove = S('#202024', 0.8);
  const helmetMat = G(look.helmet, 0.22), lens = S(look.lens, 0.08, 1), strap = S('#151517', 0.7);

  const V = a => new THREE.Vector3(...a), Y = new THREE.Vector3(0, 1, 0);
  const put = (parent, geo, mat, p = [0, 0, 0], r = [0, 0, 0]) => { const m = new THREE.Mesh(geo, mat); m.position.set(...p); m.rotation.set(...r); parent.add(m); return m; };
  // Closed outline in (forward z, up y), rounded with quadratic curves through edge midpoints.
  const outline = pts => {
    const s = new THREE.Shape(), n = pts.length, mid = (a, b) => [(a[0] + b[0]) / 2, (a[1] + b[1]) / 2];
    const m0 = mid(pts[0], pts[1]); s.moveTo(m0[0], m0[1]);
    for (let i = 1; i <= n; i++) { const p = pts[i % n], m = mid(p, pts[(i + 1) % n]); s.quadraticCurveTo(p[0], p[1], m[0], m[1]); }
    return s;
  };
  // Side-profile slab: outline extruded sideways with a soft bevel, centred on x.
  const slab = (parent, pts, width, mat, x = 0, bevel = 0.012) => {
    const d = Math.max(0.002, width - 2 * bevel);
    const g = new THREE.ExtrudeGeometry(outline(pts), { depth: d, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 3, curveSegments: 8 });
    g.rotateY(-Math.PI / 2); g.translate(d / 2 + x, 0, 0);
    return put(parent, g, mat);
  };
  const tube = (parent, pts, r, mat, seg = 32) => put(parent, new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts.map(V)), seg, r, 8, false), mat);
  // Tapered capsule from a to b (radius r1 at a, r2 at b).
  const capsule = (parent, a, b, r1, r2, mat, sx = 1, sz = 1) => {
    const va = V(a), dir = V(b).sub(va), len = dir.length(), pts = [];
    for (let i = 0; i <= 5; i++) { const t = -Math.PI / 2 + i / 5 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, r1 * Math.cos(t)), r1 * Math.sin(t))); }
    for (let i = 0; i <= 5; i++) { const t = i / 5 * Math.PI / 2; pts.push(new THREE.Vector2(Math.max(1e-4, r2 * Math.cos(t)), len + r2 * Math.sin(t))); }
    const m = put(parent, new THREE.LatheGeometry(pts, 14), mat);
    m.position.copy(va); m.quaternion.setFromUnitVectors(Y, dir.normalize()); m.scale.set(sx, 1, sz);
    return m;
  };
  const disc = (parent, r, thick, mat, p, seg = 24) => put(parent, new THREE.CylinderGeometry(r, r, thick, seg), mat, p, [0, 0, Math.PI / 2]);

  /* Wheels: knobby tyre, coloured rim, 32 laced spokes, hub and wavy brake disc. */
  const wheel = (parent, z, front) => {
    const g = new THREE.Group();
    put(g, new THREE.TorusGeometry(R_WHEEL - 0.075, 0.082, 12, 36), rubber, [0, 0, 0], [0, Math.PI / 2, 0]);
    const knobs = [];
    for (let k = 0; k < 40; k++) {
      const a = k / 40 * TAU, off = (k % 2 ? 0.045 : -0.045), rr = R_WHEEL - 0.006;
      knobs.push([new THREE.BoxGeometry(0.05, 0.03, 0.05), '#18181b', mtx(off, Math.cos(a) * rr, Math.sin(a) * rr, -a, 0, 0)]);
      if (k % 2 === 0) knobs.push([new THREE.BoxGeometry(0.04, 0.026, 0.045), '#18181b', mtx(0, Math.cos(a + 0.08) * rr, Math.sin(a + 0.08) * rr, -a - 0.08, 0, 0)]);
    }
    put(g, mergeParts(knobs), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.92 }));
    put(g, new THREE.TorusGeometry(R_WHEEL - 0.15, 0.022, 6, 36), rimMat, [0, 0, 0], [0, Math.PI / 2, 0]);
    const spokes = [];
    for (let k = 0; k < 32; k++) {
      const a = k / 32 * TAU, side = k % 2 ? 1 : -1, len = R_WHEEL - 0.16;
      spokes.push([new THREE.CylinderGeometry(0.0035, 0.0035, len, 4), '#d6dade', mtx(side * 0.025, Math.cos(a) * len / 2, Math.sin(a) * len / 2, a + side * 0.12, 0, side * 0.08)]);
    }
    put(g, mergeParts(spokes), new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.25, metalness: 1 }));
    disc(g, 0.045, 0.17, alu, [0, 0, 0], 14);
    disc(g, 0.07, 0.03, alu, [0.06, 0, 0], 16); disc(g, 0.07, 0.03, alu, [-0.06, 0, 0], 16);
    const rotor = new THREE.CylinderGeometry(front ? 0.13 : 0.11, front ? 0.13 : 0.11, 0.006, 24);
    const rp = rotor.attributes.position;
    for (let i = 0; i < rp.count; i++) { const x = rp.getX(i), z = rp.getZ(i), a = Math.atan2(z, x), r = Math.hypot(x, z); if (r > 0.05) { const k = 1 + Math.sin(a * 12) * 0.05; rp.setX(i, x * k); rp.setZ(i, z * k); } }
    put(g, rotor, chrome, [front ? -0.085 : 0.085, 0, 0], [0, 0, Math.PI / 2]);
    if (!front) disc(g, 0.11, 0.008, accent, [-0.09, 0, 0], 28);
    g.position.set(0, R_WHEEL, z); parent.add(g); return g;
  };
  const rear = wheel(body, -0.72, false);
  const front = wheel(steer, 0.12, true);

  /* Frame: twin spars from the steering head, a cradle under the engine and a rear subframe. */
  for (const s of [-1, 1]) {
    tube(body, [[0, 1.0, 0.47], [s * 0.08, 0.95, 0.3], [s * 0.12, 0.86, 0.04], [s * 0.125, 0.66, -0.1], [s * 0.11, 0.42, -0.1], [s * 0.08, 0.3, 0.08], [s * 0.06, 0.32, 0.3]], 0.024, frameMat, 48);
    tube(body, [[s * 0.12, 0.84, -0.04], [s * 0.11, 0.9, -0.35], [s * 0.1, 0.93, -0.62]], 0.016, frameMat);
    tube(body, [[s * 0.12, 0.6, -0.12], [s * 0.11, 0.78, -0.4], [s * 0.1, 0.9, -0.58]], 0.013, frameMat);
  }
  tube(body, [[0, 1.0, 0.47], [0, 0.78, 0.43], [0.0, 0.52, 0.38], [0.04, 0.34, 0.32]], 0.026, frameMat);
  capsule(body, [0, 0.94, 0.5], [0, 1.1, 0.44], 0.04, 0.04, frameMat);

  /* Engine: crankcase, finned barrel, covers. The electric bike gets a battery pack and motor instead. */
  if (spec.electric) {
    slab(body, [[-0.14, 0.32], [0.3, 0.3], [0.4, 0.5], [0.34, 0.8], [0.02, 0.84], [-0.14, 0.62]], 0.24, darkMetal, 0, 0.025);
    for (const s of [-1, 1]) slab(body, [[-0.1, 0.36], [0.28, 0.34], [0.36, 0.5], [0.3, 0.76], [0.04, 0.78], [-0.1, 0.6]], 0.02, plastic2, s * 0.13, 0.006);
    disc(body, 0.1, 0.16, alu, [0, 0.42, -0.08], 24);
  } else {
  slab(body, [[-0.12, 0.33], [0.24, 0.3], [0.33, 0.42], [0.27, 0.57], [0.05, 0.62], [-0.12, 0.56]], 0.24, darkMetal);
  disc(body, 0.11, 0.05, mag, [0.135, 0.44, 0.06], 28);
  disc(body, 0.08, 0.04, mag, [-0.13, 0.46, 0.0], 24);
  capsule(body, [0, 0.55, 0.12], [0, 0.8, 0.22], 0.09, 0.08, alu);
  for (let k = 0; k < 6; k++) {
    const t = k / 5, p = [0, 0.6 + t * 0.18, 0.14 + t * 0.07];
    put(body, new THREE.CylinderGeometry(0.125, 0.125, 0.012, 20), alu, p, [-0.38, 0, 0]);
  }
  put(body, new THREE.BoxGeometry(0.2, 0.08, 0.18), darkMetal, [0, 0.84, 0.24], [-0.38, 0, 0]);
  }

  /* Drivetrain: front and rear sprockets with the chain run between them. */
  disc(body, 0.045, 0.02, darkMetal, [-0.115, 0.43, -0.02], 16);
  tube(body, [[-0.112, 0.475, -0.02], [-0.112, 0.476, -0.38], [-0.112, 0.475, -0.72]], 0.008, darkMetal, 8);
  tube(body, [[-0.112, 0.385, -0.02], [-0.112, 0.31, -0.38], [-0.112, 0.25, -0.72]], 0.008, darkMetal, 8);

  /* Swingarm and rear shock with a coil spring. */
  for (const s of [-1, 1]) slab(body, [[0.0, 0.5], [-0.3, 0.47], [-0.72, 0.41], [-0.79, 0.36], [-0.72, 0.31], [-0.3, 0.38], [-0.02, 0.41]], 0.035, alu, s * 0.1);
  put(body, new THREE.BoxGeometry(0.22, 0.05, 0.08), alu, [0, 0.44, -0.3]);
  capsule(body, [0, 0.44, -0.27], [0, 0.88, -0.1], 0.024, 0.03, chrome);
  {
    const a = V([0, 0.5, -0.25]), b = V([0, 0.82, -0.12]), axis = b.clone().sub(a), pts = [];
    const u = new THREE.Vector3(1, 0, 0), w = new THREE.Vector3().crossVectors(axis.clone().normalize(), u);
    for (let i = 0; i <= 120; i++) { const t = i / 120, ang = t * TAU * 9; pts.push(a.clone().addScaledVector(axis, t).addScaledVector(u, Math.cos(ang) * 0.052).addScaledVector(w, Math.sin(ang) * 0.052).toArray()); }
    tube(body, pts, 0.009, spring, 360);
  }
  capsule(body, [0.06, 0.8, -0.18], [0.06, 0.86, -0.02], 0.03, 0.03, spring);

  /* Exhaust: header wraps the barrel and runs back into a silencer under the side panel. */
  if (!spec.electric) {
  tube(body, [[0.04, 0.74, 0.27], [0.11, 0.64, 0.37], [0.16, 0.45, 0.32], [0.18, 0.4, 0.08], [0.18, 0.56, -0.2], [0.165, 0.74, -0.42]], 0.034, chrome, 48);
  capsule(body, [0.165, 0.74, -0.42], [0.165, 0.89, -0.92], 0.07, 0.06, alu);
  capsule(body, [0.165, 0.89, -0.92], [0.165, 0.9, -0.97], 0.045, 0.03, black);
  }
  if (spec.vintage) {
    // Twin chrome pipes swept high along the side, plus a round headlamp.
    tube(body, [[0.06, 0.74, 0.27], [0.15, 0.7, 0.3], [0.2, 0.86, 0.0], [0.2, 0.92, -0.5]], 0.03, chrome, 32);
    capsule(body, [0.2, 0.92, -0.5], [0.2, 0.96, -0.86], 0.055, 0.05, chrome);
  }
  if (spec.rally) {
    tube(body, [[-0.04, 0.74, 0.27], [-0.12, 0.6, 0.3], [-0.18, 0.5, 0.0], [-0.18, 0.6, -0.25], [-0.165, 0.74, -0.42]], 0.032, chrome, 40);
    capsule(body, [-0.165, 0.74, -0.42], [-0.165, 0.89, -0.92], 0.07, 0.06, alu);
  }

  /* Radiators behind the shrouds. */
  for (const s of [-1, 1]) {
    put(body, new THREE.BoxGeometry(0.05, 0.28, 0.22), black, [s * 0.125, 0.78, 0.31], [0.12, 0, 0]);
    put(body, new THREE.BoxGeometry(0.052, 0.24, 0.18), darkMetal, [s * 0.13, 0.78, 0.31], [0.12, 0, 0]);
  }

  /* Bodywork: tank, shrouds with race graphics, seat, rear fender, number boards. */
  const tankPts = spec.rally
    ? [[-0.02, 0.84], [0.46, 0.84], [0.56, 0.98], [0.44, 1.1], [0.08, 1.07], [-0.06, 0.97]]
    : [[0.0, 0.86], [0.42, 0.9], [0.5, 0.98], [0.4, 1.04], [0.1, 1.02], [-0.04, 0.96]];
  slab(body, tankPts, spec.rally ? 0.44 : 0.3, spec.rally ? plastic2 : plastic, 0, 0.03);
  const shroudPts = [[0.08, 0.72], [0.44, 0.64], [0.62, 0.84], [0.58, 1.04], [0.3, 1.06], [0.06, 0.98]];
  const shroudMat = new THREE.MeshPhysicalMaterial({ map: shroudTexture(spec, 0.04, 0.64, 0.62, 1.08), roughness: 0.3, clearcoat: 0.9, clearcoatRoughness: 0.12 });
  for (const s of [-1, 1]) slab(body, shroudPts, 0.03, shroudMat, s * 0.165, 0.008);
  slab(body, [[0.14, 0.98], [0.06, 1.05], [-0.3, 1.04], [-0.66, 1.0], [-0.7, 0.95], [-0.3, 0.93], [0.08, 0.92]], 0.25, seatMat, 0, 0.03);
  slab(body, [[-0.28, 0.93], [-0.7, 0.97], [-1.06, 1.04], [-1.1, 1.0], [-0.7, 0.92], [-0.36, 0.87]], 0.21, plastic, 0, 0.01);
  for (const s of [-1, 1]) {
    slab(body, [[-0.12, 0.92], [-0.62, 0.97], [-0.64, 0.8], [-0.26, 0.7]], 0.03, plateMat, s * 0.13, 0.008);
    put(body, new THREE.PlaneGeometry(0.24, 0.18), new THREE.MeshStandardMaterial({ map: plateTexture(spec), roughness: 0.4, transparent: true, polygonOffset: true, polygonOffsetFactor: -1 }), [s * 0.162, 0.86, -0.41], [0, s * Math.PI / 2, 0]);
  }
  for (const s of [-1, 1]) put(body, new THREE.BoxGeometry(0.1, 0.025, 0.06), alu, [s * 0.2, 0.5, 0.0]);

  /* Front end (turns with the bars): fork, clamps, fender, bars, plate. */
  for (const s of [-1, 1]) {
    capsule(steer, [s * 0.1, R_WHEEL, 0.12], [s * 0.1, 0.78, 0.0], 0.034, 0.034, accent);
    capsule(steer, [s * 0.1, 0.74, 0.01], [s * 0.1, 1.14, -0.12], 0.026, 0.026, chrome);
    slab(steer, [[0.17, 0.38], [0.11, 0.42], [0.0, 0.74], [-0.03, 0.72], [0.08, 0.4]], 0.02, plastic2, s * 0.135, 0.006);
  }
  put(steer, new THREE.BoxGeometry(0.3, 0.05, 0.1), alu, [0, 0.98, -0.07], [-0.32, 0, 0]);
  put(steer, new THREE.BoxGeometry(0.3, 0.05, 0.1), alu, [0, 1.13, -0.12], [-0.32, 0, 0]);
  slab(steer, [[-0.14, 0.82], [0.1, 0.87], [0.36, 0.85], [0.62, 0.74], [0.64, 0.69], [0.36, 0.79], [0.1, 0.82], [-0.12, 0.79]], 0.17, plastic, 0, 0.01);
  tube(steer, [[-0.37, 1.2, -0.2], [-0.22, 1.18, -0.13], [0, 1.16, -0.11], [0.22, 1.18, -0.13], [0.37, 1.2, -0.2]], 0.014, alu);
  put(steer, new THREE.BoxGeometry(0.2, 0.05, 0.05), plastic2, [0, 1.19, -0.11]);
  for (const s of [-1, 1]) {
    capsule(steer, [s * 0.29, 1.19, -0.165], [s * 0.4, 1.2, -0.21], 0.022, 0.022, rubber);
    tube(steer, [[s * 0.24, 1.19, -0.13], [s * 0.3, 1.18, -0.07], [s * 0.38, 1.17, -0.08]], 0.006, alu, 8);
  }
  // Front number board: outline drawn face-on, turned to face forward and tilted back.
  const plateG = new THREE.Group(); plateG.position.set(0, 1.02, 0.03); plateG.rotation.x = -0.3; steer.add(plateG);
  slab(plateG, [[-0.15, -0.14], [0.15, -0.14], [0.16, 0.12], [0, 0.17], [-0.16, 0.12]], 0.025, plateMat, 0, 0.006).rotation.y = Math.PI / 2;
  put(plateG, new THREE.PlaneGeometry(0.2, 0.15), new THREE.MeshStandardMaterial({ map: plateTexture(spec), roughness: 0.4, polygonOffset: true, polygonOffsetFactor: -1 }), [0, 0, 0.02]);
  if (spec.rally || spec.vintage || spec.id === 'enduro' || spec.id === 'super') {
    put(steer, new THREE.CylinderGeometry(0.05, 0.055, 0.04, 18), new THREE.MeshStandardMaterial({ color: lin('#fff6d8'), emissive: lin('#fff1c2'), emissiveIntensity: 1.2, roughness: 0.1 }), [0, 0.98, 0.09], [Math.PI / 2 - 0.3, 0, 0]);
  }
  if (spec.rally) {
    put(steer, new THREE.BoxGeometry(0.38, 0.3, 0.02), new THREE.MeshPhysicalMaterial({ color: lin('#2b3540'), roughness: 0.05, metalness: 0.2, transparent: true, opacity: 0.55, clearcoat: 1 }), [0, 1.33, -0.03], [-0.45, 0, 0]);
    put(body, new THREE.BoxGeometry(0.16, 0.12, 0.14), black, [0, 1.2, 0.42], [-0.3, 0, 0]);
  }

  /* Rider. Legs stay on the pegs; the upper body pivots at the hips so it can lean. */
  for (const s of [-1, 1]) {
    capsule(body, [s * 0.13, 1.04, -0.22], [s * 0.22, 1.05, 0.15], 0.095, 0.075, pants);
    capsule(body, [s * 0.22, 1.04, 0.16], [s * 0.21, 0.66, 0.03], 0.068, 0.056, pants);
    put(body, new THREE.SphereGeometry(0.07, 12, 10), plastic2, [s * 0.23, 1.04, 0.2]);
    slab(body, [[-0.1, 0.46], [0.15, 0.46], [0.17, 0.52], [0.05, 0.57], [0.05, 0.86], [-0.08, 0.88], [-0.12, 0.62]], 0.13, bootMat, s * 0.215, 0.02);
    for (let k = 0; k < 3; k++) put(body, new THREE.BoxGeometry(0.14, 0.018, 0.03), black, [s * 0.215, 0.64 + k * 0.08, 0.07 - k * 0.01]);
    put(body, new THREE.BoxGeometry(0.13, 0.03, 0.26), rubber, [s * 0.215, 0.455, 0.02]);
  }
  const rider = new THREE.Group(); rider.position.set(0, 1.02, -0.2); body.add(rider);
  const up = new THREE.Group(); up.position.set(0, -1.02, 0.2); rider.add(up);
  capsule(up, [0, 1.06, -0.18], [0, 1.52, 0.02], 0.15, 0.17, jersey, 1.3, 0.85);
  put(up, new THREE.PlaneGeometry(0.2, 0.15), new THREE.MeshStandardMaterial({ map: plateTexture(spec, true), transparent: true, roughness: 0.8, polygonOffset: true, polygonOffsetFactor: -2 }), [0, 1.42, -0.24], [0.42, Math.PI, 0]);
  put(up, new THREE.TorusGeometry(0.1, 0.035, 8, 18), black, [0, 1.62, 0.04], [Math.PI / 2 - 0.4, 0, 0]);
  for (const s of [-1, 1]) {
    capsule(up, [s * 0.2, 1.52, 0.02], [s * 0.33, 1.34, 0.22], 0.062, 0.055, jersey);
    capsule(up, [s * 0.33, 1.34, 0.22], [s * 0.37, 1.2, 0.41], 0.05, 0.042, jersey);
    put(up, new THREE.SphereGeometry(0.075, 12, 10), plastic2, [s * 0.21, 1.53, 0.02]);
    put(up, new THREE.SphereGeometry(0.048, 10, 8), glove, [s * 0.37, 1.19, 0.42]);
  }
  const head = new THREE.Group(); head.position.set(0, 1.8, 0.12); head.rotation.x = 0.18; up.add(head);
  put(head, new THREE.SphereGeometry(0.168, 24, 18), helmetMat).scale.set(0.95, 0.95, 1.12);
  slab(head, [[0.07, -0.15], [0.17, -0.12], [0.2, -0.04], [0.14, -0.05], [0.07, -0.1]], 0.17, plastic, 0, 0.015);
  slab(head, [[0.04, 0.12], [0.22, 0.11], [0.27, 0.07], [0.12, 0.08]], 0.24, plastic2, 0, 0.008);
  put(head, new THREE.TorusGeometry(0.168, 0.02, 6, 28, Math.PI * 1.2), strap, [0, 0.03, 0], [Math.PI / 2, 0, Math.PI * 0.4]);
  put(head, new THREE.BoxGeometry(0.2, 0.075, 0.05), black, [0, 0.03, 0.16]);
  put(head, new THREE.BoxGeometry(0.18, 0.06, 0.02), lens, [0, 0.03, 0.188]);

  root.scale.setScalar(spec.scale);
  root.rotation.order = 'YXZ';
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(root);
  return { root, wheelie, steer, rear, front, rider };
}
let model = null;
function setBike(id) {
  bikeSpec = BIKES.find(b => b.id === id) || BIKES[0];
  if (model) {
    scene.remove(model.root);
    model.root.traverse(o => { if (o.isMesh) { o.geometry.dispose(); if (o.material.map) o.material.map.dispose(); } });
  }
  model = buildBike(bikeSpec);
  syncBike(0);
  document.querySelectorAll('.bike').forEach(e => e.setAttribute('aria-pressed', String(e.dataset.id === bikeSpec.id)));
  $('bikeNote').textContent = bikeSpec.blurb;
  save();
}
function renderGarage() {
  const wrap = $('bikes');
  wrap.textContent = '';
  const stat = (label, v) => `<span>${label}</span><i style="--v:${clamp(v, 0.08, 1).toFixed(2)}"></i>`;
  for (const b of BIKES) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'bike'; btn.dataset.id = b.id;
    btn.setAttribute('aria-pressed', String(b.id === bikeSpec.id));
    btn.style.setProperty('--c', b.plastic); btn.style.setProperty('--n', b.numInk);
    btn.innerHTML = `<span class="swatch">${b.num}</span><span class="bname">${b.name}</span><span class="blurb">${b.blurb}</span>` +
      `<span class="bars">${stat('Speed', b.top / 46)}${stat('Accel', (b.acc - 11) / 10)}${stat('Handling', b.turn / 1.3)}${stat('Air', b.air / 1.45)}</span>`;
    btn.addEventListener('click', () => setBike(b.id));
    wrap.appendChild(btn);
  }
}

/* ---------- Map picker ---------- */
// Switching maps rebuilds everything the world generator made and sends the rider back to the start.
function setWorld(id, initial) {
  W = WORLDS.find(w => w.id === id) || WORLDS[0];
  applyWorldLook();
  document.querySelectorAll('.world').forEach(e => e.setAttribute('aria-pressed', String(e.dataset.id === W.id)));
  const note = $('worldNote'); if (note) note.textContent = W.blurb;
  if (initial) return;
  dataCache.clear();
  for (const k of [...chunks.keys()]) disposeChunk(k);
  for (const t of grassTiles.values()) if (t.mesh) { scene.remove(t.mesh); t.mesh.dispose(); }
  grassTiles.clear();
  if (farMesh) { scene.remove(farMesh); farMesh.geometry.dispose(); farMesh = null; }
  farRegion = null; farJob = null;
  { const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < TRACKS; i++) trackMesh.setMatrixAt(i, z); trackMesh.instanceMatrix.needsUpdate = true; }
  hist.length = 0;
  bike.x = 0; bike.z = 5; bike.yaw = 0;
  resetBike(false);
  updateFar(true); updateChunks(true); updateGrass(true);
  refreshMap(); findNearest();
  camera.position.set(bike.x, bike.y + 3, bike.z - 7);
  save();
}
function renderWorlds() {
  const wrap = $('worlds');
  wrap.textContent = '';
  for (const w of WORLDS) {
    const btn = document.createElement('button');
    btn.type = 'button'; btn.className = 'world'; btn.dataset.id = w.id;
    btn.setAttribute('aria-pressed', String(w.id === W.id));
    btn.title = w.blurb;
    btn.style.setProperty('--c', w.swatch); btn.style.setProperty('--sky', w.top);
    btn.innerHTML = `<i></i><span>${w.name}</span>`;
    btn.addEventListener('click', () => { if (w.id !== W.id) setWorld(w.id); });
    wrap.appendChild(btn);
  }
}
