// Ridgeline Moto · scenery.js
// Trees, rocks, grass, chunk streaming, distant terrain and clouds.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Geometry helpers ---------- */
const mtx = (x, y, z, rx = 0, ry = 0, rz = 0, sx = 1, sy = sx, sz = sx) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
function mergeParts(parts) {
  const pos = [], nor = [], col = [];
  for (const [geo, color, m] of parts) {
    const g = geo.index ? geo.toNonIndexed() : geo.clone();
    g.applyMatrix4(m); g.computeVertexNormals();
    const p = g.attributes.position.array, n = g.attributes.normal.array, c = lin(color);
    for (let i = 0; i < p.length; i++) { pos.push(p[i]); nor.push(n[i]); }
    for (let i = 0; i < p.length / 3; i++) col.push(c.r, c.g, c.b);
  }
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  out.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return out;
}
function lumpy(geo, amt, seed) {
  const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), y = p.getY(i), z = p.getZ(i), k = 1 + (hash3(x * 3.1 + seed, y * 2.7, z * 1.9) - 0.5) * amt;
    p.setXYZ(i, x * k, y * k, z * k);
  }
  return g;
}
const PINE = mergeParts([
  [new THREE.CylinderGeometry(0.16, 0.28, 2.2, 7), '#5e412a', mtx(0, 1.1, 0)],
  [new THREE.ConeGeometry(1.95, 2.6, 9), '#2f5a2c', mtx(0, 2.5, 0)],
  [new THREE.ConeGeometry(1.6, 2.3, 9), '#3a6833', mtx(0, 3.6, 0, 0, 0.35, 0)],
  [new THREE.ConeGeometry(1.2, 2.0, 9), '#437438', mtx(0, 4.65, 0, 0, 0.7, 0)],
  [new THREE.ConeGeometry(0.72, 1.6, 8), '#4f8040', mtx(0, 5.7, 0, 0, 0.2, 0)]
]);
const OAK = mergeParts([
  [new THREE.CylinderGeometry(0.2, 0.34, 2.6, 7), '#6a4a30', mtx(0, 1.3, 0)],
  [new THREE.CylinderGeometry(0.08, 0.14, 1.4, 5), '#6a4a30', mtx(0.45, 2.6, 0, 0, 0, -0.6)],
  [lumpy(new THREE.IcosahedronGeometry(1.7, 1), 0.3, 1), '#4d7f31', mtx(0, 3.9, 0)],
  [lumpy(new THREE.IcosahedronGeometry(1.2, 1), 0.3, 2), '#5a8e38', mtx(1.15, 3.4, 0.35)],
  [lumpy(new THREE.IcosahedronGeometry(1.25, 1), 0.3, 3), '#44742c', mtx(-1.0, 3.55, -0.3)],
  [lumpy(new THREE.IcosahedronGeometry(1.05, 1), 0.3, 4), '#64983f', mtx(0.2, 4.85, -0.4)]
]);
const OAK_AUTUMN = mergeParts([
  [new THREE.CylinderGeometry(0.2, 0.34, 2.6, 7), '#6a4a30', mtx(0, 1.3, 0)],
  [lumpy(new THREE.IcosahedronGeometry(1.7, 1), 0.3, 1), '#c0602a', mtx(0, 3.9, 0)],
  [lumpy(new THREE.IcosahedronGeometry(1.2, 1), 0.3, 2), '#d99a34', mtx(1.15, 3.4, 0.35)],
  [lumpy(new THREE.IcosahedronGeometry(1.25, 1), 0.3, 3), '#a63d22', mtx(-1.0, 3.55, -0.3)],
  [lumpy(new THREE.IcosahedronGeometry(1.05, 1), 0.3, 4), '#c9a640', mtx(0.2, 4.85, -0.4)]
]);
const PINE_FROST = mergeParts([
  [new THREE.CylinderGeometry(0.16, 0.28, 2.2, 7), '#5e412a', mtx(0, 1.1, 0)],
  [new THREE.ConeGeometry(1.95, 2.6, 9), '#5d7a66', mtx(0, 2.5, 0)],
  [new THREE.ConeGeometry(1.6, 2.3, 9), '#93a99c', mtx(0, 3.6, 0, 0, 0.35, 0)],
  [new THREE.ConeGeometry(1.2, 2.0, 9), '#c3d1ca', mtx(0, 4.65, 0, 0, 0.7, 0)],
  [new THREE.ConeGeometry(0.72, 1.6, 8), '#e6eeec', mtx(0, 5.7, 0, 0, 0.2, 0)]
]);
const BUSH = mergeParts([
  [lumpy(new THREE.IcosahedronGeometry(0.8, 1), 0.35, 5), '#4c7a2e', mtx(0, 0.45, 0)],
  [lumpy(new THREE.IcosahedronGeometry(0.6, 1), 0.35, 6), '#5d8c37', mtx(0.55, 0.35, 0.2)],
  [lumpy(new THREE.IcosahedronGeometry(0.55, 1), 0.35, 7), '#46722a', mtx(-0.45, 0.3, -0.25)]
]);
const CACTUS = mergeParts([
  [new THREE.CylinderGeometry(0.3, 0.36, 3.1, 9), '#5a8a46', mtx(0, 1.55, 0)],
  [new THREE.SphereGeometry(0.3, 9, 5, 0, TAU, 0, Math.PI / 2), '#5a8a46', mtx(0, 3.1, 0)],
  [new THREE.CylinderGeometry(0.17, 0.17, 0.7, 7), '#5a8a46', mtx(0.42, 1.3, 0, 0, 0, Math.PI / 2)],
  [new THREE.CylinderGeometry(0.18, 0.18, 1.2, 7), '#5a8a46', mtx(0.72, 1.85, 0)],
  [new THREE.CylinderGeometry(0.15, 0.15, 0.6, 7), '#5a8a46', mtx(-0.38, 2.0, 0, 0, 0, Math.PI / 2)],
  [new THREE.CylinderGeometry(0.15, 0.15, 0.9, 7), '#5a8a46', mtx(-0.62, 2.4, 0)]
]);
const ROCK = mergeParts([[lumpy(new THREE.DodecahedronGeometry(1, 1), 0.4, 8), '#8d867b', mtx(0, 0, 0)]]);
const instMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, metalness: 0, envMapIntensity: 0.7 });
// Trees and bushes lean with the same gusts as the grass; the trunk base stays planted.
const swayPatch = sh => {
  sh.uniforms.uTime = grassU.uTime;
  sh.vertexShader = 'uniform float uTime;\n' + sh.vertexShader.replace('#include <project_vertex>', [
    'vec4 mvPosition = vec4(transformed, 1.0);',
    '#ifdef USE_INSTANCING',
    'mvPosition = instanceMatrix * mvPosition;',
    'vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);',
    'float hgt = max(mvPosition.y - ip.y, 0.0);',
    'float bend = hgt * hgt * 0.0035;',
    'float gust = sin(uTime * 0.7 + ip.x * 0.03) * 0.5 + 0.7;',
    'mvPosition.x += (sin(uTime * 1.3 + ip.x * 0.11 + ip.z * 0.07) * 0.6 + 0.4) * bend * gust;',
    'mvPosition.z += cos(uTime * 1.1 + ip.z * 0.13) * 0.4 * bend * gust;',
    '#endif',
    'mvPosition = modelViewMatrix * mvPosition;',
    'gl_Position = projectionMatrix * mvPosition;'
  ].join('\n'));
};
instMat.onBeforeCompile = swayPatch;

