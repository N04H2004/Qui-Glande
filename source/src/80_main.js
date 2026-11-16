// ======================= DÉMARRAGE & BOUCLE =======================
DBG.lowgfx = () => { renderer.setPixelRatio(0.4); renderer.shadowMap.enabled = false; scene.traverse((o) => { if (o.material) o.material.needsUpdate = true; }); };
window.__qgCloseMg = () => MG.close(null);
Object.assign(DBG, { get NETR() { return NET.room; }, itemStep, hostUpdate, storeNeeds, OPEN, MG, VM, SHELVES, PEND,  C, H, ME, NET, KEYS, UI, AV, ST, WORLD, TUNE, curG, navPath, hostStart, hostAddBot, hostMeeting, hostFire, doSolo, sendAction, get camera() { return camera; } });
let lastT = performance.now();
function frame(dt) { clientFrame(dt); UI.update(dt); }
function loop(t) {
  requestAnimationFrame(loop);
  const dt = Math.min(0.25, Math.max(0, (t - lastT) / 1000)); lastT = t;
  try { frame(dt); renderer.clear(); renderer.render(scene, camera); if (C.vmOn) { renderer.clearDepth(); renderer.render(VM.scene, VM.cam); } } catch (e) { console.error(e); }
}
// onglet en arrière-plan : la logique continue (sinon l'hôte gèlerait la partie)
setInterval(() => {
  if (!document.hidden || !renderer) return;
  const now = performance.now(); let dt = Math.min(2, (now - lastT) / 1000); lastT = now;
  try { while (dt > 0) { const s = Math.min(0.05, dt); frame(s); dt -= s; } } catch (e) { console.error(e); }
}, 250);
async function boot() {
  try {
    try { await Promise.race([document.fonts.load('700 40px Fredoka'), sleep(2500)]); await Promise.race([document.fonts.ready, sleep(1500)]); } catch (e) {}
    buildNav(); initRenderer(); renderer.autoClear = false; buildWorld(); DBG.merged = mergeStatic(); initVM(); UI.init(); setupInput(); await CRY.init();
    $('#loading').remove(); UI.showTitle();
    netInit().then(() => UI.netStatus());
    requestAnimationFrame(loop);
  } catch (e) {
    console.error(e); const l = $('#loading'); l.classList.add('err');
    l.textContent = 'Oups, le jeu n’a pas pu démarrer (' + (e && e.message ? e.message : e) + '). Ton navigateur doit supporter WebGL.';
  }
}
boot();
