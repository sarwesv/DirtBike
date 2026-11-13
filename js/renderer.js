// Ridgeline Moto · renderer.js
// WebGL renderer, sky, lighting, water, terrain material, colouring and terrain meshes.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Renderer & scene ---------- */
const canvas = $('game');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: !coarse, powerPreference: 'high-performance' });
renderer.setPixelRatio(Math.min(devicePixelRatio, coarse ? 1.5 : 2));
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.12;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const HORIZON = lin('#c9d6db');
scene.fog = new THREE.FogExp2(HORIZON, 0.00125);
scene.background = HORIZON;
const camera = new THREE.PerspectiveCamera(66, 1, 0.15, 3600);
const SUN_DIR = new THREE.Vector3(0.55, 0.6, 0.42).normalize();

const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    top: { value: lin('#3d78b6') }, horizon: { value: HORIZON }, below: { value: lin('#97a39a') },
    sunDir: { value: SUN_DIR }, sunCol: { value: lin('#fff1d8') }, sunDisc: { value: 30 }
  },
  vertexShader: 'varying vec3 vP; void main(){ vP = position; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
  fragmentShader: [
    'uniform vec3 top; uniform vec3 horizon; uniform vec3 below; uniform vec3 sunDir; uniform vec3 sunCol; uniform float sunDisc; varying vec3 vP;',
    'void main(){',
    '  vec3 d = normalize(vP); float h = d.y;',
    '  vec3 c = h > 0.0 ? mix(horizon, top, pow(h, 0.5)) : mix(horizon, below, min(1.0, -h * 4.0));',
    '  float s = max(dot(d, sunDir), 0.0);',
    '  c += sunCol * (smoothstep(0.9993, 0.9996, s) * sunDisc + pow(s, 64.0) * 0.4 + pow(s, 6.0) * 0.14);',
    '  gl_FragColor = vec4(c, 1.0);',
    '  #include <tonemapping_fragment>',
    '  #include <encodings_fragment>',
    '}'
  ].join('\n')
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 32, 16), skyMat);
sky.frustumCulled = false; sky.renderOrder = -1;
scene.add(sky);

// Image-based light from the same sky, so metal and plastic pick up the world around them.
function buildEnv() {
  const envScene = new THREE.Scene();
  const envSky = skyMat.clone(); envSky.toneMapped = false; envSky.uniforms.sunDisc.value = 4;
  envScene.add(new THREE.Mesh(new THREE.SphereGeometry(50, 32, 16), envSky));
  const ground = new THREE.Mesh(new THREE.CircleGeometry(60, 24), new THREE.MeshBasicMaterial({ color: lin('#5f5b40'), toneMapped: false }));
  ground.rotation.x = -Math.PI / 2; ground.position.y = -3; envScene.add(ground);
  const pmrem = new THREE.PMREMGenerator(renderer);
  if (scene.environment) scene.environment.dispose();
  scene.environment = pmrem.fromScene(envScene, 0.03).texture;
  pmrem.dispose();
}
buildEnv();
// Repaint sky, fog and image lighting for the current map.
function applyWorldLook() {
  HORIZON.copy(lin(W.horizon));
  scene.fog.density = W.fog;
  skyMat.uniforms.top.value.copy(lin(W.top));
  skyMat.uniforms.below.value.copy(lin(W.below));
  skyMat.uniforms.sunCol.value.copy(lin(W.sun));
  buildEnv();
}

scene.add(new THREE.HemisphereLight(lin('#d6e6f5'), lin('#5b4c33'), 0.3));
const sun = new THREE.DirectionalLight(lin('#ffe7c6'), 2.1);
sun.castShadow = true;
sun.shadow.mapSize.set(coarse ? 1024 : 2048, coarse ? 1024 : 2048);
Object.assign(sun.shadow.camera, { left: -42, right: 42, top: 42, bottom: -42, near: 1, far: 340 });
sun.shadow.bias = -0.0004;
sun.shadow.normalBias = 0.03;
scene.add(sun, sun.target);

