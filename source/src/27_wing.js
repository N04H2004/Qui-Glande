// ======================= AILE DE SERVICE + RECOINS (visuel ; les collisions et les zones sont dans 10_core.js) =======================
// Couloir de service derrière les pièces du fond, vestiaires, toilettes, local technique, archives, entrepôt, cour extérieure.
// En surface de vente : gondole bazar, îlot de palettes promo ; en réserve : une rangée de racks. Tout est statique (fusionné au chargement).
// ---- masquage : le mobilier de l'aile n'est jamais visible depuis la surface de vente ou le parking, on ne le dessine que si la caméra est au fond du magasin ou dehors côté quai
const _wv = new THREE.Vector3();
function inWing(o) {
  if (o.userData.keep) return false; let x, z;
  if (o.isMesh && o.geometry) { if (!o.geometry.boundingSphere) o.geometry.computeBoundingSphere(); _wv.copy(o.geometry.boundingSphere.center).applyMatrix4(o.matrixWorld); x = _wv.x; z = _wv.z; } else { x = o.position.x; z = o.position.z; }
  return z < -14.3 && z > -23 && x > -27 && x < 21;
}
function wingCull() {
  const v = camera.position.z < -5.6 || camera.position.x < -19.6;
  if (v === WING.vis) return; WING.vis = v; for (const o of WING.cull) o.visible = v; if (v && LIGHTS.sun) LIGHTS.sun.shadow.needsUpdate = true;
}
function texRep(tex, w, h, ux, uy = ux) { const t = tex.clone(); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.repeat.set(w / ux, h / uy); t.needsUpdate = true; return t; }
const WING_CARTON = ['#d9a066', '#c88a50', '#e2b07a'];
// rayonnage industriel : montants orange, lisses bleues, charges sur palettes
function rackUnit(x0, x1, z0, z1, h, levels, fill = 0.85) {
  const alongX = x1 - x0 > z1 - z0, L = alongX ? x1 - x0 : z1 - z0, D = alongX ? z1 - z0 : x1 - x0, cx = (x0 + x1) / 2, cz = (z0 + z1) / 2;
  const at = (u, v, y, w, hh, d, col, o = {}) => (alongX ? mbox(w, hh, d, col, x0 + u, y, cz + v, o) : mbox(d, hh, w, col, cx + v, y, z0 + u, o));
  const n = Math.max(2, Math.round(L / 2.7) + 1);
  for (let i = 0; i < n; i++) { const u = 0.05 + (i * (L - 0.1)) / (n - 1); for (const s of [-1, 1]) at(u, s * (D / 2 - 0.05), h / 2, 0.08, h, 0.08, '#ff8a3d'); }
  for (const y of levels) for (const s of [-1, 1]) at(L / 2, s * (D / 2 - 0.05), y, L - 0.1, 0.1, 0.06, '#2d7dd2', { ol: false });
  for (const y of levels) { at(L / 2, 0, y + 0.02, L - 0.2, 0.03, D - 0.12, '#9aa3ad', { ol: false, cast: false });
    for (let u = 0.4; u < L - 0.3; u += 0.62) if (Math.random() < fill) { const hh = rnd(0.32, 0.55), c = pick(WING_CARTON); at(u + rnd(-0.04, 0.04), rnd(-0.06, 0.06), y + 0.04 + hh / 2, 0.56, hh, D - 0.22, c, { ry: rnd(-0.06, 0.06) }); if (Math.random() < 0.4) at(u, D / 2 - 0.1, y + 0.2, 0.3, 0.06, 0.01, pick(['#ff5a5f', '#2d7dd2', '#56c271', '#ffd23f']), { ol: false, cast: false }); } }
}
// porte de cabine, de casier… : panneau fin pivoté autour d'une charnière verticale
function leafPanel(hx, hz, w, h, ry, col, y0 = 0.15) { const g = new THREE.Group(); g.position.set(hx, y0, hz); g.rotation.y = ry; scene.add(g); mbox(w, h, 0.04, col, w / 2, h / 2, 0, { parent: g }); mbox(0.04, 0.12, 0.05, '#c9ced6', w - 0.1, h * 0.5, 0.04, { parent: g, ol: false }); return g; }
const keepV = (m) => { m.userData.keep = 1; return m; };
function wingSign(text, x, z, ry, bg, fg) { sign(text, Math.max(1.6, text.length * 0.17), 0.42, x, 3.28, z, ry, { bg, fg: fg || '#fff' }); }
function buildWing() {
  MAT_ZONE = 'in';
  // ---------- sols ----------
  keepV(floor(-20, 20, -16.6, -14, texRep(TEX.concrete, 40, 2.6, 3.5), '#efe8da', 0.002, { rough: 0.7 }));
  keepV(floor(-20, -12, -22, -16.6, texRep(TEX.tiles, 8, 5.4, 2), '#d9f0f4', 0.002, { rough: 0.6 }));
  keepV(floor(-12, -5.5, -22, -16.6, texRep(TEX.tiles, 6.5, 5.4, 1.4), '#e9fbfd', 0.002, { rough: 0.5 }));
  keepV(floor(-5.5, 1.5, -22, -16.6, texRep(TEX.concrete, 7, 5.4, 3), '#a7a198', 0.002, { rough: 0.9 }));
  keepV(floor(1.5, 8.5, -22, -16.6, texRep(TEX.carpet, 7, 5.4, 1.6), '#c79a7a', 0.002, { rough: 1 }));
  keepV(floor(8.5, 20, -22, -16.6, texRep(TEX.concrete, 11.5, 5.4, 3.5), '#cfc9be', 0.002, { rough: 0.85 }));
  // ---------- couloir de service ----------
  decal(39.4, 0.1, '#ffd23f', 0, -14.35); decal(39.4, 0.1, '#ffd23f', 0, -16.25);
  for (const x of [-12, -2, 8, 17.4]) { mcyl(0.11, 0.5, '#e63946', x, 1.0, -14.27, { geo: CYL6 }); mbox(0.1, 0.08, 0.12, '#2a2135', x, 1.3, -14.27, { ol: false }); sign('🧯', 0.32, 0.32, x, 1.65, -14.17, Math.PI, { bg: '#e63946', size: 90 }); }
  mbox(2.2, 1.3, 0.05, '#c58b4f', -6, 1.75, -14.18); mbox(2.0, 1.1, 0.02, '#e9d3a8', -6, 1.75, -14.21, { ol: false });
  for (let i = 0; i < 9; i++) mbox(rnd(0.3, 0.45), rnd(0.25, 0.4), 0.01, pick(['#ffffff', '#fff3b0', '#bfe9ff', '#ffd0d6']), -6.8 + (i % 3) * 0.7 + rnd(-0.08, 0.08), 2.1 - Math.floor(i / 3) * 0.36, -14.23, { ol: false, cast: false, rz: rnd(-0.15, 0.15) });
  sign('INFOS DU PERSONNEL', 2.2, 0.32, -6, 2.62, -14.2, Math.PI, { bg: '#3d4454', size: 70 });
  // fontaine à eau, horloge pointeuse
  mbox(0.42, 1.1, 0.36, '#e9edf1', 10.2, 0.55, -14.33); mcyl(0.15, 0.42, null, 10.2, 1.32, -14.33, { mat: glassMat('#9fdcff', 0.45), ol: false }); mbox(0.3, 0.04, 0.2, '#3d4454', 10.2, 1.12, -14.2, { ol: false });
  mbox(0.5, 0.7, 0.18, '#3d4454', -17.2, 1.45, -14.25); mbox(0.36, 0.2, 0.02, null, -17.2, 1.62, -14.15, { mat: basic('#7dffb0'), ol: false }); for (let i = 0; i < 6; i++) mbox(0.07, 0.25, 0.02, pick(['#ffffff', '#ffd23f']), -17.55 + i * 0.07, 1.0, -14.17, { ol: false, cast: false });
  sign('POINTEUSE', 1.0, 0.24, -17.2, 1.95, -14.15, Math.PI, { bg: '#1fb5a3', size: 70 });
  // chariot de ménage
  mbox(0.8, 0.08, 0.55, '#2d7dd2', -3.2, 0.3, -16.13); mbox(0.8, 0.08, 0.55, '#2d7dd2', -3.2, 0.85, -16.13); for (const [x, z] of [[-3.55, -16.35], [-2.85, -16.35], [-3.55, -15.9], [-2.85, -15.9]]) mbox(0.04, 0.85, 0.04, '#9aa3ad', x, 0.45, z, { ol: false });
  mcyl(0.2, 0.3, '#ffd23f', -3.4, 0.5, -16.13, { geo: CYL6 }); mcyl(0.02, 1.4, '#c58b4f', -2.95, 1.05, -16.1, { cast: false, ol: false }); for (let i = 0; i < 3; i++) mbox(0.12, 0.25, 0.08, pick(['#56c271', '#ff7ac6', '#4fb6ff']), -3.5 + i * 0.16, 1.02, -16.2);
  for (const z of [-16.3, -15.95]) { const w = mcyl(0.05, 0.03, '#222', -3.6, 0.05, z, { geo: CYL6, ol: false }); w.rotation.z = Math.PI / 2; }
  // palette de retours
  mbox(1.2, 0.14, 0.82, '#b5834f', 6.2, 0.07, -16.0); for (let i = 0; i < 2; i++) for (let y = 0; y < 2; y++) mbox(0.56, 0.5, 0.74, pick(WING_CARTON), 5.92 + i * 0.58, 0.4 + y * 0.52, -16.0, { ry: rnd(-0.05, 0.05) }); mbox(0.5, 0.2, 0.02, '#ff5a5f', 6.2, 1.2, -15.6, { ol: false });
  sign('RETOURS FOURNISSEURS', 1.3, 0.22, 6.2, 1.48, -15.58, 0, { bg: '#ff5a5f', size: 60 });
  // tuyaux au plafond
  for (const [z, c, r] of [[-16.2, '#9aa3ad', 0.07], [-16.0, '#e63946', 0.05], [-15.85, '#2d7dd2', 0.045]]) { const p = mcyl(r, 39.6, c, 0, 3.72, z, { geo: CYL6, cast: false, ol: false }); p.rotation.z = Math.PI / 2; }
  // panneaux au-dessus des portes
  wingSign('VESTIAIRES', -15.25, -16.4, 0, '#2d7dd2'); wingSign('TOILETTES', -9.25, -16.4, 0, '#1fb5a3'); wingSign('⚡ LOCAL TECHNIQUE', -0.25, -16.4, 0, '#3d4454', '#ffd23f');
  wingSign('ARCHIVES', 4.25, -16.4, 0, '#c58b4f'); wingSign('ENTREPÔT', 12.5, -16.4, 0, '#ff8a3d'); wingSign('ENTREPÔT', 18.9, -16.4, 0, '#ff8a3d');
  wingSign('SALLE DE PAUSE', 3.5, -14.18, Math.PI, '#c58b4f'); wingSign('DIRECTION', 17.7, -14.18, Math.PI, '#ffc83d', '#2a2135');
  sign('SORTIE → COUR', 1.9, 0.38, -19.82, 3.28, -15.3, HP, { bg: '#2bb35a' });
  sign('COULOIR DE SERVICE — PERSONNEL UNIQUEMENT', 4.6, 0.4, 19.83, 2.5, -15.3, -HP, { bg: '#3d4454', size: 60 });
  // ---------- vestiaires ----------
  const lockerRow = (x0, x1, zf, dir, cols) => { const n = Math.round((x1 - x0) / 0.55); for (let i = 0; i < n; i++) { const x = x0 + 0.275 + i * ((x1 - x0) / n); const c = cols[i % cols.length]; mbox(0.5, 1.8, 0.02, c, x, 1.0, zf + dir * 0.012, { ol: false }); for (let k = 0; k < 3; k++) mbox(0.3, 0.02, 0.01, '#2a2135', x, 1.65 + k * 0.05, zf + dir * 0.025, { ol: false, cast: false }); mbox(0.04, 0.1, 0.02, '#c9ced6', x + 0.18, 1.0, zf + dir * 0.03, { ol: false, cast: false }); mbox(0.12, 0.1, 0.01, '#ffffff', x, 1.45, zf + dir * 0.03, { ol: false, cast: false }); } };
  mbox(6.1, 2.0, 0.55, '#d7dce4', -16.65, 1.0, -21.575); lockerRow(-19.7, -13.6, -21.3, 1, ['#2d7dd2', '#1fb5a3']);
  mbox(2.8, 2.0, 0.8, '#d7dce4', -16.8, 1.0, -19.1); lockerRow(-18.2, -15.4, -18.7, 1, ['#ff8a3d', '#ffd23f']); lockerRow(-18.2, -15.4, -19.5, -1, ['#9b6bff', '#ff5a5f']);
  mbox(2.0, 0.07, 0.4, '#c58b4f', -16.8, 0.45, -18.05); for (const x of [-17.6, -16.0]) mbox(0.08, 0.42, 0.32, '#6b4a2b', x, 0.21, -18.05);
  mbox(0.6, 0.35, 0.3, '#e63946', -17.2, 0.65, -18.05, { ry: 0.3 }); mbox(0.3, 0.12, 0.14, '#2a2135', -16.2, 0.06, -17.6, { ry: -0.4 }); mbox(0.3, 0.12, 0.14, '#2a2135', -15.9, 0.06, -17.55, { ry: -0.2 });
  // douche
  mbox(0.06, 2.1, 1.75, '#bfe3f7', -13.47, 1.05, -20.975); mbox(1.25, 0.06, 1.7, '#ffffff', -12.8, 0.03, -20.97, { cast: false });
  mcyl(0.015, 0.6, '#9aa3ad', -12.3, 2.0, -21.75, { cast: false, ol: false }); mcyl(0.09, 0.03, '#c9ced6', -12.45, 2.28, -21.6, { ol: false });
  mbox(1.1, 1.8, 0.02, null, -12.75, 1.2, -20.13, { mat: new THREE.MeshStandardMaterial({ color: '#ffd0e0', roughness: 0.8, transparent: true, opacity: 0.85 }), ol: false }); mcyl(0.012, 1.3, '#c9ced6', -12.8, 2.12, -20.13, { cast: false, ol: false, rz: Math.PI / 2 });
  mbox(0.6, 0.9, 0.03, null, -19.83, 1.6, -18.0, { mat: glassMat('#e6f6ff', 0.5), ry: HP, ol: false }); mbox(0.66, 0.96, 0.02, '#c9ced6', -19.85, 1.6, -18.0, { ry: HP, ol: false });
  for (const [x, c] of [[-19.4, '#2d7dd2'], [-18.9, '#56c271']]) { mbox(0.04, 0.04, 0.12, '#9aa3ad', x, 1.85, -16.8, { ol: false }); mbox(0.35, 0.6, 0.08, c, x, 1.52, -16.82); }
  sign('VESTIAIRES', 1.6, 0.36, -16.8, 2.75, -21.29, 0, { bg: '#2d7dd2' });
  // ---------- toilettes ----------
  const stalls = [-11.05, -9.45, -7.85];
  for (const x of [-10.25, -8.65, -7.05]) { mbox(0.05, 1.8, 1.85, '#5cc8c0', x, 1.05, -20.925); mbox(0.07, 0.06, 1.87, '#3d4454', x, 1.97, -20.925, { ol: false }); }
  stalls.forEach((x, i) => {
    mbox(0.42, 0.42, 0.22, '#ffffff', x, 0.62, -21.72); // réservoir
    mcyl(0.2, 0.38, '#ffffff', x, 0.19, -21.42, { geo: CYL6 }); mcyl(0.22, 0.05, '#f2f2f2', x, 0.41, -21.42, { geo: CYL6 }); mbox(0.42, 0.02, 0.06, '#e6e6e6', x, 0.86, -21.62, { ol: false }); // cuvette + abattant
    mcyl(0.07, 0.11, '#ffffff', x - 0.52, 0.85, -21.2, { geo: CYL6, rx: 0, rz: Math.PI / 2 }); // papier
    leafPanel(x - 0.76, -20.0, 0.66, 1.75, -1.3 + i * 0.15, '#5cc8c0'); // porte ouverte vers l'intérieur
    mbox(0.08, 0.08, 0.02, i === 1 ? '#ff5a5f' : '#56c271', x - 0.42, 1.35, -19.99, { ol: false, cast: false });
  });
  // lavabos
  mbox(0.6, 0.85, 2.8, '#e9edf1', -5.95, 0.42, -19.4); mbox(0.64, 0.05, 2.84, '#bfc6cf', -5.95, 0.87, -19.4, { ol: false });
  for (const z of [-20.3, -18.6]) { mcyl(0.2, 0.06, '#ffffff', -5.95, 0.9, z, { geo: CYL6, ol: false }); mcyl(0.02, 0.2, '#c9ced6', -5.75, 1.0, z, { cast: false, ol: false }); mbox(0.03, 0.8, 0.9, null, -5.66, 1.65, z, { mat: glassMat('#e6f6ff', 0.55), ol: false }); mbox(0.02, 0.86, 0.96, '#c9ced6', -5.665, 1.65, z, { ol: false }); }
  mbox(0.3, 0.28, 0.12, '#e9edf1', -5.7, 1.35, -17.5); mbox(0.2, 0.06, 0.08, '#2a2135', -5.71, 1.2, -17.5, { ol: false });
  sign('🚹 🚺 WC', 1.4, 0.4, -9.2, 2.6, -21.83, 0, { bg: '#1fb5a3' });
  sign('Merci de laisser ces lieux propres 🙏', 2.2, 0.24, -6.2, 2.35, -16.78, Math.PI, { bg: '#ffffff', fg: '#2a2135', size: 50 });
  // ---------- local technique ----------
  mcyl(0.62, 2.4, '#b8bfc8', -4.55, 1.2, -21.17, { kind: 'metal' }); mcyl(0.64, 0.1, '#e63946', -4.55, 2.1, -21.17, { ol: false }); mcyl(0.64, 0.1, '#e63946', -4.55, 0.4, -21.17, { ol: false });
  for (const [y, c] of [[1.55, '#ffffff'], [1.25, '#ffffff']]) { mcyl(0.09, 0.04, c, -4.3, y, -20.55, { rx: HP, ol: false }); mbox(0.01, 0.07, 0.01, '#e63946', -4.3, y + 0.02, -20.52, { ol: false, cast: false, rz: rnd(-1, 1) }); }
  for (const x of [-4.8, -4.3]) mcyl(0.07, 1.4, '#c87a3a', x, 3.2, -21.3, { geo: CYL6, cast: false });
  mcyl(0.42, 2.0, '#f2f2f2', -3.05, 1.0, -21.42); mbox(0.3, 0.2, 0.02, '#2d7dd2', -3.05, 1.4, -20.99, { ol: false });
  mbox(2.2, 2.2, 0.45, '#9aa3ad', -0.7, 1.1, -21.62); for (let i = 0; i < 3; i++) { mbox(0.66, 1.9, 0.02, '#b8bfc8', -1.45 + i * 0.74, 1.1, -21.39, { ol: false }); mbox(0.04, 0.12, 0.03, '#2a2135', -1.2 + i * 0.74, 1.1, -21.37, { ol: false }); }
  sign('⚡ DANGER', 0.7, 0.3, -0.7, 1.7, -21.36, 0, { bg: '#ffd23f', fg: '#2a2135', size: 80 });
  WING.leds = []; for (let i = 0; i < 6; i++) WING.leds.push(mbox(0.04, 0.04, 0.02, null, -1.6 + i * 0.18, 2.0, -21.37, { mat: basic(['#ff5a5f', '#56c271', '#ffd23f'][i % 3], {}), ol: false, cast: false }));
  for (const l of WING.leds) l.userData.dyn = true;
  mbox(0.8, 2.0, 2.0, '#9aa3ad', -2.8, 1.0, -18.6, { kind: 'metal' }); for (const y of [0.4, 1.0, 1.6]) { mbox(0.78, 0.04, 1.96, '#7c858f', -2.8, y, -18.6, { ol: false }); for (let k = 0; k < 4; k++) if (Math.random() < 0.8) (Math.random() < 0.5 ? mcyl(0.12, 0.22, pick(['#2d7dd2', '#ffffff', '#e63946', '#ffd23f']), -2.8, y + 0.13, -19.35 + k * 0.5, { geo: CYL6 }) : mbox(0.45, 0.2, 0.3, pick(['#e63946', '#2a2135', '#ffd23f']), -2.8, y + 0.12, -19.35 + k * 0.5)); }
  mbox(0.9, 0.8, 1.0, '#2d7dd2', 0.75, 0.4, -18.7); mcyl(0.25, 0.4, '#3d4454', 0.75, 0.95, -18.7, { geo: CYL6 }); const pp = mcyl(0.06, 1.0, '#9aa3ad', 0.3, 0.6, -18.7, { geo: CYL6 }); pp.rotation.x = HP;
  for (const [z, c, r] of [[-21.6, '#2d7dd2', 0.06], [-21.3, '#e63946', 0.06], [-20.9, '#9aa3ad', 0.09], [-19.5, '#ffd23f', 0.05]]) { const p = mcyl(r, 6.8, c, -2, 3.6, z, { geo: CYL6, cast: false, ol: false }); p.rotation.z = Math.PI / 2; }
  for (let i = 0; i < 6; i++) decal(0.5, 0.15, i % 2 ? '#2a2135' : '#ffd23f', -0.7 - 1.25 + i * 0.5, -20.9, 0.006);
  sign('HAUTE TENSION — NE PAS TOUCHER', 2.3, 0.3, 0.2, 2.5, -16.78, Math.PI, { bg: '#ffd23f', fg: '#2a2135', size: 56 });
  // ---------- archives ----------
  const binders = (x0, x1, zf, dir, y) => { for (let x = x0 + 0.1; x < x1 - 0.1; x += rnd(0.08, 0.11)) { if (Math.random() < 0.08) { x += 0.15; continue; } mbox(0.07, rnd(0.3, 0.36), 0.3, pick(['#2d7dd2', '#e63946', '#56c271', '#ffd23f', '#9b6bff', '#3d4454', '#ff8a3d']), x, y + 0.2, zf + dir * 0.16, { ol: false, rz: Math.random() < 0.08 ? 0.3 : 0 }); } };
  const shelfFrame = (x0, x1, z0, z1, sides) => { const cx = (x0 + x1) / 2, cz = (z0 + z1) / 2, w = x1 - x0, d = z1 - z0; for (const x of [x0 + 0.03, x1 - 0.03]) mbox(0.05, 2.3, d, '#7a5236', x, 1.15, cz); for (const y of [0.1, 0.6, 1.1, 1.6, 2.1]) { mbox(w, 0.04, d, '#a0744b', cx, y, cz, { ol: false }); if (y < 2) for (const [zf, dir] of sides) binders(x0, x1, zf, dir, y); } };
  shelfFrame(1.65, 6.4, -21.85, -21.35, [[-21.85, 1]]); shelfFrame(3.2, 8.35, -19.9, -19.4, [[-19.9, -1], [-19.4, 1]].map(([z, d]) => [z + (d > 0 ? -0.33 : 0.03), d]));
  mbox(1.5, 0.06, 0.8, '#7a5236', 7.45, 0.78, -17.7); for (const [x, z] of [[6.75, -18.05], [8.15, -18.05], [6.75, -17.35], [8.15, -17.35]]) mbox(0.06, 0.76, 0.06, '#5b3d22', x, 0.38, z, { ol: false });
  mbox(0.6, 0.35, 0.45, '#e9edf1', 7.75, 1.0, -17.75); mbox(0.5, 0.02, 0.32, '#2a2135', 7.75, 1.18, -17.75, { ol: false }); mcyl(0.02, 0.35, '#2a2135', 7.0, 0.98, -17.9, { cast: false, ol: false }); mcone(0.1, 0.12, '#56c271', 7.08, 1.17, -17.84);
  for (let i = 0; i < 7; i++) mbox(0.21, 0.01, 0.29, '#ffffff', 7.1 + rnd(-0.12, 0.12), 0.82 + i * 0.008, -17.55 + rnd(-0.06, 0.06), { ol: false, cast: false, ry: rnd(-0.5, 0.5) });
  for (const [x, z, n] of [[2.2, -18.0, 3], [2.8, -17.3, 2], [5.6, -17.25, 2]]) for (let k = 0; k < n; k++) { mbox(0.42, 0.3, 0.32, '#e2b07a', x + rnd(-0.03, 0.03), 0.15 + k * 0.31, z, { ry: rnd(-0.15, 0.15) }); mbox(0.2, 0.08, 0.005, '#ffffff', x, 0.17 + k * 0.31, z + 0.165, { ol: false, cast: false }); }
  sign('ARCHIVES 1998 – 2026', 2.0, 0.34, 4.0, 2.65, -21.33, 0, { bg: '#c58b4f' });
  sign('NE PAS DÉRANGER LES DOSSIERS', 2.2, 0.26, 4.6, 2.4, -16.78, Math.PI, { bg: '#ffffff', fg: '#2a2135', size: 52 });
  // ---------- entrepôt ----------
  for (const x of [10.6, 13.6, 16.6]) rackUnit(x, x + 0.8, -21.85, -18.6, 3.2, [0.15, 1.2, 2.25]);
  for (const x of [9.55, 12.5, 15.5, 18.6]) { decal(0.1, 5.0, '#ffd23f', x - 0.95, -19.3); decal(0.1, 5.0, '#ffd23f', x + 0.95, -19.3); }
  // transpalette électrique
  mbox(0.9, 1.1, 0.7, '#ffd23f', 9.4, 0.6, -17.95); mbox(0.86, 0.05, 0.66, '#2a2135', 9.4, 1.17, -17.95, { ol: false }); for (const s of [-1, 1]) mbox(0.16, 0.08, 1.0, '#3d4454', 9.4 + s * 0.25, 0.06, -17.2);
  mcyl(0.025, 0.55, '#2a2135', 9.4, 1.35, -18.25, { cast: false }); mbox(0.4, 0.05, 0.05, '#2a2135', 9.4, 1.62, -18.25, { ol: false });
  // le fort en cartons (coin pour glander)
  for (const [x, z, y, ry] of [[14.9, -21.55, 0, 0.1], [15.5, -21.6, 0, -0.05], [16.1, -21.55, 0, 0.08], [14.85, -21.0, 0, HP], [16.15, -21.0, 0, HP + 0.1], [15.2, -21.58, 1, 0.2], [15.85, -21.55, 1, -0.1], [14.85, -20.45, 0, HP - 0.1]]) mbox(0.55, 0.42, 0.45, pick(WING_CARTON), x, 0.21 + y * 0.43, z, { ry });
  sign('QG — INTERDIT AU DIRECTEUR', 1.2, 0.22, 15.5, 1.08, -21.33, 0, { bg: '#ffffff', fg: '#e63946', size: 60 }).rotation.z = 0.06;
  // porte de quai fermée (décor) et panneaux
  mbox(0.06, 3.2, 3.2, '#c9ced6', 19.83, 1.6, -19.3); for (let k = 0; k < 10; k++) mbox(0.07, 0.03, 3.1, '#9aa3ad', 19.82, 0.2 + k * 0.32, -19.3, { ol: false, cast: false });
  sign('QUAI 2 — HORS SERVICE', 2.4, 0.36, 19.8, 3.45, -19.3, -HP, { bg: '#e63946' });
  sign('PORT DES CHAUSSURES DE SÉCURITÉ OBLIGATOIRE', 3.2, 0.3, 12.5, 2.5, -16.78, Math.PI, { bg: '#2d7dd2', size: 52 });
  // ---------- cour de service (dehors, derrière le quai) ----------
  MAT_ZONE = 'out';
  mbox(2.0, 1.75, 1.7, '#3a9a5a', -25.3, 0.875, -15.35); mbox(2.06, 0.12, 1.76, '#2f7f49', -25.3, 1.8, -15.35, { ol: false }); mbox(0.5, 0.35, 0.05, '#e63946', -24.7, 1.3, -14.48, { ol: false });
  sign('COMPACTEUR', 1.4, 0.32, -25.3, 1.0, -14.48, 0, { bg: '#ffd23f', fg: '#2a2135', size: 70 });
  for (let k = 0; k < 9; k++) mbox(1.2, 0.14, 0.8, '#b5834f', -21.3 + rnd(-0.05, 0.05), 0.07 + k * 0.155, -21.1, { ry: rnd(-0.08, 0.08) });
  // banc au soleil (sans collision : on s'assoit dessus)
  mbox(2.0, 0.07, 0.42, '#c58b4f', -23.5, 0.45, -21.25); mbox(2.0, 0.42, 0.06, '#c58b4f', -23.5, 0.78, -21.47, { rx: -0.12 }); for (const x of [-24.35, -22.65]) mbox(0.08, 0.45, 0.4, '#3d4454', x, 0.22, -21.25);
  mbox(0.4, 0.35, 0.4, '#b5834f', -22.2, 0.17, -20.4); mbox(0.22, 0.12, 0.14, '#e63946', -22.2, 0.42, -20.4); mcyl(0.03, 0.08, '#ffffff', -22.1, 0.39, -20.32, { geo: CYL6, ol: false });
  mcyl(0.28, 0.45, '#c0663a', -26.1, 0.22, -21.5, { geo: CYL6 }); msph(0.5, '#4fae3f', -26.1, 0.85, -21.5, { geo: ICO0 });
  // grillage autour de la cour
  const fenceM = new THREE.MeshStandardMaterial({ color: '#9aa3ad', transparent: true, opacity: 0.35, side: THREE.DoubleSide, roughness: 0.6 });
  for (let x = -26.6; x <= -20.2; x += 1.6) mcyl(0.04, 1.8, '#7c858f', x, 0.9, -22.0, { geo: CYL6 });
  for (let z = -22; z <= -6.4; z += 1.6) mcyl(0.04, 1.8, '#7c858f', -26.6, 0.9, z, { geo: CYL6 });
  wallPlane(null, 6.4, 1.7, -23.4, 0.9, -22.0, 0, { mat: fenceM }); wallPlane(null, 15.6, 1.7, -26.6, 0.9, -14.2, HP, { mat: fenceM });
  sign('COUR DE SERVICE', 2.2, 0.4, -20.1, 2.6, -18.5, -HP, { bg: '#3d4454' });
  MAT_ZONE = 'in';
  // ---------- surface de vente : gondole bazar ----------
  mbox(1.0, 0.14, 5.0, '#3d4454', 15.1, 0.07, -0.9); mbox(0.1, 2.05, 5.0, '#d7dce4', 15.1, 1.1, -0.9);
  for (const y of [0.32, 0.9, 1.48, 2.02]) mbox(0.98, 0.05, 5.0, '#ffffff', 15.1, y, -0.9, { cast: false });
  mbox(1.04, 2.15, 0.12, '#9b6bff', 15.1, 1.07, 1.6); mbox(1.04, 2.15, 0.12, '#9b6bff', 15.1, 1.07, -3.4);
  const bazarItem = (x, y, z) => { const r = Math.random(), c = pick(['#ff5a5f', '#2d7dd2', '#56c271', '#ffd23f', '#9b6bff', '#ff7ac6', '#1fb5a3', '#ff8a3d']);
    if (r < 0.25) mcyl(0.11, 0.22, c, x, y + 0.11, z, { geo: CYL6 }); // seau, pot
    else if (r < 0.45) { mbox(0.24, 0.28, 0.2, c, x, y + 0.14, z); mbox(0.16, 0.1, 0.005, '#ffffff', x + (x > 15.1 ? 0.121 : -0.121), y + 0.18, z, { ol: false, cast: false, ry: HP }); } // boîte de jouet
    else if (r < 0.65) { for (let k = 0; k < 3; k++) mbox(0.26, 0.06, 0.2, k % 2 ? '#ffffff' : c, x, y + 0.03 + k * 0.065, z, { ol: false }); } // serviettes pliées
    else if (r < 0.8) { mcyl(0.12, 0.08, '#3d4454', x, y + 0.04, z, { geo: CYL6 }); mbox(0.04, 0.03, 0.18, '#2a2135', x, y + 0.07, z + 0.18, { ol: false }); } // poêle
    else msph(0.1, c, x, y + 0.1, z, { geo: ICO0 }); }; // ballon
  for (const y of [0.34, 0.92, 1.5]) for (const s of [-1, 1]) for (let z = -3.1; z < 1.35; z += 0.36) if (Math.random() < 0.85) bazarItem(15.1 + s * 0.27, y, z + rnd(-0.03, 0.03));
  for (const s of [-1, 1]) for (const y of [0.3, 0.88, 1.46]) mbox(0.02, 0.07, 5.0, '#9b6bff', 15.1 + s * 0.5, y, -0.9, { cast: false, ol: false });
  sign('◂ BAZAR · MAISON ▸', 3.0, 0.5, 15.1, 3.15, 1.75, 0, { bg: '#9b6bff' }); sign('◂ BAZAR · MAISON ▸', 3.0, 0.5, 15.1, 3.15, -3.55, Math.PI, { bg: '#9b6bff' });
  for (const z of [1.75, -3.55]) for (const s of [-1, 1]) mcyl(0.015, 0.8, '#666', 15.1 + s * 1.2, 3.7, z, { cast: false, ol: false });
  sign('PETITS PRIX', 0.9, 0.3, 15.1, 1.55, 1.68, 0, { bg: '#ff5a5f', size: 80 });
  // ---------- îlot de palettes promo ----------
  mbox(1.4, 0.14, 1.6, '#b5834f', 10.3, 0.07, 2.7);
  for (let y = 0; y < 3; y++) for (let i = 0; i < 2; i++) for (let j = 0; j < 2; j++) { const hh = 0.6; mbox(0.66, hh - 0.02, 0.76, pick(['#ff5a5f', '#ffd23f', '#ff8a3d']), 9.97 + i * 0.67, 0.15 + hh / 2 + y * hh, 2.31 + j * 0.78); }
  for (const [x, z, ry] of [[10.3, 1.88, 0], [10.3, 3.52, Math.PI], [9.58, 2.7, -HP], [11.02, 2.7, HP]]) sign('MÉGA PROMO', 0.95, 0.3, x, 1.05, z, ry, { bg: '#ffffff', fg: '#e63946', size: 80 });
  mcyl(0.02, 0.5, '#777', 10.3, 2.2, 2.7, { cast: false, ol: false }); sign('−50 % SUR LA 2ᵉ PALETTE', 2.2, 0.45, 10.3, 2.6, 2.7, 0, { bg: '#e63946', fg: '#fff', double: true });
  // ---------- réserve : rangée de racks ----------
  rackUnit(-16.5, -12.5, -10.6, -9.8, 3.0, [0.15, 1.15, 2.15], 0.9);
  sign('ALLÉE B', 0.9, 0.3, -12.48, 2.75, -10.2, HP, { bg: '#ffd23f', fg: '#2a2135' });
}
// petit mouvement : voyants du tableau électrique
const WING = { leds: [], t: 0, cull: [], vis: null };
function wingTick(dt) {
  WING.t += dt; if (WING.t < 0.35) return; WING.t = 0;
  for (const l of WING.leds) l.visible = Math.random() < 0.7;
}
