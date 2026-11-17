// ======================= PERSONNAGES (cartoon low-poly lissé, contours) =======================
// volume « galet » : sphère basse définition déformée en superellipsoïde (n = 2 : sphère ; plus grand : boîte aux angles très arrondis), n pouvant varier du bas vers le haut, avec évasement vertical
function pebbleGeo(n, taper = 0, detail = 2, nTop = n) {
  const g = new THREE.IcosahedronGeometry(1, detail), P = g.attributes.position;
  for (let i = 0; i < P.count; i++) { let x = P.getX(i), y = P.getY(i), z = P.getZ(i); const e = n + (nTop - n) * (y * 0.5 + 0.5), r = Math.pow(Math.pow(Math.abs(x), e) + Math.pow(Math.abs(y), e) + Math.pow(Math.abs(z), e), -1 / e); x *= r; y *= r; z *= r; const k = 1 + taper * y; P.setXYZ(i, x * k, y, z * k); }
  return g;
}
const lat = (pts, seg = 16) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), seg); // profil tourné autour de l'axe vertical (chapeaux)
const shade = (hex, k) => '#' + new THREE.Color(hex).multiplyScalar(k).getHexString();
const CG = {
  head: new THREE.IcosahedronGeometry(1, 2), ico0: new THREE.IcosahedronGeometry(1, 0), ico1: new THREE.IcosahedronGeometry(1, 1),
  body: new THREE.CylinderGeometry(0.26, 0.33, 0.62, 10), cyl6: new THREE.CylinderGeometry(1, 1, 1, 6), cyl8: new THREE.CylinderGeometry(1, 1, 1, 10),
  arm: new THREE.CylinderGeometry(0.07, 0.085, 0.36, 8), leg: new THREE.CylinderGeometry(0.095, 0.105, 0.38, 8), box: new THREE.BoxGeometry(1, 1, 1),
  hemi: new THREE.SphereGeometry(1, 12, 5, 0, Math.PI * 2, 0, Math.PI / 2), cone: new THREE.ConeGeometry(1, 1, 5), bob: new THREE.CylinderGeometry(0.3, 0.36, 0.22, 10),
  arc: new THREE.TorusGeometry(0.38, 0.035, 5, 10, Math.PI), ring: new THREE.TorusGeometry(1, 0.18, 4, 10),
  cone8: new THREE.ConeGeometry(1, 1, 8), arcFat: new THREE.TorusGeometry(0.4, 0.045, 6, 14, Math.PI), ringFine: new THREE.TorusGeometry(1, 0.11, 6, 18), bow: pebbleGeo(2.6, 0.75, 1),
  hCap: lat([[0.39, 0.12], [0.392, 0.2], [0.36, 0.31], [0.26, 0.385], [0.12, 0.415], [0, 0.42]]),
  hBeanie: lat([[0.392, 0.1], [0.395, 0.2], [0.365, 0.33], [0.28, 0.43], [0.14, 0.475], [0, 0.485]]), hBeanieStripe: lat([[0.392, 0.24], [0.386, 0.27], [0.374, 0.3]]), hBeanieCuff: lat([[0.39, 0.02], [0.418, 0.04], [0.425, 0.09], [0.418, 0.14], [0.392, 0.16]]),
  hStrawBrim: lat([[0.27, 0.2], [0.46, 0.185], [0.6, 0.2], [0.64, 0.235], [0.6, 0.235], [0.46, 0.215], [0.27, 0.23]], 20), hStrawTop: lat([[0.305, 0.2], [0.3, 0.38], [0.27, 0.44], [0.16, 0.455], [0, 0.44]]), hStrawBand: lat([[0.312, 0.225], [0.31, 0.3]]),
  hToqueBand: lat([[0.29, 0.2], [0.275, 0.3], [0.285, 0.46]]),
  hCrown: lat([[0.3, 0.33], [0.325, 0.36], [0.315, 0.42], [0.335, 0.46], [0.3, 0.46], [0.285, 0.42], [0.29, 0.34]]),
  hBucket: lat([[0.35, 0.17], [0.5, 0.105], [0.525, 0.1], [0.52, 0.125], [0.37, 0.21], [0.345, 0.34], [0.27, 0.43], [0.13, 0.455], [0, 0.46]]), hBucketBand: lat([[0.378, 0.2], [0.36, 0.265]]),
  skull: pebbleGeo(2.75, -0.05, 2, 2.05), torso: pebbleGeo(3.3, 0.1, 2), pebble: pebbleGeo(2.8, 0, 1), hand: pebbleGeo(2.4, -0.12, 1), limb: new THREE.CapsuleGeometry(1, 2.3, 3, 9),
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
  // ---- nouveau design : trapu, grosse tête au menton carré-arrondi, cheveux en mèches, polo à col, mains rondes. Aucun cube : tout est galet, capsule ou ellipsoïde lissé. ----
  const collarC = cust ? pick(['#ffffff', '#ffd23f', '#2a2135', '#ff8a3d']) : shade(shirt, 0.86), skinD = shade(skin, 0.86), eye = '#3a2418';
  const hatted = hat === 1 || hat === 2 || hat === 3 || hat === 4 || hat === 6, hr = hatted ? 0.362 : 0.386;
  // tête : crâne rond en haut, mâchoire plus carrée ; oreilles ; calotte de cheveux inclinée (front dégagé, nuque couverte)
  const headMain = [[CG.skull, skin, 0, 0, 0, 0.37, 0.35, 0.34], [CG.hemi, hair, 0, 0.1, -0.04, hr, 0.29, hr - 0.012, -0.3], [CG.hemi, hair, 0, -0.02, -0.045, hr - 0.012, 0.335, 0.31, -Math.PI / 2]];
  for (const s of [-1, 1]) headMain.push([CG.ico1, skin, 0.365 * s, -0.015, 0.0, 0.055, 0.085, 0.05], [CG.ico0, skinD, 0.392 * s, -0.015, 0.018, 0.026, 0.045, 0.02], [CG.ico1, hair, 0.335 * s, 0.07, 0.11, 0.05, 0.1, 0.07]); // oreilles, pattes
  if (!hatted) { // mèches : une houppe balayée sur le côté, faite de grosses mèches qui se chevauchent
    const side = (sk[0] + sk[1]) % 2 ? -1 : 1, T = [[0.07, 0.335, 0.2, 0.2, 0.105, 0.17, -0.35, 0, -0.3], [-0.15, 0.3, 0.17, 0.15, 0.1, 0.15, -0.3, 0, 0.4], [0.02, 0.37, -0.02, 0.23, 0.1, 0.21, 0, 0, -0.1], [0.24, 0.27, 0.07, 0.12, 0.1, 0.17, -0.2, 0, -0.75], [-0.26, 0.24, 0.02, 0.11, 0.11, 0.18, 0, 0, 0.75], [0.2, 0.4, 0.17, 0.11, 0.065, 0.1, -0.3, 0, -0.55], [-0.02, 0.31, -0.24, 0.2, 0.1, 0.14, 0.5, 0, 0]];
    for (const t of T) headMain.push([CG.ico1, hair, t[0] * side, t[1], t[2], t[3], t[4], t[5], t[6], 0, t[8] * side]);
  }
  if (cust) { const hs = (sk[0] + sk[1] * 2 + sk[2]) % 3; if (hs === 1) headMain.push([CG.ico1, hair, 0, 0.32, -0.24, 0.16, 0.16, 0.16]); else if (hs === 2) headMain.push([CG.ico1, hair, 0, -0.2, -0.22, 0.3, 0.3, 0.16]); } // clients : chignon ou cheveux longs
  // ---- chapeaux (profils tournés, formes pleines et lissées) ----
  if (hat === 1) { // casquette : calotte ajustée, bouton, visière courbe plus sombre, écusson
    headMain.push([CG.hCap, '#e63946', 0, 0.04, 0], [CG.ico1, '#c22f3b', 0, 0.455, -0.01, 0.035, 0.02, 0.035], [CG.pebble, '#c22f3b', 0, 0.175, 0.42, 0.215, 0.02, 0.17, 0.2], [CG.pebble, white, 0, 0.29, 0.345, 0.07, 0.05, 0.02, -0.35]);
  } else if (hat === 2) { // bonnet : maille haute, rayure, revers épais, pompon
    headMain.push([CG.hBeanie, '#2d7dd2', 0, 0.08, 0], [CG.hBeanieStripe, '#8fc3f2', 0, 0.08, 0], [CG.hBeanieCuff, white, 0, 0.08, 0], [CG.ico1, white, 0, 0.6, -0.02, 0.105, 0.105, 0.105]);
  } else if (hat === 3) { // chapeau de paille : large bord relevé, calotte pincée, ruban
    headMain.push([CG.hStrawBrim, '#e8c872'], [CG.hStrawTop, '#f0d488'], [CG.hStrawBand, '#d62828'], [CG.pebble, '#d62828', 0.3, 0.26, 0.07, 0.02, 0.05, 0.06, 0, 0, 0.2]);
  } else if (hat === 4) { // toque : bandeau droit, dessus bouffant
    headMain.push([CG.hToqueBand, white], [CG.ico1, white, 0, 0.6, 0, 0.3, 0.17, 0.3]);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2; headMain.push([CG.ico1, k % 2 ? '#f1f1f6' : white, Math.cos(a) * 0.2, 0.56, Math.sin(a) * 0.2, 0.17, 0.15, 0.17]); }
  } else if (hat === 5) { // couronne : bandeau galbé, pointes à boule, pierres
    headMain.push([CG.hCrown, '#ffc83d']);
    for (let k = 0; k < 6; k++) { const a = (k / 6) * Math.PI * 2 + Math.PI / 2, c = Math.cos(a), s = Math.sin(a); headMain.push([CG.cone8, '#ffc83d', c * 0.3, 0.53, s * 0.3, 0.06, 0.15, 0.06], [CG.ico1, '#ffe38a', c * 0.3, 0.615, s * 0.3, 0.028, 0.028, 0.028], [CG.ico1, ['#e23d4b', '#2d7dd2', '#56c271'][k % 3], c * 0.325, 0.4, s * 0.325, 0.03, 0.036, 0.03]); }
  } else if (hat === 6) { // bob : calotte ronde, bord tombant, surpiqûre
    headMain.push([CG.hBucket, '#b5a27a', 0, 0.09, 0], [CG.hBucketBand, '#8f7f5c', 0, 0.09, 0]);
  } else if (hat === 7) { // antennes : serre-tête, tiges recourbées, boules
    headMain.push([CG.arc, '#3a3a44', 0, 0.02, 0, 1.02, 1.0, 1.02]);
    for (const s of [-1, 1]) headMain.push([CG.cyl6, '#3a3a44', 0.13 * s, 0.47, 0, 0.014, 0.2, 0.014, 0, 0, -0.2 * s], [CG.cyl6, '#3a3a44', 0.185 * s, 0.63, 0, 0.014, 0.16, 0.014, 0, 0, -0.55 * s], [CG.ico1, '#6be36b', 0.24 * s, 0.72, 0, 0.075, 0.075, 0.075], [CG.ico0, '#d4ffd0', 0.225 * s, 0.745, 0.05, 0.02, 0.02, 0.012]);
  }
  // visage : grands yeux ronds, pupilles brunes avec reflet, nez en galet (sourcils et bouche sont des pièces mobiles, voir faceParts)
  const face = [];
  for (const s of [-1, 1]) face.push([CG.ico1, white, 0.14 * s, 0.02, 0.283, 0.1, 0.108, 0.05], [CG.ico1, eye, 0.136 * s, 0.014, 0.32, 0.049, 0.055, 0.028], [CG.ico0, white, 0.122 * s, 0.038, 0.343, 0.017, 0.017, 0.009]);
  face.push([CG.ico1, shade(skin, 0.93), 0, -0.06, 0.335, 0.05, 0.055, 0.062]);
  // ---- accessoires ----
  const temples = (c) => { for (const s of [-1, 1]) face.push([CG.pebble, c, 0.285 * s, 0.03, 0.3, 0.06, 0.014, 0.02, 0, -0.5 * s, 0], [CG.cyl6, c, 0.362 * s, 0.02, 0.15, 0.009, 0.26, 0.009, Math.PI / 2, 0, 0.17 * s]); };
  if (acc === 1) { // lunettes de soleil : verres arrondis, monture, branches, reflet
    for (const s of [-1, 1]) face.push([CG.pebble, '#16161c', 0.14 * s, 0.022, 0.328, 0.12, 0.1, 0.036], [CG.pebble, '#3a3a48', 0.14 * s, 0.022, 0.322, 0.132, 0.112, 0.03], [CG.pebble, '#8d94b8', 0.105 * s + 0.02, 0.06, 0.362, 0.035, 0.012, 0.004, 0, 0, 0.5]);
    face.push([CG.pebble, '#3a3a48', 0, 0.05, 0.342, 0.06, 0.016, 0.014]); temples('#3a3a48');
  } else if (acc === 2) { // moustache : deux lobes relevés aux pointes
    for (const s of [-1, 1]) face.push([CG.ico1, '#4a2c17', 0.058 * s, -0.115, 0.338, 0.07, 0.03, 0.032, 0, 0, 0.22 * s], [CG.ico1, '#4a2c17', 0.125 * s, -0.1, 0.325, 0.035, 0.024, 0.024, 0, 0, 0.7 * s], [CG.ico0, '#4a2c17', 0.15 * s, -0.075, 0.315, 0.018, 0.02, 0.016]);
  } else if (acc === 4) { // casque audio : arceau rembourré, coques, coussinets
    headMain.push([CG.arcFat, '#2a2135', 0, 0.03, 0, 1, 1.22, 1], [CG.pebble, '#4a4458', 0, 0.525, 0, 0.13, 0.03, 0.075]);
    for (const s of [-1, 1]) headMain.push([CG.pebble, '#ff5a5f', 0.415 * s, -0.01, 0, 0.055, 0.125, 0.115], [CG.pebble, '#2a2135', 0.385 * s, -0.01, 0, 0.035, 0.105, 0.095], [CG.ico0, '#ffd0d2', 0.47 * s, -0.01, 0, 0.012, 0.04, 0.04]);
  } else if (acc === 5) { // lunettes rondes : cerclage fin, pont, branches
    for (const s of [-1, 1]) face.push([CG.ringFine, '#3a2a22', 0.14 * s, 0.022, 0.33, 0.1, 0.1, 0.08]); face.push([CG.cyl6, '#3a2a22', 0, 0.04, 0.34, 0.009, 0.08, 0.009, 0, 0, Math.PI / 2]); temples('#3a2a22');
  }
  // buste : polo (col, patte de boutonnage), cou, bassin dans la couleur du pantalon
  const torsoB = [[CG.torso, shirt, 0, 0.74, 0, 0.26, 0.295, 0.18], [CG.pebble, pants, 0, 0.5, 0, 0.245, 0.1, 0.17]];
  const torso = [...torsoB, [CG.cyl8, skinD, 0, 1.04, 0, 0.095, 0.12, 0.09], [CG.cyl8, collarC, 0, 1.012, -0.01, 0.13, 0.05, 0.118]];
  for (const s of [-1, 1]) torso.push([CG.pebble, collarC, 0.085 * s, 0.995, 0.122, 0.095, 0.022, 0.07, 0.6, -0.35 * s, 0.45 * s]);
  torso.push([CG.pebble, shade(shirt, 0.86), 0, 0.905, 0.172, 0.026, 0.085, 0.014], [CG.ico0, white, 0, 0.94, 0.188, 0.011, 0.011, 0.006], [CG.ico0, white, 0, 0.885, 0.188, 0.011, 0.011, 0.006]);
  if (!cust) torso.push([CG.pebble, '#1fb5a3', 0.135, 0.875, 0.172, 0.06, 0.04, 0.012], [CG.pebble, white, 0.135, 0.88, 0.181, 0.04, 0.012, 0.006]); // badge du magasin
  if (acc === 3) { for (const s of [-1, 1]) torso.push([CG.bow, '#d62828', 0.062 * s, 0.975, 0.2, 0.062, 0.05, 0.03, 0, 0, (Math.PI / 2) * s]); torso.push([CG.ico1, '#a81e1e', 0, 0.975, 0.21, 0.024, 0.03, 0.024]); } // nœud papillon : deux coques pincées et un nœud central
  // bras : manche courte, avant-bras nu, main ronde avec pouce
  const armS = [[CG.pebble, shirt, 0, -0.085, 0, 0.1, 0.135, 0.1], [CG.limb, skin, 0, -0.27, 0, 0.066, 0.066, 0.066], [CG.hand, skin, 0, -0.425, 0.005, 0.078, 0.09, 0.064]];
  const arm = [...armS, [CG.ico1, skin, 0, -0.4, 0.062, 0.03, 0.046, 0.032, 0.5]];
  const armB = cust ? [...arm, [CG.pebble, '#ff5a5f', 0, -0.57, 0.05, 0.16, 0.1, 0.12], [CG.pebble, '#ffd23f', 0, -0.47, 0.05, 0.07, 0.035, 0.055]] : arm;
  // jambes : pantalon droit, chaussure arrondie
  const leg = [[CG.limb, pants, 0, -0.2, 0, 0.112, 0.112, 0.112, 0, 0, 0], [CG.pebble, '#3a3038', 0, -0.432, 0.05, 0.118, 0.068, 0.175]];
  const res = { head: compose([...headMain, ...face]), headOl: outlineGeo(compose(headMain), 0.02), torso: compose(torso), torsoOl: outlineGeo(compose(torsoB), 0.02), arm: compose(arm), armB: compose(armB), armOl: outlineGeo(compose(armS), 0.017), leg: compose(leg), legOl: outlineGeo(compose(leg), 0.017) };
  CHAR_CACHE.set(key, res); return res;
}
// ombre de contact : disque doux sous chaque personnage (ancre les pieds au sol, quel que soit le niveau de graphismes)
// proportions cartoon : grosse tête, petit corps (purement visuel : la taille de collision ne change pas)
const HEAD_S = 1.28, HEAD_Y = 1.51, BODY_SY = 1, BODY_SX = 1, CARRY_DY = -0.1, BROW_Y = 0.165;
const BROW_GEO = pebbleGeo(3, 0, 1).scale(0.078, 0.026, 0.018), MOUTH_GEO = pebbleGeo(3, 0, 1).scale(0.06, 0.014, 0.012), SMILE_GEO = new THREE.TorusGeometry(0.062, 0.015, 5, 12, Math.PI);
// pièces mobiles du visage : sourcils, bouche (trait, sourire, « o »), langue
function faceParts(parent, fmat, bmat) {
  const F = { brows: [-1, 1].map((sd) => { const b = new THREE.Mesh(BROW_GEO, bmat); b.position.set(0.14 * sd, BROW_Y, 0.293); b.rotation.set(-0.25, 0.25 * sd, 0.12 * sd); parent.add(b); return b; }) };
  F.line = new THREE.Mesh(MOUTH_GEO, fmat); F.line.position.set(0, -0.175, 0.312); F.line.visible = false; parent.add(F.line);
  F.smile = new THREE.Mesh(SMILE_GEO, fmat); F.smile.position.set(0, -0.135, 0.31); F.smile.rotation.z = Math.PI; parent.add(F.smile);
  F.o = new THREE.Mesh(LID_GEO, fmat); F.o.scale.set(0.05, 0.06, 0.03); F.o.position.set(0, -0.18, 0.305); F.o.visible = false; parent.add(F.o);
  F.tongue = new THREE.Mesh(LID_GEO, mat('#ff7a8a')); F.tongue.scale.set(0.028, 0.03, 0.02); F.tongue.position.set(0.04, -0.19, 0.322); F.tongue.visible = false; parent.add(F.tongue);
  return F;
}
let BLOB_MAT = null; const BLOB_GEO = new THREE.CircleGeometry(0.46, 18), LID_GEO = new THREE.IcosahedronGeometry(1, 1);
function blobMat() { if (!BLOB_MAT) BLOB_MAT = new THREE.MeshBasicMaterial({ map: canvasTex(64, 64, (x) => { const g = x.createRadialGradient(32, 32, 2, 32, 32, 32); g.addColorStop(0, 'rgba(255,255,255,1)'); g.addColorStop(0.55, 'rgba(255,255,255,.55)'); g.addColorStop(1, 'rgba(255,255,255,0)'); x.fillStyle = g; x.fillRect(0, 0, 64, 64); }), color: '#22152a', transparent: true, opacity: 0.42, depthWrite: false }); return BLOB_MAT; }
function makeChar(sk, name, opts = {}) {
  const ch = { sk: null, name: null, mgr: null, ghost: false, cust: !!opts.cust, t: Math.random() * 10, root: new THREE.Group(), rig: new THREE.Group(), mats: [], ols: [], spd: 0, hitT: 0, blinkT: rnd(1, 4), lookT: rnd(0.5, 3), lookY: 0, lookX: 0, zT: 0, olOn: true, out: false, A: { la: 0, ra: 0, ll: 0, rl: 0, lz: 0, rz: 0, hx: 0, hy: 0, hz: 0, ty: 0, by: 0, lean: 0, roll: 0, flat: 0, sq: 0 } };
  ch.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.74, metalness: 0 }); ch.olMat = new THREE.MeshBasicMaterial({ color: '#2a2135', side: THREE.BackSide }); ch.fmat = new THREE.MeshStandardMaterial({ color: '#3a1c1c', roughness: 0.6 }); ch.bmat = new THREE.MeshStandardMaterial({ color: '#4a2c17', roughness: 0.75 }); ch.mats.push(ch.mat, ch.olMat, ch.fmat, ch.bmat);
  ch.root.add(ch.rig);
  ch.legL = new THREE.Group(); ch.legL.position.set(-0.13, 0.5, 0); ch.legR = new THREE.Group(); ch.legR.position.set(0.13, 0.5, 0); ch.legL.scale.y = ch.legR.scale.y = BODY_SY;
  ch.armL = new THREE.Group(); ch.armL.position.set(-0.305, 0.935, 0); ch.armR = new THREE.Group(); ch.armR.position.set(0.305, 0.935, 0);
  ch.head = new THREE.Group(); ch.head.position.y = HEAD_Y; ch.head.scale.setScalar(HEAD_S); ch.torsoG = new THREE.Group(); ch.torsoG.scale.set(BODY_SX, BODY_SY, BODY_SX);
  ch.rig.add(ch.legL, ch.legR, ch.armL, ch.armR, ch.head, ch.torsoG);
  // paupières (clignement, sieste) et bouche en « o » (surprise)
  ch.lids = [-1, 1].map((s) => { const l = new THREE.Mesh(LID_GEO, mat(SKINS[0], { kind: 'matte' })); l.scale.set(0.108, 0.12, 0.062); l.position.set(0.14 * s, 0.022, 0.298); l.visible = false; ch.head.add(l); return l; });
  ch.F = faceParts(ch.head, ch.fmat, ch.bmat); ch.ex = { tilt: 0.12, by: 0, lid: 0 };
  ch.blob = new THREE.Mesh(BLOB_GEO, blobMat()); ch.blob.rotation.x = -Math.PI / 2; ch.blob.position.y = 0.022; ch.blob.renderOrder = 1; ch.root.add(ch.blob);
  // directeur
  ch.tie = new THREE.Group(); ch.torsoG.add(ch.tie); const mRed = mat('#d62828'); mbox(0.085, 0.32, 0.03, null, 0, 0.8, 0.192, { parent: ch.tie, mat: mRed, ol: false }); mbox(0.11, 0.075, 0.04, null, 0, 0.975, 0.19, { parent: ch.tie, mat: mRed, ol: false });
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
  ch.carry = 0; ch.prevCarry = 0; ch.workAgo = 9; ch.throwT = 0; ch.swT = 0; ch.labelY = 2.36; ch.label = null; ch.bubble = null; ch.bubbleT = 0; ch.zzz = null; ch.icon = null; ch.iconKey = '';
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
  const lm = mat(SKINS[sk[1] % SKINS.length], { kind: 'matte' }); for (const l of ch.lids) l.material = lm; ch.bmat.color.set(shade(HAIRS[sk[1] % HAIRS.length], 0.72));
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
  if (icon) { ch.icon = labelSprite(icon, { bg: 'rgba(255,255,255,.95)', fg: '#2a2135', size: 44 }); ch.icon.position.y = 2.5; ch.root.add(ch.icon); }
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
  const F = ch.F, E = ch.ex; let tilt = 0.12, bY = 0, lid = 0, mouth = 'smile';
  if (face === 'concentre') { tilt = 0.42; bY = -0.022; lid = 0.5; mouth = 'tongue'; }
  else if (face === 'effort') { tilt = 0.34; bY = -0.012; mouth = 'line'; }
  else if (face === 'dodo') { tilt = -0.05; bY = 0.012; lid = 1; mouth = 'o'; }
  else if (face === 'joie') { tilt = 0; bY = 0.03; mouth = 'grin'; }
  else if (face === 'triste') { tilt = -0.38; bY = 0.01; lid = 0.5; mouth = 'frown'; }
  else if (face === 'panique') { tilt = -0.42; bY = 0.05; mouth = 'O'; }
  ch.blinkT -= dt; if (ch.blinkT < -0.11) ch.blinkT = rnd(1.8, 5); if (ch.blinkT < 0 && face !== 'panique') lid = 1;
  const ke = 1 - Math.exp(-dt * 14); E.tilt += (tilt - E.tilt) * ke; E.by += (bY - E.by) * ke; E.lid += (lid - E.lid) * (1 - Math.exp(-dt * 30));
  const tremble = face === 'panique' ? Math.sin(t * 9) * 0.006 : 0;
  F.brows[0].rotation.z = -E.tilt; F.brows[1].rotation.z = E.tilt; F.brows[0].position.y = F.brows[1].position.y = BROW_Y + E.by + tremble;
  const lv = ch.canBlink && !ch.ghost && E.lid > 0.08; if (ch.lids[0].visible !== lv) ch.lids[0].visible = ch.lids[1].visible = lv;
  if (lv) { const ly = 0.022 + (1 - E.lid) * 0.15; ch.lids[0].position.y = ch.lids[1].position.y = ly; }
  const show = (m, v) => { if (m.visible !== v) m.visible = v; };
  show(F.line, mouth === 'line' || mouth === 'tongue'); const sm = mouth === 'smile' || mouth === 'grin' || mouth === 'frown'; show(F.smile, sm); if (sm) { const k = mouth === 'grin' ? 1.5 : 1.12; F.smile.scale.set(k, k, 1); F.smile.rotation.z = mouth === 'frown' ? 0 : Math.PI; F.smile.position.y = mouth === 'frown' ? -0.21 : mouth === 'grin' ? -0.115 : -0.135; } show(F.o, mouth === 'o' || mouth === 'O'); show(F.tongue, mouth === 'tongue' && !ch.ghost);
  F.line.scale.x = mouth === 'tongue' ? 0.6 : 1;
  if (mouth === 'O') F.o.scale.set(0.075, 0.09 + Math.sin(t * 6) * 0.01, 0.03); else if (mouth === 'o') F.o.scale.set(0.035, 0.035 + Math.sin(t * 0.55) * 0.012, 0.03);
  for (const fm of [ch.fmat, ch.bmat]) { if (fm.transparent !== ch.mat.transparent) { fm.transparent = ch.mat.transparent; fm.depthWrite = !ch.mat.transparent; fm.needsUpdate = true; } fm.opacity = ch.mat.opacity; }
  // gouttes de sueur en cas de panique
  if (face === 'panique' && !ch.ghost && (dist === undefined || dist < 25)) { ch.swT -= dt; if (ch.swT <= 0) { ch.swT = 0.13; ch.head.getWorldPosition(_p); const a = rnd(0, 6.28); fxEmit({ x: _p.x + Math.cos(a) * 0.4, y: _p.y + 0.3, z: _p.z + Math.sin(a) * 0.4, vx: Math.cos(a) * 1.3, vy: rnd(1.2, 2.2), vz: Math.sin(a) * 1.3, life: 0.5, s0: 0.08, s1: 0.05, col: '#9fdcff', kind: 4, grav: 7 }); } }
  if (anim === 4) { ch.zT -= dt; if (ch.zT <= 0 && (dist === undefined || dist < 30)) { ch.zT = 0.75; ch.head.getWorldPosition(_p); fxZ(_p.x, _p.y + 0.35, _p.z); } }
  if (anim === 4 && !ch.zzz) { ch.zzz = labelSprite('💤 Zzz…', { bg: 'rgba(120,170,255,.9)' }); ch.zzz.position.y = 1.6; ch.root.add(ch.zzz); }
  if (anim !== 4 && ch.zzz) { ch.root.remove(ch.zzz); ch.zzz.material.map.dispose(); ch.zzz = null; }
  if (ch.bubble) { ch.bubbleT -= dt; if (ch.bubbleT <= 0) { ch.root.remove(ch.bubble); ch.bubble.material.map.dispose(); ch.bubble = null; } }
  if (ch.label) ch.label.visible = dist === undefined || dist < 26;
  if (ch.icon) ch.icon.position.y = 2.5 + Math.sin(t * 1.5) * 0.06;
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
    PT.sc.add(PT.grp, new THREE.HemisphereLight('#ffffff', '#c7b49c', 1.5)); const d = new THREE.DirectionalLight('#fff2e0', 2.4); d.position.set(1.5, 2.5, 3); PT.sc.add(d); PT.cam.position.set(0.5, 1.66, 2.55); PT.cam.lookAt(0, 1.57, 0); PT.fm = new THREE.MeshBasicMaterial({ color: '#3a1c1c' }); PT.cv.width = PT.cv.height = 160;
    for (let i = 0; i < 256; i++) { const c = i / 255; PT.lut[i] = Math.round(255 * (c <= 0.0031308 ? c * 12.92 : 1.055 * Math.pow(c, 1 / 2.4) - 0.055)); } }
  const G = charGeos(sk, false); PT.grp.clear();
  const h = new THREE.Mesh(G.head, PT.mat), ho = new THREE.Mesh(G.headOl, OUTLINE_MAT), tr = new THREE.Mesh(G.torso, PT.mat), to = new THREE.Mesh(G.torsoOl, OUTLINE_MAT); h.position.y = ho.position.y = HEAD_Y; h.scale.setScalar(HEAD_S); ho.scale.setScalar(HEAD_S); tr.scale.set(BODY_SX, BODY_SY, BODY_SX); to.scale.set(BODY_SX, BODY_SY, BODY_SX); const fg = new THREE.Group(); fg.position.y = HEAD_Y; fg.scale.setScalar(HEAD_S); faceParts(fg, PT.fm, new THREE.MeshBasicMaterial({ color: shade(HAIRS[sk[1] % HAIRS.length], 0.72) })); PT.grp.add(h, ho, tr, to, fg);
  const prevRT = renderer.getRenderTarget(), tm = renderer.toneMapping; renderer.toneMapping = THREE.NoToneMapping; renderer.setRenderTarget(PT.rt); renderer.setClearColor(0x000000, 0); renderer.clear(); renderer.render(PT.sc, PT.cam);
  renderer.readRenderTargetPixels(PT.rt, 0, 0, 160, 160, PT.buf); renderer.setRenderTarget(prevRT); renderer.toneMapping = tm;
  const x = PT.cv.getContext('2d'), im = x.createImageData(160, 160);
  for (let j = 0; j < 160; j++) for (let i = 0; i < 160; i++) { const s = ((159 - j) * 160 + i) * 4, d = (j * 160 + i) * 4, a = PT.buf[s + 3], mx = Math.min(250, Math.max(PT.buf[s], PT.buf[s + 1], PT.buf[s + 2])), k = 255 / (255 - mx); // décompression des hautes lumières, puis sRGB
    im.data[d] = PT.lut[Math.min(255, Math.round(PT.buf[s] * k))]; im.data[d + 1] = PT.lut[Math.min(255, Math.round(PT.buf[s + 1] * k))]; im.data[d + 2] = PT.lut[Math.min(255, Math.round(PT.buf[s + 2] * k))]; im.data[d + 3] = a; }
  x.putImageData(im, 0, 0); u = PT.cv.toDataURL('image/png'); PORTRAITS.set(key, u); return u;
}
