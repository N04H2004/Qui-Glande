// ======================= RÉSEAU : capacité "room" + chiffrement des rôles =======================
const b64 = (buf) => { const u = buf instanceof Uint8Array ? buf : new Uint8Array(buf); let s = ''; for (let i = 0; i < u.length; i++) s += String.fromCharCode(u[i]); return btoa(s); };
const unb64 = (s) => { const b = atob(s); const u = new Uint8Array(b.length); for (let i = 0; i < b.length; i++) u[i] = b.charCodeAt(i); return u; };
// Chaque joueur a une paire de clés ECDH ; l'hôte chiffre le rôle secret de chacun, les joueurs chiffrent leurs actions pour l'hôte.
const CRY = {
  ok: !!(window.crypto && crypto.subtle), kp: null, pub: '', keys: new Map(),
  async init() { if (!this.ok) return; try { this.kp = await crypto.subtle.generateKey({ name: 'ECDH', namedCurve: 'P-256' }, false, ['deriveKey']); this.pub = b64(await crypto.subtle.exportKey('raw', this.kp.publicKey)); } catch (e) { this.ok = false; } },
  key(pub) {
    let p = this.keys.get(pub);
    if (!p) { p = (async () => { const k = await crypto.subtle.importKey('raw', unb64(pub), { name: 'ECDH', namedCurve: 'P-256' }, false, []); return crypto.subtle.deriveKey({ name: 'ECDH', public: k }, this.kp.privateKey, { name: 'AES-GCM', length: 128 }, false, ['encrypt', 'decrypt']); })(); this.keys.set(pub, p); }
    return p;
  },
  async enc(pub, obj) {
    const s = JSON.stringify(obj); if (!this.ok || !this.kp || !pub) return 'P' + s;
    try { const key = await this.key(pub); const iv = crypto.getRandomValues(new Uint8Array(12)); const ct = new Uint8Array(await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(s))); const out = new Uint8Array(12 + ct.length); out.set(iv); out.set(ct, 12); return 'E' + b64(out); }
    catch (e) { return 'P' + s; }
  },
  async dec(pub, str) {
    if (!str) return null; if (str[0] === 'P') return JSON.parse(str.slice(1));
    if (!this.ok || !this.kp || !pub) return null;
    const key = await this.key(pub); const buf = unb64(str.slice(1));
    const pt = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: buf.slice(0, 12) }, key, buf.slice(12)); return JSON.parse(new TextDecoder().decode(pt));
  },
};

