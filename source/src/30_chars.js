// ======================= PERSONNAGES (chibi low-poly, contours cartoon) =======================
const CG = {
  head: new THREE.IcosahedronGeometry(1, 2), ico0: new THREE.IcosahedronGeometry(1, 0), ico1: new THREE.IcosahedronGeometry(1, 1),
  body: new THREE.CylinderGeometry(0.26, 0.33, 0.62, 10), cyl6: new THREE.CylinderGeometry(1, 1, 1, 6), cyl8: new THREE.CylinderGeometry(1, 1, 1, 10),
  arm: new THREE.CylinderGeometry(0.07, 0.085, 0.36, 8), leg: new THREE.CylinderGeometry(0.095, 0.105, 0.38, 8), box: new THREE.BoxGeometry(1, 1, 1),
  hemi: new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), cone: new THREE.ConeGeometry(1, 1, 5), bob: new THREE.CylinderGeometry(0.3, 0.36, 0.22, 10),
  arc: new THREE.TorusGeometry(0.38, 0.035, 5, 10, Math.PI), ring: new THREE.TorusGeometry(1, 0.18, 4, 10),
};
const _m4 = new THREE.Matrix4(), _q = new THREE.Quaternion(), _e = new THREE.Euler(), _p = new THREE.Vector3(), _s = new THREE.Vector3(), _c = new THREE.Color();
// assemble des morceaux colorés en une géométrie ; les boîtes ont les arêtes adoucies et les volumes ronds sont lissés
function compose(list) {
  let n = 0;
  const parts = list.map(([geo, color, x = 0, y = 0, z = 0, sx = 1, sy = 1, sz = 1, rx = 0, ry = 0, rz = 0]) => {
    let g;
    if (geo === CG.box) { g = rboxGeo(sx, sy, sz, Math.min(Math.abs(sx), Math.abs(sy), Math.abs(sz)) * 0.3).toNonIndexed(); _m4.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(1, 1, 1)); }
    else { g = geo.index ? geo.toNonIndexed() : geo.clone(); _m4.compose(_p.set(x, y, z), _q.setFromEuler(_e.set(rx, ry, rz)), _s.set(sx, sy, sz)); }
    g.applyMatrix4(_m4); n += g.attributes.position.count; return [g, color];
  });
  const pos = new Float32Array(n * 3), col = new Float32Array(n * 3); let o = 0;
  for (const [g, color] of parts) { const P = g.attributes.position; pos.set(P.array, o * 3); _c.set(color); for (let i = 0; i < P.count; i++) { col[(o + i) * 3] = _c.r; col[(o + i) * 3 + 1] = _c.g; col[(o + i) * 3 + 2] = _c.b; } o += P.count; g.dispose(); }
  const geo = new THREE.BufferGeometry(); geo.setAttribute('position', new THREE.BufferAttribute(pos, 3)); geo.setAttribute('color', new THREE.BufferAttribute(col, 3)); creaseGeo(geo, 58); geo.computeBoundingSphere(); return geo;
}
const CHAR_CACHE = new Map();
function charGeos(sk, cust) {
  const key = sk.join(',') + (cust ? 'c' : ''); if (CHAR_CACHE.has(key)) return CHAR_CACHE.get(key);
  const shirt = SHIRTS[sk[0] % SHIRTS.length], skin = SKINS[sk[1] % SKINS.length], hair = HAIRS[sk[1] % HAIRS.length], hat = sk[2] % HATS.length, acc = sk[3] % ACCS.length;
  const pants = cust ? pick(['#3d5a80', '#5b4a3a', '#2b2d42', '#6d597a']) : '#2c3550', dark = '#2a2135', white = '#ffffff';
  // tête
  const headMain = [[CG.head, skin, 0, 0, 0, 0.36, 0.34, 0.34], [CG.hemi, hair, 0, 0.06, -0.03, 0.375, 0.3, 0.37], [CG.hemi, hair, 0, -0.01, -0.035, 0.368, 0.335, 0.31, -Math.PI / 2]]; // calotte + arrière du crâne (de dos, on voit des cheveux et non un visage vide)
  if (cust) { const hs = (sk[0] + sk[1] * 2 + sk[2]) % 3; if (hs === 1) headMain.push([CG.ico1, hair, 0, 0.3, -0.2, 0.15, 0.15, 0.15]); else if (hs === 2) headMain.push([CG.cyl8, hair, 0, -0.22, -0.2, 0.26, 0.34, 0.14]); } // clients : chignon ou cheveux longs
  if (hat === 1) headMain.push([CG.hemi, '#e63946', 0, 0.13, 0, 0.375, 0.24, 0.375], [CG.box, '#e63946', 0, 0.14, 0.36, 0.34, 0.035, 0.26]);
  else if (hat === 2) headMain.push([CG.hemi, '#2d7dd2', 0, 0.06, 0, 0.385, 0.36, 0.385], [CG.cyl8, '#ffffff', 0, 0.08, 0, 0.39, 0.1, 0.39], [CG.ico0, '#ffffff', 0, 0.47, 0, 0.1, 0.1, 0.1]);
  else if (hat === 3) headMain.push([CG.cyl8, '#e8c872', 0, 0.22, 0, 0.6, 0.04, 0.6], [CG.cyl8, '#e8c872', 0, 0.34, 0, 0.3, 0.22, 0.3], [CG.cyl8, '#d62828', 0, 0.27, 0, 0.305, 0.06, 0.305]);
  else if (hat === 4) headMain.push([CG.cyl8, white, 0, 0.42, 0, 0.26, 0.32, 0.26], [CG.ico1, white, 0, 0.63, 0, 0.32, 0.2, 0.32]);
  else if (hat === 5) { headMain.push([CG.cyl8, '#ffc83d', 0, 0.36, 0, 0.27, 0.16, 0.27]); for (let k = 0; k < 5; k++) { const a = (k / 5) * Math.PI * 2; headMain.push([CG.cone, '#ffc83d', Math.cos(a) * 0.23, 0.5, Math.sin(a) * 0.23, 0.055, 0.14, 0.055]); } }
  else if (hat === 6) headMain.push([CG.bob, '#b5a27a', 0, 0.28, 0], [CG.cyl8, '#b5a27a', 0, 0.18, 0, 0.47, 0.03, 0.47]);
  else if (hat === 7) for (const s of [-1, 1]) headMain.push([CG.cyl6, '#333', 0.12 * s, 0.45, 0, 0.014, 0.32, 0.014, 0, 0, -0.35 * s], [CG.ico0, '#6be36b', 0.19 * s, 0.62, 0, 0.07, 0.07, 0.07]);
  const face = [];
  for (const s of [-1, 1]) face.push([CG.ico1, white, 0.13 * s, 0.02, 0.29, 0.085, 0.1, 0.045], [CG.ico0, dark, 0.13 * s, 0.01, 0.325, 0.05, 0.055, 0.03], [CG.ico0, white, 0.115 * s, 0.04, 0.345, 0.018, 0.018, 0.01], [CG.ico0, '#ff9aa8', 0.22 * s, -0.09, 0.26, 0.055, 0.035, 0.02]);
  face.push([CG.ico0, skin, 0, -0.05, 0.35, 0.05, 0.05, 0.05]);
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
// ombre de contact : disque doux sous chaque personnage (ancre les pieds au sol, quel que soit le niveau de graphismes)
// proportions cartoon : grosse tête, petit corps (purement visuel : la taille de collision ne change pas)
const HEAD_S = 1.28, HEAD_Y = 1.43, BODY_SY = 0.9, BODY_SX = 0.94, CARRY_DY = -0.1;
const BROW_GEO = rboxGeo(0.12, 0.03, 0.022, 0.008), MOUTH_GEO = rboxGeo(0.12, 0.026, 0.02, 0.008), SMILE_GEO = new THREE.TorusGeometry(0.06, 0.015, 5, 10, Math.PI);
// pièces mobiles du visage : sourcils, bouche (trait, sourire, « o »), langue
function faceParts(parent, fmat) {
  const F = { brows: [-1, 1].map((sd) => { const b = new THREE.Mesh(BROW_GEO, fmat); b.position.set(0.13 * sd, 0.15, 0.315); b.rotation.z = 0.12 * sd; parent.add(b); return b; }) };
  F.line = new THREE.Mesh(MOUTH_GEO, fmat); F.line.position.set(0, -0.15, 0.318); parent.add(F.line);
  F.smile = new THREE.Mesh(SMILE_GEO, fmat); F.smile.position.set(0, -0.11, 0.325); F.smile.rotation.z = Math.PI; F.smile.visible = false; parent.add(F.smile);
  F.o = new THREE.Mesh(LID_GEO, fmat); F.o.scale.set(0.05, 0.06, 0.03); F.o.position.set(0, -0.15, 0.325); F.o.visible = false; parent.add(F.o);
  F.tongue = new THREE.Mesh(LID_GEO, mat('#ff7a8a')); F.tongue.scale.set(0.028, 0.03, 0.02); F.tongue.position.set(0.045, -0.165, 0.335); F.tongue.visible = false; parent.add(F.tongue);
  return F;
}
let BLOB_MAT = null; const BLOB_GEO = new THREE.CircleGeometry(0.46, 18), LID_GEO = new THREE.IcosahedronGeometry(1, 1);
function blobMat() { if (!BLOB_MAT) BLOB_MAT = new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }), color: '#22152a', transparent: true, opacity: 0.42, depthWrite: false }); return BLOB_MAT; }
function makeChar(sk, name, opts = {}) {
  const ch = { sk: null, name: null, mgr: null, ghost: false, cust: !!opts.cust, t: Math.random() * 10, root: new THREE.Group(), rig: new THREE.Group(), mats: [], ols: [], spd: 0, hitT: 0, blinkT: rnd(1, 4), lookT: rnd(0.5, 3), lookY: 0, lookX: 0, zT: 0, olOn: true, out: false, A: { la: 0, ra: 0, ll: 0, rl: 0, lz: 0, rz: 0, hx: 0, hy: 0, hz: 0, ty: 0, by: 0, lean: 0, roll: 0, flat: 0, sq: 0 } };
  ch.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.74, metalness: 0 }); ch.olMat = new THREE.MeshBasicMaterial({ color: '#2a2135', side: THREE.BackSide }); ch.fmat = new THREE.MeshStandardMaterial({ color: '#2a2135', roughness: 0.6 }); ch.mats.push(ch.mat, ch.olMat, ch.fmat);
  ch.root.add(ch.rig);
  ch.legL = new THREE.Group(); ch.legL.position.set(-0.12, 0.45, 0); ch.legR = new THREE.Group(); ch.legR.position.set(0.12, 0.45, 0); ch.legL.scale.y = ch.legR.scale.y = BODY_SY;
  ch.armL = new THREE.Group(); ch.armL.position.set(-0.33 * BODY_SX, 1.05 * BODY_SY, 0); ch.armR = new THREE.Group(); ch.armR.position.set(0.33 * BODY_SX, 1.05 * BODY_SY, 0);
  ch.head = new THREE.Group(); ch.head.position.y = HEAD_Y; ch.head.scale.setScalar(HEAD_S); ch.torsoG = new THREE.Group(); ch.torsoG.scale.set(BODY_SX, BODY_SY, BODY_SX);
  ch.rig.add(ch.legL, ch.legR, ch.armL, ch.armR, ch.head, ch.torsoG);
  // paupières (clignement, sieste) et bouche en « o » (surprise)
  ch.lids = [-1, 1].map((s) => { const l = new THREE.Mesh(LID_GEO, mat(SKINS[0], { kind: 'matte' })); l.scale.set(0.097, 0.112, 0.062); l.position.set(0.13 * s, 0.022, 0.31); l.visible = false; ch.head.add(l); return l; });
  ch.F = faceParts(ch.head, ch.fmat); ch.ex = { tilt: 0.12, by: 0, lid: 0 };
  ch.blob = new THREE.Mesh(BLOB_GEO, blobMat()); ch.blob.rotation.x = -Math.PI / 2; ch.blob.position.y = 0.022; ch.blob.renderOrder = 1; ch.root.add(ch.blob);
  // directeur
  ch.tie = new THREE.Group(); ch.torsoG.add(ch.tie); const mRed = mat('#d62828'); mbox(0.09, 0.34, 0.03, null, 0, 0.82, 0.33, { parent: ch.tie, mat: mRed, ol: false }); mbox(0.12, 0.08, 0.04, null, 0, 1.0, 0.32, { parent: ch.tie, mat: mRed, ol: false });
  ch.clip = new THREE.Group(); ch.armL.add(ch.clip); mbox(0.24, 0.32, 0.02, '#8b5a2b', 0, -0.5, 0.12, { parent: ch.clip, ol: false }); mbox(0.2, 0.26, 0.01, '#ffffff', 0, -0.5, 0.135, { parent: ch.clip, ol: false });
  // objets portés (attachés au buste : ils suivent le balancement de la marche)
  ch.carryObj = {};
  const cb = (w, h, d, color, x, y, z, parent) => { const g = rboxGeo(w, h, d, Math.min(w, h, d) * 0.2); const m = new THREE.Mesh(g, mat(color)); m.position.set(x, y, z); m.castShadow = true; parent.add(m); const o = new THREE.Mesh(outlineGeo(g, 0.018), ch.olMat); o.position.copy(m.position); parent.add(o); return m; };
  const g1 = new THREE.Group(); cb(0.5, 0.38, 0.42, '#d9a066', 0, 0.92, 0.5, g1); cb(0.5, 0.02, 0.07, '#a87a45', 0, 1.115, 0.5, g1); ch.carryObj[1] = g1;
  const g2 = new THREE.Group(); cb(0.52, 0.28, 0.4, '#3a86ff', 0, 0.88, 0.5, g2); for (let i = 0; i < 4; i++) cb(0.08, 0.18, 0.08, '#ffffff', -0.18 + i * 0.12, 1.08, 0.5, g2); ch.carryObj[2] = g2;
  const g3 = new THREE.Group(); cartModel(0, 0, 0.95, 0, g3); ch.carryObj[3] = g3;
  const g4 = new THREE.Group(); const bag = new THREE.Mesh(SPHG, mat('#2a2a30')); bag.scale.set(0.28, 0.34, 0.26); bag.position.set(0.32, 0.55, 0.15); g4.add(bag); cb(0.06, 0.1, 0.06, '#ffd23f', 0.32, 0.9, 0.15, g4); ch.carryObj[4] = g4;
  const g5 = new THREE.Group(); cb(0.55, 0.75, 0.03, '#ffd23f', 0, 1.0, 0.45, g5); cb(0.45, 0.2, 0.035, '#ff5a5f', 0, 1.15, 0.45, g5); ch.carryObj[5] = g5;
  const g6 = new THREE.Group(); cb(0.2, 0.28, 0.16, '#ff8a3d', 0.12, 1.02, 0.42, g6); cb(0.21, 0.08, 0.17, '#ffd23f', 0.12, 1.05, 0.42, g6); ch.carryObj[6] = g6;
  compactGroup(ch.tie); compactGroup(ch.clip);
  for (const k in ch.carryObj) { compactGroup(ch.carryObj[k]); if (k === '3') compactGroup(ch.carryObj[k].children[0]); ch.carryObj[k].visible = false; if (k !== '3') ch.carryObj[k].position.y = CARRY_DY; (k === '3' ? ch.root : ch.rig).add(ch.carryObj[k]); }
  ch.carry = 0; ch.prevCarry = 0; ch.workAgo = 9; ch.throwT = 0; ch.swT = 0; ch.labelY = 2.25; ch.label = null; ch.bubble = null; ch.bubbleT = 0; ch.zzz = null; ch.icon = null; ch.iconKey = '';
  if (ch.cust) { const h = 0.92 + ((sk[0] * 7 + sk[1] * 3 + sk[2]) % 5) * 0.036, w = 0.94 + ((sk[0] + sk[3] * 2) % 4) * 0.045; ch.root.scale.set(w, h, w); } // clients : tailles et carrures variées
  scene.add(ch.root);
  setCharSkin(ch, sk); if (name) setCharName(ch, name, false);
  return ch;
}
function setCharSkin(ch, sk) {
  sk = sk || [0, 0, 0, 0]; const key = sk.join(','); if (ch.skKey === key) return; ch.skKey = key; ch.sk = sk;
  const G = charGeos(sk, ch.cust);
  for (const g of [ch.head, ch.torsoG, ch.armL, ch.armR, ch.legL, ch.legR]) for (const c of [...g.children]) if (c.userData.part) g.remove(c);
  ch.ols = [];
  const add = (grp, geo, ol) => { const m = new THREE.Mesh(geo, ch.mat); m.castShadow = true; m.userData.part = 1; grp.add(m); if (ol) { const o = new THREE.Mesh(ol, ch.olMat); o.userData.part = 1; o.userData.ol = 1; o.visible = ch.olOn; grp.add(o); ch.ols.push(o); } };
  add(ch.head, G.head, G.headOl); add(ch.torsoG, G.torso, G.torsoOl); add(ch.armL, G.armB, G.armOl); add(ch.armR, G.arm, G.armOl); add(ch.legL, G.leg, G.legOl); add(ch.legR, G.leg, G.legOl);
  const lm = mat(SKINS[sk[1] % SKINS.length], { kind: 'matte' }); for (const l of ch.lids) l.material = lm;
  ch.canBlink = sk[3] % ACCS.length !== 1 && sk[3] % ACCS.length !== 5; // pas de paupières par-dessus des lunettes
}
function setCharName(ch, name, mgr) {
  if (ch.name === name && ch.mgr === mgr) return; ch.name = name; ch.mgr = mgr;
  if (ch.label) { ch.root.remove(ch.label); ch.label.material.map.dispose(); ch.label.material.dispose(); }
  ch.label = labelSprite((mgr ? '👔 ' : '') + name, mgr ? { bg: 'rgba(255,200,61,.95)', fg: '#2a2135' } : {}); ch.label.position.y = ch.labelY; ch.root.add(ch.label);
  ch.tie.visible = !!mgr; ch.clip.visible = !!mgr;
}
function setCharGhost(ch, on) {
  if (ch.ghost === on) return; ch.ghost = on;
  ch.mat.transparent = on; if (!on) ch.mat.opacity = 1; ch.mat.depthWrite = !on; ch.mat.needsUpdate = true; ch.olMat.visible = !on; ch.blob.visible = !on; ch.F.tongue.visible = false; // l'opacité descend en fondu dans animChar
  ch.root.traverse((o) => { if (o.isMesh) o.castShadow = !on && o !== ch.blob; });
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
  if (icon) { ch.icon = labelSprite(icon, { bg: 'rgba(255,255,255,.95)', fg: '#2a2135', size: 44 }); ch.icon.position.y = 2.42; ch.root.add(ch.icon); }
}
// anim : 0 repos · 1 marche / course · 2 travail / mise en rayon · 3 assis · 4 sieste · 5 danse (borne d'arcade) · 6 abattu · 7 panique
const THROW_T = 0.42;
function animChar(ch, anim, dt, dist) {
  const A = ch.A, rig = ch.rig, px = ch.root.position.x, pz = ch.root.position.z;
  // vitesse réelle : la cadence des pas et l'inclinaison du corps en dépendent
  let spd = 0; if (ch.px !== undefined && dt > 1e-4) spd = Math.min(9, Math.hypot(px - ch.px, pz - ch.pz) / dt); ch.px = px; ch.pz = pz; ch.spd += (spd - ch.spd) * Math.min(1, dt * 8);
  const walk = anim === 1, run = walk ? clamp((ch.spd - 5.2) / 1.0, 0, 1) : 0; ch.t += dt * (walk ? 5.3 + Math.min(ch.spd, 7) * 1.02 : 4); const t = ch.t, c = ch.carry;
  // lancer : la charge disparaît des mains alors qu'on n'était pas en train de travailler → geste de lancer
  ch.workAgo = anim === 2 ? 0 : ch.workAgo + dt; if (ch.prevCarry && !c && ch.workAgo > 0.5 && anim !== 3 && anim !== 4) ch.throwT = THROW_T; ch.prevCarry = c;
  let la = 0, ra = 0, ll = 0, rl = 0, lz = 0, rz = 0, hx = 0, hy = 0, hz = 0, ty = 0, by = 0, lean = 0, roll = 0, flat = 0, sy = 1;
  let face = 'neutre';
  ch.lookT -= dt; if (ch.lookT <= 0) { ch.lookT = rnd(1.4, 4.5); ch.lookY = Math.random() < 0.65 ? rnd(-0.6, 0.6) : 0; ch.lookX = rnd(-0.1, 0.12); }
  const placing = anim === 2 && (c === 1 || c === 2 || c === 6);
  if (walk) { // marche → course : foulée plus ample, buste penché, bras qui pompent, rebond plus haut
    const s = Math.sin(t); ll = s * (0.8 + run * 0.35); rl = -ll; la = -s * (0.7 + run * 0.55) - run * 0.35; ra = s * (0.7 + run * 0.55) - run * 0.35; by = Math.abs(Math.cos(t)) * (0.07 + run * 0.07); roll = s * (0.045 + run * 0.03); ty = s * (0.14 + run * 0.1); hy = -s * 0.07; lean = 0.05 + Math.min(ch.spd, 7) * 0.022 + run * 0.12; hx = -lean * 0.6; if (run > 0.5) face = 'effort'; }
  else if (placing) { // mise en rayon : une main tient la charge, l'autre va chercher l'étagère, le regard suit
    const k = Math.sin(t * 2.4), reach = Math.max(0, k); ra = -1.55 - reach * 0.75; rz = -0.12 * reach; la = c === 6 ? 0.1 : -1.25; lean = 0.1 + reach * 0.1; hx = -0.12 - reach * 0.12; ty = -reach * 0.25; by = reach * 0.03; face = 'concentre'; }
  else if (anim === 2) { la = -1.3 + Math.sin(t * 2.6) * 0.4; ra = -1.3 + Math.cos(t * 2.6) * 0.4; hx = 0.3; by = Math.abs(Math.sin(t * 2.6)) * 0.03; lean = 0.1; ty = Math.sin(t * 1.3) * 0.08; face = 'concentre'; }
  else if (anim === 3) { ll = rl = -1.45; la = ra = -0.55; by = -0.08; hy = ch.lookY * 0.8; hx = ch.lookX; sy = 1 + Math.sin(t * 0.8) * 0.012; }
  else if (anim === 4) { flat = 1; la = ra = -2.7; lz = 0.45; rz = -0.45; ll = -0.12; rl = -0.95 + Math.sin(t * 0.55) * 0.05; sy = 1 + Math.sin(t * 0.55) * 0.045; hz = 0.14 + Math.sin(t * 0.55) * 0.03; face = 'dodo'; }
  else if (anim === 5) { // danse : déhanché, bras qui pompent en alternance, pas chassés
    const b = t * 2, s = Math.sin(b); by = Math.abs(s) * 0.1; roll = s * 0.13; ty = s * 0.32; la = -2.3 + s * 0.7; ra = -1.2 - s * 1.0; lz = -0.7; rz = 0.7; ll = Math.max(0, s) * 0.55; rl = Math.max(0, -s) * 0.55; hz = s * 0.16; hx = -0.08 + Math.abs(Math.cos(b)) * 0.12; face = 'joie'; }
  else if (anim === 6) { hx = 0.5; lean = 0.12; by = -0.03 + Math.sin(t * 0.9) * 0.01; hz = Math.sin(t * 0.7) * 0.05; face = 'triste'; }
  else if (anim === 7) { // panique : bras en l'air, tête qui cherche une issue, piétinement
    la = -2.75 + Math.sin(t * 3.4) * 0.35; ra = -2.75 + Math.cos(t * 3.1) * 0.35; lz = -0.95 - Math.sin(t * 3.4) * 0.2; rz = 0.95 + Math.cos(t * 3.1) * 0.2; hy = Math.sin(t * 2.6) * 0.7; ll = Math.sin(t * 4) * 0.5; rl = -ll; by = Math.abs(Math.sin(t * 4)) * 0.07; roll = Math.sin(t * 5) * 0.05; face = 'panique'; }
  else { sy = 1 + Math.sin(t * 0.8) * 0.015; la = Math.sin(t * 0.8) * 0.06; ra = -la; hy = ch.lookY; hx = ch.lookX; ty = ch.lookY * 0.2; }
  // port de charge : les mains restent sur la charge, léger dandinement en arrière sous le poids ; le bras libre continue de se balancer
  if (c && anim !== 4 && !placing) { const step = walk ? Math.abs(Math.sin(t)) * 0.06 : 0; if (c === 4) { ra = -0.1; rz = 0; } else if (c === 6) { ra = -1.3 + step; rz = 0; } else { la = ra = (c === 3 ? -1.1 : -1.28) + step; lz = rz = 0; ty *= 0.3; if (c !== 3) { lean = walk ? -0.06 : -0.03; roll *= 1.6; hx = 0.06; if (walk) face = 'effort'; } } }
  if (ch.hitT > 0) { ch.hitT -= dt; hx = -0.35; la = ra = -2.2; lz = 0.7; rz = -0.7; face = 'panique'; }
  const k = 1 - Math.exp(-dt * 18), T = { la, ra, ll, rl, lz, rz, hx, hy, hz, ty, by, lean, roll, flat }; for (const n in T) A[n] += (T[n] - A[n]) * k;
  // lancer : armé en arrière, fouetté vers l'avant, accompagnement (pose imposée, sans lissage, pour garder le claquant)
  if (ch.throwT > 0) { ch.throwT -= dt; const p = 1 - Math.max(0, ch.throwT) / THROW_T; A.ra = p < 0.3 ? 0.9 * (p / 0.3) : p < 0.62 ? 0.9 - 3.5 * ((p - 0.3) / 0.32) : -2.6 + 1.9 * ((p - 0.62) / 0.38); A.rz = -0.15; A.ty = p < 0.3 ? 0.35 * (p / 0.3) : 0.35 - 0.8 * Math.min(1, (p - 0.3) / 0.4); A.lean = p < 0.3 ? -0.08 : 0.2 * Math.sin(Math.min(1, (p - 0.3) / 0.7) * Math.PI); face = 'effort'; }
  A.sq += ((ch.hitT > 0 ? 1 : 0) - A.sq) * (1 - Math.exp(-dt * 22));
  rig.rotation.set(A.lean + A.flat * Math.PI / 2, A.flat * Math.PI, A.roll); rig.position.set(0, A.by + A.flat * 0.78, A.flat * 0.25); rig.scale.set(1 + A.sq * 0.16, 1 - A.sq * 0.2, 1 + A.sq * 0.16);
  ch.legL.rotation.x = A.ll; ch.legR.rotation.x = A.rl; ch.armL.rotation.set(A.la, 0, A.lz); ch.armR.rotation.set(A.ra, 0, A.rz); ch.head.rotation.set(A.hx, A.hy, A.hz); ch.torsoG.rotation.y = A.ty; ch.torsoG.scale.y = BODY_SY * sy;
  if (c && ch.carryObj[c] && c !== 3) ch.carryObj[c].rotation.z = walk ? Math.sin(t) * 0.035 : 0;
  // ---- expressions : sourcils (hauteur, inclinaison), paupières (ouvertes, mi-closes, fermées), bouche ----
  const F = ch.F, E = ch.ex; let tilt = 0.12, bY = 0, lid = 0, mouth = 'line';
  if (face === 'concentre') { tilt = 0.42; bY = -0.022; lid = 0.5; mouth = 'tongue'; }
  else if (face === 'effort') { tilt = 0.34; bY = -0.012; }
  else if (face === 'dodo') { tilt = -0.05; bY = 0.012; lid = 1; mouth = 'o'; }
  else if (face === 'joie') { tilt = 0; bY = 0.03; mouth = 'smile'; }
  else if (face === 'triste') { tilt = -0.38; bY = 0.01; lid = 0.5; }
  else if (face === 'panique') { tilt = -0.42; bY = 0.05; mouth = 'O'; }
  ch.blinkT -= dt; if (ch.blinkT < -0.11) ch.blinkT = rnd(1.8, 5); if (ch.blinkT < 0 && face !== 'panique') lid = 1;
  const ke = 1 - Math.exp(-dt * 14); E.tilt += (tilt - E.tilt) * ke; E.by += (bY - E.by) * ke; E.lid += (lid - E.lid) * (1 - Math.exp(-dt * 30));
  const tremble = face === 'panique' ? Math.sin(t * 9) * 0.006 : 0;
  F.brows[0].rotation.z = -E.tilt; F.brows[1].rotation.z = E.tilt; F.brows[0].position.y = F.brows[1].position.y = 0.15 + E.by + tremble;
  const lv = ch.canBlink && !ch.ghost && E.lid > 0.08; if (ch.lids[0].visible !== lv) ch.lids[0].visible = ch.lids[1].visible = lv;
  if (lv) { const ly = 0.022 + (1 - E.lid) * 0.15; ch.lids[0].position.y = ch.lids[1].position.y = ly; }
  const show = (m, v) => { if (m.visible !== v) m.visible = v; };
  show(F.line, mouth === 'line' || mouth === 'tongue'); show(F.smile, mouth === 'smile'); show(F.o, mouth === 'o' || mouth === 'O'); show(F.tongue, mouth === 'tongue' && !ch.ghost);
  F.line.scale.x = mouth === 'tongue' ? 0.6 : 1;
  if (mouth === 'O') F.o.scale.set(0.075, 0.09 + Math.sin(t * 6) * 0.01, 0.03); else if (mouth === 'o') F.o.scale.set(0.035, 0.035 + Math.sin(t * 0.55) * 0.012, 0.03);
  if (ch.fmat.transparent !== ch.mat.transparent) { ch.fmat.transparent = ch.mat.transparent; ch.fmat.depthWrite = !ch.mat.transparent; ch.fmat.needsUpdate = true; } ch.fmat.opacity = ch.mat.opacity;
  // gouttes de sueur en cas de panique
  if (face === 'panique' && !ch.ghost && (dist === undefined || dist < 25)) { ch.swT -= dt; if (ch.swT <= 0) { ch.swT = 0.13; ch.head.getWorldPosition(_p); const a = rnd(0, 6.28); fxEmit({ x: _p.x + Math.cos(a) * 0.4, y: _p.y + 0.3, z: _p.z + Math.sin(a) * 0.4, vx: Math.cos(a) * 1.3, vy: rnd(1.2, 2.2), vz: Math.sin(a) * 1.3, life: 0.5, s0: 0.08, s1: 0.05, col: '#9fdcff', kind: 4, grav: 7 }); } }
  if (anim === 4) { ch.zT -= dt; if (ch.zT <= 0 && (dist === undefined || dist < 30)) { ch.zT = 0.75; ch.head.getWorldPosition(_p); fxZ(_p.x, _p.y + 0.35, _p.z); } }
  if (anim === 4 && !ch.zzz) { ch.zzz = labelSprite('💤 Zzz…', { bg: 'rgba(120,170,255,.9)' }); ch.zzz.position.y = 1.6; ch.root.add(ch.zzz); }
  if (anim !== 4 && ch.zzz) { ch.root.remove(ch.zzz); ch.zzz.material.map.dispose(); ch.zzz = null; }
  if (ch.bubble) { ch.bubbleT -= dt; if (ch.bubbleT <= 0) { ch.root.remove(ch.bubble); ch.bubble.material.map.dispose(); ch.bubble = null; } }
  if (ch.label) ch.label.visible = dist === undefined || dist < 26;
  if (ch.icon) ch.icon.position.y = 2.42 + Math.sin(t * 1.5) * 0.06;
  // fondu vers le mode fantôme, contours masqués au loin, reflets du ciel quand on sort du magasin
  if (ch.ghost && ch.mat.opacity > 0.32) ch.mat.opacity = Math.max(0.32, ch.mat.opacity - dt * 1.3);
  const olOn = dist === undefined || dist < GFX.q.olDist; if (olOn !== ch.olOn) { ch.olOn = olOn; for (const o of ch.ols) o.visible = olOn; }
  const out = !insideStore(px, pz); if (out !== ch.out) { ch.out = out; ch.mat.envMap = out ? ENV.out : null; }
}
function disposeChar(ch) {
  scene.remove(ch.root);
  ch.root.traverse((o) => { if (o.isSprite) { o.material.map?.dispose(); o.material.dispose(); } });
  for (const m of ch.mats) m.dispose();
}
// portrait : la tête du personnage rendue une fois en 3D dans une petite image (réunion, salon, écran de fin)
const PORTRAITS = new Map(); let PT = null;
function portraitURL(sk) {
  const key = sk.join(','); let u = PORTRAITS.get(key); if (u) return u;
  if (!PT) { PT = { sc: new THREE.Scene(), cam: new THREE.PerspectiveCamera(37, 1, 0.1, 10), rt: new THREE.WebGLRenderTarget(160, 160), grp: new THREE.Group(), mat: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.74 }), buf: new Uint8Array(160 * 160 * 4), lut: new Uint8Array(256), cv: document.createElement('canvas') };
    PT.sc.add(PT.grp, new THREE.HemisphereLight('#ffffff', '#c7b49c', 1.5)); const d = new THREE.DirectionalLight('#fff2e0', 2.4); d.position.set(1.5, 2.5, 3); PT.sc.add(d); PT.cam.position.set(0.5, 1.58, 2.55); PT.cam.lookAt(0, 1.5, 0); PT.fm = new THREE.MeshBasicMaterial({ color: '#2a2135' }); PT.cv.width = PT.cv.height = 160;
    for (let i = 0; i < 256; i++) { const c = i / 255; PT.lut[i] = Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); } }
  const G = charGeos(sk, false); PT.grp.clear();
  const h = new THREE.Mesh(G.head, PT.mat), ho = new THREE.Mesh(G.headOl, OUTLINE_MAT), tr = new THREE.Mesh(G.torso, PT.mat), to = new THREE.Mesh(G.torsoOl, OUTLINE_MAT); h.position.y = ho.position.y = HEAD_Y; h.scale.setScalar(HEAD_S); ho.scale.setScalar(HEAD_S); tr.scale.set(BODY_SX, BODY_SY, BODY_SX); to.scale.set(BODY_SX, BODY_SY, BODY_SX); const fg = new THREE.Group(); fg.position.y = HEAD_Y; fg.scale.setScalar(HEAD_S); const pf = faceParts(fg, PT.fm); pf.line.visible = false; pf.smile.visible = true; PT.grp.add(h, ho, tr, to, fg);
  const prevRT = renderer.getRenderTarget(), tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping; renderer.setRenderTarget(PT.rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(PT.sc, PT.cam);
  renderer.readRenderTargetPixels(PT.rt, 0, 0, 160, 160, PT.buf); renderer.setRenderTarget(prevRT); renderer.toneMapping = tm;
  const x = PT.cv.getContext('2d'), im = x.createImageData(160, 160);
  for (let j = 0; j < 160; j++) for (let i = 0; i < 160; i++) { const s = ((159 - j) * 160 + i) * 4, d = (j * 160 + i) * 4, a = PT.buf[s + 3], mx = Math.min(250, Math.max(PT.buf[s], PT.buf[s + 1], PT.buf[s + 2])), k = 255 / (255 - mx); // décompression des hautes lumières, puis sRGB
    im.data[d] = PT.lut[Math.min(255, Math.round(PT.buf[s] * k))]; im.data[d + 1] = PT.lut[Math.min(255, Math.round(PT.buf[s + 1] * k))]; im.data[d + 2] = PT.lut[Math.min(255, Math.round(PT.buf[s + 2] * k))]; im.data[d + 3] = a; }
  x.putImageData(im, 0, 0); u = PT.cv.toDataURL('image/png'); PORTRAITS.set(key, u); return u;
}
