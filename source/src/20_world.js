// ======================= MONDE 3D : le supermarché (low-poly cartoon chaleureux) =======================
let renderer, scene, camera;
const WORLD = { shelves: [], masks: Array(11).fill(-1), pyr: null, pyrFallen: false, messes: new Map(), markerPool: [], clock: 0, ovenState: -1, anim: [], pops: [], dying: [], lc: 0 };
// ---------- matières : tout est en MeshStandardMaterial, les reflets viennent de cartes d'environnement générées en code ----------
const ENV = { in: null, out: null };
const KIND = {
  paint: { roughness: 0.56, metalness: 0 }, matte: { roughness: 0.95, metalness: 0 }, wood: { roughness: 0.7, metalness: 0 }, leaf: { roughness: 0.9, metalness: 0 },
  metal: { roughness: 0.38, metalness: 0.5 }, dmetal: { roughness: 0.45, metalness: 0.3 }, enamel: { roughness: 0.26, metalness: 0.1 }, plastic: { roughness: 0.3, metalness: 0 },
};
const KIND_OF = {};
for (const [k, list] of Object.entries({
  metal: '#9aa3ad #c9d2db #d7dce4 #aeb6c0 #7a8796 #c9ced6 #888 #666 #555 #777 #444 #333 #4a4f58 #6d7480 #a9b2bc #d9dde3 #d9d9d9',
  dmetal: '#3d4454 #2a2a30 #3b4048 #20242c #2b2f3a',
  enamel: '#ffffff #eef7fc #eef4f8 #e9edf1 #f7f7f7 #dfe9f2 #eef3f7 #dff3ff #dfe5ec #bfe8ff #c9d6e0 #eef2f5',
  wood: '#b5834f #8b5a2b #7a5236 #c58b4f #5b3d22 #3b2816 #b98552 #8a5a2f #6b4a2b #b07a45 #c38a52 #7a4a25 #b5733a #f3d3a2 #e8c48f #7a5a3a',
  matte: '#d9a066 #c88a50 #e2b07a #fff1d6 #a87a45 #fff6e6',
  leaf: '#5fbf4a #4fae3f #71cf57 #3e9a35 #3fb24a #7cc96a #6dbb5c #8fd27a',
  plastic: '#4fb6ff #3a86ff #5aa0ff #ff7ac6 #2d7dd2 #56c271',
})) for (const c of list.split(' ')) KIND_OF[c] = k;
let MAT_ZONE = 'in'; // 'out' pendant la construction de l'extérieur : ces matières reflètent le ciel au lieu des néons
const MATC = new Map();
function mat(color, o) {
  const kind = (o && o.kind) || KIND_OF[color] || 'paint', key = color + '|' + kind + '|' + MAT_ZONE; let m = MATC.get(key);
  if (!m) { m = new THREE.MeshStandardMaterial({ color, ...KIND[kind] }); if (MAT_ZONE === 'out') m.envMap = ENV.out; MATC.set(key, m); }
  return m;
}
// matières "lumineuses" (écrans, néons, lampes) : couleur au-dessus de 1 pour que le bloom les attrape
const GLOW = { '#7df3c8': 1.9, '#4fd1ff': 1.8, '#33ffcc': 2.0, '#fffbe0': 3.4, '#ffe9b0': 1.5, '#7fd6ff': 2.6, '#9ff0ff': 2.6, '#fff6b0': 1.7 };
const BASICC = new Map();
const basic = (color, o) => { if (o) return new THREE.MeshBasicMaterial({ color, ...o }); let m = BASICC.get(color); if (!m) { m = new THREE.MeshBasicMaterial({ color }); if (GLOW[color]) m.color.multiplyScalar(GLOW[color]); BASICC.set(color, m); } return m; };
const CLOUD = new THREE.MeshBasicMaterial({ color: '#ffe7d3' });
const NEON = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.85, 3.4) }), NEON_COLD = new THREE.MeshBasicMaterial({ color: new THREE.Color(1.6, 2.6, 3.6) }), BULB = new THREE.MeshBasicMaterial({ color: new THREE.Color(3.4, 2.3, 1.1) });
// verre : presque transparent de face, mais les reflets (néons, ciel) restent visibles
const GLASSC = new Map();
function glassMat(color = '#d4eeff', opacity = 0.16) {
  const key = color + opacity + MAT_ZONE; let m = GLASSC.get(key); if (m) return m;
  m = new THREE.MeshStandardMaterial({ color, transparent: true, opacity, roughness: 0.05, metalness: 0, depthWrite: false, side: THREE.DoubleSide, envMapIntensity: 1.1 });
  if (MAT_ZONE === 'out') m.envMap = ENV.out;
  m.onBeforeCompile = (sh) => { sh.fragmentShader = sh.fragmentShader.replace('#include <opaque_fragment>', 'float glF = pow(1.0 - saturate(abs(dot(normalize(vViewPosition), normal))), 3.0);\ndiffuseColor.a = saturate(diffuseColor.a + glF * 0.22 + dot(totalSpecular, vec3(0.12)));\n#include <opaque_fragment>'); };
  m.customProgramCacheKey = () => 'glass'; GLASSC.set(key, m); return m;
}
const OUTLINE_MAT = new THREE.MeshBasicMaterial({ color: '#2a2135', side: THREE.BackSide });
const flatG = (geo) => { const g = geo.index ? geo.toNonIndexed() : geo; g.computeVertexNormals(); return g; };
// normales lissées sauf sur les arêtes vives (angle > deg) : donne des volumes ronds sans perdre les angles nets
function creaseGeo(geo, deg = 50) {
  const g = geo.index ? geo.toNonIndexed() : geo, P = g.attributes.position, n = P.count, cosT = Math.cos((deg * Math.PI) / 180);
  const fa = new Float32Array(n * 3), fu = new Float32Array(n * 3), keys = new Array(n), map = new Map();
  const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3();
  for (let i = 0; i + 2 < n; i += 3) {
    a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2); b.sub(a); c.sub(a); b.cross(c); const l = b.length() || 1;
    for (let k = 0; k < 3; k++) { const j = (i + k) * 3; fa[j] = b.x; fa[j + 1] = b.y; fa[j + 2] = b.z; fu[j] = b.x / l; fu[j + 1] = b.y / l; fu[j + 2] = b.z / l; }
  }
  for (let i = 0; i < n; i++) { const key = Math.round(P.getX(i) * 2000) + ',' + Math.round(P.getY(i) * 2000) + ',' + Math.round(P.getZ(i) * 2000); keys[i] = key; const l = map.get(key); if (l) l.push(i); else map.set(key, [i]); }
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    let x = 0, y = 0, z = 0; const i3 = i * 3;
    for (const j of map.get(keys[i])) { const j3 = j * 3; if (fu[i3] * fu[j3] + fu[i3 + 1] * fu[j3 + 1] + fu[i3 + 2] * fu[j3 + 2] >= cosT) { x += fa[j3]; y += fa[j3 + 1]; z += fa[j3 + 2]; } }
    const l = Math.hypot(x, y, z) || 1; out[i3] = x / l; out[i3 + 1] = y / l; out[i3 + 2] = z / l;
  }
  g.setAttribute('normal', new THREE.BufferAttribute(out, 3)); return g;
}
// boîte aux arêtes adoucies : 24 sommets, les chanfreins interpolent les normales des faces voisines (rendu "arrondi" pour 44 triangles)
const RBOXC = new Map();
function rboxGeo(w, h, d, r) {
  w = Math.max(1e-3, Math.abs(w)); h = Math.max(1e-3, Math.abs(h)); d = Math.max(1e-3, Math.abs(d)); r = Math.min(r, w * 0.5 - 1e-4, h * 0.5 - 1e-4, d * 0.5 - 1e-4);
  const key = Math.round(w * 500) + '_' + Math.round(h * 500) + '_' + Math.round(d * 500) + '_' + Math.round(r * 1000); let g = RBOXC.get(key); if (g) return g;
  if (r < 0.004) g = new THREE.BoxGeometry(w, h, d);
  else {
    const hs = [w / 2, h / 2, d / 2], pos = [], nor = [], idx = [], id = {};
    for (let a = 0; a < 3; a++) for (const s of [-1, 1]) for (const su of [-1, 1]) for (const sv of [-1, 1]) {
      const u = (a + 1) % 3, v = (a + 2) % 3, p = [0, 0, 0], n = [0, 0, 0], c = [0, 0, 0];
      p[a] = s * hs[a]; p[u] = su * (hs[u] - r); p[v] = sv * (hs[v] - r); n[a] = s; c[a] = s; c[u] = su; c[v] = sv;
      id[a + ':' + c.join(',')] = pos.length / 3; pos.push(p[0], p[1], p[2]); nor.push(n[0], n[1], n[2]);
    }
    const V = (face, a, sa, b, sb, c, sc) => { const k = [0, 0, 0]; k[a] = sa; k[b] = sb; k[c] = sc; return id[face + ':' + k.join(',')]; };
    const tri = (i, j, k) => { // toujours orienté vers l'extérieur (forme convexe centrée)
      const ax = pos[i * 3], ay = pos[i * 3 + 1], az = pos[i * 3 + 2], e1x = pos[j * 3] - ax, e1y = pos[j * 3 + 1] - ay, e1z = pos[j * 3 + 2] - az, e2x = pos[k * 3] - ax, e2y = pos[k * 3 + 1] - ay, e2z = pos[k * 3 + 2] - az;
      const nx = e1y * e2z - e1z * e2y, ny = e1z * e2x - e1x * e2z, nz = e1x * e2y - e1y * e2x, cx = ax + (e1x + e2x) / 3, cy = ay + (e1y + e2y) / 3, cz = az + (e1z + e2z) / 3;
      if (nx * cx + ny * cy + nz * cz < 0) idx.push(i, k, j); else idx.push(i, j, k);
    };
    const quad = (p, q, s, t) => { tri(p, q, s); tri(p, s, t); };
    for (let a = 0; a < 3; a++) { const u = (a + 1) % 3, v = (a + 2) % 3;
      for (const s of [-1, 1]) quad(V(a, a, s, u, -1, v, -1), V(a, a, s, u, 1, v, -1), V(a, a, s, u, 1, v, 1), V(a, a, s, u, -1, v, 1)); // faces
      for (const su of [-1, 1]) for (const sv of [-1, 1]) quad(V(u, a, -1, u, su, v, sv), V(u, a, 1, u, su, v, sv), V(v, a, 1, u, su, v, sv), V(v, a, -1, u, su, v, sv)); // arêtes le long de l'axe a
    }
    for (const sx of [-1, 1]) for (const sy of [-1, 1]) for (const sz of [-1, 1]) tri(V(0, 0, sx, 1, sy, 2, sz), V(1, 0, sx, 1, sy, 2, sz), V(2, 0, sx, 1, sy, 2, sz)); // coins
    g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('normal', new THREE.BufferAttribute(new Float32Array(nor), 3)); g.setIndex(idx); g.computeBoundingSphere();
  }
  RBOXC.set(key, g); return g;
}
const bevelR = (w, h, d, o) => { if (o.r !== undefined) return o.r; const m = Math.min(Math.abs(w), Math.abs(h), Math.abs(d)); return m < 0.03 ? 0 : clamp(m * 0.22, 0.006, 0.05); };
const BOXG = new THREE.BoxGeometry(1, 1, 1);
const CYLG = new THREE.CylinderGeometry(1, 1, 1, 14);
const CYL6 = new THREE.CylinderGeometry(1, 1, 1, 10);
const SPHG = new THREE.IcosahedronGeometry(1, 2);
const ICO0 = flatG(new THREE.IcosahedronGeometry(1, 0));
const CONEG = flatG(new THREE.ConeGeometry(1, 1, 6));
function mk(geo, color, x, y, z, sx, sy, sz, o = {}) {
  const m = new THREE.Mesh(geo, o.mat || mat(color, o.kind ? { kind: o.kind } : undefined)); m.scale.set(sx, sy, sz); m.position.set(x, y, z);
  if (o.ry) m.rotation.y = o.ry; if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.cast !== false; m.receiveShadow = o.recv !== false; if (o.ol === false) m.userData.noOL = true;
  (o.parent || scene).add(m); return m;
}
const mbox = (w, h, d, color, x, y, z, o = {}) => mk(rboxGeo(w, h, d, bevelR(w, h, d, o)), color, x, y, z, 1, 1, 1, o);
const mcyl = (r, h, color, x, y, z, o = {}) => mk(o.geo || CYLG, color, x, y, z, r, h, r, o);
const msph = (r, color, x, y, z, o = {}) => mk(o.geo || SPHG, color, x, y, z, r * (o.sx || 1), r * (o.sy || 1), r * (o.sz || 1), o);
const mcone = (r, h, color, x, y, z, o = {}) => mk(CONEG, color, x, y, z, r, h, r, o);
function rr(x, X, Y, W, H, R) { x.beginPath(); x.moveTo(X + R, Y); x.arcTo(X + W, Y, X + W, Y + H, R); x.arcTo(X + W, Y + H, X, Y + H, R); x.arcTo(X, Y + H, X, Y, R); x.arcTo(X, Y, X + W, Y, R); x.closePath(); }
function canvasTex(w, h, draw, rep) { const c = document.createElement('canvas'); c.width = w; c.height = h; const x = c.getContext('2d'); draw(x, w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; if (rep) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(rep[0], rep[1]); } return t; }
function textTex(text, { w = 512, h = 128, bg = '#1fb5a3', fg = '#fff', size = 70, weight = 700, r = 26, stroke = null, border = '#2a2135' } = {}) {
  return canvasTex(w, h, (x) => {
    if (bg) { x.fillStyle = border || bg; rr(x, 0, 0, w, h, r); x.fill(); x.fillStyle = bg; rr(x, 7, 7, w - 14, h - 14, r - 6); x.fill(); }
    let s = size; const setF = () => (x.font = `${weight} ${s}px Fredoka, 'Arial Rounded MT Bold', Arial, sans-serif`); setF();
    while (x.measureText(text).width > w - 44 && s > 12) { s -= 2; setF(); }
    x.textAlign = 'center'; x.textBaseline = 'middle';
    if (stroke) { x.lineWidth = 12; x.strokeStyle = stroke; x.lineJoin = 'round'; x.strokeText(text, w / 2, h / 2 + 4); }
    x.fillStyle = fg; x.fillText(text, w / 2, h / 2 + 4);
  });
}
function sign(text, w, h, x, y, z, ry = 0, o = {}) {
  const px = Math.min(2048, Math.round((128 * w) / h));
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), new THREE.MeshBasicMaterial({ map: textTex(text, { w: px, h: 128, ...o }), transparent: true, side: o.double ? THREE.DoubleSide : THREE.FrontSide }));
  m.position.set(x, y, z); m.rotation.y = ry; (o.parent || scene).add(m); return m;
}
function labelSprite(text, { bg = 'rgba(30,24,44,.85)', fg = '#fff', size = 40, h = 64, scale = 0.0062 } = {}) {
  const c = document.createElement('canvas'); const x = c.getContext('2d'); const font = `600 ${size}px Fredoka, Arial, sans-serif`; x.font = font;
  const w = Math.max(64, Math.ceil(x.measureText(text).width) + 36); c.width = w; c.height = h; x.font = font;
  if (bg) { x.fillStyle = bg; rr(x, 2, 2, w - 4, h - 4, (h - 4) / 2); x.fill(); }
  x.fillStyle = fg; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(text, w / 2, h / 2 + 2);
  const tex = new THREE.CanvasTexture(c); tex.colorSpace = THREE.SRGBColorSpace;
  const sp = new THREE.Sprite(new THREE.SpriteMaterial({ map: tex, transparent: true, depthWrite: false })); sp.scale.set(w * scale, h * scale, 1); sp.renderOrder = 5; sp.layers.set(1); return sp;
}
// contour "cartoon" : coque inversée, gonflée le long des normales lissées
function outlineGeo(geo, t) {
  const g = geo.index ? geo.toNonIndexed() : geo.clone(); const P = g.attributes.position, n = P.count;
  const acc = new Map(), keys = new Array(n); const a = new THREE.Vector3(), b = new THREE.Vector3(), c = new THREE.Vector3(), fn = new THREE.Vector3();
  for (let i = 0; i < n; i++) keys[i] = Math.round(P.getX(i) * 500) + ',' + Math.round(P.getY(i) * 500) + ',' + Math.round(P.getZ(i) * 500);
  for (let i = 0; i + 2 < n; i += 3) {
    a.fromBufferAttribute(P, i); b.fromBufferAttribute(P, i + 1); c.fromBufferAttribute(P, i + 2); fn.subVectors(b, a).cross(c.clone().sub(a)); if (fn.lengthSq() < 1e-14) continue; fn.normalize();
    for (let k = 0; k < 3; k++) { const key = keys[i + k]; const v = acc.get(key); if (v) v.add(fn); else acc.set(key, fn.clone()); }
  }
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { const v = acc.get(keys[i]); a.fromBufferAttribute(P, i); if (v && v.lengthSq() > 1e-10) { b.copy(v).normalize(); a.addScaledVector(b, t); } out[i * 3] = a.x; out[i * 3 + 1] = a.y; out[i * 3 + 2] = a.z; }
  const og = new THREE.BufferGeometry(); og.setAttribute('position', new THREE.BufferAttribute(out, 3)); og.computeBoundingSphere(); return og;
}
// fusionne les maillages enfants d'un groupe mobile qui partagent la même matière : même image, beaucoup moins d'appels de dessin
function compactGroup(g) {
  const by = new Map(), v = new THREE.Vector3(), nm = new THREE.Matrix3();
  for (const c of [...g.children]) { if (!c.isMesh || c.isInstancedMesh || c.children.length) continue; const m = c.material; if (!m || m.transparent || m.map) continue; const key = m.uuid + '|' + c.castShadow + '|' + c.receiveShadow; if (!by.has(key)) by.set(key, []); by.get(key).push(c); }
  for (const list of by.values()) {
    if (list.length < 2) continue; let n = 0; const geos = list.map((c) => { const q = c.geometry.index ? c.geometry.toNonIndexed() : c.geometry; n += q.attributes.position.count; return q; });
    const pos = new Float32Array(n * 3), nor = new Float32Array(n * 3); let o = 0;
    list.forEach((c, k) => { const q = geos[k], P = q.attributes.position, N = q.attributes.normal; c.updateMatrix(); nm.getNormalMatrix(c.matrix);
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(c.matrix); pos[(o + i) * 3] = v.x; pos[(o + i) * 3 + 1] = v.y; pos[(o + i) * 3 + 2] = v.z; if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(o + i) * 3] = v.x; nor[(o + i) * 3 + 1] = v.y; nor[(o + i) * 3 + 2] = v.z; } }
      o += P.count; g.remove(c); });
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.computeBoundingSphere();
    const m = new THREE.Mesh(geo, list[0].material); m.castShadow = list[0].castShadow; m.receiveShadow = list[0].receiveShadow; g.add(m);
  }
  return g;
}
function bake(group) { group.updateMatrixWorld(true); const kids = []; group.traverse((o) => { if (o.isMesh) kids.push(o); }); for (const k of kids) scene.attach(k); scene.remove(group); }

