// ======================= CLIENT : joueur local, phases, interactions =======================
const ME = { x: 13, z: 16, ry: 0, anim: 0, carry: 0, box: null, yaw: Math.PI, pitch: 0.05, view: 1, boost: 0, name: '', sk: [rndi(0, 11), rndi(0, 2), rndi(1, 7), 0] };
const C = { hints: false, sabCd: 0, cafeCd: 0, take: null, hideIt: new Map(), mode: 'title', code: '', isHost: false, hostPeerObj: null, gid: null, roleBase: null, mates: [], decBusy: false, tasks: [], taskCd: 0, outSeq: 0, out: [], outVer: 0, seenEv: new Set(), seenCh: new Set(), knownMess: new Set(), cleaned: new Set(), meetId: null, hold: { key: null, t: 0, lock: false }, camMode: false, camIdx: 0, psT: 0, lastPs: '', noHostT: 0, everHost: false, introFor: null, cand: null, fireCand: null, drag: false, peerById: new Map(), lastRole: null, busy: false };
const KEYS = {};
const AV = new Map();
const genCode = () => { const a = 'ABCDEFGHJKLMNPQRSTUVWXYZ'; let s = ''; for (let i = 0; i < 4; i++) s += a[Math.floor(Math.random() * a.length)]; return s; };

function curG() { return C.isHost ? H.g : C.hostPeerObj?.presence?.g || null; }
function inRoster(G, id = NET.me) { return !!G?.pl?.some((p) => p[0] === id); }
function isAlive(G, id = NET.me) { return inRoster(G, id) && !G.fd.includes(id) && !(G.qt || []).includes(id); }
function myRole(G) { if (!G?.pl || !inRoster(G)) return 'spec'; if (G.mg === NET.me) return 'mgr'; if (C.isHost) return H.roles[NET.me] === 'gla' ? 'gla' : 'emp'; return C.roleBase; }
function myMates(G) { if (C.isHost) return (G.pl || []).filter((p) => p[0] !== NET.me && H.orig[p[0]] === 'gla').map((p) => p[0]); return C.mates; }
function pName(G, id) {
  const p = G?.pl?.find((x) => x[0] === id); if (p) return p[1];
  const b = G?.bots?.find((x) => x[0] === id); if (b) return b[1];
  const pr = id === NET.me ? NET.pres : C.peerById.get(id)?.presence; return pr?.n ? cleanText(pr.n, 14) : '???';
}
function pSkin(G, id) { const p = G?.pl?.find((x) => x[0] === id); if (p) return p[2]; const pr = id === NET.me ? NET.pres : C.peerById.get(id)?.presence; return sanitizeSk(pr?.sk); }

// ---------- connexion / salons ----------
const BUILD_V = 9;
function initPresence() { setPres({ n: ME.name || 'Joueur', sk: ME.sk, pk: CRY.pub, j: Date.now(), v: BUILD_V }); }
function resetClientGame() { if (typeof MG !== 'undefined' && MG.active) MG.close(false); Object.assign(C, { gid: null, roleBase: null, mates: [], tasks: [], out: [], meetId: null, camMode: false, introFor: null, cand: null, fireCand: null, take: null, sabCd: 0, cafeCd: 0 }); C.hideIt.clear(); OPL.length = 0; C.cleaned.clear(); C.knownMess.clear(); C.hold = { key: null, t: 0, lock: false }; ME.carry = 0; ME.box = null; ME.boost = 0; }
async function doCreate() {
  if (C.busy) return; if (!NET.avail) { UI.status('⏳ Connexion au multijoueur…'); await netTry(); } if (!NET.avail) { UI.status('Le multijoueur n’est pas disponible (' + (NET.why || '?') + '). Connecte-toi à Claude puis recharge la page. Le solo marche !', true); return; }
  C.busy = true; UI.status('Création du salon…');
  try { let code = genCode(); for (let k = 0; ; k++) { try { await netJoin(code, true); break; } catch (e) { if (k < 3 && e?.code === 'peer_unavailable-id') { code = genCode(); continue; } throw e; } } C.code = code; C.isHost = true; H.botsCfg = []; initPresence(); setPres({ h: 1 }); hostInit(); enterLobby(); UI.status(''); }
  catch (e) { console.warn(e); UI.status('Impossible de créer le salon (' + (e?.code || 'erreur') + ').', true); await netLeave(); }
  C.busy = false;
}
async function doJoin(raw) {
  if (C.busy) return; const code = String(raw || '').toUpperCase().replace(/[^A-Z]/g, '');
  if (code.length !== 4) { UI.status('Le code fait 4 lettres.', true); return; }
  if (!NET.avail) { UI.status('⏳ Connexion au multijoueur…'); await netTry(); } if (!NET.avail) { UI.status('Le multijoueur n’est pas disponible (' + (NET.why || '?') + '). Connecte-toi à Claude puis recharge la page.', true); return; }
  C.busy = true; UI.status('Connexion au salon ' + code + '…');
  try { await netJoin(code); C.code = code; C.isHost = false; initPresence(); C.mode = 'joining'; C.noHostT = 0; C.everHost = false; }
  catch (e) { console.warn(e); UI.status(String(e?.code || '').startsWith('peer_') ? '⚠️ Connexion impossible (' + (e.message || e.code) + '). Réessaie dans quelques secondes.' : e?.code === 'not_granted' || e?.code === 'not_permitted' ? '⛔ Ton compte n’a pas accès aux salons de ce jeu : demande à l’hôte de t’inviter par e-mail (bouton « Share » de l’artefact).' : 'Impossible de rejoindre (' + (e?.code || 'erreur') + ').', true); await netLeave(); }
  C.busy = false;
}
function doSolo() { netSolo(); C.code = 'SOLO'; C.isHost = true; H.botsCfg = []; for (let i = 0; i < 5; i++) hostAddBot(); initPresence(); setPres({ h: 1 }); hostInit(); enterLobby(); }
async function leaveRoom(msg) {
  if (document.pointerLockElement) document.exitPointerLock?.();
  await netLeave(); H.on = false; H.g = null; H.bots = []; C.isHost = false; C.hostPeerObj = null; C.code = ''; resetClientGame(); C.mode = 'title'; UI.showTitle(); if (msg) UI.toast(msg, 'fire');
}
function enterLobby() { C.mode = 'lobby'; resetClientGame(); if (document.pointerLockElement) document.exitPointerLock?.(); UI.showLobby(); }
function enterGame() { C.mode = 'game'; UI.showGame(); }
function enterEnd(G) { C.mode = 'end'; C.camMode = false; if (document.pointerLockElement) document.exitPointerLock?.(); UI.showEnd(G); }
function newGame(G) {
  resetClientGame(); C.gid = G.id; for (const e of G.ev || []) C.seenEv.add(e[0]);
  setPres({ ob: null, vt: null, ra: null });
  const idx = (G.pl || []).findIndex((p) => p[0] === NET.me);
  if (idx >= 0) { [ME.x, ME.z] = SPAWNS[idx]; ME.ry = ME.yaw = Math.PI; ME.pitch = 0.05; } else { ME.x = 0; ME.z = 8; ME.yaw = Math.PI; }
  UI.chatSys(idx >= 0 ? '🛒 La journée commence au Super ! Clique dans le jeu pour tourner la caméra à la souris (ou ← →).' : '👀 Partie en cours : tu observes en fantôme jusqu’à la prochaine.');
}
function phaseSync(G) {
  if (G.ph === 'lobby') { if (C.mode !== 'lobby') enterLobby(); return; }
  if (G.id !== C.gid) newGame(G);
  if ((G.ph === 'play' || G.ph === 'meet') && C.mode !== 'game') enterGame();
  if (G.ph === 'end' && C.mode !== 'end') enterEnd(G);
}

// ---------- actions vers l'hôte ----------
function sendAction(a) { const act = [++C.outSeq, ...a]; if (C.isHost) { hostApply(NET.me, act); return; } C.out.push(act); flushOut(); }
async function flushOut() { const ver = ++C.outVer; const s = await CRY.enc(C.hostPeerObj?.presence?.pk || '', { g: C.gid, a: C.out }); if (ver === C.outVer) setPres({ ob: s }); }