const NET = { lobby: null, room: null, avail: false, checked: false, solo: false, pres: {}, me: null, warned: 0 };
// la passerelle Claude (window.claude) peut arriver tard sur une page partagée : on patiente et on réessaie
// ---------- version autonome (hors Claude) : salons en pair-à-pair via PeerJS ----------
// L'hôte du salon devient le « hub » (identifiant = code du salon) ; les autres s'y connectent et il relaie les présences.
const STANDALONE = !!window.__QG_STANDALONE;
const PJ_PREFIX = 'quiglande-v1-';
// Serveurs relais (TURN) : indispensables quand les deux joueurs sont sur des réseaux qui bloquent la connexion directe (4G, wifi d'école ou d'entreprise…).
// Colle ici les identifiants d'un service TURN (ex. compte gratuit Metered « Open Relay »), sous la forme :
// { urls: ['turn:global.relay.metered.ca:80', 'turn:global.relay.metered.ca:443', 'turns:global.relay.metered.ca:443?transport=tcp'], username: '...', credential: '...' }
const PJ_TURN = [];
const PJ_CFG = { debug: 0, config: { iceServers: [{ urls: ['stun:stun.l.google.com:19302', 'stun:stun1.l.google.com:19302'] }, { urls: 'stun:stun.cloudflare.com:3478' }, ...PJ_TURN] } };
// le serveur de mise en relation peut couper la connexion (veille, réseau qui saute) : sans reconnexion, le salon devient introuvable pour les nouveaux venus
const pjKeep = (p) => p.on('disconnected', () => { setTimeout(() => { try { if (!p.destroyed && p.disconnected) p.reconnect(); } catch (e) {} }, 800); });
function makePeerLobby() { return { join: (name, opt) => peerJoin(name, opt), peers: () => [], connected: () => true, onConnection: (cb) => { setTimeout(() => cb(true), 0); return () => {}; } }; }
function peerJoin(name, opt = {}) {
  return new Promise((resolve, reject) => {
    const R = { me: null, hub: false, pres: {}, others: new Map(), conns: new Map(), hubConn: null, snap: null, peer: null, lastHub: 0, dirty: false, lastSent: 0, ft: null, done: false };
    const hubId = PJ_PREFIX + name;
    const snapshot = () => {
      if (!R.snap) { const arr = R.me ? [Object.freeze({ peer: R.me, by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze({ ...R.pres }), updatedAt: Date.now() })] : []; for (const [id, o] of R.others) arr.push(Object.freeze({ peer: id, by: null, isMe: false, sameTab: false, kind: 'viewer', guest: false, presence: o.pres, updatedAt: o.t })); R.snap = Object.freeze(arr); }
      return R.snap;
    };
    const setOther = (id, pres) => { const o = R.others.get(id); R.others.set(id, { pres: Object.freeze(pres && typeof pres === 'object' ? pres : {}), t: Date.now(), seen: Date.now() }); R.snap = null; };
    const dropOther = (id) => { if (R.others.delete(id)) R.snap = null; };
    const send = (c, m) => { try { if (c && c.open) c.send(m); } catch (e) {} };
    function flush(force) {
      const now = performance.now();
      if (!force && now - R.lastSent < 50) { if (!R.ft) R.ft = setTimeout(() => { R.ft = null; flush(); }, 55); return; }
      if (!R.dirty && !force) return; R.lastSent = now; R.dirty = false; const msg = { t: 'p', id: R.me, p: R.pres };
      if (R.hub) for (const c of R.conns.values()) send(c, msg); else send(R.hubConn, msg);
    }
    const api = {
      name,
      presence: async (patch) => { for (const k in patch) { if (patch[k] === null) delete R.pres[k]; else R.pres[k] = patch[k]; } R.snap = null; R.dirty = true; flush(); },
      peers: snapshot,
      connected: () => R.hub || !!(R.hubConn && R.hubConn.open),
      noHub: () => !!R.noHub,
      failReason: () => R.fail || (R.noHub ? 'nohub' : ''), // 'nohub' : aucun salon avec ce code · 'p2p' : salon trouvé mais connexion directe impossible entre les deux réseaux
      leave: async () => { clearInterval(R.iv); clearTimeout(R.ft); try { R.peer && R.peer.destroy(); } catch (e) {} R.others.clear(); R.snap = null; },
    };
    R.iv = setInterval(() => {
      const now = Date.now();
      if (R.hub) { for (const [id, o] of R.others) if (now - o.seen > 12000) { dropOther(id); const c = R.conns.get(id); R.conns.delete(id); try { c && c.close(); } catch (e) {} for (const c2 of R.conns.values()) send(c2, { t: 'x', id }); } for (const c of R.conns.values()) send(c, { t: 'k' }); }
      else if (R.hubConn) { send(R.hubConn, { t: 'k' }); if (R.lastHub && now - R.lastHub > 12000 && R.others.size) { R.others.clear(); R.snap = null; } }
    }, 1500);
    function hubHandle(conn) {
      conn.on('open', () => { R.conns.set(conn.peer, conn); send(conn, { t: 'all', list: [[R.me, R.pres], ...[...R.others].map(([id, o]) => [id, o.pres])] }); });
      conn.on('data', (m) => {
        if (!m || typeof m !== 'object') return; const o = R.others.get(conn.peer); if (o) o.seen = Date.now();
        if (m.t === 'p') { setOther(conn.peer, m.p); const out = { t: 'p', id: conn.peer, p: m.p }; for (const [id, c] of R.conns) if (id !== conn.peer) send(c, out); }
      });
      const gone = () => { if (!R.conns.has(conn.peer) && !R.others.has(conn.peer)) return; R.conns.delete(conn.peer); dropOther(conn.peer); for (const c of R.conns.values()) send(c, { t: 'x', id: conn.peer }); };
      conn.on('close', gone); conn.on('error', gone);
    }
    function asMember() {
      const p = new window.Peer(undefined, PJ_CFG); R.peer = p; pjKeep(p);
      p.on('open', (id) => {
        R.me = id; R.snap = null; const c = p.connect(hubId, { reliable: true, serialization: 'json' }); R.hubConn = c;
        c.on('open', () => { R.lastHub = Date.now(); R.hubOpen = true; R.fail = ''; flush(true); });
        // le salon existe (le serveur a transmis la demande) mais la liaison directe n'aboutit pas : réseaux incompatibles sans relais TURN
        const p2pFail = () => { if (!R.hubOpen && !R.noHub) R.fail = 'p2p'; };
        c.on('error', p2pFail); setTimeout(p2pFail, 14000);
        try { const watch = () => { const pc = c.peerConnection; if (!pc) return setTimeout(watch, 300); pc.addEventListener('iceconnectionstatechange', () => { if (pc.iceConnectionState === 'failed') p2pFail(); }); }; watch(); } catch (e) {}
        c.on('data', (m) => { R.lastHub = Date.now(); if (!m || typeof m !== 'object') return; if (m.t === 'all' && Array.isArray(m.list)) { for (const [id, pr] of m.list) if (id !== R.me) setOther(id, pr); } else if (m.t === 'p') { if (m.id !== R.me) setOther(m.id, m.p); } else if (m.t === 'x') dropOther(m.id); });
        c.on('close', () => { R.others.clear(); R.snap = null; });
        if (!R.done) { R.done = true; resolve(api); }
      });
      p.on('error', (e) => { if (e?.type === 'peer-unavailable') { R.noHub = true; return; } if (!R.done) { R.done = true; reject({ code: 'peer_' + (e?.type || 'error'), message: String(e?.message || e) }); } });
    }
    if (!opt.create) { asMember(); return; }
    const p = new window.Peer(hubId, PJ_CFG); R.peer = p; pjKeep(p);
    p.on('open', (id) => { R.me = id; R.hub = true; R.snap = null; p.on('connection', hubHandle); if (!R.done) { R.done = true; resolve(api); } });
    p.on('error', (e) => {
      if (e?.type === 'unavailable-id' && !R.me) { try { p.destroy(); } catch (er) {} }
      if (!R.done) { R.done = true; reject({ code: 'peer_' + (e?.type || 'error'), message: String(e?.message || e) }); }
    });
    setTimeout(() => { if (!R.done) { R.done = true; reject({ code: 'peer_timeout', message: 'serveur de connexion injoignable' }); } }, 15000);
  });
}
async function netTry() {
  if (NET.avail) return true;
  if (STANDALONE) { if (!window.Peer) { NET.why = 'peerjs non chargé (bloqueur de pub ?)'; return false; } NET.lobby = makePeerLobby(); NET.avail = true; NET.why = ''; return true; }
  if (!(window.claude && typeof window.claude.use === 'function')) { NET.why = 'nobridge'; return false; }
  try { NET.lobby = await window.claude.use('room'); } catch (e) { NET.lobby = null; NET.why = 'err:' + (e?.code || e?.message || e); }
  if (!NET.lobby && !NET.why?.startsWith('err')) NET.why = 'null';
  NET.avail = !!NET.lobby; if (NET.avail) NET.why = '';
  if (NET.lobby && !NET.watch) { NET.watch = 1; try { NET.lobby.onConnection((c) => { NET.conn = c; }, (e) => { NET.avail = false; NET.why = e?.code || 'err'; NET.denied = e?.code; }); } catch (e) {} }
  return NET.avail;
}
async function netInit() {
  const t0 = performance.now();
  while (!STANDALONE && !(window.claude && typeof window.claude.use === 'function') && performance.now() - t0 < 20000) await sleep(200);
  while (STANDALONE && !window.Peer && performance.now() - t0 < 10000) await sleep(200);
  await netTry(); NET.checked = true;
  // nouvelles tentatives en arrière-plan pendant 2 minutes
  for (let k = 0; k < 24 && !NET.avail; k++) { await sleep(5000); await netTry(); }
}
function makeFakeRoom() {
  let pres = {}; let snap = null;
  return {
    name: 'solo', presence: async (p) => { for (const k in p) { if (p[k] === null) delete pres[k]; else pres[k] = p[k]; } snap = null; },
    peers: () => { if (!snap) snap = Object.freeze([Object.freeze({ peer: 'solo-me', by: null, isMe: true, sameTab: true, kind: 'viewer', guest: false, presence: Object.freeze({ ...pres }), updatedAt: Date.now() })]); return snap; },
    connected: () => true, leave: async () => {},
  };
}
async function netJoin(code, create) { const r = await NET.lobby.join('qg-' + code.toLowerCase(), STANDALONE ? { create: !!create } : undefined); NET.room = r; NET.pres = {}; NET.solo = false; NET.me = null; return r; }
function netSolo() { NET.room = makeFakeRoom(); NET.pres = {}; NET.solo = true; NET.me = 'solo-me'; }
async function netLeave() { const r = NET.room; const solo = NET.solo; NET.room = null; NET.pres = {}; NET.me = null; NET.solo = false; if (r && !solo) { try { await r.leave(); } catch (e) {} } }
function presSize(extra) { return JSON.stringify(extra ? { ...NET.pres, ...extra } : NET.pres).length; }
function setPres(patch) {
  if (!NET.room) return;
  for (const k in patch) { if (patch[k] === null) delete NET.pres[k]; else NET.pres[k] = patch[k]; }
  NET.room.presence(patch).catch((e) => { if (NET.warned++ < 3) console.warn('[presence]', e && (e.code || e.message || e)); });
}
function netPeers() { if (!NET.room) return []; try { return NET.room.peers() || []; } catch (e) { return []; } }
