// ======================= PERSONNAGES (chibi low-poly, contours cartoon) =======================
const CG = {
  head: new THREE.IcosahedronGeometry(1, 1), ico0: new THREE.IcosahedronGeometry(1, 0), ico1: new THREE.IcosahedronGeometry(1, 1),
  body: new THREE.CylinderGeometry(0.26, 0.33, 0.62, 7), cyl6: new THREE.CylinderGeometry(1, 1, 1, 6), cyl8: new THREE.CylinderGeometry(1, 1, 1, 8),
  arm: new THREE.CylinderGeometry(0.07, 0.085, 0.36, 6), leg: new THREE.CylinderGeometry(0.095, 0.105, 0.38, 6), box: new THREE.BoxGeometry(1, 1, 1),
  hemi: new THREE.SphereGeometry(1, 8, 4, 0, Math.PI * 2, 0, Math.PI / 2), cone: new THREE.ConeGeometry(1, 1, 5), bob: new THREE.CylinderGeometry(0.3, 0.36, 0.22, 8),
  arc: new THREE.TorusGeometry(0.38, 0.035, 5, 10, Math.PI), ring: new THREE.TorusGeometry(1, 0.18, 4, 10),
};
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
function compose(list) {
  let n = 0;
  const parts = list.map(([geo, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0]) => { const g = geo.index ? geo.toNonIndexed() : geo.clone(); _m4.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)); g.applyMatrix4(_m4); n += g.attributes.position.count; return [g, color]; });
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const [g, color] of parts) { const P = g.attributes.position; pos.set(P.array, o * 3); _c.set(color); for (let i = 0; i < P.count; i++) { col[(o + i) * 3] = _c.r; col[(o + i) * 3 + 1] = _c.g; col[(o + i) * 3 + 2] = _c.b; } o += P.count; g.dispose(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); geo.computeVertexNormals(); geo.computeBoundingSphere(); return geo;
}
const CHAR_CACHE = new Map();
function charGeos(sk, cust) {
  const key = sk.join(',') + (cust ? 'c' : ''); if (CHAR_CACHE.has(key)) return CHAR_CACHE.get(key);
  const shirt = SHIRTS[sk[0] % SHIRTS.length], skin = SKINS[sk[1] % SKINS.length], hair = HAIRS[sk[1] % HAIRS.length], hat = sk[2] % HATS.length, acc = sk[3] % ACCS.length;
  const pants = cust ? pick(['#3d5a80', '#5b4a3a', '#2b2d42', '#6d597a']) : '#2c3550', dark = '#2a2135', white = '#ffffff';
  // tête
  const headMain = [[CG.head, skin, 0, 0, 0, 0.36, 0.34, 0.34], [CG.hemi, hair, 0, 0.06, -0.03, 0.375, 0.3, 0.37]];
  if (hat === 1) headMain.push([CG.hemi, '#e63946', 0, 0.13, 0, 0.375, 0.24, 0.375], [CG.box, '#e63946', 0, 0.14, 0.36, 0.34, 0.035, 0.26]);
  else if (hat === 2) headMain.push([CG.hemi, '#2d7dd2', 0, 0.06, 0, 0.385, 0.36, 0.385], [CG.cyl8, '#ffffff', 0, 0.08, 0, 0.39, 0.1, 0.39], [CG.ico0, '#ffffff', 0, 0.47, 0, 0.1, 0.1, 0.1]);
  else if (hat === 3) headMain.push([CG.cyl8, '#e8c872', 0, 0.22, 0, 0.6, 0.04, 0.6], [CG.cyl8, '#e8c872', 0, 0.34, 0, 0.3, 0.22, 0.3], [CG.cyl8, '#d62828', 0, 0.27, 0, 0.305, 0.06, 0.305]);
  else if (hat === 4) headMain.push([CG.cyl8, white, 0, 0.42, 0, 0.26, 0.32, 0.26], [CG.ico1, white, 0, 0.63, 0, 0.32, 0.2, 0.32]);
  else if (hat === 5) { headMain.push([CG.cyl8, '#ffc83d', 0, 0.36, 0, 0.27, 0.16, 0.27]); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; headMain.push([CG.cone, '#ffc83d', Math.cos(a) * 0.23, 0.5, Math.sin(a) * 0.23, 0.055, 0.14, 0.055]); } }
  else if (hat === 6) headMain.push([CG.bob, '#b5a27a', 0, 0.28, 0], [CG.cyl8, '#b5a27a', 0, 0.18, 0, 0.47, 0.03, 0.47]);
  else if (hat === 7) for (const s of [-1, 1]) headMain.push([CG.cyl6, '#333', 0.12 * s, 0.45, 0, 0.014, 0.32, 0.014, 0, 0, -0.35 * s], [CG.ico0, '#6be36b', 0.19 * s, 0.62, 0, 0.07, 0.07, 0.07]);
  const face = [];
  for (const s of [-1, 1]) face.push([CG.ico1, white, 0.13 * s, 0.02, 0.29, 0.085, 0.1, 0.045], [CG.ico0, dark, 0.13 * s, 0.01, 0.325, 0.05, 0.055, 0.03], [CG.ico0, white, 0.115 * s, 0.04, 0.345, 0.018, 0.018, 0.01], [CG.box, dark, 0.13 * s, 0.15, 0.31, 0.11, 0.025, 0.02, 0, 0, 0.12 * s], [CG.ico0, '#ff9aa8', 0.22 * s, -0.09, 0.26, 0.055, 0.035, 0.02]);
  face.push([CG.ico0, skin, 0, -0.05, 0.35, 0.05, 0.05, 0.05], [CG.box, dark, 0, -0.15, 0.315, 0.12, 0.025, 0.02]);
  if (acc === 1) face.push([CG.box, '#111111', 0, 0.03, 0.33, 0.48, 0.1, 0.05]);
  else if (acc === 2) for (const s of [-1, 1]) face.push([CG.box, '#4a2c17', 0.065 * s, -0.1, 0.34, 0.12, 0.045, 0.04, 0, 0, 0.25 * s]);
  else if (acc === 4) { headMain.push([CG.arc, '#2a2135', 0, 0.02, 0]); for (const s of [-1, 1]) headMain.push([CG.cyl8, '#ff5a5f', 0.38 * s, 0.02, 0, 0.1, 0.08, 0.1, 0, 0, Math.PI / 2]); }
  else if (acc === 5) { for (const s of [-1, 1]) face.push([CG.ring, '#333333', 0.13 * s, 0.03, 0.335, 0.085, 0.085, 0.085]); face.push([CG.box, '#333333', 0, 0.04, 0.34, 0.06, 0.012, 0.012]); }
  // torse
  const torso = [[CG.body, shirt, 0, 0.82, 0], [CG.cyl6, skin, 0, 1.17, 0, 0.1, 0.1, 0.1]];
  if (!cust) torso.push([CG.box, '#1fb5a3', 0, 0.72, 0.28, 0.36, 0.38, 0.05], [CG.box, white, 0.09, 0.82, 0.31, 0.11, 0.06, 0.02], [CG.box, '#1fb5a3', -0.1, 0.96, 0.25, 0.03, 0.2, 0.03], [CG.box, '#1fb5a3', 0.1, 0.96, 0.25, 0.03, 0.2, 0.03]);
  else torso.push([CG.box, pick(['#ffffff', '#ffd23f', '#2a2135', '#ff8a3d']), 0, 1.06, 0.06, 0.5, 0.06, 0.5]);
  if (acc === 3) for (const s of [-1, 1]) torso.push([CG.cone, '#d62828', 0.07 * s, 1.1, 0.27, 0.06, 0.12, 0.04, 0, 0, (Math.PI / 2) * s]);
  const arm = [[CG.arm, shirt, 0, -0.18, 0], [CG.ico1, skin, 0, -0.4, 0, 0.09, 0.09, 0.09]];
  const armB = cust ? [...arm, [CG.box, '#ff5a5f', 0, -0.55, 0.05, 0.3, 0.2, 0.22], [CG.box, '#ffd23f', 0, -0.44, 0.05, 0.12, 0.08, 0.1]] : arm;
  const leg = [[CG.leg, pants, 0, -0.19, 0], [CG.box, '#4a3022', 0, -0.42, 0.05, 0.2, 0.12, 0.3]];
  const res = { head: compose([...headMain, ...face]), headOl: outlineGeo(compose(headMain), 0.022), torso: compose(torso), torsoOl: outlineGeo(compose([[CG.body, shirt, 0, 0.82, 0]]), 0.022), arm: compose(arm), armB: compose(armB), armOl: outlineGeo(compose([[CG.arm, shirt, 0, -0.18, 0]]), 0.018), leg: compose(leg), legOl: outlineGeo(compose([[CG.leg, pants, 0, -0.19, 0]]), 0.018) };
  CHAR_CACHE.set(key, res); return res;
}
function makeChar(sk, name, opts = {}) {
  const ch = { sk: null, name: null, mgr: null, ghost: false, cust: !!opts.cust, t: Math.random() * 10, root: new THREE.Group(), rig: new THREE.Group(), mats: [] };
  ch.mat = new THREE.MeshToonMaterial({ vertexColors: true, gradientMap: gradTex }); ch.olMat = new THREE.MeshBasicMaterial({ color: '#2a2135', side: THREE.BackSide }); ch.mats.push(ch.mat, ch.olMat);
  ch.root.add(ch.rig);
  ch.legL = new THREE.Group(); ch.legL.position.set(-0.12, 0.5, 0); ch.legR = new THREE.Group(); ch.legR.position.set(0.12, 0.5, 0);
  ch.armL = new THREE.Group(); ch.armL.position.set(-0.33, 1.05, 0); ch.armR = new THREE.Group(); ch.armR.position.set(0.33, 1.05, 0);
  ch.head = new THREE.Group(); ch.head.position.y = 1.5; ch.torsoG = new THREE.Group();
  ch.rig.add(ch.legL, ch.legR, ch.armL, ch.armR, ch.head, ch.torsoG);
  // directeur
  ch.tie = new THREE.Group(); ch.rig.add(ch.tie); const mRed = mat('#d62828'); mbox(0.09, 0.34, 0.03, null, 0, 0.82, 0.33, { parent: ch.tie, mat: mRed, ol: false }); mbox(0.12, 0.08, 0.04, null, 0, 1.0, 0.32, { parent: ch.tie, mat: mRed, ol: false });
  ch.clip = new THREE.Group(); ch.armL.add(ch.clip); mbox(0.24, 0.32, 0.02, '#8b5a2b', 0, -0.5, 0.12, { parent: ch.clip, ol: false }); mbox(0.2, 0.26, 0.01, '#ffffff', 0, -0.5, 0.135, { parent: ch.clip, ol: false });
  // objets portés
  ch.carryObj = {};
  const cb = (w, h, d, color, x, y, z, parent) => { const g = new THREE.BoxGeometry(w, h, d); const m = new THREE.Mesh(g, mat(color)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); const o = new THREE.Mesh(outlineGeo(g, 0.018), ch.olMat); o.position.copy(m.position); parent.add(o); return m; };
  const g1 = new THREE.Group(); cb(0.5, 0.38, 0.42, '#d9a066', 0, 0.92, 0.5, g1); cb(0.5, 0.02, 0.07, '#a87a45', 0, 1.115, 0.5, g1); ch.carryObj[1] = g1;
  const g2 = new THREE.Group(); cb(0.52, 0.28, 0.4, '#3a86ff', 0, 0.88, 0.5, g2); for (let i = 0; i < 4; i++) cb(0.08, 0.18, 0.08, '#ffffff', -0.18 + i * 0.12, 1.08, 0.5, g2); ch.carryObj[2] = g2;
  const g3 = new THREE.Group(); cartModel(0, 0, 0.95, 0, g3); ch.carryObj[3] = g3;
  const g4 = new THREE.Group(); const bag = new THREE.Mesh(SPHG, mat('#2a2a30')); bag.scale.set(0.28, 0.34, 0.26); bag.position.set(0.32, 0.55, 0.15); g4.add(bag); cb(0.06, 0.1, 0.06, '#ffd23f', 0.32, 0.9, 0.15, g4); ch.carryObj[4] = g4;
  const g5 = new THREE.Group(); cb(0.55, 0.75, 0.03, '#ffd23f', 0, 1.0, 0.45, g5); cb(0.45, 0.2, 0.035, '#ff5a5f', 0, 1.15, 0.45, g5); ch.carryObj[5] = g5;
  const g6 = new THREE.Group(); cb(0.2, 0.28, 0.16, '#ff8a3d', 0.12, 1.02, 0.42, g6); cb(0.21, 0.08, 0.17, '#ffd23f', 0.12, 1.05, 0.42, g6); ch.carryObj[6] = g6;
  for (const k in ch.carryObj) { ch.carryObj[k].visible = false; ch.root.add(ch.carryObj[k]); }
  ch.carry = 0; ch.labelY = 2.12; ch.label = null; ch.bubble = null; ch.bubbleT = 0; ch.zzz = null; ch.icon = null; ch.iconKey = '';
  scene.add(ch.root);
  setCharSkin(ch, sk); if (name) setCharName(ch, name, false);
  return ch;
}
function setCharSkin(ch, sk) {
  sk = sk || [0, 0, 0, 0]; const key = sk.join(','); if (ch.skKey === key) return; ch.skKey = key; ch.sk = sk;
  const G = charGeos(sk, ch.cust);
  for (const g of [ch.head, ch.torsoG, ch.armL, ch.armR, ch.legL, ch.legR]) for (const c of [...g.children]) if (c.userData.part) g.remove(c);
  const add = (grp, geo, ol) => { const m = new THREE.Mesh(geo, ch.mat); m.castShadow = true; m.userData.part = 1; grp.add(m); if (ol) { const o = new THREE.Mesh(ol, ch.olMat); o.userData.part = 1; o.userData.ol = 1; grp.add(o); } };
  add(ch.head, G.head, G.headOl); add(ch.torsoG, G.torso, G.torsoOl); add(ch.armL, G.armB, G.armOl); add(ch.armR, G.arm, G.armOl); add(ch.legL, G.leg, G.legOl); add(ch.legR, G.leg, G.legOl);
}
function setCharName(ch, name, mgr) {
  if (ch.name === name && ch.mgr === mgr) return; ch.name = name; ch.mgr = mgr;
  if (ch.label) { ch.root.remove(ch.label); ch.label.material.map.dispose(); ch.label.material.dispose(); }
  ch.label = labelSprite((mgr ? '👔 ' : '') + name, mgr ? { bg: 'rgba(255,200,61,.95)', fg: '#2a2135' } : {}); ch.label.position.y = ch.labelY; ch.root.add(ch.label);
  ch.tie.visible = !!mgr; ch.clip.visible = !!mgr;
}
function setCharGhost(ch, on) {
  if (ch.ghost === on) return; ch.ghost = on;
  ch.mat.transparent = on; ch.mat.opacity = on ? 0.32 : 1; ch.mat.depthWrite = !on; ch.mat.needsUpdate = true; ch.olMat.visible = !on;
  ch.root.traverse((o) => { if (o.isMesh) o.castShadow = !on; });
}
function setCharCarry(ch, c) { if (ch.carry === c) return; ch.carry = c; for (const k in ch.carryObj) ch.carryObj[k].visible = +k === c; }
function charBubble(ch, text, opts) {
  if (ch.bubble) { ch.root.remove(ch.bubble); ch.bubble.material.map.dispose(); ch.bubble.material.dispose(); }
  const t = text.length > 34 ? text.slice(0, 33) + '…' : text;
  ch.bubble = labelSprite((opts?.raw ? '' : '💬 ') + t, { bg: 'rgba(255,255,255,.96)', fg: '#2a2135', size: 36 }); ch.bubble.position.y = ch.labelY + 0.42; ch.root.add(ch.bubble); ch.bubbleT = opts?.time || 5;
}
function setCharIcon(ch, icon) {
  if (ch.iconKey === icon) return; ch.iconKey = icon;
  if (ch.icon) { ch.root.remove(ch.icon); ch.icon.material.map.dispose(); ch.icon = null; }
  if (icon) { ch.icon = labelSprite(icon, { bg: 'rgba(255,255,255,.95)', fg: '#2a2135', size: 44 }); ch.icon.position.y = 2.3; ch.root.add(ch.icon); }
}
function animChar(ch, anim, dt, dist) {
  ch.t += dt * (anim === 1 ? 10 : 4); const t = ch.t; const rig = ch.rig;
  rig.rotation.set(0, 0, 0); rig.position.set(0, 0, 0); rig.scale.set(1, 1, 1);
  let la = 0, ra = 0, ll = 0, rl = 0, hr = 0, lz = 0, rz = 0;
  if (anim === 1) { const s = Math.sin(t) * 0.8; ll = s; rl = -s; la = -s * 0.9; ra = s * 0.9; rig.position.y = Math.abs(Math.cos(t)) * 0.08; rig.rotation.z = Math.sin(t) * 0.04; }
  else if (anim === 2) { la = -1.3 + Math.sin(t * 2.6) * 0.4; ra = -1.3 + Math.cos(t * 2.6) * 0.4; hr = 0.3; rig.position.y = Math.abs(Math.sin(t * 2.6)) * 0.03; }
  else if (anim === 3) { ll = rl = -1.45; la = ra = -0.55; rig.position.y = -0.08; }
  else if (anim === 4) { rig.rotation.x = Math.PI / 2; rig.position.set(0, 0.78, 0.25); la = ra = -2.8; }
  else if (anim === 5) { la = ra = -2.6 + Math.sin(t * 3) * 0.3; lz = 0.3; rz = -0.3; rig.position.y = Math.abs(Math.sin(t * 3)) * 0.12; }
  else { rig.scale.y = 1 + Math.sin(t * 0.8) * 0.015; la = Math.sin(t * 0.8) * 0.06; ra = -la; }
  if (ch.carry && anim !== 4) { la = ra = -1.3; lz = rz = 0; }
  ch.legL.rotation.x = ll; ch.legR.rotation.x = rl; ch.armL.rotation.set(la, 0, lz); ch.armR.rotation.set(ra, 0, rz); ch.head.rotation.x = hr;
  if (anim === 4 && !ch.zzz) { ch.zzz = labelSprite('💤 Zzz…', { bg: 'rgba(120,170,255,.9)' }); ch.zzz.position.y = 1.6; ch.root.add(ch.zzz); }
  if (anim !== 4 && ch.zzz) { ch.root.remove(ch.zzz); ch.zzz.material.map.dispose(); ch.zzz = null; }
  if (ch.bubble) { ch.bubbleT -= dt; if (ch.bubbleT <= 0) { ch.root.remove(ch.bubble); ch.bubble.material.map.dispose(); ch.bubble = null; } }
  if (ch.label) ch.label.visible = dist === undefined || dist < 26;
  if (ch.icon) ch.icon.position.y = 2.3 + Math.sin(t * 1.5) * 0.06;
}
function disposeChar(ch) {
  scene.remove(ch.root);
  ch.root.traverse((o) => { if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); } });
  for (const m of ch.mats) m.dispose();
}