// ---------- boucle client ----------
function clientFrame(dt) {
  const peers = netPeers();
  if (NET.room && !NET.me) { const m = peers.find((p) => p.sameTab); if (m) NET.me = m.peer; }
  C.peerById = new Map(); for (const p of peers) if (p.kind !== 'agent') C.peerById.set(p.peer, p);
  if (C.isHost) { H.peerMap = new Map(); for (const p of peers) if (!p.sameTab && p.kind !== 'agent' && p.presence) H.peerMap.set(p.peer, p.presence); if (NET.me) H.peerMap.set(NET.me, NET.pres); }
  else C.hostPeerObj = peers.find((p) => !p.sameTab && p.presence?.h === 1) || null;
  if (C.isHost && H.on) { let r = dt; while (r > 1e-6) { const s = Math.min(0.05, r); hostUpdate(s); r -= s; } }
  const G = curG();
  if (C.mode !== 'title') {
    if (!C.isHost) {
      if (!C.hostPeerObj) {
        C.noHostT += dt; if (!C.everHost && C.mode === 'joining') if (STANDALONE) UI.status(`⏳ Connexion au salon ${C.code}…`); else { let lb = '?', cn = '?'; try { lb = (NET.lobby.peers() || []).length; cn = NET.room.connected() ? 'oui' : 'non'; } catch (e) {} UI.status(`⏳ Recherche de l'hôte du salon ${C.code}… (${peers.filter((p) => !p.sameTab).length} autre(s) dans le salon · ${lb} sur la page du jeu · connecté : ${cn})`); }
        if (NET.denied || (!C.everHost && C.noHostT > 6 && !peers.some((p) => !p.sameTab) && NET.room?.connected && !NET.room.connected())) C.noHostT = Math.max(C.noHostT, 99);
        if (C.noHostT > (C.everHost ? 8 : 20) || (STANDALONE && (NET.room?.noHub?.() || NET.room?.failReason?.() === 'p2p'))) {
          const others = peers.filter((p) => !p.sameTab); if (STANDALONE && !C.everHost && (C.noHostT > 20 || NET.room?.noHub?.() || NET.room?.failReason?.() === 'p2p')) { const why = NET.room?.failReason?.(); leaveRoom(why === 'p2p' ? `Salon ${C.code} trouvé, mais vos deux réseaux bloquent la connexion directe (4G, wifi d’école ou d’entreprise…). Essayez tous les deux sur le même wifi, ou depuis un partage de connexion.` : why === 'nohub' ? `Aucun salon ${C.code} : vérifie le code, et que l’hôte a toujours sa page ouverte.` : `Salon ${C.code} : l’hôte ne répond pas. Réessaie dans quelques secondes.`); return; } const oldV = others.find((p) => p.presence?.n && p.presence?.v !== BUILD_V);
          leaveRoom(C.everHost ? "L'hôte a quitté le salon." : !others.length ? (NET.denied || (NET.room?.connected && !NET.room.connected()) ? '⛔ Ton compte n’a pas accès aux salons de ce jeu : l’hôte doit t’inviter par e-mail (bouton « Share » de l’artefact), le lien public ne suffit pas.' : `Salon ${C.code} vide : personne ne te voit. Si tu as ouvert le jeu par le lien public, l’hôte doit t’inviter par e-mail (bouton « Share »).`) : oldV ? 'L’hôte a une ancienne version du jeu : rechargez tous les deux la page (Ctrl+F5).' : `Il y a ${others.length} personne(s) dans le salon ${C.code} mais pas d'hôte.`); return;
        }
      }
      else { C.noHostT = 0; C.everHost = true; }
    }
    if (G && NET.me) phaseSync(G);
  }
  const inGame = (C.mode === 'game' || C.mode === 'end') && G && G.pl;
  if (inGame) gameFrame(dt, G);
  processChat(G);
  syncAvatars(dt, G);
  syncWorld(inGame ? G : null);
  syncOpen(inGame ? G : null, dt); syncItems(inGame ? G : null, dt);
  updateCamera(dt, G);
  C.vmOn = updateVM(dt, inGame && isAlive(G) && !C.camMode && ME.view === 1 && G.ph === 'play' ? ME.carry : 0, ME.box, ME.anim === 1);
  // marqueurs
  const mk = [];
  if (inGame && G.ph === 'play' && isAlive(G)) {
    const role = myRole(G);
    if (role === 'mgr') mk.push({ x: ST.cams.x, z: ST.cams.z, icon: '📹', color: '#a27bff' });
    else { for (const t of C.tasks) { if (taskLast(t).sab === 'jet') continue; const w = taskWhere(t); mk.push({ x: w.x, z: w.z, icon: taskStep(t) === 0 && t.steps.length > 1 ? '📦' : t.icon, color: t.type === 's' ? '#ff4d5a' : '#ffb400' }); } }
    if (role !== 'mgr' && C.hints) for (const n of storeNeeds(G).slice(0, 6)) mk.push({ x: n.x, z: n.z, icon: n.ic, color: n.pr >= 0.8 ? '#ff5a5f' : '#ffb400', small: n.pr < 0.6 });
  }
  if (inGame && G.ph === 'play') for (const m of G.ms || []) mk.push({ x: m[2], z: m[3], icon: '❗', color: '#ff8a3d', small: true });
  setMarkers(mk, camera.position);
  // présence position
  C.psT -= dt;
  if (NET.room && C.psT <= 0) { C.psT = 0.066; const ps = [r2(ME.x), r2(ME.z), r2(ME.ry), ME.anim, ME.carry, ME.carry === 6 ? ME.box?.cat ?? 0 : 0]; const k = ps.join(','); if (k !== C.lastPs) { C.lastPs = k; setPres({ ps }); } }
}
// ---------- besoins du magasin (affichage + indices) ----------
function storeNeeds(G) {
  const L = [];
  (G.st || []).forEach((m, si) => { if (si === SI_VITRINE) return; const f = fillFrac(m, si); if (f < 0.5) { const st = ST[si < 8 ? 'rayon' + si : si === 8 ? 'frais' : 'surgeles']; L.push({ ic: '📦', tx: `Rayon ${SHELF_NAMES[si]} : ${Math.round(f * 100)} % (cartons en ${si < 8 ? 'réserve' : 'chambre froide'})`, x: st.x, z: st.z, pr: 1 - f }); } });
  (G.qs || []).forEach((n, k) => { if (n > 0) L.push({ ic: '🧾', tx: `Caisse ${k + 1} : ${n} client${n > 1 ? 's' : ''} en attente`, x: ST['caisse' + k].x, z: ST['caisse' + k].z, pr: 0.45 + n * 0.15 }); });
  for (const cu of G.cu || []) if (cu[5] === 1) L.push({ ic: '❓', tx: 'Client perdu — ' + (zoneAt(cu[1], cu[2])?.name || 'magasin'), x: cu[1], z: cu[2], pr: 0.9 });
  if ((G.tel || 0) > 0) L.push({ ic: '📞', tx: `Le téléphone sonne ! (${Math.ceil(G.tel)} s)`, x: ST.tel.x, z: ST.tel.z, pr: 1 });
  const ov = G.ov?.[0] ?? 0; if (ov === 2) L.push({ ic: '🥖', tx: `Pain prêt : sors-le du four ! (${Math.ceil(G.ov[1])} s)`, x: ST.four.x, z: ST.four.z, pr: 1 }); else if (ov === 0) L.push({ ic: '🥖', tx: 'Four libre : enfourne des baguettes', x: ST.four.x, z: ST.four.z, pr: 0.3 });
  (G.nd || []).forEach((v, k) => { if (v >= 35) { const j = JOBS[k], st = ST[k === 9 ? 'imprimante' : j.st[0]]; L.push({ ic: j.icon, tx: j.txt + (v >= 100 ? ' · urgent !' : ''), x: st.x, z: st.z, pr: v / 100 }); } });
  const fl = (G.it || []).filter((it) => zoneAt(it[4], it[6])?.id === 'vente' && it[5] < 0.6);
  if (fl.length) { const n0 = fl.reduce((a, it) => (Math.hypot(it[4] - ME.x, it[6] - ME.z) < Math.hypot(a[4] - ME.x, a[6] - ME.z) ? it : a)); L.push({ ic: '🧃', tx: `${fl.length} objet${fl.length > 1 ? 's' : ''} par terre dans le magasin`, x: n0[4], z: n0[6], pr: Math.min(0.95, 0.35 + fl.length * 0.08) }); }
  if ((G.fo || 0) > 5) L.push({ ic: '🥶', tx: `Chambre froide ouverte depuis ${Math.floor(G.fo)} s !`, x: -2.5, z: -5.4, pr: G.fo > 15 ? 1 : 0.7 });
  return L.sort((a, b) => b.pr - a.pr);
}
// ---------- mes 3 tâches perso (le reste est libre) ----------
const TASK_GOAL_PLACE = 6, TASK_GOAL_JET = 3;
function genMyTask(role, G, list) {
  const W = gameW(G); const ex = new Set(list.flatMap((t) => t.steps.map((s) => s.st)).filter(Boolean)); for (let k = 0; k < 3; k++) ex.add('caisse' + k);
  let t = null;
  if (role === 'gla' && !list.some((x) => x.type === 's')) for (let k = 0; k < 8 && !t; k++) { const c = genSab(W, ex); if (c && !(c.steps[0].sab === 'jet' && list.some((x) => x.steps[0].sab === 'jet'))) t = c; }
  if (!t) for (let k = 0; k < 8 && !t; k++) { const c = genWork(W, ex); if (c && !list.some((x) => x.label === c.label)) t = c; }
  if (!t) return null;
  const last = t.steps[t.steps.length - 1];
  if (t.type === 'w' && last.st && ST[last.st].place) { t.shelf = ST[last.st].shelf; t.placed = 0; }
  if (last.sab === 'jet') { t.label = 'Jeter ' + TASK_GOAL_JET + ' produits par terre (en douce)'; t.thrown = 0; }
  return t;
}
const taskLast = (t) => t.steps[t.steps.length - 1];
// étape en cours : 1 si on tient déjà ce qu'il faut pour la 2e étape
function taskStep(t) {
  if (t.steps.length < 2) return 0;
  if (t.shelf !== undefined) return ME.box && (ME.carry === 1 || ME.carry === 2 || ME.carry === 6) && ME.box.cat === t.shelf && ME.box.n > 0 ? 1 : 0;
  const st0 = ST[t.steps[0].st]; return ME.carry === CARRY[st0.gives] ? 1 : 0;
}
function taskWhere(t) { const s = t.steps[taskStep(t)]; if (s.st) return ST[s.st]; return { x: s.x, z: s.z }; }
function taskSub(t) {
  const last = taskLast(t);
  if (t.shelf !== undefined) return taskStep(t) ? `Pose les produits en rayon (${t.placed}/${TASK_GOAL_PLACE})` : `Prends ${t.shelf < 8 ? 'un carton' : 'une caisse'} « ${SHELF_NAMES[t.shelf]} » (${t.shelf < 8 ? 'réserve' : 'chambre froide'})`;
  if (last.sab === 'jet') return `N'importe quel rayon, quand personne ne regarde (${t.thrown}/${TASK_GOAL_JET})`;
  if (last.door !== undefined) return 'Ouvre la porte… et laisse-la ouverte';
  if (t.steps.length > 1) return taskStep(t) ? 'Puis : ' + (last.st.startsWith('promo') ? 'une tête de gondole (affiche promo)' : ST[last.st].short) : ST[t.steps[0].st].label + ' (' + ST[t.steps[0].st].short + ')';
  return ST[last.st].short;
}
function taskDone(t) {
  if (!C.tasks.includes(t)) return; C.tasks = C.tasks.filter((x) => x !== t); C.taskCd = 1.5;
  sendAction(['tb', t.type === 's' ? 's' : 'w']); SFX.play(t.type === 's' ? 'sneak' : 'done');
  setTimeout(() => UI.float(t.type === 's' ? '😈 Mission accomplie : ' + t.label : '✅ Tâche terminée : ' + t.label), 350);
}
function taskHit(stId, kind) { for (const t of [...C.tasks]) { const last = taskLast(t); if ((t.type === 's') !== (kind === 's')) continue; if (last.st === stId || (kind !== 's' && last.st?.startsWith('promo') && stId.startsWith('promo'))) { taskDone(t); return; } } }