/* ---------- Water ---------- */
const waterMat = new THREE.ShaderMaterial({
  transparent: true, fog: true, depthWrite: false,
  uniforms: THREE.UniformsUtils.merge([THREE.UniformsLib.fog, {
    uTime: { value: 0 }, uDeep: { value: lin('#1d4f68') }, uShallow: { value: lin('#3b8aa0') }, uSky: { value: lin('#c4d7e2') }, uSun: { value: SUN_DIR }
  }]),
  vertexShader: [
    'varying vec3 vW;',
    '#include <fog_pars_vertex>',
    'void main(){',
    '  vec4 w = modelMatrix * vec4(position, 1.0); vW = w.xyz;',
    '  vec4 mvPosition = viewMatrix * w; gl_Position = projectionMatrix * mvPosition;',
    '  #include <fog_vertex>',
    '}'
  ].join('\n'),
  fragmentShader: [
    'uniform float uTime; uniform vec3 uDeep; uniform vec3 uShallow; uniform vec3 uSky; uniform vec3 uSun; varying vec3 vW;',
    '#include <common>',
    '#include <fog_pars_fragment>',
    'void main(){',
    '  vec2 p = vW.xz; float t = uTime;',
    '  vec3 n = vec3(0.0, 1.0, 0.0);',
    '  n.x += sin(p.x * 0.31 + t * 1.2) * 0.035 + sin(p.x * 1.1 + p.y * 0.7 + t * 2.1) * 0.022 + sin(p.y * 2.7 - p.x * 1.9 + t * 3.3) * 0.012;',
    '  n.z += cos(p.y * 0.27 + t * 1.0) * 0.035 + sin(p.y * 1.3 - p.x * 0.6 + t * 1.7) * 0.022 + cos(p.x * 2.3 + p.y * 2.1 + t * 2.9) * 0.012;',
    '  n = normalize(n);',
    '  vec3 v = normalize(cameraPosition - vW);',
    '  float fres = 0.03 + 0.97 * pow(1.0 - max(dot(n, v), 0.0), 5.0);',
    '  vec3 r = reflect(-v, n);',
    '  vec3 refl = mix(uSky, uSky * 0.75 + vec3(0.02, 0.05, 0.12), clamp(r.y * 1.5, 0.0, 1.0));',
    '  vec3 col = mix(uShallow, uDeep, 0.55 + 0.25 * sin(p.x * 0.01 + p.y * 0.013));',
    '  col = mix(col, refl, clamp(fres * 1.4, 0.0, 1.0));',
    '  col += vec3(1.0, 0.94, 0.82) * pow(max(dot(r, uSun), 0.0), 220.0) * 4.0;',
    '  gl_FragColor = vec4(col, mix(0.7, 0.98, fres));',
    '  #include <tonemapping_fragment>',
    '  #include <encodings_fragment>',
    '  #include <fog_fragment>',
    '}'
  ].join('\n')
});
const water = new THREE.Mesh(new THREE.PlaneGeometry(6000, 6000), waterMat);
water.rotation.x = -Math.PI / 2; water.position.y = WATER; water.renderOrder = 1;
scene.add(water);

/* ---------- Terrain material with layered detail ---------- */
function makeDetailTexture() {
  const S = 256, cv = document.createElement('canvas'); cv.width = cv.height = S;
  const x = cv.getContext('2d'), img = x.createImageData(S, S), rnd = mulberry32(99);
  const octs = [8, 16, 32, 64, 128].map(G => { const g = new Float32Array(G * G); for (let i = 0; i < g.length; i++) g[i] = rnd(); return { G, g }; });
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    let v = 0, amp = 0.5, tot = 0;
    for (const { G, g } of octs) {
      const fx = i / S * G, fy = j / S * G, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), x1 = (x0 + 1) % G, y1 = (y0 + 1) % G;
      v += amp * lerp(lerp(g[y0 * G + x0], g[y0 * G + x1], sx), lerp(g[y1 * G + x0], g[y1 * G + x1], sx), sy);
      tot += amp; amp *= 0.62;
    }
    const q = clamp((v / tot - 0.5) * 1.8 + 0.5, 0, 1) * 255, o = (j * S + i) * 4;
    img.data[o] = img.data[o + 1] = img.data[o + 2] = q; img.data[o + 3] = 255;
  }
  x.putImageData(img, 0, 0);
  const t = new THREE.CanvasTexture(cv);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  return t;
}
const detailTex = makeDetailTexture();
const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.96, metalness: 0, map: detailTex, envMapIntensity: 0.7 });
const DETAIL_GLSL = [
  'float dA = texture2D(map, vUv).r;',
  'float dB = texture2D(map, vUv * 0.137 + vec2(0.31, 0.71)).r;',
  'float dC = texture2D(map, vUv * 3.7 + vec2(0.5, 0.2)).r;',
  'diffuseColor.rgb *= 0.5 + (dA * 0.45 + dB * 0.35 + dC * 0.2);'
].join('\n');
const detailOnly = sh => { sh.fragmentShader = sh.fragmentShader.replace('#include <map_fragment>', DETAIL_GLSL); };
terrainMat.onBeforeCompile = sh => {
  sh.vertexShader = 'attribute float trail;\nvarying float vTrail;\n' + sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTrail = trail;');
  sh.fragmentShader = 'varying float vTrail;\n' + sh.fragmentShader.replace('#include <map_fragment>', DETAIL_GLSL + '\n' + [
    'float td = abs(vTrail);',
    'float tm = 1.0 - smoothstep(2.0, 3.1, td + (dC - 0.5) * 1.3);',
    'if (tm > 0.0) {',
    '  vec3 dirt = mix(vec3(0.27, 0.17, 0.095), diffuseColor.rgb * 0.75, 0.25) * (0.75 + dA * 0.4 + dC * 0.2);',
    '  float rut = exp(-pow((td - 0.85) / 0.26, 2.0));',
    '  float crown = exp(-pow(td / 0.3, 2.0));',
    '  dirt *= (1.0 - rut * 0.38) * (1.0 + crown * 0.15);',
    '  diffuseColor.rgb = mix(diffuseColor.rgb, dirt, tm);',
    '}'
  ].join('\n'));
};

