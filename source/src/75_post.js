// ======================= POST-TRAITEMENT : tone mapping, bloom, étalonnage, vignette, AO et reflets (selon le niveau) =======================
const POST = { ok: false, sig: '', rtMain: null, rtVM: null, rtAO: null, rtAO2: null, rtRefl: null, bloom: [], frame: 0 };
const REFL = { tex: { value: null }, m: { value: new THREE.Matrix4() }, k: { value: 0 }, gain: 1 };
// sol brillant : en « Haut », ajoute le vrai reflet du magasin (rendu depuis une caméra miroir) ; sinon ce bloc est inactif et seuls les reflets d'environnement restent
const REFL_MATS = [];
function reflPatch(m) {
  REFL_MATS.push(m);
  m.onBeforeCompile = (sh) => {
    sh.uniforms.tRefl = REFL.tex; sh.uniforms.uReflM = REFL.m; sh.uniforms.uReflK = REFL.k;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nuniform mat4 uReflM; varying vec4 vRefl;').replace('#include <project_vertex>', '#include <project_vertex>\nvRefl = uReflM * modelMatrix * vec4(transformed, 1.0);');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', '#include <common>\nuniform sampler2D tRefl; uniform float uReflK; varying vec4 vRefl;').replace('#include <opaque_fragment>', `if (uReflK > 0.0) { vec2 ruv = vRefl.xy / vRefl.w; vec2 ro = vec2(0.0035, 0.006);
      vec3 rc = (texture2D(tRefl, ruv).rgb * 2.0 + texture2D(tRefl, ruv + ro).rgb + texture2D(tRefl, ruv - ro).rgb + texture2D(tRefl, ruv + vec2(ro.x, -ro.y)).rgb + texture2D(tRefl, ruv - vec2(ro.x, -ro.y)).rgb) / 6.0;
      float rf = pow(1.0 - saturate(dot(normalize(vViewPosition), normal)), 3.0);
      rc = min(rc, vec3(0.97)); rc /= 1.0 - max(rc.r, max(rc.g, rc.b)); // décompression des hautes lumières
      outgoingLight += min(rc, vec3(6.0)) * uReflK * mix(0.16, 0.85, rf) * (1.0 - roughnessFactor); }
    #include <opaque_fragment>`);
  };
  m.customProgramCacheKey = () => 'refl'; return m;
}
function initPost() {
  const gl = renderer.getContext();
  POST.ok = typeof WebGL2RenderingContext !== 'undefined' && gl instanceof WebGL2RenderingContext && !!(gl.getExtension('EXT_color_buffer_float') || gl.getExtension('EXT_color_buffer_half_float'));
  if (POST.ok) { // auto-test : si la carte graphique refuse un tampon HDR anticrénelé, on reste en rendu direct (comme le niveau Bas)
    try { const t = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType, samples: 4 }); renderer.setRenderTarget(t); renderer.clear(); POST.ok = gl.checkFramebufferStatus(gl.FRAMEBUFFER) === gl.FRAMEBUFFER_COMPLETE; renderer.setRenderTarget(null); t.dispose(); } catch (e) { POST.ok = false; }
  }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-1, -1, 0, 3, -1, 0, -1, 3, 0]), 3)); geo.setAttribute('uv', new THREE.BufferAttribute(new Float32Array([0, 0, 2, 0, 0, 2]), 2));
  POST.quad = new THREE.Mesh(geo, null); POST.quad.frustumCulled = false; POST.scene = new THREE.Scene(); POST.scene.add(POST.quad); POST.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); POST.rcam = new THREE.PerspectiveCamera();
  const VS = 'varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }';
  const sm = (fs, uniforms, extra) => new THREE.ShaderMaterial({ vertexShader: VS, fragmentShader: fs, uniforms, depthTest: false, depthWrite: false, toneMapped: false, ...(extra || {}) });
  const U = (v) => ({ value: v });
  // bloom : on isole ce qui dépasse le blanc (néons, écrans, soleil), on réduit par paliers puis on recompose en remontant
  POST.mPre = sm(`uniform sampler2D tSrc; uniform vec2 uTexel; uniform float uThr; varying vec2 vUv;
    vec3 hd(vec3 c){ c = min(c, vec3(0.985)); return c / (1.0 - max(c.r, max(c.g, c.b))); }
    void main(){ vec3 c = (hd(texture2D(tSrc, vUv + uTexel * vec2(-0.5, -0.5)).rgb) + hd(texture2D(tSrc, vUv + uTexel * vec2(0.5, -0.5)).rgb) + hd(texture2D(tSrc, vUv + uTexel * vec2(-0.5, 0.5)).rgb) + hd(texture2D(tSrc, vUv + uTexel * vec2(0.5, 0.5)).rgb)) * 0.25;
      c = min(max(c, vec3(0.0)), vec3(10.0)); float br = max(c.r, max(c.g, c.b)); float soft = clamp(br - uThr + 0.35, 0.0, 0.7); soft = soft * soft / 1.4; float k = max(br - uThr, soft) / max(br, 1e-4); gl_FragColor = vec4(c * max(k, 0.0), 1.0); }`, { tSrc: U(null), uTexel: U(new THREE.Vector2()), uThr: U(1.15) });
  POST.mDown = sm(`uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
    void main(){ gl_FragColor = vec4((texture2D(tSrc, vUv + uTexel * vec2(-1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, -1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(-1.0, 1.0)).rgb + texture2D(tSrc, vUv + uTexel * vec2(1.0, 1.0)).rgb) * 0.25, 1.0); }`, { tSrc: U(null), uTexel: U(new THREE.Vector2()) });
  POST.mUp = sm(`uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
    void main(){ vec2 d = uTexel; vec3 c = texture2D(tSrc, vUv).rgb * 4.0;
      c += (texture2D(tSrc, vUv + vec2(d.x, 0.0)).rgb + texture2D(tSrc, vUv - vec2(d.x, 0.0)).rgb + texture2D(tSrc, vUv + vec2(0.0, d.y)).rgb + texture2D(tSrc, vUv - vec2(0.0, d.y)).rgb) * 2.0;
      c += texture2D(tSrc, vUv + d).rgb + texture2D(tSrc, vUv - d).rgb + texture2D(tSrc, vUv + vec2(d.x, -d.y)).rgb + texture2D(tSrc, vUv - vec2(d.x, -d.y)).rgb;
      gl_FragColor = vec4(c / 16.0, 1.0); }`, { tSrc: U(null), uTexel: U(new THREE.Vector2()) }, { blending: THREE.AdditiveBlending });
  // occlusion ambiante en espace écran (niveau Haut) : on reconstruit positions et normales depuis la profondeur
  POST.mAO = sm(`uniform sampler2D tDepth; uniform vec2 uRes; uniform vec2 uProj; uniform float uNear; uniform float uFar; varying vec2 vUv;
    float vz(vec2 uv){ float d = texture2D(tDepth, uv).x; return (uNear * uFar) / ((uFar - uNear) * d - uFar); }
    vec3 vp(vec2 uv){ float z = vz(uv); return vec3((uv * 2.0 - 1.0) * uProj * (-z), z); }
    float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
    void main(){ float d0 = texture2D(tDepth, vUv).x; if (d0 >= 0.99995) { gl_FragColor = vec4(1.0); return; }
      vec3 p = vp(vUv); vec2 px = 1.0 / uRes;
      vec3 pr = vp(vUv + vec2(px.x, 0.0)), pl = vp(vUv - vec2(px.x, 0.0)), pu = vp(vUv + vec2(0.0, px.y)), pd = vp(vUv - vec2(0.0, px.y));
      vec3 dx = abs(pr.z - p.z) < abs(p.z - pl.z) ? pr - p : p - pl; vec3 dy = abs(pu.z - p.z) < abs(p.z - pd.z) ? pu - p : p - pd;
      vec3 n = normalize(cross(dx, dy)); float rad = 0.55; vec2 ruv = rad / (2.0 * (-p.z) * uProj); float a0 = 6.2831853 * ign(gl_FragCoord.xy); float occ = 0.0;
      for (int i = 0; i < 10; i++) { float t = (float(i) + 0.5) / 10.0; float a = a0 + float(i) * 2.3999632; vec2 o = vec2(cos(a), sin(a)) * sqrt(t) * ruv;
        vec3 v = vp(vUv + o) - p; float l = length(v); occ += max(dot(n, v) / (l + 1e-4) - 0.14, 0.0) * smoothstep(rad * 1.7, rad * 0.4, l); }
      float ao = 1.0 - clamp(occ / 10.0 * 2.1, 0.0, 1.0); ao = mix(ao, 1.0, smoothstep(30.0, 55.0, -p.z)); gl_FragColor = vec4(vec3(ao), 1.0); }`, { tDepth: U(null), uRes: U(new THREE.Vector2()), uProj: U(new THREE.Vector2()), uNear: U(0.08), uFar: U(260) });
  POST.mAOB = sm(`uniform sampler2D tSrc; uniform vec2 uTexel; varying vec2 vUv;
    void main(){ float s = 0.0; for (int i = -2; i < 2; i++) for (int j = -2; j < 2; j++) s += texture2D(tSrc, vUv + (vec2(float(i), float(j)) + 0.5) * uTexel).r; gl_FragColor = vec4(vec3(s / 16.0), 1.0); }`, { tSrc: U(null), uTexel: U(new THREE.Vector2()) });
  // passe finale : AO, objet tenu en main, bloom, tone mapping « neutre » (garde les couleurs franches), étalonnage chaud, vignette, tramage anti-bandes
  POST.mFinal = sm(`uniform sampler2D tScene; uniform sampler2D tBloom; uniform sampler2D tAO; uniform sampler2D tVM; uniform float uBloom; uniform float uAO; uniform float uVM; uniform float uExp; uniform float uVig; varying vec2 vUv;
    vec3 neutral(vec3 c){ float x = min(c.r, min(c.g, c.b)); float off = x < 0.08 ? x - 6.25 * x * x : 0.04; c -= off; float peak = max(c.r, max(c.g, c.b)); if (peak < 0.76) return c;
      float d = 0.24; float np = 1.0 - d * d / (peak + d - 0.76); c *= np / peak; float g = 1.0 - 1.0 / (0.15 * (peak - np) + 1.0); return mix(c, vec3(np), g); }
    float ign(vec2 p){ return fract(52.9829189 * fract(dot(p, vec2(0.06711056, 0.00583715)))); }
    vec3 hd(vec3 c){ c = min(c, vec3(0.985)); return c / (1.0 - max(c.r, max(c.g, c.b))); }
    void main(){ vec3 c = hd(texture2D(tScene, vUv).rgb);
      if (uAO > 0.0) c *= mix(1.0, texture2D(tAO, vUv).r, uAO);
      if (uVM > 0.0) { vec4 v = texture2D(tVM, vUv); c = c * (1.0 - v.a) + hd(v.rgb / max(v.a, 1e-4)) * v.a; }
      if (uBloom > 0.0) c += texture2D(tBloom, vUv).rgb * uBloom;
      c = neutral(max(c, vec3(0.0)) * uExp);
      float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
      c = mix(vec3(l), c, 1.07);                                   // un peu plus de saturation
      c *= vec3(1.035, 1.0, 0.95);                                 // balance chaude
      c += vec3(0.014, 0.004, 0.02) * (1.0 - l) * (1.0 - l);       // ombres légèrement prune
      c = clamp(c, 0.0, 1.0); c = mix(c, c * c * (3.0 - 2.0 * c), 0.2); // contraste doux
      vec2 q = (vUv - 0.5) * vec2(1.1, 1.0); c *= 1.0 - uVig * smoothstep(0.42, 0.95, length(q)); // vignette discrète
      c = mix(c * 12.92, 1.055 * pow(c, vec3(1.0 / 2.4)) - 0.055, step(vec3(0.0031308), c));
      c += (ign(gl_FragCoord.xy) - 0.5) / 255.0; gl_FragColor = vec4(c, 1.0); }`, { tScene: U(null), tBloom: U(null), tAO: U(null), tVM: U(null), uBloom: U(0), uAO: U(0), uVM: U(0), uExp: U(0.96), uVig: U(0.26) });
}
function postDispose() { for (const t of [POST.rtMain, POST.rtVM, POST.rtAO, POST.rtAO2, POST.rtRefl, ...POST.bloom]) if (t) { if (t.depthTexture) t.depthTexture.dispose(); t.dispose(); } POST.rtMain = POST.rtVM = POST.rtAO = POST.rtAO2 = POST.rtRefl = null; POST.bloom = []; }
function postResize() {
  if (!POST.ok || !POST.quad) return; const q = GFX.q, sz = renderer.getDrawingBufferSize(new THREE.Vector2()), w = Math.max(8, sz.x | 0), h = Math.max(8, sz.y | 0);
  const sig = [w, h, q.post, q.msaa, q.ao, q.refl, q.bloom].join(); if (sig === POST.sig) return; POST.sig = sig; postDispose(); REFL.tex.value = null; REFL.k.value = 0;
  if (!q.post) return; const HF = THREE.HalfFloatType;
  POST.rtMain = new THREE.WebGLRenderTarget(w, h, { type: HF, samples: q.msaa, depthBuffer: true });
  if (q.ao) { POST.rtMain.depthTexture = new THREE.DepthTexture(w, h); POST.rtAO = new THREE.WebGLRenderTarget(w >> 1, h >> 1, { depthBuffer: false }); POST.rtAO2 = new THREE.WebGLRenderTarget(w >> 1, h >> 1, { depthBuffer: false }); }
  let bw = w >> 1, bh = h >> 1; for (let i = 0; i < q.bloom && bw > 8 && bh > 8; i++) { POST.bloom.push(new THREE.WebGLRenderTarget(bw, bh, { type: HF, depthBuffer: false })); bw >>= 1; bh >>= 1; }
  if (q.refl) { POST.rtRefl = new THREE.WebGLRenderTarget(w >> 1, h >> 1, { type: HF, depthBuffer: true }); REFL.tex.value = POST.rtRefl.texture; }
}
function postPass(m, target) { POST.quad.material = m; renderer.setRenderTarget(target); renderer.render(POST.scene, POST.cam); }
const _rv = new THREE.Vector3(), _rb = new THREE.Matrix4().set(0.5, 0, 0, 0.5, 0, 0.5, 0, 0.5, 0, 0, 0.5, 0.5, 0, 0, 0, 1);
// reflet plan du sol (y = 0) : caméra symétrique sous le sol ; les sols eux-mêmes sont invisibles vus d'en dessous
function renderReflection() {
  const cp = camera.position;
  if (!POST.rtRefl || POST.frame < 4 || !insideStore(cp.x, cp.z) || cp.y > 3.9 || cp.y < 0.1) { REFL.k.value = 0; return; }
  const rc = POST.rcam; camera.getWorldDirection(_rv);
  rc.position.set(cp.x, -cp.y, cp.z); rc.up.set(0, -1, 0); rc.lookAt(cp.x + _rv.x, -(cp.y + _rv.y), cp.z + _rv.z); rc.updateMatrixWorld(); rc.projectionMatrix.copy(camera.projectionMatrix); rc.projectionMatrixInverse.copy(camera.projectionMatrixInverse);
  REFL.m.value.copy(_rb).multiply(rc.projectionMatrix).multiply(rc.matrixWorldInverse);
  REFL.k.value = 0; REFL.tex.value = null; // pas de reflet dans le reflet (et on ne lit pas la texture dans laquelle on dessine)
  const au = renderer.shadowMap.autoUpdate; renderer.shadowMap.autoUpdate = false; const sn = LIGHTS.sun.shadow.needsUpdate; LIGHTS.sun.shadow.needsUpdate = false;
  renderer.setRenderTarget(POST.rtRefl); renderer.render(scene, rc);
  renderer.shadowMap.autoUpdate = au; LIGHTS.sun.shadow.needsUpdate = sn; REFL.tex.value = POST.rtRefl.texture; REFL.k.value = REFL.gain;
}
function renderFrame() {
  const q = GFX.q; POST.frame++;
  if (!q.post || !POST.ok || !POST.rtMain) { // niveau Bas (ou vieux matériel) : rendu direct, tone mapping intégré
    renderer.setRenderTarget(null); renderer.clear(); renderer.render(scene, camera); if (C.vmOn) { renderer.clearDepth(); renderer.render(VM.scene, VM.cam); } return;
  }
  const F = POST.mFinal.uniforms;
  if (q.refl) renderReflection();
  renderer.setRenderTarget(POST.rtMain); renderer.render(scene, camera);
  if (C.vmOn) { // l'objet tenu en vue subjective est rendu à part puis recollé dans la passe finale
    if (!POST.rtVM) POST.rtVM = new THREE.WebGLRenderTarget(POST.rtMain.width, POST.rtMain.height, { type: THREE.HalfFloatType, samples: q.msaa, depthBuffer: true });
    renderer.setRenderTarget(POST.rtVM); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(VM.scene, VM.cam); F.tVM.value = POST.rtVM.texture; F.uVM.value = 1;
  } else F.uVM.value = 0;
  if (q.ao && POST.rtAO) {
    const u = POST.mAO.uniforms, th = Math.tan((camera.fov * Math.PI) / 360); u.tDepth.value = POST.rtMain.depthTexture; u.uRes.value.set(POST.rtAO.width, POST.rtAO.height); u.uProj.value.set(th * camera.aspect, th); u.uNear.value = camera.near; u.uFar.value = camera.far;
    postPass(POST.mAO, POST.rtAO); POST.mAOB.uniforms.tSrc.value = POST.rtAO.texture; POST.mAOB.uniforms.uTexel.value.set(1 / POST.rtAO.width, 1 / POST.rtAO.height); postPass(POST.mAOB, POST.rtAO2);
    F.tAO.value = POST.rtAO2.texture; F.uAO.value = 0.85;
  } else F.uAO.value = 0;
  const B = POST.bloom;
  if (B.length) {
    POST.mPre.uniforms.tSrc.value = POST.rtMain.texture; POST.mPre.uniforms.uTexel.value.set(1 / POST.rtMain.width, 1 / POST.rtMain.height); postPass(POST.mPre, B[0]);
    for (let i = 1; i < B.length; i++) { POST.mDown.uniforms.tSrc.value = B[i - 1].texture; POST.mDown.uniforms.uTexel.value.set(1 / B[i - 1].width, 1 / B[i - 1].height); postPass(POST.mDown, B[i]); }
    for (let i = B.length - 2; i >= 0; i--) { POST.mUp.uniforms.tSrc.value = B[i + 1].texture; POST.mUp.uniforms.uTexel.value.set(1 / B[i + 1].width, 1 / B[i + 1].height); postPass(POST.mUp, B[i]); }
    F.tBloom.value = B[0].texture; F.uBloom.value = 0.6 / B.length;
  } else F.uBloom.value = 0;
  F.tScene.value = POST.rtMain.texture; postPass(POST.mFinal, null);
  if (POST.dbg) { const t = POST.dbg === 'ao' ? POST.rtAO2 : POST.dbg === 'refl' ? POST.rtRefl : POST.bloom[0]; if (t) { POST.mDown.uniforms.tSrc.value = t.texture; POST.mDown.uniforms.uTexel.value.set(0, 0); postPass(POST.mDown, null); } } // débogage : affiche un tampon intermédiaire
}