// ---------- portes & placards : état affiché (avec prédiction locale) ----------
const OPL = [];
function opDisp(G, i) { const l = OPL[i]; if (l && performance.now() - l.t < 1500) return l.v; return opGet(G?.op, i); }

function gameFrame(dt, G) {
  const alive = isAlive(G), role = myRole(G), part = inRoster(G);
  // rôle secret
  if (part && !C.isHost && !C.roleBase && G.rk?.[NET.me] && !C.decBusy) {
    C.decBusy = true; const gid = C.gid;
    CRY.dec(C.hostPeerObj?.presence?.pk, G.rk[NET.me]).then((d) => { if (d && d.g === gid && C.gid === gid) { C.roleBase = d.r === 'g' ? 'gla' : 'emp'; C.mates = d.m || []; setPres({ ra: gid }); } }).catch(() => {}).finally(() => (C.decBusy = false));
  }
  if (part && role && C.introFor !== C.gid && G.ph === 'play') { C.introFor = C.gid; UI.roleIntro(role, G); }
  if (role !== C.lastRole) { if (C.lastRole && role === 'mgr') { ME.carry = 0; ME.box = null; } C.lastRole = role; }
  OPEN.forEach((o, i) => { if (o.dyn) o.dyn.on = !opDisp(G, i); });
  if (G.ph === 'play' && alive && (role === 'emp' || role === 'gla')) {
    const W = gameW(G);
    C.tasks = C.tasks.filter((t) => taskValid(t, W) && !(t.shelf !== undefined && !t.placed && taskStep(t) === 0 && fillFrac(G.st?.[t.shelf], t.shelf) >= 0.96));
    C.taskCd -= dt; if (C.tasks.length < 3 && C.taskCd <= 0) { const t = genMyTask(role, G, C.tasks); if (t) C.tasks.push(t); C.taskCd = C.tasks.length < 2 ? 0.3 : 1.2; }
  } else if (role === 'mgr' || !alive) C.tasks = [];
  // accusés de réception de l'hôte
  const ack = G.ak?.[NET.me] || 0; if (C.out.length && C.out[0][0] <= ack) { C.out = C.out.filter((a) => a[0] > ack); flushOut(); }
  // événements
  for (const e of G.ev || []) if (!C.seenEv.has(e[0])) { C.seenEv.add(e[0]); handleEvent(e, G); }
  for (const m of G.ms || []) if (!C.knownMess.has(m[0])) { C.knownMess.add(m[0]); if (C.knownMess.size > 0) SFX.play(m[1] === 'pyr' ? 'crash' : m[1] === 'lait' ? 'splash' : 'tick'); }
  for (const id of C.cleaned) if (!(G.ms || []).some((m) => m[0] === id)) C.cleaned.delete(id);
  // réunion
  if (G.ph === 'meet' && G.mt && C.meetId !== G.mt.id) {
    C.meetId = G.mt.id; if (C.camMode) { C.camMode = false; UI.cams(false); } SFX.play('meet');
    const i = G.mt.seats.indexOf(NET.me); if (i >= 0) { const s = SEATS[i % SEATS.length]; ME.x = s[0]; ME.z = s[1]; ME.ry = ME.yaw = Math.atan2(TABLE_C[0] - s[0], TABLE_C[1] - s[1]); ME.pitch = 0.35; }
    if (document.pointerLockElement) document.exitPointerLock?.();
  }
  if (ME.boost > 0) ME.boost -= dt;
  if ((G.tel || 0) > 0 && G.ph === 'play') { C.ringT = (C.ringT || 0) - dt; if (C.ringT <= 0) { C.ringT = 1.4; const d = Math.hypot(ST.tel.x - ME.x, ST.tel.z - ME.z); if (d < 30) SFX.play('ring', clamp(1 - d / 30, 0.15, 1)); } }
  // déplacement
  const seated = G.ph === 'meet' && alive && G.mt?.seats?.includes(NET.me);
  const frozen = C.mode !== 'game' || C.camMode || UI.chatOpen || UI.modal || MG.active || seated || G.ph === 'end';
  let moving = false;
  if (!frozen) moving = movePlayer(dt, !alive);
  // interactions
  C.cand = null; C.fireCand = null; C.take = null;
  if (G.ph === 'play' && alive && !frozen) {
    C.cand = pickCand(interactCands(G, role));
    aimShelf(G);
    if (role === 'mgr') { let fd = 2.6; for (const [id] of G.pl) { if (id === NET.me || !isAlive(G, id)) continue; const a = AV.get(id); if (!a) continue; const d = Math.hypot(a.x - ME.x, a.z - ME.z); if (d < fd) { fd = d; C.fireCand = id; } } }
  }
  if (!(G.ph === 'play' && alive && !frozen)) { C.place = null; C.take = null; }
  setGhost(C.place || (C.take ? { si: C.take.si, slot: C.take.slot, take: true } : null));
  // pose de produits (clic gauche / E maintenu)
  const pressing = KEYS.KeyE || KEYS.Mouse0;
  if (C.place && C.place.ok && pressing && !MG.active && !C.hold.lock) { C.placeT -= dt; ME.anim = 2; if (C.placeT <= 0) { doPlace(G); C.placeT = 0.2; if (!ME.carry) { C.hold.lock = true; } } return; }
  C.placeT = 0;
  if (MG.active) { ME.anim = MG.cand?.st?.id === 'arcade' ? 5 : 2; if (MG.cand && !candStillValid(MG.cand, G)) { MG.close(false); UI.toast('🙃 Trop tard : c\u2019est déjà réglé.', '', 2200); } return; }
  const c = C.cand;
  if (c && !c.inst && !c.cd && c.k !== 'cams' && !c.mg && pressing && !C.hold.lock && !frozen) {
    if (C.hold.key !== c.key) C.hold = { key: c.key, t: 0, lock: false };
    C.hold.t += dt; ME.anim = c.st?.id === 'sieste' ? 4 : c.st?.id === 'arcade' ? 5 : 2;
    if (c.st?.id === 'sieste') ME.ry = Math.PI; else if (Math.hypot(c.x - ME.x, c.z - ME.z) > 0.25) ME.ry = Math.atan2(c.x - ME.x, c.z - ME.z);
    if (C.hold.t >= c.hold) { completeCand(c); C.hold.lock = true; C.hold.t = 0; }
  } else {
    if (!pressing) C.hold.lock = false;
    if (!(c && pressing)) C.hold.t = 0;
    if (seated) ME.anim = 3; else if (!moving) ME.anim = 0;
  }
}
const ST_JOB = Object.values(ST).filter((st) => st.kind === 'w' && st.job !== undefined && !st.needs);
const ST_DELIVER = Object.values(ST).filter((st) => st.kind === 'w' && st.needs && !st.place);
const ST_PICK = Object.values(ST).filter((st) => st.kind === 'pk');
const ST_SAB = Object.values(ST).filter((st) => st.kind === 's');
function interactCands(G, role) {
  const L = []; const now = performance.now();
  if (role === 'mgr') L.push({ k: 'cams', x: ST.cams.x, z: ST.cams.z, label: 'Regarder les caméras', hold: 0, key: 'cams' });
  // portes, placards, tiroirs : pour tout le monde
  OPEN.forEach((o, i) => { const v = opDisp(G, i); openAims(o, v).forEach((a, k) => L.push({ k: 'open', oi: i, v, x: a[0], y: a[1], z: a[2], tol: o.type === 'door' ? 0.75 : 0.42, label: (v ? 'Fermer ' : 'Ouvrir ') + o.name, key: 'op' + i + '_' + k, inst: true }));
  });
  // objets par terre
  for (const it of G.it || []) { if (C.hideIt.has(it[0]) && now - C.hideIt.get(it[0]) < 1500) continue; const d = Math.hypot(it[4] - ME.x, it[6] - ME.z); if (d > 2.6) continue; L.push({ k: 'item', it, x: it[4], y: it[5], z: it[6], tol: 0.32, label: ME.carry ? 'Mains pleines (G pour lâcher)' : 'Ramasser : ' + (it[1] === 1 ? `carton de ${CAT_NAMES[it[2]]} (${it[9]})` : prodName(it[2], it[3])), key: 'it' + it[0], inst: true }); }
  if (role !== 'emp' && role !== 'gla') return L;
  for (const st of ST_JOB) { const need = (G.nd?.[st.job] ?? 50) / 100; L.push({ k: 'job', st, x: st.x, z: st.z, label: st.label + (need < 0.25 ? ' · pas urgent' : need >= 0.7 ? ' · urgent !' : ''), hold: st.hold, mg: st.mg || null, key: 'j' + st.id, type: 'w', lowPrio: need < 0.25 }); }
  for (const st of ST_DELIVER) if (ME.carry === CARRY[st.needs]) L.push({ k: 'job', st, x: st.x, z: st.z, label: st.label, hold: st.hold, key: 'j' + st.id, type: 'w' });
  if (!ME.carry) for (const st of ST_PICK) L.push({ k: 'pick', st, x: st.x, z: st.z, y: st.cat !== undefined ? 0.8 : 1.0, label: st.label, hold: st.hold, key: 'pk' + st.id, type: 'w' });
  if (role === 'gla') {
    const cd = Math.ceil((C.sabCd - now) / 1000);
    for (const st of ST_SAB) if (sabValid(st.id, G)) L.push({ k: 'sab', st, x: st.x, z: st.z, label: '😈 ' + st.label + (cd > 0 ? ` (discret… ${cd} s)` : ''), hold: st.hold, mg: st.mg || null, key: 's' + st.id, type: 's', cd: cd > 0 });
    if (sabValid('four', G)) L.push({ k: 'sab', st: ST.four, sub: 'four', x: ST.four.x, y: 1.75, z: ST.four.z, label: '😈 Monter le four à fond' + (cd > 0 ? ` (discret… ${cd} s)` : ''), hold: 2, key: 'sfour', type: 's', cd: cd > 0 });
  }
  if (now > C.cafeCd) L.push({ k: 'cafe', st: ST.cafe, x: ST.cafe.x, z: ST.cafe.z, label: 'Pause café (boost de vitesse)', mg: 'timing', key: 'cafe', type: 'p', lowPrio: true });
  for (const m of G.ms || []) if (!C.cleaned.has(m[0])) L.push({ k: 'clean', m, x: m[2], z: m[3], y: 0.2, tol: 0.7, label: MESS[m[1]].clean + (m[1] === 'tag' || m[1] === 'mix' ? ' (' + SHELF_NAMES[m[4]] + ')' : ''), hold: MESS[m[1]].hold, mg: MESS[m[1]].mg, key: 'm' + m[0], type: 'c' });
  (G.qs || []).forEach((n, k) => { if (n > 0) { const st = ST['caisse' + k]; L.push({ k: 'serve', ck: k, st, x: st.x, z: st.z, label: `Encaisser les clients (caisse ${k + 1} · ${n} en attente)`, mg: 'scan', key: 'sv' + k, type: 'w' }); } });
  for (const cu of G.cu || []) if (cu[5] === 1) { const a = AV.get(cu[0]); const x = a ? a.x : cu[1], z = a ? a.z : cu[2]; L.push({ k: 'help', cid: cu[0], topic: cu[6], x, z, y: 1.3, label: 'Aider le client perdu', mg: 'quiz', key: 'h' + cu[0], type: 'w' }); }
  if ((G.tel || 0) > 0) L.push({ k: 'tel', st: ST.tel, x: ST.tel.x, z: ST.tel.z, label: 'Répondre au téléphone', hold: 2, key: 'tel', type: 'w' });
  const ov = G.ov?.[0] ?? 0;
  if (ov === 0) L.push({ k: 'oven', st: ST.four, x: ST.four.x, z: ST.four.z, label: 'Enfourner les baguettes', mg: 'timing', key: 'ov0', type: 'w', lowPrio: true });
  if (ov === 2) L.push({ k: 'oven', st: ST.four, x: ST.four.x, z: ST.four.z, label: 'Sortir les baguettes du four !', hold: 2, key: 'ov2', type: 'w' });
  return L;
}
function candStillValid(c, G) {
  if (c.k === 'clean') return (G.ms || []).some((m) => m[0] === c.m[0]);
  if (c.k === 'help') return (G.cu || []).some((cu) => cu[0] === c.cid && cu[5] === 1);
  if (c.k === 'tel') return (G.tel || 0) > 0;
  if (c.k === 'oven') return (G.ov?.[0] ?? 0) === (c.key === 'ov0' ? 0 : 2);
  if (c.k === 'sab') return G.ph === 'play' && sabValid(c.sub || c.st.id, G);
  return G.ph === 'play';
}
function openMg(c) {
  const G = curG(); let data = {};
  if (c.k === 'help') { const q = QUIZ[c.topic] || QUIZ[0]; const opts = shuffle([q[1], ...shuffle([...Array(10).keys()].filter((i) => i !== q[1])).slice(0, 2)]); data = { product: q[0], answer: q[1], opts }; }
  if (c.k === 'sab' && c.st.id === 'micro') data = { opts: shuffle([...ANNOUNCES.keys()]).slice(0, 3) };
  if (c.k === 'cafe') data = { hits: 2 };
  if (c.k === 'oven') data = { hits: 2 };
  for (const k in KEYS) KEYS[k] = false; if (document.pointerLockElement) document.exitPointerLock?.();
  if (Math.hypot(c.x - ME.x, c.z - ME.z) > 0.25) ME.ry = Math.atan2(c.x - ME.x, c.z - ME.z);
  MG.open(c.mg, c.label, data, c, (ok, extra) => { const G2 = curG(); if (!G2 || !candStillValid(c, G2)) return; if (c.k === 'help') { sendAction(['hp', c.cid, ok ? 1 : 0]); if (ok) { SFX.play('done'); UI.float('😊 Client renseigné !'); } else { SFX.play('err'); UI.float('😬 Mauvaise réponse…'); } return; } if (ok) completeCand(c, extra); });
}
function completeCand(c, extra) {
  if (c.k === 'pick') {
    const st = c.st; ME.carry = CARRY[st.gives]; SFX.play('pick');
    if (st.cat !== undefined) { ME.box = { cat: st.cat, n: BOX_SIZE }; UI.float('📦 ' + (st.gives === 'carton' ? 'Carton' : 'Caisse') + ' : ' + SHELF_NAMES[st.cat] + ' (' + BOX_SIZE + ' produits)'); }
    else { ME.box = null; UI.float('👐 Tu prends ' + CARRY_NAMES[ME.carry]); }
    return;
  }
  if (c.k === 'clean') { sendAction(['cl', c.m[0]]); C.cleaned.add(c.m[0]); SFX.play('done'); UI.float('🧽 Nettoyé !'); return; }
  if (c.k === 'serve') { sendAction(['tk', 'caisse' + c.ck, 'w', 0]); taskHit('caisse' + c.ck, 'w'); SFX.play('done'); UI.float('🧾 Client encaissé !'); return; }
  if (c.k === 'tel') { sendAction(['tel']); SFX.play('done'); UI.float('📞 « Le Super, bonjour ! »'); return; }
  if (c.k === 'oven') { sendAction(['ov']); SFX.play('done'); UI.float(c.key === 'ov0' ? '🥖 Pain au four !' : '🥖 Baguettes sorties !'); return; }
  if (c.k === 'cafe') { ME.boost = 25; C.cafeCd = performance.now() + 45000; SFX.play('done'); UI.float('☕ Boost de vitesse !'); return; }
  if (c.k === 'sab') { sendAction(['tk', c.st.id, 's', c.sub || 0, extra ?? 0]); taskHit(c.st.id, 's'); C.sabCd = performance.now() + TUNE.sabCd * 1000; SFX.play('sneak'); UI.float('😈 Sabotage réussi'); return; }
  if (c.k === 'job') {
    const st = c.st; const G = curG(); const need = (G?.nd?.[st.job] ?? 50) / 100;
    sendAction(['tk', st.id, 'w', 0, extra ?? 0]); if (st.needs) { ME.carry = 0; ME.box = null; }
    if (C.tasks.some((t) => t.type === 'w' && (taskLast(t).st === st.id || (taskLast(t).st?.startsWith('promo') && st.id.startsWith('promo'))))) { taskHit(st.id, 'w'); return; }
    SFX.play('done'); UI.float(need < 0.25 ? '👌 C’est fait (ce n’était pas très utile)' : '✅ ' + (st.short || 'Fait !'));
  }
}
// lâcher (G) ou lancer (clic droit / X) ce qu'on porte
function throwCarry(force) {
  const G = curG(); if (!ME.carry || !G || G.ph !== 'play' || !isAlive(G)) return;
  const phys = ME.carry === 6 || ((ME.carry === 1 || ME.carry === 2) && ME.box && ME.box.n > 0);
  if (!phys) { ME.carry = 0; ME.box = null; SFX.play('tick'); return; }
  camera.getWorldDirection(_dir); let dx = _dir.x, dy = _dir.y, dz = _dir.z;
  if (ME.view !== 1) { const e = 0.28; dx = Math.sin(ME.yaw) * Math.cos(e); dz = Math.cos(ME.yaw) * Math.cos(e); dy = Math.sin(e); }
  const hl = Math.hypot(dx, dz) || 1; const fx = dx / hl, fz = dz / hl;
  let x = ME.x + fx * 0.45, z = ME.z + fz * 0.45; [x, z] = collide(x, z, 0.12); const y = ME.carry === 6 ? 1.3 : 1.1;
  const sp = force ? 8.5 : 1.2; const vx = force ? dx * sp : fx * sp, vy = force ? dy * sp + 1.6 : 0.6, vz = force ? dz * sp : fz * sp;
  const k = ME.carry === 6 ? 0 : 1, cat = ME.box.cat, v = ME.box.v | 0, n = k === 1 ? ME.box.n : 0;
  sendAction(['th', k, cat, v, n, r2(x), r2(y), r2(z), r2(vx), r2(vy), r2(vz)]);
  if (force && zoneAt(x, z)?.id === 'vente') for (const t of [...C.tasks]) if (taskLast(t).sab === 'jet') { t.thrown += k === 0 ? 1 : TASK_GOAL_JET; if (t.thrown >= TASK_GOAL_JET) taskDone(t); }
  if (!C.isHost) predictItem({ k, cat, v, n, x, y, z, vx, vy, vz, tumble: force });
  ME.carry = 0; ME.box = null; SFX.play(force ? 'whoosh' : 'tick');
}
function dropCarry() { throwCarry(false); }
// ---------- visée & pose sur étagère ----------
const _dir = new THREE.Vector3();
function pickCand(list) {
  camera.getWorldDirection(_dir); const o = camera.position; let best = null, bs = 1e9;
  for (const c of list) {
    const hd = Math.hypot(c.x - ME.x, c.z - ME.z);
    if (ME.view === 1) {
      if (hd > 2.6) continue; const vx = c.x - o.x, vy = (c.y ?? 1.0) - o.y, vz = c.z - o.z; const L = Math.hypot(vx, vy, vz) || 1;
      const ang = Math.acos(clamp((vx * _dir.x + vy * _dir.y + vz * _dir.z) / L, -1, 1)); let sc = ang + (c.lowPrio ? 0.15 : 0);
      if (hd < 0.9 && !c.inst) sc = Math.min(sc, 0.3 + hd * 0.2); if (ang > (c.tol || 0.5) && (hd >= 0.9 || c.inst)) continue; if (sc < bs) { bs = sc; best = c; }
    } else { const d = hd + (c.lowPrio ? 0.6 : 0) + (c.inst ? 0.25 : 0); if (d < 1.8 && d < bs) { bs = d; best = c; } }
  }
  C.candScore = bs; return best;
}
function aimShelf(G) {
  C.place = null; C.take = null;
  const holding = ((ME.carry === 1 || ME.carry === 2) && ME.box && ME.box.n > 0) || (ME.carry === 6 && ME.box);
  if (ME.carry && !holding) return;
  camera.getWorldDirection(_dir); const o = ME.view === 1 ? camera.position : new THREE.Vector3(ME.x, 1.5, ME.z);
  if (ME.view !== 1) { _dir.set(Math.sin(ME.yaw), -0.25, Math.cos(ME.yaw)).normalize(); }
  const h = shelfHit(o, _dir); if (!h || Math.hypot(h.x - ME.x, h.z - ME.z) > 2.7) return;
  if (h.si === SI_VITRINE) { const k = clamp(Math.floor((h.z + 1.1) / 1.45), 0, 2); const oi = OPEN.findIndex((o) => o.fridge === k); if (!opDisp(G, oi)) return; }
  const mask = displayMask(G, h.si);
  if (!holding) {
    let slot = h.slot; if (!((mask >>> slot) & 1)) { let best = -1, bd = 9; const S2 = SHELVES[h.si]; for (let k = 0; k < S2.n; k++) if ((mask >>> k) & 1) { const d = Math.abs(Math.floor(k / S2.cols) - Math.floor(slot / S2.cols)) * 1.6 + Math.abs((k % S2.cols) - (slot % S2.cols)); if (d < bd) { bd = d; best = k; } } if (bd > 1.7) return; slot = best; }
    if (slot < 0) return;
    if (C.cand && C.candScore < 0.12 && C.cand.k !== 'job' && C.cand.k !== 'pick') return;
    C.take = { si: h.si, slot }; C.cand = null; return;
  }
  const wrong = h.si !== ME.box.cat; let slot = h.slot; if ((mask >>> slot) & 1) slot = nearestEmpty(h.si, mask, slot);
  C.place = { si: h.si, slot, ok: !wrong && slot >= 0, wrong, full: slot < 0 };
  if (C.place.ok || C.place.wrong) C.cand = null;
}
function doPlace(G) {
  const p = C.place; if (!p?.ok || !ME.box || ME.box.n <= 0) return;
  sendAction(['pl', p.si, p.slot]); PEND[p.si].bits = (PEND[p.si].bits | (1 << p.slot)) >>> 0; PEND[p.si].t = performance.now();
  ME.box.n--; SFX.play('place');
  const mask = displayMask(G, p.si), full = (mask >>> 0) === SHELVES[p.si].full;
  for (const t of [...C.tasks]) if (t.shelf === p.si) { t.placed++; if (t.placed >= TASK_GOAL_PLACE || full) taskDone(t); }
  const nm = p.si === SI_VITRINE ? 'Vitrine à boissons' : 'Rayon ' + SHELF_NAMES[p.si];
  if (ME.carry === 6) { ME.carry = 0; ME.box = null; if (full) UI.float('✅ ' + nm + (p.si === SI_VITRINE ? ' pleine !' : ' plein !')); return; }
  if (full) UI.float('✅ ' + nm + (p.si === SI_VITRINE ? ' pleine !' : ' plein !'));
  if (ME.box.n <= 0) { setTimeout(() => { if (ME.box && ME.box.n <= 0 && ME.carry !== 6) { ME.carry = 0; ME.box = null; UI.float('🗑️ Carton vide jeté'); SFX.play('tick'); } }, 450); }
}
function doTake(G) {
  const t = C.take; if (!t || ME.carry) return; const S2 = SHELVES[t.si];
  sendAction(['tp', t.si, t.slot]); const P = PEND[t.si]; P.clr = ((P.clr || 0) | (1 << t.slot)) >>> 0; P.bits = (P.bits & ~(1 << t.slot)) >>> 0; P.t = performance.now();
  const v = slotVar(t.si, t.slot, S2.cols); ME.carry = 6; ME.box = { cat: t.si, v, n: 1 }; SFX.play('pick');
  UI.float(PROD_ICON[t.si] + ' ' + prodName(t.si, v) + ' · clic droit pour lancer, G pour poser');
}
function movePlayer(dt, ghost) {
  let f = 0, s = 0;
  if (KEYS.KeyW || KEYS.ArrowUp) f++; if (KEYS.KeyS || KEYS.ArrowDown) f--; if (KEYS.KeyA) s--; if (KEYS.KeyD) s++;
  if (KEYS.ArrowLeft) ME.yaw += 2.2 * dt; if (KEYS.ArrowRight) ME.yaw -= 2.2 * dt;
  let vx = Math.sin(ME.yaw) * f - Math.cos(ME.yaw) * s, vz = Math.cos(ME.yaw) * f + Math.sin(ME.yaw) * s; const l = Math.hypot(vx, vz);
  if (ME.view === 1) ME.ry = ME.yaw;
  if (l < 0.01) return false;
  vx /= l; vz /= l;
  const sp = TUNE.pSpeed * (KEYS.ShiftLeft || KEYS.ShiftRight ? 1.4 : 1) * (ME.boost > 0 ? 1.25 : 1) * (ghost ? 1.4 : 1) * (ME.carry === 3 ? 0.85 : 1);
  const tryMove = (nx, nz) => { [nx, nz] = collide(nx, nz); if (!ghost) for (const [id, a] of AV) { if (id === NET.me || a.ch.ghost) continue; const dx = nx - a.x, dz = nz - a.z, d = Math.hypot(dx, dz); if (d < 0.6 && d > 1e-4) { nx = a.x + (dx / d) * 0.6; nz = a.z + (dz / d) * 0.6; } } if (walkable(nx, nz)) { const [cx, cz] = collide(nx, nz); ME.x = cx; ME.z = cz; return true; } return false; };
  for (let r = dt; r > 1e-6; r -= 0.04) { const s = Math.min(0.04, r); const nx = ME.x + vx * sp * s, nz = ME.z + vz * sp * s; if (!tryMove(nx, nz)) { if (!tryMove(nx, ME.z)) tryMove(ME.x, nz); } }
  if (ME.view === 3) ME.ry = angLerp(ME.ry, Math.atan2(vx, vz), Math.min(1, dt * 12));
  ME.anim = 1; return true;
}

