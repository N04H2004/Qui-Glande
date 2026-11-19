// ======================= HÔTE : logique autoritaire de la partie + bots =======================
const H = { on: false, g: null, roles: {}, orig: {}, bots: [], botsCfg: [], stats: {}, susp: {}, seen: {}, lastOb: {}, ak: {}, evSeq: 0, mSeq: 0, pubT: 0, depT: 0, pref: '', gone: {}, botPlan: [], mtEl: 0, decT: 0, peerMap: new Map() };
const CHAT = { out: [], seq: 0 };
function chatSay(author, text) { text = cleanText(text, 80); if (!text) return; CHAT.out.push([++CHAT.seq, author, text]); while (CHAT.out.length > 5) CHAT.out.shift(); setPres({ ch: CHAT.out }); }

function hostInit() { H.on = true; H.ak = {}; hostToLobby(); }
function hostToLobby() { H.g = { ph: 'lobby', id: null, bots: H.botsCfg.map((b) => [b.id, b.name, b.sk]), solo: NET.solo ? 1 : 0 }; H.bots = []; }
function hostAddBot() { if (H.botsCfg.length >= 11) return; const used = new Set(H.botsCfg.map((b) => b.name)); const name = pick(BOT_NAMES.filter((n) => !used.has(n))) || 'Bot'; H.botsCfg.push({ id: 'b' + uid(5), name, sk: [rndi(0, SHIRTS.length - 1), rndi(0, SKINS.length - 1), rndi(0, HATS.length - 1), Math.random() < 0.5 ? 0 : rndi(1, ACCS.length - 1)] }); if (H.g?.ph === 'lobby') hostToLobby(); }
function hostRemoveBot() { H.botsCfg.pop(); if (H.g?.ph === 'lobby') hostToLobby(); }
const isBotId = (id) => typeof id === 'string' && id[0] === 'b' && H.bots.some((b) => b.id === id);
const sanitizeSk = (sk) => (Array.isArray(sk) ? [0, 1, 2, 3].map((i) => Math.abs(+sk[i] | 0) % [SHIRTS, SKINS, HATS, ACCS][i].length) : [0, 0, 0, 0]);

function hostHumans() { const out = []; for (const [id, p] of H.peerMap) if (p && p.n) out.push({ id, name: cleanText(p.n, 14) || 'Joueur', sk: sanitizeSk(p.sk) }); return out; }
function hostStart() {
  const humans = hostHumans();
  const roster = [...humans.map((h) => ({ ...h, bot: 0 })), ...H.botsCfg.map((b) => ({ id: b.id, name: b.name, sk: b.sk, bot: 1 }))].slice(0, 12);
  if (roster.length < 3) return false;
  const n = roster.length, nGla = n <= 5 ? 1 : n <= 8 ? 2 : 3, ids = roster.map((r) => r.id);
  const rl = shuffle(['mgr', ...Array(nGla).fill('gla'), ...Array(n - 1 - nGla).fill('emp')]);
  H.roles = {}; ids.forEach((id, i) => (H.roles[id] = rl[i]));
  if (H.pref && NET.me && H.roles[NET.me] && H.roles[NET.me] !== H.pref) { const o = ids.find((id) => id !== NET.me && H.roles[id] === H.pref); if (o) { const t = H.roles[o]; H.roles[o] = H.roles[NET.me]; H.roles[NET.me] = t; } }
  H.orig = { ...H.roles };
  const mg = ids.find((id) => H.roles[id] === 'mgr');
  H.g = { ph: 'play', id: uid(6), pl: roster.map((r) => [r.id, r.name, r.sk, r.bot]), mg, mh: [mg], fd: [], fr: {}, qt: [], pr: TUNE.startProd, q: TUNE.quota, t: TUNE.day, st: SHELVES.map((S2, si) => (si === SI_VITRINE ? S2.full : randomMask(si, 0.62))), ms: [], py: 0, bt: [], cu: [], qs: [0, 0, 0], tel: 0, ov: [0, 0], rk: {}, ev: [], mt: null, en: null, ng: nGla, mcd: 30, solo: NET.solo ? 1 : 0, nd: JOBS.map(() => rnd(15, 65)), it: [], op: Array(OPEN_WORDS).fill(0), fo: 0 };
  [0, 2].forEach((i) => opSet(H.g.op, i, true));
  H.items = []; H.iSeq = 0; H.sabCd = {}; H.bdo = {}; H.clock = 0; H.spoilT = 0;
  H.cust = []; H.q = [[], [], []]; H.custT = 2; H.cSeq = 0; H.telNext = rnd(25, 45);
  H.stats = {}; ids.forEach((id) => (H.stats[id] = [0, 0])); H.susp = {}; H.seen = {}; H.gone = {}; H.depT = TUNE.deplete; H.lastOb = {};
  H.bots = roster.map((r, i) => ({ r, i })).filter((o) => o.r.bot).map(({ r, i }) => ({ id: r.id, name: r.name, x: SPAWNS[i][0], z: SPAWNS[i][1], ry: Math.PI, anim: 0, carry: 0, path: null, task: null, wait: rnd(0.5, 3), work: 0 }));
  hostEvent(['st']); hostEncryptRoles(); hostPublish();
  return true;
}
function hostEncryptRoles() {
  const g = H.g, gid = g.id;
  for (const [id, , , bot] of g.pl) {
    if (bot || id === NET.me) continue;
    const pk = H.peerMap.get(id)?.pk || ''; const gla = H.orig[id] === 'gla';
    const payload = { g: gid, r: gla ? 'g' : 'e', m: gla ? g.pl.filter((p) => p[0] !== id && H.orig[p[0]] === 'gla').map((p) => p[0]) : [] };
    CRY.enc(pk, payload).then((s) => { if (H.g && H.g.id === gid) H.g.rk[id] = s; });
  }
}
const hostAliveIds = () => (H.g?.pl || []).map((p) => p[0]).filter((id) => !H.g.fd.includes(id) && !H.g.qt.includes(id));
const hostAlive = (id) => !!H.g?.pl?.some((p) => p[0] === id) && !H.g.fd.includes(id) && !H.g.qt.includes(id);
function hostPos(id) { if (id === NET.me) return [ME.x, ME.z]; const b = H.bots.find((b) => b.id === id); if (b) return [b.x, b.z]; const ps = H.peerMap.get(id)?.ps; return Array.isArray(ps) ? [+ps[0] || 0, +ps[1] || 0] : null; }
function hostEvent(e) { const g = H.g; g.ev = g.ev || []; g.ev.push([++H.evSeq, ...e]); while (g.ev.length > 6) g.ev.shift(); }
function hostProd(v) { H.g.pr = clamp(H.g.pr + v, 0, 100); if ((H.g.pr >= 100 || H.g.pr <= 0) && H.g.ph === 'play') hostCheckWin(); }
const hostCount = (r) => hostAliveIds().filter((id) => H.roles[id] === r).length;
const kE = () => clamp(TUNE.kE / Math.max(1, hostCount('emp') + 0.5 * hostCount('gla')), 0.25, 1.6);
const kG = () => clamp(1.5 / Math.max(1, hostCount('gla')), 0.5, 1.5);