/* ---------- Terrain colouring (linear colour space) ---------- */
const L3 = hex => { const c = lin(hex); return [c.r, c.g, c.b]; };
const COL = {
  bed: L3('#6d6a4c'), wet: L3('#9f9168'), sand: L3('#dcc893'), grassA: L3('#5a8a2c'), grassB: L3('#89ad42'), dry: L3('#b6a95e'),
  dirt: L3('#8a613b'), rock: L3('#8c8579'), rockB: L3('#625c55'), snow: L3('#f4f7f9'), dune: L3('#e3b06d'), duneB: L3('#c98c50'), forest: L3('#2c4524')
};
function mix3(a, b, t, o) { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; }
const tmpA = [0, 0, 0], tmpB = [0, 0, 0];
let lastGrass = 0;
function terrainColor(h, ny, x, z, out, far, td = 99) {
  const des = desertness(x, z);
  const nA = (noise(x * 0.012 + 3, z * 0.012 - 2) + 1) / 2, nB = (noise(x * 0.05, z * 0.05) + 1) / 2;
  mix3(COL.grassA, COL.grassB, nA, tmpA);
  mix3(tmpA, COL.dry, smooth(28, 56, h) * 0.8, tmpA);
  mix3(COL.dune, COL.duneB, nA, tmpB);
  mix3(tmpA, tmpB, des, out);
  let grass = 1 - smooth(0.25, 0.6, des);
  const dirtT = smooth(0.95, 0.86, ny); mix3(COL.dirt, COL.duneB, des, tmpA); mix3(out, tmpA, dirtT, out); grass *= 1 - dirtT;
  const rockT = smooth(0.84, 0.72, ny); mix3(COL.rock, COL.rockB, nB, tmpA); mix3(out, tmpA, rockT, out); grass *= 1 - rockT;
  const snowT = smooth(W.snowLine, W.snowLine + 12, h + nB * 6) * smooth(0.55, 0.75, ny); mix3(out, COL.snow, snowT, out); grass *= 1 - snowT;
  if (far && h < W.treeLine) mix3(out, COL.forest, forestness(x, z) * grass * 0.75, out);
  const shoreT = smooth(WATER + 2.0, WATER + 0.6, h); mix3(COL.sand, COL.dune, des, tmpA); mix3(out, tmpA, shoreT, out); grass *= 1 - shoreT;
  mix3(out, COL.wet, smooth(WATER + 0.5, WATER - 0.3, h), out);
  mix3(out, COL.bed, smooth(WATER - 0.3, WATER - 2.5, h), out);
  lastGrass = grass * smooth(TR_HALF + 0.3, TR_HALF + 2.5, Math.abs(td));
  const j = 0.95 + hash01(x, z) * 0.1;
  out[0] *= j; out[1] *= j; out[2] *= j;
  return out;
}

