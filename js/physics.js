// Ridgeline Moto · physics.js
// Riding, jumping, tricks, landing, crashes, collisions and flags.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Physics ---------- */
const G = 9.8;
// Surfaces: grip (how fast sideways slip is killed), rolling drag, steering and drive traction.
const SURF = {
  trail: { name: 'Trail', grip: 1.15, roll: 0.11, turn: 1.1 },
  grass: { name: 'Grass', grip: 1.0, roll: 0.18, turn: 1.0 },
  rock:  { name: 'Rock', grip: 0.95, roll: 0.15, turn: 1.0 },
  ramp:  { name: 'Ramp', grip: 1.05, roll: 0.12, turn: 1.0 },
  sand:  { name: 'Sand', grip: 0.62, roll: 0.34, turn: 0.9 },
  snow:  { name: 'Snow', grip: 0.55, roll: 0.26, turn: 0.9 },
  mud:   { name: 'Mud', grip: 0.45, roll: 0.42, turn: 0.85 },
  ice:   { name: 'Ice', grip: 0.16, roll: 0.035, turn: 0.75 },
  water: { name: 'Water', grip: 0.5, roll: 0.2, turn: 0.85 }
};
let wetness = 0; // set by the weather; rain turns grass slick and dirt to mud
function surfaceAt(x, z, depth) {
  const th = terrainH(x, z);
  if (W.ice && th < WATER) return SURF.ice;
  if (depth > 0) return SURF.water;
  if (groundH(x, z) > th + 0.05) return SURF.ramp;
  if (Math.abs(trailAt(x, z)) < TR_HALF + 0.4) return wetness > 0.6 ? SURF.mud : SURF.trail;
  if (th > W.snowLine + 6) return SURF.snow;
  if (W.id === 'swamp' && th < WATER + 1.6) return SURF.mud;
  if (desertness(x, z) > 0.5) return SURF.sand;
  if (mountainMask(x, z) > 0.45 && th > 40) return SURF.rock;
  return SURF.grass;
}
function startAir() {
  bike.grounded = false; bike.air = 0; bike.flip = 0; bike.spin = 0; bike.pitchVel = 0; bike.yawVel = 0; bike.whipMax = 0;
  bike.pitch += bike.wheelie; bike.wheelie = 0;
  for (const k of ['up', 'down', 'left', 'right', 'lean', 'whipL', 'whipR']) armed[k] = !keys[k];
}
function crash(reason) {
  if (bike.crashed) return;
  const hs = bike.grounded ? Math.abs(bike.speed) : Math.hypot(bike.vx, bike.vz);
  if (!bike.grounded) bike.yaw = Math.atan2(bike.vx, bike.vz);
  bike.crashed = true; bike.crashT = 0; bike.grounded = true; bike.speed = hs * 0.55; bike.wheelie = 0; bike.wheelieT = 0;
  bike.crashSpin = (Math.random() < 0.5 ? -1 : 1) * (4 + Math.random() * 3);
  flash(el.bail, `Bailed<small>${reason}</small>`);
  thump(1); shake = 1; burst(30, 1.4);
}
function resetBike(fromHistory) {
  let p = { x: bike.x, z: bike.z, yaw: bike.yaw };
  if (fromHistory || terrainH(bike.x, bike.z) < WATER + 0.3) p = hist[0] || { x: 0, z: 5, yaw: 0 };
  if (fromHistory && typeof raceRespawn === 'function' && raceRespawn()) p = raceRespawn(); // races restart at the last checkpoint
  refreshNearRamps(p.x, p.z);
  Object.assign(bike, { x: p.x, z: p.z, y: groundH(p.x, p.z), yaw: p.yaw, speed: 0, slide: 0, whip: 0, whipVel: 0, vy: 0, vx: 0, vz: 0, pitch: 0, pitchVel: 0, yawVel: 0, lean: 0, wheelie: 0, grounded: true, crashed: false, roll: 0, air: 0 });
  camYaw = p.yaw; hist.length = 0;
}
function trickName(n, a, b) { const m = Math.abs(n); return (m === 1 ? '' : m === 2 ? 'Double ' : m === 3 ? 'Triple ' : m + 'x ') + (n > 0 ? a : b); }
function scoreLanding() {
  const parts = []; let pts = 0, tricks = 0;
  const flips = Math.round(bike.flip / TAU), spins = Math.round(bike.spin / TAU);
  if (flips) { parts.push(trickName(flips, 'Backflip', 'Frontflip')); pts += Math.abs(flips) * (flips > 0 ? 600 : 750); tricks++; }
  if (spins) { parts.push(Math.abs(spins) * 360 + ''); pts += Math.abs(spins) * 400; tricks++; }
  if (bike.whipMax > 0.75) { parts.push(bike.whipMax > 1.05 ? 'Table whip' : 'Whip'); pts += bike.whipMax > 1.05 ? 550 : 300; tricks++; }
  if (bike.air > 0.7) { pts += Math.round(bike.air * 120); if (!tricks) parts.push('Big air'); }
  if (!pts) return;
  if (tricks > 1) pts = Math.round(pts * (1 + 0.5 * (tricks - 1)));
  score += pts; if (typeof earn === 'function') earn(Math.round(pts / 50), true);
  bike.nitro = Math.min(1, bike.nitro + pts / 2500);
  flash(el.trick, `${parts.join(' + ')}<small>${bike.air.toFixed(1)} s air · +${pts.toLocaleString()}</small>`);
}
function land(g) {
  const sy = Math.sin(bike.yaw), cy = Math.cos(bike.yaw);
  const gp = Math.atan2(groundH(bike.x + sy * 0.75, bike.z + cy * 0.75) - groundH(bike.x - sy * 0.75, bike.z - cy * 0.75), 1.5);
  const hs = Math.hypot(bike.vx, bike.vz);
  const velYaw = hs > 0.1 ? Math.atan2(bike.vx, bike.vz) : bike.yaw;
  const yawDiff = wrapA(bike.yaw - velYaw), pDiff = wrapA(bike.pitch - gp);
  const vsx = Math.sin(velYaw), vcz = Math.cos(velYaw);
  const slopeV = (groundH(bike.x + vsx * 0.75, bike.z + vcz * 0.75) - groundH(bike.x - vsx * 0.75, bike.z - vcz * 0.75)) / 1.5;
  const impact = Math.max(0, -(bike.vy - slopeV * hs)) / Math.sqrt(1 + slopeV * slopeV);
  bike.y = g;
  if (bike.air > 0.2 && Math.abs(pDiff) > 0.8) return crash(pDiff > 0 ? 'Looped out and landed on the rear fender' : 'Nose-dived into the dirt');
  if (bike.air > 0.2 && hs > 4 && Math.abs(yawDiff) > 0.95) return crash('Landed sideways');
  if (impact > 21 * bikeSpec.tough) return crash('Cased it. That landing was too hard');
  if (Math.abs(bike.whip) > 0.6) return crash('Whipped it too far to save');
  bike.grounded = true;
  const keep = 1 - clamp(impact * 0.012, 0, 0.3);
  bike.speed = hs * Math.cos(yawDiff) * keep;
  bike.slide = (bike.vx * -cy + bike.vz * sy) * keep;
  bike.pitch = gp; bike.vy = 0; bike.pitchVel = 0; bike.whip = 0; bike.whipVel = 0;
  bike.suspV = (bike.suspV || 0) + clamp(impact, 0, 22) * 0.09;
  if (bike.air > 0.35) { thump(impact / 14); burst(Math.min(26, 6 + impact * 1.5), 0.7 + impact / 20); shake = Math.max(shake, clamp(impact / 16, 0, 0.8)); scoreLanding(); }
}
function collide() {
  const pcx = Math.floor(bike.x / CS), pcz = Math.floor(bike.z / CS);
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const d = getChunkData(pcx + i, pcz + j);
    for (const o of d.obs) {
      const dx = bike.x - o.x, dz = bike.z - o.z, rr = o.r + 0.5;
      if (dx * dx + dz * dz > rr * rr || bike.y > o.y + o.top || bike.y + 1.7 < o.y) continue;
      const hs = bike.grounded ? Math.abs(bike.speed) : Math.hypot(bike.vx, bike.vz);
      if (hs > 8.5) return crash(o.kind === 'tree' ? 'Met a pine tree head-on' : o.kind === 'cactus' ? 'Hugged a cactus' : 'Hit a boulder');
      const dd = Math.sqrt(dx * dx + dz * dz) || 0.01;
      bike.x = o.x + dx / dd * rr; bike.z = o.z + dz / dd * rr;
      bike.speed *= -0.25; bike.vx *= -0.25; bike.vz *= -0.25;
    }
  }
}
function checkFlags() {
  const pcx = Math.floor(bike.x / CS), pcz = Math.floor(bike.z / CS);
  for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
    const k = (pcx + i) + ',' + (pcz + j);
    for (const f of getChunkData(pcx + i, pcz + j).flags) {
      if (collected.has(f.id)) continue;
      if ((bike.x - f.x) ** 2 + (bike.z - f.z) ** 2 < 22 && Math.abs(bike.y - f.y) < 9) {
        collected.add(f.id); score += 1000; bike.nitro = 1; earn(60);
        const ch = chunks.get(k); const obj = ch && ch.flagObjs.get(f.id);
        if (obj) { ch.group.remove(obj); ch.flagObjs.delete(f.id); }
        flash(el.trick, `Flag ${collected.size}<small>Nitro refilled · +1,000 · +60 coins</small>`);
        chime(); save(); nearestT = 0;
      }
    }
  }
}
function step(dt) {
  refreshNearRamps(bike.x, bike.z);
  const b = bike;
  if (b.crashed) {
    b.crashT += dt; b.speed *= Math.exp(-2.2 * dt);
    b.x += Math.sin(b.yaw) * b.speed * dt; b.z += Math.cos(b.yaw) * b.speed * dt;
    b.roll += b.crashSpin * dt; b.crashSpin *= Math.exp(-1.5 * dt);
    b.y = groundH(b.x, b.z) + 0.25 * Math.abs(Math.sin(b.roll));
    b.pitch = lerp(b.pitch, 0, damp(3, dt));
    if (b.crashT > 2.2) resetBike(true);
    return;
  }
  const inp = keys;
  const terr = terrainH(b.x, b.z), depth = W.ice ? 0 : WATER - terr;
  if (b.grounded) {
    const sy = Math.sin(b.yaw), cy = Math.cos(b.yaw);
    const slopeAng = Math.atan2(groundH(b.x + sy * 0.75, b.z + cy * 0.75) - groundH(b.x - sy * 0.75, b.z - cy * 0.75), 1.5);
    const sp = Math.abs(b.speed);
    const boosting = inp.boost && inp.up && b.nitro > 0.01 && b.speed > 0;
    let acc = 0;
    if (inp.up) { const top = boosting ? bikeSpec.boostTop : bikeSpec.top; const f = b.speed > 0 ? 1 - Math.pow(clamp(b.speed / top, 0, 1), 2) : 1; acc += (boosting ? bikeSpec.boostAcc : bikeSpec.acc) * f; }
    if (inp.down) { if (b.speed > 0.5) acc -= 20 * Math.min(1, 0.35 + (W.ice && terrainH(b.x, b.z) < WATER ? 0.16 : 1) * 0.8); else acc -= 7 * (1 - clamp(-b.speed / 6, 0, 1)); }
    acc -= G * Math.sin(slopeAng);
    const surf = surfaceAt(b.x, b.z, depth), grip = surf.grip * (1 - wetness * 0.22);
    b.surface = surf.name; b.onTrail = surf === SURF.trail;
    if (inp.up) acc *= Math.min(1, 0.45 + grip * 0.7); // wheelspin on loose ground
    acc -= b.speed * surf.roll * (1 + wetness * 0.3) + 0.0035 * b.speed * sp;
    if (depth > 0) acc -= b.speed * (1.2 + depth * 3);
    b.speed += acc * dt;
    if (!inp.up && !inp.down && Math.abs(b.speed) < 0.4 && Math.abs(slopeAng) < 0.35) b.speed = 0;
    if (boosting) b.nitro = Math.max(0, b.nitro - 0.22 * dt);
    b.boosting = boosting;
    const st = touchSteer !== null ? touchSteer : (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
    b.steer = lerp(b.steer, st, damp(9, dt));
    const turn = b.steer * 2.5 * bikeSpec.turn * surf.turn * clamp(sp / 4, 0, 1) / (1 + sp / 24);
    const dyaw = -turn * dt * (b.speed < 0 ? -1 : 1);
    b.yaw += dyaw;
    // Momentum keeps pointing where it was going; the tyres then claw sideways slip back at a rate set by grip.
    const cs = Math.cos(dyaw), sn = Math.sin(dyaw), sp0 = b.speed, sl0 = b.slide || 0;
    b.speed = sp0 * cs - sl0 * sn; b.slide = sp0 * sn + sl0 * cs;
    const kill = 1 - Math.exp(-11 * grip * dt);
    b.speed -= Math.sign(b.speed) * Math.abs(b.slide) * kill * 0.12;
    b.slide -= b.slide * kill;
    b.lean = lerp(b.lean, b.steer * clamp(sp / 14, 0, 1) * 0.6, damp(6, dt));
    b.wheelie = lerp(b.wheelie, inp.lean && b.speed > 2 ? 0.55 : 0, damp(inp.lean ? 3 : 6, dt));
    if (b.wheelie > 0.3) b.wheelieT += dt;
    else if (b.wheelieT > 0) {
      if (b.wheelieT > 1.2) { const pts = Math.round(b.wheelieT * 100); score += pts; flash(el.trick, `Wheelie<small>${b.wheelieT.toFixed(1)} s · +${pts}</small>`); }
      b.wheelieT = 0;
    }
    b.pitch = lerp(b.pitch, slopeAng, damp(18, dt));
    const rxv = -Math.cos(b.yaw), rzv = Math.sin(b.yaw);
    const nx = b.x + (Math.sin(b.yaw) * b.speed + rxv * b.slide) * dt, nz = b.z + (Math.cos(b.yaw) * b.speed + rzv * b.slide) * dt;
    if (Math.abs(b.slide) > 2.5) b.drifting = true; else b.drifting = false;
    const gN = groundH(nx, nz), yBall = b.y + b.vy * dt - 0.5 * G * dt * dt;
    b.x = nx; b.z = nz;
    odo += sp * dt; distanceCoins(sp * dt);
    if (gN < yBall - 0.04 && sp > 5) {
      b.vx = Math.sin(b.yaw) * b.speed + rxv * b.slide; b.vz = Math.cos(b.yaw) * b.speed + rzv * b.slide; b.y = yBall; b.vy -= G * dt;
      startAir();
    } else {
      const vy1 = clamp((gN - b.y) / dt, -30, 30);
      b.suspV = (b.suspV || 0) + clamp(vy1 - b.vy, -6, 6) * 0.02; // bumps work the suspension
      b.vy = vy1; b.y = gN;
    }
    if (depth > 1.35) return crash('Flooded the engine in the lake');
  } else {
    b.air += dt;
    for (const k in armed) if (!inp[k]) armed[k] = true;
    const on = k => inp[k] && armed[k];
    b.vy -= G * dt;
    b.x += b.vx * dt; b.z += b.vz * dt; b.y += b.vy * dt;
    odo += Math.hypot(b.vx, b.vz) * dt;
    const pIn = (on('down') || (on('lean') && !inp.left && !inp.right) ? 1 : 0) - (on('up') ? 1 : 0);
    b.pitchVel = clamp((b.pitchVel + pIn * 10 * bikeSpec.air * dt) * Math.exp(-1.4 * dt), -7.5 * bikeSpec.air, 7.5 * bikeSpec.air);
    b.pitch += b.pitchVel * dt; b.flip += b.pitchVel * dt;
    // Whip: tilt the bike sideways (Q/E, or hold wheelie and steer). It springs back; land it straight.
    const whipping = inp.lean || on('whipL') || on('whipR');
    const wIn = (on('whipL') || (inp.lean && inp.left) ? 1 : 0) - (on('whipR') || (inp.lean && inp.right) ? 1 : 0);
    b.whipVel = ((b.whipVel || 0) + (wIn * 13 * bikeSpec.air - (b.whip || 0) * (wIn ? 2 : 7)) * dt) * Math.exp(-2.2 * dt);
    b.whip = clamp((b.whip || 0) + b.whipVel * dt, -1.3, 1.3);
    b.whipMax = Math.max(b.whipMax || 0, Math.abs(b.whip));
    const yIn = whipping ? 0 : (on('left') ? 1 : 0) - (on('right') ? 1 : 0);
    b.yawVel = clamp((b.yawVel + yIn * 12 * bikeSpec.air * dt) * Math.exp(-1.8 * dt), -9 * bikeSpec.air, 9 * bikeSpec.air);
    b.yaw += b.yawVel * dt; b.spin += b.yawVel * dt;
    b.lean = lerp(b.lean, 0, damp(3, dt)); b.steer = lerp(b.steer, 0, damp(3, dt));
    b.boosting = false;
    const g = groundH(b.x, b.z);
    if (b.y <= g) land(g);
  }
  if (!b.crashed) collide();
  if (!b.crashed) checkFlags();
  if (!b.crashed) raceStep();
  b.nitro = Math.min(1, b.nitro + 0.02 * dt);
  histT += dt;
  if (histT > 0.3) { histT = 0; if (b.grounded && !b.crashed && depth <= 0 && Math.abs(b.speed) > 1) { hist.push({ x: b.x, z: b.z, yaw: b.yaw }); if (hist.length > 10) hist.shift(); } }
}
let histT = 0;
