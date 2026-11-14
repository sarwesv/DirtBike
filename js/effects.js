// Ridgeline Moto · effects.js
// Tyre tracks and dust particles.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Tyre tracks ---------- */
const TRACKS = 700;
const trackMesh = new THREE.InstancedMesh(new THREE.PlaneGeometry(0.17, 0.5).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: lin('#2a1f14'), transparent: true, opacity: 0.32, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }), TRACKS);
{ const z = new THREE.Matrix4().makeScale(0, 0, 0); for (let i = 0; i < TRACKS; i++) trackMesh.setMatrixAt(i, z); }
trackMesh.frustumCulled = false; scene.add(trackMesh);
let trackHead = 0, trackLast = null;
const tM = new THREE.Matrix4(), tQ = new THREE.Quaternion(), tE = new THREE.Euler(0, 0, 0, 'YXZ'), tP = new THREE.Vector3(), tS = new THREE.Vector3(1, 1, 1);
function layTracks() {
  const b = bike;
  if (!b.grounded || b.crashed || Math.abs(b.speed) < 1) { trackLast = null; return; }
  const sy = Math.sin(b.yaw), cy = Math.cos(b.yaw), rx = b.x - sy * 0.72, rz = b.z - cy * 0.72;
  if (trackLast && (rx - trackLast[0]) ** 2 + (rz - trackLast[1]) ** 2 < 0.2) return;
  trackLast = [rx, rz];
  if (terrainH(rx, rz) < WATER + 0.1) return;
  const gy = groundH(rx, rz);
  if (gy > terrainH(rx, rz) + 0.05) return;
  tE.set(-b.pitch, b.yaw, 0); tQ.setFromEuler(tE); tP.set(rx, gy + 0.03, rz);
  tM.compose(tP, tQ, tS); trackMesh.setMatrixAt(trackHead, tM); trackHead = (trackHead + 1) % TRACKS;
  trackMesh.instanceMatrix.needsUpdate = true;
}

/* ---------- Particles ---------- */
const PMAX = 420;
const pPos = new Float32Array(PMAX * 3), pCol = new Float32Array(PMAX * 3), pVel = new Float32Array(PMAX * 3), pLife = new Float32Array(PMAX);
for (let i = 0; i < PMAX; i++) pPos[i * 3 + 1] = -9999;
let pHead = 0;
const pGeo = new THREE.BufferGeometry();
pGeo.setAttribute('position', new THREE.BufferAttribute(pPos, 3));
pGeo.setAttribute('color', new THREE.BufferAttribute(pCol, 3));
const dotTex = (() => { const cv = document.createElement('canvas'); cv.width = cv.height = 64; const x = cv.getContext('2d'); const g = x.createRadialGradient(32, 32, 0, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,0.9)'); g.addColorStop(0.5, 'rgba(255,255,255,0.45)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); return new THREE.CanvasTexture(cv); })();
const particles = new THREE.Points(pGeo, new THREE.PointsMaterial({ size: 1.0, map: dotTex, vertexColors: true, transparent: true, depthWrite: false, opacity: 0.75 }));
particles.frustumCulled = false;
scene.add(particles);
function emit(x, y, z, vx, vy, vz, c) {
  const i = pHead; pHead = (pHead + 1) % PMAX;
  pPos.set([x, y, z], i * 3); pVel.set([vx, vy, vz], i * 3); pCol.set(c, i * 3); pLife[i] = 0.5 + Math.random() * 0.7;
}
function updParticles(dt) {
  const k = Math.exp(-1.8 * dt);
  for (let i = 0; i < PMAX; i++) {
    if (pLife[i] <= 0) continue;
    pLife[i] -= dt;
    const o = i * 3;
    pVel[o] *= k; pVel[o + 1] = pVel[o + 1] * k - 2.5 * dt; pVel[o + 2] *= k;
    pPos[o] += pVel[o] * dt; pPos[o + 1] += pVel[o + 1] * dt; pPos[o + 2] += pVel[o + 2] * dt;
    if (pLife[i] <= 0) pPos[o + 1] = -9999;
  }
  pGeo.attributes.position.needsUpdate = true; pGeo.attributes.color.needsUpdate = true;
}
const DUST = L3('#8f7255'), SAND_DUST = L3('#e2c49a'), SPLASH = L3('#eef5fa');
function dustColor(x, z) { return W.ice || W.snowLine < 0 ? SPLASH : terrainH(x, z) < WATER ? SPLASH : desertness(x, z) > 0.5 ? SAND_DUST : DUST; }
function burst(n, power) {
  const c = dustColor(bike.x, bike.z);
  for (let i = 0; i < n; i++) { const a = Math.random() * TAU, s = (1 + Math.random() * 2) * power; emit(bike.x + Math.cos(a) * 0.5, bike.y + 0.15, bike.z + Math.sin(a) * 0.5, Math.cos(a) * s, 1 + Math.random() * 2 * power, Math.sin(a) * s, c); }
}
