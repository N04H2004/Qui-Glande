// ======================= INTERFACE & SONS =======================
const SFX = {
  ctx: null, noise: null,
  init() { if (this.ctx) return; try { this.ctx = new (window.AudioContext || window.webkitAudioContext)(); const n = this.ctx.createBuffer(1, this.ctx.sampleRate * 0.6, this.ctx.sampleRate); const d = n.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; this.noise = n; } catch (e) { this.ctx = null; } },
  tone(f, d, type = 'sine', v = 0.12, t0 = 0, f2 = null) { const c = this.ctx; if (!c) return; const t = c.currentTime + t0; const o = c.createOscillator(), g = c.createGain(); o.type = type; o.frequency.setValueAtTime(f, t); if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + d); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(v, t + 0.015); g.gain.exponentialRampToValueAtTime(0.0001, t + d); o.connect(g).connect(c.destination); o.start(t); o.stop(t + d + 0.05); },
  burst(d = 0.35, v = 0.25, lp = 1800, t0 = 0) { const c = this.ctx; if (!c || !this.noise) return; const t = c.currentTime + t0; const s = c.createBufferSource(); s.buffer = this.noise; const f = c.createBiquadFilter(); f.type = 'lowpass'; f.frequency.value = lp; const g = c.createGain(); g.gain.setValueAtTime(v, t); g.gain.exponentialRampToValueAtTime(0.0001, t + d); s.connect(f).connect(g).connect(c.destination); s.start(t); s.stop(t + d + 0.05); },
  play(n, vol = 1) {
    if (!this.ctx) return; if (this.ctx.state === 'suspended') this.ctx.resume().catch(() => {});
    if (n === 'ring') { for (let i = 0; i < 4; i++) this.tone(i % 2 ? 1320 : 1100, 0.08, 'square', 0.05 * vol, i * 0.1); return; }
    if (n === 'alarm') { for (let i = 0; i < 4; i++) this.tone(i % 2 ? 700 : 950, 0.2, 'square', 0.06, i * 0.22); return; }
    if (n === 'ding') { this.tone(1046, 0.4, 'sine', 0.12); this.tone(1318, 0.5, 'sine', 0.1, 0.15); return; }
    if (n === 'bip') { this.tone(1760, 0.06, 'square', 0.05); return; }
    if (n === 'place') { this.tone(420 + Math.random() * 80, 0.05, 'triangle', 0.08); this.burst(0.04, 0.05, 1500); return; }
    if (n === 'cash') { this.tone(1318, 0.1, 'triangle', 0.1); this.tone(1760, 0.25, 'triangle', 0.1, 0.08); return; }
    if (n === 'err') { this.tone(180, 0.18, 'sawtooth', 0.07); return; }
    if (n === 'scrub') { this.burst(0.06, 0.08, 3000); return; }
    if (n === 'whoosh') { this.burst(0.25, 0.12, 1200); this.tone(500, 0.2, 'sine', 0.04, 0, 200); return; }
    if (n === 'bonk') { this.tone(220, 0.12, 'square', 0.1, 0, 110); this.burst(0.08, 0.15, 2200); return; }
    if (n === 'door') { this.tone(140, 0.18, 'triangle', 0.08, 0, 90); this.burst(0.12, 0.06, 700); return; }
    if (n === 'drawer') { this.burst(0.18, 0.07, 1600); this.tone(300, 0.06, 'triangle', 0.04, 0.14); return; }
    if (n === 'shutter') { for (let i = 0; i < 8; i++) this.tone(rnd(160, 240), 0.05, 'square', 0.03, i * 0.06); return; }
    if (n === 'land') { this.tone(260 + Math.random() * 120, 0.06, 'triangle', 0.06 * vol); this.burst(0.05, 0.06 * vol, 1200); return; }
    if (n === 'done') { this.tone(660, 0.12, 'triangle'); this.tone(990, 0.18, 'triangle', 0.12, 0.09); }
    else if (n === 'pick') this.tone(520, 0.08, 'square', 0.06);
    else if (n === 'tick') this.tone(880, 0.04, 'square', 0.04);
    else if (n === 'chat') this.tone(1200, 0.05, 'sine', 0.05);
    else if (n === 'sneak') { this.tone(300, 0.12, 'sawtooth', 0.06); this.tone(240, 0.16, 'sawtooth', 0.06, 0.1); }
    else if (n === 'crash') { this.burst(0.5, 0.35, 2500); for (let i = 0; i < 6; i++) this.tone(rnd(900, 1800), 0.06, 'square', 0.04, i * 0.06); }
    else if (n === 'splash') this.burst(0.35, 0.2, 900);
    else if (n === 'fire') { // licenciement : souffle, coup de tampon, « dun, dun, duuun » qui s'étire pendant le ralenti
      this.burst(0.34, 0.07, 2600); this.tone(70, 0.34, 'sawtooth', 0.05, 0, 190);
      this.tone(130, 0.55, 'sine', 0.4, 0.35, 32); this.burst(0.28, 0.4, 480, 0.35); this.burst(0.07, 0.22, 4200, 0.35);
      this.tone(98, 1.5, 'sine', 0.1, 0.42, 46); this.tone(196, 1.35, 'sawtooth', 0.035, 0.42, 62);
      [[0.35, 0.34, [130.8, 155.6, 196]], [0.8, 0.34, [123.5, 146.8, 185]], [1.25, 1.5, [103.8, 130.8, 155.6]]].forEach(([t0, d, ch], i) => { for (const f of ch) { this.tone(f, d, 'sawtooth', 0.055, t0, i === 2 ? f * 0.94 : null); this.tone(f * 2, d * 0.8, 'square', 0.018, t0, i === 2 ? f * 1.88 : null); } this.tone(ch[0] / 2, d, 'triangle', 0.14, t0); });
    }
    else if (n === 'boxdrop') { this.tone(120, 0.22, 'sine', 0.3, 0, 44); this.burst(0.14, 0.22, 650); this.burst(0.3, 0.05, 5000, 0.03); }
    else if (n === 'clink') { const f = rnd(1700, 3100); this.tone(f, 0.05, 'triangle', 0.06 * vol); this.tone(f * 1.52, 0.035, 'sine', 0.03 * vol, 0.004); }
    else if (n === 'zap') { this.burst(0.11, 0.2 * vol, 6500); this.tone(1900, 0.09, 'square', 0.035 * vol, 0, 160); this.tone(2600, 0.06, 'sawtooth', 0.03 * vol, 0.05, 300); }
    else if (n === 'glug') { this.tone(190, 0.1, 'sine', 0.14, 0, 90); this.burst(0.3, 0.16, 800, 0.02); [0.16, 0.3, 0.46].forEach((t0, i) => this.tone(330 - i * 40, 0.09, 'sine', 0.07, t0, 150)); }
    else if (n === 'meet') { this.tone(880, 0.5, 'sine', 0.15); this.tone(660, 0.7, 'sine', 0.15, 0.35); }
    else if (n === 'ann') { this.tone(523, 0.3, 'sine', 0.12); this.tone(659, 0.3, 'sine', 0.12, 0.25); this.tone(784, 0.45, 'sine', 0.12, 0.5); }
    else if (n === 'win') [523, 659, 784, 1046].forEach((f, i) => this.tone(f, 0.3, 'triangle', 0.12, i * 0.14));
    else if (n === 'lose') [392, 330, 262].forEach((f, i) => this.tone(f, 0.4, 'triangle', 0.12, i * 0.2));
  },
};