// ---------- rendu, lumières, ciel ----------
const SUN_DIR = new THREE.Vector3(-0.5, 0.45, 0.74).normalize(); // soleil bas de fin d'après-midi, côté parking
const LIGHTS = {};
function onResize() { applyRes(); camera.aspect = innerWidth / innerHeight; camera.updateProjectionMatrix(); }
function initRenderer() {
  const canvas = $('#c');
  renderer = new THREE.WebGLRenderer({ canvas, antialias: true, powerPreference: 'high-performance' });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GFX.q.dpr));
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.shadowMap.enabled = true; renderer.shadowMap.type = THREE.PCFShadowMap;
  renderer.outputColorSpace = THREE.SRGBColorSpace; renderer.toneMappingExposure = 0.96;
  scene = new THREE.Scene(); scene.background = new THREE.Color('#ffdcb4'); scene.fog = new THREE.Fog('#ffd9b0', 75, 200);
  camera = new THREE.PerspectiveCamera(70, innerWidth / innerHeight, 0.08, 260); camera.layers.enable(1); // calque 1 : étiquettes et marqueurs (exclus des reflets)
  buildEnvMaps(); scene.environment = ENV.in; scene.environmentIntensity = 0.62;
  LIGHTS.hemi = new THREE.HemisphereLight('#ffffff', '#8a7560', 0.16); scene.add(LIGHTS.hemi);
  // soleil : chaud et rasant. Le toit et les murs lui font de l'ombre, il n'entre dans le magasin que par les portes.
  const sun = (LIGHTS.sun = new THREE.DirectionalLight('#ffc084', 5.2)); sun.target.position.set(-2, 0, 4); sun.position.copy(sun.target.position).addScaledVector(SUN_DIR, 75); scene.add(sun, sun.target);
  sun.castShadow = true; sun.shadow.mapSize.set(GFX.q.sunShadow, GFX.q.sunShadow); const sc = sun.shadow.camera; sc.left = -42; sc.right = 42; sc.top = 38; sc.bottom = -38; sc.near = 15; sc.far = 150; sun.shadow.bias = -0.0006; sun.shadow.normalBias = 0.07; sun.shadow.radius = 1.6; sun.shadow.autoUpdate = false; sun.shadow.needsUpdate = true;
  // néons : lumière froide qui tombe du plafond. Sa carte d'ombre démarre juste sous le plafond et ne couvre que l'intérieur ; dehors, elle sert de lumière de ciel.
  const neon = (LIGHTS.neon = new THREE.DirectionalLight('#e6f0ff', 1.5)); neon.position.set(0, 13.86, 0); neon.target.position.set(0, 0, 0); scene.add(neon, neon.target);
  neon.castShadow = GFX.q.neonShadow > 0; neon.shadow.mapSize.set(GFX.q.neonShadow || 1024, GFX.q.neonShadow || 1024); const nc = neon.shadow.camera; nc.left = -20.6; nc.right = 20.6; nc.top = 14.6; nc.bottom = -14.6; nc.near = 10; nc.far = 14.2; neon.shadow.bias = -0.0012; neon.shadow.normalBias = 0.025; neon.shadow.radius = 1.3;
  buildSky();
  addEventListener('resize', onResize);
}
// ciel : dégradé peint sur les sommets d'une sphère (bleu au zénith, pêche à l'horizon, halo vers le soleil)
function skyGeo(R, k = 1) {
  const g = new THREE.SphereGeometry(R, 40, 20), P = g.attributes.position, col = new Float32Array(P.count * 3), d = new THREE.Vector3();
  const mix = (a, b, t) => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t, a[2] + (b[2] - a[2]) * t], ss = (a, b, x) => { const t = clamp((x - a) / (b - a), 0, 1); return t * t * (3 - 2 * t); };
  const Z = [0.2, 0.37, 0.74], M = [0.56, 0.62, 0.8], H = [1.02, 0.74, 0.47], G = [0.3, 0.33, 0.22];
  for (let i = 0; i < P.count; i++) {
    d.fromBufferAttribute(P, i).normalize(); const y = d.y; let c;
    if (y < 0) c = mix(mix(H, G, 0.4), G, ss(0, -0.2, y)); else c = mix(mix(H, M, ss(0, 0.28, y)), Z, ss(0.22, 0.95, y));
    const s = Math.pow(Math.max(0, d.dot(SUN_DIR)), 6) * (y < 0 ? 0.3 : 1); c = [c[0] + 0.55 * s, c[1] + 0.26 * s, c[2] + 0.06 * s];
    col[i * 3] = c[0] * k; col[i * 3 + 1] = c[1] * k; col[i * 3 + 2] = c[2] * k;
  }
  g.setAttribute('color', new THREE.BufferAttribute(col, 3)); return g;
}
function buildSky() {
  const dome = new THREE.Mesh(skyGeo(230), new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide, fog: false, depthWrite: false })); dome.renderOrder = -10; dome.frustumCulled = false; dome.userData.dyn = true; scene.add(dome);
  const sunP = SUN_DIR.clone().multiplyScalar(215);
  const disc = new THREE.Mesh(new THREE.CircleGeometry(8, 28), new THREE.MeshBasicMaterial({ color: new THREE.Color(5.5, 3.9, 2.1), fog: false, depthWrite: false })); disc.position.copy(sunP); disc.lookAt(0, 0, 0); disc.renderOrder = -9; disc.userData.dyn = true; scene.add(disc);
  const halo = new THREE.Mesh(new THREE.PlaneGeometry(130, 130), new THREE.MeshBasicMaterial({ map: canvasTex(128, 128, (x) => { const g = x.createRadialGradient(64, 64, 2, 64, 64, 64); g.addColorStop(0, 'rgba(255,214,150,.75)'); g.addColorStop(0.35, 'rgba(255,170,90,.22)'); g.addColorStop(1, 'rgba(255,150,80,0)'); x.fillStyle = g; x.fillRect(0, 0, 128, 128); }), transparent: true, blending: THREE.AdditiveBlending, fog: false, depthWrite: false }));
  halo.position.copy(SUN_DIR.clone().multiplyScalar(210)); halo.lookAt(0, 0, 0); halo.renderOrder = -8; halo.userData.dyn = true; scene.add(halo);
}
// cartes d'environnement (reflets + lumière ambiante), rendues une fois à partir de deux mini-scènes : l'intérieur sous néons et le ciel du soir
function buildEnvMaps() {
  const pm = new THREE.PMREMGenerator(renderer);
  const s = new THREE.Scene(); s.background = new THREE.Color(0.45, 0.4, 0.33);
  const add = (sc, geo, col, x, y, z, rx = 0, ry = 0) => { const mt = new THREE.MeshBasicMaterial({ color: new THREE.Color(col[0], col[1], col[2]), side: THREE.DoubleSide }); mt.defines = { QG_RAW: '' }; const m = new THREE.Mesh(geo, mt); m.position.set(x, y, z); m.rotation.set(rx, ry, 0); sc.add(m); return m; };
  add(s, new THREE.PlaneGeometry(44, 32), [0.5, 0.48, 0.45], 0, 2.5, 0, Math.PI / 2); // plafond
  add(s, new THREE.PlaneGeometry(44, 32), [0.3, 0.26, 0.2], 0, -1.6, 0, Math.PI / 2); // sol (rebond faible : le dessous des objets reste plus sombre)
  for (const [x, z, ry, w] of [[0, -15, 0, 44], [0, 15, 0, 44], [-21, 0, Math.PI / 2, 32], [21, 0, Math.PI / 2, 32]]) { add(s, new THREE.PlaneGeometry(w, 3.2), [0.56, 0.5, 0.4], x, 1.0, z, 0, ry); add(s, new THREE.PlaneGeometry(w, 1.1), [0.07, 0.28, 0.25], x * 0.99, -1.05, z * 0.99, 0, ry); }
  for (let x = -16; x <= 16; x += 5.3) for (let z = -9; z <= 9; z += 4.5) add(s, new THREE.PlaneGeometry(2.6, 0.5), [8, 9, 10.6], x, 2.42, z, Math.PI / 2);
  ENV.in = pm.fromScene(s, 0.03, 0.1, 100).texture;
  const o = new THREE.Scene(); o.background = new THREE.Color(0.5, 0.5, 0.5);
  const raw = (m) => { m.defines = { QG_RAW: '' }; return m; }; // valeurs brutes (pas de compression des hautes lumières) pour fabriquer les cartes
  o.add(new THREE.Mesh(skyGeo(60, 1.05), raw(new THREE.MeshBasicMaterial({ vertexColors: true, side: THREE.BackSide }))));
  const sb = new THREE.Mesh(new THREE.SphereGeometry(4.5, 12, 8), raw(new THREE.MeshBasicMaterial({ color: new THREE.Color(26, 17, 8) }))); sb.position.copy(SUN_DIR).multiplyScalar(55); o.add(sb);
  ENV.out = pm.fromScene(o, 0.02, 0.1, 100).texture;
  pm.dispose();
}

