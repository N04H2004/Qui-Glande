// ======================= EFFETS : particules, tampons, secousses =======================
// Tout est purement visuel et calculé par chaque joueur à partir des événements déjà diffusés par l'hôte : rien n'est synchronisé en plus.
const FX = { N: 720, head: 0, shk: 0, objs: [], acc: {}, ready: false };
function initFX() {
  const N = FX.N;
  FX.p = new Float32Array(N * 3); FX.v = new Float32Array(N * 3); FX.life = new Float32Array(N); FX.max = new Float32Array(N); FX.s0 = new Float32Array(N); FX.s1 = new Float32Array(N);
  FX.col = new Float32Array(N * 4); FX.kind = new Float32Array(N); FX.add = new Float32Array(N); FX.grav = new Float32Array(N); FX.drag = new Float32Array(N); FX.rot = new Float32Array(N); FX.vrot = new Float32Array(N);
  const base = new THREE.PlaneGeometry(1, 1), g = new THREE.InstancedBufferGeometry(); g.index = base.index; g.setAttribute('position', base.attributes.position); g.setAttribute('uv', base.attributes.uv);
  FX.aPos = new THREE.InstancedBufferAttribute(new Float32Array(N * 3), 3); FX.aPar = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4); FX.aCol = new THREE.InstancedBufferAttribute(new Float32Array(N * 4), 4);
  for (const a of [FX.aPos, FX.aPar, FX.aCol]) a.setUsage(THREE.DynamicDrawUsage);
  g.setAttribute('iPos', FX.aPos); g.setAttribute('iPar', FX.aPar); g.setAttribute('iCol', FX.aCol); g.instanceCount = 0;
  // une seule passe pour tout : sortie prémultipliée, alpha à 0 pour les particules additives (étincelles, flammes)
  const m = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.CustomBlending, blendSrc: THREE.OneFactor, blendDst: THREE.OneMinusSrcAlphaFactor,
    vertexShader: `attribute vec3 iPos; attribute vec4 iPar; attribute vec4 iCol; varying vec2 vUv; varying vec4 vCol; varying vec2 vK;
      void main(){ vec4 mv = viewMatrix * vec4(iPos, 1.0); float c = cos(iPar.y), s = sin(iPar.y); vec2 q = position.xy * iPar.x; mv.xy += vec2(q.x * c - q.y * s, q.x * s + q.y * c); gl_Position = projectionMatrix * mv; vUv = uv; vCol = iCol; vK = iPar.zw; }`,
    fragmentShader: `varying vec2 vUv; varying vec4 vCol; varying vec2 vK;
      void main(){ vec2 p = vUv * 2.0 - 1.0; float d = length(p), a; vec3 col = vCol.rgb;
        if (vK.x < 0.5) a = smoothstep(1.0, 0.25, d);                                                         // 0 : halo doux (brume, lueur)
        else if (vK.x < 1.5) a = step(abs(p.x), 0.9) * step(abs(p.y), 0.55);                                 // 1 : confetti / feuille
        else if (vK.x < 2.5) a = smoothstep(0.05, 0.0, abs(p.x) * abs(p.y)) * smoothstep(1.0, 0.7, d);        // 2 : étoile
        else if (vK.x < 3.5) a = smoothstep(0.16, 0.0, abs(d - 0.8));                                         // 3 : anneau
        else if (vK.x < 4.5) { a = smoothstep(1.0, 0.86, d); col *= 0.82 + 0.18 * smoothstep(0.9, -0.4, p.y - p.x * 0.4); } // 4 : bouffée cartoon
        else { float bars = step(abs(abs(p.y) - 0.62), 0.2) * step(abs(p.x), 0.72); float diag = step(abs(p.x - p.y * 1.05), 0.24) * step(abs(p.y), 0.62); a = max(bars, diag); } // 5 : « Z »
        a *= vCol.a; if (a < 0.004) discard; gl_FragColor = vec4(col * a, a * (1.0 - vK.y));
        #include <tonemapping_fragment>
        #include <colorspace_fragment>
      }`,
  });
  FX.mesh = new THREE.Mesh(g, m); FX.mesh.frustumCulled = false; FX.mesh.renderOrder = 6; FX.mesh.userData.dyn = true; scene.add(FX.mesh); FX.ready = true;
}
const _fc = new THREE.Color();
// o : { x,y,z, vx,vy,vz, life, s0, s1, col (hex sRGB), mul (intensité > 1 = lumineux), a, kind, add, grav, drag, rot, vrot }
function fxEmit(o) {
  if (!FX.ready) return; const i = FX.head; FX.head = (FX.head + 1) % FX.N; const i3 = i * 3, i4 = i * 4;
  FX.p[i3] = o.x; FX.p[i3 + 1] = o.y; FX.p[i3 + 2] = o.z; FX.v[i3] = o.vx || 0; FX.v[i3 + 1] = o.vy || 0; FX.v[i3 + 2] = o.vz || 0;
  FX.life[i] = FX.max[i] = o.life || 1; FX.s0[i] = o.s0 ?? 0.2; FX.s1[i] = o.s1 ?? FX.s0[i];
  _fc.set(o.col || '#ffffff'); const k = o.mul || 1; FX.col[i4] = _fc.r * k; FX.col[i4 + 1] = _fc.g * k; FX.col[i4 + 2] = _fc.b * k; FX.col[i4 + 3] = o.a ?? 1;
  FX.kind[i] = o.kind || 0; FX.add[i] = o.add ? 1 : 0; FX.grav[i] = o.grav || 0; FX.drag[i] = o.drag || 0; FX.rot[i] = o.rot || 0; FX.vrot[i] = o.vrot || 0;
}
function fxUpdate(dt) {
  if (!FX.ready) return; fxCine(dt); dt *= CINE.ts; let n = 0; const P = FX.aPos.array, A = FX.aPar.array, C = FX.aCol.array;
  for (let i = 0; i < FX.N; i++) {
    if (FX.life[i] <= 0) continue; FX.life[i] -= dt; if (FX.life[i] <= 0) continue;
    const i3 = i * 3, i4 = i * 4, t = 1 - FX.life[i] / FX.max[i], d = Math.max(0, 1 - FX.drag[i] * dt);
    FX.v[i3] *= d; FX.v[i3 + 2] *= d; FX.v[i3 + 1] = FX.v[i3 + 1] * d - FX.grav[i] * dt;
    FX.p[i3] += FX.v[i3] * dt; FX.p[i3 + 1] += FX.v[i3 + 1] * dt; FX.p[i3 + 2] += FX.v[i3 + 2] * dt;
    if (FX.grav[i] > 1 && FX.p[i3 + 1] < 0.04) { FX.p[i3 + 1] = 0.04; FX.v[i3 + 1] *= -0.35; FX.v[i3] *= 0.55; FX.v[i3 + 2] *= 0.55; FX.vrot[i] *= 0.4; }
    FX.rot[i] += FX.vrot[i] * dt;
    const e = 1 - (1 - t) * (1 - t), fade = t < 0.08 ? t / 0.08 : t > 0.6 ? (1 - t) / 0.4 : 1;
    P[n * 3] = FX.p[i3]; P[n * 3 + 1] = FX.p[i3 + 1]; P[n * 3 + 2] = FX.p[i3 + 2];
    A[n * 4] = FX.s0[i] + (FX.s1[i] - FX.s0[i]) * e; A[n * 4 + 1] = FX.rot[i]; A[n * 4 + 2] = FX.kind[i]; A[n * 4 + 3] = FX.add[i];
    C[n * 4] = FX.col[i4]; C[n * 4 + 1] = FX.col[i4 + 1]; C[n * 4 + 2] = FX.col[i4 + 2]; C[n * 4 + 3] = FX.col[i4 + 3] * fade; n++;
  }
  FX.mesh.geometry.instanceCount = n; FX.aPos.needsUpdate = true; FX.aPar.needsUpdate = true; FX.aCol.needsUpdate = true;
  for (let k = FX.objs.length - 1; k >= 0; k--) { const o = FX.objs[k]; o.t += dt; if (o.t >= o.life || o.upd(o, Math.min(1, o.t / o.life), dt) === false) { if (o.end) o.end(o); FX.objs.splice(k, 1); } }
  FX.shk = Math.max(0, FX.shk - dt * 2.4);
}
const fxN = (n) => Math.max(1, Math.round(n * GFX.q.parts));
const fxEvery = (key, period, dt) => { const a = (FX.acc[key] || 0) + dt; if (a >= period) { FX.acc[key] = a % period; return true; } FX.acc[key] = a; return false; };
const fxNear = (x, z, r = 34) => Math.hypot(camera.position.x - x, camera.position.z - z) < r;
function fxShake(a, x, z) { const d = Math.hypot(camera.position.x - x, camera.position.z - z); FX.shk = Math.max(FX.shk, a * clamp(1 - d / 16, 0, 1)); }
function fxApplyShake() { if (FX.shk <= 0.001 || C.mode !== 'game') return; const s = FX.shk * FX.shk * 0.09; camera.position.x += (Math.random() - 0.5) * s; camera.position.y += (Math.random() - 0.5) * s; camera.position.z += (Math.random() - 0.5) * s; camera.rotation.z += (Math.random() - 0.5) * s * 0.25; }
// ---- petits effets réutilisables ----
function fxDust(x, y, z, n = 6, sc = 1, col = '#efe4d6') { for (let k = fxN(n); k > 0; k--) { const a = rnd(0, 6.28), sp = rnd(0.5, 1.7) * sc; fxEmit({ x: x + Math.cos(a) * 0.1, y, z: z + Math.sin(a) * 0.1, vx: Math.cos(a) * sp, vy: rnd(0.2, 0.9) * sc, vz: Math.sin(a) * sp, life: rnd(0.45, 0.9), s0: 0.12 * sc, s1: rnd(0.35, 0.55) * sc, col, a: 0.85, kind: 4, drag: 2.6, grav: -0.25 }); } }
function fxSmoke(x, y, z, dark, sc = 1) { fxEmit({ x: x + rnd(-0.12, 0.12), y, z: z + rnd(-0.1, 0.1), vx: rnd(-0.15, 0.15), vy: rnd(0.55, 1.0), vz: rnd(-0.05, 0.3), life: rnd(1.5, 2.3), s0: 0.16 * sc, s1: rnd(0.6, 0.85) * sc, col: dark ? '#4a4450' : '#a39ea8', a: dark ? 0.8 : 0.6, kind: 4, drag: 0.5, grav: -0.12 }); }
function fxSparks(x, y, z, n = 12, col = '#ffc34d') { for (let k = fxN(n); k > 0; k--) { const a = rnd(0, 6.28), sp = rnd(1.5, 5.5); fxEmit({ x, y, z, vx: Math.cos(a) * sp, vy: rnd(1, 5), vz: Math.sin(a) * sp, life: rnd(0.35, 0.85), s0: rnd(0.06, 0.1), s1: 0.02, col, mul: 3.2, kind: 0, add: 1, grav: 9, drag: 0.6 }); } }
function fxFlash(x, y, z, size = 1.6, col = '#ffd9a0') { fxEmit({ x, y, z, life: 0.22, s0: size, s1: size * 1.7, col, mul: 3.5, kind: 0, add: 1, a: 0.9 }); }
function fxConfetti(x, y, z, n = 24, cols = ['#ff5a5f', '#ffd23f', '#1fb5a3', '#ff8a3d', '#9b6bff', '#56c271'], sz = 0.11) { for (let k = fxN(n); k > 0; k--) { const a = rnd(0, 6.28), sp = rnd(0.6, 2.6); fxEmit({ x, y, z, vx: Math.cos(a) * sp, vy: rnd(2.2, 5.2), vz: Math.sin(a) * sp, life: rnd(1.5, 2.6), s0: sz * rnd(0.8, 1.3), col: pick(cols), kind: 1, grav: 4.2, drag: 1.4, rot: rnd(0, 6), vrot: rnd(-10, 10) }); } }
function fxStars(x, y, z, n = 6) { for (let k = fxN(n); k > 0; k--) { const a = rnd(0, 6.28), sp = rnd(1.4, 2.8); fxEmit({ x, y, z, vx: Math.cos(a) * sp, vy: rnd(1, 2.6), vz: Math.sin(a) * sp, life: rnd(0.5, 0.8), s0: 0.3, s1: 0.1, col: '#ffd23f', mul: 1.5, kind: 2, drag: 2.2, grav: 2, vrot: rnd(-6, 6) }); } }
function fxSparkle(x, y, z, n = 8) { for (let k = fxN(n); k > 0; k--) fxEmit({ x: x + rnd(-0.5, 0.5), y: y + rnd(-0.3, 0.4), z: z + rnd(-0.5, 0.5), vy: rnd(0.3, 0.9), life: rnd(0.5, 0.95), s0: rnd(0.16, 0.3), s1: 0.02, col: pick(['#fff3c4', '#ffffff', '#bff5e0']), mul: 2.4, kind: 2, add: 1, vrot: rnd(-3, 3) }); }
function fxSplash(x, y, z, col = '#ffffff', n = 12) { for (let k = fxN(n); k > 0; k--) { const a = rnd(0, 6.28), sp = rnd(0.8, 2.6); fxEmit({ x, y, z, vx: Math.cos(a) * sp, vy: rnd(1.6, 3.6), vz: Math.sin(a) * sp, life: rnd(0.5, 0.9), s0: rnd(0.06, 0.11), s1: 0.04, col, kind: 4, grav: 9.5 }); } }
function fxRing(x, y, z, size = 1.2, col = '#ffffff', life = 0.6) { fxEmit({ x, y, z, life, s0: 0.25, s1: size, col, mul: 1.8, kind: 3, add: 1, a: 0.8 }); }
function fxMist(x, y, z, vx = 0, vz = 0.4, col = '#e6f6ff') { fxEmit({ x, y, z, vx: vx + rnd(-0.1, 0.1), vy: rnd(-0.05, 0.08), vz: vz + rnd(-0.1, 0.1), life: rnd(1.6, 2.5), s0: 0.45, s1: rnd(1.1, 1.6), col, a: 0.3, kind: 0, drag: 0.3 }); }
function fxFlame(x, y, z, sc = 1) { fxEmit({ x: x + rnd(-0.3, 0.3) * sc, y, z: z + rnd(-0.05, 0.05), vy: rnd(0.9, 1.7), life: rnd(0.3, 0.55), s0: rnd(0.2, 0.32) * sc, s1: 0.04, col: pick(['#ff7a1a', '#ffb02e', '#ff4d1a']), mul: 2.6, kind: 0, add: 1 }); }
function fxZ(x, y, z) { fxEmit({ x, y, z, vx: rnd(0.08, 0.2), vy: 0.42, vz: rnd(-0.05, 0.05), life: 1.9, s0: 0.1, s1: 0.3, col: '#a9c4ff', mul: 1.3, kind: 5, drag: 0.2, rot: -0.2, vrot: 0.25 }); }
// tampon géant façon coup de tampon de DRH : s'écrase au-dessus de la tête, reste, puis s'efface
function fxStamp(x, y, z, text, col) {
  const w = 512, h = 192, tex = canvasTex(w, h, (c) => { c.translate(w / 2, h / 2); c.rotate(-0.09); c.lineJoin = 'round'; c.fillStyle = 'rgba(255,250,240,.94)'; rr(c, -220, -66, 440, 132, 26); c.fill(); c.strokeStyle = col; c.lineWidth = 14; rr(c, -220, -66, 440, 132, 26); c.stroke(); c.lineWidth = 4; rr(c, -200, -48, 400, 96, 14); c.stroke(); c.fillStyle = col; let fs = 84; const f = () => (c.font = `700 ${fs}px Fredoka, 'Arial Rounded MT Bold', Arial, sans-serif`); f(); while (c.measureText(text).width > 370 && fs > 20) { fs -= 4; f(); } c.textAlign = 'center'; c.textBaseline = 'middle'; c.fillText(text, 0, 5); });
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthTest: false, depthWrite: false })); sp.position.set(x, y, z); sp.renderOrder = 30; sp.layers.set(1); scene.add(sp);
  FX.objs.push({ t: 0, life: 3.6, slam: false, upd(o, u) { const t = o.t, k = t < 0.16 ? 1 + (1 - t / 0.16) * 2.2 : 1 + Math.sin(Math.min(1, (t - 0.16) / 0.25) * Math.PI) * 0.12; sp.scale.set(2.5 * k, 0.94 * k, 1); sp.material.opacity = t < 0.16 ? t / 0.16 : u > 0.82 ? (1 - u) / 0.18 : 1; if (!o.slam && t >= 0.16) { o.slam = true; fxShake(0.75, x, z); fxRing(x, y - 0.2, z, 3.2, col, 0.45); } }, end() { scene.remove(sp); tex.dispose(); sp.material.dispose(); } });
}
// ======================= MISE EN SCÈNE DU LICENCIEMENT =======================
// Ralenti, zoom, bandes de cinéma, tampon « VIRÉ » plein écran. Tout part de l'événement de licenciement déjà diffusé par l'hôte :
// chaque joueur le reçoit au même moment et rejoue la même séquence. Le ralenti ne touche que l'image (particules, animations) : la partie continue de tourner normalement.
const CINE = { t: 9, dur: 0, ts: 1, zoom: 0, aim: 0, x: 0, z: 0, st: true, el: null };
const _cq = new THREE.Quaternion(), _cm = new THREE.Matrix4(), _cv = new THREE.Vector3();
function cineDom() {
  if (CINE.el) return CINE.el;
  const st = document.createElement('style'); st.textContent = `
#cine{position:fixed;inset:0;z-index:8;pointer-events:none;overflow:hidden}
#cine .cb{position:absolute;left:0;right:0;height:10vh;background:#0b0d16;transition:transform .25s cubic-bezier(.2,.8,.2,1)}
#cine .cb.t{top:0;transform:translateY(-101%)}#cine .cb.b{bottom:0;transform:translateY(101%)}
#cine.on .cb{transform:none}
#cine .fl{position:absolute;inset:0;background:radial-gradient(ellipse at center,rgba(226,61,75,0) 40%,rgba(226,61,75,.5) 100%);opacity:0}
#cine .fl.in{animation:cineFl .9s ease-out}
#cineStamp{position:fixed;left:50%;top:31%;z-index:44;pointer-events:none;opacity:0;transform:translate(-50%,-50%) rotate(-8deg);color:#e23d4b;background:rgba(255,250,240,.93);border:.085em solid currentColor;border-radius:.2em;padding:.1em .42em .12em;font:700 clamp(56px,13vw,180px)/1 Fredoka,'Arial Rounded MT Bold',Arial,sans-serif;text-align:center;white-space:nowrap;outline:.035em solid rgba(255,250,240,.93);outline-offset:-.15em;box-shadow:0 .08em .3em rgba(20,10,30,.35)}
#cineStamp small{display:block;font-size:.2em;letter-spacing:.03em;margin-top:.25em;color:#2a2135;font-weight:600}
#cineStamp.in{animation:cineStamp 2.5s linear forwards}
@keyframes cineStamp{0%{opacity:0;transform:translate(-50%,-50%) rotate(-8deg) scale(3.6)}5%{opacity:1;transform:translate(-50%,-50%) rotate(-8deg) scale(.9)}8%{transform:translate(-50%,-50%) rotate(-8deg) scale(1.06)}12%{transform:translate(-50%,-50%) rotate(-8deg) scale(1)}82%{opacity:1;transform:translate(-50%,-50%) rotate(-8deg) scale(1)}100%{opacity:0;transform:translate(-50%,-50%) rotate(-8deg) scale(1.08)}}
@keyframes cineFl{0%{opacity:1}100%{opacity:0}}`; document.head.append(st);
  const el = document.createElement('div'); el.id = 'cine'; el.innerHTML = '<div class="cb t"></div><div class="cb b"></div><div class="fl"></div>'; document.body.append(el);
  const sp = document.createElement('div'); sp.id = 'cineStamp'; document.body.append(sp); CINE.stamp = sp; return (CINE.el = el);
}
function cineStart(x, z, name) {
  const el = cineDom(), c = CINE; c.t = 0; c.dur = 2.4; c.st = false; c.x = x; c.z = z; c.name = name || '';
  el.classList.add('on'); c.stamp.classList.remove('in');
  // zoom franc et caméra qui se tourne vers le licencié seulement s'il est réellement en vue (proche, pas derrière un mur, et pas soi-même)
  const d = Math.hypot(camera.position.x - x, camera.position.z - z);
  c.aim = d > 1.2 && d < 26 && camClip(camera.position.x, camera.position.y, camera.position.z, x, 1.3, z) > 0.94 ? 1 : 0;
}
function fxCine(dt) {
  const c = CINE; if (c.t >= c.dur) { c.ts = 1; c.zoom = 0; return; }
  c.t += dt; const t = c.t, sm = (u) => { u = clamp(u, 0, 1); return u * u * (3 - 2 * u); };
  c.ts = t < 0.35 ? 1 : t < 0.45 ? lerp(1, 0.28, (t - 0.35) / 0.1) : t < 1.35 ? 0.28 : lerp(0.28, 1, sm((t - 1.35) / 0.4)); // le ralenti s'installe au coup de tampon
  c.zoom = sm(t / 0.32) * (1 - sm((t - 1.95) / 0.45));
  if (!c.st && t >= 0.35) { c.st = true; c.stamp.innerHTML = 'VIRÉ !' + (c.name ? '<small>' + esc(c.name) + '</small>' : ''); void c.stamp.offsetWidth; c.stamp.classList.add('in'); const fl = c.el.querySelector('.fl'); fl.classList.remove('in'); void fl.offsetWidth; fl.classList.add('in'); FX.shk = Math.max(FX.shk, 0.7); }
  if (t >= c.dur) c.el.classList.remove('on');
}
// appelé après le placement normal de la caméra : resserre le champ et tourne le regard vers le licencié
function fxCam() {
  const c = CINE; if (c.zoom <= 0.001 || (C.mode !== 'game')) return;
  if (c.aim) { _cm.lookAt(camera.position, _cv.set(c.x, 1.25, c.z), camera.up); _cq.setFromRotationMatrix(_cm); camera.quaternion.slerp(_cq, c.zoom * 0.8); }
  camera.fov *= 1 - c.zoom * (c.aim ? 0.45 : 0.1); camera.updateProjectionMatrix();
}
// carton d'affaires : lâché au coup de tampon, il tombe au ralenti en semant ses feuilles, s'écrase, et la tasse part en roulant
function fxBoxProp() {
  const g = new THREE.Group(); mbox(0.5, 0.38, 0.42, '#d9a066', 0, 0, 0, { parent: g }); mbox(0.5, 0.02, 0.07, '#a87a45', 0, 0.195, 0, { parent: g, ol: false });
  mbox(0.3, 0.05, 0.22, '#ffffff', -0.05, 0.2, 0.03, { parent: g, ol: false, cast: false }); const pl = mcyl(0.035, 0.16, '#56c271', 0.16, 0.25, -0.1, { parent: g, geo: CYL6, ol: false }); pl.rotation.z = 0.2;
  return g;
}
function fxFired(x, z, ry, sk, role, name) {
  const ch = makeChar(sk, null); ch.root.position.set(x, 0, z); ch.root.rotation.y = ry; setCharCarry(ch, 1); ch.blob.visible = true;
  cineStart(x, z, name); fxDust(x, 0.1, z, 8);
  const fx = Math.sin(ry), fz = Math.cos(ry), box = fxBoxProp(), mug = new THREE.Group(); mcyl(0.055, 0.11, '#ff5a5f', 0, 0, 0, { parent: mug, geo: CYL6 }); mbox(0.035, 0.07, 0.03, '#ff5a5f', 0.07, 0, 0, { parent: mug, ol: false }); box.visible = mug.visible = false; scene.add(box, mug);
  const B = { on: false, land: false, x: x + fx * 0.5, y: 0.84, z: z + fz * 0.5, vy: 1.6, rot: 0, sh: 0, lt: 0 }, mA = ry + 0.9, stampAt = 1.3;
  let stamped = false;
  FX.objs.push({ t: 0, life: 4.9, upd(o, u, dt) {
    const t = o.t; // temps « ralenti »
    if (!B.on && t >= 0.35) { B.on = true; setCharCarry(ch, 0); ch.prevCarry = 0; box.visible = true; fxConfetti(B.x, B.y + 0.2, B.z, 8, ['#ffffff', '#fff6e6'], 0.16); }
    animChar(ch, t < stampAt ? 7 : 6, dt, 0); // panique bras en l'air, puis abattement
    if (B.on && !B.land) {
      B.vy -= 9.8 * dt; B.y += B.vy * dt; B.x += fx * 0.55 * dt; B.z += fz * 0.55 * dt; B.rot += dt * 4.2;
      B.sh += dt; if (B.sh > 0.05) { B.sh = 0; fxEmit({ x: B.x + rnd(-0.2, 0.2), y: B.y + 0.15, z: B.z + rnd(-0.2, 0.2), vx: rnd(-0.7, 0.7), vy: rnd(0.6, 1.8), vz: rnd(-0.7, 0.7), life: rnd(1.2, 2), s0: 0.17, col: pick(['#ffffff', '#fff6e6', '#ffe9b0']), kind: 1, grav: 2.2, drag: 1.8, rot: rnd(0, 6), vrot: rnd(-7, 7) }); }
      if (B.y <= 0.21 && B.vy < 0) { B.land = true; B.y = 0.21; fxDust(B.x, 0.08, B.z, 12, 1.3); fxConfetti(B.x, 0.35, B.z, 22, ['#ffffff', '#fff6e6', '#ffe9b0'], 0.17); fxRing(B.x, 0.06, B.z, 1.8, '#fff3c4', 0.4); fxShake(0.6, B.x, B.z); mug.visible = true; if (fxNear(B.x, B.z, 30)) SFX.play('boxdrop'); }
      box.position.set(B.x, B.y, B.z); box.rotation.set(B.rot * 0.9, ry, B.rot * 0.35);
    } else if (B.land) { // le carton s'affaisse sur le flanc, la tasse roule
      B.lt += dt; const s = Math.min(1, B.lt / 0.35), e = 1 - (1 - s) * (1 - s); box.position.y = 0.21 + Math.sin(s * Math.PI) * 0.12; const tr = Math.round((B.rot * 0.9) / (Math.PI / 2)) * (Math.PI / 2); box.rotation.set(lerp(B.rot * 0.9, tr, e), ry, lerp(B.rot * 0.35, 0.12, e));
      const m = Math.min(1, B.lt / 1.5), d = 1.5 * (1 - (1 - m) * (1 - m)); mug.position.set(B.x + Math.sin(mA) * (0.2 + d), 0.055, B.z + Math.cos(mA) * (0.2 + d)); mug.rotation.set(0, mA, Math.PI / 2); mug.rotateY(-d / 0.055);
    }
    if (!stamped && t >= stampAt) { stamped = true; fxStamp(x, 2.95, z, role === 'gla' ? 'GLANDEUR !' : role === 'mgr' ? 'QUOTA RATÉ' : 'EMPLOYÉ…', role === 'gla' ? '#12a06c' : role === 'mgr' ? '#d99a00' : '#e23d4b'); }
    if (u > 0.84) { const f = (1 - u) / 0.16; if (!ch.mat.transparent) { ch.mat.transparent = true; ch.mat.needsUpdate = true; for (const m of ch.ols) m.visible = false; ch.blob.visible = false; } ch.mat.opacity = f; ch.root.scale.set(1 + (1 - f) * 0.15, f * 0.6 + 0.4, 1 + (1 - f) * 0.15); box.scale.setScalar(f); mug.scale.setScalar(f); if (fxEvery('fired', 0.07, dt)) fxDust(x, rnd(0.3, 1.4), z, 1, 0.9); }
  }, end() { fxDust(x, 0.9, z, 10, 1.3); disposeChar(ch); scene.remove(box, mug); } });
}
// ---- micro-ondes : explosion, puis gerbes d'étincelles projetées vers l'avant, qui retombent et rebondissent au sol ----
const MW = [5.72, 1.21, -13.2];
function fxZap(n = 14, pow = 1) {
  for (let k = fxN(n); k > 0; k--) { const a = rnd(-1.15, 1.15), sp = rnd(1.8, 6.2) * pow; fxEmit({ x: MW[0] + rnd(-0.18, 0.18), y: MW[1] + rnd(-0.12, 0.12), z: MW[2], vx: Math.sin(a) * sp, vy: rnd(0.4, 4.4) * pow, vz: Math.cos(a) * sp, life: rnd(0.6, 1.35), s0: rnd(0.05, 0.095), s1: 0.015, col: pick(['#ffc34d', '#fff3c4', '#ff8a3d']), mul: 3.4, kind: 0, add: 1, grav: 9.5, drag: 0.5 }); }
  for (let k = 0; k < 3; k++) fxEmit({ x: MW[0] + rnd(-0.2, 0.2), y: MW[1] + rnd(-0.14, 0.14), z: MW[2] + 0.06, life: rnd(0.1, 0.2), s0: rnd(0.35, 0.6), s1: 0.9, col: '#cfe6ff', mul: 3.2, kind: 2, add: 1, rot: rnd(0, 6), vrot: rnd(-20, 20) });
  fxFlash(MW[0], MW[1], MW[2] + 0.1, 1.3 * pow, '#cfe6ff'); WORLD.microZap = WORLD.clock + 0.18;
}
function fxMicroBoom() {
  const [x, y, z] = MW; fxFlash(x, y, z + 0.1, 3.4, '#ffb347'); fxFlash(x, y, z + 0.2, 1.7, '#ffffff'); fxRing(x, y, z + 0.15, 3.6, '#ffd9a0', 0.5); fxZap(38, 1.35); fxShake(1.4, x, z);
  for (let k = fxN(12); k > 0; k--) { const a = rnd(-1.2, 1.2), sp = rnd(1.2, 4); fxEmit({ x, y, z: z + 0.05, vx: Math.sin(a) * sp, vy: rnd(1, 4), vz: Math.cos(a) * sp, life: rnd(1, 1.7), s0: rnd(0.07, 0.13), s1: 0.06, col: pick(['#d6a066', '#b5542a', '#f2c14e', '#7a4a2a']), kind: 4, grav: 9.5, drag: 0.3 }); } // morceaux du plat
  for (let k = fxN(14); k > 0; k--) { const a = rnd(-1.3, 1.3), sp = rnd(0.4, 2.2); fxEmit({ x: x + rnd(-0.2, 0.2), y: y + rnd(-0.1, 0.2), z: z + 0.1, vx: Math.sin(a) * sp, vy: rnd(0.3, 1.5), vz: Math.cos(a) * sp, life: rnd(1.6, 2.6), s0: 0.3, s1: rnd(0.9, 1.4), col: '#3a3440', a: 0.85, kind: 4, drag: 1.4, grav: -0.2 }); } // boule de fumée noire
}
// ---- réactions aux événements de la partie (appelé depuis handleEvent, sans rien changer à la logique) ----
function fxEvent(e, G) {
  const type = e[1], a = e[2], b = e[3]; const where = (id) => AV.get(id) || (id === NET.me ? { x: ME.x, z: ME.z, ry: ME.ry } : null);
  if (type === 'fi' || type === 'mf') { const A = where(a); if (A) fxFired(A.x, A.z, A.ry, pSkin(G, a), type === 'mf' ? 'mgr' : b, a === NET.me ? '' : pName(G, a)); }
  if (type === 'mf' || type === 'nm') { const A = where(type === 'mf' ? b : a); if (A) { fxConfetti(A.x, 2.2, A.z, 34, ['#ffc83d', '#fff3c4', '#ff8a3d', '#ffffff']); fxSparkle(A.x, 1.8, A.z, 10); } }
  else if (type === 'bk') { const A = AV.get(a); if (A) { fxStars(A.x, 1.75, A.z, 6); fxDust(A.x, 1.4, A.z, 3, 0.6); A.ch.hitT = 0.45; } }
  else if (type === 'boom') fxMicroBoom();
  else if (type === 'burn') { for (let k = 0; k < fxN(10); k++) fxFlame(15.5, 1.0 + rnd(0, 0.4), -4.7, 1.3); for (let k = 0; k < fxN(5); k++) fxSmoke(15.5, 2.1, -5, true, 1.2); }
  else if (type === 'pain') { fxRing(15.5, 1.2, -4.6, 1.6, '#ffd9a0'); for (let k = 0; k < fxN(5); k++) fxSmoke(15.5 + rnd(-0.4, 0.4), 1.9, -4.8, false, 0.7); }
  else if (type === 'an') { fxRing(5.4, 1.55, 10.5, 1.4, '#ffd23f', 0.5); fxRing(5.4, 1.55, 10.5, 2.6, '#ffd23f', 0.8); fxRing(5.4, 1.55, 10.5, 4, '#ffd23f', 1.1); }
  else if (type === 'cold') { for (let k = 0; k < fxN(10); k++) fxMist(rnd(-3.4, -1.6), rnd(0.2, 1.6), -5.7, 0, 0.7); }
  else if (type === 'pok') fxSparkle(15.5, 1.5, -4.4, 8);
}
// ---- effets continus liés à l'état du magasin (fumées, brume froide, téléphone) ----
function fxWorld(G, dt) {
  const ms = G.ms || [], q = GFX.q.parts;
  for (const m of ms) {
    const t = m[1];
    if (t === 'smoke') { // fumée épaisse en continu ; les gerbes d'étincelles sont calées sur l'horloge de la partie (la même pour tous)
      if (G.t !== FX.zapT) { FX.zapT = G.t; if (G.t % 3 === 0 && fxNear(5.8, -13.2)) { fxZap(14); const d = Math.hypot(camera.position.x - 5.8, camera.position.z + 13.2); if (d < 20) SFX.play('zap', 1 - d / 20); } }
      if (fxNear(5.8, -13.2) && fxEvery('sm' + m[0], 0.1 / q, dt)) { fxSmoke(5.8 + rnd(-0.15, 0.15), 1.4, -13.2, true, 1.25); if (Math.random() < 0.3) fxSparks(5.75, 1.2, -13.2, 2, '#ff9a3d'); }
    }
    if (t === 'burn' && fxNear(15.5, -4.9) && fxEvery('bu' + m[0], 0.13 / q, dt)) { fxSmoke(15.5, 2.1, -5.0, true, 1.15); fxFlame(15.5, 0.95, -4.7); }
    else if (t === 'melt' && fxNear(m[2], m[3]) && fxEvery('me' + m[0], 0.4 / q, dt)) fxMist(m[2] + rnd(-0.5, 0.5), 0.25, m[3] + rnd(-0.5, 0.5), 0, 0.05, '#cfeeff');
  }
  const ov = G.ov?.[0] ?? 0; if (ov === 2 && fxNear(15.5, -4.9) && fxEvery('ov2', 0.3 / q, dt)) fxSmoke(15.5 + rnd(-0.3, 0.3), 1.95, -4.75, false, 0.6);
  if ((G.tel || 0) > 0 && fxNear(2.9, 10.6) && fxEvery('tel', 0.7, dt)) fxRing(2.9, 1.3, 10.6, 0.9, '#ff8a8a', 0.5);
  if (G.ph === 'play' && opDisp(G, OPEN_COLD) && fxNear(-2.5, -6) && fxEvery('cold', 0.22 / q, dt)) fxMist(rnd(-3.3, -1.7), rnd(0.15, 1.3), -5.9, 0, 0.55);
}