const UI = {
  chatOpen: false, modal: false, hudT: 0, meetSig: '', lobbySig: '', myVote: null, confirmId: null, floatEl: null,
  init() {
    // personnalisation
    try { const s = JSON.parse(localStorage.getItem('qg-profile') || 'null'); if (s && typeof s.name === 'string') { ME.name = cleanText(s.name, 14); if (Array.isArray(s.sk)) ME.sk = sanitizeSk(s.sk); } } catch (e) {}
    if (!ME.name) ME.name = pick(['Momo', 'Lulu', 'Zizou', 'Titi', 'Bébert', 'Nono', 'Fanfan', 'Kiki']) + rndi(1, 99);
    const inName = $('#inName'); inName.value = ME.name;
    inName.addEventListener('input', () => { ME.name = cleanText(inName.value, 14) || 'Joueur'; this.saveProfile(); if (NET.room) setPres({ n: ME.name }); });
    const sw = (el, arr, idx) => { el.innerHTML = ''; arr.forEach((c, i) => { const d = document.createElement('div'); d.className = 'sw' + (ME.sk[idx] === i ? ' on' : ''); d.style.background = c; d.onclick = () => { ME.sk = [...ME.sk]; ME.sk[idx] = i; this.refreshCustom(); }; el.appendChild(d); }); };
    this.refreshCustom = () => { sw($('#swShirt'), SHIRTS, 0); sw($('#swSkin'), SKINS, 1); $('#lbHat').textContent = HATS[ME.sk[2]]; $('#lbAcc').textContent = ACCS[ME.sk[3]]; this.saveProfile(); if (NET.room) setPres({ sk: ME.sk }); };
    document.querySelectorAll('[data-cyc]').forEach((b) => (b.onclick = () => { const i = +b.dataset.cyc, n = i === 2 ? HATS.length : ACCS.length; ME.sk = [...ME.sk]; ME.sk[i] = (ME.sk[i] + +b.dataset.d + n) % n; this.refreshCustom(); SFX.init(); SFX.play('tick'); }));
    this.refreshCustom();
    document.querySelectorAll('[data-g]').forEach((b) => (b.onclick = () => { setGfx(b.dataset.g); SFX.init(); SFX.play('tick'); })); gfxButtons();
    $('#btCreate').onclick = () => { SFX.init(); doCreate(); };
    $('#btJoin').onclick = () => { SFX.init(); doJoin($('#inCode').value); };
    $('#inCode').addEventListener('keydown', (e) => { if (e.code === 'Enter' || e.key === 'Enter') { e.preventDefault(); doJoin($('#inCode').value); } });
    $('#inCode').addEventListener('input', (e) => { e.target.value = e.target.value.toUpperCase().replace(/[^A-Z]/g, '').slice(0, 4); });
    $('#btSolo').onclick = () => { SFX.init(); doSolo(); };
    $('#btHelp').onclick = () => this.toggleHelp(); $('#btHelpClose').onclick = () => this.toggleHelp(false);
    $('#btLeave').onclick = () => leaveRoom(); $('#btQuitEnd').onclick = () => leaveRoom();
    $('#btCopy').onclick = () => { try { navigator.clipboard.writeText(C.code).then(() => this.toast('📋 Code copié : ' + C.code, 'good', 2000), () => this.toast('Code : ' + C.code, '', 3000)); } catch (e) { this.toast('Code : ' + C.code, '', 3000); } };
    $('#btBotPlus').onclick = () => { hostAddBot(); SFX.play('tick'); }; $('#btBotMinus').onclick = () => { hostRemoveBot(); SFX.play('tick'); };
    $('#selRole').onchange = (e) => { H.pref = e.target.value; };
    $('#btStart').onclick = () => { SFX.init(); if (!hostStart()) this.toast('Il faut au moins 3 participants (ajoute des bots !)', 'fire', 3000); };
    $('#btAgain').onclick = () => { if (C.isHost) hostToLobby(); };
    $('#btMeet').onclick = () => callMeeting();
    $('#meetSkip').onclick = () => this.meetClick('-');
    $('#cfYes').onclick = () => { if (this.confirmId) doFire(this.confirmId); this.closeModal(); };
    $('#cfNo').onclick = () => this.closeModal();
    const ci = $('#chatIn');
    ci.addEventListener('keydown', (e) => { e.stopPropagation(); if (e.key === 'Enter') { e.preventDefault(); sendChat(ci.value); ci.value = ''; this.closeChat(); } else if (e.key === 'Escape') { ci.value = ''; this.closeChat(); } });
    ci.addEventListener('blur', () => setTimeout(() => { if (document.activeElement !== ci) this.closeChat(); }, 50));
  },
  saveProfile() { try { localStorage.setItem('qg-profile', JSON.stringify({ name: ME.name, sk: ME.sk })); } catch (e) {} },
  status(msg, err) { const el = $('#netStatus'); el.textContent = msg || ''; el.style.color = err ? '#ff9b9b' : ''; if (msg) delete el.dataset.auto; else el.dataset.auto = '1'; },
  netStatus() { const el = $('#netStatus'); if (C.mode !== 'title' || (el.textContent && !el.dataset.auto)) return; el.dataset.auto = '1'; el.style.color = ''; el.textContent = NET.avail ? '🌐 Multijoueur prêt : crée un salon ou entre un code.' : NET.denied ? `⛔ Multijoueur bloqué (${NET.why === 'not_granted' || NET.why === 'revoked' ? 'ton compte n’a pas accès aux salons : l’hôte doit t’inviter par e-mail depuis « Share »' : NET.why}). Le solo marche !` : NET.checked ? `⚠️ Multijoueur pas encore disponible (${NET.why === 'nobridge' ? 'page ouverte hors de Claude' : NET.why === 'null' ? 'connexion au salon refusée — es-tu connecté à Claude ?' : NET.why === 'not_granted' || NET.why === 'revoked' ? 'ton compte n’a pas accès aux salons : l’hôte doit t’inviter par e-mail depuis « Share »' : NET.why || '?'}). Nouvel essai en cours… Le solo marche !` : '⏳ Connexion au multijoueur…'; $('#btCreate').disabled = false; $('#btJoin').disabled = false;
    if (NET.avail && NET.lobby && !STANDALONE) { let n = 0, c = '?'; try { n = (NET.lobby.peers() || []).length; c = NET.lobby.connected() ? 'oui' : 'non'; } catch (e) {} el.textContent += ` · 🔌 connecté : ${c} · 👥 ${n} personne(s) sur la page du jeu`; } },
  showOnly(ids) { for (const id of ['title', 'lobby', 'hud', 'meeting', 'endScr', 'camOverlay', 'confirm']) $('#' + id).classList.toggle('hidden', !ids.includes(id)); $('#btHelp').classList.toggle('hidden', !ids.includes('title') && !ids.includes('lobby')); },
  showTitle() { this.showOnly(['title']); $('#titlePanel').insertBefore($('#custom'), $('#titleActions')); $('#netStatus').textContent = ''; delete $('#netStatus').dataset.auto; this.netStatus(); this.closeChat(); $('#chatLog').innerHTML = ''; C.seenCh.clear(); },
  showLobby() {
    this.showOnly(['lobby']); $('#customSlot').appendChild($('#custom')); this.lobbySig = '';
    const solo = NET.solo; $('#lbRoomLabel').textContent = solo ? 'Entraînement' : 'Salon'; $('#lbCode').textContent = solo ? 'SOLO' : C.code; $('#btCopy').classList.toggle('hidden', solo);
    $('#lobbyHint').innerHTML = solo ? 'Partie contre des bots pour t’entraîner. Choisis ton rôle si tu veux !' : '👉 Donne ce code à tes amis : ils ouvrent cette page (partage-la-leur depuis Claude) et cliquent « Rejoindre ». L’hôte peut compléter avec des bots.';
    $('#hostCtl').classList.toggle('hidden', !C.isHost); $('#soloPref').classList.toggle('hidden', !solo); $('#btStart').classList.toggle('hidden', !C.isHost); $('#waitHost').classList.toggle('hidden', C.isHost);
    $('#selRole').value = H.pref || '';
  },
  showGame() { this.showOnly(['hud']); this.gameT0 = performance.now(); this.meetSig = ''; this.myVote = null; try { document.activeElement?.blur?.(); $('#c').focus({ preventScroll: true }); } catch (e) {} },
  showEnd(G) {
    this.showOnly(['endScr']); const en = G.en || {}; const win = en.w === 'emp';
    const myOrig = C.isHost ? H.orig[NET.me] : (G.en?.ro || {})[NET.me]; const iWon = myOrig ? (myOrig === 'gla') === !win : null;
    SFX.play(iWon === false ? 'lose' : 'win');
    $('#endEmoji').textContent = win ? '🎉' : '😴'; $('#endTitle').textContent = win ? 'LES EMPLOYÉS GAGNENT !' : 'LES GLANDEURS GAGNENT !'; $('#endTitle').style.color = win ? 'var(--good)' : 'var(--bad)';
    const R = { all: 'Tous les glandeurs ont été virés.', parity: 'Il ne reste plus assez d’employés pour faire tourner le magasin.', prod: 'La productivité a atteint 100 % !', prod0: 'La productivité est tombée à 0 %… le magasin coule.', time: 'Fin de la journée : productivité ' + Math.round(G.pr) + ' %.', nomgr: 'Plus personne pour diriger le magasin…' };
    $('#endReason').textContent = (R[en.r] || '') + (iWon === null ? '' : iWon ? ' Bravo, tu as gagné !' : ' Perdu pour cette fois…');
    const ro = en.ro || {}, st = en.st || {};
    $('#endBody').innerHTML = (G.pl || []).map(([id, name, sk, bot]) => {
      const r = ro[id]; const was = (G.mh || []).includes(id); const role = r === 'gla' ? '😴 Glandeur' : r === 'mgr' ? '👔 Directeur' : '😇 Employé' + (was ? ' → 👔' : '');
      const status = (G.qt || []).includes(id) ? '🚪 Parti' : G.fd.includes(id) ? '📦 Viré' : '✅ En poste';
      return `<tr><td><img class="pt sm" alt="" style="background:${SHIRTS[sk[0]]}" src="${portraitURL(sk)}"> ${esc(name)}${bot ? ' 🤖' : ''}${id === NET.me ? ' <b>(toi)</b>' : ''}</td><td>${role}</td><td>${status}</td><td>${st[id]?.[0] ?? '-'}</td><td>${r === 'gla' ? st[id]?.[1] ?? '-' : '-'}</td></tr>`;
    }).join('');
    $('#btAgain').classList.toggle('hidden', !C.isHost); $('#endWait').textContent = C.isHost ? '' : 'En attente de l’hôte pour la prochaine partie…';
  },
  toast(html, cls = '', ms = 3500) { const d = document.createElement('div'); d.className = 'toast ' + cls; d.innerHTML = html; $('#toasts').appendChild(d); setTimeout(() => { d.style.transition = 'opacity .4s'; d.style.opacity = '0'; setTimeout(() => d.remove(), 450); }, ms); while ($('#toasts').children.length > 3) $('#toasts').firstChild.remove(); },
  big(t2, t1, t3, ms = 4000, color) { const el = $('#bigMsg'); el.innerHTML = `<div class="bm"><div class="t1">${esc(t1)}</div><div class="t2" style="color:${color || '#fff'}">${esc(t2)}</div><div class="t3">${esc(t3)}</div></div>`; el.classList.remove('hidden'); clearTimeout(this.bigT); this.bigT = setTimeout(() => el.classList.add('hidden'), ms); },
  roleIntro(role, G) {
    const R = ROLE_INFO[role]; if (!R) return; let extra = R.desc;
    if (role === 'gla') { const m = myMates(G); extra += m.length ? ' Complice' + (m.length > 1 ? 's' : '') + ' : ' + m.map((id) => pName(G, id)).join(', ') + '.' : ' Tu es seul·e, sois discret·e.'; }
    this.big(R.name + ' ' + R.emoji, 'Tu es…', extra, 6500, R.color); SFX.play(role === 'gla' ? 'sneak' : 'ann');
  },
  float(text) { const el = document.createElement('div'); el.className = 'toast good'; el.style.cssText = 'position:fixed;left:50%;bottom:190px;transform:translateX(-50%);z-index:41;font-size:15px;pointer-events:none'; el.textContent = text; document.body.appendChild(el); setTimeout(() => { el.style.transition = 'all .5s'; el.style.opacity = '0'; el.style.bottom = '230px'; setTimeout(() => el.remove(), 520); }, 900); },
  chatLine(name, color, text, ghost) { const d = document.createElement('div'); d.className = 'cl' + (ghost ? ' ghostmsg' : ''); d.innerHTML = `<b style="color:${color}">${esc(name)}${ghost ? ' 👻' : ''}</b>${esc(text)}`; this.pushLine(d); },
  chatSys(text) { const d = document.createElement('div'); d.className = 'cl sys'; d.textContent = text; this.pushLine(d); },
  pushLine(d) { const log = $('#chatLog'); log.appendChild(d); while (log.children.length > 12) log.firstChild.remove(); setTimeout(() => { if (!this.chatOpen) d.style.opacity = '0.25'; }, 12000); },
  openChat() { if (this.chatOpen) return; this.chatOpen = true; for (const k in KEYS) KEYS[k] = false; if (document.pointerLockElement) document.exitPointerLock?.(); const ci = $('#chatIn'); ci.classList.remove('hidden'); $('#chat').classList.add('open'); ci.focus(); },
  closeChat() { this.chatOpen = false; const ci = $('#chatIn'); ci.classList.add('hidden'); ci.blur(); $('#chat').classList.remove('open'); },
  confirmFire(id) { const G = curG(); this.confirmId = id; this.modal = true; for (const k in KEYS) KEYS[k] = false; if (document.pointerLockElement) document.exitPointerLock?.(); $('#cfText').textContent = `Virer ${pName(G, id)} ?`; $('#cfSub').textContent = 'Son vrai rôle sera révélé à tout le monde. Ton quota repart à zéro.'; $('#confirm').classList.remove('hidden'); },
  closeModal() { this.modal = false; this.confirmId = null; $('#confirm').classList.add('hidden'); $('#help').classList.add('hidden'); },
  toggleHelp(force) { const h = $('#help'); const show = force !== undefined ? force : h.classList.contains('hidden'); h.classList.toggle('hidden', !show); this.modal = show; if (show) { for (const k in KEYS) KEYS[k] = false; if (document.pointerLockElement) document.exitPointerLock?.(); } },
  cams(on) { $('#camOverlay').classList.toggle('hidden', !on); $('#left').classList.toggle('hidden', on); $('#right').classList.toggle('hidden', on); $('#prompt').classList.toggle('hidden', on); if (on) { for (const k in KEYS) KEYS[k] = false; } },
  meetClick(t) { const G = curG(); if (!G?.mt) return; if (G.mt.s === 'dec' && myRole(G) === 'mgr') { sendAction(['dc', t]); SFX.play('tick'); return; } if (G.mt.s !== 'talk' || !isAlive(G) || myRole(G) === 'mgr') return; this.myVote = t; setPres({ vt: [G.mt.id, t] }); SFX.play('tick'); this.meetSig = ''; },

  // ---------- rafraîchissement ----------
  update(dt) {
    MG.update(dt); const G = curG();
    if (C.mode === 'title') this.netStatus();
    if (C.mode === 'lobby') this.updateLobby(G);
    if (C.mode === 'game' && G?.pl) { this.updatePrompt(G); this.drawMini(G); if (C.camMode) $('#camLabel').textContent = CAMS[C.camIdx].name + '   ' + new Date().toLocaleTimeString('fr-FR'); this.hudT -= dt; if (this.hudT <= 0) { this.hudT = 0.2; this.updateHud(G); } this.updateMeeting(G); }
  },
  updateLobby(G) {
    const list = [];
    for (const [peer, p] of C.peerById) if (p.presence?.n) list.push({ id: peer, name: peer === NET.me ? ME.name : cleanText(p.presence.n, 14), sk: peer === NET.me ? ME.sk : sanitizeSk(p.presence.sk), host: p.presence.h === 1 });
    for (const b of G?.bots || []) list.push({ id: b[0], name: b[1], sk: b[2], bot: true });
    const sig = JSON.stringify(list) + C.isHost; if (sig === this.lobbySig) return; this.lobbySig = sig;
    $('#lobbyList').innerHTML = list.map((l) => `<div class="pl"><img class="pt" alt="" style="background:${SHIRTS[l.sk[0]]}" src="${portraitURL(l.sk)}"><span>${esc(l.name)}${l.id === NET.me ? ' <b>(toi)</b>' : ''}</span>${l.host ? '<span class="tag host">Hôte</span>' : l.bot ? '<span class="tag">🤖 Bot</span>' : '<span class="tag">Joueur</span>'}</div>`).join('') || '<div class="small">Connexion…</div>';
    $('#lbBots').textContent = H.botsCfg.length;
    const n = list.length; $('#btStart').disabled = n < 3; $('#btStart').textContent = n < 3 ? `▶ Il faut 3 participants (${n}/3)` : `▶ Lancer la partie (${Math.min(12, n)} participants)`;
  },
  updatePrompt(G) {
    const p = $('#prompt'); const c = C.cand, f = C.fireCand, pl = C.place;
    $('#crosshair').classList.toggle('on', !!(c || (pl && pl.ok)));
    $('#crosshair').classList.toggle('on', !!(c || (pl && pl.ok) || C.take));
    const thr = ME.carry === 6 || ((ME.carry === 1 || ME.carry === 2) && ME.box?.n > 0) ? '<span class="key">Clic droit</span><span class="key">X</span> Lancer · <span class="key">G</span> Poser par terre' : '';
    if (pl) { p.classList.remove('hidden'); $('#promptBar').style.display = 'none'; $('#promptText2').innerHTML = thr; const one = ME.carry === 6; $('#promptText').innerHTML = pl.ok ? `<span class="key">Clic</span><span class="key">E</span> Poser ${one ? esc(prodName(ME.box.cat, ME.box.v | 0)) : 'un produit'} · ${CAT_NAMES[pl.si]}${one ? '' : ` (${ME.box?.n ?? 0} dans le carton)`}` : pl.wrong ? `<span style="color:#ff8b8b">❌ ${ME.box?.cat === SI_VITRINE ? 'Ça va dans la <b>vitrine à boissons</b>' : `Ça va au rayon <b>${esc(SHELF_NAMES[ME.box?.cat ?? 0])}</b>`}</span>` : '✅ Ce rayon est plein'; return; }
    if (C.take) { p.classList.remove('hidden'); $('#promptBar').style.display = 'none'; $('#promptText2').innerHTML = ''; const v = slotVar(C.take.si, C.take.slot, SHELVES[C.take.si].cols); $('#promptText').innerHTML = `<span class="key">Clic</span><span class="key">E</span> Prendre : ${PROD_ICON[C.take.si]} ${esc(prodName(C.take.si, v))}`; return; }
    if (!c && !f && thr) { p.classList.remove('hidden'); $('#promptBar').style.display = 'none'; $('#promptText').innerHTML = thr; $('#promptText2').innerHTML = ''; return; }
    if (!c && !f) { p.classList.add('hidden'); return; } p.classList.remove('hidden');
    if (c) { const col = c.type === 's' ? '#ff8b8b' : c.type === 'p' ? '#9fd4ff' : c.type === 'c' ? '#ffc08a' : c.lowPrio ? '#c9c2d6' : '#fff'; $('#promptText').innerHTML = `<span class="key">E</span><span class="key">Clic</span><span style="color:${col}">${c.mg ? '🎮 ' : c.hold && !c.inst ? 'Maintiens : ' : ''}${esc(c.label)}</span>`; $('#promptBar').style.display = c.hold && !c.mg ? '' : 'none'; $('#promptFill').style.width = (c.hold ? clamp(C.hold.key === c.key ? C.hold.t / c.hold : 0, 0, 1) * 100 : 0) + '%'; }
    else { $('#promptText').innerHTML = ''; $('#promptBar').style.display = 'none'; }
    $('#promptText2').innerHTML = f ? `<span class="key">F</span> Virer <b>${esc(pName(G, f))}</b>` : thr;
  },
  updateHud(G) {
    const pr = clamp(G.pr || 0, 0, 100); $('#prodFill').style.width = pr + '%'; $('#prodPct').textContent = Math.round(pr) + ' %';
    const role = myRole(G), alive = isAlive(G), part = inRoster(G);
    $('#hud').classList.toggle('fresh', performance.now() - (this.gameT0 || 0) < 25000); // description du rôle et rappel des touches : affichés au début, puis repliés (H pour les revoir)
    const R = ROLE_INFO[role];
    let rc = '';
    if (!part) rc = `<div class="rn">👀 SPECTATEUR</div><div class="rd">Tu rejoindras la prochaine partie.</div>`;
    else if (!R) rc = `<div class="rn">…</div><div class="rd">Attribution des rôles…</div>`;
    else { rc = `<div class="rn" style="color:${R.color}">${R.emoji} ${R.name}</div><div class="rd rdesc">${esc(R.desc)}</div>`; if (role === 'gla') { const m = myMates(G); if (m.length) rc += `<div class="rd">🤝 Complice${m.length > 1 ? 's' : ''} : <b>${m.map((id) => esc(pName(G, id))).join(', ')}</b></div>`; } if (!alive) rc += `<div class="rd" style="color:#ffb3b3">👻 Tu as été viré : mode fantôme.</div>`; }
    $('#roleCard').innerHTML = rc;
    let tl = '', rb = '', rbH = '';
    const row = (ic, tx, p, sub, cls = '') => `<div class="task ${cls}"><span class="ic">${ic}</span><span class="tx">${esc(tx)}${sub ? `<span class="sub">${esc(sub)}</span>` : ''}</span>${p ? `<span class="d">${Math.round(Math.hypot(p.x - ME.x, p.z - ME.z))} m</span>` : ''}</div>`;
    if (part && alive && (role === 'emp' || role === 'gla')) {
      $('#tbH').textContent = '📋 Mes tâches';
      tl = C.tasks.map((t) => row(taskStep(t) === 0 && t.steps.length > 1 ? '📦' : t.icon, t.label, taskLast(t).sab === 'jet' ? null : taskWhere(t), taskSub(t), t.type === 's' ? 's' : '')).join('') || '<div class="small">Nouvelle tâche en approche…</div>';
      if (role === 'gla') { const cd = Math.ceil((C.sabCd - performance.now()) / 1000); tl += cd > 0 ? `<div class="small" style="color:#ffb3b3">🤫 Fais-toi discret encore ${cd} s</div>` : `<div class="small" style="color:#ffb3b3">😈 Le reste est libre : tous les sabotages sont permis</div>`; }
      if (ME.carry) tl += `<div class="small">👐 En main : ${ME.box ? (ME.carry === 6 ? esc(prodName(ME.box.cat, ME.box.v | 0)) + ' (' + CAT_NAMES[ME.box.cat] + ')' : (ME.carry === 1 ? 'carton' : 'caisse') + ' de ' + SHELF_NAMES[ME.box.cat] + ' (' + ME.box.n + '/' + BOX_SIZE + ')') : CARRY_NAMES[ME.carry]} · <b>G</b> poser · <b>clic droit</b> lancer</div>`;
      rbH = '🏪 En plus, le magasin a besoin de…';
      rb = storeNeeds(G).slice(0, role === 'gla' ? 3 : 4).map((n) => row(n.ic, n.tx, n, '', n.pr >= 0.8 ? 'urg' : '')).join('') || '<div class="small">Tout roule ! Fais un tour 👀</div>';
      if (!C.hints) rb += '<div class="small">I : afficher ces besoins dans le magasin</div>';
    } else if (part && alive && role === 'mgr') {
      $('#tbH').textContent = '👔 Ton boulot';
      tl = `<div class="task"><span class="ic">🔍</span><span class="tx">Observe qui sabote et vire les glandeurs.<span class="sub">F près de quelqu'un pour le virer · R pour une réunion</span></span></div><div class="task"><span class="ic">📹</span><span class="tx">Caméras au bureau<span class="sub">Bureau du directeur</span></span><span class="d">${Math.round(Math.hypot(ST.cams.x - ME.x, ST.cams.z - ME.z))} m</span></div>`;
      const nd = storeNeeds(G).filter((n) => n.pr >= 0.8).slice(0, 3); if (nd.length) { rbH = '📉 Ce qui cloche'; rb = nd.map((n) => row(n.ic, n.tx, n)).join(''); }
    } else { $('#tbH').textContent = '📋 Magasin'; tl = '<div class="small">Rien à faire pour toi.</div>'; }
    $('#taskList').innerHTML = tl;
    $('#reqBox').classList.toggle('hidden', !rb); $('#rbH').textContent = rbH; $('#reqList').innerHTML = rb;
    const ms = G.ms || [];
    $('#incBox').classList.toggle('hidden', !ms.length); $('#incList').innerHTML = ms.length ? ms.map((m) => `<div class="task"><span class="ic">${MESS[m[1]].icon}</span><span class="tx">${MESS[m[1]].name}${m[1] === 'tag' || m[1] === 'mix' ? ' — ' + SHELF_NAMES[m[4]] : ''}<span class="sub">depuis ${fmtT(Math.max(0, (m[5] || 0) - (G.t || 0)))}</span></span><span class="d">${Math.round(Math.hypot(m[2] - ME.x, m[3] - ME.z))} m</span></div>`).join('') : '<div class="small">Rien à signaler ✨</div>';
    const glaLeft = (G.ng || 0) - Object.values(G.fr || {}).filter((r) => r === 'gla').length; const aliveN = (G.pl || []).filter((p) => isAlive(G, p[0])).length;
    $('#tDay').textContent = fmtT(G.t); $('#tQuota').textContent = fmtT(G.q); $('#chQuota').classList.toggle('warn', G.q < 30);
    $('#timers').innerHTML = `<span class="chip" title="Glandeurs encore là">😴 Glandeurs <b>${glaLeft}</b></span><span class="chip" title="Personnel restant">👥 Personnel <b>${aliveN}</b></span><span class="chip dir">👔 Directeur <b>${esc(pName(G, G.mg))}</b></span>`;
    $('#mgrCtl').classList.toggle('hidden', !(role === 'mgr' && alive && G.ph === 'play'));
    $('#btMeet').disabled = (G.mcd || 0) > 0; $('#btMeet').textContent = (G.mcd || 0) > 0 ? `🔔 Réunion (dispo dans ${Math.ceil(G.mcd)} s)` : '🔔 Réunion d’équipe (R)';
    $('#crosshair').classList.toggle('hidden', ME.view !== 1);
    const sp = $('#spect'); if (part && !alive) { sp.classList.remove('hidden'); sp.textContent = '👻 Mode fantôme : les vivants ne te voient pas'; } else if (!part) { sp.classList.remove('hidden'); sp.textContent = '👀 Spectateur'; } else sp.classList.add('hidden');
  },
  updateMeeting(G) {
    const show = G.ph === 'meet' && !!G.mt; $('#meeting').classList.toggle('hidden', !show); $('#hud').classList.toggle('meet', show); if (!show) { this.myVote = null; return; }
    const mt = G.mt, role = myRole(G), alive = isAlive(G);
    $('#meetT').textContent = fmtT(mt.t) + (mt.s === 'dec' ? ' · décision' : '');
    const cnt = {}; for (const v of Object.values(mt.v || {})) cnt[v] = (cnt[v] || 0) + 1;
    const sig = JSON.stringify([mt.id, mt.s, mt.v, this.myVote, role, alive]); if (sig === this.meetSig) return; this.meetSig = sig;
    const dec = mt.s === 'dec', iMgr = role === 'mgr' && alive;
    $('#meetGrid').innerHTML = mt.seats.filter((id) => isAlive(G, id)).map((id) => {
      const sk = pSkin(G, id); const voters = Object.entries(mt.v || {}).filter(([, t]) => t === id).map(([v]) => pName(G, v));
      let btn = '';
      if (dec && iMgr && id !== NET.me) btn = `<button class="red sm" data-mv="${esc(id)}">🔥 Virer</button>`;
      else if (!dec && alive && !iMgr && id !== NET.me && id !== G.mg) btn = `<button class="${this.myVote === id ? 'orange' : 'ghost'} sm" data-mv="${esc(id)}">${this.myVote === id ? '✔ Mon vote' : 'Voter'}</button>`;
      return `<div class="mc ${id === NET.me ? 'me' : ''} ${this.myVote === id ? 'voted' : ''}"><img class="av" alt="" style="background:${SHIRTS[sk[0]]}" src="${portraitURL(sk)}"><div class="nm">${esc(pName(G, id))}${id === G.mg ? ' 👔' : ''}${id === NET.me ? ' (toi)' : ''}</div><div class="vs">${voters.length ? '<span class="pips">' + '●'.repeat(voters.length) + '</span> ' + voters.map(esc).join(', ') : ''}</div>${btn}</div>`;
    }).join('');
    $('#meetGrid').querySelectorAll('[data-mv]').forEach((b) => (b.onclick = () => this.meetClick(b.dataset.mv)));
    const skip = $('#meetSkip'); const skips = cnt['-'] || 0;
    if (dec && iMgr) { skip.classList.remove('hidden'); skip.textContent = '🤝 Ne virer personne'; }
    else if (!dec && alive && !iMgr) { skip.classList.remove('hidden'); skip.textContent = (this.myVote === '-' ? '✔ ' : '') + '🤷 Je ne vote pour personne' + (skips ? ` (${skips})` : ''); }
    else skip.classList.add('hidden');
    $('#meetInfo').innerHTML = dec ? (iMgr ? '👔 <b>À toi de trancher</b> : vire quelqu’un ou garde tout le monde.' : '👔 Le directeur prend sa décision…') : (iMgr ? '💬 Écoute ton équipe dans le chat (Entrée). Tu trancheras après le vote.' : alive ? '💬 Discute dans le chat (Entrée) et vote. Le directeur tranchera ensuite.' : '👻 Tu observes la réunion.') + (skips && dec ? ` · 🤷 ${skips} vote(s) blanc(s)` : '');
  },
  drawMini(G) {
    const cv = $('#mini'), x = cv.getContext('2d'), Wd = cv.width, Hd = cv.height; const s = 10.3, ox = Wd / 2 - (-3 * s), oz = Hd / 2 - (4.3 * s);
    const X = (v) => ox + v * s, Z = (v) => oz + v * s;
    x.clearRect(0, 0, Wd, Hd);
    for (const zn of ZONES) { x.fillStyle = zn.outdoor ? 'rgba(120,130,145,.55)' : zn.id === 'vente' ? 'rgba(235,228,212,.85)' : 'rgba(205,200,190,.8)'; x.fillRect(X(zn.x0), Z(zn.z0), (zn.x1 - zn.x0) * s, (zn.z1 - zn.z0) * s); }
    for (const b of BOXES) { if (b.kind === 'inv') continue; x.fillStyle = b.kind === 'wall' ? '#2a3040' : '#8d96a8'; x.fillRect(X(b.x0), Z(b.z0), (b.x1 - b.x0) * s, (b.z1 - b.z0) * s); }
    const dot = (px, pz, col, r = 6) => { x.fillStyle = col; x.beginPath(); x.arc(X(px), Z(pz), r, 0, Math.PI * 2); x.fill(); x.lineWidth = 2; x.strokeStyle = '#fff'; x.stroke(); };
    const alive = isAlive(G), role = myRole(G);
    if (!alive) for (const [id, a] of AV) if (id !== NET.me) dot(a.x, a.z, '#cfd8e6', 4);
    for (const cu of G.cu || []) dot(cu[1], cu[2], cu[5] === 1 ? '#ffd23f' : '#9aa3ad', cu[5] === 1 ? 6 : 3);
    for (const m of G.ms || []) dot(m[2], m[3], '#ff8a3d', 7);
    if ((G.tel || 0) > 0) dot(ST.tel.x, ST.tel.z, '#ff5a5f', 7);
    if (G.ov?.[0] === 2) dot(ST.four.x, ST.four.z, '#ff8a3d', 7);
    for (const it of G.it || []) if (it[5] < 0.7) dot(it[4], it[6], '#ffd23f', 2.5);
    if (alive && role !== 'mgr') for (const n of storeNeeds(G).slice(0, 4)) dot(n.x, n.z, 'rgba(255,255,255,.75)', 3.5);
    if (alive) for (const t of C.tasks) { if (taskLast(t).sab === 'jet') continue; const w = taskWhere(t); dot(w.x, w.z, t.type === 's' ? '#ff4d5a' : '#ffb400', 7); }
    if (alive) OPEN.forEach((o, i) => { if (o.dyn) { x.strokeStyle = opDisp(G, i) ? '#56c271' : '#ff5a5f'; x.lineWidth = 3; x.beginPath(); const b = o.dyn; if (b.x1 - b.x0 > b.z1 - b.z0) { x.moveTo(X(b.x0), Z((b.z0 + b.z1) / 2)); x.lineTo(X(b.x1), Z((b.z0 + b.z1) / 2)); } else { x.moveTo(X((b.x0 + b.x1) / 2), Z(b.z0)); x.lineTo(X((b.x0 + b.x1) / 2), Z(b.z1)); } x.stroke(); } });
    if (alive && role === 'mgr') dot(ST.cams.x, ST.cams.z, '#a27bff', 7);
    x.save(); x.translate(X(ME.x), Z(ME.z)); x.rotate(-ME.ry); x.fillStyle = '#12e0b0'; x.strokeStyle = '#fff'; x.lineWidth = 2.5; x.beginPath(); x.moveTo(0, 13); x.lineTo(8, -8); x.lineTo(0, -3); x.lineTo(-8, -8); x.closePath(); x.fill(); x.stroke(); x.restore();
    x.fillStyle = 'rgba(255,255,255,.9)'; x.font = '600 20px Fredoka, sans-serif'; x.fillText(zoneAt(ME.x, ME.z)?.name || '', 12, Hd - 12);
  },
};