/* ---------- Detailed foliage: alpha-tested leaf and needle cards ---------- */
// Atlas regions [u0, v0, u1, v1]. Canvas top is v = 1.
const ATLAS = { bark: [0, 0.5, 0.5, 1], oak: [0, 0, 0.5, 0.5], pine: [0.5, 0, 1, 0.5], bush: [0.5, 0.5, 1, 1] };
function makeFoliageAtlas(variant = 'summer') {
  const S = 1024, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d'), rnd = mulberry32(31);
  const rgba = (r, g, b, a = 1) => `rgba(${r | 0},${g | 0},${b | 0},${a})`;
  // Bark: furrowed vertical streaks.
  x.fillStyle = '#5a4433'; x.fillRect(0, 0, 512, 512);
  for (let i = 0; i < 320; i++) { x.fillStyle = rgba(25 + rnd() * 40, 18 + rnd() * 26, 10 + rnd() * 16, 0.3 + rnd() * 0.45); x.fillRect(rnd() * 512, 0, 2 + rnd() * 7, 512); }
  for (let i = 0; i < 600; i++) { x.fillStyle = rgba(170, 140, 110, rnd() * 0.14); x.fillRect(rnd() * 512, rnd() * 512, 1 + rnd() * 3, 6 + rnd() * 26); }
  const leaf = (cx, cy, len, ang, col) => {
    x.save(); x.translate(cx, cy); x.rotate(ang); x.fillStyle = col;
    x.beginPath(); x.moveTo(0, 0); x.quadraticCurveTo(len * 0.5, -len * 0.34, len, 0); x.quadraticCurveTo(len * 0.5, len * 0.34, 0, 0); x.fill();
    x.strokeStyle = 'rgba(25,45,12,0.35)'; x.lineWidth = 1; x.beginPath(); x.moveTo(0, 0); x.lineTo(len * 0.9, 0); x.stroke();
    x.restore();
  };
  // Autumn mixes reds, oranges and golds with a few late greens; frost dusts the tops of leaves white.
  const AUTUMN = [[236, 102, 34], [250, 168, 46], [206, 58, 32], [240, 196, 66], [150, 132, 48]];
  const cluster = (ox, oy, n, size, base) => {
    x.save(); x.beginPath(); x.rect(ox, oy, 512, 512); x.clip();
    for (let i = 0; i < n; i++) {
      const a = rnd() * TAU, r = Math.sqrt(rnd()) * 232, depth = 1 - r / 232, s = rnd();
      const col = variant === 'autumn' ? AUTUMN[Math.floor(rnd() * AUTUMN.length)] : base;
      const cx = ox + 256 + Math.cos(a) * r, cy = oy + 256 + Math.sin(a) * r;
      leaf(cx, cy, size * (0.7 + rnd() * 0.6), rnd() * TAU, rgb3(col, 0.55 + depth * 0.25 + s * 0.35));
      if (variant === 'frost' && rnd() < 0.35) { x.fillStyle = 'rgba(240,246,252,0.85)'; x.beginPath(); x.arc(cx, cy - 3, size * 0.25, 0, TAU); x.fill(); }
    }
    x.restore();
  };
  const rgb3 = (b, k) => rgba(b[0] * k, b[1] * k, b[2] * k);
  cluster(0, 512, 1100, 30, [78, 128, 46]);   // oak
  cluster(512, 0, 900, 24, [92, 136, 52]);    // bush
  // Pine: a branch running left to right with needle sprays along it.
  x.save(); x.beginPath(); x.rect(512, 512, 512, 512); x.clip();
  const by = 768;
  for (let i = 0; i < 3400; i++) {
    const t = rnd(), px = 520 + t * 480, spread = (1 - t * 0.6) * 200, len = (0.35 + rnd() * 0.65) * spread * 0.5;
    const sy = by + (rnd() - 0.5) * spread * 0.55, a = (rnd() < 0.5 ? -1 : 1) * (0.45 + rnd() * 0.9);
    x.strokeStyle = rgba(18 + rnd() * 22, 52 + rnd() * 55, 26 + rnd() * 22, 0.95); x.lineWidth = 1.4 + rnd() * 1.6;
    x.beginPath(); x.moveTo(px, sy); x.lineTo(px + len * 0.45, sy + Math.sin(a) * len); x.stroke();
  }
  x.strokeStyle = '#4a3524'; x.lineWidth = 6; x.beginPath(); x.moveTo(512, by); x.lineTo(1000, by); x.stroke();
  if (variant === 'frost') for (let i = 0; i < 700; i++) {
    const t = rnd(), px = 520 + t * 470, w = (1 - t * 0.6) * 90;
    x.fillStyle = `rgba(242,247,252,${0.6 + rnd() * 0.35})`; x.beginPath(); x.ellipse(px, by - rnd() * w * 0.5, 4 + rnd() * 9, 2 + rnd() * 4, 0, 0, TAU); x.fill();
  }
  x.restore();
  const t = new THREE.CanvasTexture(cv); t.encoding = THREE.sRGBEncoding; t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
// Builds one geometry from textured quads and atlas-mapped meshes (trunks, branches).
function cardGeo(build) {
  const P = [], N = [], U = [], C = [];
  const api = {
    quad(c, ax, ay, n, reg, col = [1, 1, 1]) {
      const cs = [[-1, -1], [1, -1], [1, 1], [-1, 1]];
      const vs = cs.map(([a, b]) => c.clone().addScaledVector(ax, a).addScaledVector(ay, b));
      const uv = cs.map(([a, b]) => [lerp(reg[0], reg[2], (a + 1) / 2), lerp(reg[1], reg[3], (b + 1) / 2)]);
      for (const i of [0, 1, 2, 0, 2, 3]) { P.push(vs[i].x, vs[i].y, vs[i].z); N.push(n.x, n.y, n.z); U.push(uv[i][0], uv[i][1]); C.push(...col); }
    },
    mesh(geo, reg, col = [1, 1, 1]) {
      const g = geo.index ? geo.toNonIndexed() : geo, p = g.attributes.position, nn = g.attributes.normal, uv = g.attributes.uv;
      for (let i = 0; i < p.count; i++) {
        P.push(p.getX(i), p.getY(i), p.getZ(i)); N.push(nn.getX(i), nn.getY(i), nn.getZ(i));
        U.push(lerp(reg[0], reg[2], uv.getX(i)), lerp(reg[1], reg[3], uv.getY(i))); C.push(...col);
      }
    }
  };
  build(api);
  const out = new THREE.BufferGeometry();
  out.setAttribute('position', new THREE.Float32BufferAttribute(P, 3));
  out.setAttribute('normal', new THREE.Float32BufferAttribute(N, 3));
  out.setAttribute('uv', new THREE.Float32BufferAttribute(U, 2));
  out.setAttribute('color', new THREE.Float32BufferAttribute(C, 3));
  return out;
}
const V3 = (x, y, z) => new THREE.Vector3(x, y, z);
const limbGeo = (a, b, r0, r1) => {
  const va = V3(...a), dir = V3(...b).sub(va), len = dir.length();
  const g = new THREE.CylinderGeometry(r1, r0, len, 7, 1, true).translate(0, len / 2, 0);
  g.applyMatrix4(new THREE.Matrix4().makeRotationFromQuaternion(new THREE.Quaternion().setFromUnitVectors(V3(0, 1, 0), dir.normalize()))); g.translate(va.x, va.y, va.z);
  return g;
};
// Leaf clumps scattered over a few canopy spheres. Normals point out from each sphere, so the canopy
// shades like a soft volume instead of a pile of flat cards.
function canopy(api, blobs, reg, rnd, density, size) {
  for (const [cx, cy, cz, r] of blobs) {
    const n = Math.round(r * r * density);
    for (let i = 0; i < n; i++) {
      const u = rnd() * 2 - 1, a = rnd() * TAU, s = Math.sqrt(1 - u * u);
      const dir = V3(Math.cos(a) * s, Math.abs(u) * 0.8 + u * 0.2, Math.sin(a) * s).normalize();
      const c = V3(cx, cy, cz).addScaledVector(dir, r * (0.45 + rnd() * 0.55));
      const t1 = V3(rnd() - 0.5, rnd() - 0.5, rnd() - 0.5).cross(dir).normalize(), t2 = dir.clone().cross(t1);
      const q = size * (0.75 + rnd() * 0.5);
      api.quad(c, t1.multiplyScalar(q), t2.multiplyScalar(q), dir.clone().add(V3(0, 0.35, 0)).normalize(), reg);
    }
  }
}
const PINE_CARDS = cardGeo(api => {
  const rnd = mulberry32(77);
  api.mesh(new THREE.CylinderGeometry(0.1, 0.3, 6.8, 8, 1, true).translate(0, 3.4, 0), ATLAS.bark);
  const tiers = 10;
  for (let k = 0; k < tiers; k++) {
    const t = k / (tiers - 1), y = 1.5 + t * 5.0, R = lerp(2.4, 0.5, t), n = Math.round(lerp(8, 4, t));
    for (let i = 0; i < n; i++) {
      const a = (i / n + k * 0.37 + rnd() * 0.1) * TAU, droop = -0.22 - rnd() * 0.18 + t * 0.15;
      const dir = V3(Math.cos(a), droop, Math.sin(a)).normalize(), len = R * (0.85 + rnd() * 0.3);
      const c = V3(0, y, 0).addScaledVector(dir, len / 2), side = V3(-Math.sin(a), 0, Math.cos(a));
      const nrm = V3(Math.cos(a) * 0.55, 0.85, Math.sin(a) * 0.55).normalize();
      api.quad(c, dir.clone().multiplyScalar(len / 2), side.clone().multiplyScalar(len * 0.42).add(V3(0, len * 0.06, 0)), nrm, ATLAS.pine);
      api.quad(c, dir.clone().multiplyScalar(len / 2), V3(0, len * 0.3, 0).addScaledVector(side, len * 0.08), nrm, ATLAS.pine);
    }
  }
  for (let i = 0; i < 2; i++) { const a = i * Math.PI / 2; api.quad(V3(0, 6.9, 0), V3(0, 0.6, 0), V3(Math.cos(a) * 0.35, 0, Math.sin(a) * 0.35), V3(0, 1, 0), ATLAS.pine); }
});
const OAK_CARDS = cardGeo(api => {
  const rnd = mulberry32(78);
  api.mesh(new THREE.CylinderGeometry(0.2, 0.36, 3.2, 9, 1, true).translate(0, 1.6, 0), ATLAS.bark);
  const blobs = [[0, 4.2, 0, 1.9], [1.3, 3.7, 0.4, 1.35], [-1.15, 3.8, -0.35, 1.45], [0.25, 5.2, -0.45, 1.25], [-0.35, 3.4, 1.1, 1.15]];
  for (const b of blobs.slice(1)) api.mesh(limbGeo([0, 2.7, 0], [b[0] * 0.8, b[1] - 0.3, b[2] * 0.8], 0.14, 0.06), ATLAS.bark);
  canopy(api, blobs, ATLAS.oak, rnd, 13, 0.85);
});
const BUSH_CARDS = cardGeo(api => {
  canopy(api, [[0, 0.55, 0, 0.85], [0.55, 0.45, 0.25, 0.6], [-0.5, 0.4, -0.25, 0.58]], ATLAS.bush, mulberry32(79), 16, 0.45);
});
const foliageAtlases = {};
const foliageAtlasFor = v => foliageAtlases[v] || (foliageAtlases[v] = makeFoliageAtlas(v));
const foliageAtlas = foliageAtlasFor('summer');
const foliageMat = new THREE.MeshStandardMaterial({ map: foliageAtlas, vertexColors: true, alphaTest: 0.42, side: THREE.DoubleSide, roughness: 0.8, metalness: 0, envMapIntensity: 0.85 });
foliageMat.onBeforeCompile = sh => {
  swayPatch(sh);
  // Both faces of a card share the canopy normal, and a little light leaks through the leaves.
  sh.fragmentShader = sh.fragmentShader
    .replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0;\nvec3 normal = normalize(vNormal);\nvec3 geometryNormal = normal;')
    .replace('vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance;', 'vec3 outgoingLight = totalDiffuse + totalSpecular + totalEmissiveRadiance + diffuseColor.rgb * vec3(0.09, 0.09, 0.06);');
};
const foliageDepth = new THREE.MeshDepthMaterial({ depthPacking: THREE.RGBADepthPacking, map: foliageAtlas, alphaTest: 0.42, side: THREE.DoubleSide });
// Near chunks get leafy card trees; far chunks keep the cheap solid ones. Phones always use the solid ones.
let LOD_CARDS = !coarse;
const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, metalness: 0, map: detailTex, envMapIntensity: 0.7 });
rockMat.onBeforeCompile = detailOnly;
ROCK.setAttribute('uv', new THREE.Float32BufferAttribute(Array.from(ROCK.attributes.position.array).filter((_, i) => i % 3 !== 1).map(v => v * 0.6), 2));
const rampMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.8, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.6 });

