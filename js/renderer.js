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
renderer.toneMappingExposure = 0.98;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
const scene = new THREE.Scene();
const HORIZON = lin('#c9d6db');
scene.fog = new THREE.FogExp2(HORIZON, 0.00125);
scene.background = HORIZON;
const camera = new THREE.PerspectiveCamera(66, 1, 0.15, 3600);
const SUN_DIR = new THREE.Vector3(0.55, 0.6, 0.42).normalize();

// Physically based daylight sky (Preetham scattering model, as used by three.js's Sky example).
// Near the horizon it fades into the fog colour so distant terrain melts into the air instead of
// ending at a line. The fade happens after tone mapping, exactly as three's own fog does.
const skyMat = new THREE.ShaderMaterial({
  side: THREE.BackSide, depthWrite: false, fog: false,
  uniforms: {
    sunPosition: { value: SUN_DIR.clone().multiplyScalar(4000) }, up: { value: new THREE.Vector3(0, 1, 0) },
    turbidity: { value: 6 }, rayleigh: { value: 1.6 }, mieCoefficient: { value: 0.004 }, mieDirectionalG: { value: 0.82 },
    skyGain: { value: 0.42 }, fogCol: { value: HORIZON }, sunDisc: { value: 1 }
  },
  vertexShader: [
    'uniform vec3 sunPosition; uniform float rayleigh; uniform float turbidity; uniform float mieCoefficient; uniform vec3 up;',
    'varying vec3 vWorldPosition; varying vec3 vSunDirection; varying float vSunfade; varying vec3 vBetaR; varying vec3 vBetaM; varying float vSunE;',
    'const float e = 2.718281828459045;',
    'const vec3 totalRayleigh = vec3(5.804542996261093E-6, 1.3562911419845635E-5, 3.0265902468824876E-5);',
    'const vec3 MieConst = vec3(1.8399918514433978E14, 2.7798023919660528E14, 4.0790479543861094E14);',
    'const float cutoffAngle = 1.6110731556870734; const float steepness = 1.5; const float EE = 1000.0;',
    'float sunIntensity(float zc){ zc = clamp(zc, -1.0, 1.0); return EE * max(0.0, 1.0 - pow(e, -((cutoffAngle - acos(zc)) / steepness))); }',
    'vec3 totalMie(float T){ float c = (0.2 * T) * 10E-18; return 0.434 * c * MieConst; }',
    'void main(){',
    '  vec4 wp = modelMatrix * vec4(position, 1.0); vWorldPosition = wp.xyz;',
    '  gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); gl_Position.z = gl_Position.w;',
    '  vSunDirection = normalize(sunPosition);',
    '  vSunE = sunIntensity(dot(vSunDirection, up));',
    '  vSunfade = 1.0 - clamp(1.0 - exp(sunPosition.y / 450000.0), 0.0, 1.0);',
    '  vBetaR = totalRayleigh * (rayleigh - (1.0 - vSunfade));',
    '  vBetaM = totalMie(turbidity) * mieCoefficient;',
    '}'
  ].join('\n'),
  fragmentShader: [
    'uniform float mieDirectionalG; uniform vec3 up; uniform float skyGain; uniform vec3 fogCol; uniform float sunDisc;',
    'varying vec3 vWorldPosition; varying vec3 vSunDirection; varying float vSunfade; varying vec3 vBetaR; varying vec3 vBetaM; varying float vSunE;',
    'const float pi = 3.141592653589793;',
    'const float rayleighZenithLength = 8.4E3; const float mieZenithLength = 1.25E3;',
    'const float sunAngularDiameterCos = 0.99995;',
    'const float THREE_OVER_SIXTEENPI = 0.05968310365946075; const float ONE_OVER_FOURPI = 0.07957747154594767;',
    'float rayleighPhase(float c){ return THREE_OVER_SIXTEENPI * (1.0 + c * c); }',
    'float hgPhase(float c, float g){ float g2 = g * g; return ONE_OVER_FOURPI * ((1.0 - g2) / pow(1.0 - 2.0 * g * c + g2, 1.5)); }',
    'void main(){',
    '  vec3 direction = normalize(vWorldPosition - cameraPosition);',
    '  float zenithAngle = acos(max(0.0, dot(up, direction)));',
    '  float inv = 1.0 / (cos(zenithAngle) + 0.15 * pow(93.885 - ((zenithAngle * 180.0) / pi), -1.253));',
    '  float sR = rayleighZenithLength * inv; float sM = mieZenithLength * inv;',
    '  vec3 Fex = exp(-(vBetaR * sR + vBetaM * sM));',
    '  float cosTheta = dot(direction, vSunDirection);',
    '  vec3 betaRTheta = vBetaR * rayleighPhase(cosTheta * 0.5 + 0.5);',
    '  vec3 betaMTheta = vBetaM * hgPhase(cosTheta, mieDirectionalG);',
    '  vec3 Lin = pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * (1.0 - Fex), vec3(1.5));',
    '  Lin *= mix(vec3(1.0), pow(vSunE * ((betaRTheta + betaMTheta) / (vBetaR + vBetaM)) * Fex, vec3(0.5)), clamp(pow(1.0 - dot(up, vSunDirection), 5.0), 0.0, 1.0));',
    '  vec3 L0 = vec3(0.1) * Fex;',
    '  L0 += (vSunE * 19000.0 * Fex) * smoothstep(sunAngularDiameterCos, sunAngularDiameterCos + 0.00002, cosTheta) * sunDisc;',
    '  vec3 texColor = (Lin + L0) * 0.04 + vec3(0.0, 0.0003, 0.00075);',
    '  vec3 c = pow(texColor, vec3(1.0 / (1.2 + 1.2 * vSunfade))) * skyGain;',
    '  gl_FragColor = vec4(c, 1.0);',
    '  #include <tonemapping_fragment>',
    '  #include <encodings_fragment>',
    '  gl_FragColor.rgb = mix(gl_FragColor.rgb, fogCol, 1.0 - smoothstep(-0.02, 0.16, direction.y));',
    '}'
  ].join('\n')
});
const sky = new THREE.Mesh(new THREE.SphereGeometry(3000, 48, 24), skyMat);
sky.frustumCulled = false; sky.renderOrder = -1;
scene.add(sky);