function hostUpdate(dt) {
  const g = H.g; if (!g) return;
  if (g.ph === 'play' || g.ph === 'meet') { hostReadOutboxes(); hostAcks(); hostPresenceCheck(dt); }
  if (g.ph === 'play') {
    g.t -= dt; g.q -= dt; if (g.mcd > 0) g.mcd -= dt; H.clock += dt;
    JOBS.forEach((j, k) => (g.nd[k] = Math.min(100, g.nd[k] + j.rate * 100 * dt)));
    hostItems(dt); hostColdRoom(dt);
    H.depT -= dt; if (H.depT <= 0) { H.depT = TUNE.deplete * rnd(0.7, 1.3); takeProducts(rndi(0, 9), 1); }
    hostCustomers(dt); hostStoreEvents(dt);
    let emp = 0, tot = 0; g.st.forEach((m, si) => { if (si === SI_VITRINE) return; emp += SHELVES[si].n - popcnt(m); tot += SHELVES[si].n; });
    H.vitT = (H.vitT || 0) + dt; if (H.vitT > 25) { H.vitT = 0; const b = randomBit(g.st[SI_VITRINE], false, SHELVES[SI_VITRINE].n); if (b >= 0) g.st[SI_VITRINE] = (g.st[SI_VITRINE] | (1 << b)) >>> 0; } const floorN = H.items.filter(itemOnFloor).length, maxed = g.nd.filter((v) => v >= 100).length;
    hostProd(-(g.ms.length * TUNE.messDrain + (emp / tot) * TUNE.emptyDrain + floorN * TUNE.floorDrain + maxed * TUNE.needDrain + (g.fo > 15 ? TUNE.coldDrain : 0)) * dt);
    for (const k in H.susp) H.susp[k] *= 1 - 0.008 * dt;
    H.noiseT = (H.noiseT || 8) - dt; if (H.noiseT <= 0) { H.noiseT = rnd(5, 10); const c = hostAliveIds().filter((id) => id !== g.mg); if (c.length) { const id = pick(c); H.susp[id] = (H.susp[id] || 0) + rnd(0.4, 1.3); } }
    hostBots(dt); hostBotDoors(dt);
    if (g.ph === 'play' && g.q <= 0) hostMgrFired();
    if (g.ph === 'play') hostCheckWin();
  } else if (g.ph === 'meet') hostMeetUpdate(dt);
  H.pubT -= dt; if (H.pubT <= 0) { H.pubT = 0.1; hostPublish(); }
}
function hostPublish() {
  const g = H.g; if (!g) return;
  if (g.ph !== 'lobby') {
    g.bt = H.bots.filter((b) => hostAlive(b.id)).map((b) => [b.id, r2(b.x), r2(b.z), r2(b.ry), b.anim, b.carry]);
    g.cu = (H.cust || []).map((c) => [c.id, r2(c.x), r2(c.z), r2(c.ry), c.anim, c.flag, c.flag === 1 ? c.topic : 0]);
    g.it = (H.items || []).map((it) => [it.id, it.k, it.cat, it.v, r2(it.x), r2(it.y), r2(it.z), Math.round(it.ry * 10) / 10, it.s, it.n]);
    const ak = {}; for (const [id, , , bot] of g.pl || []) if (!bot && H.ak[id]) ak[id] = H.ak[id]; g.ak = ak;
  }
  const out = { ...g };
  if (g.ph !== 'lobby') {
    out.pr = Math.round(g.pr * 10) / 10; out.q = Math.ceil(g.q); out.t = Math.ceil(g.t); out.mcd = Math.ceil(g.mcd || 0); out.tel = Math.ceil(g.tel || 0); out.ov = [g.ov[0], Math.ceil(g.ov[1])]; if (g.nd) out.nd = g.nd.map((v) => Math.floor(v)); out.fo = Math.floor(g.fo || 0);
    if (g.mt) out.mt = { ...g.mt, t: Math.ceil(g.mt.t) };
  }
  if (presSize({ g: out }) > 3950 && out.it?.length > 16) out.it = out.it.slice(-16);
  if (presSize({ g: out }) > 3950) { out.ev = (out.ev || []).slice(-2); if (presSize({ g: out }) > 3950 && out.en) out.en = { ...out.en, st: {} }; }
  setPres({ g: out });
}
function hostReadOutboxes() {
  for (const [id, p] of H.peerMap) {
    if (id === NET.me) continue; const ob = p.ob; if (!ob || H.lastOb[id] === ob) continue; H.lastOb[id] = ob; const gid = H.g.id;
    CRY.dec(p.pk, ob).then((d) => {
      if (!d || !H.g || d.g !== gid || H.g.id !== gid) return;
      for (const a of d.a || []) { if (!Array.isArray(a)) continue; const seq = +a[0]; if (!(seq > (H.ak[id] || 0))) continue; H.ak[id] = seq; try { hostApply(id, a); } catch (e) { console.warn(e); } }
    }).catch(() => {});
  }
}
function hostAcks() { const g = H.g; for (const id in g.rk) if (H.peerMap.get(id)?.ra === g.id) delete g.rk[id]; }
function hostPresenceCheck(dt) {
  const g = H.g; if (NET.solo) return;
  for (const [id, , , bot] of g.pl) { if (bot || id === NET.me || !hostAlive(id)) continue; if (H.peerMap.has(id)) { H.gone[id] = 0; continue; } H.gone[id] = (H.gone[id] || 0) + dt; if (H.gone[id] > 6) hostQuit(id); }
}