// ---------- événements ----------
function handleEvent(e, G) {
  const [, type, a, b, c] = e; const N = (id) => (id === NET.me ? 'Toi' : pName(G, id));
  fxEvent(e, G); // effets visuels locaux (particules, tampon) : aucune incidence sur la partie
  if (type === 'fi') {
    SFX.play('fire');
    UI.toast(`📦 ${esc(N(a))} ${a === NET.me ? 'as été viré' : 'a été viré'}${c === 'meet' ? ' en réunion' : ''} ! C'était ${b === 'gla' ? 'un <b>GLANDEUR 😴</b>' : 'un <b>EMPLOYÉ 😇</b>'}`, 'fire', 6000);
    UI.chatSys(`📦 ${N(a)} a été viré (${b === 'gla' ? 'glandeur' : 'employé'}).`);
    if (a === NET.me) { C.tasks = []; ME.carry = 0; UI.big('Viré ! 📦', 'Tu ramasses tes affaires…', 'Tu continues en fantôme : tu peux te balader et discuter avec les autres virés.', 4500); }
  } else if (type === 'mf' || type === 'nm') {
    SFX.play(type === 'mf' ? 'fire' : 'ann'); const nw = type === 'mf' ? b : a;
    UI.toast(type === 'mf' ? `⏰ Quota dépassé ! ${esc(N(a))} (directeur) est viré. <b>${esc(N(nw))}</b> devient directeur 👔` : `👔 <b>${esc(N(nw))}</b> devient le nouveau directeur.`, 'fire', 6500);
    if (nw === NET.me) { C.tasks = []; ME.carry = 0; UI.big('Promotion ! 👔', 'Tu deviens', 'le nouveau DIRECTEUR. Vire les glandeurs avant la fin du quota !', 4500); }
    if (a === NET.me && type === 'mf') UI.big('Viré ! ⏰', 'Quota non respecté…', 'Tu continues en fantôme.', 4000);
  } else if (type === 'an') { SFX.play('ann'); UI.toast('📢 « ' + esc(ANNOUNCES[a] || '…') + ' »', 'ann', 6000); UI.chatSys('📢 Annonce au micro : « ' + (ANNOUNCES[a] || '') + ' »'); }
  else if (type === 'qt') UI.toast(`🚪 ${esc(N(a))} a quitté le magasin.`, '', 4000);
  else if (type === 'tel') { if (myRole(G) !== 'mgr') UI.toast('📞 Le téléphone sonne à l\u2019accueil !', '', 3000); }
  else if (type === 'telm') UI.toast('📞 Personne n\u2019a décroché… (−2 %)', 'fire', 3500);
  else if (type === 'pain') { SFX.play('ding'); UI.toast('🥖 Les baguettes sont prêtes : sors-les du four !', 'ann', 4000); }
  else if (type === 'burn') { SFX.play('alarm'); UI.toast('🔥 Le pain brûle à la boulangerie !', 'fire', 4500); }
  else if (type === 'boom') { SFX.play('crash'); UI.toast('💥 BOUM ! Quelque chose a explosé dans le micro-ondes…', 'fire', 4500); }
  else if (type === 'nf') UI.toast('🤝 Personne n’a été viré cette fois.', 'good', 3500);
  else if (type === 'cold') UI.toast('🥶 La porte de la chambre froide est restée ouverte : les produits frais s’abîment !', 'fire', 4500);
  else if (type === 'bk') {
    SFX.play('bonk'); const av = AV.get(a); if (av) charBubble(av.ch, a[0] === 'c' ? '😡 Non mais ça va pas ?!' : 'Aïe !', { raw: true, time: 2.5 });
    if (a === NET.me) UI.toast(`🤕 ${b && b !== NET.me ? esc(N(b)) + ' t’a lancé un produit dessus !' : 'Aïe ! Tu t’es pris un produit.'}`, 'fire', 3500);
    else if (a[0] === 'c' && b === NET.me) UI.toast('😡 Tu as touché un client… il s’en va furieux (−1,2 %)', 'fire', 3500);
  }
  else if (type === 'mt') UI.chatSys(a === NET.me ? '🔔 Tu convoques une réunion d’équipe !' : '🔔 ' + N(a) + ' convoque une réunion d’équipe !');
}