// Image-based light from the same sky, so metal and plastic pick up the world around them.
function buildEnv() {
  const envScene = new THREE.Scene();
  const envSky = skyMat.clone(); envSky.toneMapped = false; envSky.uniforms.sunDisc.value = 0.002;
  envSky.uniforms.fogCol.value = lin(W.horizon);
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
const SKY_AIR = {
  open:   { turbidity: 6, rayleigh: 1.6, mie: 0.004 },
  forest: { turbidity: 9, rayleigh: 1.3, mie: 0.006 },
  desert: { turbidity: 12, rayleigh: 1.1, mie: 0.007 },
  alpine: { turbidity: 2.5, rayleigh: 2.2, mie: 0.003 }
};
function applyWorldLook() {
  // three applies fog after tone mapping and output encoding, so the fog colour must be given in the
  // same space as the final framebuffer: linear when the post pass runs, sRGB when drawing straight to screen.
  HORIZON.copy(typeof post !== 'undefined' && post ? lin(W.horizon) : new THREE.Color(W.horizon));
  scene.fog.density = W.fog;
  const air = SKY_AIR[W.id] || SKY_AIR.open, u = skyMat.uniforms;
  u.turbidity.value = air.turbidity; u.rayleigh.value = air.rayleigh; u.mieCoefficient.value = air.mie;
  sun.color.copy(lin(W.sun));
  buildEnv();
}

scene.add(new THREE.HemisphereLight(lin('#cfe2f7'), lin('#5b4c33'), 0.22));
const sun = new THREE.DirectionalLight(lin('#fff1dc'), 2.2);
sun.castShadow = true;
const SHADOW_R = coarse ? 42 : 60;
sun.shadow.mapSize.set(coarse ? 1024 : 4096, coarse ? 1024 : 4096);
Object.assign(sun.shadow.camera, { left: -SHADOW_R, right: SHADOW_R, top: SHADOW_R, bottom: -SHADOW_R, near: 1, far: 400 });
sun.shadow.bias = -0.0003;
sun.shadow.normalBias = 0.025;
sun.shadow.radius = 2;
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

/* ---------- Terrain material: four-layer procedural ground texture with per-pixel relief ---------- */
// One tileable RGBA texture, generated at load. Each channel is a height field for one surface:
// R grass (fine blades and clumps), G dirt (pebbles in soil), B rock (cracks and strata), A sand (wind ripples).
function makeGroundTexture() {
  const S = coarse ? 256 : 512, rnd = mulberry32(99), data = new Uint8Array(S * S * 4);
  const lattice = G => {
    const g = new Float32Array(G * G); for (let i = 0; i < g.length; i++) g[i] = rnd();
    return (u, v) => {
      const fx = u * G, fy = v * G, x0 = Math.floor(fx), y0 = Math.floor(fy), tx = fx - x0, ty = fy - y0;
      const sx = tx * tx * (3 - 2 * tx), sy = ty * ty * (3 - 2 * ty), a = ((x0 % G) + G) % G, b = ((y0 % G) + G) % G, a1 = (a + 1) % G, b1 = (b + 1) % G;
      return lerp(lerp(g[b * G + a], g[b * G + a1], sx), lerp(g[b1 * G + a], g[b1 * G + a1], sx), sy);
    };
  };
  const L = [4, 8, 16, 32, 64, 128, 256].map(lattice);
  const fb = (u, v, from, to, gain) => { let s = 0, a = 1, n = 0; for (let k = from; k <= to; k++) { s += L[k](u, v) * a; n += a; a *= gain; } return s / n; };
  // Tileable Worley noise for pebbles.
  const WN = 18, wp = []; for (let i = 0; i < WN * WN; i++) wp.push([rnd(), rnd(), rnd()]);
  const worley = (u, v) => {
    const fx = u * WN, fy = v * WN, cx = Math.floor(fx), cy = Math.floor(fy); let d1 = 9, size = 0;
    for (let j = -1; j <= 1; j++) for (let i = -1; i <= 1; i++) {
      const gx = cx + i, gy = cy + j, p = wp[(((gy % WN) + WN) % WN) * WN + (((gx % WN) + WN) % WN)];
      const d = Math.hypot(gx + p[0] - fx, gy + p[1] - fy) / (0.55 + p[2] * 0.5);
      if (d < d1) { d1 = d; size = p[2]; }
    }
    return [d1, size];
  };
  for (let j = 0; j < S; j++) for (let i = 0; i < S; i++) {
    const u = i / S, v = j / S, o = (j * S + i) * 4;
    const clumps = fb(u, v, 2, 4, 0.6), blades = fb(u, v, 4, 6, 0.7);
    const grass = clamp(0.25 + clumps * 0.45 + (blades - 0.5) * 1.1, 0, 1);
    const [d1, sz] = worley(u, v), pebble = (1 - smooth(0.25, 0.75, d1)) * (0.55 + sz * 0.45);
    const dirt = clamp(0.3 + pebble * 0.6 + (fb(u, v, 3, 6, 0.65) - 0.5) * 0.6, 0, 1);
    const r1 = 1 - Math.abs(fb(u, v, 1, 4, 0.55) * 2 - 1), r2 = 1 - Math.abs(fb(u, v, 3, 6, 0.6) * 2 - 1);
    const rock = clamp(Math.pow(r1, 3) * 0.55 + Math.pow(r2, 2) * 0.35 + fb(u, v, 5, 6, 0.6) * 0.2, 0, 1);
    const warp = fb(u, v, 1, 3, 0.5);
    const sand = clamp(0.5 + 0.32 * Math.sin((v * 22 + warp * 3.2) * TAU) + (fb(u, v, 5, 6, 0.8) - 0.5) * 0.5, 0, 1);
    data[o] = grass * 255; data[o + 1] = dirt * 255; data[o + 2] = rock * 255; data[o + 3] = sand * 255;
  }
  const t = new THREE.DataTexture(data, S, S, THREE.RGBAFormat);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  t.magFilter = THREE.LinearFilter; t.minFilter = THREE.LinearMipmapLinearFilter; t.generateMipmaps = true;
  t.anisotropy = renderer.capabilities.getMaxAnisotropy();
  t.needsUpdate = true;
  return t;
}
const groundTex = makeGroundTexture();
const detailTex = groundTex;
const terrainMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.95, metalness: 0, map: groundTex, envMapIntensity: 0.75 });
terrainMat.extensions = { derivatives: true };
// Bump-map style normal perturbation from a height gradient in screen space (as three's bumpmap chunk does).
const PERTURB_GLSL = [
  'vec3 perturbGround(vec3 surf_pos, vec3 surf_norm, vec2 dHdxy) {',
  '  vec3 sx = dFdx(surf_pos), sy = dFdy(surf_pos);',
  '  vec3 R1 = cross(sy, surf_norm), R2 = cross(surf_norm, sx);',
  '  float det = dot(sx, R1);',
  '  vec3 grad = sign(det) * (dHdxy.x * R1 + dHdxy.y * R2);',
  '  return normalize(abs(det) * surf_norm - grad);',
  '}'
].join('\n');
terrainMat.onBeforeCompile = sh => {
  sh.vertexShader = 'attribute float trail;\nattribute vec4 mw;\nvarying float vTrail;\nvarying vec4 vMw;\n' +
    sh.vertexShader.replace('#include <begin_vertex>', '#include <begin_vertex>\nvTrail = trail;\nvMw = mw;');
  sh.fragmentShader = 'varying float vTrail;\nvarying vec4 vMw;\n' + PERTURB_GLSL + '\n' + sh.fragmentShader
    .replace('#include <map_fragment>', [
      'vec2 uvA = vUv * 0.8;',
      'vec4 tA = texture2D(map, uvA);',
      'vec4 tB = texture2D(map, uvA * 0.173 + vec2(0.37, 0.61));',
      'vec4 tC = texture2D(map, uvA * 3.1 + vec2(0.11, 0.53));',
      'float td = abs(vTrail);',
      'float tm = 1.0 - smoothstep(2.0, 3.1, td + (tB.g - 0.5) * 1.6);',
      // Layer weights: grass is whatever is left after dirt, rock, sand and snow.
      'float wD = max(vMw.x, tm), wR = vMw.y, wS = vMw.z, wN = vMw.w;',
      'float wG = clamp(1.0 - wD - wR - wS - wN, 0.0, 1.0);',
      'vec4 lw = vec4(wG, wD, wR, wS + wN * 0.35); lw /= max(dot(lw, vec4(1.0)), 1e-3);',
      // Sharpen the blend using the height fields so pebbles poke through grass and rock breaks through soil.
      'vec4 hl = tA * 0.6 + tB * 0.4;',
      'lw = lw * (0.35 + hl * 1.3); lw = max(lw - max(max(lw.x, lw.y), max(lw.z, lw.w)) * 0.45, 0.0); lw /= max(dot(lw, vec4(1.0)), 1e-3);',
      'float gH = smoothstep(0.15, 0.85, dot(tA, lw)), gB = dot(tB, lw), gC = smoothstep(0.1, 0.9, dot(tC, lw));',
      'diffuseColor.rgb *= (0.42 + gH * 1.05) * (0.82 + gB * 0.36) * (0.85 + gC * 0.3);',
      // Grass: yellow-green tips and darker clumps; dirt: warmer in hollows; rock: cool grey cracks.
      'diffuseColor.rgb *= mix(vec3(1.0), mix(vec3(0.78, 0.9, 0.62), vec3(1.16, 1.12, 0.86), tA.r), lw.x * 0.8);',
      'diffuseColor.rgb *= mix(vec3(1.0), mix(vec3(0.82, 0.78, 0.76), vec3(1.08, 1.04, 1.0), tA.b), lw.z * 0.7);',
      // Trail surface: packed dirt with tyre ruts.
      ''
    ].join('\n'))
    .replace('#include <color_fragment>', [
      '#include <color_fragment>',
      'if (tm > 0.0) {',
      '  vec3 dirt = vec3(0.2, 0.125, 0.07) * (0.55 + smoothstep(0.1, 0.9, tA.g) * 0.75) * (0.85 + tB.g * 0.3);',
      '  float rut = exp(-pow((td - 0.85) / 0.26, 2.0));',
      '  dirt *= (1.0 - rut * 0.4) * (1.0 + exp(-pow(td / 0.3, 2.0)) * 0.18);',
      '  diffuseColor.rgb = mix(diffuseColor.rgb, dirt, tm);',
      '}'
    ].join('\n'))
    .replace('#include <normal_fragment_maps>', [
      '#include <normal_fragment_maps>',
      '{',
      '  float e = 1.0 / 512.0;',
      '  float h0 = dot(tA, lw), hx = dot(texture2D(map, uvA + vec2(e, 0.0)), lw), hy = dot(texture2D(map, uvA + vec2(0.0, e)), lw);',
      '  vec2 gUV = vec2(hx - h0, hy - h0) / e;',
      '  float amp = dot(lw, vec4(0.018, 0.03, 0.07, 0.025)) * (1.0 - smoothstep(40.0, 160.0, length(vViewPosition)));',
      '  vec2 dHdxy = vec2(dot(gUV, dFdx(uvA)), dot(gUV, dFdy(uvA))) * amp / 6.25;',
      '  normal = perturbGround(-vViewPosition, normal, dHdxy);',
      '}'
    ].join('\n'))
    .replace('#include <roughnessmap_fragment>', '#include <roughnessmap_fragment>\nroughnessFactor = clamp(roughnessFactor - lw.z * 0.15 * tA.b - wN * 0.25, 0.4, 1.0);');
};
// Rocks reuse the rock layer of the same texture for colour and relief.
const DETAIL_GLSL = 'vec4 tA = texture2D(map, vUv); diffuseColor.rgb *= 0.55 + tA.b * 0.75 + tA.g * 0.15;';
const detailOnly = sh => {
  sh.fragmentShader = PERTURB_GLSL + '\n' + sh.fragmentShader
    .replace('#include <map_fragment>', DETAIL_GLSL)
    .replace('#include <normal_fragment_maps>', [
      '#include <normal_fragment_maps>',
      '{ float e = 1.0 / 512.0; float h0 = tA.b, hx = texture2D(map, vUv + vec2(e, 0.0)).b, hy = texture2D(map, vUv + vec2(0.0, e)).b;',
      '  vec2 gUV = vec2(hx - h0, hy - h0) / e;',
      '  normal = perturbGround(-vViewPosition, normal, vec2(dot(gUV, dFdx(vUv)), dot(gUV, dFdy(vUv))) * 0.06); }'
    ].join('\n'));
};