// ======================= MINI-JEUX =======================
const MG = {
  active: false, kind: null, cand: null, cb: null, st: null, el: null,
  open(kind, title, data, cand, cb) {
    this.active = true; this.kind = kind; this.cand = cand; this.cb = cb; this.st = { ...data, t: 0 };
    const el = $('#mg'); el.classList.remove('hidden'); $('#mgTitle').textContent = title; $('#mgHint').textContent = ''; this.el = $('#mgBody'); this.el.innerHTML = '';
    this['init_' + kind](this.st); SFX.play('tick');
  },
  close(ok, extra) { if (!this.active) return; this.active = false; $('#mg').classList.add('hidden'); const cb = this.cb; this.cb = null; this.cand = null; if (ok !== null && cb) cb(ok, extra); },
  done(ok, extra) { const cb = this.cb; this.active = false; $('#mg').classList.add('hidden'); this.cb = null; this.cand = null; if (cb) cb(ok, extra); },
  shake() { const p = $('#mgPanel'); p.classList.remove('shake'); void p.offsetWidth; p.classList.add('shake'); SFX.play('err'); },
  key(e) {
    e.preventDefault(); if (e.repeat && this.kind !== 'mash') return;
    if (e.code === 'Escape') { this.close(null); return; }
    const f = this['key_' + this.kind]; if (f) f.call(this, e);
  },
  update(dt) { if (!this.active) return; this.st.t += dt; const f = this['upd_' + this.kind]; if (f) f.call(this, dt); },
  // ---- encaisser : scanner chaque article puis payer
  init_scan(s) {
    s.items = shuffle(['🍎', '🥖', '🧀', '🥫', '🍫', '🧃', '🥚', '🧻', '🍝', '🥛', '🍌', '🧴', '🍕', '🥦']).slice(0, rndi(4, 6)); s.done = 0;
    $('#mgHint').textContent = 'Clique chaque article (ou Espace) pour le scanner, puis encaisse (Entrée).';
    this.el.innerHTML = `<div class="mg-belt">${s.items.map((it, i) => `<button class="mg-item" data-i="${i}">${it}</button>`).join('')}</div><div class="mg-row"><div class="mg-screen" id="mgScreen">0,00 €</div><button id="mgPay" class="orange" disabled>💳 Encaisser</button></div>`;
    this.el.querySelectorAll('.mg-item').forEach((b) => (b.onclick = () => this.scanOne(+b.dataset.i)));
    $('#mgPay').onclick = () => { if (s.done >= s.items.length) { SFX.play('cash'); this.done(true); } };
    s.total = 0;
  },
  scanOne(i) { const s = this.st; const b = this.el.querySelector(`.mg-item[data-i="${i}"]`); if (!b || b.classList.contains('ok')) return; b.classList.add('ok'); s.done++; s.total += rnd(0.5, 6); $('#mgScreen').textContent = s.total.toFixed(2).replace('.', ',') + ' €'; SFX.play('bip'); if (s.done >= s.items.length) $('#mgPay').disabled = false; },
  key_scan(e) { const s = this.st; if (e.code === 'Space') { const i = [...this.el.querySelectorAll('.mg-item')].findIndex((b) => !b.classList.contains('ok')); if (i >= 0) this.scanOne(i); } if ((e.code === 'Enter' || e.code === 'KeyE') && s.done >= s.items.length) { SFX.play('cash'); this.done(true); } },
  // ---- trier : retirer les fruits avec des bestioles
  init_sort(s) {
    const fr = ['🍎', '🍊', '🍋', '🍐', '🍇', '🍓', '🥝', '🍑', '🥕', '🥦', '🍅', '🍆']; s.bad = new Set(shuffle([...Array(9).keys()]).slice(0, 3)); s.left = 3;
    $('#mgHint').textContent = 'Retire les fruits & légumes envahis par les bestioles 🐛 (clic).';
    this.el.innerHTML = `<div class="mg-grid">${[...Array(9).keys()].map((i) => `<button class="mg-item big" data-i="${i}">${pick(fr)}${s.bad.has(i) ? '<span class="bug">🐛</span>' : ''}</button>`).join('')}</div>`;
    this.el.querySelectorAll('.mg-item').forEach((b) => (b.onclick = () => { const i = +b.dataset.i; if (b.classList.contains('ok')) return; if (s.bad.has(i)) { b.classList.add('ok', 'gone'); SFX.play('pick'); if (--s.left <= 0) this.done(true); } else this.shake(); }));
  },
  // ---- timing : arrêter l'aiguille dans la zone verte
  init_timing(s) {
    s.need = s.hits || 3; s.got = 0; s.zone = rnd(0.15, 0.7); s.w = 0.17; s.speed = rnd(1.1, 1.5);
    $('#mgHint').textContent = 'Appuie sur E / Espace (ou clique) quand le curseur est dans la zone verte.';
    this.el.innerHTML = `<div class="mg-bar"><div class="mg-zone" id="mgZone"></div><div class="mg-needle" id="mgNeedle"></div></div><div class="mg-row"><div id="mgHits" class="mg-hits"></div><button id="mgStop" class="orange">STOP !</button></div>`;
    $('#mgStop').onclick = () => this.hitTiming(); this.drawTiming();
  },
  drawTiming() { const s = this.st; $('#mgZone').style.left = s.zone * 100 + '%'; $('#mgZone').style.width = s.w * 100 + '%'; $('#mgHits').textContent = '●'.repeat(s.got) + '○'.repeat(s.need - s.got); },
  upd_timing() { const s = this.st; s.pos = (Math.sin(s.t * s.speed * Math.PI) + 1) / 2; const n = $('#mgNeedle'); if (n) n.style.left = s.pos * 100 + '%'; },
  hitTiming() { const s = this.st; if (s.pos >= s.zone && s.pos <= s.zone + s.w) { s.got++; SFX.play('bip'); if (s.got >= s.need) { this.done(true); return; } s.zone = rnd(0.1, 0.72); s.speed += 0.25; this.drawTiming(); } else this.shake(); },
  key_timing(e) { if (e.code === 'KeyE' || e.code === 'Space') this.hitTiming(); },
  // ---- code : recopier le code article
  init_code(s) {
    s.code = String(rndi(1000, 9999)); s.typed = '';
    $('#mgHint').textContent = 'Recopie le code de l’étiquette (clavier ou pavé).';
    this.el.innerHTML = `<div class="mg-code">📦 Code article : <b>${s.code.split('').join(' ')}</b></div><div class="mg-screen big" id="mgTyped">_ _ _ _</div><div class="mg-pad">${[1, 2, 3, 4, 5, 6, 7, 8, 9, 0].map((d) => `<button class="ghost" data-d="${d}">${d}</button>`).join('')}</div>`;
    this.el.querySelectorAll('[data-d]').forEach((b) => (b.onclick = () => this.typeDigit(b.dataset.d)));
  },
  typeDigit(d) { const s = this.st; if (s.code[s.typed.length] === d) { s.typed += d; SFX.play('bip'); } else { s.typed = ''; this.shake(); } $('#mgTyped').textContent = (s.typed + '____').slice(0, 4).split('').join(' '); if (s.typed === s.code) this.done(true); },
  key_code(e) { const m = /^(Digit|Numpad)(\d)$/.exec(e.code); if (m) this.typeDigit(m[2]); },
  // ---- quiz : renseigner un client
  init_quiz(s) {
    $('#mgHint').textContent = 'Indique-lui le bon rayon. Une mauvaise réponse le fait partir fâché !';
    this.el.innerHTML = `<div class="mg-bubble">🙋 « Bonjour ! Je cherche <b>${esc(s.product)}</b>, c’est où ? »</div><div class="mg-opts">${s.opts.map((o) => `<button class="ghost" data-o="${o}">Rayon ${esc(SHELF_NAMES[o])}</button>`).join('')}</div>`;
    this.el.querySelectorAll('[data-o]').forEach((b) => (b.onclick = () => this.done(+b.dataset.o === s.answer)));
  },
  key_quiz(e) { const m = /^(Digit|Numpad)([1-3])$/.exec(e.code); if (m) { const o = this.st.opts[+m[2] - 1]; if (o !== undefined) this.done(o === this.st.answer); } },
  // ---- choix : fausse annonce au micro
  init_choose(s) {
    $('#mgHint').textContent = 'Choisis ta fausse annonce. Tout le magasin va l’entendre… 😈';
    this.el.innerHTML = `<div class="mg-opts col">${s.opts.map((i, k) => `<button class="ghost" data-a="${i}">${k + 1}. 📢 ${esc(ANNOUNCES[i])}</button>`).join('')}</div>`;
    this.el.querySelectorAll('[data-a]').forEach((b) => (b.onclick = () => this.done(true, +b.dataset.a)));
  },
  key_choose(e) { const m = /^(Digit|Numpad)([1-3])$/.exec(e.code); if (m) { const i = this.st.opts[+m[2] - 1]; if (i !== undefined) this.done(true, i); } },
  // ---- frotter : marteler E
  init_mash(s) {
    s.v = 0; $('#mgHint').textContent = 'Frotte ! Appuie très vite sur E ou Espace (ou clique).';
    this.el.innerHTML = `<div class="mg-mash" id="mgMash">🧽</div><div class="mg-bar"><div class="mg-fill" id="mgFill"></div></div>`;
    $('#mgMash').onclick = () => this.mash();
  },
  mash() { const s = this.st; s.v = Math.min(1, s.v + 0.1); SFX.play('scrub'); const m = $('#mgMash'); m.style.transform = `rotate(${rnd(-25, 25)}deg) scale(1.1)`; if (s.v >= 1) this.done(true); },
  upd_mash(dt) { const s = this.st; s.v = Math.max(0, s.v - dt * 0.06); const f = $('#mgFill'); if (f) f.style.width = s.v * 100 + '%'; },
  key_mash(e) { if (e.code === 'KeyE' || e.code === 'Space') { if (!e.repeat) this.mash(); } },
};
