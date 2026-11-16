// ======================= MOBILIER INTERACTIF : portes, placards, tiroirs, objets lancés =======================
// boîte dynamique (non fusionnée) avec contour à la bonne épaisseur
function dbox(w, h, d, color, x, y, z, parent, o = {}) {
  const g = new THREE.BoxGeometry(w, h, d); const m = new THREE.Mesh(g, o.mat || mat(color)); m.position.set(x, y, z); if (o.rx) m.rotation.x = o.rx; if (o.ry) m.rotation.y = o.ry; if (o.rz) m.rotation.z = o.rz;
  m.castShadow = o.cast !== false; m.receiveShadow = true; parent.add(m);
  if (o.ol !== false) { const ol = new THREE.Mesh(outlineGeo(g, o.olt || 0.01), OUTLINE_MAT); ol.position.copy(m.position); ol.rotation.copy(m.rotation); parent.add(ol); }
  return m;
}
function dcyl(r, h, color, x, y, z, parent, o = {}) {
  const g = flatG(new THREE.CylinderGeometry(r, r, h, o.seg || 8)); const m = new THREE.Mesh(g, mat(color)); m.position.set(x, y, z); if (o.rx) m.rotation.x = o.rx; if (o.rz) m.rotation.z = o.rz; m.castShadow = true; parent.add(m);
  if (o.ol !== false) { const ol = new THREE.Mesh(outlineGeo(g, 0.008), OUTLINE_MAT); ol.position.copy(m.position); ol.rotation.copy(m.rotation); parent.add(ol); }
  return m;
}
// caisson ouvert d'un côté (statique : fusionné ensuite)
function shell(x0, x1, z0, z1, y0, y1, open, col, inCol, th = 0.03) {
  const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0, h = y1 - y0, cy = (y0 + y1) / 2;
  mbox(w, th, d, col, cx, y1 - th / 2, cz); mbox(w, th, d, col, cx, y0 + th / 2, cz);
  if (open !== '-x') mbox(th, h, d, col, x0 + th / 2, cy, cz); if (open !== '+x') mbox(th, h, d, col, x1 - th / 2, cy, cz);
  if (open !== '-z') mbox(w, h, th, col, cx, cy, z0 + th / 2); if (open !== '+z') mbox(w, h, th, col, cx, cy, z1 - th / 2);
  // fond intérieur plus sombre
  const ins = 0.035;
  if (open === '-x') mbox(0.01, h - 0.08, d - 0.08, inCol, x1 - th - ins, cy, cz, { ol: false, cast: false });
  if (open === '+x') mbox(0.01, h - 0.08, d - 0.08, inCol, x0 + th + ins, cy, cz, { ol: false, cast: false });
  if (open === '+z') mbox(w - 0.08, h - 0.08, 0.01, inCol, cx, cy, z0 + th + ins, { ol: false, cast: false });
  if (open === '-z') mbox(w - 0.08, h - 0.08, 0.01, inCol, cx, cy, z1 - th - ins, { ol: false, cast: false });
}
const OPENM = [];
function buildLeaf(L, o) {
  const pv = new THREE.Group(); pv.position.set(L.h[0], 0, L.h[1]); pv.rotation.y = L.ry0; scene.add(pv); pv.userData.dyn = true;
  const y0 = L.y0 || 0, cy = y0 + L.hgt / 2, w = L.w;
  if (L.glass) {
    const fr = 0.07; dbox(w, fr, L.th, L.col, w / 2, y0 + fr / 2, 0, pv); dbox(w, fr, L.th, L.col, w / 2, y0 + L.hgt - fr / 2, 0, pv); dbox(fr, L.hgt, L.th, L.col, fr / 2, cy, 0, pv); dbox(fr, L.hgt, L.th, L.col, w - fr / 2, cy, 0, pv);
    const gl = new THREE.Mesh(new THREE.BoxGeometry(w - 2 * fr, L.hgt - 2 * fr, 0.01), new THREE.MeshBasicMaterial({ color: '#cdeeff', transparent: true, opacity: 0.28, depthWrite: false })); gl.position.set(w / 2, cy, 0); pv.add(gl);
    dbox(0.04, 0.9, 0.04, '#9aa3ad', w - 0.16, cy, L.th / 2 + 0.04, pv);
  } else {
    dbox(w, L.hgt, L.th, L.col, w / 2, cy, 0, pv);
    const hy = o.type === 'door' ? 1.05 : o.safe ? cy : y0 + L.hgt * (o.kitchen !== undefined ? 0.8 : 0.55);
    for (const sd of [-1, 1]) dbox(0.05, o.type === 'door' ? 0.05 : 0.14, 0.05, '#c9ced6', w - 0.12, hy, sd * (L.th / 2 + 0.03), pv, { ol: o.type === 'door' });
    if (o.type === 'door') for (const sd of [-1, 1]) dbox(0.2, 0.03, 0.04, '#c9ced6', w - 0.2, hy, sd * (L.th / 2 + 0.05), pv, { ol: false });
    if (L.win) for (const sd of [-1, 1]) dbox(w * 0.38, 0.55, 0.01, '#bfe8ff', w / 2, 1.85, sd * (L.th / 2 + 0.004), pv, { ol: false, cast: false });
    if (L.cold) { sign('CHAMBRE FROIDE ❄  3 °C', 1.5, 0.32, w / 2, 1.85, L.th / 2 + 0.01, 0, { parent: pv, bg: '#2d7dd2', size: 70 }); dbox(w - 0.1, 0.08, L.th + 0.02, '#c9ced6', w / 2, 0.12, 0, pv, { ol: false }); for (const yy of [0.5, 2.4]) dbox(0.12, 0.16, L.th + 0.06, '#9aa3ad', 0.06, yy, 0, pv, { ol: false }); }
    if (o.locker !== undefined) { for (let k = 0; k < 3; k++) dbox(w * 0.6, 0.025, 0.01, '#2a2135', w / 2, y0 + L.hgt - 0.2 - k * 0.07, L.th / 2 + 0.006, pv, { ol: false, cast: false }); sign(String(o.locker + 1), 0.12, 0.12, w / 2, y0 + L.hgt - 0.45, L.th / 2 + 0.008, 0, { parent: pv, bg: '#ffffff', fg: '#2a2135', size: 90 }); }
    if (o.safe) { const d = dcyl(0.09, 0.04, '#ffd23f', w / 2, cy, L.th / 2 + 0.02, pv, { rx: HP }); d.userData.dial = 1; }
    if (o.closet && L.ry0 < 0) sign('🧹 MÉNAGE', 0.5, 0.16, w / 2, 1.75, L.th / 2 + 0.01, 0, { parent: pv, bg: '#ffd23f', fg: '#2a2135', size: 70 });
  }
  return pv;
}
function buildDrawer(o) {
  const g = new THREE.Group(); g.userData.dyn = true; scene.add(g); g.rotation.y = Math.atan2(o.n[0], o.n[1]); g.position.set(o.base[0], o.base[1], o.base[2]);
  const w = o.w, h = o.hgt, dp = o.dp;
  dbox(w, h, 0.03, o.col, 0, 0, 0.015, g);
  dbox(Math.min(0.22, w * 0.4), 0.035, 0.03, '#d9dde3', 0, h * 0.15, 0.045, g, { ol: false });
  dbox(w - 0.04, 0.02, dp, '#e9e2d4', 0, -h / 2 + 0.02, -dp / 2, g, { ol: false, cast: false });
  for (const sd of [-1, 1]) dbox(0.02, h * 0.8, dp, '#d8cfbd', sd * (w / 2 - 0.03), -h * 0.08, -dp / 2, g, { ol: false, cast: false });
  dbox(w - 0.04, h * 0.8, 0.02, '#d8cfbd', 0, -h * 0.08, -dp + 0.01, g, { ol: false, cast: false });
  // contenu
  const fl = -h / 2 + 0.035;
  if (o.cash !== undefined) { for (let k = 0; k < 4; k++) dbox(0.07, 0.025, 0.13, ['#7bd13f', '#56c271', '#a6e36b', '#3fa34d'][k], -0.12 + k * 0.08, fl + 0.012, -0.12, g, { ol: false }); for (let k = 0; k < 5; k++) dcyl(0.02, 0.012, '#ffd23f', -0.12 + k * 0.06, fl + 0.006, -0.28, g, { ol: false, seg: 6 }); }
  else if (o.file !== undefined) { for (let k = 0; k < 7; k++) dbox(w * 0.85, h * 0.62, 0.012, ['#ffd23f', '#ff8a3d', '#56ccf2', '#ff7ac6', '#ffffff'][k % 5], 0, fl + h * 0.31, -0.08 - k * 0.09, g, { ol: false, cast: false }); }
  else if (o.desk !== undefined) { if (o.desk === 0) { dbox(0.22, 0.03, 0.3, '#ffffff', -0.12, fl + 0.015, -0.25, g, { ol: false }); const dn = dcyl(0.07, 0.035, '#ff7ac6', 0.15, fl + 0.02, -0.3, g, { ol: false }); dcyl(0.03, 0.04, '#e9e2d4', 0.15, fl + 0.022, -0.3, g, { ol: false }); } else { dbox(0.3, 0.05, 0.22, '#c0504d', 0, fl + 0.03, -0.3, g); sign('TOP SECRET', 0.22, 0.06, 0, fl + 0.06, -0.3, 0, { parent: g, bg: null, fg: '#ffffff', size: 70 }).rotation.x = -HP; } }
  else if (o.acc !== undefined) { for (let k = 0; k < 3; k++) dbox(0.12, 0.02, 0.08, ['#ffd23f', '#ff5a5f', '#56ccf2'][k], -0.15 + k * 0.15, fl + 0.01, -0.2, g, { ol: false }); dcyl(0.012, 0.15, '#2d7dd2', 0.1, fl + 0.012, -0.35, g, { ol: false, rz: HP, seg: 5 }); }
  return g;
}
function buildShutter(o) {
  const g = new THREE.Group(); g.userData.dyn = true; scene.add(g); const L = o.z1 - o.z0;
  for (let k = 0; k < 10; k++) { const y = 0.15 + k * 0.28; dbox(0.08, 0.26, L, k % 2 ? '#aeb6c0' : '#9aa3ad', o.x, y, (o.z0 + o.z1) / 2, g, { ol: k === 0 || k === 9 }); }
  dbox(0.1, 0.06, 0.3, '#ffd23f', o.x + 0.06, 0.95, (o.z0 + o.z1) / 2, g, { ol: false }); dbox(0.1, 0.06, 0.3, '#ffd23f', o.x - 0.06, 0.95, (o.z0 + o.z1) / 2, g, { ol: false });
  mcyl(0.22, L + 0.2, '#7a8796', o.x, 3.05, (o.z0 + o.z1) / 2, { rx: HP });
  return g;
}
const SLIDE = { panels: [], t: 0 };
function buildProps() {
  // --- casiers de la salle de pause (creux) ---
  const lockerStuff = [(x, z) => { mbox(0.06, 0.55, 0.36, '#3d5a99', x, 1.35, z); msph(0.08, '#2a2135', x + 0.02, 1.72, z, { geo: ICO0 }); }, (x, z) => { mbox(0.18, 0.08, 0.22, '#f3d3a2', x, 0.95, z); mbox(0.2, 0.05, 0.24, '#7bd13f', x, 1.0, z, { ol: false }); }, (x, z) => { mbox(0.06, 0.16, 0.1, '#9aa3ad', x, 1.25, z); mbox(0.01, 0.06, 0.07, '#7df3c8', x - 0.035, 1.27, z, { ol: false }); }, (x, z) => { msph(0.16, '#ff5a5f', x, 1.05, z, { sy: 0.8, geo: ICO0 }); mbox(0.24, 0.1, 0.14, '#ffffff', x, 0.15, z); }, (x, z) => { mbox(0.06, 0.6, 0.32, '#ffd23f', x, 1.3, z); mbox(0.12, 0.12, 0.2, '#2a2135', x, 0.12, z); }];
  for (let i = 0; i < 5; i++) { const z = -11.3 + i * 0.6, c = OPEN.find((o) => o.locker === i).leaves[0].col; shell(9.25, 9.85, z - 0.29, z + 0.29, 0, 2.0, '-x', c, '#2b2f3a'); mbox(0.5, 0.02, 0.52, c, 9.55, 1.62, z, { ol: false }); lockerStuff[i](9.5, z); }
  // --- placards de la cuisine ---
  shell(4.5, 7.2, -13.85, -13.1, 0, 0.94, '+z', '#f3d3a2', '#7a5a3a'); mbox(2.6, 0.02, 0.6, '#e8c48f', 5.85, 0.45, -13.45, { ol: false });
  for (const x of [5.47, 6.32]) mbox(0.02, 0.88, 0.7, '#e8c48f', x, 0.47, -13.47, { ol: false });
  for (let k = 0; k < 4; k++) mcyl(0.12, 0.02, '#ffffff', 4.9, 0.08 + k * 0.025, -13.45, { ol: false }); for (let k = 0; k < 3; k++) mcyl(0.05, 0.1, ['#ff5a5f', '#2d7dd2', '#ffd23f'][k], 5.7 + k * 0.14, 0.52, -13.45, { geo: CYL6 });
  mbox(0.16, 0.3, 0.08, '#ff8a3d', 6.7, 0.62, -13.5); mcyl(0.16, 0.08, '#3d4454', 6.75, 0.1, -13.45, { geo: CYL6 });
  // --- coffre-fort ---
  shell(10.4, 11.3, -13.8, -12.9, 0, 1.0, '+z', '#3d4454', '#20242c', 0.07);
  for (let k = 0; k < 3; k++) mbox(0.18, 0.07, 0.1, '#ffd23f', 10.65 + k * 0.2, 0.12, -13.4); mbox(0.18, 0.07, 0.1, '#ffd23f', 10.75, 0.19, -13.4); for (let k = 0; k < 3; k++) mbox(0.16, 0.06, 0.09, '#7bd13f', 10.6 + k * 0.25, 0.55, -13.45);
  mbox(0.8, 0.02, 0.7, '#3d4454', 10.85, 0.45, -13.4, { ol: false });
  // --- bureau : caisson à tiroirs ---
  mbox(0.7, 0.72, 0.8, '#5b3d22', 16.1, 0.38, -12.71);
  // --- armoire à balais (réserve) ---
  shell(-6.85, -6.15, -8.4, -7.0, 0, 2.1, '-x', '#7a8796', '#3b4048'); mbox(0.6, 0.02, 1.3, '#7a8796', -6.5, 1.5, -7.7, { ol: false });
  mcyl(0.025, 1.4, '#c58b4f', -6.45, 0.75, -8.1, { geo: CYL6, rx: 0.1 }); mbox(0.1, 0.08, 0.35, '#ffd23f', -6.45, 0.06, -8.13); mcyl(0.16, 0.3, '#2d7dd2', -6.45, 0.17, -7.55, { geo: CYL6 }); mcyl(0.02, 1.3, '#9aa3ad', -6.4, 0.7, -7.25, { geo: CYL6, rx: -0.12 }); msph(0.12, '#f2f2f2', -6.4, 0.1, -7.18, { geo: ICO0, sy: 0.5 });
  for (let k = 0; k < 4; k++) mcyl(0.05, 0.22, ['#56c271', '#ff7ac6', '#56ccf2', '#ffd23f'][k], -6.45, 1.63, -8.15 + k * 0.28, { geo: CYL6 });
  // --- vitrine à boissons fraîches (surface de vente) ---
  shell(-19.85, -19.05, -1.2, 3.2, 0, 2.2, '+x', '#eef4f8', '#bfe3f7', 0.05);
  mbox(0.82, 0.12, 4.42, '#1fb5a3', -19.45, 2.26, 1.0); mbox(0.04, 0.05, 4.2, null, -19.1, 2.12, 1.0, { mat: basic('#9ff0ff'), ol: false });
  sign('❄ BOISSONS FRAÎCHES ❄', 3.2, 0.42, -19.02, 2.55, 1.0, HP, { bg: '#2d7dd2' });
  const dcols = ['#ff5a5f', '#56ccf2', '#ffd23f', '#7bd13f', '#ff8a3d', '#9b6bff'];
  for (const y of [0.15, 0.75, 1.35]) mbox(0.7, 0.03, 4.3, '#dfe9f2', -19.45, y, 1.0, { ol: false, cast: false });
  buildShelf(SI_VITRINE);
  mbox(0.7, 0.03, 4.3, '#dfe9f2', -19.45, 1.95, 1.0, { ol: false, cast: false });
  // --- portes, placards, tiroirs ---
  OPEN.forEach((o, i) => {
    const M = { t: 0, leaves: [], g: null };
    if (o.leaves) M.leaves = o.leaves.map((L) => buildLeaf(L, o));
    else if (o.type === 'drawer') M.g = buildDrawer(o);
    else if (o.type === 'shutter') M.g = buildShutter(o);
    OPENM[i] = M;
  });
  // --- portes coulissantes automatiques de l'entrée ---
  const glassM = new THREE.MeshBasicMaterial({ color: '#cdeeff', transparent: true, opacity: 0.3, depthWrite: false });
  for (const [x0, x1] of [[10, 11.5], [14.5, 16]]) { mbox(x1 - x0, 0.08, 0.08, '#9aa3ad', (x0 + x1) / 2, 2.84, 14.08); const gl = new THREE.Mesh(new THREE.BoxGeometry(x1 - x0, 2.76, 0.02), glassM); gl.position.set((x0 + x1) / 2, 1.42, 14.08); scene.add(gl); }
  for (const [x0, sd] of [[11.5, -1], [13, 1]]) {
    const g = new THREE.Group(); g.userData.dyn = true; scene.add(g); g.position.set(x0, 0, 14.0);
    dbox(1.5, 0.08, 0.06, '#7a8796', 0.75, 2.8, 0, g); dbox(1.5, 0.08, 0.06, '#7a8796', 0.75, 0.04, 0, g); dbox(0.06, 2.8, 0.06, '#7a8796', sd < 0 ? 1.47 : 0.03, 1.42, 0, g); const gl = new THREE.Mesh(new THREE.BoxGeometry(1.44, 2.7, 0.02), glassM); gl.position.set(0.75, 1.42, 0); g.add(gl);
    SLIDE.panels.push({ g, x0, sd });
  }
  mbox(6.2, 0.18, 0.2, '#7a8796', 13, 2.95, 14.0); sign('◂ ▸', 0.5, 0.16, 13, 2.95, 13.89, Math.PI, { bg: '#2a2135', fg: '#7df3c8', size: 80 });
}
// ---------- animation des ouvrants ----------
const ease = (t) => t * t * (3 - 2 * t);
function syncOpen(G, dt) {
  OPEN.forEach((o, i) => {
    const M = OPENM[i]; if (!M) return; const target = G ? (opDisp(G, i) ? 1 : 0) : o.type === 'door' && (i === 0 || i === 2) ? 1 : 0;
    const sp = o.type === 'shutter' ? 1.2 : o.type === 'drawer' ? 5 : 3.2; const t0 = M.t;
    M.t = target > M.t ? Math.min(target, M.t + sp * dt) : Math.max(target, M.t - sp * dt); if (M.t === t0 && M.init) return; M.init = true;
    const e = ease(M.t);
    if (o.leaves) M.leaves.forEach((pv, k) => (pv.rotation.y = lerp(o.leaves[k].ry0, o.leaves[k].ry1, e)));
    else if (o.type === 'drawer') M.g.position.set(o.base[0] + o.n[0] * o.d * e, o.base[1], o.base[2] + o.n[1] * o.d * e);
    else if (o.type === 'shutter') { M.g.position.y = e * 2.55; M.g.scale.y = 1 - 0.85 * e; }
  });
  // portes automatiques : quelqu'un à moins de 3,3 m ?
  let near = false; for (const a of AV.values()) if (Math.hypot(a.x - 13, a.z - 14) < 3.3) { near = true; break; } if (Math.hypot(ME.x - 13, ME.z - 14) < 3.3 && C.mode === 'game') near = true;
  SLIDE.t = clamp(SLIDE.t + (near ? 2.5 : -1.6) * dt, 0, 1); const e = ease(SLIDE.t);
  for (const p of SLIDE.panels) p.g.position.x = p.x0 + p.sd * 1.45 * e;
}
// ---------- objets par terre / en vol ----------
const ITEMM = new Map(); const PRED = []; let ITEM_KNOWN = new Set();
const CARTON_GEO = new THREE.BoxGeometry(0.46, 0.28, 0.36), CARTON_OL = outlineGeo(CARTON_GEO, 0.012), CRATE_GEO = new THREE.BoxGeometry(0.48, 0.24, 0.36), CRATE_OL = outlineGeo(CRATE_GEO, 0.012);
function itemObj(k, cat, v) {
  const g = new THREE.Group(); g.userData.dyn = true;
  if (k === 1) {
    const cr = cat >= 8; const m = new THREE.Mesh(cr ? CRATE_GEO : CARTON_GEO, mat(cr ? '#3a86ff' : '#d9a066')); m.castShadow = true; g.add(m, new THREE.Mesh(cr ? CRATE_OL : CARTON_OL, OUTLINE_MAT));
    if (!cr) { const b = new THREE.Mesh(BOXG, mat(PALETTES[cat][0])); b.scale.set(0.47, 0.06, 0.37); g.add(b); const t = new THREE.Mesh(BOXG, mat('#c88a50')); t.scale.set(0.05, 0.01, 0.37); t.position.y = 0.145; g.add(t); }
    else for (let i = 0; i < 4; i++) { const b = new THREE.Mesh(BOXG, mat(PALETTES[cat][i % 4])); b.scale.set(0.09, 0.1, 0.12); b.position.set(-0.16 + i * 0.11, 0.1, 0); g.add(b); }
  } else { const ty = ptypeOf(cat, v); const m = new THREE.Mesh(PGEO[ty], mat(PALETTES[cat][v & 3])); m.castShadow = true; g.add(m, new THREE.Mesh(PGEO_OL[ty], OUTLINE_MAT)); g.userData.cyl = PTYPE[ty][0] === 'c'; }
  scene.add(g); return g;
}
function poseItem(o, k, s, ry, spin) {
  o.rotation.set(0, ry, 0);
  if (s === 2) { o.rotation.x = spin; o.rotation.z = spin * 0.7; }
  else if (s === 1 && k === 0) { if (o.userData.cyl) o.rotation.z = HP; else o.rotation.x = -HP; }
}
function predictItem(p) {
  const it = { ...p, ry: rnd(0, 6), vr: p.tumble ? rnd(-9, 9) : 0, s: 2, rest: false, t0: performance.now() }; it.hh = itemHH(it, false);
  it.obj = itemObj(p.k, p.cat, p.v); PRED.push(it); ITEM_KNOWN = new Set((curG()?.it || []).map((x) => x[0]));
}
function syncItems(G, dt) {
  const list = G?.it || []; const seen = new Set(); const now = performance.now(); const k = 1 - Math.exp(-dt * 16);
  for (const it of list) {
    const [id, kk, cat, v, x, y, z, ry, s] = it; seen.add(id); let o = ITEMM.get(id);
    if (!o) { o = { obj: itemObj(kk, cat, v), x, y, z, s, spin: 0 }; ITEMM.set(id, o); }
    if (o.s === 2 && s !== 2) { const d = Math.hypot(x - camera.position.x, z - camera.position.z); if (d < 18) SFX.play('land', clamp(1 - d / 18, 0.2, 1)); }
    o.s = s; if (Math.hypot(x - o.x, z - o.z) > 4) { o.x = x; o.y = y; o.z = z; } else { o.x = lerp(o.x, x, k); o.y = lerp(o.y, y, k); o.z = lerp(o.z, z, k); }
    o.spin += s === 2 ? dt * 11 : 0; o.obj.position.set(o.x, o.y, o.z); poseItem(o.obj, kk, s, ry, o.spin);
    o.obj.visible = !(C.hideIt.has(id) && now - C.hideIt.get(id) < 1500);
  }
  for (const [id, o] of ITEMM) if (!seen.has(id)) { scene.remove(o.obj); ITEMM.delete(id); C.hideIt.delete(id); }
  // prédiction locale des lancers (le temps que l'hôte confirme)
  for (let i = PRED.length - 1; i >= 0; i--) {
    const p = PRED[i]; itemStep(p, dt); p.obj.position.set(p.x, p.y, p.z); poseItem(p.obj, p.k, p.s, p.ry, (now - p.t0) / 90);
    const conf = list.some((it) => !ITEM_KNOWN.has(it[0]) && Math.hypot(it[4] - p.x, it[6] - p.z) < 1.2);
    if (conf || now - p.t0 > 1400 || !G) { scene.remove(p.obj); PRED.splice(i, 1); }
  }
}
