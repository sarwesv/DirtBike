// Ridgeline Moto · post.js
// Post-processing: bloom, colour grade, vignette and dither. Desktop WebGL2 only; phones render straight to screen.
// Plain scripts loaded in order by index.html; they share one global scope.
'use strict';

/* ---------- Post-processing ---------- */
// three.js r128 tone-maps into render targets and writes linear colour there,
// so the final pass below does the sRGB encode itself.
const POST = !coarse && renderer.capabilities.isWebGL2 && !!renderer.extensions.get('EXT_color_buffer_float');
const post = POST ? (() => {
  const opts = { type: THREE.HalfFloatType, format: THREE.RGBAFormat, depthBuffer: false };
  const sceneRT = THREE.WebGLMultisampleRenderTarget
    ? new THREE.WebGLMultisampleRenderTarget(1, 1, { type: THREE.HalfFloatType, format: THREE.RGBAFormat })
    : new THREE.WebGLRenderTarget(1, 1, { type: THREE.HalfFloatType, format: THREE.RGBAFormat });
  const brightRT = new THREE.WebGLRenderTarget(1, 1, opts);
  const blurA = new THREE.WebGLRenderTarget(1, 1, opts), blurB = new THREE.WebGLRenderTarget(1, 1, opts);
  const quadCam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1);
  const quadScene = new THREE.Scene();
  const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2), null);
  quad.frustumCulled = false; quadScene.add(quad);
  const vert = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const mat = (uniforms, frag) => new THREE.ShaderMaterial({ uniforms, vertexShader: vert, fragmentShader: frag, depthTest: false, depthWrite: false, toneMapped: false });

  const brightMat = mat({ tSrc: { value: null } }, [
    'uniform sampler2D tSrc; varying vec2 vUv;',
    'void main(){',
    '  vec3 c = texture2D(tSrc, vUv).rgb;',
    '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  gl_FragColor = vec4(c * smoothstep(0.88, 1.2, l), 1.0);',
    '}'
  ].join('\n'));
  const blurMat = mat({ tSrc: { value: null }, uDir: { value: new THREE.Vector2() } }, [
    'uniform sampler2D tSrc; uniform vec2 uDir; varying vec2 vUv;',
    'void main(){',
    '  vec3 c = texture2D(tSrc, vUv).rgb * 0.227;',
    '  c += (texture2D(tSrc, vUv + uDir * 1.385).rgb + texture2D(tSrc, vUv - uDir * 1.385).rgb) * 0.316;',
    '  c += (texture2D(tSrc, vUv + uDir * 3.231).rgb + texture2D(tSrc, vUv - uDir * 3.231).rgb) * 0.070;',
    '  gl_FragColor = vec4(c, 1.0);',
    '}'
  ].join('\n'));
  const finalMat = mat({ tScene: { value: null }, tBloom: { value: null }, uTime: { value: 0 }, uAspect: { value: 1 }, uTexel: { value: new THREE.Vector2() } }, [
    'uniform sampler2D tScene; uniform sampler2D tBloom; uniform float uTime; uniform float uAspect; uniform vec2 uTexel; varying vec2 vUv;',
    'vec3 toSRGB(vec3 c){ c = clamp(c, 0.0, 1.0); return mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(0.0031308, c)); }',
    'void main(){',
    // Light unsharp mask to keep texture detail crisp after MSAA resolve.
    '  vec3 c0 = texture2D(tScene, vUv).rgb;',
    '  vec3 nb = texture2D(tScene, vUv + vec2(uTexel.x, 0.0)).rgb + texture2D(tScene, vUv - vec2(uTexel.x, 0.0)).rgb + texture2D(tScene, vUv + vec2(0.0, uTexel.y)).rgb + texture2D(tScene, vUv - vec2(0.0, uTexel.y)).rgb;',
    '  vec3 c = max(c0 + (c0 * 4.0 - nb) * 0.16, 0.0) + texture2D(tBloom, vUv).rgb * 0.22;',
    // Grade: gentle saturation lift, warm highlights, cool shadows.
    '  float l = dot(c, vec3(0.2126, 0.7152, 0.0722));',
    '  c = mix(vec3(l), c, 1.03);',
    '  c *= mix(vec3(0.96, 0.98, 1.04), vec3(1.03, 1.0, 0.96), smoothstep(0.05, 0.6, l));',
    '  vec3 s = toSRGB(c);',
    '  s = s * s * (3.0 - 2.0 * s) * 0.18 + s * 0.82;',
    // Vignette, then dither so the sky gradient does not band.
    '  vec2 v = (vUv - 0.5) * vec2(uAspect, 1.0);',
    '  s *= 1.0 - smoothstep(0.45, 1.25, length(v)) * 0.32;',
    '  float n = fract(sin(dot(gl_FragCoord.xy + uTime, vec2(12.9898, 78.233))) * 43758.5453);',
    '  s += (n - 0.5) / 255.0;',
    '  gl_FragColor = vec4(s, 1.0);',
    '}'
  ].join('\n'));

  const size = new THREE.Vector2();
  const run = (m, target) => { quad.material = m; renderer.setRenderTarget(target); renderer.render(quadScene, quadCam); };
  return {
    resize() {
      renderer.getDrawingBufferSize(size);
      const w = Math.max(1, size.x), h = Math.max(1, size.y);
      sceneRT.setSize(w, h);
      brightRT.setSize(Math.ceil(w / 2), Math.ceil(h / 2));
      blurA.setSize(Math.ceil(w / 4), Math.ceil(h / 4)); blurB.setSize(Math.ceil(w / 4), Math.ceil(h / 4));
      finalMat.uniforms.uAspect.value = w / h;
      finalMat.uniforms.uTexel.value.set(1 / w, 1 / h);
    },
    render() {
      renderer.setRenderTarget(sceneRT);
      renderer.render(scene, camera);
      brightMat.uniforms.tSrc.value = sceneRT.texture; run(brightMat, brightRT);
      const tx = 1 / blurA.width, ty = 1 / blurA.height;
      blurMat.uniforms.tSrc.value = brightRT.texture; blurMat.uniforms.uDir.value.set(tx, 0); run(blurMat, blurA);
      blurMat.uniforms.tSrc.value = blurA.texture; blurMat.uniforms.uDir.value.set(0, ty); run(blurMat, blurB);
      blurMat.uniforms.tSrc.value = blurB.texture; blurMat.uniforms.uDir.value.set(tx * 2, 0); run(blurMat, blurA);
      blurMat.uniforms.tSrc.value = blurA.texture; blurMat.uniforms.uDir.value.set(0, ty * 2); run(blurMat, blurB);
      finalMat.uniforms.tScene.value = sceneRT.texture; finalMat.uniforms.tBloom.value = blurB.texture;
      finalMat.uniforms.uTime.value = (finalMat.uniforms.uTime.value + 1.618) % 97;
      run(finalMat, null);
    }
  };
})() : null;
function renderFrame() {
  if (post) post.render();
  else renderer.render(scene, camera);
}
