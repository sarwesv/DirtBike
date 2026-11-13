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
    scale: 1.1, top: 42, boostTop: 56, acc: 16, boostAcc: 26, turn: 0.78, air: 0.7, tough: 1.2, rally: true }
];
let bikeSpec = BIKES[0];
function plateTexture(spec) {
  const cv = document.createElement('canvas'); cv.width = 128; cv.height = 96;
  const x = cv.getContext('2d');
  x.fillStyle = spec.plateBg; x.fillRect(0, 0, 128, 96);
  x.fillStyle = spec.plateInk; x.font = '700 72px "Barlow Semi Condensed", "Arial Narrow", sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle';
  x.fillText(spec.num, 64, 52);
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; return t;
}
function buildBike(spec) {
  const root = new THREE.Group();
  const wheelie = new THREE.Group(); wheelie.position.set(0, 0, -0.72); root.add(wheelie);
  const body = new THREE.Group(); body.position.set(0, 0, 0.72); wheelie.add(body);
  const steer = new THREE.Group(); steer.position.set(0, 0, 0.6); body.add(steer);
  const M = (c, rough = 0.55, metal = 0) => new THREE.MeshStandardMaterial({ color: lin(c), roughness: rough, metalness: metal });
  const plastic = M(spec.plastic, 0.32), plastic2 = M(spec.plastic2, 0.32), black = M('#1c1c1f', 0.9), metal = M('#c4c9ce', 0.28, 0.9), alu = M('#9aa1a8', 0.4, 0.85), seat = M('#2b2b30', 0.7),
    jersey = M(spec.jersey, 0.8), pants = M('#d3cdbd', 0.8), boot = M('#26262a', 0.6), helmet = M('#f4f1e8', 0.25), visor = M('#141518', 0.1, 0.4), gold = M(spec.accent, 0.3, 0.9);
  const add = (parent, geo, mat, x, y, z, rx = 0, ry = 0, rz = 0) => { const m = new THREE.Mesh(geo, mat); m.position.set(x, y, z); m.rotation.set(rx, ry, rz); parent.add(m); return m; };
  const Y = new THREE.Vector3(0, 1, 0);
  const limb = (parent, a, b, t, mat, round) => {
    const va = new THREE.Vector3(...a), vb = new THREE.Vector3(...b), dir = vb.clone().sub(va), len = dir.length();
    const geo = round ? new THREE.CylinderGeometry(t / 2, t / 2, len, 8) : new THREE.BoxGeometry(t, len, t);
    const m = new THREE.Mesh(geo, mat);
    m.position.copy(va).add(vb).multiplyScalar(0.5); m.quaternion.setFromUnitVectors(Y, dir.normalize()); parent.add(m); return m;
  };
  const wheel = (parent, z) => {
    const g = new THREE.Group();
    const tire = new THREE.Mesh(new THREE.TorusGeometry(R_WHEEL - 0.075, 0.085, 10, 28), black); tire.rotation.y = Math.PI / 2; g.add(tire);
    for (let k = 0; k < 18; k++) { const a = k / 18 * TAU; const kb = new THREE.Mesh(new THREE.BoxGeometry(0.17, 0.035, 0.05), black); kb.position.set(0, Math.cos(a) * (R_WHEEL - 0.005), Math.sin(a) * (R_WHEEL - 0.005)); kb.rotation.x = -a; g.add(kb); }
    const rim = new THREE.Mesh(new THREE.TorusGeometry(R_WHEEL - 0.14, 0.02, 6, 28), gold); rim.rotation.y = Math.PI / 2; g.add(rim);
    for (let k = 0; k < 12; k++) { const s = new THREE.Mesh(new THREE.CylinderGeometry(0.005, 0.005, (R_WHEEL - 0.14) * 2, 4), metal); s.rotation.x = k * Math.PI / 12; s.position.x = (k % 2 ? 0.02 : -0.02); g.add(s); }
    const hub = new THREE.Mesh(new THREE.CylinderGeometry(0.05, 0.05, 0.16, 12), alu); hub.rotation.z = Math.PI / 2; g.add(hub);
    const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.01, 18), metal); disc.rotation.z = Math.PI / 2; disc.position.x = -0.07; g.add(disc);
    g.position.set(0, R_WHEEL, z); parent.add(g); return g;
  };
  const rear = wheel(body, -0.72);
  const front = wheel(steer, 0.12);
  add(body, new THREE.BoxGeometry(0.26, 0.28, 0.4), alu, 0, 0.52, 0.06);
  add(body, new THREE.CylinderGeometry(0.11, 0.11, 0.3, 12), alu, 0, 0.55, 0.06, 0, 0, Math.PI / 2);
  add(body, new THREE.BoxGeometry(0.18, 0.12, 0.2), black, 0, 0.72, 0.12);
  limb(body, [0, 0.5, 0.2], [0, 0.98, 0.5], 0.07, metal, true);
  limb(body, [0, 0.62, -0.15], [0, 0.98, 0.5], 0.06, metal, true);
  add(body, new THREE.BoxGeometry(0.34, 0.2, 0.44), plastic, 0, 0.92, 0.2, 0.12);
  add(body, new THREE.BoxGeometry(0.42, 0.16, 0.22), plastic2, 0, 0.9, 0.36, 0.3);
  add(body, new THREE.BoxGeometry(0.26, 0.08, 0.78), seat, 0, 0.93, -0.3, 0.04);
  add(body, new THREE.BoxGeometry(0.3, 0.07, 0.62), plastic, 0, 0.92, -0.76, 0.26);
  add(body, new THREE.BoxGeometry(0.32, 0.22, 0.3), plastic2, 0, 0.78, -0.42);
  for (const s of [-1, 1]) limb(body, [s * 0.1, R_WHEEL, -0.72], [s * 0.1, 0.5, -0.05], 0.06, alu);
  limb(body, [0, 0.55, -0.32], [0, 0.88, -0.2], 0.06, gold, true);
  limb(body, [0.15, 0.62, -0.05], [0.17, 0.8, -0.78], 0.09, metal, true);
  limb(body, [0.17, 0.8, -0.78], [0.17, 0.84, -0.9], 0.07, black, true);
  for (const s of [-1, 1]) { limb(steer, [s * 0.1, R_WHEEL, 0.12], [s * 0.1, 0.72, 0.02], 0.06, gold, true); limb(steer, [s * 0.1, 0.72, 0.02], [s * 0.1, 1.04, -0.1], 0.07, alu, true); }
  add(steer, new THREE.BoxGeometry(0.16, 0.04, 0.5), plastic, 0, 0.8, 0.2, -0.12);
  add(steer, new THREE.CylinderGeometry(0.018, 0.018, 0.72, 8), black, 0, 1.1, -0.12, 0, 0, Math.PI / 2);
  for (const s of [-1, 1]) add(steer, new THREE.CylinderGeometry(0.025, 0.025, 0.12, 8), black, s * 0.32, 1.1, -0.12, 0, 0, Math.PI / 2);
  const plate = new THREE.Mesh(new THREE.BoxGeometry(0.3, 0.24, 0.03), new THREE.MeshStandardMaterial({ map: plateTexture(spec), roughness: 0.5 }));
  plate.position.set(0, 1.0, 0.02); plate.rotation.x = -0.35; steer.add(plate);
  // Rider
  for (const s of [-1, 1]) {
    limb(body, [s * 0.15, 1.02, -0.22], [s * 0.2, 1.0, 0.18], 0.15, pants);
    limb(body, [s * 0.2, 1.0, 0.18], [s * 0.2, 0.52, 0.02], 0.13, boot);
    limb(body, [s * 0.2, 1.56, 0.04], [s * 0.3, 1.12, 0.46], 0.1, jersey);
  }
  add(body, new THREE.BoxGeometry(0.4, 0.58, 0.24), jersey, 0, 1.32, -0.08, 0.42);
  add(body, new THREE.BoxGeometry(0.3, 0.2, 0.06), plastic, 0, 1.36, -0.22, 0.42);
  const head = new THREE.Group(); head.position.set(0, 1.78, 0.14); body.add(head);
  add(head, new THREE.SphereGeometry(0.17, 18, 14), helmet, 0, 0, 0);
  add(head, new THREE.BoxGeometry(0.2, 0.08, 0.14), plastic, 0, -0.08, 0.13);
  add(head, new THREE.BoxGeometry(0.24, 0.03, 0.16), plastic, 0, 0.1, 0.17, -0.2);
  add(head, new THREE.BoxGeometry(0.22, 0.07, 0.04), visor, 0, 0.02, 0.16);
  if (spec.rally) {
    add(steer, new THREE.BoxGeometry(0.36, 0.3, 0.03), new THREE.MeshStandardMaterial({ color: lin('#26303a'), roughness: 0.05, metalness: 0.3, transparent: true, opacity: 0.6 }), 0, 1.3, -0.02, -0.45);
    add(body, new THREE.BoxGeometry(0.48, 0.26, 0.52), plastic2, 0, 0.86, 0.22, 0.1);
    add(body, new THREE.BoxGeometry(0.14, 0.1, 0.16), black, 0, 1.18, 0.44, -0.3);
    limb(body, [-0.17, 0.82, -0.72], [-0.17, 0.86, -0.95], 0.08, metal, true);
  }
  root.scale.setScalar(spec.scale);
  root.rotation.order = 'YXZ';
  root.traverse(o => { if (o.isMesh) o.castShadow = true; });
  scene.add(root);
  return { root, wheelie, steer, rear, front };
}
let model = null;
function setBike(id) {
  bikeSpec = BIKES.find(b => b.id === id) || BIKES[0];
  if (model) {
    scene.remove(model.root);
    model.root.traverse(o => { if (o.isMesh) o.geometry.dispose(); });
  }
  model = buildBike(bikeSpec);
  syncBike(0);
  document.querySelectorAll('.bike').forEach(e => e.setAttribute('aria-pressed', String(e.dataset.id === bikeSpec.id)));
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
      `<span class="bars">${stat('Speed', b.top / 42)}${stat('Accel', (b.acc - 12) / 6)}${stat('Handling', b.turn / 1.3)}${stat('Air', b.air / 1.45)}</span>`;
    btn.addEventListener('click', () => setBike(b.id));
    wrap.appendChild(btn);
  }
}