// ---------- chat ----------
function processChat(G) {
  if (!NET.room) return;
  const hostId = C.isHost ? NET.me : C.hostPeerObj?.peer; const meAlive = !G?.pl || G.ph === 'lobby' || !inRoster(G) ? null : isAlive(G);
  for (const [peer, p] of C.peerById) {
    const ch = p.presence?.ch; if (!Array.isArray(ch)) continue;
    for (const m of ch) {
      if (!Array.isArray(m)) continue; const key = peer + ':' + m[0]; if (C.seenCh.has(key)) continue; C.seenCh.add(key);
      let author = peer; if (peer === hostId && typeof m[1] === 'string' && m[1] !== peer && G?.pl?.some((x) => x[0] === m[1] && x[3])) author = m[1];
      const text = cleanText(m[2], 80); if (!text) continue;
      const authDead = G?.pl && G.ph !== 'lobby' && inRoster(G, author) && !isAlive(G, author);
      if (authDead && meAlive) continue;
      UI.chatLine(pName(G, author), SHIRTS[pSkin(G, author)[0]], text, authDead);
      const av = AV.get(author); if (av && !authDead) charBubble(av.ch, text);
      if (author !== NET.me) SFX.play('chat');
    }
  }
}
function sendChat(text) { text = cleanText(text, 80); if (!text || !NET.room) return; chatSay(NET.me, text); }