// ---------- textures (toutes dessinées en canvas, aucun fichier image) ----------
const TEX = {};
const dataTex = (t) => { t.colorSpace = THREE.NoColorSpace; return t; };
function speckle(x, w, h, n, a, s = 3) { for (let i = 0; i < n; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '0,0,0' : '255,255,255'},${Math.random() * a})`; x.fillRect(Math.random() * w, Math.random() * h, s, s); } }
function makeTextures() {
  // carrelage : 4×4 dalles par motif. La carte de rugosité rend les dalles brillantes et les joints mats, d'où les reflets "en damier".
  const S = 512, T = 4, c = S / T, grout = (x, col, lw) => { x.fillStyle = col; for (let k = 0; k <= T; k++) { x.fillRect(k * c - lw / 2, 0, lw, S); x.fillRect(0, k * c - lw / 2, S, lw); } };
  const rv = []; for (let k = 0; k < T * T; k++) rv.push(Math.random());
  TEX.tiles = canvasTex(S, S, (x) => {
    for (let i = 0; i < T; i++) for (let j = 0; j < T; j++) { x.fillStyle = (i + j) % 2 ? '#f7e6cd' : '#f0c898'; x.fillRect(i * c, j * c, c, c); x.fillStyle = `rgba(150,90,30,${rv[i * T + j] * 0.06})`; x.fillRect(i * c, j * c, c, c); const g = x.createLinearGradient(i * c, j * c, i * c + c, j * c + c); g.addColorStop(0, 'rgba(255,255,255,.16)'); g.addColorStop(0.5, 'rgba(255,255,255,0)'); g.addColorStop(1, 'rgba(120,70,30,.07)'); x.fillStyle = g; x.fillRect(i * c, j * c, c, c); }
    speckle(x, S, S, 500, 0.035, 2); grout(x, '#c79f78', 5);
  }, [20, 10]);
  TEX.tilesR = dataTex(canvasTex(S, S, (x) => { for (let i = 0; i < T; i++) for (let j = 0; j < T; j++) { const v = Math.round(34 + rv[i * T + j] * 22); x.fillStyle = `rgb(${v},${v},${v})`; x.fillRect(i * c, j * c, c, c); } speckle(x, S, S, 300, 0.05, 3); grout(x, 'rgb(225,225,225)', 6); }, [20, 10]));
  TEX.concrete = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#c9c3b8'; x.fillRect(0, 0, w, h); speckle(x, w, h, 900, 0.07, 4); for (let i = 0; i < 5; i++) { x.fillStyle = `rgba(60,50,40,${rnd(0.03, 0.07)})`; x.beginPath(); x.ellipse(rnd(0, w), rnd(0, h), rnd(20, 50), rnd(10, 30), rnd(0, 3), 0, 6.3); x.fill(); } x.strokeStyle = 'rgba(0,0,0,.12)'; x.lineWidth = 3; x.strokeRect(0, 0, w, h); }, [4, 2]);
  TEX.ice = canvasTex(128, 128, (x) => { for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { x.fillStyle = (i + j) % 2 ? '#e6f6ff' : '#c4e6fa'; x.fillRect(i * 64, j * 64, 64, 64); } x.fillStyle = '#a9d3ea'; for (let k = 0; k <= 2; k++) { x.fillRect(k * 64 - 1.5, 0, 3, 128); x.fillRect(0, k * 64 - 1.5, 128, 3); } }, [3.5, 4]);
  TEX.wood = canvasTex(256, 256, (x, w) => { for (let i = 0; i < 8; i++) { x.fillStyle = ['#e3b27a', '#d6a066', '#dca870', '#cf995f'][(i * 3) % 4]; x.fillRect(0, i * 32, w, 32); for (let k = 0; k < 7; k++) { x.strokeStyle = `rgba(110,60,20,${rnd(0.05, 0.14)})`; x.lineWidth = rnd(0.6, 1.6); x.beginPath(); const y = i * 32 + rnd(4, 28); x.moveTo(0, y); x.bezierCurveTo(w * 0.3, y + rnd(-3, 3), w * 0.6, y + rnd(-3, 3), w, y); x.stroke(); } x.fillStyle = 'rgba(80,40,10,.3)'; x.fillRect(0, i * 32, w, 2); x.fillRect((i * 97) % w, i * 32, 2, 32); } }, [3, 3]);
  TEX.carpet = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#8fa9e0'; x.fillRect(0, 0, w, h); x.fillStyle = 'rgba(40,60,140,.15)'; for (let i = 0; i < 8; i++) x.fillRect(0, i * 16, w, 4); speckle(x, w, h, 700, 0.08, 2); }, [6, 5]);
  TEX.asphalt = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#5d646e'; x.fillRect(0, 0, w, h); speckle(x, w, h, 1400, 0.09, 3); }, [10, 3]);
  TEX.grass = canvasTex(128, 128, (x, w, h) => { x.fillStyle = '#86c765'; x.fillRect(0, 0, w, h); for (let i = 0; i < 300; i++) { x.fillStyle = `rgba(${Math.random() < 0.5 ? '60,140,50' : '210,235,140'},${Math.random() * 0.3})`; x.fillRect(Math.random() * w, Math.random() * h, 3, 4); } }, [70, 70]);
  TEX.ceil = canvasTex(256, 256, (x, w, h) => { x.fillStyle = '#d9cfbf'; x.fillRect(0, 0, w, h); speckle(x, w, h, 400, 0.05, 2); x.strokeStyle = '#bfb39f'; x.lineWidth = 4; for (let k = 0; k <= 4; k++) { x.beginPath(); x.moveTo(k * 64, 0); x.lineTo(k * 64, h); x.stroke(); x.beginPath(); x.moveTo(0, k * 64); x.lineTo(w, k * 64); x.stroke(); } }, [17, 12]);
}
function floor(x0, x1, z0, z1, tex, color, y = 0.002, o = {}) {
  const mt = new THREE.MeshStandardMaterial({ color: color || '#fff', map: tex || null, roughness: o.rough ?? 0.9, metalness: 0, roughnessMap: o.rmap || null }); mt.envMap = o.out ? ENV.out : ENV.in; mt.envMapIntensity = o.out ? 1 : 0.62; if (o.refl) reflPatch(mt);
  const m = new THREE.Mesh(new THREE.PlaneGeometry(x1 - x0, z1 - z0), mt); m.rotation.x = -Math.PI / 2; m.position.set((x0 + x1) / 2, y, (z0 + z1) / 2); m.receiveShadow = true; scene.add(m); return m;
}
const decal = (w, d, color, x, z, y = 0.006) => mbox(w, 0.01, d, color, x, y, z, { cast: false, ol: false });
// occlusion ambiante "posée" : halo sombre et doux au pied des meubles et des murs (un seul maillage, une seule texture)
function buildAO() {
  const tex = canvasTex(64, 64, (x) => { const im = x.createImageData(64, 64); for (let j = 0; j < 64; j++) for (let i = 0; i < 64; i++) { const u = i / 63, v = 1 - j / 63, d = Math.min(1, Math.hypot(u, v)), a = Math.pow(1 - d * d * (3 - 2 * d), 1.5); const k = (j * 64 + i) * 4; im.data[k] = im.data[k + 1] = im.data[k + 2] = 255; im.data[k + 3] = Math.round(a * 255); } x.putImageData(im, 0, 0); });
  tex.wrapS = tex.wrapT = THREE.ClampToEdgeWrapping;
  const pos = [], uv = [], idx = [];
  const q = (xa, za, ua, va, xb, zb, ub, vb) => { const n = pos.length / 3; pos.push(xa, 0, za, xb, 0, za, xb, 0, zb, xa, 0, zb); uv.push(ua, va, ub, va, ub, vb, ua, vb); idx.push(n, n + 1, n + 2, n, n + 2, n + 3); };
  for (const b of BOXES) {
    if (b.kind === 'inv' || b.t === 'gate') continue; const wall = b.kind === 'wall', s = wall ? 0.6 : b.t === 'car' || b.t === 'truck' ? 0.7 : b.t === 'palm' || b.t === 'plant' ? 0.35 : 0.5, k0 = wall ? 0.32 : b.t === 'palm' ? 0.2 : 0;
    const { x0, x1, z0, z1 } = b;
    q(x0 - s, z0, 1, k0, x0, z1, k0, k0); q(x1 + s, z0, 1, k0, x1, z1, k0, k0); q(x0, z0 - s, k0, 1, x1, z0, k0, k0); q(x0, z1 + s, k0, 1, x1, z1, k0, k0);
    q(x0 - s, z0 - s, 1, 1, x0, z0, k0, k0); q(x1 + s, z0 - s, 1, 1, x1, z0, k0, k0); q(x0 - s, z1 + s, 1, 1, x0, z1, k0, k0); q(x1 + s, z1 + s, 1, 1, x1, z1, k0, k0);
    if (b.t === 'table' || b.t === 'officedesk' || b.t === 'abri' || b.t === 'car' || b.t === 'truck') q(x0, z0, k0, k0, x1, z1, k0, k0);
  }
  const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(pos), 3)); g.setAttribute('uv', new THREE.BufferAttribute(new Float32Array(uv), 2)); g.setIndex(idx);
  const m = new THREE.Mesh(g, new THREE.MeshBasicMaterial({ map: tex, color: '#2c1a33', transparent: true, opacity: 0.62, depthWrite: false, side: THREE.DoubleSide })); m.position.y = 0.011; m.renderOrder = -1; m.userData.dyn = true; scene.add(m);
}

// ---------- produits : formes + étiquettes imprimées (atlas dessiné en canvas) ----------
const PALETTES = [['#e6a157', '#d4573b', '#f2c94c', '#8d5524'], ['#f2994a', '#eb5757', '#f2c94c', '#56ccf2'], ['#f2c94c', '#ffffff', '#2d9cdb', '#e0b057'], ['#bdbdbd', '#eb5757', '#27ae60', '#f2994a'], ['#2f80ed', '#56ccf2', '#27ae60', '#ffffff'], ['#eb5757', '#f2994a', '#219653', '#4f2a10'], ['#bb6bd9', '#56ccf2', '#ffffff', '#ff9ecb'], ['#27ae60', '#f2c94c', '#2f80ed', '#eb5757'], ['#ffffff', '#fff3b0', '#9be7ff', '#ff9a9a'], ['#bfe9ff', '#ff9ecb', '#ffffff', '#ffd23f'], ['#ff5a5f', '#56ccf2', '#ffd23f', '#7bd13f']];
const DUMMY = new THREE.Object3D();
// assemble plusieurs morceaux en une seule géométrie non indexée
function mergeGeo(parts) {
  const geos = parts.map(([g, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1]) => { const c = (g.index ? g.toNonIndexed() : g.clone()); c.scale(sx, sy, sz); c.translate(x, y, z); return c; });
  let n = 0; for (const g of geos) n += g.attributes.position.count; const pos = new Float32Array(n * 3); let o = 0;
  for (const g of geos) { pos.set(g.attributes.position.array, o); o += g.attributes.position.count * 3; }
  const out = new THREE.BufferGeometry(); out.setAttribute('position', new THREE.BufferAttribute(pos, 3)); out.computeVertexNormals(); out.computeBoundingSphere(); return out;
}
// coordonnées d'étiquette : la face avant/arrière (ou le tour d'un cylindre, deux fois) reçoit l'étiquette, les dessus et bouchons une zone unie
function labelUV(g, cyl) {
  g.computeBoundingBox(); const bb = g.boundingBox, P = g.attributes.position, N = P.count, uv = new Float32Array(N * 2);
  const w = bb.max.x - bb.min.x || 1, h = bb.max.y - bb.min.y || 1, d = bb.max.z - bb.min.z || 1; let R = 0; for (let i = 0; i < N; i++) R = Math.max(R, Math.hypot(P.getX(i), P.getZ(i)));
  const vs = [new THREE.Vector3(), new THREE.Vector3(), new THREE.Vector3()], e1 = new THREE.Vector3(), e2 = new THREE.Vector3(), TAU = Math.PI * 2;
  for (let i = 0; i + 2 < N; i += 3) {
    for (let k = 0; k < 3; k++) vs[k].fromBufferAttribute(P, i + k); e1.subVectors(vs[1], vs[0]); e2.subVectors(vs[2], vs[0]); e1.cross(e2).normalize(); const n = e1;
    const set = (k, u, v) => { uv[(i + k) * 2] = 0.02 + 0.96 * clamp(u, 0, 1); uv[(i + k) * 2 + 1] = 0.02 + 0.96 * clamp(v, 0, 1); };
    const vy = (k) => (vs[k].y - bb.min.y) / h;
    if (Math.abs(n.y) > 0.75) { for (let k = 0; k < 3; k++) set(k, 0.5, 0.02); continue; }
    if (cyl) {
      if (Math.max(Math.hypot(vs[0].x, vs[0].z), Math.hypot(vs[1].x, vs[1].z), Math.hypot(vs[2].x, vs[2].z)) < R * 0.75) { for (let k = 0; k < 3; k++) set(k, 0.5, 0.985); continue; }
      const ang = (x, z) => { let t = Math.atan2(x, z) + Math.PI / 2; if (t < 0) t += TAU; if (t >= TAU) t -= TAU; return t; }; // étiquette centrée sur l'avant et l'arrière
      const tc = ang(vs[0].x + vs[1].x + vs[2].x, vs[0].z + vs[1].z + vs[2].z), half = Math.floor(tc / Math.PI);
      for (let k = 0; k < 3; k++) { let t = ang(vs[k].x, vs[k].z); if (t - tc > Math.PI) t -= TAU; else if (tc - t > Math.PI) t += TAU; set(k, (t - half * Math.PI) / Math.PI, vy(k)); }
    } else if (Math.abs(n.z) >= Math.abs(n.x)) for (let k = 0; k < 3; k++) { const u = (vs[k].x - bb.min.x) / w; set(k, n.z > 0 ? u : 1 - u, vy(k)); }
    else if (d >= w * 0.6) for (let k = 0; k < 3; k++) { const u = (vs[k].z - bb.min.z) / d; set(k, n.x > 0 ? 1 - u : u, vy(k)); }
    else for (let k = 0; k < 3; k++) set(k, 0.02 + 0.03 * ((vs[k].z - bb.min.z) / d), vy(k));
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2)); return g;
}
const PGEO = {}, PGEO_OL = {};
(function () {
  const cyl = (r, h, s = 8) => new THREE.CylinderGeometry(r * 0.94, r, h, s), box = (w, h, d) => rboxGeo(w, h, d, Math.min(w, h, d) * 0.14);
  for (const k in PTYPE) {
    const T = PTYPE[k]; let g;
    if (k === 'bottle') g = mergeGeo([[cyl(T[1], T[2] * 0.68), 0, -T[2] * 0.16], [cyl(T[1] * 0.42, T[2] * 0.26, 8), 0, T[2] * 0.3], [cyl(T[1] * 0.5, T[2] * 0.06, 8), 0, T[2] * 0.47]]);
    else if (k === 'jug') g = mergeGeo([[box(T[1] * 1.7, T[2] * 0.8, T[1] * 1.2), 0, -T[2] * 0.1], [cyl(T[1] * 0.35, T[2] * 0.2, 8), -T[1] * 0.4, T[2] * 0.38], [box(T[1] * 0.25, T[2] * 0.22, T[1] * 0.3), T[1] * 0.55, T[2] * 0.3]]);
    else if (k === 'spray') g = mergeGeo([[cyl(T[1], T[2] * 0.72), 0, -T[2] * 0.14], [box(T[1] * 0.9, T[2] * 0.22, T[1] * 1.3), 0, T[2] * 0.33, T[1] * 0.3]]);
    else if (k === 'tube') g = mergeGeo([[cyl(T[1], T[2] * 0.8, 8), 0, -T[2] * 0.1], [cyl(T[1] * 0.6, T[2] * 0.2, 8), 0, T[2] * 0.4]]);
    else if (k === 'milk') g = mergeGeo([[box(T[1], T[2] * 0.82, T[3]), 0, -T[2] * 0.09], [box(T[1], T[2] * 0.18, T[3] * 0.1), 0, T[2] * 0.41], [cyl(0.025, 0.04, 6), T[1] * 0.25, T[2] * 0.36]]);
    else if (k === 'bag') g = mergeGeo([[box(T[1], T[2] * 0.88, T[3]), 0, -T[2] * 0.06], [box(T[1] * 0.85, T[2] * 0.12, T[3] * 0.35), 0, T[2] * 0.44]]);
    else if (T[0] === 'b') g = mergeGeo([[box(T[1], T[2], T[3])]]); else g = mergeGeo([[cyl(T[1], T[2], 8)]]);
    PGEO[k] = labelUV(creaseGeo(g, 50), T[0] === 'c' && k !== 'spray' && k !== 'jug'); PGEO[k].computeBoundingSphere(); PGEO_OL[k] = outlineGeo(PGEO[k], 0.011);
  }
})();
const PROD_HH = { box: 0.17, bottle: 0.19, can: 0.13, tub: 0.08 };
// atlas : une vignette par (rayon, variante) avec fond coloré, étiquette, pictogramme et nom du produit
const ATLAS = { cols: 16, rows: 6, cell: 128, tex: null };
const cellOf = (cat, v) => { const i = cat * 8 + (v & 7); return [i % ATLAS.cols, ATLAS.rows - 1 - Math.floor(i / ATLAS.cols)]; };
function picto(x, cat, cx, cy, s) {
  x.save(); x.translate(cx, cy); x.lineCap = 'round'; x.lineJoin = 'round';
  const dot = (px, py, r) => { x.beginPath(); x.arc(px * s, py * s, r * s, 0, 6.3); x.fill(); };
  if (cat === 0) { x.fillStyle = '#c98a4b'; dot(0, 0, 1); x.fillStyle = '#5a3418'; dot(-0.35, -0.3, 0.2); dot(0.35, -0.1, 0.2); dot(-0.1, 0.4, 0.2); dot(0.4, 0.45, 0.14); }
  else if (cat === 1) { x.fillStyle = '#ffd23f'; dot(-0.45, -0.5, 0.3); dot(0.2, -0.65, 0.3); dot(0.55, -0.3, 0.26); x.fillStyle = '#3a86ff'; x.beginPath(); x.arc(0, -0.05 * s, s, 0, Math.PI); x.fill(); }
  else if (cat === 2) { x.strokeStyle = '#e0a030'; x.lineWidth = s * 0.26; for (const dy of [-0.55, 0, 0.55]) { x.beginPath(); x.moveTo(-s, dy * s); x.bezierCurveTo(-s * 0.4, (dy - 0.5) * s, s * 0.4, (dy + 0.5) * s, s, dy * s); x.stroke(); } }
  else if (cat === 3) { x.fillStyle = '#3fa34d'; dot(-0.55, 0.2, 0.42); dot(0.5, 0.3, 0.42); dot(0, -0.4, 0.42); x.fillStyle = 'rgba(255,255,255,.55)'; dot(-0.65, 0.08, 0.13); dot(0.4, 0.18, 0.13); dot(-0.1, -0.52, 0.13); }
  else if (cat === 4 || cat === 10) { x.fillStyle = cat === 4 ? '#2d9cdb' : '#ffffff'; x.beginPath(); x.moveTo(0, -s); x.bezierCurveTo(s * 1.1, s * 0.2, s * 0.6, s, 0, s); x.bezierCurveTo(-s * 0.6, s, -s * 1.1, s * 0.2, 0, -s); x.fill(); x.fillStyle = 'rgba(255,255,255,.6)'; if (cat === 4) dot(-0.25, 0.3, 0.2); }
  else if (cat === 5) { x.strokeStyle = '#ffffff'; x.lineWidth = s * 0.2; for (const [px, py, r] of [[-0.4, 0.3, 0.5], [0.45, -0.1, 0.38], [-0.05, -0.6, 0.26]]) { x.beginPath(); x.arc(px * s, py * s, r * s, 0, 6.3); x.stroke(); } }
  else if (cat === 6) { x.fillStyle = '#ff9ecb'; x.beginPath(); x.ellipse(0, 0, s, s * 0.55, -0.6, 0, 6.3); x.fill(); x.fillStyle = '#ffffff'; dot(0.55, -0.55, 0.28); dot(-0.6, 0.5, 0.2); }
  else if (cat === 7) { x.fillStyle = '#ffd23f'; x.beginPath(); for (let k = 0; k < 8; k++) { const a = (k / 8) * 6.2832, r = k % 2 ? 0.36 : 1; x.lineTo(Math.cos(a) * r * s, Math.sin(a) * r * s); } x.closePath(); x.fill(); }
  else if (cat === 8) { x.fillStyle = '#2a2135'; dot(-0.45, -0.25, 0.4); dot(0.5, 0.25, 0.34); dot(0.1, -0.7, 0.2); dot(-0.3, 0.6, 0.24); }
  else { x.strokeStyle = '#2d9cdb'; x.lineWidth = s * 0.24; for (let k = 0; k < 3; k++) { const a = (k / 3) * Math.PI; x.beginPath(); x.moveTo(Math.cos(a) * s, Math.sin(a) * s); x.lineTo(-Math.cos(a) * s, -Math.sin(a) * s); x.stroke(); } }
  x.restore();
}
function buildAtlas() {
  const C = ATLAS.cell;
  ATLAS.tex = canvasTex(ATLAS.cols * C, ATLAS.rows * C, (x) => {
    for (let cat = 0; cat < PALETTES.length; cat++) for (let v = 0; v < 8; v++) {
      const i = cat * 8 + v, ox = (i % ATLAS.cols) * C, oy = Math.floor(i / ATLAS.cols) * C, base = PALETTES[cat][v & 3], acc = PALETTES[cat][(v + 1 + (v >> 2)) & 3];
      x.save(); x.translate(ox, oy); x.beginPath(); x.rect(0, 0, C, C); x.clip();
      x.fillStyle = base; x.fillRect(0, 0, C, C);
      if (v >= 4) { x.fillStyle = 'rgba(42,33,53,.18)'; x.fillRect(0, 0, C, C); x.fillStyle = acc === base ? '#ffffff' : acc; x.globalAlpha = 0.85; x.beginPath(); x.moveTo(0, 58); x.lineTo(C, 18); x.lineTo(C, 44); x.lineTo(0, 84); x.fill(); x.globalAlpha = 1; for (let d = 0; d < 6; d++) { x.fillStyle = 'rgba(255,255,255,.22)'; x.beginPath(); x.arc(14 + d * 21, C - 26, 4, 0, 6.3); x.fill(); } }
      const g = x.createLinearGradient(0, 0, C, 0); g.addColorStop(0, 'rgba(0,0,0,.1)'); g.addColorStop(0.3, 'rgba(255,255,255,.1)'); g.addColorStop(1, 'rgba(0,0,0,.08)'); x.fillStyle = g; x.fillRect(0, 0, C, C);
      x.fillStyle = 'rgba(0,0,0,.14)'; x.fillRect(0, C - 14, C, 14);                       // bas : couleur unie plus sombre (dessus/dessous des boîtes)
      x.fillStyle = base === '#ffffff' ? '#e9edf1' : '#ffffff'; x.fillRect(0, 0, C, 9);   // haut : bouchons et goulots
      x.fillStyle = acc === base ? '#2a2135' : acc; x.fillRect(11, 15, C - 22, 8);       // liseré de marque
      x.fillStyle = '#fffaf0'; rr(x, 12, 28, C - 24, 74, 9); x.fill(); x.strokeStyle = 'rgba(42,33,53,.35)'; x.lineWidth = 2; x.stroke();
      x.fillStyle = acc === '#ffffff' || acc === base ? '#ffd23f' : acc; rr(x, 12, 28, C - 24, 26, 9); x.fill(); x.fillRect(12, 44, C - 24, 10);
      picto(x, cat, 32, 41, 9.5);
      x.fillStyle = '#ffffff'; x.font = '700 11px Fredoka, Arial, sans-serif'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.strokeStyle = 'rgba(42,33,53,.55)'; x.lineWidth = 2.5; x.strokeText('LE SUPER', 48, 41.5); x.fillText('LE SUPER', 48, 41.5);
      const words = prodName(cat, v).split(' '), lines = words.length > 1 ? [words[0], words.slice(1).join(' ')] : words;
      x.fillStyle = '#2a2135'; x.textAlign = 'center'; let fs = lines.length > 1 ? 17 : 20; const fit = () => (x.font = `700 ${fs}px Fredoka, 'Arial Rounded MT Bold', Arial, sans-serif`); fit();
      while (Math.max(...lines.map((l) => x.measureText(l).width)) > C - 34 && fs > 9) { fs--; fit(); }
      lines.forEach((l, k) => x.fillText(l, C / 2, lines.length > 1 ? 68 + k * (fs + 2) : 78));
      x.restore();
    }
  });
  ATLAS.tex.wrapS = ATLAS.tex.wrapT = THREE.ClampToEdgeWrapping;
}
// matière des produits en rayon : chaque exemplaire lit sa vignette dans l'atlas (attribut aCell)
function cellPatch(m, cols, rows) {
  m.onBeforeCompile = (sh) => { sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nattribute vec2 aCell;').replace('#include <uv_vertex>', `#include <uv_vertex>\n#ifdef USE_MAP\nvMapUv = (uv + aCell) * vec2(${(1 / cols).toFixed(6)}, ${(1 / rows).toFixed(6)});\n#endif`); };
  m.customProgramCacheKey = () => 'cell' + cols + 'x' + rows; return m;
}
let SHELF_MAT = null, PRICE_MAT = null; const PRODMATC = new Map();
function shelfMat() { if (!SHELF_MAT) { if (!ATLAS.tex) buildAtlas(); SHELF_MAT = cellPatch(new THREE.MeshStandardMaterial({ map: ATLAS.tex, roughness: 0.34, metalness: 0 }), ATLAS.cols, ATLAS.rows); } return SHELF_MAT; }
// produit isolé (tenu en main, lancé, par terre) : même vignette, via le décalage de texture
function prodMat(cat, v) {
  const key = cat * 8 + (v & 7); let m = PRODMATC.get(key); if (m) return m; if (!ATLAS.tex) buildAtlas();
  const t = ATLAS.tex.clone(), [cx, cy] = cellOf(cat, v); t.repeat.set(1 / ATLAS.cols, 1 / ATLAS.rows); t.offset.set(cx / ATLAS.cols, cy / ATLAS.rows); t.needsUpdate = true;
  m = new THREE.MeshStandardMaterial({ map: t, roughness: 0.34, metalness: 0 }); PRODMATC.set(key, m); return m;
}
function instGeo(src, cells) { const g = new THREE.BufferGeometry(); for (const k of ['position', 'normal', 'uv']) if (src.attributes[k]) g.setAttribute(k, src.attributes[k]); if (src.index) g.setIndex(src.index); g.boundingSphere = src.boundingSphere; g.boundingBox = src.boundingBox; g.setAttribute('aCell', new THREE.InstancedBufferAttribute(cells, 2)); return g; }
function buildShelf(si) {
  const S2 = SHELVES[si]; const byType = {};
  for (let slot = 0; slot < S2.n; slot++) { const v = slotVar(si, slot, S2.cols), ty = ptypeOf(si, v); (byType[ty] = byType[ty] || []).push([slot, v]); }
  const parts = [];
  for (const ty in byType) {
    // facings : autant de produits côte à côte que la largeur de l'emplacement le permet (3 à 4), pour des rayons bien garnis
    const T = PTYPE[ty], pw = T[0] === 'c' ? T[1] * 2 : T[1], wide = S2.kind === 'gond' || S2.kind === 'fridge', per = wide ? clamp(Math.floor((S2.dz * 0.97) / (pw + 0.014)), S2.per, 4) : S2.per, spread = wide ? pw + 0.014 : S2.spread;
    const list = byType[ty], n = list.length * per, hh = prodHH(si, list[0][1], false), cells = new Float32Array(n * 2);
    const base = [], slotOf = []; let k = 0;
    for (const [slot, v] of list) {
      const [px, py, pz] = slotPos(si, slot), cl = cellOf(si, v);
      for (let j = 0; j < per; j++) {
        DUMMY.position.set(px + rnd(-0.02, 0.02), py + hh, pz + (j - (per - 1) / 2) * spread); DUMMY.rotation.set(0, (S2.side || 1) > 0 ? -HP + rnd(-0.12, 0.12) : HP + rnd(-0.12, 0.12), 0); DUMMY.scale.set(1, rnd(0.93, 1.05), 1); DUMMY.updateMatrix();
        base.push(DUMMY.matrix.clone()); slotOf.push(slot); cells[k * 2] = cl[0]; cells[k * 2 + 1] = cl[1]; k++;
      }
    }
    const im = new THREE.InstancedMesh(instGeo(PGEO[ty], cells), shelfMat(), n); im.castShadow = true; im.receiveShadow = true;
    const ol = new THREE.InstancedMesh(PGEO_OL[ty], OUTLINE_MAT, n);
    for (let q = 0; q < n; q++) { im.setMatrixAt(q, base[q]); ol.setMatrixAt(q, base[q]); }
    im.userData.dyn = true; ol.userData.dyn = true; im.frustumCulled = false; ol.frustumCulled = false; scene.add(im, ol); parts.push({ im, ol, base, slotOf });
  }
  WORLD.shelves[si] = { parts }; WORLD.masks[si] = -1;
  // étiquettes de prix (16 modèles : prix variés, quelques promos rouges)
  if (S2.kind === 'freezer') return;
  if (!PRICE_MAT) PRICE_MAT = cellPatch(new THREE.MeshBasicMaterial({ map: canvasTex(512, 224, (x) => { const P = ['0,89', '1,25', '1,49', '1,99', '2,35', '2,79', '3,10', '3,49', '0,99', '4,20', '1,75', '2,99', '5,90', '1,15', '2,49', '3,95']; for (let i = 0; i < 16; i++) { const ox = (i % 4) * 128, oy = Math.floor(i / 4) * 56, promo = i % 5 === 4; x.fillStyle = promo ? '#ff4d5a' : '#ffe14a'; x.fillRect(ox, oy, 128, 56); x.fillStyle = promo ? '#ffe14a' : '#d62828'; x.fillRect(ox, oy, 10, 56); x.fillStyle = promo ? '#ffffff' : '#2a2135'; x.font = '700 34px Fredoka, Arial'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(P[i] + ' €', ox + 69, oy + 30); } }) }), 4, 4);
  const nt = S2.levels.length * S2.cols, tc = new Float32Array(nt * 2);
  const tags = new THREE.InstancedMesh(instGeo(new THREE.PlaneGeometry(0.17, 0.075), tc), PRICE_MAT, nt); let k = 0;
  for (let l = 0; l < S2.levels.length; l++) for (let c = 0; c < S2.cols; c++) { const hsh = hash('p' + si + '_' + l + '_' + c); tc[k * 2] = hsh % 4; tc[k * 2 + 1] = (hsh >>> 3) % 4; DUMMY.position.set(S2.face + S2.side * 0.015, S2.levels[l] - 0.05, S2.z0 + c * S2.dz); DUMMY.rotation.set(0, S2.side > 0 ? HP : -HP, 0); DUMMY.scale.set(1, 1, 1); DUMMY.updateMatrix(); tags.setMatrixAt(k++, DUMMY.matrix); }
  tags.userData.dyn = true; tags.frustumCulled = false; scene.add(tags);
}
const ZERO_M = new THREE.Matrix4().makeScale(0, 0, 0);
// quand le stock change, les produits apparaissent / disparaissent avec un petit rebond au lieu de clignoter
function setShelfMask(si, mask) {
  const S = WORLD.shelves[si]; if (!S) return; const old = WORLD.masks[si]; WORLD.masks[si] = mask; const anim = old !== -1 && old !== undefined;
  for (const p of S.parts) {
    for (let k = 0; k < p.base.length; k++) {
      const on = (mask >>> p.slotOf[k]) & 1;
      if (anim && on !== ((old >>> p.slotOf[k]) & 1)) { WORLD.pops = WORLD.pops.filter((q) => !(q.p === p && q.k === k)); WORLD.pops.push({ p, k, t: 0, up: !!on }); if (on) continue; }
      const m = on ? p.base[k] : ZERO_M; if (!anim || on) { p.im.setMatrixAt(k, m); p.ol.setMatrixAt(k, m); }
    }
    p.im.instanceMatrix.needsUpdate = true; p.ol.instanceMatrix.needsUpdate = true;
  }
}
const _pm = new THREE.Matrix4(), _pv = new THREE.Vector3();
function animShelves(dt) {
  if (!WORLD.pops.length) return; const touched = new Set();
  for (let i = WORLD.pops.length - 1; i >= 0; i--) {
    const q = WORLD.pops[i]; q.t += dt / (q.up ? 0.24 : 0.12); const t = Math.min(1, q.t); let s;
    if (q.up) { const c1 = 1.9, u = t - 1; s = 1 + (c1 + 1) * u * u * u + c1 * u * u; } else s = 1 - t;
    if (t >= 1) { const m = q.up ? q.p.base[q.k] : ZERO_M; q.p.im.setMatrixAt(q.k, m); q.p.ol.setMatrixAt(q.k, m); WORLD.pops.splice(i, 1); }
    else { _pm.copy(q.p.base[q.k]).scale(_pv.set(s, s, s)); q.p.im.setMatrixAt(q.k, _pm); q.p.ol.setMatrixAt(q.k, _pm); }
    touched.add(q.p);
  }
  for (const p of touched) { p.im.instanceMatrix.needsUpdate = true; p.ol.instanceMatrix.needsUpdate = true; }
}
const PEND = SHELVES.map(() => ({ bits: 0, clr: 0, t: 0 }));
function displayMask(G, si) { const base = (G?.st?.[si] ?? SHELVES[si].full) >>> 0; const p = PEND[si]; if ((p.bits || p.clr) && performance.now() - p.t > 2500) { p.bits = 0; p.clr = 0; } p.bits &= ~base; p.clr &= base; return ((base | p.bits) & ~p.clr) >>> 0; }

