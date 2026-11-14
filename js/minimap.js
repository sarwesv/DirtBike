// Ridgeline Moto · minimap.js
// Heading-up minimap with trails, ramps and flags.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Minimap ---------- */
const mapCv = $('map'), mapCtx = mapCv.getContext('2d');
const MAPN = 96, MAPS = 6, MAP_VIS = 60;
const mapOff = document.createElement('canvas'); mapOff.width = mapOff.height = MAPN;
const mapOffCtx = mapOff.getContext('2d'), mapImg = mapOffCtx.createImageData(MAPN, MAPN);
let mapCx = 1e9, mapCz = 1e9, mapT = 0;
function refreshMap() {
  mapCx = bike.x; mapCz = bike.z;
  const d = mapImg.data;
  for (let j = 0; j < MAPN; j++) {
    let prev = null;
    for (let i = 0; i < MAPN; i++) {
      const x = mapCx - (i - MAPN / 2) * MAPS, z = mapCz - (j - MAPN / 2) * MAPS, h = rawHeight(x, z), o = (j * MAPN + i) * 4;
      let r, g, bl;
      const onT = Math.abs(lastTrailD) < 5.5;
      if (h < WATER && W.ice) { r = 200; g = 222; bl = 234; }
      else if (h < WATER) { const k = clamp(1 + h / 12, 0.55, 1); r = 52 * k; g = 105 * k; bl = 142 * k; }
      else if (onT) { r = 122; g = 84; bl = 50; }
      else {
        const des = desertness(x, z);
        if (h > W.snowLine + 8) { r = 232; g = 236; bl = 238; }
        else if (h > 42 && mountainMask(x, z) > 0.3) { r = 128; g = 120; bl = 110; }
        else { r = lerp(104, 214, des); g = lerp(138, 166, des); bl = lerp(62, 104, des); }
        const sh = prev === null ? 1 : clamp(1 + (prev - h) * 0.09, 0.72, 1.28);
        r *= sh; g *= sh; bl *= sh;
      }
      prev = h;
      d[o] = r; d[o + 1] = g; d[o + 2] = bl; d[o + 3] = 255;
    }
  }
  mapOffCtx.putImageData(mapImg, 0, 0);
}
let nearest = null, nearestT = 0;
function findNearest() {
  const pcx = Math.floor(bike.x / CS), pcz = Math.floor(bike.z / CS);
  let bestD = Infinity; nearest = null;
  for (let j = -4; j <= 4; j++) for (let i = -4; i <= 4; i++) for (const f of getChunkData(pcx + i, pcz + j).flags) {
    if (collected.has(f.id)) continue;
    const dd = (f.x - bike.x) ** 2 + (f.z - bike.z) ** 2;
    if (dd < bestD) { bestD = dd; nearest = f; }
  }
}
function drawMap() {
  const W = mapCv.width, Cc = W / 2, k = W / MAP_VIS, ctx = mapCtx;
  ctx.clearRect(0, 0, W, W);
  ctx.save();
  ctx.beginPath(); ctx.arc(Cc, Cc, Cc, 0, TAU); ctx.clip();
  ctx.translate(Cc, Cc); ctx.rotate(camYaw);
  const pi = MAPN / 2 - (bike.x - mapCx) / MAPS, pj = MAPN / 2 - (bike.z - mapCz) / MAPS;
  ctx.imageSmoothingEnabled = true;
  ctx.drawImage(mapOff, -pi * k, -pj * k, MAPN * k, MAPN * k);
  ctx.restore();
  const rx = -Math.cos(camYaw), rz = Math.sin(camYaw), fwx = Math.sin(camYaw), fwz = Math.cos(camYaw);
  const toScreen = (x, z) => { const dx = x - bike.x, dz = z - bike.z; return [(dx * rx + dz * rz) / MAPS * k, -(dx * fwx + dz * fwz) / MAPS * k]; };
  ctx.save(); ctx.translate(Cc, Cc);
  for (const r of nearRamps) { const [sx, sy] = toScreen(r.x, r.z); if (sx * sx + sy * sy < Cc * Cc) { ctx.fillStyle = '#5b3a1c'; ctx.fillRect(sx - 4, sy - 4, 8, 8); } }
  const pcx = Math.floor(bike.x / CS), pcz = Math.floor(bike.z / CS);
  for (let j = -2; j <= 2; j++) for (let i = -2; i <= 2; i++) for (const f of getChunkData(pcx + i, pcz + j).flags) {
    if (collected.has(f.id)) continue;
    const [sx, sy] = toScreen(f.x, f.z), dd = Math.hypot(sx, sy);
    if (dd < Cc - 8) { ctx.fillStyle = '#ffcf33'; ctx.strokeStyle = '#15140f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, 9, 0, TAU); ctx.fill(); ctx.stroke(); }
  }
  if (nearest) {
    const [sx, sy] = toScreen(nearest.x, nearest.z), dd = Math.hypot(sx, sy);
    if (dd >= Cc - 8) {
      const a = Math.atan2(sy, sx), ex = Math.cos(a) * (Cc - 14), ey = Math.sin(a) * (Cc - 14);
      ctx.save(); ctx.translate(ex, ey); ctx.rotate(a); ctx.fillStyle = '#ffcf33'; ctx.strokeStyle = '#15140f'; ctx.lineWidth = 3;
      ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore();
    }
  }
  const rt = raceTargets();
  if (rt) rt.forEach((c, i) => {
    const [sx, sy] = toScreen(c[0], c[1]), dd = Math.hypot(sx, sy);
    if (dd < Cc - 10) { ctx.fillStyle = i ? 'rgba(63,208,255,0.55)' : '#3fd0ff'; ctx.strokeStyle = '#15140f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(sx, sy, i ? 7 : 11, 0, TAU); ctx.fill(); ctx.stroke(); }
    else if (!i) { const a = Math.atan2(sy, sx); ctx.save(); ctx.translate(Math.cos(a) * (Cc - 14), Math.sin(a) * (Cc - 14)); ctx.rotate(a); ctx.fillStyle = '#3fd0ff'; ctx.strokeStyle = '#15140f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(12, 0); ctx.lineTo(-8, -10); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }
  });
  ctx.rotate(-wrapA(bike.yaw - camYaw));
  ctx.fillStyle = '#f2642a'; ctx.strokeStyle = '#fff'; ctx.lineWidth = 3;
  ctx.beginPath(); ctx.moveTo(0, -16); ctx.lineTo(11, 12); ctx.lineTo(0, 6); ctx.lineTo(-11, 12); ctx.closePath(); ctx.fill(); ctx.stroke();
  ctx.restore();
}