// ---------- avatars ----------
function syncAvatars(dt, G) {
  const want = new Map();
  if (C.mode === 'title' || C.mode === 'joining') want.set(NET.me || 'me', { x: 13, z: 16, ry: 0, anim: 0, carry: 0, sk: ME.sk, name: ME.name || 'Toi', mgr: false, ghost: false, snap: true });
  else if (C.mode === 'lobby' || !G?.pl) {
    const list = [];
    for (const [peer, p] of C.peerById) if (p.presence?.n) list.push({ id: peer, name: peer === NET.me ? ME.name || 'Toi' : cleanText(p.presence.n, 14), sk: peer === NET.me ? ME.sk : sanitizeSk(p.presence.sk) });
    if (NET.me && !list.some((l) => l.id === NET.me)) list.unshift({ id: NET.me, name: ME.name || 'Toi', sk: ME.sk });
    for (const b of G?.bots || []) list.push({ id: b[0], name: b[1], sk: b[2] });
    list.forEach((l, i) => want.set(l.id, { x: 13 + (i - (list.length - 1) / 2) * 1.2, z: 16 + (i % 2) * 0.5, ry: 0, anim: 0, carry: 0, sk: l.sk, name: l.name, mgr: false, ghost: false, snap: true }));
  } else {
    const meAlive = isAlive(G);
    for (const [id, name, sk, bot] of G.pl) {
      if ((G.qt || []).includes(id)) continue; const dead = G.fd.includes(id); if (dead && meAlive) continue;
      let s = null;
      if (id === NET.me) s = { x: ME.x, z: ME.z, ry: ME.ry, anim: ME.anim, carry: ME.carry };
      else if (bot) { const b = (G.bt || []).find((e) => e[0] === id); if (b) s = { x: b[1], z: b[2], ry: b[3], anim: b[4], carry: b[5] }; }
      else { const ps = C.peerById.get(id)?.presence?.ps; if (Array.isArray(ps)) s = { x: +ps[0] || 0, z: +ps[1] || 0, ry: +ps[2] || 0, anim: ps[3] | 0, carry: ps[4] | 0 }; }
      if (!s) continue;
      want.set(id, { ...s, sk, name: id === NET.me ? name + ' (toi)' : name, mgr: G.mg === id && !dead, ghost: dead });
    }
    if (G.ph !== 'end') for (const cu of G.cu || []) { const h = hash(cu[0]); want.set(cu[0], { x: cu[1], z: cu[2], ry: cu[3], anim: cu[4], carry: 0, sk: [h % 12, (h >>> 4) % 5, (h >>> 8) % 3 === 0 ? ((h >>> 10) % 7) + 1 : 0, (h >>> 12) % 4 === 0 ? ((h >>> 14) % 5) + 1 : 0], cust: true, icon: cu[5] === 1 ? '❓ Aidez-moi !' : cu[5] === 3 ? '😡' : cu[5] === 4 ? '😊' : '' }); }
  }
  for (const [id, a] of AV) if (!want.has(id)) { disposeChar(a.ch); AV.delete(id); }
  const k = 1 - Math.exp(-dt * 12);
  for (const [id, w] of want) {
    let a = AV.get(id);
    if (!a) { a = { ch: makeChar(w.sk, w.cust ? null : w.name, { cust: w.cust }), x: w.x, z: w.z, ry: w.ry }; AV.set(id, a); }
    setCharSkin(a.ch, w.sk); if (!w.cust) { setCharName(a.ch, w.name, w.mgr); setCharGhost(a.ch, w.ghost); } else setCharIcon(a.ch, w.icon); setCharCarry(a.ch, w.carry);
    const mine = id === NET.me || w.snap;
    if (mine || Math.hypot(w.x - a.x, w.z - a.z) > 3) { a.x = w.x; a.z = w.z; a.ry = w.ry; } else { a.x = lerp(a.x, w.x, k); a.z = lerp(a.z, w.z, k); a.ry = angLerp(a.ry, w.ry, k); }
    a.ch.root.position.set(a.x, 0, a.z); a.ch.root.rotation.y = a.ry;
    const d = Math.hypot(camera.position.x - a.x, camera.position.z - a.z);
    animChar(a.ch, w.anim, dt, d);
    a.ch.root.visible = !(id === NET.me && C.mode === 'game' && (ME.view === 1 || (!C.camMode && (C.camD ?? 9) < 0.9)));
    if (id === NET.me && C.camMode) a.ch.root.visible = true;
    if (id !== NET.me && C.mode === 'game' && ME.view === 1 && Math.hypot(camera.position.x - a.x, camera.position.z - a.z) < 0.55) a.ch.root.visible = false;
    if (id === (NET.me || 'me') && C.mode !== 'lobby' && a.ch.label) a.ch.label.visible = false;
  }
}