/* Smooth-shaded terrain patch. Same diagonal as terrainH. Near patches get skirts to hide seams. */
function* terrainGeoGen(ox, oz, N, cell, opts) {
  const W = N + 1, B = N + 3, HB = new Float32Array(B * B), TB = new Float32Array(B * B), drop = opts.drop || 0;
  for (let j = 0; j < B; j++) {
    for (let i = 0; i < B; i++) { HB[j * B + i] = rawHeight(ox + (i - 1) * cell, oz + (j - 1) * cell) - drop; TB[j * B + i] = lastTrailD; }
    if (opts.yieldRows && j % opts.yieldRows === 0) yield;
  }
  const pos = new Float32Array(W * W * 3), nor = new Float32Array(W * W * 3), col = new Float32Array(W * W * 3), uv = new Float32Array(W * W * 2), tr = new Float32Array(W * W);
  const grass = opts.grass ? new Float32Array(W * W) : null, c = [0, 0, 0];
  for (let j = 0; j < W; j++) {
    for (let i = 0; i < W; i++) {
      const k = j * W + i, h = HB[(j + 1) * B + i + 1], x = ox + i * cell, z = oz + j * cell;
      const dx = (HB[(j + 1) * B + i + 2] - HB[(j + 1) * B + i]) / (2 * cell), dz = (HB[(j + 2) * B + i + 1] - HB[j * B + i + 1]) / (2 * cell);
      const il = 1 / Math.sqrt(dx * dx + 1 + dz * dz);
      pos[k * 3] = x; pos[k * 3 + 1] = h; pos[k * 3 + 2] = z;
      nor[k * 3] = -dx * il; nor[k * 3 + 1] = il; nor[k * 3 + 2] = -dz * il;
      const td = TB[(j + 1) * B + i + 1];
      tr[k] = td;
      terrainColor(h + drop, il, x, z, c, opts.far, td);
      col[k * 3] = c[0]; col[k * 3 + 1] = c[1]; col[k * 3 + 2] = c[2];
      uv[k * 2] = x / 5; uv[k * 2 + 1] = z / 5;
      if (grass) grass[k] = lastGrass;
    }
    if (opts.yieldRows && j % opts.yieldRows === 0) yield;
  }
  const idx = [];
  for (let j = 0; j < N; j++) for (let i = 0; i < N; i++) {
    if (opts.skip && opts.skip(i, j)) continue;
    const a = j * W + i, b = a + 1, c2 = a + W, d = c2 + 1;
    idx.push(a, d, b, a, c2, d);
  }
  let P = pos, NN = nor, CC = col, UU = uv, TT = tr;
  if (opts.skirt) {
    const edges = [];
    for (let i = 0; i < N; i++) edges.push([i, i + 1], [N * W + i + 1, N * W + i], [(i + 1) * W, i * W], [i * W + N, (i + 1) * W + N]);
    const base = W * W, extra = W * W;
    P = new Float32Array((W * W + extra) * 3); P.set(pos); NN = new Float32Array(P.length); NN.set(nor);
    CC = new Float32Array(P.length); CC.set(col); UU = new Float32Array((W * W + extra) * 2); UU.set(uv);
    TT = new Float32Array(W * W + extra); TT.set(tr); TT.set(tr, base);
    for (let k = 0; k < W * W; k++) {
      P[(base + k) * 3] = pos[k * 3]; P[(base + k) * 3 + 1] = pos[k * 3 + 1] - 8; P[(base + k) * 3 + 2] = pos[k * 3 + 2];
      for (let q = 0; q < 3; q++) { NN[(base + k) * 3 + q] = nor[k * 3 + q]; CC[(base + k) * 3 + q] = col[k * 3 + q] * 0.8; }
      UU[(base + k) * 2] = uv[k * 2]; UU[(base + k) * 2 + 1] = uv[k * 2 + 1];
    }
    for (const [a, b] of edges) idx.push(a, base + a, b, b, base + a, base + b, a, b, base + a, b, base + b, base + a);
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(P, 3));
  g.setAttribute('normal', new THREE.BufferAttribute(NN, 3));
  g.setAttribute('color', new THREE.BufferAttribute(CC, 3));
  g.setAttribute('uv', new THREE.BufferAttribute(UU, 2));
  g.setAttribute('trail', new THREE.BufferAttribute(TT, 1));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return { geo: g, grass, col };
}
const runGen = gen => { let r; do { r = gen.next(); } while (!r.done); return r.value; };