// ---------- actions ----------
function hostApply(pid, a) {
  const g = H.g; if (!g) return; const type = a[1];
  if (type === 'dc') { if (g.ph === 'meet' && g.mt?.s === 'dec' && pid === g.mg) hostDecide(String(a[2] ?? '-')); return; }
  if (g.ph !== 'play' || !hostAlive(pid)) return;
  const pos = hostPos(pid), role = H.roles[pid];
  const near = (x, z, r = 4) => !pos || Math.hypot(pos[0] - x, pos[1] - z) <= r;
  if (type === 'tk') {
    const st = ST[a[2]]; if (!st) return; const kind = a[3]; if (!near(st.x, st.z)) return;
    if (kind === 'w') {
      if (st.kind !== 'w' || role === 'mgr') return;
      if (st.ck !== undefined) { const served = hostServe(st.ck); hostProd((served ? 2.2 : 0.4) * kE()); }
      else if (st.job !== undefined) { const need = g.nd[st.job] / 100; hostProd(st.gain * kE() * (0.3 + 0.7 * need)); g.nd[st.job] = 0; }
      else hostProd(st.gain * kE());
      H.stats[pid][0]++;
    }
    else if (kind === 's') {
      if (role !== 'gla') return; if (!isBotId(pid) && (H.sabCd[pid] || 0) > H.clock) return;
      if (SAB_IDS.includes(st.id) && !sabValid(st.id, g)) return;
      H.sabCd[pid] = H.clock + TUNE.sabCd; hostSabotage(pid, st, a[4], a[5]);
    }
  } else if (type === 'cl') {
    const m = g.ms.find((m) => m[0] === a[2]); if (!m || !near(m[2], m[3])) return;
    g.ms = g.ms.filter((x) => x !== m); if (m[1] === 'pyr') g.py = 0; if (m[1] === 'burn') g.ov = [0, 0]; hostProd(1 * kE()); H.stats[pid][0]++;
  } else if (type === 'fi') {
    if (pid !== g.mg) return; const t = a[2]; if (!hostAlive(t) || t === g.mg) return; const tp = hostPos(t); if (tp && !near(tp[0], tp[1], 5)) return; hostFire(t, 'direct');
  } else if (type === 'mt') { if (pid !== g.mg || g.mcd > 0) return; hostMeeting(); }
  else if (type === 'op') {
    const o = OPEN[a[2] | 0]; if (!o) return; const v = !!a[3]; const pts = [...openAims(o, true), ...openAims(o, false)]; if (!pts.some((p) => near(p[0], p[2], 3.4))) return;
    if (o.cold && !v && g.fo > 15) { hostProd(0.8 * kE()); H.stats[pid][0]++; }
    opSet(g.op, o.i, v); if (o.cold && !v) g.fo = 0; delete H.bdo[o.i];
  } else if (type === 'pl') {
    const si = a[2] | 0, slot = a[3] | 0, S2 = SHELVES[si]; if (!S2 || slot < 0 || slot >= S2.n) return; const bit = 1 << slot; if (g.st[si] & bit) return;
    const p = slotPos(si, slot); if (!near(p[0], p[2], 3.6)) return; g.st[si] = (g.st[si] | bit) >>> 0; if (si !== SI_VITRINE) hostProd(TUNE.placeGain * kE()); H.plN = (H.plN || 0) + 1; if (H.plN % 8 === 0) H.stats[pid][0]++;
  } else if (type === 'tp') {
    const si = a[2] | 0, slot = a[3] | 0, S2 = SHELVES[si]; if (!S2 || slot < 0 || slot >= S2.n) return; const bit = 1 << slot; if (!(g.st[si] & bit)) return;
    const p = slotPos(si, slot); if (!near(p[0], p[2], 3.6)) return; g.st[si] = (g.st[si] & ~bit) >>> 0; if (si !== SI_VITRINE) hostProd(-TUNE.placeGain * kE());
  } else if (type === 'ip') {
    const it = H.items.find((x) => x.id === a[2]); if (!it || !near(it.x, it.z, 3.4)) return; H.items = H.items.filter((x) => x !== it);
  } else if (type === 'th') {
    const k = a[2] === 1 ? 1 : 0, cat = clamp(a[3] | 0, 0, 10), v = clamp(a[4] | 0, 0, 15), nn = clamp(a[5] | 0, 0, BOX_SIZE);
    const x = +a[6], y = +a[7], z = +a[8]; let vx = +a[9] || 0, vy = +a[10] || 0, vz = +a[11] || 0; if (![x, y, z].every(Number.isFinite) || !near(x, z, 2) || y < 0 || y > 2.6) return;
    const sp = Math.hypot(vx, vy, vz); if (sp > 13) { vx *= 13 / sp; vy *= 13 / sp; vz *= 13 / sp; }
    if (k === 1 && cat === 10) return;
    hostSpawnItem({ k, cat, v, n: nn, x, y, z, vx, vy, vz, own: pid, tumble: sp > 3 });
    if (k === 0 && sp > 3 && zoneAt(x, z)?.id === 'vente') hostSuspicion(pid, x, z, 'des produits jetés par terre', 0.5);
  }
  else if (role === 'mgr') return;
  else if (type === 'tb') { H.tbT = H.tbT || {}; if ((H.tbT[pid] ?? -99) > H.clock - 8) return; H.tbT[pid] = H.clock; if (a[2] === 'w') { hostProd(1.0 * kE()); H.stats[pid][0]++; } }
  else if (type === 'hp') {
    const c = H.cust.find((c) => c.id === a[2]); if (!c || c.flag !== 1 || !near(c.x, c.z)) return;
    if (a[3]) { hostProd(2 * kE()); H.stats[pid][0]++; custLeave(c, 4); } else { hostProd(-0.5); custLeave(c, 3); }
  } else if (type === 'tel') {
    if (!(g.tel > 0) || !near(ST.tel.x, ST.tel.z)) return; g.tel = 0; H.telNext = rnd(35, 70); hostProd(ST.tel.gain * kE()); H.stats[pid][0]++;
  } else if (type === 'ov') {
    if (!near(ST.four.x, ST.four.z)) return;
    if (g.ov[0] === 0) { g.ov = [1, 22]; hostProd(0.4 * kE()); }
    else if (g.ov[0] === 2) { g.ov = [0, 0]; hostProd(3 * kE()); H.stats[pid][0]++; hostEvent(['pok']); }
  }
}
function hostSabotage(pid, st, sub, extra) {
  const g = H.g; let dmg = st.dmg || 3, place = st.short; const T = Math.ceil(g.t); const has = (t) => g.ms.some((m) => m[1] === t);
  if (sub === 'jet') {
    const si = st.shelf; if (si == null) return; const bp = hostPos(pid) || [st.x, st.z]; let n = 0;
    for (let k = rndi(2, 3); k > 0; k--) { const b = randomBit(g.st[si], true, SHELVES[si].n); if (b < 0) break; g.st[si] = (g.st[si] & ~(1 << b)) >>> 0; n++;
      const a2 = rnd(0, Math.PI * 2), spd = rnd(3, 6); hostSpawnItem({ k: 0, cat: si, v: slotVar(si, b, SHELVES[si].cols), n: 0, x: bp[0], y: 1.2, z: bp[1], vx: Math.cos(a2) * spd, vy: rnd(1.5, 3.5), vz: Math.sin(a2) * spd, own: pid, tumble: true }); }
    if (!n) return; dmg = n * TUNE.placeGain * kE(); place = 'rayon ' + SHELF_NAMES[si];
    hostProd(-dmg); H.stats[pid][1]++; hostSuspicion(pid, bp[0], bp[1], place); return;
  }
  if (sub === 'etq' || sub === 'mix') { const type = sub === 'etq' ? 'tag' : 'mix'; if (st.shelf == null || g.ms.some((m) => m[1] === type && m[4] === st.shelf)) return; dmg = 2.5; g.ms.push([++H.mSeq, type, st.x, st.z, st.shelf, T]); place = 'rayon ' + SHELF_NAMES[st.shelf]; }
  else if (st.id === 'pyramide') { if (g.py) return; g.py = 1; g.ms.push([++H.mSeq, 'pyr', st.x, st.z, -1, T]); }
  else if (st.id === 'lait') { const used = g.ms.filter((m) => m[1] === 'lait'); if (used.length >= TUNE.maxPuddles) return; const free = PUDDLES.filter((p) => !used.some((m) => Math.hypot(m[2] - p[0], m[3] - p[1]) < 0.5)); const p = pick(free); g.ms.push([++H.mSeq, 'lait', p[0], p[1], -1, T]); }
  else if (st.id === 'micro') { const i = Number.isInteger(extra) && extra >= 0 && extra < ANNOUNCES.length ? extra : rndi(0, ANNOUNCES.length - 1); hostEvent(['an', i]); }
  else if (st.id === 'microondes') { if (has('smoke')) return; g.ms.push([++H.mSeq, 'smoke', st.x, st.z, -1, T]); hostEvent(['boom']); }
  else if (st.id === 'congel') { if (has('melt')) return; g.ms.push([++H.mSeq, 'melt', st.x, st.z, -1, T]); takeProducts(9, 4); }
  else if (st.id === 'four' && sub === 'four') { if (g.ov[0] === 3) return; g.ov = [3, 0]; if (!has('burn')) g.ms.push([++H.mSeq, 'burn', st.x, st.z, -1, T]); hostEvent(['burn']); }
  else if (!['sieste', 'echant', 'arcade', 'wc', 'fort', 'cour'].includes(st.id)) return;
  hostProd(-dmg * kG()); H.stats[pid][1]++; hostSuspicion(pid, st.x, st.z, place);
}
// ---------- stock ----------
function takeProducts(si, n) { const g = H.g; let took = 0; for (let i = 0; i < n; i++) { const b = randomBit(g.st[si], true, SHELVES[si].n); if (b < 0) break; g.st[si] = (g.st[si] & ~(1 << b)) >>> 0; took++; } return took; }
function nearestShelf(x, z) { let best = -1, bd = 3.6; SHELVES.forEach((S2, si) => { if (si === SI_VITRINE) return; for (let k = 0; k < S2.n; k += 3) { const p = slotPos(si, k); const d = Math.hypot(p[0] - x, p[2] - z); if (d < bd) { bd = d; best = si; } } }); return best; }
function placeProduct(si) { const g = H.g; const b = randomBit(g.st[si], false, SHELVES[si].n); if (b < 0) return false; g.st[si] = (g.st[si] | (1 << b)) >>> 0; hostProd(TUNE.placeGain * kE()); return true; }
// ---------- objets physiques ----------
function hostSpawnItem(o) {
  const it = { id: ++H.iSeq, k: o.k, cat: o.cat, v: o.v | 0, n: o.n | 0, x: o.x, y: o.y, z: o.z, vx: o.vx || 0, vy: o.vy || 0, vz: o.vz || 0, ry: rnd(0, 6.28), vr: o.tumble ? rnd(-9, 9) : rnd(-2, 2), s: 2, tumble: !!o.tumble, own: o.own, age: 0, rest: false };
  it.hh = itemHH(it, false); H.items.push(it);
  while (H.items.length > ITEM_MAX) { const old = H.items.find((x) => x.rest) || H.items[0]; H.items = H.items.filter((x) => x !== old); }
  return it;
}
function hostItems(dt) {
  for (const it of H.items) {
    if (it.rest) continue; it.age += dt; itemStep(it, dt);
    if (it.bonked || Math.hypot(it.vx, it.vz) < 3.5 || it.y < 0.25 || it.y > 1.95) continue;
    const hit = (id, x, z) => Math.hypot(x - it.x, z - it.z) < 0.42 && !(id === it.own && it.age < 0.6);
    for (const id of hostAliveIds()) { const p = hostPos(id); if (p && hit(id, p[0], p[1])) { it.bonked = true; it.vx *= -0.3; it.vz *= -0.3; hostEvent(['bk', id, it.own]); break; } }
    if (it.bonked) continue;
    for (const c of H.cust) if (c.flag !== 3 && hit(c.id, c.x, c.z)) { it.bonked = true; it.vx *= -0.3; it.vz *= -0.3; hostEvent(['bk', c.id, it.own]); custLeave(c, 3); hostSuspicion(it.own, c.x, c.z, 'un client bombardé', 1.2); break; }
  }
}
function hostColdRoom(dt) {
  const g = H.g; if (opGet(g.op, OPEN_COLD)) g.fo += dt; else g.fo = 0;
  if (g.fo > 15) { H.spoilT += dt; if (H.spoilT > 8) { H.spoilT = 0; takeProducts(pick([8, 9]), 1); } if (g.fo - dt <= 15) hostEvent(['cold']); }
}
function hostDoorChars() { const out = []; for (const id of hostAliveIds()) { const p = hostPos(id); if (p) out.push([id, p[0], p[1]]); } for (const c of H.cust || []) out.push([c.id, c.x, c.z]); return out; }
function hostBotDoors(dt) {
  const g = H.g;
  for (const b of H.bots) {
    if (!hostAlive(b.id) || b.anim !== 1) continue;
    for (const o of OPEN) { if (!o.dyn || opGet(g.op, o.i)) continue; if (boxDist(o.dyn, b.x, b.z) < 0.95) { opSet(g.op, o.i, true); const role = H.roles[b.id]; H.bdo[o.i] = { by: b.id, p: o.cold ? (role === 'gla' ? 0 : 0.95) : role === 'gla' ? 0.3 : 0.75 }; } }
  }
  H.bdoT = (H.bdoT || 0) - dt; if (H.bdoT > 0) return; H.bdoT = 0.5;
  const chars = hostDoorChars();
  for (const k in H.bdo) {
    const o = OPEN[k], r = H.bdo[k]; if (!opGet(g.op, o.i)) { delete H.bdo[k]; continue; }
    const opener = chars.find((c) => c[0] === r.by); if (opener && boxDist(o.dyn, opener[1], opener[2]) < 2.2) continue;
    if (chars.some((c) => boxDist(o.dyn, c[1], c[2]) < 1.4)) continue;
    if (Math.random() < r.p) { opSet(g.op, o.i, false); if (o.cold) g.fo = 0; } delete H.bdo[k];
  }
}
// ---------- clients, téléphone, four ----------
function custLeave(c, flag) { c.flag = flag; c.st = 'go'; c.next = 'exit'; c.path = navPath(c.x, c.z, CUST_DOOR[0], CUST_DOOR[1]) || [CUST_DOOR]; for (const q of H.q) { const i = q.indexOf(c.id); if (i >= 0) q.splice(i, 1); } if (flag === 3) hostProd(-1.2); }
function hostServe(k) { const id = H.q[k][0]; if (!id) return false; const c = H.cust.find((c) => c.id === id); H.q[k].shift(); if (c) custLeave(c, 4); return true; }
function custGo(c, x, z, next) { c.st = 'go'; c.next = next; c.tx = x; c.tz = z; c.path = navPath(c.x, c.z, x, z) || [[x, z]]; }
function hostCustomers(dt) {
  const g = H.g; H.custT -= dt;
  const workers = hostAliveIds().filter((id) => H.roles[id] !== 'mgr').length; const max = Math.min(TUNE.maxCust, 2 + Math.ceil(workers * 0.9));
  if (H.custT <= 0 && H.cust.length < max) {
    H.custT = TUNE.custEvery * rnd(0.7, 1.3);
    const c = { id: 'c' + ++H.cSeq, x: CUST_DOOR[0] + rnd(-1, 1), z: CUST_DOOR[1], ry: Math.PI, anim: 1, flag: 0, browse: rndi(1, 3), asked: false, pat: 0, wait: 0 };
    H.cust.push(c); const p = pick(BROWSE); custGo(c, p[0], p[1], 'browse');
  }
  for (const c of H.cust) {
    if (c.st === 'go') {
      if (botMove(c, dt, 2.6)) {
        if (c.next === 'exit') { c.gone = true; continue; }
        if (c.next === 'browse') { c.st = 'browse'; c.wait = rnd(2, 5); c.anim = 0; }
        else if (c.next === 'queue') { c.st = 'queue'; c.anim = 0; c.flag = 2; c.ry = Math.PI; }
      }
    } else if (c.st === 'browse') {
      c.wait -= dt; c.anim = 0;
      if (c.wait <= 0) {
        c.browse--; { const si = nearestShelf(c.x, c.z); if (si >= 0 && !takeProducts(si, rndi(1, 2))) hostProd(-0.3); }
        if (!c.asked && Math.random() < 0.3) { c.asked = true; c.st = 'help'; c.flag = 1; c.topic = rndi(0, QUIZ.length - 1); c.pat = TUNE.patienceH; }
        else if (c.browse > 0) { const p = pick(BROWSE); custGo(c, p[0], p[1], 'browse'); }
        else { const ks = [0, 1, 2].filter((k) => H.q[k].length < 4); if (!ks.length) { c.wait = 3; c.browse = 1; continue; } const mn = Math.min(...ks.map((k) => H.q[k].length)); const k = pick(ks.filter((k) => H.q[k].length === mn)); H.q[k].push(c.id); c.k = k; c.pat = TUNE.patienceQ; const sp = queueSpot(k, H.q[k].length - 1); custGo(c, sp[0], sp[1], 'queue'); }
      }
    } else if (c.st === 'help') { c.anim = 0; c.pat -= dt; if (c.pat <= 0) custLeave(c, 3); }
    else if (c.st === 'queue') {
      c.pat -= dt; if (c.pat <= 0) { custLeave(c, 3); continue; }
      const i = H.q[c.k].indexOf(c.id); const sp = queueSpot(c.k, Math.max(0, i)); const d = Math.hypot(sp[0] - c.x, sp[1] - c.z);
      if (d > 0.08) { const s = Math.min(d, 2.2 * dt); c.x += ((sp[0] - c.x) / d) * s; c.z += ((sp[1] - c.z) / d) * s; c.anim = 1; } else c.anim = 0; c.ry = Math.PI;
    }
    if (c.st === 'go' && c.next === 'queue') c.pat -= dt * 0.3;
  }
  H.cust = H.cust.filter((c) => !c.gone);
  for (let k = 0; k < 3; k++) H.q[k] = H.q[k].filter((id) => H.cust.some((c) => c.id === id));
  g.qs = H.q.map((q) => q.filter((id) => H.cust.find((c) => c.id === id)?.st === 'queue').length);
}
function hostStoreEvents(dt) {
  const g = H.g;
  if (g.tel > 0) { g.tel -= dt; if (g.tel <= 0) { g.tel = 0; H.telNext = rnd(35, 70); hostProd(-2); hostEvent(['telm']); } }
  else { H.telNext -= dt; if (H.telNext <= 0) { g.tel = 22; hostEvent(['tel']); } }
  if (g.ov[0] === 1) { g.ov[1] -= dt; if (g.ov[1] <= 0) { g.ov = [2, 20]; hostEvent(['pain']); } }
  else if (g.ov[0] === 2) { g.ov[1] -= dt; if (g.ov[1] <= 0) { g.ov = [3, 0]; if (!g.ms.some((m) => m[1] === 'burn')) g.ms.push([++H.mSeq, 'burn', ST.four.x, ST.four.z, -1, Math.ceil(g.t)]); hostProd(-3); hostEvent(['burn']); } }
  if (g.ms.some((m) => m[1] === 'melt')) { H.meltT = (H.meltT || 0) + dt; if (H.meltT > 6) { H.meltT = 0; takeProducts(9, 1); } }
}
function hostSuspicion(pid, sx, sz, place, wgt = 1) {
  // le directeur bot n'apprend vraiment quelque chose que s'il était assez près pour voir la scène
  const g = H.g, mp = hostPos(g.mg); const seen = mp && Math.hypot(mp[0] - sx, mp[1] - sz) < 12 && zoneAt(mp[0], mp[1]) === zoneAt(sx, sz);
  if (!seen && Math.random() < 0.5) return;
  for (const id of hostAliveIds()) {
    if (id === g.mg) continue; const p = hostPos(id); if (!p) continue; const d = Math.hypot(p[0] - sx, p[1] - sz);
    let add = seen ? (d < 4 ? 1.2 : d < 7 ? 0.6 : 0) : d < 6 ? 0.35 : 0; if (seen && id === pid) add += 1.2;
    if (add) { H.susp[id] = (H.susp[id] || 0) + add * wgt * rnd(0.7, 1.3); H.seen[id] = place; }
  }
}
function hostFire(t, how) {
  const g = H.g; if (g.fd.includes(t)) return; g.fd.push(t); g.fr[t] = H.roles[t]; g.q = TUNE.quota; hostEvent(['fi', t, g.fr[t], how]); delete H.susp[t];
  const b = H.bots.find((b) => b.id === t); if (b) { b.anim = 0; b.carry = 0; } hostCheckWin();
}
function hostMgrFired() {
  const g = H.g, old = g.mg; g.fd.push(old); g.fr[old] = 'mgr';
  const c = hostAliveIds().filter((id) => H.roles[id] === 'emp'); if (!c.length) return hostEnd('gla', 'nomgr');
  const nw = pick(c); H.roles[nw] = 'mgr'; g.mg = nw; g.mh.push(nw); g.q = TUNE.quota; hostEvent(['mf', old, nw]);
  const b = H.bots.find((b) => b.id === nw); if (b) { b.task = null; b.carry = 0; b.path = null; }
  hostCheckWin();
}
function hostQuit(id) {
  const g = H.g; if (g.qt.includes(id) || g.fd.includes(id)) return; g.qt.push(id); hostEvent(['qt', id]);
  if (id === g.mg) { const c = hostAliveIds().filter((x) => H.roles[x] === 'emp'); if (!c.length) return hostEnd('gla', 'nomgr'); const nw = pick(c); H.roles[nw] = 'mgr'; g.mg = nw; g.mh.push(nw); g.q = TUNE.quota; hostEvent(['nm', nw]); const b = H.bots.find((b) => b.id === nw); if (b) { b.task = null; b.carry = 0; } }
  hostCheckWin();
}
function hostCheckWin() {
  const g = H.g; if (g.ph !== 'play' && g.ph !== 'meet') return;
  const alive = hostAliveIds(); const ng = alive.filter((id) => H.roles[id] === 'gla').length; const no = alive.length - ng;
  if (ng === 0) return hostEnd('emp', 'all');
  if (ng >= no) return hostEnd('gla', 'parity');
  if (g.pr >= 99.95) return hostEnd('emp', 'prod');
  if (g.pr <= 0.05) return hostEnd('gla', 'prod0');
  if (g.t <= 0) return hostEnd(g.pr >= 50 ? 'emp' : 'gla', 'time');
}
function hostEnd(w, r) { const g = H.g; g.ph = 'end'; g.mt = null; g.en = { w, r, ro: H.orig, st: H.stats }; hostEvent(['en', w]); hostPublish(); }