// ---------- caméra ----------
function camClip(tx, ty, tz, px, py, pz) {
  const n = 18;
  for (let i = 1; i <= n; i++) { const t = i / n, x = tx + (px - tx) * t, y = ty + (py - ty) * t, z = tz + (pz - tz) * t;
    if (insideStore(x, z) && y > 3.85) return (i - 1) / n;
    for (const b of BOXES) { if (b.kind === 'inv' || y > b.h + 0.05) continue; if (x > b.x0 - 0.12 && x < b.x1 + 0.12 && z > b.z0 - 0.12 && z < b.z1 + 0.12) return (i - 1) / n; } }
  return 1;
}
function updateCamera(dt, G) {
  WORLD.clock += dt; camera.fov = 70;
  if (C.mode === 'title' || C.mode === 'joining') { const s = Math.sin(WORLD.clock * 0.3) * 0.25; camera.position.set(12.2 + s, 1.6, 19.6); camera.lookAt(13.9 + s * 0.3, 1.3, 16); camera.updateProjectionMatrix(); return; }
  if (C.mode === 'lobby') { const n = AV.size; const d = 4.4 + n * 0.42; camera.position.set(12 + Math.sin(WORLD.clock * 0.25) * 0.4, 1.9 + n * 0.08, 16 + d); camera.lookAt(13.9 + n * 0.12, 1.25, 16); camera.updateProjectionMatrix(); return; }
  if (G?.ph === 'meet' && G.mt?.seats?.includes(NET.me) && isAlive(G)) { camera.position.set(6 + Math.sin(WORLD.clock * 0.2) * 0.6, 3.5, -6.55); camera.lookAt(6, 0.7, -10.6); camera.updateProjectionMatrix(); return; }
  if (C.camMode) { const c = CAMS[C.camIdx]; camera.position.set(...c.p); camera.lookAt(...c.t); camera.fov = 78; camera.updateProjectionMatrix(); return; }
  if (ME.view === 1) { const cp = Math.cos(ME.pitch); const bob = (ME.anim === 1 ? Math.abs(Math.sin(WORLD.clock * 9)) * 0.04 : 0); camera.fov = 75; camera.position.set(ME.x + Math.sin(ME.yaw) * 0.12, 1.55 + bob, ME.z + Math.cos(ME.yaw) * 0.12); camera.lookAt(ME.x + Math.sin(ME.yaw) * cp * 3, 1.55 + bob - Math.sin(ME.pitch) * 3, ME.z + Math.cos(ME.yaw) * cp * 3); C.camD = 0; }
  else {
    const dist = 4.3, tx = ME.x, ty = 1.55, tz = ME.z; let best = null; const inS = insideStore(tx, tz);
    for (const add of [0, 0.3, 0.6, 0.95]) {
      const p = Math.min(1.35, ME.pitch + add), cp = Math.cos(p), sp = Math.sin(p);
      let px = tx - Math.sin(ME.yaw) * cp * dist, py = ty + sp * dist, pz = tz - Math.cos(ME.yaw) * cp * dist; if (inS) py = Math.min(py, 3.7);
      const f = Math.max(0.1, camClip(tx, ty, tz, px, py, pz)); const d = f * Math.hypot(px - tx, py - ty, pz - tz);
      if (!best || d > best.d + 0.35) best = { d, x: tx + (px - tx) * f, y: Math.max(0.3, ty + (py - ty) * f), z: tz + (pz - tz) * f };
      if (f > 0.9) break;
    }
    const cp0 = C.camP; if (!cp0 || Math.hypot(cp0.x - best.x, cp0.z - best.z) > 6) C.camP = { ...best }; else { const k = 1 - Math.exp(-dt * 14); cp0.x = lerp(cp0.x, best.x, k); cp0.y = lerp(cp0.y, best.y, k); cp0.z = lerp(cp0.z, best.z, k); }
    camera.position.set(C.camP.x, C.camP.y, C.camP.z); camera.lookAt(tx, ty + 0.15, tz); C.camD = best.d;
  }
  camera.updateProjectionMatrix();
}