function makeInst(geo, items, tintFn, mat = instMat, shadow = true, nearGeo = null) {
  if (!items.length) return null;
  const m = new THREE.InstancedMesh(geo, mat, items.length);
  if (nearGeo && !coarse) m.userData.lod = { near: { geo: nearGeo, mat: foliageMat, depth: foliageDepth }, far: { geo, mat, depth: undefined } };
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler(), s = new THREE.Vector3(), p = new THREE.Vector3(), c = new THREE.Color();
  items.forEach((o, i) => {
    e.set(o.tilt ? o.rot * 3 : 0, o.rot * TAU, o.tilt ? o.tint * 2 : 0);
    q.setFromEuler(e); p.set(o.x, o.y, o.z); s.set(o.s, o.sy || o.s, o.s);
    M.compose(p, q, s); m.setMatrixAt(i, M);
    tintFn(c, o.tint); m.setColorAt(i, c);
  });
  m.instanceMatrix.needsUpdate = true;
  if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.castShadow = shadow; m.receiveShadow = true; m.frustumCulled = false;
  return m;
}

/* ---------- Grass ---------- */
const grassU = { uTime: { value: 0 }, uCenter: { value: new THREE.Vector3() }, uBike: { value: new THREE.Vector3() } };
const GRASS_GEO = (() => {
  const pos = [], col = [], nor = [], rnd = mulberry32(5);
  for (let b = 0; b < 7; b++) {
    const a = b / 7 * Math.PI + rnd() * 0.5, ca = Math.cos(a), sa = Math.sin(a);
    const ox = (rnd() - 0.5) * 0.35, oz = (rnd() - 0.5) * 0.35, h = 0.3 + rnd() * 0.3, w = 0.04 + rnd() * 0.025, lean = (rnd() - 0.5) * 0.3;
    const P = (u, v, l) => [ox + ca * u - sa * l, v, oz + sa * u + ca * l];
    const v0 = P(-w, -0.04, 0), v1 = P(w, -0.04, 0), v2 = P(-w * 0.6, h * 0.55, lean * 0.35), v3 = P(w * 0.6, h * 0.55, lean * 0.35), v4 = P(0, h, lean);
    const shade = y => 0.6 + (y / 0.6) * 0.6;
    for (const t of [[v0, v1, v3], [v0, v3, v2], [v2, v3, v4]]) for (const v of t) { pos.push(...v); nor.push(0, 1, 0); const s = shade(Math.max(0, v[1])); col.push(s, s, s); }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('normal', new THREE.Float32BufferAttribute(nor, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  return g;
})();
const grassMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, side: THREE.DoubleSide, envMapIntensity: 0.6 });
grassMat.onBeforeCompile = sh => {
  Object.assign(sh.uniforms, grassU);
  // Light both faces of a blade from the same upward normal, like the ground it grows from.
  sh.fragmentShader = sh.fragmentShader.replace('#include <normal_fragment_begin>', 'float faceDirection = 1.0;\nvec3 normal = normalize(vNormal);\nvec3 geometryNormal = normal;');
  sh.vertexShader = 'uniform float uTime;\nuniform vec3 uCenter;\nuniform vec3 uBike;\n' + sh.vertexShader
    .replace('#include <begin_vertex>', [
      'vec3 transformed = vec3(position);',
      '#ifdef USE_INSTANCING',
      'vec3 ip = vec3(instanceMatrix[3][0], instanceMatrix[3][1], instanceMatrix[3][2]);',
      '#else',
      'vec3 ip = vec3(0.0);',
      '#endif',
      'transformed *= 1.0 - smoothstep(55.0, 85.0, distance(ip.xz, uCenter.xz));'
    ].join('\n'))
    .replace('#include <project_vertex>', [
      'vec4 mvPosition = vec4(transformed, 1.0);',
      '#ifdef USE_INSTANCING',
      'mvPosition = instanceMatrix * mvPosition;',
      '#endif',
      'float hgt = max(position.y, 0.0);',
      'float gust = sin(uTime * 0.7 + mvPosition.x * 0.03) * 0.5 + 0.7;',
      'mvPosition.x += (sin(uTime * 1.9 + mvPosition.x * 0.25 + mvPosition.z * 0.19) * 0.5 + 0.35) * 0.22 * hgt * gust;',
      'mvPosition.z += cos(uTime * 1.5 + mvPosition.z * 0.23) * 0.1 * hgt * gust;',
      'vec2 away = mvPosition.xz - uBike.xz; float bd = length(away);',
      'mvPosition.xz += away / max(bd, 0.001) * hgt * 0.7 * (1.0 - smoothstep(0.3, 1.4, bd));',
      'mvPosition = modelViewMatrix * mvPosition;',
      'gl_Position = projectionMatrix * mvPosition;'
    ].join('\n'));
};
const GT = 40, GCELLS = GT / CELL, GRASS_R = 2, GRASS_DENS = coarse ? 4 : 12;
const grassTiles = new Map();
const FLOWERS = [lin('#f4d23c'), lin('#f5f2ea'), lin('#b48ad8'), lin('#e8743a')];
function buildGrassTile(tx, tz) {
  const ox = tx * GT, oz = tz * GT;
  const { grass, col } = runGen(terrainGeoGen(ox, oz, GCELLS, CELL, { grass: true }));
  const W = GCELLS + 1, ramps = rampsAround(ox + GT / 2, oz + GT / 2);
  const rng = mulberry32((Math.imul(tx, 912367) ^ Math.imul(tz, 3571) ^ 0x77) >>> 0);
  const items = [];
  for (let j = 0; j < GCELLS; j++) for (let i = 0; i < GCELLS; i++) {
    const k = j * W + i, g = (grass[k] + grass[k + 1] + grass[k + W] + grass[k + W + 1]) / 4;
    const n = Math.floor(g * g * GRASS_DENS + rng());
    for (let q = 0; q < n; q++) {
      const x = ox + (i + rng()) * CELL, z = oz + (j + rng()) * CELL, y = terrainH(x, z);
      if (y < WATER + 0.4 || ramps.some(r => rampH(r, x, z) > -Infinity)) continue;
      const s = 0.7 + rng() * 0.6, f = rng(), t = 0.85 + rng() * 0.3;
      items.push({ x, y, z, s, sy: s * (0.6 + rng() * 0.5), rot: rng(), c: f < 0.035 ? FLOWERS[Math.floor(rng() * 4)] : null, r: col[k * 3] * t, g: col[k * 3 + 1] * t, b: col[k * 3 + 2] * t });
    }
  }
  if (!items.length) { grassTiles.set(tx + ',' + tz, { mesh: null, tx, tz }); return; }
  const m = new THREE.InstancedMesh(GRASS_GEO, grassMat, items.length);
  const M = new THREE.Matrix4(), q = new THREE.Quaternion(), up = new THREE.Vector3(0, 1, 0), p = new THREE.Vector3(), s = new THREE.Vector3(), c = new THREE.Color();
  items.forEach((o, i) => {
    q.setFromAxisAngle(up, o.rot * TAU); p.set(o.x, o.y, o.z); s.set(o.s, o.sy, o.s);
    M.compose(p, q, s); m.setMatrixAt(i, M);
    if (o.c) c.copy(o.c); else c.setRGB(o.r * 1.15, o.g * 1.2, o.b * 1.05);
    m.setColorAt(i, c);
  });
  m.instanceMatrix.needsUpdate = true; if (m.instanceColor) m.instanceColor.needsUpdate = true;
  m.frustumCulled = false; m.receiveShadow = true;
  scene.add(m);
  grassTiles.set(tx + ',' + tz, { mesh: m, tx, tz });
}
function updateGrass(all) {
  const ptx = Math.floor(bike.x / GT), ptz = Math.floor(bike.z / GT);
  for (const [k, t] of grassTiles) if (Math.max(Math.abs(t.tx - ptx), Math.abs(t.tz - ptz)) > GRASS_R + 1) { if (t.mesh) { scene.remove(t.mesh); t.mesh.dispose(); } grassTiles.delete(k); }
  const need = [];
  for (let j = -GRASS_R; j <= GRASS_R; j++) for (let i = -GRASS_R; i <= GRASS_R; i++) if (!grassTiles.has((ptx + i) + ',' + (ptz + j))) need.push([ptx + i, ptz + j, i * i + j * j]);
  need.sort((a, b) => a[2] - b[2]);
  (all ? need : need.slice(0, 2)).forEach(n => buildGrassTile(n[0], n[1]));
}

/* ---------- Chunk meshes ---------- */
const chunks = new Map();
const FLAG_POLE = new THREE.CylinderGeometry(0.07, 0.07, 7, 8).translate(0, 3.5, 0);
const FLAG_CLOTH = new THREE.BufferGeometry();
FLAG_CLOTH.setAttribute('position', new THREE.Float32BufferAttribute([0, 6.9, 0, 0, 5.5, 0, 1.9, 6.2, 0], 3));
FLAG_CLOTH.computeVertexNormals();
const FLAG_BEAM = new THREE.CylinderGeometry(1.1, 1.1, 46, 16, 1, true).translate(0, 23, 0);
const poleMat = new THREE.MeshStandardMaterial({ color: lin('#d9d4c7'), metalness: 0.6, roughness: 0.35 });
const clothMat = new THREE.MeshStandardMaterial({ color: lin('#ffcf33'), emissive: lin('#ffb000'), emissiveIntensity: 0.6, side: THREE.DoubleSide, roughness: 0.6 });
const beamMat = new THREE.MeshBasicMaterial({ color: lin('#ffd84a'), transparent: true, opacity: 0.16, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });

// Timber bridge: plank deck following h0 -> h1, side rails and posts down into the water.
function buildDeckMesh(r) {
  const pos = [], col = [], hw = r.W / 2, n = Math.max(4, Math.round(r.L / 1.2));
  const plank = [L3('#8a6440'), L3('#7a5636'), L3('#946d46')], beam = L3('#4f3a28');
  const quad = (a, b, c, d, cc) => { pos.push(...a, ...b, ...c, ...a, ...c, ...d); for (let i = 0; i < 6; i++) col.push(...cc); };
  const hAt = t => lerp(r.h0, r.h1, t) - r.base;
  const box = (x0, x1, y0, y1, u0, u1, cc) => {
    quad([x0, y1, u0], [x1, y1, u0], [x1, y1, u1], [x0, y1, u1], cc); quad([x0, y0, u0], [x0, y1, u0], [x0, y1, u1], [x0, y0, u1], cc);
    quad([x1, y1, u0], [x1, y0, u0], [x1, y0, u1], [x1, y1, u1], cc); quad([x0, y0, u0], [x1, y0, u0], [x1, y1, u0], [x0, y1, u0], cc);
    quad([x1, y0, u1], [x0, y0, u1], [x0, y1, u1], [x1, y1, u1], cc);
  };
  for (let k = 0; k < n; k++) {
    const t0 = k / n, t1 = (k + 0.92) / n, u0 = -r.L / 2 + t0 * r.L, u1 = -r.L / 2 + t1 * r.L, y = hAt((t0 + t1) / 2);
    box(-hw, hw, y - 0.12, y, u0, u1, plank[k % 3].map(v => v * (0.9 + hash01(r.x + k, r.z) * 0.2)));
  }
  for (const sx of [-hw - 0.08, hw - 0.04]) for (let k = 0; k <= Math.round(r.L / 3); k++) {
    const t = k / Math.round(r.L / 3), u = -r.L / 2 + t * r.L, y = hAt(t);
    box(sx, sx + 0.12, y, y + 1.0, u - 0.07, u + 0.07, beam);
    if (k % 2 === 0) box(sx, sx + 0.16, WATER - 2.5 - r.base, y - 0.12, u - 0.1, u + 0.1, beam);
  }
  for (const sx of [-hw - 0.08, hw - 0.04]) for (let k = 0; k < Math.round(r.L / 3); k++) {
    const t0 = k / Math.round(r.L / 3), t1 = (k + 1) / Math.round(r.L / 3);
    const u0 = -r.L / 2 + t0 * r.L, u1 = -r.L / 2 + t1 * r.L, y0 = hAt(t0) + 0.92, y1 = hAt(t1) + 0.92;
    quad([sx, y0, u0], [sx + 0.12, y0, u0], [sx + 0.12, y1, u1], [sx, y1, u1], beam);
    quad([sx, y0 - 0.08, u0], [sx, y0, u0], [sx, y1, u1], [sx, y1 - 0.08, u1], beam);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, rampMat);
  m.position.set(r.x, r.base, r.z); m.rotation.y = r.a; m.castShadow = true; m.receiveShadow = true;
  return m;
}
// Log cabin: walls, pitched roof, door, windows and a stone chimney.
const CABIN = mergeParts([
  [new THREE.BoxGeometry(6, 3, 4.6), '#7a5232', mtx(0, 1.5, 0)],
  [new THREE.BoxGeometry(6.4, 0.25, 3.4), '#4a3a2e', mtx(0, 3.8, 1.25, 0.62, 0, 0)],
  [new THREE.BoxGeometry(6.4, 0.25, 3.4), '#4a3a2e', mtx(0, 3.8, -1.25, -0.62, 0, 0)],
  [new THREE.CylinderGeometry(2.3, 2.3, 6, 3, 1), '#6e4a2d', mtx(0, 3.4, 0, 0, 0, Math.PI / 2, 1, 0.55, 1)],
  [new THREE.BoxGeometry(1.1, 2, 0.12), '#3b2a1c', mtx(0.8, 1.0, 2.33)],
  [new THREE.BoxGeometry(1.0, 0.9, 0.1), '#a9c4d4', mtx(-1.6, 1.7, 2.32)],
  [new THREE.BoxGeometry(0.1, 0.9, 1.0), '#a9c4d4', mtx(3.02, 1.7, 0)],
  [new THREE.BoxGeometry(0.9, 4.4, 0.9), '#8b867c', mtx(-2.3, 3.0, -1.2)],
  [new THREE.BoxGeometry(6.6, 0.3, 5.2), '#5a5248', mtx(0, 0.1, 0)]
]);
const CRATE = new THREE.BoxGeometry(1.2, 1.2, 1.2);
const crateMat = new THREE.MeshStandardMaterial({ color: lin('#ffcf33'), emissive: lin('#ffb000'), emissiveIntensity: 1.1, roughness: 0.35, metalness: 0.4 });
function buildRampMesh(r) {
  const pos = [], col = [], S = 12, BOT = -3, hw = r.W / 2;
  if (r.kind === 'deck') return buildDeckMesh(r);
  const dirt = r.kind === 'arch' || r.kind === 'table';
  const wood = dirt ? [L3('#7a5636'), L3('#6f4c2f')] : [L3('#b07a43'), L3('#9a6738')], side = dirt ? L3('#5e4129') : L3('#6f4a2b'), rail = L3('#3b3b3e');
  const quad = (a, b, c, d, cc) => { pos.push(...a, ...b, ...c, ...a, ...c, ...d); for (let i = 0; i < 6; i++) col.push(...cc); };
  const prof = t => r.H * rampProfile(r.kind, t);
  for (let k = 0; k < S; k++) {
    const t0 = k / S, t1 = (k + 1) / S, u0 = -r.L / 2 + t0 * r.L, u1 = -r.L / 2 + t1 * r.L, h0 = prof(t0), h1 = prof(t1);
    const shade = wood[k % 2].map(v => v * (0.92 + hash01(r.x + k, r.z) * 0.16));
    quad([-hw, h0, u0], [hw, h0, u0], [hw, h1, u1], [-hw, h1, u1], shade);
    quad([-hw, BOT, u0], [-hw, h0, u0], [-hw, h1, u1], [-hw, BOT, u1], side);
    quad([hw, h0, u0], [hw, BOT, u0], [hw, BOT, u1], [hw, h1, u1], side);
    if (!dirt) for (const sx of [-hw, hw - 0.12]) quad([sx, h0 + 0.06, u0], [sx + 0.12, h0 + 0.06, u0], [sx + 0.12, h1 + 0.06, u1], [sx, h1 + 0.06, u1], rail);
  }
  const L2 = r.L / 2;
  if (r.kind === 'kick') quad([-hw, BOT, L2], [-hw, r.H, L2], [hw, r.H, L2], [hw, BOT, L2], side);
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
  g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
  g.computeVertexNormals();
  const m = new THREE.Mesh(g, rampMat);
  m.position.set(r.x, r.base, r.z); m.rotation.y = r.a;
  m.castShadow = true; m.receiveShadow = true;
  return m;
}

function buildChunk(cx, cz) {
  const { geo } = runGen(terrainGeoGen(cx * CS, cz * CS, CN, CELL, { skirt: true }));
  const group = new THREE.Group();
  const terrain = new THREE.Mesh(geo, terrainMat);
  terrain.receiveShadow = true;
  group.add(terrain);
  const d = getChunkData(cx, cz);
  const inst = [
    makeInst(W.foliage === 'frost' ? PINE_FROST : PINE, d.trees, (col, t) => col.setRGB((0.82 + t * 0.3) * W.tint[0], (0.86 + t * 0.22) * W.tint[1], (0.8 + t * 0.2) * W.tint[2]), instMat, true, PINE_CARDS),
    makeInst(W.foliage === 'autumn' ? OAK_AUTUMN : OAK, d.oaks, (col, t) => col.setRGB((0.85 + t * 0.35) * W.tint[0], (0.88 + t * 0.2) * W.tint[1], (0.8 + t * 0.1) * W.tint[2]), instMat, true, OAK_CARDS),
    makeInst(BUSH, d.bushes, (col, t) => col.setRGB((0.85 + t * 0.3) * W.tint[0], (0.9 + t * 0.2) * W.tint[1], 0.85 * W.tint[2]), instMat, true, BUSH_CARDS),
    makeInst(CACTUS, d.cacti, (col, t) => col.setRGB(0.9 + t * 0.2, 0.9 + t * 0.15, 0.85)),
    makeInst(ROCK, d.rocks, (col, t) => col.setRGB(0.85 + t * 0.3, 0.83 + t * 0.28, 0.8 + t * 0.26), rockMat)
  ].filter(Boolean);
  inst.forEach(m => group.add(m));
  d.ramps.forEach(r => group.add(buildRampMesh(r)));
  for (const c of d.cabins) {
    const m = new THREE.Mesh(CABIN, instMat); m.position.set(c.x, c.y, c.z); m.rotation.y = c.rot * TAU;
    m.castShadow = true; m.receiveShadow = true; group.add(m);
  }
  const cacheObjs = new Map();
  for (const c of d.caches) {
    if (prog.caches.includes(c.id)) continue;
    const m = new THREE.Mesh(CRATE, crateMat); m.position.set(c.x, c.y + 1.1, c.z); m.castShadow = true;
    group.add(m); cacheObjs.set(c.id, m);
  }
  const flagObjs = new Map();
  d.flags.forEach(f => {
    if (collected.has(f.id)) return;
    const fg = new THREE.Group();
    const pole = new THREE.Mesh(FLAG_POLE, poleMat); pole.castShadow = true;
    const cloth = new THREE.Mesh(FLAG_CLOTH, clothMat); cloth.castShadow = true;
    fg.add(pole, cloth, new THREE.Mesh(FLAG_BEAM, beamMat));
    fg.position.set(f.x, f.y, f.z);
    fg.userData.cloth = cloth;
    group.add(fg); flagObjs.set(f.id, fg);
  });
  scene.add(group);
  chunks.set(cx + ',' + cz, { group, terrain, inst, flagObjs, cacheObjs, cx, cz });
}
function disposeChunk(k) {
  const ch = chunks.get(k);
  scene.remove(ch.group);
  ch.terrain.geometry.dispose();
  ch.inst.forEach(m => m.dispose && m.dispose());
  ch.group.children.forEach(o => { if (o.material === rampMat) o.geometry.dispose(); });
  chunks.delete(k);
}

/* ---------- Distant terrain: a coarse ring out to the horizon ---------- */
const FAR_CELL = 25, FAR_N = 136;
let farMesh = null, farRegion = null, farJob = null;
function* farBuild(pcx, pcz) {
  const ox = pcx * CS - 1600, oz = pcz * CS - 1600;
  const gen = terrainGeoGen(ox, oz, FAR_N, FAR_CELL, { far: true, drop: 0.6, yieldRows: 10, skip: (i, j) => i >= 48 && i <= 87 && j >= 48 && j <= 87 });
  let r;
  while (!(r = gen.next()).done) yield;
  const m = new THREE.Mesh(r.value.geo, terrainMat);
  if (farMesh) { scene.remove(farMesh); farMesh.geometry.dispose(); }
  farMesh = m; scene.add(m);
  farRegion = { cx0: pcx - VIEW_R, cx1: pcx + VIEW_R, cz0: pcz - VIEW_R, cz1: pcz + VIEW_R, pcx, pcz };
}
function updateFar(all) {
  const pcx = Math.floor(bike.x / CS), pcz = Math.floor(bike.z / CS);
  if (!farJob && (!farRegion || farRegion.pcx !== pcx || farRegion.pcz !== pcz)) farJob = farBuild(pcx, pcz);
  if (farJob) { if (all) runGen(farJob), farJob = null; else if (farJob.next().done) farJob = null; }
}
function updateChunks(all) {
  const pcx = Math.floor(bike.x / CS), pcz = Math.floor(bike.z / CS);
  const inHole = (cx, cz) => farRegion && cx >= farRegion.cx0 && cx <= farRegion.cx1 && cz >= farRegion.cz0 && cz <= farRegion.cz1;
  for (const [k, ch] of chunks) {
    const dist = Math.max(Math.abs(ch.cx - pcx), Math.abs(ch.cz - pcz));
    if (dist > VIEW_R && !inHole(ch.cx, ch.cz)) { disposeChunk(k); continue; }
    // Shadows only reach ~40 m, so far chunks skip the shadow pass (matters in Deep Forest).
    const near = dist <= 1;
    if (ch.near !== near) {
      ch.near = near;
      ch.inst.forEach(m => {
        m.castShadow = near;
        const l = m.userData.lod;
        if (l) { const s = near && LOD_CARDS ? l.near : l.far; m.geometry = s.geo; m.material = s.mat; m.customDepthMaterial = s.depth; }
      });
    }
  }
  const need = [];
  for (let j = -VIEW_R; j <= VIEW_R; j++) for (let i = -VIEW_R; i <= VIEW_R; i++) if (!chunks.has((pcx + i) + ',' + (pcz + j))) need.push([pcx + i, pcz + j, i * i + j * j]);
  need.sort((a, b) => a[2] - b[2]);
  (all ? need : need.slice(0, 1)).forEach(q => buildChunk(q[0], q[1]));
}

/* ---------- Clouds ---------- */
const clouds = [];
{
  const cloudMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, emissive: lin('#7d8a99'), emissiveIntensity: 0.45, envMapIntensity: 1 });
  const rnd = mulberry32(4242);
  const variants = [0, 1, 2].map(v => {
    const parts = [];
    const n = 6 + v * 2;
    for (let i = 0; i < n; i++) {
      const r = 0.5 + rnd() * 0.6;
      parts.push([new THREE.IcosahedronGeometry(r, 2), '#ffffff', mtx((rnd() - 0.5) * 2.4, (rnd() - 0.3) * 0.4, (rnd() - 0.5) * 1.2, 0, 0, 0, 1, 0.62, 1)]);
    }
    const g = mergeParts(parts);
    const p = g.attributes.position, c = g.attributes.color;
    for (let i = 0; i < p.count; i++) { const k = 0.62 + smooth(-0.4, 0.5, p.getY(i)) * 0.4; c.setXYZ(i, k, k * 1.01, k * 1.04); }
    g.computeVertexNormals();
    return g;
  });
  for (let i = 0; i < 46; i++) {
    const m = new THREE.Mesh(variants[i % 3], cloudMat);
    const s = 34 + rnd() * 60;
    m.scale.set(s, s * (0.55 + rnd() * 0.4), s * (0.7 + rnd() * 0.4));
    m.rotation.y = rnd() * TAU;
    m.userData.base = new THREE.Vector3((rnd() - 0.5) * 3200, 230 + rnd() * 140, (rnd() - 0.5) * 3200);
    scene.add(m); clouds.push(m);
  }
}
function updClouds() {
  const wx = time * 4, wz = time * 1.5;
  for (const m of clouds) {
    const b = m.userData.base;
    let x = ((b.x + wx - camera.position.x) % 3200 + 4800) % 3200 - 1600;
    let z = ((b.z + wz - camera.position.z) % 3200 + 4800) % 3200 - 1600;
    m.position.set(camera.position.x + x, b.y + Math.max(0, camera.position.y - 20) * 0.5, camera.position.z + z);
  }
}