// ---------- réunions ----------
function hostMeeting() {
  const g = H.g, alive = hostAliveIds();
  g.ph = 'meet'; g.mt = { id: uid(4), s: 'talk', t: TUNE.meetTalk, seats: alive, v: {} }; H.mtEl = 0; hostEvent(['mt', g.mg]);
  for (const b of H.bots) { const i = alive.indexOf(b.id); if (i < 0) continue; const s = SEATS[i % SEATS.length]; Object.assign(b, { x: s[0], z: s[1], ry: Math.atan2(TABLE_C[0] - s[0], TABLE_C[1] - s[1]), anim: 3, path: null, task: null, carry: 0, fireTarget: null }); }
  H.botPlan = []; H.usedLines = new Set();
  for (const b of H.bots) {
    if (!hostAlive(b.id)) continue;
    if (H.roles[b.id] === 'mgr') { H.botPlan.push({ t: rnd(2, 5), id: b.id, say: pick(["Bon. Quelqu'un ne fait pas son boulot ici.", "La productivité dégringole, je veux des noms !", 'Je vous écoute. Et pas de bobards.']) }); continue; }
    for (let k = rndi(1, 2); k > 0; k--) H.botPlan.push({ t: rnd(4, 32), id: b.id, line: true });
    H.botPlan.push({ t: rnd(10, 38), id: b.id, vote: true });
  }
}
const nameOf = (id) => (H.g?.pl || []).find((p) => p[0] === id)?.[1] || '???';
function topSuspect(exclude) { let best = null, bs = 0; for (const id of hostAliveIds()) { if (id === H.g.mg || exclude.includes(id)) continue; const s = H.susp[id] || 0; if (s > bs) { bs = s; best = id; } } return [best, bs]; }
function botLine(b) {
  const role = H.roles[b.id];
  if (role === 'gla') {
    const emps = hostAliveIds().filter((id) => id !== b.id && id !== H.g.mg && H.orig[id] !== 'gla'); const x = emps.length ? nameOf(pick(emps)) : 'quelqu’un';
    return pick(["C'était pas moi, j'étais en réserve !", `${x} n'a rien fait depuis 5 minutes 👀`, `Je remplissais le rayon ${pick(SHELF_NAMES)}, demandez à qui vous voulez.`, 'Pourquoi tout le monde me regarde ?', `Moi je trouve ${x} bizarre aujourd'hui.`]);
  }
  const [s, sc] = topSuspect([b.id]);
  if (s && sc >= 2) return pick([`J'ai vu ${nameOf(s)} traîner près de : ${H.seen[s] || 'la réserve'}…`, `${nameOf(s)}, c'est louche. Je dis ça, je dis rien.`, `Moi je vote ${nameOf(s)}.`]);
  return pick(["J'étais en caisse tout le temps !", "Aucune idée, j'étais au quai.", 'On devrait surveiller la chambre froide…', 'Franchement, moi je bosse.', "Quelqu'un a vu qui a renversé le lait ?"]);
}
function botVote(b) {
  const g = H.g, seats = g.mt.seats.filter((id) => id !== b.id && id !== g.mg && hostAlive(id));
  if (H.roles[b.id] === 'gla') {
    if (Math.random() < 0.2) return '-';
    const cnt = {}; for (const v of Object.values(g.mt.v)) if (v !== '-') cnt[v] = (cnt[v] || 0) + 1;
    const cands = seats.filter((id) => H.orig[id] !== 'gla'); const band = cands.filter((id) => cnt[id]).sort((a, c) => cnt[c] - cnt[a])[0];
    return band || (cands.length ? pick(cands) : '-');
  }
  const [s, sc] = topSuspect([b.id]); return s && sc >= 2 && Math.random() < 0.85 ? s : '-';
}
function tally() { const cnt = {}; for (const v of Object.values(H.g.mt.v)) if (v !== '-') cnt[v] = (cnt[v] || 0) + 1; return cnt; }
function botDecide() {
  const cnt = tally(); const arr = Object.entries(cnt).sort((a, b) => b[1] - a[1]);
  if (arr.length && arr[0][1] >= 2 && (!arr[1] || arr[1][1] < arr[0][1])) return arr[0][0];
  if (H.g.q < 60) { const [s] = topSuspect([]); if (s) return s; }
  return '-';
}
function hostMeetUpdate(dt) {
  const g = H.g, mt = g.mt; if (!mt) return; mt.t -= dt; H.mtEl += dt;
  if (mt.s === 'talk') for (const id of mt.seats) {
    if (isBotId(id) || id === g.mg || !hostAlive(id)) continue; const p = id === NET.me ? NET.pres : H.peerMap.get(id); const vt = p?.vt;
    if (Array.isArray(vt) && vt[0] === mt.id) { const t = String(vt[1]); if (t === '-' || (mt.seats.includes(t) && t !== id && t !== g.mg)) mt.v[id] = t; }
  }
  for (const ev of H.botPlan) {
    if (ev.done || H.mtEl < ev.t) continue; ev.done = true; const b = H.bots.find((x) => x.id === ev.id); if (!b || !hostAlive(b.id)) continue;
    if (ev.say) chatSay(b.id, ev.say); else if (ev.line) { let l = botLine(b); for (let k = 0; k < 4 && H.usedLines.has(l); k++) l = botLine(b); if (!H.usedLines.has(l)) { H.usedLines.add(l); chatSay(b.id, l); } } else if (ev.vote && mt.s === 'talk') mt.v[b.id] = botVote(b);
  }
  const voters = mt.seats.filter((id) => id !== g.mg && hostAlive(id)); const all = voters.every((id) => mt.v[id] !== undefined);
  if (mt.s === 'talk' && (mt.t <= 0 || (all && H.mtEl > 8))) { for (const id of voters) if (isBotId(id) && mt.v[id] === undefined) mt.v[id] = botVote(H.bots.find((b) => b.id === id)); mt.s = 'dec'; mt.t = TUNE.meetDec; H.decT = rnd(2, 4); }
  else if (mt.s === 'dec') { if (isBotId(g.mg)) { H.decT -= dt; if (H.decT <= 0) hostDecide(botDecide()); } else if (mt.t <= 0) hostDecide('-'); }
}
function hostDecide(t) {
  const g = H.g; if (g.ph !== 'meet') return; let fired = false;
  if (t && t !== '-' && hostAlive(t) && t !== g.mg) { hostFire(t, 'meet'); fired = true; }
  if (g.ph === 'meet') g.ph = 'play'; g.mt = null; g.mcd = TUNE.meetCd; if (!fired && g.ph === 'play') hostEvent(['nf']);
  for (const b of H.bots) { b.anim = 0; b.wait = rnd(0.5, 2); b.path = null; }
}

