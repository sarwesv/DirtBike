// Ridgeline Moto · view.js
// Syncs the bike model to physics, dust emission and the chase camera.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Visual sync ---------- */
// Soft contact shadow under the bike, fading as it leaves the ground.
const contactShadow = new THREE.Mesh(new THREE.PlaneGeometry(1.5, 2.9).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({
  map: canvasTex(128, 128, (x, Wd, H) => { const g = x.createRadialGradient(64, 64, 4, 64, 64, 64); g.addColorStop(0, 'rgba(0,0,0,0.75)'); g.addColorStop(0.6, 'rgba(0,0,0,0.3)'); g.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = g; x.fillRect(0, 0, Wd, H); }, false),
  transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -3, polygonOffsetUnits: -3
}));
contactShadow.renderOrder = 2; scene.add(contactShadow);
function syncBike(dt) {
  const b = bike, m = model;
  // Spring-damped suspension: landings and bumps compress it, then it rebounds.
  const sdt = Math.min(dt, 0.033);
  b.suspV = (b.suspV || 0) + (-(b.susp || 0) * 170 - (b.suspV || 0) * 15) * sdt;
  b.susp = clamp((b.susp || 0) + b.suspV * sdt, -0.06, 0.24);
  m.root.position.set(b.x, b.y - b.susp, b.z);
  m.root.rotation.set(-b.pitch, b.yaw, b.lean + (b.grounded ? 0 : (b.whip || 0)) + (b.crashed ? b.roll : 0) - clamp((b.slide || 0) * 0.02, -0.25, 0.25));
  m.wheelie.rotation.x = -b.wheelie;
  m.steer.rotation.y = -b.steer * 0.35;
  // Rider tucks forward on the gas, sits back for wheelies and into the turn.
  const lean = b.crashed ? 0.5 : b.grounded ? (keys.up ? 0.16 : 0.05) - b.wheelie * 0.5 : 0.1 - b.pitchVel * 0.03;
  b.riderLean = lerp(b.riderLean || 0, lean, damp(5, dt));
  // Brace into landings: the rider sinks and pitches forward with the suspension.
  // Stand up in the air, on landings and on the trials bike; sit when cruising.
  const standT = bikeSpec.trials || !b.grounded || b.crashed ? 1 : Math.abs(b.speed) > 22 && keys.up ? 0.5 : 0;
  b.stand = lerp(b.stand || 0, standT, damp(4, dt));
  m.rider.rotation.set(b.riderLean + b.stand * 0.22 + Math.max(0, b.susp) * 1.6, 0, b.lean * 0.35 - (b.grounded ? 0 : (b.whip || 0)) * 0.4);
  m.rider.position.set(0, 1.02 + b.stand * 0.2 - Math.max(0, b.susp) * 0.8, -0.2 + b.stand * 0.06);
  poseRider(m);
  m.root.updateMatrixWorld(); m.grimeU.uRootInv.value.copy(m.root.matrixWorld).invert();
  const gy = groundH(b.x, b.z), lift = clamp((b.y - gy) / 4, 0, 1);
  contactShadow.position.set(b.x, gy + 0.03, b.z); contactShadow.rotation.y = b.yaw;
  contactShadow.scale.setScalar(bikeSpec.scale * (1 + lift * 0.6)); contactShadow.material.opacity = 0.85 * (1 - lift);
  const target = b.grounded ? b.speed : (keys.up ? 30 : b.spinW * 0.98);
  b.spinW = b.grounded ? b.speed : lerp(b.spinW, target, damp(2, dt));
  const rw = R_WHEEL * bikeSpec.scale;
  m.rear.rotation.x += b.spinW / rw * dt;
  m.front.rotation.x += (b.grounded ? b.speed : Math.hypot(b.vx, b.vz)) / rw * dt;
}
let emitAcc = 0;
function bikeParticles(dt) {
  const b = bike;
  if (!b.grounded || b.crashed) return;
  const sp = Math.abs(b.speed);
  const rate = (keys.up && sp > 0.5 ? 18 + sp * 2.2 : 0) + (keys.down && sp > 4 ? 25 : 0) + (b.boosting ? 20 : 0) + (b.drifting ? 30 + Math.abs(b.slide) * 4 : 0);
  emitAcc += rate * dt;
  const sy = Math.sin(b.yaw), cy = Math.cos(b.yaw);
  const rx = b.x - sy * 0.75, rz = b.z - cy * 0.75, c = dustColor(rx, rz);
  while (emitAcc > 1) {
    emitAcc -= 1;
    const back = 2 + Math.random() * 3 + sp * 0.12, side = (Math.random() - 0.5) * 2.5;
    emit(rx, b.y + 0.15, rz, -sy * back + cy * side, 1 + Math.random() * 2.2, -cy * back - sy * side, c);
  }
}
function updCamera(dt) {
  const b = bike;
  if (state === 'title') {
    const a = time * 0.18;
    camera.position.set(b.x + Math.sin(a) * 7, b.y + 2.4, b.z + Math.cos(a) * 7);
    camera.lookAt(b.x, b.y + 1, b.z);
    camYaw = b.yaw;
    return;
  }
  const hs = Math.hypot(b.vx, b.vz);
  const tgt = b.crashed || b.grounded ? (b.speed < -1 ? b.yaw : b.yaw) : hs > 1 ? Math.atan2(b.vx, b.vz) : b.yaw;
  camYaw += wrapA(tgt - camYaw) * damp(b.grounded ? 4 : 2, dt);
  const dist = [5.6, 9.5, 0][camMode], height = [2.2, 3.8, 0][camMode];
  const want = new THREE.Vector3();
  if (camMode === 2) {
    const sy = Math.sin(b.yaw), cy = Math.cos(b.yaw);
    want.set(b.x + sy * 0.15, b.y + 1.85 + b.wheelie * 0.6, b.z + cy * 0.15);
    camera.position.copy(want);
    camera.lookAt(b.x + sy * 10, b.y + 1.5 + Math.sin(b.pitch) * 10, b.z + cy * 10);
  } else {
    want.set(b.x - Math.sin(camYaw) * dist, b.y + height, b.z - Math.cos(camYaw) * dist);
    const gy = terrainH(want.x, want.z) + 0.8;
    if (want.y < gy) want.y = gy;
    camera.position.lerp(want, damp(9, dt));
    camera.lookAt(b.x + Math.sin(camYaw) * 2, b.y + 1.1, b.z + Math.cos(camYaw) * 2);
  }
  shake = Math.max(0, shake - dt * 2);
  if (shake > 0 && !reduceMotion) { camera.position.x += (Math.random() - 0.5) * shake * 0.3; camera.position.y += (Math.random() - 0.5) * shake * 0.3; }
  const fov = baseFov + (b.boosting ? 9 : 0) + clamp(Math.abs(b.speed) - 20, 0, 20) * 0.2;
  if (Math.abs(camera.fov - fov) > 0.05) { camera.fov = lerp(camera.fov, fov, damp(3, dt)); camera.updateProjectionMatrix(); }
}