/* ---------- Terrain colouring (linear colour space) ---------- */
const L3 = hex => { const c = lin(hex); return [c.r, c.g, c.b]; };
const COL = {
  bed: L3('#6d6a4c'), wet: L3('#9f9168'), sand: L3('#dcc893'), grassA: L3('#46712a'), grassB: L3('#6c9436'), dry: L3('#a39a52'),
  dirt: L3('#8a613b'), rock: L3('#8c8579'), rockB: L3('#625c55'), snow: L3('#f4f7f9'), dune: L3('#e3b06d'), duneB: L3('#c98c50'), forest: L3('#2c4524')
};
function mix3(a, b, t, o) { o[0] = a[0] + (b[0] - a[0]) * t; o[1] = a[1] + (b[1] - a[1]) * t; o[2] = a[2] + (b[2] - a[2]) * t; return o; }
const tmpA = [0, 0, 0], tmpB = [0, 0, 0];
let lastGrass = 0;
const lastMW = [0, 0, 0, 0]; // dirt, rock, sand, snow
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
  lastMW[0] = dirtT * (1 - rockT); lastMW[1] = rockT * (1 - snowT); lastMW[2] = Math.max(des * (1 - rockT), shoreT); lastMW[3] = snowT;
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
  const pos = new Float32Array(W * W * 3), nor = new Float32Array(W * W * 3), col = new Float32Array(W * W * 3), uv = new Float32Array(W * W * 2), tr = new Float32Array(W * W), mw = new Float32Array(W * W * 4);
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
      mw.set(lastMW, k * 4);
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
  let P = pos, NN = nor, CC = col, UU = uv, TT = tr, MM = mw;
  if (opts.skirt) {
    const edges = [];
    for (let i = 0; i < N; i++) edges.push([i, i + 1], [N * W + i + 1, N * W + i], [(i + 1) * W, i * W], [i * W + N, (i + 1) * W + N]);
    const base = W * W, extra = W * W;
    P = new Float32Array((W * W + extra) * 3); P.set(pos); NN = new Float32Array(P.length); NN.set(nor);
    CC = new Float32Array(P.length); CC.set(col); UU = new Float32Array((W * W + extra) * 2); UU.set(uv);
    TT = new Float32Array(W * W + extra); TT.set(tr); TT.set(tr, base);
    MM = new Float32Array((W * W + extra) * 4); MM.set(mw); MM.set(mw, base * 4);
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
  g.setAttribute('mw', new THREE.BufferAttribute(MM, 4));
  g.setIndex(idx);
  g.computeBoundingSphere();
  return { geo: g, grass, col };
}
const runGen = gen => { let r; do { r = gen.next(); } while (!r.done); return r.value; };