// ---------- construction ----------
function buildWorld() {
  makeTextures();
  MAT_ZONE = 'out';
  const big = new THREE.Mesh(new THREE.PlaneGeometry(300, 300), new THREE.MeshStandardMaterial({ map: TEX.grass, roughness: 1, metalness: 0, envMap: ENV.out })); big.rotation.x = -Math.PI / 2; big.position.y = -0.03; big.receiveShadow = true; scene.add(big);
  floor(-24, 24, 14, 26.5, TEX.asphalt, null, -0.005, { rough: 0.95, out: true }); floor(-30, -20, -15, -5.5, TEX.concrete, '#d8d8d8', -0.004, { rough: 0.9, out: true });
  MAT_ZONE = 'in';
  floor(-20, 20, -6, 14, TEX.tiles, null, 0.002, { rough: 1, rmap: TEX.tilesR, refl: true }); floor(-20, -6, -14, -6, TEX.concrete, null, 0.002, { rough: 0.86 }); floor(-6, 1, -14, -6, TEX.ice, null, 0.002, { rough: 0.2, refl: true }); floor(1, 10, -14, -6, TEX.wood, null, 0.002, { rough: 0.45, refl: true }); floor(10, 20, -14, -6, TEX.carpet, null, 0.002, { rough: 1 });
  buildStructure(); MAT_ZONE = 'out'; buildOutdoor(); MAT_ZONE = 'in'; buildSales(); buildBackRooms(); buildBunting(); buildProps(); buildDecor(); buildAO();
}
function buildStructure() {
  // murs crème + soubassement turquoise + liseré orange
  for (const b of BOXES) if (b.kind === 'wall') {
    const w = b.x1 - b.x0, d = b.z1 - b.z0, cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2;
    mbox(w, b.h, d, '#fff1d6', cx, b.h / 2, cz);
    mbox(w + 0.04, 1.05, d + 0.04, '#1fb5a3', cx, 0.525, cz, { ol: false });
    mbox(w + 0.06, 0.12, d + 0.06, '#ff8a3d', cx, 1.1, cz, { ol: false });
  }
  for (const d of DOORS) mbox(d.x1 - d.x0, 1.1, d.z1 - d.z0, '#fff1d6', (d.x0 + d.x1) / 2, 3.45, (d.z0 + d.z1) / 2);
  // toit (il porte l'ombre du soleil sur l'intérieur) + faux plafond à dalles + poutres
  mbox(40.6, 0.24, 28.6, '#fff1d6', 0, 4.14, 0, { recv: false, ol: false });
  const ceil = new THREE.Mesh(new THREE.PlaneGeometry(40, 28), new THREE.MeshBasicMaterial({ map: TEX.ceil })); ceil.rotation.x = Math.PI / 2; ceil.position.set(0, 4.0, 0); scene.add(ceil);
  for (let x = -17; x <= 17; x += 6.8) mbox(0.25, 0.25, 20, null, x, 3.88, 4, { mat: basic('#ddd2bd'), cast: false, recv: false, ol: false });
  // luminaires : caisson + deux tubes néon légèrement bleutés (le bloom les fait rayonner)
  const fixture = (x, z, len = 2.4, tube = NEON, rot = 0) => { const ry = rot ? Math.PI / 2 : 0; mbox(len + 0.2, 0.07, 0.4, '#e9edf1', x, 3.945, z, { cast: false, recv: false, ol: false, ry }); for (const s of [-1, 1]) mbox(len, 0.05, 0.085, null, x + (rot ? s * 0.1 : 0), 3.895, z + (rot ? 0 : s * 0.1), { mat: tube, cast: false, recv: false, ol: false, r: 0, ry }); };
  for (let x = -16; x <= 16; x += 5.3) for (let z = -3; z <= 12; z += 4.5) fixture(x, z);
  fixture(-16.5, -10, 2.4, NEON_FLICK, 1); // néon fatigué de la réserve : il grésille (voir 26_decor.js) fixture(-10, -10, 2.4, NEON, 1); fixture(-2.5, -10, 2.2, NEON_COLD, 1); fixture(15, -9.2, 2.4, NEON);
  for (const x of [4.9, 7.1]) { mcyl(0.012, 1.3, '#2a2135', x, 3.35, -10.2, { cast: false, ol: false }); mcone(0.34, 0.28, '#ff8a3d', x, 2.62, -10.2, { cast: false }); msph(0.1, null, x, 2.5, -10.2, { mat: BULB, cast: false, recv: false, ol: false }); }
  // façade (extérieur : reflète le ciel)
  MAT_ZONE = 'out';
  mbox(10, 1.9, 0.4, '#1fb5a3', 13, 4.9, 14.25); sign('LE SUPER', 9.2, 1.5, 13, 4.9, 14.47, 0, { bg: null, fg: '#fff', stroke: '#2a2135', size: 100 });
  mbox(7.8, 0.18, 2, '#ff8a3d', 13, 3.25, 15.1); for (let i = 0; i < 9; i++) mbox(0.84, 0.32, 0.06, i % 2 ? '#ffffff' : '#ff5a5f', 9.6 + i * 0.85, 3.02, 16.07, { ol: false });
  for (const x of [9.6, 16.4]) mcyl(0.14, 3.3, '#ff8a3d', x, 1.65, 15.95);
  sign('Ouvert 7j/7 · 8h – 21h', 4.2, 0.5, -8, 2.7, 14.2, 0, { bg: '#ff8a3d' });
  for (let x = -18; x < 9; x += 3.4) { mbox(2.6, 0.45, 0.7, '#7a5236', x, 0.22, 14.55); for (let k = 0; k < 3; k++) msph(0.42, pick(['#5fbf4a', '#4fae3f', '#71cf57']), x - 0.8 + k * 0.8, 0.62, 14.55, { geo: ICO0 }); }
  sign('BIENVENUE !', 3.2, 0.7, 13, 3.4, 13.82, Math.PI, { bg: '#ffd23f', fg: '#2a2135' });
}
function palm(x, z, h = 4.2) {
  let px = x, pz = z; const lean = rnd(-0.25, 0.25);
  for (let i = 0; i < 6; i++) { const y = 0.35 + i * (h / 6); mcyl(0.2 - i * 0.015, h / 6 + 0.02, i % 2 ? '#b07a45' : '#c38a52', px + lean * i * 0.1, y, pz, { geo: CYL6 }); }
  const tx = px + lean * 0.6, ty = h + 0.3;
  for (let k = 0; k < 7; k++) { const a = (k / 7) * Math.PI * 2; const leaf = mbox(0.5, 0.06, 2.0, '#3fb24a', tx + Math.sin(a) * 0.9, ty - 0.25, pz + Math.cos(a) * 0.9, { ry: a }); leaf.rotation.x = 0.45; leaf.rotation.order = 'YXZ'; }
  msph(0.28, '#7a4a25', tx, ty, pz, { geo: ICO0 });
}
function tree(x, z, s = 1) { mcyl(0.18 * s, 1.4 * s, '#8b5a2b', x, 0.7 * s, z, { geo: CYL6 }); msph(1.2 * s, pick(['#4fae3f', '#5fbf4a', '#3e9a35']), x, 2.2 * s, z, { geo: ICO0 }); msph(0.8 * s, '#71cf57', x + 0.5 * s, 2.8 * s, z + 0.2, { geo: ICO0 }); }
function buildOutdoor() {
  // collines & nuages
  for (let i = 0; i < 14; i++) { const a = (i / 14) * Math.PI * 2; const d = rnd(95, 115); const hgt = rnd(10, 22); const m = mcone(rnd(14, 24), hgt, pick(['#7cc96a', '#6dbb5c', '#8fd27a']), Math.cos(a) * d, hgt / 2 - 0.5, Math.sin(a) * d, { cast: false, ol: false }); m.rotation.y = rnd(0, 3); }
  for (let i = 0; i < 12; i++) { const x = rnd(-70, 70), z = rnd(-70, 60), y = rnd(22, 32); for (let k = 0; k < 4; k++) msph(rnd(2, 3.4), '#ffffff', x + k * 2.4, y + rnd(-0.5, 0.6), z + rnd(-1, 1), { geo: ICO0, mat: CLOUD, cast: false, ol: false }); }
  for (let x = -28; x <= 28; x += 4.6) tree(x + rnd(-0.8, 0.8), 29 + rnd(-0.6, 0.6), rnd(0.9, 1.3));
  for (let z = -18; z <= 24; z += 5) { tree(-30 + rnd(-1, 1), z, rnd(0.9, 1.2)); tree(25 + rnd(-1, 1), z, rnd(0.9, 1.2)); }
  for (let x = -16; x <= 16; x += 6.5) tree(x + rnd(-1, 1), -17.5, rnd(0.9, 1.2));
  for (const [x, z] of PALMS) palm(x, z);
  // parking
  for (let x = -18; x <= 19; x += 2.8) if (Math.abs(x + 12) > 2.6 && Math.abs(x + 18.6) > 1.6) decal(0.12, 3.6, '#ffffff', x, 20.4);
  decal(32, 0.14, '#ffffff', 0, 18.4);
  for (let x = 10.5; x < 16; x += 0.9) decal(0.45, 2.4, '#ffffff', x, 15.6);
  mbox(48, 0.18, 1.0, '#d4d7dc', 0, 0.09, 26.9);
  for (const [x, z] of [[-16, 22.9], [0, 22.9], [16, 22.9]]) { mcyl(0.09, 4.6, '#4a4f58', x, 2.3, z, { geo: CYL6 }); mbox(1.3, 0.14, 0.4, '#4a4f58', x, 4.6, z - 0.5); mbox(1.0, 0.05, 0.28, null, x, 4.52, z - 0.55, { mat: basic('#fffbe0'), ol: false }); }
  // abri caddies, caddies, voitures, benne, vélos
  mbox(4.4, 0.12, 1.8, '#1fb5a3', -12, 2.2, 20.25); for (const x of [-14.1, -9.9]) for (const z of [19.5, 21]) mcyl(0.06, 2.2, '#9aa3ad', x, 1.1, z, { geo: CYL6 });
  for (let i = 0; i < 4; i++) bake(cartModel(-13.4 + i * 0.85, 0, 20.25, Math.PI / 2));
  for (let i = 0; i < 3; i++) bake(cartModel(ST['caddie' + i].x + 0.4, 0, ST['caddie' + i].z + 0.5, rnd(0, 6)));
  for (const b of BOXES) if (b.t === 'car') carModel(b);
  sign('ABRI CADDIES', 2.6, 0.45, -12, 2.6, 21.2, Math.PI, { bg: '#1fb5a3' });
  mbox(2.2, 1.3, 1.6, '#3a9a5a', -18.7, 0.75, 21.6); mbox(2.3, 0.15, 1.7, '#2f7f49', -18.7, 1.48, 21.6); sign('BENNE', 1.4, 0.4, -18.7, 0.9, 20.79, Math.PI, { bg: '#ffd23f', fg: '#2a2135' });
  for (let i = 0; i < 4; i++) { mbox(0.06, 0.7, 0.06, '#9aa3ad', 1.2 + i * 0.5, 0.35, 22.2); }
  mbox(1.8, 0.06, 0.06, '#9aa3ad', 1.95, 0.7, 22.2);
  // quai & camion
  mbox(2.4, 2.9, 6, '#f7f7f7', -25.2, 1.8, -10.6); mbox(2.44, 0.35, 6.04, '#1fb5a3', -25.2, 2.3, -10.6, { ol: false });
  sign('LE SUPER', 3.4, 0.9, -25.2, 1.6, -7.57, 0, { bg: null, fg: '#1fb5a3', stroke: '#ffffff', size: 100 });
  mbox(0.03, 2.5, 5.4, null, -23.99, 1.8, -10.6, { mat: basic('#2a2a30'), ol: false });
  for (let i = 0; i < 6; i++) mbox(0.5, 0.45, 0.55, pick(['#d9a066', '#c88a50']), -24.45, 0.6 + (i % 2) * 0.46, -12.6 + Math.floor(i / 2) * 0.62);
  mbox(2.2, 2.3, 2, '#ff5a5f', -25.2, 1.4, -14.7); mbox(2.0, 0.8, 0.05, null, -25.2, 1.9, -15.71, { mat: basic('#bfe8ff'), ol: false });
  for (const z of [-8.3, -12.6, -14.6]) for (const x of [-26.3, -24.1]) { const w = mcyl(0.45, 0.35, '#222', x, 0.45, z, { geo: CYL6 }); w.rotation.z = Math.PI / 2; }
  for (let i = 0; i < 3; i++) mbox(1.1, 0.14, 1.1, '#b5834f', -21.4, 0.07 + i * 0.15, -13.3);
  decal(0.2, 7.4, '#ffd23f', -20.25, -10.2);
}
function cartModel(x, y, z, ry, parent) {
  const g = new THREE.Group(); g.position.set(x, y, z); g.rotation.y = ry; (parent || scene).add(g);
  const m = mat('#c9d2db');
  mbox(0.55, 0.04, 0.8, null, 0, 0.45, 0, { parent: g, mat: m }); mbox(0.55, 0.42, 0.04, null, 0, 0.66, 0.4, { parent: g, mat: m }); mbox(0.55, 0.42, 0.04, null, 0, 0.66, -0.4, { parent: g, mat: m });
  mbox(0.04, 0.42, 0.8, null, 0.27, 0.66, 0, { parent: g, mat: m }); mbox(0.04, 0.42, 0.8, null, -0.27, 0.66, 0, { parent: g, mat: m });
  mbox(0.6, 0.06, 0.06, '#ff5a5f', 0, 0.98, -0.5, { parent: g });
  for (const [a, b] of [[0.22, 0.32], [-0.22, 0.32], [0.22, -0.32], [-0.22, -0.32]]) msph(0.06, '#2a2135', a, 0.06, b, { parent: g, geo: ICO0 });
  for (const [a, b] of [[0.25, 0.38], [-0.25, 0.38], [0.25, -0.38], [-0.25, -0.38]]) mbox(0.03, 0.42, 0.03, null, a, 0.24, b, { parent: g, mat: m });
  return g;
}
function carModel(b) {
  const cx = (b.x0 + b.x1) / 2, cz = (b.z0 + b.z1) / 2, L = b.z1 - b.z0, Wd = b.x1 - b.x0;
  mbox(Wd, 0.65, L, b.c, cx, 0.58, cz); mbox(Wd * 0.88, 0.6, L * 0.52, b.c, cx, 1.18, cz + 0.15); mbox(Wd * 0.9, 0.44, L * 0.5, null, cx, 1.18, cz + 0.15, { mat: mat('#bfe8ff'), ol: false });
  mbox(Wd * 0.3, 0.1, 0.06, null, cx - Wd * 0.3, 0.7, b.z0 - 0.01, { mat: basic('#fff6b0'), ol: false }); mbox(Wd * 0.3, 0.1, 0.06, null, cx + Wd * 0.3, 0.7, b.z0 - 0.01, { mat: basic('#fff6b0'), ol: false });
  for (const [dx, dz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const w = mcyl(0.34, 0.26, '#2a2135', cx + dx * (Wd / 2 - 0.05), 0.34, cz + dz * (L / 2 - 0.65), { geo: CYL6 }); w.rotation.z = Math.PI / 2; }
}
function buildSales() {
  // allée principale colorée & marquages
  decal(36, 0.9, '#c9f0e8', -2, 7.2, 0.004); decal(0.9, 6, '#c9f0e8', 13, 10.5, 0.004);
  // gondoles
  GOND_X.forEach((gx, gi) => {
    mbox(1.2, 0.14, 8, '#3d4454', gx, 0.07, 1); mbox(0.1, 2.05, 8, '#d7dce4', gx, 1.1, 1);
    for (const y of [0.32, 0.88, 1.44, 2.0]) mbox(1.18, 0.05, 8, '#ffffff', gx, y, 1, { cast: false });
    for (const y of [0.3, 0.86, 1.42]) for (const s of [-1, 1]) mbox(0.02, 0.07, 8, gi % 2 ? '#ffd23f' : '#ff8a3d', gx + s * 0.6, y, 1, { cast: false, ol: false });
    mbox(1.24, 2.15, 0.12, '#ff8a3d', gx, 1.07, 5); mbox(1.24, 2.15, 0.12, '#1fb5a3', gx, 1.07, -3);
    mbox(1.0, 0.7, 0.04, '#ffd23f', gx, 1.55, 5.08, { ol: false }); sign('PROMO', 0.95, 0.32, gx, 1.55, 5.11, 0, { bg: '#ff5a5f', size: 80 });
    buildShelf(gi * 2); buildShelf(gi * 2 + 1);
    const a = SHELF_NAMES[gi * 2], b = SHELF_NAMES[gi * 2 + 1];
    sign(`◂ ${a}   ·   ${b} ▸`, 3.4, 0.55, gx, 3.15, 5.15, 0, { bg: '#1fb5a3' }); sign(`◂ ${b}   ·   ${a} ▸`, 3.4, 0.55, gx, 3.15, -3.15, Math.PI, { bg: '#1fb5a3' });
    for (const z of [5.15, -3.15]) for (const s of [-1, 1]) mcyl(0.015, 0.8, '#666', gx + s * 1.3, 3.7, z, { cast: false, ol: false });
    for (let k = 0; k < 3; k++) mbox(0.5, 0.36, 0.4, pick(['#d9a066', '#c88a50']), gx + rnd(-0.25, 0.25), 2.27 + k * 0.01, -2 + k * 2.7, { ry: rnd(-0.3, 0.3) });
  });
  // frais
  mbox(0.8, 2.4, 10, '#eef7fc', 19.6, 1.2, 1); mbox(1.7, 0.14, 10, '#ffffff', 19.15, 2.37, 1);
  mbox(0.05, 0.1, 10, null, 18.32, 2.26, 1, { mat: basic('#7fd6ff'), ol: false });
  for (const y of [0.3, 0.9, 1.5]) mbox(0.9, 0.05, 10, '#dfe9f2', 18.75, y, 1, { cast: false });
  for (const z of [-4, 6]) mbox(1.7, 2.4, 0.1, '#1fb5a3', 19.15, 1.2, z);
  buildShelf(8);
  sign('❄  FRAIS  ❄', 3.6, 0.6, 18.4, 3.2, 1, -Math.PI / 2, { bg: '#2d7dd2' });
  // îlot surgelés
  mbox(1.4, 0.45, 6.5, '#ffffff', 4.9, 0.225, 0.75); mbox(1.2, 0.05, 6.3, '#dff3ff', 4.9, 0.47, 0.75, { cast: false }); for (const sx of [-1, 1]) mbox(0.1, 0.42, 6.54, '#2d7dd2', 4.9 + sx * 0.67, 0.66, 0.75); for (const sz of [-1, 1]) mbox(1.44, 0.42, 0.1, '#2d7dd2', 4.9, 0.66, 0.75 + sz * 3.22); mbox(0.04, 0.3, 6.3, '#ffffff', 4.9, 0.62, 0.75, { ol: false });
  mbox(1.2, 0.02, 6.3, null, 4.9, 0.89, 0.75, { mat: glassMat('#d4eeff', 0.18), ol: false, cast: false });
  buildShelf(9);
  mbox(0.2, 0.25, 0.12, '#3d4454', 5.7, 0.2, -1.8); mcyl(0.02, 0.6, '#2a2135', 6.0, 0.02, -1.8, { cast: false, ol: false, rz: Math.PI / 2 });
  sign('SURGELÉS', 2.4, 0.5, 4.9, 2.9, 0.75, Math.PI / 2, { bg: '#2d7dd2', double: true });
  // boucherie
  mbox(4.8, 0.85, 1.15, '#ffffff', 8.4, 0.425, -5.27); mbox(4.8, 0.2, 1.15, '#ff5a5f', 8.4, 0.1, -5.27, { ol: false });
  for (let i = 0; i < 9; i++) msph(0.15, pick(['#e8746a', '#d9534f', '#f2a29a', '#b5443c']), 6.4 + i * 0.5, 0.93, -5.2, { sx: 1.4, sy: 0.55, geo: ICO0 });
  mbox(4.8, 0.36, 0.04, null, 8.4, 1.06, -4.72, { mat: glassMat('#d4eeff', 0.16), cast: false, ol: false });
  for (let i = 0; i < 4; i++) { msph(0.18, '#c0504d', 6.6 + i * 1.2, 2.3, -5.7, { sy: 1.6, geo: ICO0 }); mcyl(0.01, 0.6, '#888', 6.6 + i * 1.2, 2.85, -5.7, { cast: false, ol: false }); }
  sign('BOUCHERIE', 3.2, 0.6, 8.4, 3.2, -5.8, 0, { bg: '#ff5a5f' });
  // boulangerie + four
  mbox(2.8, 0.85, 1.15, '#f3d3a2', 13.2, 0.425, -5.27); mbox(2.8, 0.2, 1.15, '#b5733a', 13.2, 0.1, -5.27, { ol: false });
  for (let i = 0; i < 3; i++) { mcyl(0.32, 0.25, '#c8873f', 12.2 + i * 1, 0.98, -5.25, { geo: CYL6 }); for (let k = 0; k < 4; k++) { const b = mcyl(0.05, 0.6, '#e5a54a', 12.05 + i * 1 + k * 0.1, 1.2, -5.25, { geo: CYL6 }); b.rotation.x = 0.25; } }
  for (let i = 0; i < 6; i++) msph(0.09, '#f0b45a', 12 + i * 0.45, 0.95, -4.85, { sx: 1.6, sy: 0.7, geo: ICO0 });
  mbox(1.8, 2.0, 1.1, '#6d7480', 15.5, 1.0, -5.3); mbox(1.84, 0.2, 1.14, '#2a2135', 15.5, 2.1, -5.3);
  WORLD.ovenWin = mbox(1.2, 0.7, 0.04, null, 15.5, 1.15, -4.73, { mat: new THREE.MeshBasicMaterial({ color: '#3b2a2a' }), ol: false, cast: false });
  for (let i = 0; i < 3; i++) msph(0.06, '#ffd23f', 15.0 + i * 0.5, 1.75, -4.74, { geo: ICO0 });
  sign('BOULANGERIE', 3.2, 0.6, 13.9, 3.2, -5.8, 0, { bg: '#e5a54a', fg: '#2a2135' });
  // caisses
  CHECKOUTS.forEach((c, i) => {
    mbox(0.9, 0.9, 3, '#dfe5ec', c, 0.45, 10.1); mbox(0.62, 0.03, 2.1, '#2a2135', c, 0.915, 9.6, { ol: false });
    for (let k = 0; k < 3; k++) mbox(0.18, 0.14, 0.14, pick(['#ff5a5f', '#ffd23f', '#56c271', '#2d7dd2']), c + rnd(-0.15, 0.15), 1.0, 9.0 + k * 0.4);
    mbox(0.42, 0.3, 0.4, '#3d4454', c, 1.16, 10.95); mbox(0.42, 0.1, 0.42, '#2a2135', c, 0.95, 10.95); mbox(0.32, 0.2, 0.04, null, c + 0.05, 1.43, 10.8, { mat: basic('#7df3c8'), ol: false });
    mcyl(0.035, 2.4, '#888', c - 0.35, 1.2, 11.4, { geo: CYL6 }); sign(String(i + 1), 0.55, 0.55, c - 0.35, 2.55, 11.38, Math.PI, { bg: '#ff8a3d', size: 90 });
    mcyl(0.22, 0.06, '#2a2135', c + 1.75, 0.6, 10.1, { geo: CYL6 }); mcyl(0.04, 0.6, '#555', c + 1.75, 0.3, 10.1, { geo: CYL6 });
    mbox(0.5, 1.1, 0.35, '#ff7ac6', c - 0.7, 0.55, 11.35); for (let k = 0; k < 6; k++) mbox(0.1, 0.12, 0.06, pick(['#ffd23f', '#ff5a5f', '#56c271', '#9b6bff']), c - 0.85 + (k % 3) * 0.15, 0.4 + Math.floor(k / 3) * 0.35, 11.15, { ol: false });
  });
  sign('CAISSES', 4, 0.6, -9, 3.3, 7.6, Math.PI, { bg: '#ff8a3d' });
  // poubelles côté caisses
  for (let i = 0; i < 2; i++) { mcyl(0.32, 0.9, i ? '#56c271' : '#2d7dd2', -19.25 + i * 0.6, 0.45, 11.8 - 0 * i, { geo: CYL6 }); mcyl(0.34, 0.08, '#2a2135', -19.25 + i * 0.6, 0.93, 11.8, { geo: CYL6 }); }
  // accueil
  mbox(4.5, 1.1, 1, '#1fb5a3', 4.25, 0.55, 10.9); mbox(4.6, 0.07, 1.1, '#fff6e6', 4.25, 1.14, 10.9);
  mcyl(0.015, 0.32, '#333', 5.4, 1.32, 10.55, { cast: false, ol: false }); msph(0.06, '#2a2135', 5.4, 1.5, 10.5, { geo: ICO0 });
  const ph = new THREE.Group(); ph.position.set(2.9, 1.18, 10.6); scene.add(ph); mbox(0.32, 0.08, 0.24, '#ff5a5f', 0, 0, 0, { parent: ph }); mbox(0.34, 0.07, 0.08, '#ff5a5f', 0, 0.08, -0.04, { parent: ph }); WORLD.phone = ph;
  sign('ACCUEIL', 2.6, 0.55, 4.25, 3.0, 10.4, Math.PI, { bg: '#1fb5a3' });
  // pyramide
  mbox(1.6, 0.35, 1.6, '#ff5a5f', 8, 0.175, 2.5);
  const nCans = 55, pcell = new Float32Array(nCans * 2); WORLD.pyr = new THREE.InstancedMesh(instGeo(PGEO.can, pcell), shelfMat(), nCans); WORLD.pyr.castShadow = true; WORLD.pyr.frustumCulled = false;
  WORLD.pyrOl = new THREE.InstancedMesh(PGEO_OL.can, OUTLINE_MAT, nCans); WORLD.pyrOl.frustumCulled = false;
  WORLD.pyrStand = []; WORLD.pyrFall = []; WORLD.pyrK = []; let k = 0;
  for (let L = 0; L < 5; L++) { const n = 5 - L; for (let i = 0; i < n; i++) for (let j = 0; j < n; j++) {
    DUMMY.position.set(8 + (i - (n - 1) / 2) * 0.22, 0.35 + 0.13 + L * 0.26, 2.5 + (j - (n - 1) / 2) * 0.22); DUMMY.rotation.set(0, rnd(0, 1), 0); DUMMY.scale.set(1, 1, 1); DUMMY.updateMatrix(); WORLD.pyrStand.push(DUMMY.matrix.clone()); const sp = DUMMY.position.clone(), sq = DUMMY.quaternion.clone();
    const a = rnd(0, Math.PI * 2), d = rnd(0.95, 2.3); DUMMY.position.set(8 + Math.cos(a) * d, 0.1, 2.5 + Math.sin(a) * d * 0.9 + 0.5); DUMMY.rotation.set(Math.PI / 2, rnd(0, 6), rnd(0, 6)); DUMMY.updateMatrix(); WORLD.pyrFall.push(DUMMY.matrix.clone());
    WORLD.pyrK.push({ sp, sq, fp: DUMMY.position.clone(), fq: DUMMY.quaternion.clone(), L, r1: Math.random(), r2: Math.random(), ax: new THREE.Vector3(rnd(-1, 1), rnd(-1, 1), rnd(-1, 1)).normalize() });
    const cl = cellOf(3, rndi(0, 3)); pcell[k * 2] = cl[0]; pcell[k * 2 + 1] = cl[1];
    WORLD.pyr.setMatrixAt(k, WORLD.pyrStand[k]); WORLD.pyrOl.setMatrixAt(k, WORLD.pyrStand[k]); k++; } }
  WORLD.pyr.userData.dyn = true; WORLD.pyrOl.userData.dyn = true; scene.add(WORLD.pyr, WORLD.pyrOl);
  sign('PROMO −50 %', 1.8, 0.5, 8, 2.7, 2.5, 0, { bg: '#ffd23f', fg: '#d62828', double: true });
  mcyl(0.02, 1.2, '#777', 8, 3.4, 2.5, { cast: false, ol: false });
  // dégustation
  mbox(1.4, 0.95, 1.0, '#ffffff', 12.5, 0.475, -1.1); mbox(1.46, 0.12, 1.06, '#ff8a3d', 12.5, 0.9, -1.1, { ol: false });
  mcyl(0.35, 0.05, '#d9d9d9', 12.5, 0.99, -1.1); for (let i = 0; i < 7; i++) mbox(0.08, 0.08, 0.08, '#f7d14a', 12.5 + rnd(-0.22, 0.22), 1.05, -1.1 + rnd(-0.22, 0.22), { ol: false });
  sign('DÉGUSTATION', 1.6, 0.4, 12.5, 1.5, -1.62, 0, { bg: '#ff8a3d' });
  // fruits & légumes
  mbox(5, 0.6, 2.5, '#b98552', 14.5, 0.3, 5.25);
  const fcols = ['#ff5a5f', '#ffa23f', '#ffe14a', '#7bd13f', '#d62828']; for (let c = 0; c < 5; c++) { mbox(0.95, 0.25, 2.3, '#8a5a2f', 12.5 + c, 0.72, 5.25); for (let i = 0; i < 14; i++) msph(0.12, fcols[c], 12.5 + c + rnd(-0.33, 0.33), 0.92 + rnd(0, 0.06), 5.25 + rnd(-0.95, 0.95), { sx: c === 2 ? 1.8 : 1, geo: ICO0 }); }
  sign('FRUITS & LÉGUMES', 3.6, 0.6, 14.5, 3.1, 3.9, 0, { bg: '#56c271' });
  // palette d'eau
  mbox(1.4, 0.14, 1.4, '#b5834f', 10.1, 0.07, 6.3); for (let y = 0; y < 3; y++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) mbox(0.62, 0.32, 0.62, '#4fb6ff', 9.78 + i * 0.66, 0.32 + y * 0.34, 5.98 + j * 0.66);
  sign('EAU', 0.9, 0.36, 10.1, 1.6, 7.02, 0, { bg: '#2d7dd2' });
  // fleurs
  mbox(2, 0.5, 3, '#7a5236', 18.6, 0.25, 10); for (let i = 0; i < 10; i++) { const x = 17.9 + (i % 2) * 0.9, z = 8.8 + Math.floor(i / 2) * 0.6; mcyl(0.22, 0.4, '#2d7dd2', x, 0.7, z, { geo: CYL6 }); for (let k = 0; k < 4; k++) msph(0.1, pick(['#ff5a5f', '#ffd23f', '#ff7ac6', '#ffffff', '#9b6bff']), x + rnd(-0.15, 0.15), 1.05 + rnd(0, 0.2), z + rnd(-0.15, 0.15), { geo: ICO0 }); }
  sign('FLEURS', 1.6, 0.4, 18.6, 2.1, 8.4, 0, { bg: '#ff7ac6' });
  // entrée : portiques, paniers, plantes
  for (const x of [10.32, 15.68]) { mbox(0.25, 1.5, 0.6, '#d7dce4', x, 0.75, 13.2); mbox(0.27, 0.12, 0.62, '#ff5a5f', x, 1.3, 13.2, { ol: false }); }
  for (let i = 0; i < 5; i++) mbox(0.6, 0.16, 0.45, '#ff5a5f', 16.95, 0.1 + i * 0.14, 12.85);
  for (const b of BOXES) if (b.t === 'plant') { const x = (b.x0 + b.x1) / 2, z = (b.z0 + b.z1) / 2; mcyl(0.28, 0.5, '#c0663a', x, 0.25, z, { geo: CYL6 }); msph(0.45, '#4fae3f', x, 0.9, z, { geo: ICO0 }); msph(0.3, '#71cf57', x + 0.15, 1.25, z, { geo: ICO0 }); }
  decal(3.5, 1.4, '#ff8a3d', 13, 13.1, 0.007); sign('BONNES COURSES !', 3.2, 0.5, 13, 0.02, 13.1, 0, { bg: null, fg: '#fff' }).rotation.x = -Math.PI / 2;
  // affiches murales
  sign('🥕 Le frais, c’est la vie', 3.6, 0.7, -17, 2.3, -5.83, 0, { bg: '#56c271' });
  sign('Carte fidélité = −10 % 💳', 4, 0.8, -19.83, 2.5, 7.4, Math.PI / 2, { bg: '#ffd23f', fg: '#2a2135' });
}
function buildBackRooms() {
  // réserve
  for (let x = -18.3; x < -16.1; x += 0.62) for (let z = -8.9; z < -6.9; z += 0.62) { const hgt = rndi(1, 3); for (let y = 0; y < hgt; y++) mbox(0.56, 0.5, 0.56, pick(['#d9a066', '#c88a50', '#e2b07a']), x + 0.28, 0.25 + y * 0.52, z + 0.28, { ry: rnd(-0.1, 0.1) }); }
  for (let x = -19.4; x <= -7.2; x += 3.05) mbox(0.1, 3, 0.95, '#ff8a3d', x, 1.5, -13.38);
  for (const y of [0.15, 1.15, 2.15]) { mbox(12.4, 0.09, 0.95, '#2d7dd2', -13.3, y, -13.38); if (y > 1) for (let x = -19.1; x < -7.6; x += 0.75) if (Math.random() < 0.85) mbox(0.6, 0.55, 0.7, pick(['#d9a066', '#c88a50', '#e2b07a']), x + 0.3, y + 0.33, -13.38); }
  for (let i = 0; i < 8; i++) { const x = ST['carton' + i].x; for (let k = 0; k < 3; k++) { mbox(0.62, 0.3, 0.6, '#d9a066', x + rnd(-0.03, 0.03), 0.36 + k * 0.31, -13.35); mbox(0.63, 0.08, 0.02, PALETTES[i][0], x, 0.36 + k * 0.31, -13.04, { ol: false }); } sign(SHELF_NAMES[i], 1.25, 0.32, x, 1.36, -12.85, 0, { bg: PALETTES[i][1] === '#ffffff' ? PALETTES[i][0] : PALETTES[i][1], size: 76 }); }
  mbox(3, 0.15, 1.9, '#b5834f', -9, 0.075, -9.55); for (let i = 0; i < 4; i++) for (let j = 0; j < 2; j++) mbox(0.68, 0.9, 0.82, '#d9a066', -10.1 + i * 0.73, 0.6, -10 + j * 0.88);
  mbox(1.3, 1.4, 1.1, '#9aa3ad', -7.25, 0.75, -11.85); for (let i = 0; i < 3; i++) mbox(1.1, 0.4, 0.9, pick(['#d9a066', '#4fb6ff']), -7.25, 0.4 + i * 0.42, -11.85);
  mbox(1.2, 0.15, 0.5, '#ff5a5f', -12.8, 0.15, -7.4); mbox(0.12, 1.1, 0.12, '#ff5a5f', -12.3, 0.6, -7.4);
  mcyl(0.12, 0.5, '#ff2d2d', -6.4, 0.25, -6.6, { geo: CYL6 });
  decal(0.15, 7.6, '#ffd23f', -13, -9.9); decal(12.5, 0.15, '#ffd23f', -13.3, -12.6);
  sign('RÉSERVE — PERSONNEL', 3.6, 0.55, -12, 3.3, -5.82, 0, { bg: '#3d4454' });
  sign('INVENTAIRE', 1.6, 0.4, -12.5, 2.4, -12.88, 0, { bg: '#ffd23f', fg: '#2a2135' });
  // chambre froide
  for (let x = -5.5; x < -3.7; x += 0.62) for (let z = -13.6; z < -11.6; z += 0.5) { const hgt = rndi(2, 4); for (let y = 0; y < hgt; y++) mbox(0.56, 0.36, 0.44, y % 2 ? '#3a86ff' : '#5aa0ff', x + 0.28, 0.18 + y * 0.38, z + 0.22); }
  for (let x = -1.2; x < 0.6; x += 0.62) for (let z = -13.7; z < -12.5; z += 0.6) mbox(0.56, 0.48, 0.54, '#eef2f5', x + 0.28, 0.24, z + 0.27);
  for (let k = 0; k < 3; k++) for (let j = 0; j < 2; j++) mbox(0.6, 0.36, 0.5, '#bfe9ff', -3.0 + j * 0.7, 0.18 + k * 0.38, -13.3); sign('SURGELÉS ❄', 1.4, 0.32, -2.65, 1.45, -12.68, 0, { bg: '#2d7dd2', size: 76 }); sign('FRAIS', 1.2, 0.32, -4.65, 1.85, -11.45, 0, { bg: '#56c271', size: 76 });
  mbox(0.5, 1.8, 3.8, '#c9d6e0', -5.55, 0.9, -8.7); for (let i = 0; i < 6; i++) mbox(0.4, 0.3, 0.5, pick(['#ffffff', '#fff3b0', '#ff9a9a']), -5.5, 0.4 + (i % 3) * 0.55, -9.9 + Math.floor(i / 3) * 1.6);
  for (let i = 0; i < 3; i++) { msph(0.2, '#d2665f', -2.8 + i * 0.9, 2.6, -8.8, { sy: 1.8, geo: ICO0 }); mcyl(0.01, 0.8, '#888', -2.8 + i * 0.9, 3.4, -8.8, { cast: false, ol: false }); }
  mbox(3.4, 0.06, 0.06, '#9aa3ad', -1.9, 3.8, -8.8);
  sign('CHAMBRE FROIDE  3 °C', 3.4, 0.55, -2.5, 3.3, -5.82, 0, { bg: '#2d7dd2' });
  mbox(7, 0.05, 8, null, -2.5, 3.94, -10, { mat: new THREE.MeshBasicMaterial({ color: '#bfe6ff', transparent: true, opacity: 0.25 }), cast: false, ol: false });
  // salle de pause
  mbox(3.2, 0.1, 2, '#c58b4f', 6, 0.75, -10.2); for (const [x, z] of [[4.6, -11.05], [7.4, -11.05], [4.6, -9.35], [7.4, -9.35]]) mbox(0.09, 0.72, 0.09, '#6b4a2b', x, 0.36, z);
  for (const [sx, sz] of SEATS) { const a = Math.atan2(TABLE_C[0] - sx, TABLE_C[1] - sz); const c = pick(['#ff8a3d', '#1fb5a3', '#ffd23f']); mbox(0.5, 0.07, 0.5, c, sx, 0.45, sz, { ry: a }); mbox(0.5, 0.55, 0.07, c, sx - Math.sin(a) * 0.24, 0.72, sz - Math.cos(a) * 0.24, { ry: a }); mcyl(0.03, 0.45, '#444', sx, 0.22, sz, { cast: false, ol: false }); }
  mbox(1.1, 1.6, 0.85, '#3d4454', 9.15, 0.8, -13.42); mbox(0.8, 0.5, 0.05, '#ff5a5f', 9.15, 1.25, -12.98); mcyl(0.07, 0.12, '#ffffff', 9.0, 0.96, -12.85, { geo: CYL6 });
  mbox(2.74, 0.06, 0.79, '#3d4454', 5.85, 0.97, -13.48);
  mbox(0.7, 0.42, 0.5, '#e9edf1', 5.8, 1.21, -13.5); WORLD.microWin = mbox(0.38, 0.28, 0.02, null, 5.72, 1.21, -13.24, { mat: new THREE.MeshBasicMaterial({ color: '#2a2a30' }), ol: false, cast: false });
  mbox(1.3, 2, 0.65, '#ff5a5f', 1.95, 1, -13.52); mbox(0.9, 1.3, 0.04, null, 1.85, 1.15, -13.18, { mat: basic('#ffe9b0'), ol: false });
  mbox(1, 0.45, 3, '#5b6ee1', 1.7, 0.22, -9.9); mbox(0.3, 0.8, 3, '#4a5bc4', 1.35, 0.6, -9.9); for (const z of [-11.3, -8.5]) mbox(1, 0.6, 0.25, '#4a5bc4', 1.7, 0.35, z);
  mbox(1, 1.9, 1.2, '#9b6bff', 9.2, 0.95, -7.1); mbox(0.05, 0.7, 0.9, null, 8.68, 1.4, -7.1, { mat: basic('#33ffcc'), ol: false }); mbox(0.3, 0.1, 0.9, '#2a2135', 8.6, 0.95, -7.1); msph(0.05, '#ff5a5f', 8.55, 1.03, -7.25, { geo: ICO0 }); sign('ARCADE', 1, 0.3, 8.69, 1.95, -7.1, -Math.PI / 2, { bg: '#ffd23f', fg: '#2a2135' });
  sign('EMPLOYÉ DU MOIS : personne', 2.6, 0.5, 4.5, 2.4, -13.83, 0, { bg: '#ffc83d', fg: '#2a2135' });
  sign('SALLE DE PAUSE', 3, 0.55, 3, 3.3, -5.82, 0, { bg: '#c58b4f' });
  // bureau
  mbox(4, 0.09, 1, '#5b3d22', 14.6, 0.78, -12.7); for (const [x, z] of [[12.7, -13.1], [16.5, -13.1], [12.7, -12.3], [16.5, -12.3]]) mbox(0.08, 0.76, 0.08, '#3b2816', x, 0.38, z);
  for (let i = 0; i < 3; i++) { mbox(0.9, 0.55, 0.06, '#2a2135', 13.5 + i * 1.1, 1.18, -12.95); mbox(0.82, 0.47, 0.02, null, 13.5 + i * 1.1, 1.18, -12.91, { mat: basic('#4fd1ff'), ol: false }); }
  mbox(0.6, 0.08, 0.6, '#2a2135', 14.6, 0.5, -11.0); mbox(0.6, 0.7, 0.08, '#2a2135', 14.6, 0.85, -10.72);
  for (let z = -13.4; z < -9.4; z += 1.1) mbox(0.85, 1.35, 1.0, '#a9b2bc', 19.35, 0.67, z); // (la boucle d'origine ne s'exécutait jamais : les classeurs n'avaient pas de caisson)
  mbox(1, 1.1, 1, '#e9edf1', 10.9, 0.55, -8.7); mbox(0.7, 0.12, 0.6, '#3d4454', 10.9, 1.16, -8.7); mbox(0.5, 0.02, 0.4, '#ffffff', 11.2, 1.05, -8.7);
  mcyl(0.25, 0.5, '#c0663a', 10.7, 0.25, -6.6, { geo: CYL6 }); msph(0.5, '#4fae3f', 10.7, 0.95, -6.6, { geo: ICO0 });
  mbox(3, 1.6, 0.06, '#ffffff', 16.5, 2.0, -13.84); sign('PLANNING  ✔ ✘ ✔ ✔ ✘', 2.6, 0.4, 16.5, 2.5, -13.8, 0, { bg: null, fg: '#2d7dd2' });
  sign('OBJECTIF : 100 %', 2.4, 0.5, 13.5, 2.5, -13.83, 0, { bg: '#ffffff', fg: '#2a2135' });
  sign('DIRECTION', 2.6, 0.55, 18.8, 3.3, -5.82, 0, { bg: '#ffc83d', fg: '#2a2135' });
}
function buildBunting() {
  // guirlandes de fanions sous le plafond
  const cols = ['#ff5a5f', '#ffd23f', '#1fb5a3', '#ff8a3d', '#9b6bff', '#56c271'];
  const tri = new THREE.BufferGeometry(); tri.setAttribute('position', new THREE.BufferAttribute(new Float32Array([-0.16, 0, 0, 0.16, 0, 0, 0, -0.32, 0]), 3)); tri.computeVertexNormals();
  const lines = [[-19.5, 6.2, 19.5, 6.2], [-19.5, -4.5, 19.5, -4.5], [-11.5, -4.5, -11.5, 13.5], [7, -4.5, 7, 13.5]];
  let n = 0; for (const [x0, z0, x1, z1] of lines) n += Math.floor(Math.hypot(x1 - x0, z1 - z0) / 0.5);
  const im = new THREE.InstancedMesh(tri, new THREE.MeshBasicMaterial({ color: '#fff', side: THREE.DoubleSide }), n); const col = new THREE.Color(); let k = 0;
  for (const [x0, z0, x1, z1] of lines) { const L = Math.hypot(x1 - x0, z1 - z0), cnt = Math.floor(L / 0.5), ry = Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2;
    for (let i = 0; i < cnt; i++) { const t = (i + 0.5) / cnt; DUMMY.position.set(lerp(x0, x1, t), 3.62 - Math.sin(t * Math.PI * 6) * 0.06, lerp(z0, z1, t)); DUMMY.rotation.set(0, ry, 0); DUMMY.scale.set(1, 1, 1); DUMMY.updateMatrix(); im.setMatrixAt(k, DUMMY.matrix); im.setColorAt(k, col.set(cols[k % cols.length])); k++; }
    mbox(L, 0.015, 0.015, '#2a2135', (x0 + x1) / 2, 3.63, (z0 + z1) / 2, { ry: Math.atan2(x1 - x0, z1 - z0) + Math.PI / 2, cast: false, ol: false }); }
  scene.add(im);
}

// ---------- fusion des meshes statiques + contours ----------
function mergeStatic() {
  scene.updateMatrixWorld(true);
  const groups = new Map();
  for (const o of [...scene.children]) {
    if (!o.isMesh || o.isInstancedMesh || o.children.length || o.userData.dyn) continue; const m = o.material;
    if (!m || m.transparent || m.map || m.side === THREE.BackSide || !(m.isMeshStandardMaterial || m.isMeshBasicMaterial)) continue;
    const key = m.uuid + '|' + o.castShadow + '|' + o.receiveShadow + '|' + !!o.userData.noOL; if (!groups.has(key)) groups.set(key, []); groups.get(key).push(o);
  }
  const v = new THREE.Vector3(), nm = new THREE.Matrix3(); let merged = 0; const olGeos = [];
  for (const list of groups.values()) {
    let vc = 0, ic = 0; for (const m of list) { const g = m.geometry; vc += g.attributes.position.count; ic += g.index ? g.index.count : g.attributes.position.count; }
    const pos = new Float32Array(vc * 3), nor = new Float32Array(vc * 3), idx = new Uint32Array(ic); let vo = 0, io = 0;
    for (const m of list) {
      const g = m.geometry, P = g.attributes.position, N = g.attributes.normal; nm.getNormalMatrix(m.matrixWorld);
      for (let i = 0; i < P.count; i++) { v.fromBufferAttribute(P, i).applyMatrix4(m.matrixWorld); pos[(vo + i) * 3] = v.x; pos[(vo + i) * 3 + 1] = v.y; pos[(vo + i) * 3 + 2] = v.z; if (N) { v.fromBufferAttribute(N, i).applyMatrix3(nm).normalize(); nor[(vo + i) * 3] = v.x; nor[(vo + i) * 3 + 1] = v.y; nor[(vo + i) * 3 + 2] = v.z; } }
      if (g.index) for (let i = 0; i < g.index.count; i++) idx[io + i] = g.index.getX(i) + vo; else for (let i = 0; i < P.count; i++) idx[io + i] = vo + i;
      vo += P.count; io += g.index ? g.index.count : P.count; scene.remove(m); merged++;
      if (!m.userData.noOL && m.material.isMeshStandardMaterial) { const wg = g.clone(); wg.applyMatrix4(m.matrixWorld); wg.computeBoundingBox(); const sz = wg.boundingBox.getSize(v); const mn = Math.min(sz.x, sz.y, sz.z); olGeos.push(outlineGeo(wg, clamp(mn * 0.12, 0.008, 0.03))); wg.dispose(); }
    }
    const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('normal', new THREE.BufferAttribute(nor, 3)); geo.setIndex(new THREE.BufferAttribute(idx, 1)); geo.computeBoundingSphere();
    const mesh = new THREE.Mesh(geo, list[0].material); mesh.castShadow = list[0].castShadow; mesh.receiveShadow = list[0].receiveShadow; scene.add(mesh);
  }
  return merged + olMerge(olGeos);
}
function olMerge(list) {
  let n = 0; for (const g of list) n += g.attributes.position.count; if (!n) return 0;
  const pos = new Float32Array(n * 3); let o = 0; for (const g of list) { pos.set(g.attributes.position.array, o); o += g.attributes.position.count * 3; g.dispose(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.computeBoundingSphere();
  scene.add(new THREE.Mesh(geo, OUTLINE_MAT)); return 0;
}

// ---------- état dynamique ----------
const easeOutBack = (t) => { const c1 = 1.9, u = t - 1; return 1 + (c1 + 1) * u * u * u + c1 * u * u; };
const _q1 = new THREE.Quaternion(), _q2 = new THREE.Quaternion(), _v1 = new THREE.Vector3(), _one = new THREE.Vector3(1, 1, 1), _m1 = new THREE.Matrix4();
// pyramide : chaque conserve suit sa trajectoire (les plus hautes partent en premier, puis roulent et rebondissent) ; à la remise en place, elles sautent une à une sur le socle
function setPyramid(fallen, instant) {
  WORLD.pyrFallen = fallen;
  if (instant) { WORLD.pyrA = null; for (let k = 0; k < WORLD.pyrStand.length; k++) { const m = fallen ? WORLD.pyrFall[k] : WORLD.pyrStand[k]; WORLD.pyr.setMatrixAt(k, m); WORLD.pyrOl.setMatrixAt(k, m); } WORLD.pyr.instanceMatrix.needsUpdate = true; WORLD.pyrOl.instanceMatrix.needsUpdate = true; return; }
  WORLD.pyrA = { t: 0, fall: fallen };
  if (fallen) { fxDust(8, 0.5, 2.6, 16, 1.5); fxShake(0.8, 8, 2.5); } else fxSparkle(8, 1.3, 2.5, 12);
}
function animPyramid(dt) {
  const A = WORLD.pyrA; if (!A) return; A.t += dt; let done = true;
  for (let k = 0; k < WORLD.pyrK.length; k++) {
    const c = WORLD.pyrK[k]; let u;
    if (A.fall) u = clamp((A.t - ((4 - c.L) * 0.06 + c.r1 * 0.1)) / (0.55 + c.r2 * 0.3), 0, 1); else u = clamp((A.t - (c.L * 0.16 + c.r1 * 0.12)) / 0.34, 0, 1);
    if (u < 1) done = false;
    if (A.fall) {
      _v1.lerpVectors(c.sp, c.fp, 1 - (1 - u) * (1 - u)); _v1.y = lerp(c.sp.y, c.fp.y, u * u) + (0.2 + c.r2 * 0.45) * 4 * u * (1 - u) * (1 - u) + (u > 0.82 ? Math.sin(((u - 0.82) / 0.18) * Math.PI) * 0.07 : 0);
      _q1.slerpQuaternions(c.sq, c.fq, u); _q2.setFromAxisAngle(c.ax, 4 * u * (1 - u) * 3.5); _q1.multiply(_q2);
    } else { const e = u * u * (3 - 2 * u); _v1.lerpVectors(c.fp, c.sp, e); _v1.y += Math.sin(u * Math.PI) * 0.45; _q1.slerpQuaternions(c.fq, c.sq, e); }
    _m1.compose(_v1, _q1, _one); WORLD.pyr.setMatrixAt(k, _m1); WORLD.pyrOl.setMatrixAt(k, _m1);
  }
  WORLD.pyr.instanceMatrix.needsUpdate = true; WORLD.pyrOl.instanceMatrix.needsUpdate = true; if (done) WORLD.pyrA = null;
}
const PUDDLE_GEO = new THREE.CircleGeometry(1, 22);
function puddle(g, color, s = 1) { const p = new THREE.Mesh(PUDDLE_GEO, new THREE.MeshStandardMaterial({ color, transparent: true, opacity: 0.94, roughness: 0.06, metalness: 0, depthWrite: false })); p.rotation.x = -Math.PI / 2; p.position.y = 0.016; p.scale.set(rnd(0.7, 0.95) * s, rnd(0.55, 0.8) * s, 1); p.rotation.z = rnd(0, 3); p.receiveShadow = true; g.add(p); const p2 = p.clone(); p2.scale.set(0.35 * s, 0.3 * s, 1); p2.position.set(rnd(-0.6, 0.6), 0.017, rnd(-0.6, 0.6)); g.add(p2); }
function messMesh(m) {
  const g = new THREE.Group(); g.position.set(m[2], 0, m[3]); const t = m[1]; let fy = 0.3;
  if (t === 'lait') { puddle(g, '#fbfbff'); const bt = mcyl(0.09, 0.32, '#ffffff', 0.3, 0.09, 0.1, { parent: g, geo: CYL6 }); bt.rotation.z = Math.PI / 2; msph(0.06, '#2d7dd2', 0.47, 0.09, 0.1, { parent: g, geo: ICO0 }); g.userData.flat = true; fxSplash(m[2], 0.15, m[3], '#ffffff', 14); }
  else if (t === 'tag' || t === 'mix') {
    const gi = Math.floor(m[4] / 2), side = m[4] % 2 ? 1 : -1; g.position.set(GOND_X[gi] + side * 0.62, 0, 1); fy = 1;
    if (t === 'tag') for (let i = 0; i < 9; i++) { const tg = mbox(0.02, 0.1, 0.17, pick(['#ff3b3b', '#ffd400', '#ff8a3d']), 0, [0.36, 0.92, 1.48][i % 3], -3 + i * 0.85 + rnd(-0.2, 0.2), { parent: g, cast: false, ol: false }); tg.rotation.x = rnd(-0.8, 0.8); }
    else for (let i = 0; i < 10; i++) mbox(0.24, 0.3, 0.22, pick(['#ff5a5f', '#9b6bff', '#56c271', '#ffd23f', '#2d7dd2']), side * rnd(0.3, 1.1), 0.15, rnd(-2.5, 4.5), { parent: g, ry: rnd(0, 3), ol: false });
  }
  else if (t === 'smoke') { g.position.set(5.8, 0, -13.2); fy = 1.3; for (let i = 0; i < 6; i++) msph(0.07, '#d6a066', rnd(-0.35, 0.35), 1.0, rnd(0, 0.3), { parent: g, geo: ICO0, ol: false }); for (let i = 0; i < 3; i++) mbox(0.3, 0.012, 0.22, '#3a2a22', rnd(-0.3, 0.3), 0.985, rnd(0.05, 0.25), { parent: g, ry: rnd(0, 3), ol: false, cast: false }); }
  else if (t === 'melt') { puddle(g, '#9fdcff', 1.1); for (let i = 0; i < 4; i++) mbox(0.2, 0.1, 0.2, pick(['#ff9ecb', '#ffd23f', '#ffffff']), rnd(-0.5, 0.5), 0.06, rnd(-0.6, 0.6), { parent: g, ol: false }); g.userData.flat = true; fxSplash(m[2], 0.15, m[3], '#bfe9ff', 10); }
  else if (t === 'burn') { g.position.set(15.5, 0, -4.9); fy = 1.4; for (let i = 0; i < 4; i++) { const b = mcyl(0.06, 0.55, '#2a1a12', -0.6 + i * 0.4, 1.12, 0.05, { parent: g, geo: CYL6 }); b.rotation.z = Math.PI / 2; } }
  g.userData.a = 0; g.userData.fy = fy; g.scale.setScalar(0.001); scene.add(g); return g;
}
function syncWorld(Gs) {
  const dt = Math.min(0.1, Math.max(0, WORLD.clock - WORLD.lc)); WORLD.lc = WORLD.clock;
  for (let i = 0; i < SHELVES.length; i++) { const m = displayMask(Gs, i); if (m !== WORLD.masks[i]) setShelfMask(i, m); }
  animShelves(dt);
  const py = !!Gs?.py; if (py !== WORLD.pyrFallen) setPyramid(py, !Gs); animPyramid(dt);
  const ms = Gs?.ms || []; const ids = new Set(ms.map((m) => m[0]));
  for (const [id, o] of WORLD.messes) if (!ids.has(id)) { if (o) { WORLD.dying.push({ o, t: 0 }); if (Gs) fxSparkle(o.position.x, o.userData.fy, o.position.z, 9); } WORLD.messes.delete(id); }
  for (const m of ms) if (!WORLD.messes.has(m[0])) WORLD.messes.set(m[0], m[1] === 'pyr' ? null : messMesh(m));
  // les dégâts apparaissent en s'étalant / en rebondissant, et disparaissent en se résorbant
  for (const o of WORLD.messes.values()) if (o && o.userData.a < 1) { const a = (o.userData.a = Math.min(1, o.userData.a + dt / 0.5)), e = easeOutBack(a); if (o.userData.flat) o.scale.set(e, Math.min(1, a * 3), e); else o.scale.setScalar(e); }
  for (let i = WORLD.dying.length - 1; i >= 0; i--) { const d = WORLD.dying[i]; d.t += dt / 0.28; if (d.t >= 1) { scene.remove(d.o); WORLD.dying.splice(i, 1); } else d.o.scale.setScalar(1 - d.t); }
  if (Gs) fxWorld(Gs, dt);
  decorTick(dt, Gs);
  // four, micro-ondes, téléphone
  const t = WORLD.clock;
  const ov = Gs?.ov?.[0] ?? 0; const wc = WORLD.ovenWin.material.color;
  if (ov === 1) wc.setRGB(1.7, 0.62 + 0.2 * Math.sin(t * 4), 0.12); else if (ov === 2) wc.setRGB(2.3, 1.7 + 0.3 * Math.sin(t * 8), 0.5); else if (ov === 3) wc.setRGB(0.15, 0.1, 0.1); else wc.set('#3b2a2a');
  const smokeOn = ms.some((m) => m[1] === 'smoke'); if (smokeOn && Math.sin(t * 10) > 0) WORLD.microWin.material.color.setRGB(2.4, 1.0, 0.25); else WORLD.microWin.material.color.set('#2a2a30');
  const ring = (Gs?.tel || 0) > 0; WORLD.phone.rotation.z = ring ? Math.sin(t * 40) * 0.15 : 0; WORLD.phone.position.y = 1.18 + (ring ? Math.abs(Math.sin(t * 20)) * 0.05 : 0);
}

// ---------- surbrillance de l'emplacement visé ----------
let GHOST = null;
function setGhost(pl) {
  if (!GHOST) { GHOST = new THREE.Mesh(new THREE.BoxGeometry(1, 1, 1), new THREE.MeshBasicMaterial({ color: '#3ee0a1', transparent: true, opacity: 0.45, depthWrite: false })); GHOST.renderOrder = 8; scene.add(GHOST); }
  if (!pl) { GHOST.visible = false; return; }
  const S2 = SHELVES[pl.si]; const [x, y, z] = slotPos(pl.si, pl.slot < 0 ? 0 : pl.slot);
  GHOST.visible = pl.slot >= 0 || pl.wrong || pl.take; GHOST.material.color.set(pl.take ? '#ffd23f' : pl.ok ? '#3ee0a1' : '#ff5a5f'); GHOST.material.opacity = pl.take ? 0.18 + 0.08 * Math.sin(WORLD.clock * 6) : 0.35 + 0.15 * Math.sin(WORLD.clock * 8);
  if (S2.kind === 'freezer') { GHOST.scale.set(0.5, 0.25, 0.7); GHOST.position.set(x, y + 0.12, z); } else { GHOST.scale.set(0.5, 0.42, S2.dz * 0.92); GHOST.position.set(x, y + 0.21, z); }
}

// ---------- vue 1re personne : ce qu'on tient en main ----------
const VM = { scene: null, cam: null, groups: {}, prods: [], cur: -1, bob: 0, n: -1, cat: -1 };
function initVM() {
  VM.scene = new THREE.Scene(); VM.cam = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 10);
  VM.scene.environment = ENV.in; VM.scene.add(new THREE.HemisphereLight('#ffffff', '#b9a68e', 0.5)); const dl = new THREE.DirectionalLight('#eaf2ff', 1.5); dl.position.set(1, 2, 1); VM.scene.add(dl);
  addEventListener('resize', () => { VM.cam.aspect = innerWidth / innerHeight; VM.cam.updateProjectionMatrix(); });
  const root = new THREE.Group(); VM.root = root; VM.scene.add(root);
  const ol = (m, t = 0.012) => { const sc = Math.min(m.scale.x, m.scale.y, m.scale.z) || 1; const o = new THREE.Mesh(outlineGeo(m.geometry, t / sc), OUTLINE_MAT); o.position.copy(m.position); o.rotation.copy(m.rotation); o.scale.copy(m.scale); m.parent.add(o); return m; };
  const box = (w, h, d, c, x, y, z, parent, o = {}) => { const m = new THREE.Mesh(rboxGeo(w, h, d, Math.min(w, h, d) * 0.18), mat(c)); m.position.set(x, y, z); if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; parent.add(m); if (o.ol !== false) ol(m); return m; };
  const hands = (g, y, z, w) => { for (const sd of [-1, 1]) { const h = new THREE.Mesh(SPHG, mat('#f2bf91')); h.scale.set(0.07, 0.06, 0.09); h.position.set(sd * w, y, z); g.add(h); ol(h, 0.008); } };
  // 1 : carton ouvert
  const g1 = new THREE.Group(); box(0.46, 0.28, 0.36, '#d9a066', 0, 0, 0, g1); box(0.46, 0.02, 0.15, '#c88a50', 0, 0.17, -0.24, g1, { rx: -0.9 }); box(0.46, 0.02, 0.15, '#c88a50', 0, 0.17, 0.24, g1, { rx: 0.9 }); box(0.02, 0.13, 0.36, '#c88a50', -0.29, 0.18, 0, g1, { rz: 0.9 }); box(0.02, 0.13, 0.36, '#c88a50', 0.29, 0.18, 0, g1, { rz: -0.9 }); box(0.47, 0.04, 0.02, '#ffd23f', 0, 0.02, 0.185, g1, { ol: false });
  hands(g1, -0.02, 0.02, 0.27); VM.groups[1] = g1;
  // 2 : caisse
  const g2 = new THREE.Group(); box(0.48, 0.24, 0.36, '#3a86ff', 0, 0, 0, g2); hands(g2, -0.02, 0.02, 0.28); VM.groups[2] = g2;
  for (const g of [g1, g2]) { const arr = []; for (let k = 0; k < BOX_SIZE; k++) { const m = new THREE.Mesh(new THREE.BoxGeometry(0.09, 0.12, 0.12), mat('#ffffff')); m.position.set(-0.165 + (k % 4) * 0.11, 0.12, -0.075 + Math.floor(k / 4) * 0.15); g.add(m); arr.push(m); } g.userData.prods = arr; }
  // 3 : caddie (poignée)
  const g3 = new THREE.Group(); box(0.8, 0.05, 0.05, '#ff5a5f', 0, 0.05, 0, g3); box(0.7, 0.3, 0.02, '#c9d2db', 0, -0.12, -0.2, g3); hands(g3, 0.05, 0.02, 0.25); VM.groups[3] = g3;
  // 4 : sac poubelle
  const g4 = new THREE.Group(); const bag = new THREE.Mesh(SPHG, mat('#2a2a30')); bag.scale.set(0.16, 0.2, 0.14); bag.position.set(0.18, -0.05, 0); g4.add(bag); ol(bag, 0.01); box(0.05, 0.06, 0.05, '#ffd23f', 0.18, 0.17, 0, g4); hands(g4, 0.2, 0, 0.18); VM.groups[4] = g4;
  // 5 : affiche
  const g5 = new THREE.Group(); box(0.42, 0.56, 0.01, '#ffd23f', 0, 0.05, 0, g5); box(0.34, 0.12, 0.012, '#ff5a5f', 0, 0.16, 0.005, g5, { ol: false }); hands(g5, -0.18, 0.02, 0.22); VM.groups[5] = g5;
  // 6 : un produit tenu à la main
  const g6 = new THREE.Group(); const pm = new THREE.Mesh(PGEO.box, mat('#ffffff')); const po = new THREE.Mesh(PGEO_OL.box, OUTLINE_MAT); g6.add(pm, po); g6.userData.pm = pm; g6.userData.po = po; const hd = new THREE.Mesh(SPHG, mat('#f2bf91')); hd.scale.set(0.07, 0.06, 0.09); hd.position.set(0.06, -0.12, 0.03); g6.add(hd); ol(hd, 0.008); VM.groups[6] = g6;
  for (const k in VM.groups) { VM.groups[k].visible = false; root.add(VM.groups[k]); }
}
function updateVM(dt, carry, box, moving) {
  if (!VM.root) return false;
  for (const k in VM.groups) VM.groups[k].visible = +k === carry;
  if (!carry) return false;
  VM.bob += dt * (moving ? 9 : 2);
  const g = VM.groups[carry];
  if (carry === 1 || carry === 2) {
    const n = box ? box.n : 0, cat = box ? box.cat : 0;
    if (n !== VM.n || cat !== VM.cat) { VM.n = n; VM.cat = cat; g.userData.prods.forEach((m, k) => { m.visible = k < n; m.material = mat(PALETTES[cat]?.[k % 3] || '#ffffff'); }); }
  }
  if (carry === 6 && box) { const key = box.cat + ':' + (box.v | 0); if (VM.pk !== key) { VM.pk = key; const ty = ptypeOf(box.cat, box.v | 0); g.userData.pm.geometry = PGEO[ty]; g.userData.po.geometry = PGEO_OL[ty]; g.userData.pm.material = prodMat(box.cat, box.v | 0); } }
  const off = { 1: [0.3, -0.4, -0.78], 2: [0.3, -0.4, -0.78], 3: [0, -0.5, -0.6], 4: [0.25, -0.4, -0.6], 5: [0.28, -0.3, -0.7], 6: [0.27, -0.3, -0.72] }[carry];
  VM.root.position.set(off[0] + Math.sin(VM.bob) * (moving ? 0.012 : 0.004), off[1] + Math.abs(Math.cos(VM.bob)) * (moving ? 0.018 : 0.006), off[2]);
  VM.root.rotation.set(carry <= 2 ? 0.32 : carry === 6 ? 0.15 : 0.1, carry <= 2 ? -0.35 : carry === 5 ? -0.3 : carry === 6 ? -0.5 : 0, 0); VM.root.scale.setScalar(carry <= 2 ? 0.72 : carry === 6 ? 0.8 : 1);
  return true;
}

// ---------- marqueurs flottants ----------
const MARKER_TEX = new Map();
function markerTex(icon, color) {
  const key = icon + color; if (MARKER_TEX.has(key)) return MARKER_TEX.get(key);
  const t = canvasTex(128, 160, (x) => { x.fillStyle = '#2a2135'; x.beginPath(); x.arc(64, 60, 57, 0, Math.PI * 2); x.fill(); x.beginPath(); x.moveTo(32, 100); x.lineTo(96, 100); x.lineTo(64, 156); x.closePath(); x.fill(); x.fillStyle = color; x.beginPath(); x.arc(64, 60, 50, 0, Math.PI * 2); x.fill(); x.beginPath(); x.moveTo(38, 100); x.lineTo(90, 100); x.lineTo(64, 146); x.closePath(); x.fill(); x.font = '58px "Apple Color Emoji","Segoe UI Emoji","Noto Color Emoji",sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillStyle = '#fff'; x.fillText(icon, 64, 64); });
  MARKER_TEX.set(key, t); return t;
}
function setMarkers(list, camPos) {
  while (WORLD.markerPool.length < list.length) { const sp = new THREE.Sprite(new THREE.SpriteMaterial({ depthTest: false, depthWrite: false, transparent: true })); sp.renderOrder = 20; sp.layers.set(1); scene.add(sp); WORLD.markerPool.push(sp); }
  WORLD.markerPool.forEach((sp, i) => {
    const m = list[i]; if (!m) { sp.visible = false; return; }
    sp.visible = true; const tex = markerTex(m.icon, m.color); if (sp.material.map !== tex) { sp.material.map = tex; sp.material.needsUpdate = true; }
    const d = Math.hypot(camPos.x - m.x, camPos.z - m.z); const s = clamp(d * 0.045, 0.45, 1.6) * (m.small ? 0.75 : 1);
    sp.scale.set(s * 0.8, s, 1); sp.position.set(m.x, (m.y || 2.5) + Math.sin(WORLD.clock * 3 + i) * 0.12 + s * 0.3, m.z); sp.material.opacity = d < 2 ? 0.45 : 0.95;
  });
}