// ---------- entrées ----------
function setupInput() {
  const cv = $('#c');
  addEventListener('keydown', (e) => {
    if (e.target && (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT')) { if (e.code === 'Escape') e.target.blur(); return; }
    if (MG.active) { MG.key(e); return; }
    if (e.code === 'Enter' && NET.room && (C.mode === 'game' || C.mode === 'lobby' || C.mode === 'end')) { e.preventDefault(); UI.openChat(); return; }
    if (e.code === 'KeyH') { UI.toggleHelp(); return; }
    if (UI.modal) { if (e.code === 'Escape') UI.closeModal(); return; }
    KEYS[e.code] = true;
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Space'].includes(e.code)) e.preventDefault();
    const G = curG(); if (C.mode !== 'game' || !G) return;
    if (C.camMode) {
      if (e.code === 'KeyE' || e.code === 'Escape') { C.camMode = false; UI.cams(false); }
      if (e.code === 'ArrowRight' || e.code === 'KeyD') { C.camIdx = (C.camIdx + 1) % CAMS.length; SFX.play('tick'); }
      if (e.code === 'ArrowLeft' || e.code === 'KeyA') { C.camIdx = (C.camIdx + CAMS.length - 1) % CAMS.length; SFX.play('tick'); }
      return;
    }
    if (e.code === 'KeyV') { ME.view = ME.view === 3 ? 1 : 3; if (ME.view === 3) ME.pitch = Math.max(ME.pitch, 0.25); }
    if (e.code === 'KeyG') dropCarry();
    if (e.code === 'KeyX' && !e.repeat) throwCarry(true);
    if (e.code === 'KeyI') { C.hints = !C.hints; UI.toast(C.hints ? '💡 Indices affichés dans le magasin' : '💡 Indices masqués (I pour les remettre)', '', 1800); }
    if (G.ph !== 'play' || !isAlive(G)) return;
    if (e.code === 'KeyE' && !e.repeat) pressAction();
    if (e.code === 'KeyF' && myRole(G) === 'mgr' && C.fireCand) UI.confirmFire(C.fireCand);
    if (e.code === 'KeyR' && myRole(G) === 'mgr') callMeeting();
  });
  addEventListener('keyup', (e) => { KEYS[e.code] = false; });
  addEventListener('blur', () => { for (const k in KEYS) KEYS[k] = false; C.drag = false; });
  cv.addEventListener('mousedown', (e) => {
    SFX.init();
    if (C.mode !== 'game' || C.camMode || UI.modal) return;
    if (document.pointerLockElement === cv && e.button === 0) { KEYS.Mouse0 = true; pressAction(); return; }
    if (document.pointerLockElement === cv && e.button === 2) { throwCarry(true); return; }
    C.drag = true;
    if (!document.pointerLockElement && cv.requestPointerLock) { try { const p = cv.requestPointerLock(); if (p && p.catch) p.catch(() => {}); } catch (err) {} }
  });
  addEventListener('mouseup', (e) => { C.drag = false; if (e.button === 0) KEYS.Mouse0 = false; });
  cv.addEventListener('contextmenu', (e) => e.preventDefault());
  addEventListener('mousemove', (e) => {
    if (C.mode !== 'game' || C.camMode) return;
    if (document.pointerLockElement === cv || C.drag) {
      ME.yaw -= e.movementX * 0.0026;
      const lo = ME.view === 1 ? -1.3 : -0.35, hi = ME.view === 1 ? 1.3 : 1.15; ME.pitch = clamp(ME.pitch + e.movementY * 0.0026, lo, hi);
    }
  });
  cv.addEventListener('wheel', (e) => { if (C.mode === 'game' && ME.view === 3) ME.pitch = clamp(ME.pitch + Math.sign(e.deltaY) * 0.06, -0.35, 1.15); }, { passive: true });
}
function pressAction() {
  const G = curG(); if (!G || G.ph !== 'play' || !isAlive(G) || C.camMode || MG.active) return;
  if (C.place?.wrong) { UI.float(ME.box?.cat === SI_VITRINE ? '❌ Ça va dans la vitrine à boissons' : '❌ Ça va au rayon ' + SHELF_NAMES[ME.box.cat]); SFX.play('err'); return; }
  if (C.place?.full) { UI.float('Rayon plein !'); return; }
  if (C.place) return;
  if (C.take) { doTake(G); C.hold.lock = true; return; }
  const c = C.cand; if (!c) return;
  if (c.k === 'cams') { C.camMode = true; UI.cams(true); SFX.play('tick'); return; }
  if (c.k === 'open') { const v = !c.v; OPL[c.oi] = { v, t: performance.now() }; sendAction(['op', c.oi, v ? 1 : 0]); if (v) for (const t of [...C.tasks]) if (taskLast(t).door === c.oi) taskDone(t); SFX.play(OPEN[c.oi].type === 'drawer' ? 'drawer' : OPEN[c.oi].type === 'shutter' ? 'shutter' : 'door'); C.hold.lock = true; return; }
  if (c.k === 'item') {
    if (ME.carry) { UI.float('👐 Tu as déjà les mains pleines (G pour lâcher)'); return; }
    const it = c.it; sendAction(['ip', it[0]]); C.hideIt.set(it[0], performance.now()); SFX.play('pick'); C.hold.lock = true;
    if (it[1] === 1) { ME.carry = it[2] >= 8 ? 2 : 1; ME.box = { cat: it[2], n: it[9] }; UI.float('📦 Carton de ' + CAT_NAMES[it[2]] + ' (' + it[9] + ')'); }
    else { ME.carry = 6; ME.box = { cat: it[2], v: it[3], n: 1 }; UI.float(PROD_ICON[it[2]] + ' ' + prodName(it[2], it[3])); }
    return;
  }
  if (c.k === 'sab' && c.cd) { UI.float('🤫 Trop tôt, fais-toi discret quelques secondes…'); C.hold.lock = true; return; }
  if (c.mg) openMg(c);
}
function callMeeting() { const G = curG(); if (!G || G.ph !== 'play' || myRole(G) !== 'mgr') return; if ((G.mcd || 0) > 0) { UI.toast(`⏳ Prochaine réunion possible dans ${Math.ceil(G.mcd)} s`, '', 2500); return; } sendAction(['mt']); }
function doFire(id) { const G = curG(); if (!G || myRole(G) !== 'mgr') return; sendAction(['fi', id]); }
