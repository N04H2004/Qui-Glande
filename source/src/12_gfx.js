// ======================= GRAPHISMES : niveaux de qualité (Bas / Moyen / Haut) =======================
// Purement visuel : rien ici ne touche à la simulation, au réseau ni aux salons.
// Rendus hors écran : les hautes lumières passent par une compression réversible (c / (1 + max)). L'anticrénelage (MSAA) moyenne ainsi des valeurs comparables
// et ne laisse plus d'escaliers autour des néons ou des surfaces au soleil ; la passe finale décompresse avant le bloom et le tone mapping.
THREE.ShaderChunk.tonemapping_fragment = '#if defined( TONE_MAPPING )\n\tgl_FragColor.rgb = toneMapping( gl_FragColor.rgb );\n#elif !defined( QG_RAW )\n\tgl_FragColor.rgb = max( gl_FragColor.rgb, vec3( 0.0 ) );\n\tgl_FragColor.rgb /= 1.0 + max( gl_FragColor.r, max( gl_FragColor.g, gl_FragColor.b ) );\n#endif';
const GFX_LEVELS = {
  // dpr : résolution max · post : tone mapping/bloom/étalonnage · neonShadow/sunShadow : taille des cartes d'ombre · sunEvery : rafraîchissement de l'ombre du soleil (en images)
  low: { name: 'Bas', dpr: 1, minScale: 0.6, post: false, bloom: 0, msaa: 0, neonShadow: 0, sunShadow: 1024, sunEvery: 120, sunOut: 8, soft: false, ao: false, refl: false, parts: 0.45, olDist: 24 },
  med: { name: 'Moyen', dpr: 1, minScale: 0.7, post: true, bloom: 4, msaa: 4, neonShadow: 1024, sunShadow: 1024, sunEvery: 30, sunOut: 2, soft: false, ao: false, refl: false, parts: 1, olDist: 30 },
  high: { name: 'Haut', dpr: 2, minScale: 0.75, post: true, bloom: 5, msaa: 4, neonShadow: 2048, sunShadow: 2048, sunEvery: 4, sunOut: 1, soft: true, ao: true, refl: true, parts: 1.6, olDist: 90 },
};
const GFX = { level: 'med', q: null, scale: 1, dyn: true, acc: 0, n: 0, cool: 0, ceil: 1, ceilT: 0, frame: 0 };
try { const l = localStorage.getItem('qg-gfx'); if (GFX_LEVELS[l]) GFX.level = l; } catch (e) {}
GFX.q = GFX_LEVELS[GFX.level];

function setGfx(level) {
  if (!GFX_LEVELS[level]) return;
  GFX.level = level; GFX.q = GFX_LEVELS[level]; GFX.scale = 1; GFX.ceil = 1; GFX.acc = 0; GFX.n = 0; GFX.cool = 3;
  try { localStorage.setItem('qg-gfx', level); } catch (e) {}
  if (renderer) applyGfx();
  gfxButtons();
}
function gfxButtons() { document.querySelectorAll('[data-g]').forEach((b) => b.classList.toggle('on', b.dataset.g === GFX.level)); }
function setShadowSize(l, s) { if (l.shadow.mapSize.x !== s) { l.shadow.mapSize.set(s, s); if (l.shadow.map) { l.shadow.map.dispose(); l.shadow.map = null; } } }
function refreshMaterials() { const seen = new Set(); for (const sc of [scene, VM.scene]) if (sc) sc.traverse((o) => { const m = o.material; if (m && !seen.has(m)) { seen.add(m); m.needsUpdate = true; } }); }
function applyRes() { renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, GFX.q.dpr) * GFX.scale); renderer.setSize(innerWidth, innerHeight, false); postResize(); }
function applyGfx() {
  const q = GFX.q, sun = LIGHTS.sun, neon = LIGHTS.neon;
  renderer.shadowMap.type = q.soft ? THREE.PCFSoftShadowMap : THREE.PCFShadowMap;
  setShadowSize(sun, q.sunShadow); neon.castShadow = q.neonShadow > 0; if (q.neonShadow) setShadowSize(neon, q.neonShadow);
  const post = q.post && POST.ok;
  renderer.toneMapping = post ? THREE.NoToneMapping : THREE.NeutralToneMapping;
  document.body.classList.toggle('gfx-low', !post);
  for (const m of REFL_MATS) m.envMapIntensity = q.refl && post ? 0.22 : 0.62; // en « Haut », le vrai reflet remplace en grande partie le reflet d'environnement
  applyRes(); refreshMaterials(); sun.shadow.needsUpdate = true;
}
// résolution dynamique : si la machine ne tient pas ~60 images/s, on baisse la résolution de rendu (jamais l'interface), puis on remonte prudemment
function gfxAdapt(dt) {
  if (!GFX.dyn || document.hidden || dt > 0.2) return;
  GFX.acc += dt; GFX.n++; GFX.cool -= dt; GFX.ceilT -= dt;
  if (GFX.acc < 1.5) return;
  const avg = GFX.acc / GFX.n, q = GFX.q; GFX.acc = 0; GFX.n = 0; let s = GFX.scale;
  if (GFX.cool > 0) return;
  if (avg > 1 / 52 && s > q.minScale) { GFX.ceil = s - 0.02; GFX.ceilT = 45; s = Math.max(q.minScale, s - (avg > 1 / 36 ? 0.15 : 0.07)); GFX.cool = 2.5; }
  else if (avg < 1 / 58 && s < 1 && (s + 0.05 <= GFX.ceil || GFX.ceilT <= 0)) { s = Math.min(1, s + 0.05); GFX.cool = 4; }
  if (s !== GFX.scale) { GFX.scale = s; applyRes(); }
}
// ombre du soleil : la scène extérieure est presque statique, on ne la recalcule que de temps en temps (ou souvent si quelqu'un est dehors)
function lightTick() {
  GFX.frame++; const q = GFX.q; let out = !insideStore(camera.position.x, camera.position.z);
  if (!out) for (const a of AV.values()) if (!insideStore(a.x, a.z)) { out = true; break; }
  if (GFX.frame < 6 || GFX.frame % (out ? q.sunOut : q.sunEvery) === 0) LIGHTS.sun.shadow.needsUpdate = true;
}
