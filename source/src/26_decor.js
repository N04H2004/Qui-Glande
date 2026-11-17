// ======================= DÉCOR : habillage du magasin + petits mouvements (purement visuel) =======================
// Rien ici n'entre dans la simulation : pas de collision, pas d'état partagé. Les décors intérieurs restent plats au sol,
// au plafond, ou posés contre les murs et sur les meubles existants.
const DECOR = { fans: [], belts: [], screens: null, flick: null, sensor: null, t: 0, scrT: 0 };
const NEON_FLICK = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.5, 2.85, 3.4) });
// petits utilitaires
function decalTex(w, h, draw) { const t = canvasTex(w, h, draw); t.wrapS = t.wrapT = THREE.ClampToEdgeWrapping; return t; }
function flat(tex, w, d, x, y, z, ry = 0, o = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, d), new THREE.MeshBasicMaterial({ map: tex, transparent: true, depthWrite: false, opacity: o.opacity ?? 1, color: o.color || '#ffffff', polygonOffset: true, polygonOffsetFactor: -2, polygonOffsetUnits: -2 }));
  m.rotation.set(-Math.PI / 2, 0, ry); m.position.set(x, y, z); m.renderOrder = o.order ?? 0; m.userData.dyn = true; scene.add(m); return m;
}
function wallPlane(tex, w, h, x, y, z, ry, o = {}) {
  const m = new THREE.Mesh(new THREE.PlaneGeometry(w, h), o.mat || new THREE.MeshStandardMaterial({ map: tex, roughness: o.rough ?? 0.6, metalness: 0, transparent: !!o.transparent, depthWrite: !o.transparent }));
  m.position.set(x, y, z); m.rotation.y = ry; m.userData.dyn = true; if (o.parent) o.parent.add(m); else scene.add(m); return m;
}
function tube(points, r, color, o = {}) {
  const curve = new THREE.CatmullRomCurve3(points.map((p) => new THREE.Vector3(...p)));
  const m = new THREE.Mesh(new THREE.TubeGeometry(curve, o.seg || 48, r, 6, false), mat(color, { kind: o.kind || 'plastic' })); m.castShadow = false; m.receiveShadow = true; scene.add(m); return m;
}
// ---------- affiches et visuels promo (canvas) ----------
function posterTex(kind) {
  return canvasTex(256, 360, (x, w, h) => {
    const C = { promo: ['#ff4d5a', '#ffd23f'], deux: ['#1fb5a3', '#ffffff'], frais: ['#56c271', '#fff6e6'], nouveau: ['#9b6bff', '#ffd23f'], bas: ['#2d7dd2', '#ffd23f'], fid: ['#ff8a3d', '#fff6e6'] }[kind];
    x.fillStyle = C[0]; x.fillRect(0, 0, w, h);
    for (let i = -h; i < w; i += 34) { x.fillStyle = 'rgba(255,255,255,.08)'; x.beginPath(); x.moveTo(i, 0); x.lineTo(i + 17, 0); x.lineTo(i + 17 + h, h); x.lineTo(i + h, h); x.fill(); }
    x.strokeStyle = '#2a2135'; x.lineWidth = 10; x.strokeRect(5, 5, w - 10, h - 10);
    x.textAlign = 'center'; x.textBaseline = 'middle'; x.lineJoin = 'round';
    const txt = (s, y, size, col = C[1], st = '#2a2135') => { x.font = `700 ${size}px Fredoka, Arial, sans-serif`; while (x.measureText(s).width > w - 36 && size > 12) { size -= 2; x.font = `700 ${size}px Fredoka, Arial, sans-serif`; } x.lineWidth = size / 6; x.strokeStyle = st; x.strokeText(s, w / 2, y); x.fillStyle = col; x.fillText(s, w / 2, y); };
    const burst = (cx, cy, r, col) => { x.fillStyle = col; x.beginPath(); for (let k = 0; k < 24; k++) { const a = (k / 24) * 6.283, rr2 = k % 2 ? r * 0.78 : r; x.lineTo(cx + Math.cos(a) * rr2, cy + Math.sin(a) * rr2); } x.closePath(); x.fill(); x.lineWidth = 6; x.strokeStyle = '#2a2135'; x.stroke(); };
    if (kind === 'promo') { txt('PROMO', 60, 64); burst(128, 190, 92, '#ffd23f'); txt('-30%', 192, 70, '#ff4d5a', '#2a2135'); txt('sur tout le rayon frais', 318, 22, '#ffffff'); }
    else if (kind === 'deux') { txt('2 ACHETÉS', 64, 44); txt('=', 120, 44); txt('1 OFFERT', 176, 52, '#ffd23f'); picto(x, 4, 128, 268, 46); txt('Eaux & jus', 330, 24); }
    else if (kind === 'frais') { txt('LE FRAIS', 56, 46); txt("DU JOUR", 108, 40, '#ffd23f'); picto(x, 8, 128, 226, 66); txt('Yaourts · Lait · Beurre', 326, 20); }
    else if (kind === 'nouveau') { burst(128, 120, 96, '#ffd23f'); txt('NOUVEAU', 122, 40, '#9b6bff'); picto(x, 0, 128, 262, 40); txt('Cookies choco', 326, 26, '#ffffff'); }
    else if (kind === 'bas') { txt('PRIX', 66, 70, '#ffd23f'); txt('BAS', 146, 84, '#ffffff'); txt('toute l’année', 216, 30, '#ffd23f'); txt('0,89 €', 292, 56, '#ffffff'); }
    else { txt('CARTE', 64, 52); txt('FIDÉLITÉ', 122, 52, '#ff8a3d'); x.fillStyle = '#ffd23f'; rr(x, 58, 170, 140, 88, 12); x.fill(); x.lineWidth = 6; x.strokeStyle = '#2a2135'; x.stroke(); x.fillStyle = '#2a2135'; x.fillRect(58, 192, 140, 16); txt('-10 % dès le 1er achat', 314, 22); }
  });
}
// ---------- textures de détail ----------
function wearTex() { // sol usé : traces de passage, rayures, marques de roues
  return decalTex(512, 256, (x, w, h) => {
    for (let i = 0; i < 260; i++) { const cx = rnd(0, w), cy = rnd(0, h), r = rnd(6, 40); const g = x.createRadialGradient(cx, cy, 1, cx, cy, r); g.addColorStop(0, `rgba(70,45,25,${rnd(0.05, 0.12)})`); g.addColorStop(1, 'rgba(70,45,25,0)'); x.fillStyle = g; x.fillRect(cx - r, cy - r, r * 2, r * 2); }
    for (let i = 0; i < 90; i++) { x.strokeStyle = `rgba(60,40,25,${rnd(0.05, 0.16)})`; x.lineWidth = rnd(0.6, 2); x.beginPath(); const sx = rnd(0, w), sy = rnd(0, h); x.moveTo(sx, sy); x.quadraticCurveTo(sx + rnd(-30, 30), sy + rnd(-10, 10), sx + rnd(-60, 60), sy + rnd(-14, 14)); x.stroke(); }
    for (let k = 0; k < 6; k++) { const y0 = rnd(20, h - 20); x.strokeStyle = 'rgba(40,30,30,.07)'; x.lineWidth = 5; x.beginPath(); x.moveTo(0, y0); x.bezierCurveTo(w * 0.3, y0 + rnd(-30, 30), w * 0.7, y0 + rnd(-30, 30), w, y0 + rnd(-20, 20)); x.stroke(); }
    const fade = x.createLinearGradient(0, 0, 0, h); x.globalCompositeOperation = 'destination-in'; fade.addColorStop(0, 'rgba(0,0,0,0)'); fade.addColorStop(0.18, 'rgba(0,0,0,1)'); fade.addColorStop(0.82, 'rgba(0,0,0,1)'); fade.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = fade; x.fillRect(0, 0, w, h);
    const f2 = x.createLinearGradient(0, 0, w, 0); f2.addColorStop(0, 'rgba(0,0,0,0)'); f2.addColorStop(0.1, 'rgba(0,0,0,1)'); f2.addColorStop(0.9, 'rgba(0,0,0,1)'); f2.addColorStop(1, 'rgba(0,0,0,0)'); x.fillStyle = f2; x.fillRect(0, 0, w, h); x.globalCompositeOperation = 'source-over';
  });
}
function frostTex(edge = 1) { // givre : cristaux denses sur les bords, voile léger au centre
  return decalTex(256, 256, (x, w, h) => {
    const g = x.createRadialGradient(w / 2, h / 2, w * 0.15, w / 2, h / 2, w * 0.72); g.addColorStop(0, 'rgba(235,248,255,.10)'); g.addColorStop(1, `rgba(235,248,255,${0.55 * edge})`); x.fillStyle = g; x.fillRect(0, 0, w, h);
    for (let i = 0; i < 140; i++) { const px = rnd(0, w), py = rnd(0, h), d = Math.min(px, py, w - px, h - py) / (w / 2); if (Math.random() < d * 2) continue; const r = rnd(10, 34), gg = x.createRadialGradient(px, py, 1, px, py, r); gg.addColorStop(0, `rgba(245,252,255,${0.35 * edge})`); gg.addColorStop(1, 'rgba(245,252,255,0)'); x.fillStyle = gg; x.fillRect(px - r, py - r, r * 2, r * 2); }
    for (let i = 0; i < 160; i++) {
      let px = rnd(0, w), py = rnd(0, h); const d = Math.min(px, py, w - px, h - py) / (w / 2); if (Math.random() < d * 2.4) continue;
      x.strokeStyle = `rgba(255,255,255,${rnd(0.15, 0.4)})`; x.lineWidth = rnd(0.5, 1);
      for (let b = 0; b < 3; b++) { const a = rnd(0, 6.283), L = rnd(4, 14); x.beginPath(); x.moveTo(px, py); x.lineTo(px + Math.cos(a) * L, py + Math.sin(a) * L); x.stroke(); }
    }
    for (let i = 0; i < 900; i++) { x.fillStyle = `rgba(255,255,255,${rnd(0.05, 0.3)})`; x.fillRect(rnd(0, w), rnd(0, h), 1.5, 1.5); }
  });
}
function fogTex() { // buée sur une vitre de frigo : dense en bas, avec des traînées de gouttes
  return decalTex(128, 256, (x, w, h) => {
    const g = x.createLinearGradient(0, h, 0, 0); g.addColorStop(0, 'rgba(240,250,255,.78)'); g.addColorStop(0.55, 'rgba(240,250,255,.38)'); g.addColorStop(1, 'rgba(240,250,255,0)'); x.fillStyle = g; x.fillRect(0, 0, w, h);
    x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 9; i++) { const sx = rnd(6, w - 6), sy = rnd(h * 0.4, h * 0.85); x.lineWidth = rnd(1.5, 3); x.strokeStyle = 'rgba(0,0,0,.75)'; x.beginPath(); x.moveTo(sx, sy); x.lineTo(sx + rnd(-2, 2), h); x.stroke(); x.beginPath(); x.arc(sx, sy, 2.2, 0, 6.3); x.fill(); } x.globalCompositeOperation = 'source-over';
    for (let i = 0; i < 260; i++) { x.fillStyle = `rgba(255,255,255,${rnd(0.1, 0.5)})`; const r = rnd(0.6, 1.8); x.beginPath(); x.arc(rnd(0, w), rnd(h * 0.35, h), r, 0, 6.3); x.fill(); }
  });
}
function parkTex(kind) { // marquages au sol peints (blanc ou bleu), légèrement usés
  return decalTex(256, 256, (x, w, h) => {
    x.lineJoin = 'round'; x.lineCap = 'round';
    if (kind === 'arrow') { x.fillStyle = '#ffffff'; x.beginPath(); x.moveTo(128, 18); x.lineTo(214, 112); x.lineTo(160, 112); x.lineTo(160, 238); x.lineTo(96, 238); x.lineTo(96, 112); x.lineTo(42, 112); x.closePath(); x.fill(); }
    else if (kind === 'pmr') { x.fillStyle = '#2d7dd2'; x.fillRect(0, 0, w, h); x.fillStyle = '#ffffff'; x.beginPath(); x.arc(118, 60, 18, 0, 6.3); x.fill(); x.lineWidth = 16; x.strokeStyle = '#ffffff'; x.beginPath(); x.moveTo(112, 88); x.lineTo(112, 150); x.lineTo(168, 150); x.lineTo(184, 196); x.stroke(); x.beginPath(); x.moveTo(112, 112); x.lineTo(156, 112); x.stroke(); x.lineWidth = 12; x.beginPath(); x.arc(108, 176, 46, 0.4, 3.9); x.stroke(); }
    else if (kind === 'stop') { x.fillStyle = '#ffffff'; x.font = '700 104px Fredoka, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText('STOP', 128, 140); x.fillRect(16, 222, 224, 16); }
    else if (kind === 'oil') { for (let k = 0; k < 3; k++) { const cx = rnd(70, 186), cy = rnd(70, 186), r = rnd(30, 70); const g = x.createRadialGradient(cx, cy, 2, cx, cy, r); g.addColorStop(0, 'rgba(20,18,22,.55)'); g.addColorStop(0.7, 'rgba(20,18,22,.25)'); g.addColorStop(1, 'rgba(20,18,22,0)'); x.fillStyle = g; x.beginPath(); x.ellipse(cx, cy, r, r * rnd(0.6, 0.9), rnd(0, 3), 0, 6.3); x.fill(); } }
    else { x.fillStyle = '#ffffff'; x.font = '700 150px Fredoka, Arial, sans-serif'; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(kind, 128, 136); }
    if (kind !== 'oil') { x.globalCompositeOperation = 'destination-out'; for (let i = 0; i < 700; i++) { x.fillStyle = `rgba(0,0,0,${rnd(0.1, 0.7)})`; x.fillRect(rnd(0, w), rnd(0, h), rnd(1, 4), rnd(1, 3)); } x.globalCompositeOperation = 'source-over'; }
  });
}
// ---------- ventilateur générique : un groupe qui tourne (pales) dans un support fixe ----------
function fanBlades(parent, r, n, color, axis = 'y', speed = 9) {
  const g = new THREE.Group(); parent.add(g);
  for (let k = 0; k < n; k++) {
    const a = (k / n) * Math.PI * 2, b = new THREE.Mesh(rboxGeo(r, 0.018, r * 0.28, 0.006), mat(color));
    if (axis === 'y') { b.position.set(Math.cos(a) * r * 0.55, 0, Math.sin(a) * r * 0.55); b.rotation.set(0.18, -a, 0); }
    else { b.position.set(Math.cos(a) * r * 0.55, Math.sin(a) * r * 0.55, 0); b.rotation.set(Math.PI / 2, 0.22, a); }
    b.castShadow = axis === 'y'; g.add(b);
  }
  const hub = new THREE.Mesh(SPHG, mat('#3d4454')); hub.scale.setScalar(r * 0.16); g.add(hub);
  DECOR.fans.push({ g, axis, speed: speed * rnd(0.9, 1.1) }); return g;
}
// =================================================================================================
function buildDecor() {
  const D = (o) => { o.userData.dyn = true; return o; };
  // ---------- surface de vente : affiches promo murales ----------
  const posters = [['promo', -17.2, 2.35, 13.83, Math.PI], ['deux', -11.0, 2.35, 13.83, Math.PI], ['bas', -6.6, 2.35, 13.83, Math.PI], ['nouveau', -1.8, 2.35, 13.83, Math.PI], ['frais', -19.83, 2.3, -4.4, HP], ['fid', -19.83, 2.3, 10.0, HP], ['promo', 19.83, 3.05, 8.0, -HP], ['nouveau', 3.4, 2.35, -5.83, 0]];
  for (const [k, x, y, z, ry] of posters) { mbox(1.02, 1.42, 0.03, '#2a2135', x + Math.sin(ry) * 0.012, y, z + Math.cos(ry) * 0.012, { ry, cast: false, ol: false }); wallPlane(posterTex(k), 0.92, 1.3, x + Math.sin(ry) * 0.03, y, z + Math.cos(ry) * 0.03, ry, { rough: 0.45 }); }
  // ---------- panneaux d'allée suspendus (double face) ----------
  const aisles = [[-16.6, 1, 'Biscuits · Boissons'], [-11.5, 2, 'Céréales · Pâtes & riz'], [-6.5, 3, 'Conserves · Boissons'], [-1.5, 4, 'Sodas · Hygiène'], [3.0, 5, 'Entretien · Surgelés']];
  for (const [x, n, txt] of aisles) {
    for (const s of [-0.7, 0.7]) mcyl(0.008, 0.62, '#666', x + s, 3.68, 1.0, { cast: false, ol: false });
    mbox(1.9, 0.62, 0.06, '#ffffff', x, 3.06, 1.0, { cast: false });
    for (const ry of [0, Math.PI]) { const zz = 1.0 + (ry ? -0.034 : 0.034); sign('ALLÉE ' + n, 1.8, 0.3, x, 3.17, zz, ry, { bg: '#ff8a3d', size: 80 }); sign(txt, 1.8, 0.24, x, 2.9, zz, ry, { bg: null, fg: '#2a2135', size: 70 }); }
  }
  // ---------- stop-rayons qui dépassent des étagères (instanciés : un seul appel de dessin) ----------
  const wob = canvasTex(512, 128, (x) => { const L = [['-20%', '#ff4d5a', '#ffffff'], ['PROMO', '#ffd23f', '#d62828'], ['NOUVEAU', '#9b6bff', '#ffffff'], ['★ TOP', '#1fb5a3', '#ffffff']]; L.forEach(([t, bg, fg], i) => { const ox = i * 128; x.fillStyle = bg; x.beginPath(); x.arc(ox + 64, 64, 58, 0, 6.3); x.fill(); x.lineWidth = 7; x.strokeStyle = '#2a2135'; x.stroke(); x.fillStyle = fg; x.font = `700 ${t.length > 4 ? 26 : 38}px Fredoka, Arial`; x.textAlign = 'center'; x.textBaseline = 'middle'; x.fillText(t, ox + 64, 66); }); });
  const wobs = []; SHELVES.forEach((S2, si) => { if (S2.kind !== 'gond' && S2.kind !== 'fridge') return; for (let k = 0; k < 3; k++) { const l = rndi(0, S2.levels.length - 1), c = rndi(0, S2.cols - 1); wobs.push([S2.face + S2.side * 0.13, S2.levels[l] - 0.02, S2.z0 + c * S2.dz + 0.35, S2.side, rndi(0, 3)]); } });
  const wc = new Float32Array(wobs.length * 2), wim = new THREE.InstancedMesh(instGeo(new THREE.PlaneGeometry(0.2, 0.2), wc), cellPatch(new THREE.MeshBasicMaterial({ map: wob, transparent: true, alphaTest: 0.5, side: THREE.DoubleSide }), 4, 1), wobs.length);
  wobs.forEach(([x, y, z, sd, k], i) => { wc[i * 2] = k; wc[i * 2 + 1] = 0; DUMMY.position.set(x, y, z); DUMMY.rotation.set(0, 0, rnd(-0.12, 0.12)); DUMMY.scale.set(1, 1, 1); DUMMY.updateMatrix(); wim.setMatrixAt(i, DUMMY.matrix); });
  wim.userData.dyn = true; wim.frustumCulled = false; scene.add(wim);
  // ---------- dessus de gondoles : surstock emballé (palettes de packs sous film) ----------
  GOND_X.forEach((gx, gi) => { for (const [k, z] of [[0, -0.65], [1, 2.05], [2, 4.4]]) { const c = PALETTES[gi * 2 + (k % 2)][k % 4]; mbox(0.7, 0.3, 0.52, c, gx + rnd(-0.1, 0.1), 2.18, z, { ry: rnd(-0.1, 0.1) }); mbox(0.72, 0.04, 0.54, '#e9f2f8', gx, 2.345, z, { kind: 'enamel', ol: false, cast: false }); } });
  // ---------- caisses : tapis roulant animé, séparateurs, écrans ----------
  const beltImg = canvasTex(64, 64, (x, w, h) => { x.fillStyle = '#24202b'; x.fillRect(0, 0, w, h); for (let i = 0; i < 4; i++) { x.fillStyle = 'rgba(255,255,255,.07)'; x.fillRect(0, i * 16, w, 3); } speckle(x, w, h, 120, 0.06, 2); });
  beltImg.wrapS = beltImg.wrapT = THREE.RepeatWrapping;
  const scr = { cv: document.createElement('canvas'), w: 192, h: 112 }; scr.cv.width = scr.w * 3; scr.cv.height = scr.h; scr.tex = new THREE.CanvasTexture(scr.cv); scr.tex.colorSpace = THREE.SRGBColorSpace; scr.st = [0, 1, 2].map(() => ({ items: [], total: 0, t: 0 }));
  const scrMat = new THREE.MeshBasicMaterial({ map: scr.tex, color: new THREE.Color(1.25, 1.25, 1.25) }); DECOR.screens = scr;
  CHECKOUTS.forEach((c, k) => {
    const t = beltImg.clone(); t.needsUpdate = true; t.repeat.set(1, 6);
    const belt = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 2.08), new THREE.MeshStandardMaterial({ map: t, roughness: 0.75, metalness: 0 })); belt.rotation.x = -HP; belt.position.set(c, 0.933, 9.6); belt.receiveShadow = true; D(belt); scene.add(belt);
    DECOR.belts.push({ t, k, run: 0, ph: rnd(0, 3) });
    mbox(0.58, 0.05, 0.05, '#c9d2db', c, 0.97, 9.35 + rnd(-0.2, 0.2), { cast: false }); mbox(0.04, 0.12, 2.1, '#3d4454', c - 0.31, 0.97, 9.6, { cast: false, ol: false }); mbox(0.04, 0.12, 2.1, '#3d4454', c + 0.31, 0.97, 9.6, { cast: false, ol: false });
    // écran caissier (fait face au caissier) + petit afficheur client
    const g = new THREE.PlaneGeometry(0.3, 0.18), uv = g.attributes.uv; for (let i = 0; i < uv.count; i++) uv.setX(i, (uv.getX(i) + k) / 3);
    const s = new THREE.Mesh(g, scrMat); s.position.set(c + 0.05, 1.43, 10.776); s.rotation.y = Math.PI; D(s); scene.add(s);
    mcyl(0.015, 0.3, '#3d4454', c - 0.3, 1.1, 9.0, { cast: false, ol: false }); mbox(0.22, 0.12, 0.04, '#2a2135', c - 0.3, 1.3, 9.0, { cast: false });
    const g2 = new THREE.PlaneGeometry(0.19, 0.09), uv2 = g2.attributes.uv; for (let i = 0; i < uv2.count; i++) { uv2.setX(i, (uv2.getX(i) * 0.98 + k) / 3); uv2.setY(i, 0.04 + uv2.getY(i) * 0.24); }
    const s2 = new THREE.Mesh(g2, scrMat); s2.position.set(c - 0.3, 1.3, 8.978); s2.rotation.y = Math.PI; D(s2); scene.add(s2);
    // sacs et présentoir de friandises
    mbox(0.3, 0.04, 0.25, '#ffffff', c + 0.2, 0.96, 11.3, { cast: false, ol: false });
  });
  drawScreens(null, 0);
  // ---------- sol usé devant les caisses et à l'entrée ----------
  const wear = wearTex(); flat(wear, 15.5, 6.2, -9.0, 0.008, 9.6, 0, { order: 1 }); flat(wear, 5.5, 3.2, 13, 0.008, 12.2, HP * 0.12, { order: 1, opacity: 0.8 });
  for (const c of CHECKOUTS) flat(wear, 3.6, 1.2, c - 1.0, 0.0085, 8.0, HP, { order: 1, opacity: 0.9 });
  // ---------- réserve : câbles, goulotte au plafond, cartons ----------
  tube([[-15.3, 0.3, -6.17], [-15.3, 0.06, -6.22], [-15.1, 0.012, -6.6], [-14.4, 0.012, -7.25], [-13.4, 0.012, -7.6], [-12.4, 0.012, -8.15], [-11.9, 0.012, -8.32]], 0.012, '#2a2135', { kind: 'matte' });
  mbox(0.36, 0.05, 0.1, '#ffffff', -11.75, 0.026, -8.36, { ry: 0.4, cast: false }); mbox(0.07, 0.02, 0.07, '#ff5a5f', -11.62, 0.055, -8.31, { cast: false, ol: false });
  tube([[-11.6, 0.03, -8.4], [-11.2, 0.012, -8.55], [-10.8, 0.012, -8.62], [-10.6, 0.4, -8.62], [-10.4, 1.08, -8.75], [-10.0, 1.1, -9.2]], 0.01, '#ff8a3d', { kind: 'matte' });
  mbox(0.32, 0.18, 0.24, '#e9edf1', -9.9, 1.15, -9.35, {}); mbox(0.2, 0.01, 0.08, '#2a2135', -9.9, 1.245, -9.3, { cast: false, ol: false });
  mbox(0.28, 0.2, 0.06, '#e9edf1', -15.3, 0.32, -6.2, { cast: false });
  mbox(13.4, 0.06, 0.32, '#9aa3ad', -13.1, 3.72, -6.42, { cast: false }); for (const [c, dy] of [['#2a2135', 0.03], ['#ff5a5f', 0.06], ['#2d7dd2', 0.045], ['#ffd23f', 0.035]]) mbox(13.3, 0.025, 0.025, c, -13.1, 3.75 + dy * 0.3, -6.42 + (dy - 0.045) * 4, { cast: false, ol: false });
  for (const x of [-19.7, -15.6]) mbox(0.06, 3.6, 0.06, '#9aa3ad', x, 1.85, -6.2, { cast: false, ol: false });
  for (let k = 0; k < 5; k++) mbox(1.1, 0.03, 0.75, pick(['#d9a066', '#c88a50']), -8.95 + rnd(-0.05, 0.05), 1.07 + k * 0.03, -9.55, { ry: rnd(-0.15, 0.15), cast: false }); // cartons à plat sur la palette
  for (const [x, z] of [[-17.9, -7.4], [-16.7, -8.6], [-17.3, -8.0]]) { mbox(0.5, 0.36, 0.4, '#d9a066', x, 1.95, z, { ry: rnd(-0.3, 0.3) }); mbox(0.5, 0.02, 0.14, '#c88a50', x, 2.15, z - 0.2, { rx: -0.7, ol: false }); } // cartons ouverts sur la pile
  sign('NE RIEN STOCKER DEVANT LE RIDEAU', 2.6, 0.32, -19.83, 3.35, -10.5, HP, { bg: '#ffd23f', fg: '#2a2135', size: 64 });
  // ---------- réserve : extracteur mural (tourne) ----------
  { const g = D(new THREE.Group()); g.position.set(-19.8, 3.05, -7.9); scene.add(g); const h = mbox(0.12, 0.62, 0.62, '#9aa3ad', 0.02, 0, 0, { parent: g }); for (let k = -2; k <= 2; k++) mbox(0.02, 0.56, 0.015, '#3d4454', 0.1, 0, k * 0.11, { parent: g, cast: false, ol: false }); const r = new THREE.Group(); r.position.x = 0.07; r.rotation.y = HP; g.add(r); fanBlades(r, 0.26, 4, '#c9d2db', 'z', 14); }
  // ---------- chambre froide : givre aux murs, évaporateur à ventilateurs, buée sur la porte ----------
  const fr = frostTex(1), fr2 = frostTex(0.7), frMat = (t) => new THREE.MeshBasicMaterial({ map: t, transparent: true, depthWrite: false, opacity: 0.9 });
  wallPlane(null, 6.6, 3.9, -2.5, 1.98, -13.83, 0, { mat: frMat(fr) }); wallPlane(null, 7.6, 3.9, -5.83, 1.98, -10, HP, { mat: frMat(fr2) }); wallPlane(null, 7.6, 3.9, 0.83, 1.98, -10, -HP, { mat: frMat(fr2) });
  wallPlane(null, 1.9, 3.9, -4.85, 1.98, -6.17, Math.PI, { mat: frMat(fr2) }); wallPlane(null, 2.2, 3.9, -0.35, 1.98, -6.17, Math.PI, { mat: frMat(fr2) });
  { const g = D(new THREE.Group()); g.position.set(-2.4, 3.3, -13.55); scene.add(g); mbox(2.0, 0.56, 0.5, '#eef4f8', 0, 0, 0, { parent: g, kind: 'enamel' });
    for (const s of [-0.5, 0.5]) { mcyl(0.21, 0.04, '#2a2135', s, 0, 0.26, { parent: g, rx: HP, cast: false }); const r = new THREE.Group(); r.position.set(s, 0, 0.29); g.add(r); fanBlades(r, 0.19, 5, '#c9d2db', 'z', 16); mcyl(0.2, 0.01, '#9aa3ad', s, 0, 0.31, { parent: g, rx: HP, cast: false, ol: false }); }
    const ft = frostTex(1.2); const fm = new THREE.Mesh(new THREE.PlaneGeometry(2.02, 0.58), new THREE.MeshBasicMaterial({ map: ft, transparent: true, depthWrite: false })); fm.position.z = 0.256; g.add(fm); }
  const cold = OPENM[OPEN_COLD]; if (cold && cold.leaves[0]) { const L = OPEN[OPEN_COLD].leaves[0], pv = cold.leaves[0]; for (const sd of [-1, 1]) { const hh = sd > 0 ? 1.25 : L.hgt - 0.05; const m = new THREE.Mesh(new THREE.PlaneGeometry(L.w - 0.05, hh), new THREE.MeshBasicMaterial({ map: sd > 0 ? fr2 : fr, transparent: true, depthWrite: false, opacity: sd > 0 ? 0.5 : 0.9 })); m.position.set(L.w / 2, sd > 0 ? 0.68 : L.hgt / 2, sd * (L.th / 2 + 0.012)); if (sd < 0) m.rotation.y = Math.PI; pv.add(m); } }
  // buée en bas des portes vitrées de la vitrine à boissons
  const fog = fogTex(); OPEN.forEach((o, i) => { if (o.fridge === undefined || !OPENM[i]) return; const L = o.leaves[0], pv = OPENM[i].leaves[0]; const m = new THREE.Mesh(new THREE.PlaneGeometry(L.w - 0.16, L.hgt * 0.55), new THREE.MeshBasicMaterial({ map: fog, transparent: true, depthWrite: false })); m.position.set(L.w / 2, (L.y0 || 0) + L.hgt * 0.3, L.th / 2 + 0.008); pv.add(m); });
  // ---------- salle de pause : ventilateur de plafond ; bureau : ventilateur de table qui oscille ----------
  { const g = D(new THREE.Group()); g.position.set(6, 3.56, -10.2); scene.add(g); mcyl(0.02, 0.42, '#3d4454', 0, 0.22, 0, { parent: g, cast: false }); mcyl(0.12, 0.1, '#c58b4f', 0, 0, 0, { parent: g }); fanBlades(g, 0.78, 4, '#8b5a2b', 'y', 5); }
  { const g = D(new THREE.Group()); g.position.set(16.38, 0.8, -12.42); scene.add(g); mcyl(0.09, 0.03, '#ffffff', 0, 0.015, 0, { parent: g }); mcyl(0.015, 0.26, '#ffffff', 0, 0.15, 0, { parent: g, cast: false });
    const head = new THREE.Group(); head.position.y = 0.32; g.add(head); mcyl(0.05, 0.08, '#ffffff', 0, 0, -0.04, { parent: head, rx: HP }); const r = new THREE.Group(); r.position.z = 0.03; head.add(r); fanBlades(r, 0.12, 3, '#56ccf2', 'z', 22); const cage = new THREE.Mesh(new THREE.TorusGeometry(0.13, 0.006, 4, 24), mat('#ffffff')); cage.position.z = 0.03; head.add(cage);
    DECOR.osc = head; }
  // ---------- portes automatiques : capteur qui passe au vert ----------
  { const m = new THREE.MeshBasicMaterial({ color: new THREE.Color(2.2, 0.3, 0.3) }); for (const z of [13.88, 14.12]) { const s = mbox(0.12, 0.06, 0.03, null, 11.3, 2.95, z, { mat: m, cast: false, ol: false }); D(s); } DECOR.sensor = m; }
  // ---------- parking : trottoir, flèches, place PMR, numéros, taches d'huile, lampadaires, fleurs ----------
  mbox(29.6, 0.012, 1.15, '#b9b4ab', -5.8, 0.002, 14.85, { cast: false, ol: false }); mbox(29.6, 0.03, 0.14, '#ffd23f', -5.8, 0.012, 15.48, { cast: false, ol: false });
  const arrow = parkTex('arrow'); flat(arrow, 1.2, 1.6, -14, 0.006, 16.9, -HP); flat(arrow, 1.2, 1.6, 0, 0.006, 16.9, -HP); flat(arrow, 1.2, 1.6, 19, 0.006, 16.4, Math.PI);
  flat(parkTex('stop'), 1.8, 1.8, -19.2, 0.006, 17.3, HP);
  mbox(2.7, 0.006, 3.5, '#2d7dd2', -2.6, 0.0035, 20.4, { cast: false, ol: false }); flat(parkTex('pmr'), 1.5, 1.5, -2.6, 0.007, 20.6, Math.PI);
  let n = 1; for (let x = -18; x <= 19; x += 2.8) { if (Math.abs(x + 12) > 2.6 && Math.abs(x + 18.6) > 1.6 && x + 2.8 <= 20 && Math.abs(x + 1.4 + 2.6) > 0.5) flat(parkTex(String(n)), 0.8, 0.8, x + 1.4, 0.007, 21.6, Math.PI, { opacity: 0.85 }); n++; }
  const oil = parkTex('oil'); for (const [x, z] of [[-8.2, 20.8], [3.0, 21.0], [12.0, 20.2], [-15.6, 20.9]]) flat(oil, 1.4, 1.4, x, 0.006, z, rnd(0, 3));
  for (const x of [-8, 8]) { mcyl(0.09, 4.6, '#4a4f58', x, 2.3, 22.9, { geo: CYL6 }); mbox(1.3, 0.14, 0.4, '#4a4f58', x, 4.6, 22.4); mbox(1.0, 0.05, 0.28, null, x, 4.52, 22.35, { mat: basic('#fffbe0'), ol: false }); }
  for (let x = -18; x < 9; x += 3.4) for (let k = 0; k < 7; k++) msph(0.06, pick(['#ff5a5f', '#ffd23f', '#ffffff', '#ff7ac6', '#9b6bff']), x - 1.0 + rnd(0, 2.0), 0.98 + rnd(0, 0.08), 14.55 + rnd(-0.25, 0.25), { geo: ICO0, ol: false, cast: false });
  // plantes en pot de chaque côté de l'entrée (dehors, contre la façade)
  for (const x of [9.0, 17.0]) { mcyl(0.3, 0.55, '#c0663a', x, 0.27, 14.55, { geo: CYL6 }); msph(0.42, '#4fae3f', x, 0.95, 14.55, { geo: ICO0 }); msph(0.3, '#71cf57', x + 0.12, 1.3, 14.45, { geo: ICO0 }); for (let k = 0; k < 5; k++) msph(0.06, pick(['#ff5a5f', '#ffd23f', '#ff7ac6']), x + rnd(-0.35, 0.35), 1.0 + rnd(0, 0.4), 14.55 + rnd(-0.35, 0.1), { geo: ICO0, ol: false, cast: false }); }
}
// écrans de caisse : articles scannés et total quand des clients attendent, accueil sinon (4 fois par seconde)
function drawScreens(G, dt) {
  const S = DECOR.screens; if (!S) return; const x = S.cv.getContext('2d'), w = S.w, h = S.h;
  for (let k = 0; k < 3; k++) {
    const st = S.st[k], busy = (G?.qs?.[k] || 0) > 0; st.t += dt;
    if (busy && st.t > rnd(0.7, 1.6)) { st.t = 0; const cat = rndi(0, 9), v = rndi(0, 7), p = rnd(0.6, 6.5); st.items.push([prodName(cat, v), p]); st.total += p; if (st.items.length > 4) st.items.shift(); }
    if (!busy && st.items.length && st.t > 5) { st.items = []; st.total = 0; }
    const ox = k * w; x.fillStyle = '#0d2a24'; x.fillRect(ox, 0, w, h); x.fillStyle = '#1fb5a3'; x.fillRect(ox, 0, w, 20);
    x.fillStyle = '#ffffff'; x.font = '700 13px Fredoka, Arial'; x.textAlign = 'left'; x.textBaseline = 'middle'; x.fillText('LE SUPER · CAISSE ' + (k + 1), ox + 6, 10);
    x.textAlign = 'right'; x.fillText(new Date().toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' }), ox + w - 6, 10);
    if (!st.items.length) { x.textAlign = 'center'; x.fillStyle = '#7df3c8'; x.font = '700 22px Fredoka, Arial'; x.fillText('Bonjour !', ox + w / 2, 56); x.font = '600 12px Fredoka, Arial'; x.fillStyle = 'rgba(125,243,200,.7)'; x.fillText((WORLD.clock % 2) < 1.4 ? 'Caisse ouverte' : '', ox + w / 2, 80); }
    else { x.font = '600 12px Fredoka, Arial'; st.items.forEach(([n, p], i) => { x.fillStyle = i === st.items.length - 1 ? '#ffffff' : '#7df3c8'; x.textAlign = 'left'; x.fillText(n.slice(0, 18), ox + 6, 31 + i * 15); x.textAlign = 'right'; x.fillText(p.toFixed(2).replace('.', ',') + ' €', ox + w - 6, 31 + i * 15); }); x.fillStyle = '#ffd23f'; x.fillRect(ox, h - 22, w, 22); x.fillStyle = '#2a2135'; x.font = '700 14px Fredoka, Arial'; x.textAlign = 'left'; x.fillText('TOTAL', ox + 6, h - 11); x.textAlign = 'right'; x.fillText(st.total.toFixed(2).replace('.', ',') + ' €', ox + w - 6, h - 11); }
  }
  S.tex.needsUpdate = true;
}
// mouvements : ventilateurs, néon défectueux, tapis de caisse, capteur des portes, écrans
function decorTick(dt, G) {
  if (!dt) return; DECOR.t += dt; const t = DECOR.t;
  for (const f of DECOR.fans) { if (f.axis === 'y') f.g.rotation.y += f.speed * dt; else f.g.rotation.z += f.speed * dt; }
  if (DECOR.osc) DECOR.osc.rotation.y = Math.sin(t * 0.6) * 0.7;
  // néon de la réserve : grésille par moments (court scintillement, parfois une seconde éteint)
  const ph = t % 9.5; let k = 1; if (ph > 6.2 && ph < 7.4) k = Math.sin(ph * 61) * Math.sin(ph * 23) > 0 ? 1 : 0.08; else if (ph >= 7.4 && ph < 8.1) k = 0.06; else if (Math.random() < 0.004) k = 0.4;
  NEON_FLICK.color.setRGB(2.5 * k + 0.06, 2.85 * k + 0.06, 3.4 * k + 0.08);
  for (const b of DECOR.belts) { const busy = (G?.qs?.[b.k] || 0) > 0; const on = busy && (t + b.ph) % 3.6 < 1.7; b.run += ((on ? 1 : 0) - b.run) * Math.min(1, dt * 6); b.t.offset.y -= b.run * dt * 0.55; }
  if (DECOR.sensor) { const open = typeof SLIDE !== 'undefined' && SLIDE.t > 0.05; DECOR.sensor.color.setRGB(open ? 0.3 : 2.2, open ? 2.4 : 0.3, 0.3); }
  DECOR.scrT -= dt; if (DECOR.scrT <= 0) { DECOR.scrT = 0.25; drawScreens(G, 0.25); }
}