// ---------- bots ----------
function hostBots(dt) {
  for (const b of H.bots) {
    if (!hostAlive(b.id)) continue;
    const role = H.roles[b.id];
    if (role === 'mgr') botManager(b, dt); else botWorker(b, dt, role);
  }
}
function botMove(b, dt, speed) {
  if (!b.path || !b.path.length) return true;
  const [tx, tz] = b.path[0]; const dx = tx - b.x, dz = tz - b.z; const d = Math.hypot(dx, dz); const step = speed * dt;
  if (d <= step) { b.x = tx; b.z = tz; b.path.shift(); } else { b.x += (dx / d) * step; b.z += (dz / d) * step; }
  if (d > 0.01) b.ry = angLerp(b.ry, Math.atan2(dx, dz), Math.min(1, dt * 10));
  b.anim = 1; return !b.path.length;
}
function botWorker(b, dt, role) {
  const g = H.g, W = gameW(g);
  if (b.wait > 0) { b.wait -= dt; b.anim = 0; return; }
  if (!b.task) {
    const mess = g.ms.length && role === 'emp' && Math.random() < 0.45 ? g.ms.reduce((a, m) => (!a || Math.hypot(m[2] - b.x, m[3] - b.z) < Math.hypot(a[2] - b.x, a[3] - b.z) ? m : a), null) : null;
    const helpC = role === 'emp' && Math.random() < 0.3 ? H.cust.find((c) => c.flag === 1 && !H.bots.some((o) => o.task?.cid === c.id)) : null;
    const qk = [0, 1, 2].find((k) => (g.qs[k] || 0) >= 2 && !H.bots.some((o) => o.task?.steps?.[0]?.st === 'caisse' + k));
    const floorIt = role === 'emp' && Math.random() < 0.4 ? H.items.filter((it) => it.rest && itemOnFloor(it) && !H.bots.some((o) => o.task?.iid === it.id)).sort((p, q) => Math.hypot(p.x - b.x, p.z - b.z) - Math.hypot(q.x - b.x, q.z - b.z))[0] : null;
    if (role === 'emp' && g.fo > 6 && Math.random() < 0.5 && !H.bots.some((o) => o.task?.type === 'cd')) b.task = { type: 'cd', steps: [{ x: -2.5, z: -5.25, hold: 0.6 }], step: 0 };
    else if (floorIt) b.task = { type: 'it', iid: floorIt.id, steps: [{ x: floorIt.x, z: floorIt.z, hold: 0.7 }], step: 0 };
    else if (helpC) b.task = { type: 'h', cid: helpC.id, steps: [{ x: helpC.x + 0.7, z: helpC.z, hold: 3 }], step: 0 };
    else if (qk !== undefined && role !== 'gla' && Math.random() < 0.5) b.task = mkTask('w', [{ st: 'caisse' + qk }], 'caisse', '🧾');
    else if (g.tel > 4 && role === 'emp' && Math.random() < 0.3 && !H.bots.some((o) => o.task?.type === 'tel')) b.task = { type: 'tel', steps: [{ st: 'tel' }], step: 0 };
    else if (role === 'emp' && (g.ov[0] === 2 || (g.ov[0] === 0 && Math.random() < 0.08)) && !H.bots.some((o) => o.task?.type === 'ov')) b.task = { type: 'ov', steps: [{ st: 'four' }], step: 0 };
    else if (mess) b.task = { type: 'c', mid: mess[0], steps: [{ x: mess[2], z: mess[3], hold: MESS[mess[1]].hold }], step: 0 };
    else { b.task = role === 'gla' && Math.random() < 0.5 ? genWork(W, new Set()) : genTaskFor(role, W, []); if (!b.task) { b.wait = 1; return; } }
    b.path = null; b.work = 0;
  }
  const t = b.task, step = t.steps[t.step], st = step.st ? ST[step.st] : null; const tx = st ? st.x : step.x, tz = st ? st.z : step.z;
  if (t.type === 'c' && !g.ms.some((m) => m[0] === t.mid)) { b.task = null; return; }
  if (t.type === 'it' && !H.items.some((it) => it.id === t.iid)) { b.task = null; return; }
  if (t.type === 'cd' && !opGet(g.op, OPEN_COLD)) { b.task = null; return; }
  if (t.type === 'h' && !H.cust.some((c) => c.id === t.cid && c.flag === 1)) { b.task = null; return; }
  if (t.type === 'tel' && !(g.tel > 0)) { b.task = null; return; }
  if (t.type === 'ov' && g.ov[0] !== 0 && g.ov[0] !== 2) { b.task = null; return; }
  if (!taskValid(t, W)) { b.task = null; return; }
  if (Math.hypot(b.x - tx, b.z - tz) > 0.5) { if (!b.path) b.path = navPath(b.x, b.z, tx, tz) || [[tx, tz]]; botMove(b, dt, TUNE.bSpeed); b.work = 0; return; }
  b.path = null;
  if (t.type === 's' && b.work === 0) {
    const mp = hostPos(g.mg);
    if (mp && Math.hypot(mp[0] - b.x, mp[1] - b.z) < 7 && (b.cover || 0) < 3) { b.cover = (b.cover || 0) + 1; b.task = genWork(W, new Set()) || null; return; }
  }
  if (st && st.id === 'sieste') b.ry = Math.PI; else if (st && st.seat !== undefined && t.type === 's') { b.ry = st.seat; b.x += (st.x - b.x) * 0.5; b.z += (st.z - b.z) * 0.5; } // assis : sur la cuvette, sur le banc
  if (st && st.place && t.type === 'w') {
    b.anim = 2; b.placeT = (b.placeT || 0.45) - dt; b.ry = st.shelf === 9 ? (b.x < 5 ? Math.PI / 2 : -Math.PI / 2) : SHELVES[st.shelf].kind === 'freezer' ? 0 : SHELVES[st.shelf].side > 0 ? -Math.PI / 2 : Math.PI / 2;
    if (b.placeT > 0) return; b.placeT = 0.45; b.placed = (b.placed || 0) + 1;
    const ok = placeProduct(st.shelf);
    if (!ok || b.placed >= BOX_SIZE) { if (ok || b.placed > 1) H.stats[b.id][0]++; b.placed = 0; b.carry = 0; b.task = null; b.wait = rnd(0.4, 2); b.anim = 0; }
    return;
  }
  b.anim = st && st.id === 'sieste' ? 4 : st && st.id === 'arcade' ? 5 : st && st.seat !== undefined ? 3 : 2; b.work += dt;
  const hold = (st ? stepHold(step) : step.hold) * (st?.mg ? 1.4 : 1);
  if (b.work < hold) return;
  b.work = 0;
  if (st && st.kind === 'pk') { b.carry = CARRY[st.gives]; t.step++; return; }
  if (step.door !== undefined) { if (!opGet(g.op, step.door)) { opSet(g.op, step.door, true); H.stats[b.id][1]++; hostSuspicion(b.id, b.x, b.z, 'la chambre froide'); } }
  else if (t.type === 'cd') { opSet(g.op, OPEN_COLD, false); g.fo = 0; }
  else if (t.type === 'it') { const it = H.items.find((x) => x.id === t.iid); if (it) { H.items = H.items.filter((x) => x !== it); if (it.k === 0 && it.cat < 10) placeProduct(it.cat); else if (it.k === 0) { const b = randomBit(g.st[SI_VITRINE], false, SHELVES[SI_VITRINE].n); if (b >= 0) g.st[SI_VITRINE] = (g.st[SI_VITRINE] | (1 << b)) >>> 0; } else if (it.k === 1) for (let k = 0; k < it.n; k++) placeProduct(it.cat); H.stats[b.id][0]++; } }
  else if (t.type === 'c') hostApply(b.id, [0, 'cl', t.mid]);
  else if (t.type === 'h') hostApply(b.id, [0, 'hp', t.cid, Math.random() < 0.85 ? 1 : 0]);
  else if (t.type === 'tel') hostApply(b.id, [0, 'tel']);
  else if (t.type === 'ov') hostApply(b.id, [0, 'ov']);
  else hostApply(b.id, [0, 'tk', st.id, t.type, step.sab || 0]);
  if (st && st.needs && !step.sab) b.carry = 0;
  if (t.type === 'h') { const c = H.cust.find((c) => c.id === t.cid); if (c) b.ry = Math.atan2(c.x - b.x, c.z - b.z); }
  b.task = null; b.wait = t.type === 's' ? rnd(3, 8) : rnd(0.4, 2.2); b.anim = 0; if (t.type === 's') b.cover = 0;
}
function botManager(b, dt) {
  const g = H.g;
  if (!b.fireTarget) {
    const [best, bs] = topSuspect([b.id]);
    if (best && ((bs >= 5 && g.q < TUNE.quota - 30) || bs >= 9 || (g.q < 35 && bs > 0))) b.fireTarget = best;
    else if (g.q < 25) { const c = hostAliveIds().filter((id) => id !== b.id); if (c.length) b.fireTarget = pick(c); }
  }
  if (b.fireTarget) {
    if (!hostAlive(b.fireTarget)) { b.fireTarget = null; return; }
    const tp = hostPos(b.fireTarget); if (!tp) { b.fireTarget = null; return; }
    if (Math.hypot(tp[0] - b.x, tp[1] - b.z) < 2.2) { hostApply(b.id, [0, 'fi', b.fireTarget]); b.fireTarget = null; b.wait = 2; b.anim = 0; b.path = null; return; }
    b.repath = (b.repath || 0) - dt; if (!b.path || !b.path.length || b.repath <= 0) { b.path = navPath(b.x, b.z, tp[0], tp[1]) || [[tp[0], tp[1]]]; b.repath = 0.7; }
    botMove(b, dt, TUNE.bSpeed * 1.15); return;
  }
  if (b.wait > 0) { b.wait -= dt; b.anim = 0; return; }
  if (!b.path || !b.path.length) { const p = pick(PATROL); b.path = navPath(b.x, b.z, p[0], p[1]); b.wait = rnd(0.8, 2.5); return; }
  botMove(b, dt, TUNE.bSpeed);
}

// ---------- simulation rapide (équilibrage, debug) ----------
DBG.sim = function (nBots = 6, maxT = 900, dt = 0.1) {
  const saveMe = NET.me; NET.me = '__none__'; H.peerMap = new Map(); H.botsCfg = []; H.pref = ''; for (let i = 0; i < nBots; i++) hostAddBot();
  hostStart(); let tt = 0; const fires = [];
  let lastEv = H.evSeq;
  while (H.g.ph !== 'end' && tt < maxT) { hostUpdate(dt); tt += dt; for (const e of H.g.ev) if (e[0] > lastEv) { lastEv = e[0]; if (e[1] === 'fi' || e[1] === 'mf') fires.push([Math.round(tt), ...e.slice(1)]); } }
  const res = { t: Math.round(tt), w: H.g.en?.w, r: H.g.en?.r, pr: Math.round(H.g.pr), fires, roles: { ...H.orig }, stats: H.stats };
  NET.me = saveMe; H.botsCfg = []; hostToLobby(); return res;
};
