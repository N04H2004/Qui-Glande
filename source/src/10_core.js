// ======================= CORE : utilitaires, carte, stations, navigation =======================
const DBG = {}; window.__qg = DBG;
const $ = (s) => document.querySelector(s);
const clamp = (v, a, b) => (v < a ? a : v > b ? b : v);
const lerp = (a, b, t) => a + (b - a) * t;
const rnd = (a, b) => a + Math.random() * (b - a);
const rndi = (a, b) => Math.floor(rnd(a, b + 1));
const pick = (a) => a[Math.floor(Math.random() * a.length)];
const shuffle = (a) => { for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; };
const r2 = (v) => Math.round(v * 100) / 100;
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const uid = (n = 6) => { let s = ''; const c = 'abcdefghijkmnpqrstuvwxyz23456789'; for (let i = 0; i < n; i++) s += c[Math.floor(Math.random() * c.length)]; return s; };
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const fmtT = (s) => { s = Math.max(0, Math.ceil(s)); return Math.floor(s / 60) + ':' + String(s % 60).padStart(2, '0'); };
const angLerp = (a, b, t) => { const d = ((((b - a + Math.PI) % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI)) - Math.PI; return a + d * t; };
const cleanText = (s, max = 80) => String(s ?? '').replace(/[\u0000-\u001f\u007f-\u009f­​-‏‪-‮⁠-⁤﻿-]/g, '').trim().slice(0, max);
const hash = (s) => { let h = 2166136261; for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); } return h >>> 0; };

const SHIRTS = ['#ff5a5f', '#ffb400', '#3ec1d3', '#56c271', '#9b6bff', '#ff7ac6', '#2d7dd2', '#f97f51', '#16a085', '#f2f2f2', '#3d3d4e', '#b6e33b'];
const SKINS = ['#ffdcbf', '#f2bf91', '#c98d62', '#8c5a3c', '#5e3b26'];
const HAIRS = ['#6b4423', '#2b1d14', '#e8b04a', '#b5482f', '#1a1a1a'];
const HATS = ['Aucun', 'Casquette', 'Bonnet', 'Chapeau de paille', 'Toque', 'Couronne', 'Bob', 'Antennes'];
const ACCS = ['Aucun', 'Lunettes de soleil', 'Moustache', 'Nœud pap', 'Casque audio', 'Lunettes rondes'];
const HAT_EMOJI = ['🙂', '🧢', '🧶', '👒', '👨‍🍳', '👑', '🎩', '👽'];
const BOT_NAMES = ['Jean-Mi', 'Sandrine', 'Mamadou', 'Nadia', 'Dédé', 'Josiane', 'Bryan', 'Fatou', 'Gégé', 'Yasmine', 'Ludo', 'Paulette', 'Sofiane', 'Chantal'];
const ROLE_INFO = {
  mgr: { name: 'DIRECTEUR', emoji: '👔', color: '#ffc83d', desc: "Trouve les glandeurs et vire-les (F). Vire quelqu'un avant la fin du quota, sinon c'est toi qui sautes !" },
  emp: { name: 'EMPLOYÉ', emoji: '😇', color: '#3ee0a1', desc: 'Fais tes 3 tâches, et pour le reste, aide le magasin comme tu veux pour pousser la productivité à 100 %. Ouvre l’œil !' },
  gla: { name: 'GLANDEUR', emoji: '😴', color: '#ff6b6b', desc: 'Fais couler la productivité à 0 % sans te faire virer. Sabote en douce, fais semblant de bosser.' },
};
const SHELF_NAMES = ['Biscuits', 'Céréales', 'Pâtes & riz', 'Conserves', 'Boissons', 'Sodas', 'Hygiène', 'Entretien', 'Frais', 'Surgelés'];
const GOND_X = [-14, -9, -4, 1];
const CHECKOUTS = [-14, -9, -4];
const CARRY = { carton: 1, frais: 2, caddie: 3, sac: 4, affiche: 5, produit: 6 };
const CARRY_NAMES = ['', 'un carton', 'une caisse de produits frais', 'un caddie', 'un sac poubelle', 'une affiche promo', 'un produit'];
const CAT_NAMES = [...SHELF_NAMES, 'Boisson fraîche'];
const PROD_NAMES = [['Cookies choco', 'Petits beurres', 'Madeleines', 'Sablés', 'Gaufrettes'], ['Corn flakes', 'Muesli', 'Pétales choco', 'Granola'], ['Spaghettis', 'Coquillettes', 'Riz basmati', 'Penne', 'Riz long'], ['Petits pois', 'Thon', 'Cassoulet', 'Raviolis', 'Maïs'], ['Eau minérale', "Jus d'orange", 'Eau pétillante', 'Thé glacé'], ['Cola', 'Limonade', 'Soda orange', 'Tonic'], ['Shampoing', 'Dentifrice', 'Gel douche', 'Déodorant'], ['Lessive', 'Liquide vaisselle', 'Javel', 'Nettoyant vitres'], ['Yaourts', 'Lait', 'Beurre', 'Fromage blanc', 'Crème fraîche'], ['Frites surgelées', 'Pizza surgelée', 'Glace vanille', 'Poisson pané'], ['Canette fraîche', 'Soda glacé', 'Eau fraîche', 'Limonade glacée']];
const PROD_ICON = ['🍪', '🥣', '🍝', '🥫', '💧', '🥤', '🧴', '🧽', '🥛', '🧊', '🥤'];
// formes de produits : b = boîte [l, h, p] · c = cylindre [rayon, h]
const PTYPE = { box: ['b', 0.24, 0.34, 0.2], tall: ['b', 0.26, 0.44, 0.11], pack: ['b', 0.28, 0.13, 0.2], bag: ['b', 0.25, 0.32, 0.12], tub: ['b', 0.28, 0.16, 0.24], milk: ['b', 0.15, 0.3, 0.15], flat: ['b', 0.32, 0.08, 0.24], can: ['c', 0.1, 0.26], can2: ['c', 0.13, 0.15], bottle: ['c', 0.085, 0.38], jug: ['c', 0.12, 0.36], tube: ['c', 0.055, 0.22], spray: ['c', 0.07, 0.32] };
const CAT_GEO = [['box', 'pack'], ['tall', 'box'], ['bag', 'box'], ['can', 'can2'], ['bottle', 'jug'], ['can', 'bottle'], ['bottle', 'tube'], ['jug', 'spray'], ['tub', 'milk'], ['flat', 'flat'], ['can', 'bottle']];
const slotVar = (si, slot, cols) => ((Math.floor((slot % cols) / 2) + Math.floor(slot / cols)) % CAT_GEO[si].length) * 4 + ((slot * 3 + si) % 4);
const ptypeOf = (cat, v) => CAT_GEO[cat][(v >> 2) % CAT_GEO[cat].length];
const prodName = (cat, v) => PROD_NAMES[cat][(v * 7 + cat) % PROD_NAMES[cat].length];
function prodHH(cat, v, lying) { const T = PTYPE[ptypeOf(cat, v)]; if (T[0] === 'c') return lying ? T[1] : T[2] / 2; return lying ? T[3] / 2 : T[2] / 2; }
const ITEM_MAX = 36;
const TUNE = { sabCd: 14, placeGain: 0.24, floorDrain: 0.025, needDrain: 0.008, coldDrain: 0.1, quota: 150, day: 600, meetCd: 60, meetTalk: 45, meetDec: 15, startProd: 50, deplete: 11, messDrain: 0.12, emptyDrain: 0.22, pSpeed: 4.6, bSpeed: 3.4, maxPuddles: 3, startStock: 2, kE: 1.7, maxCust: 7, custEvery: 7, patienceQ: 55, patienceH: 45 };
const ANNOUNCES = [
  "Promo flash : un pack d'eau acheté = douze offerts !! 💦",
  'Le magasin ferme dans 2 minutes, courez vers les caisses ! (c’est faux)',
  "Le petit Théo attend sa maman à l'accueil depuis 3 heures.",
  'Toutes les caisses sont gratuites aujourd’hui ! 🎁',
  'Le directeur est demandé d’urgence… au rayon couches.',
  'Dégustation de fromage qui sent très fort au rayon Frais 🧀',
  'Concours de la plus longue file d’attente en caisse 2 ! 🏆',
  'Un chat a été aperçu au rayon croquettes. Il est le nouveau directeur. 🐱',
  'Musique ! Tout le monde danse au rayon Surgelés ! 🕺',
];
const QUIZ = [['les spaghettis', 2], ['le muesli', 1], ['les cookies', 0], ['le cassoulet en boîte', 3], ["l'eau pétillante", 4], ['le cola', 5], ['le shampoing', 6], ['la lessive', 7], ['les yaourts', 8], ['les glaces', 9], ['les madeleines', 0], ['le riz basmati', 2], ['le thon en boîte', 3], ["le jus d'orange", 4], ['le dentifrice', 6], ["l'éponge", 7], ['le beurre', 8], ['les corn flakes', 1], ['la limonade', 5], ['les frites surgelées', 9]];

// ---------- Carte ----------
const BOXES = []; const DOORS = [];
function addBox(x0, x1, z0, z1, h, kind, t, extra) { const b = { x0: Math.min(x0, x1), x1: Math.max(x0, x1), z0: Math.min(z0, z1), z1: Math.max(z0, z1), h, kind, t, ...(extra || {}) }; BOXES.push(b); return b; }
const WT = 0.3, WH = 4;
function hWall(z, x0, x1, gaps = [], kind = 'wall') {
  let cur = x0;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) { if (a > cur) addBox(cur, a, z - WT / 2, z + WT / 2, WH, kind, 'wall'); if (kind === 'wall') DOORS.push({ x0: a, x1: b, z0: z - WT / 2, z1: z + WT / 2 }); cur = b; }
  if (cur < x1) addBox(cur, x1, z - WT / 2, z + WT / 2, WH, kind, 'wall');
}
function vWall(x, z0, z1, gaps = [], kind = 'wall') {
  let cur = z0;
  for (const [a, b] of [...gaps].sort((p, q) => p[0] - q[0])) { if (a > cur) addBox(x - WT / 2, x + WT / 2, cur, a, WH, kind, 'wall'); if (kind === 'wall') DOORS.push({ x0: x - WT / 2, x1: x + WT / 2, z0: a, z1: b }); cur = b; }
  if (cur < z1) addBox(x - WT / 2, x + WT / 2, cur, z1, WH, kind, 'wall');
}
const ZONES = [
  { id: 'vente', name: 'Surface de vente', x0: -20, x1: 20, z0: -6, z1: 14, color: '#f4efe4' },
  { id: 'reserve', name: 'Réserve', x0: -20, x1: -6, z0: -14, z1: -6, color: '#b9b4ab' },
  { id: 'froide', name: 'Chambre froide', x0: -6, x1: 1, z0: -14, z1: -6, color: '#cfe7f5' },
  { id: 'pause', name: 'Salle de pause', x0: 1, x1: 10, z0: -14, z1: -6, color: '#e7c9a0' },
  { id: 'bureau', name: 'Bureau du directeur', x0: 10, x1: 20, z0: -14, z1: -6, color: '#9fb5d9' },
  { id: 'parking', name: 'Parking', x0: -20.6, x1: 20.6, z0: 14, z1: 22.6, color: '#5d6168', outdoor: true },
  { id: 'quai', name: 'Quai de livraison', x0: -26.6, x1: -20, z0: -14, z1: -6.4, color: '#8f9298', outdoor: true },
];
function zoneAt(x, z) { for (const zn of ZONES) if (x >= zn.x0 && x <= zn.x1 && z >= zn.z0 && z <= zn.z1) return zn; return null; }
const insideStore = (x, z) => x > -20 && x < 20 && z > -14 && z < 14;
const PALMS = [[-17.5, 15.4], [-8, 15.4], [4, 15.4], [19.2, 15.6]];

(function buildMap() {
  hWall(-14, -20.15, 20.15);
  vWall(-20, -14, 14, [[-12, -9]]);
  vWall(20, -14, 14);
  hWall(14, -20.15, 20.15, [[10, 16]]);
  hWall(-6, -20, 20, [[-14, -10], [-3.5, -1.5], [2, 4], [18, 19.6]]);
  vWall(-6, -14, -6); vWall(1, -14, -6); vWall(10, -14, -6);
  hWall(22.6, -20.6, 20.6, [], 'inv'); vWall(-20.6, 14, 22.6, [], 'inv'); vWall(20.6, 14, 22.6, [], 'inv');
  hWall(-14, -26.6, -20.15, [], 'inv'); hWall(-6.4, -26.6, -20, [], 'inv'); vWall(-26.6, -14, -6.4, [], 'inv');
  // surface de vente
  GOND_X.forEach((x, i) => addBox(x - 0.6, x + 0.6, -3, 5, 2.1, 'fix', 'gondola', { i }));
  addBox(18.3, 20, -4, 6, 2.4, 'fix', 'fridge');
  addBox(6, 10.8, -5.85, -4.7, 1.1, 'fix', 'butcher');
  addBox(11.8, 14.6, -5.85, -4.7, 1.1, 'fix', 'bakery');
  addBox(14.6, 16.4, -5.85, -4.75, 2.0, 'fix', 'oven');
  CHECKOUTS.forEach((c, i) => addBox(c - 0.45, c + 0.45, 8.6, 11.6, 0.95, 'fix', 'checkout', { i }));
  addBox(2, 6.5, 10.4, 11.4, 1.1, 'fix', 'desk');
  addBox(7.2, 8.8, 1.7, 3.3, 1.5, 'fix', 'pyramid');
  addBox(11.8, 13.2, -1.6, -0.6, 1.0, 'fix', 'sampler');
  addBox(12, 17, 4, 6.5, 0.9, 'fix', 'produce');
  addBox(4.2, 5.6, -2.5, 4.0, 0.9, 'fix', 'freezer');
  addBox(9.4, 10.8, 5.6, 7.0, 1.2, 'fix', 'water');
  addBox(17.6, 19.6, 8.5, 11.5, 0.9, 'fix', 'flowers');
  addBox(-19.6, -18.3, 11.0, 12.6, 1.0, 'fix', 'bins');
  addBox(10.2, 10.45, 12.9, 13.5, 1.5, 'fix', 'gate'); addBox(15.55, 15.8, 12.9, 13.5, 1.5, 'fix', 'gate');
  addBox(16.6, 17.3, 12.5, 13.2, 0.8, 'fix', 'baskets');
  for (const [x, z] of [[-19.3, -5.3], [19.3, 7.6], [-19.3, 13.3], [6.9, 13.3]]) addBox(x - 0.3, x + 0.3, z - 0.3, z + 0.3, 1.2, 'fix', 'plant');
  // réserve
  addBox(-18.6, -16, -9.2, -6.8, 1.7, 'fix', 'cartons');
  addBox(-19.6, -7, -13.85, -12.9, 3.0, 'fix', 'rack');
  addBox(-10.5, -7.5, -10.5, -8.6, 1.2, 'fix', 'pallet');
  addBox(-7.9, -6.6, -12.4, -11.3, 1.5, 'fix', 'roll');
  // chambre froide
  addBox(-5.7, -3.6, -13.85, -11.5, 1.6, 'fix', 'crates');
  addBox(-1.3, 0.7, -13.85, -12.4, 0.5, 'fix', 'napcrates');
  addBox(-3.4, -1.9, -13.85, -12.7, 1.2, 'fix', 'surgcrates');
  addBox(-5.85, -5.3, -10.6, -6.8, 1.8, 'fix', 'coldshelf');
  // salle de pause
  addBox(4.4, 7.6, -11.2, -9.2, 0.75, 'fix', 'table');
  addBox(8.6, 9.7, -13.85, -13.0, 1.6, 'fix', 'coffee');
  addBox(4.5, 7.2, -13.85, -13.1, 0.95, 'fix', 'kitchen');
  addBox(1.3, 2.6, -13.85, -13.2, 2.0, 'fix', 'vending');
  addBox(1.2, 2.2, -11.4, -8.4, 0.8, 'fix', 'sofa');
  addBox(8.7, 9.7, -7.7, -6.5, 1.9, 'fix', 'arcade');
  addBox(9.25, 9.85, -11.6, -8.6, 2.0, 'fix', 'lockers');
  // bureau
  addBox(12.6, 16.6, -13.2, -12.2, 0.8, 'fix', 'officedesk');
  addBox(18.9, 19.8, -13.8, -9, 1.4, 'fix', 'cabinets');
  addBox(10.4, 11.4, -9.2, -8.2, 1.1, 'fix', 'printer');
  addBox(10.4, 11.3, -13.8, -12.9, 1.0, 'fix', 'safe');
  addBox(-19.85, -19.05, -1.2, 3.2, 2.2, 'fix', 'drinkfridge');
  addBox(-6.85, -6.15, -8.4, -7.0, 2.1, 'fix', 'closet');
  // quai & parking
  addBox(-26.4, -24, -13.6, -7.6, 3.2, 'fix', 'truck');
  addBox(-14, -10, 19.5, 21, 1.0, 'fix', 'abri');
  addBox(-19.8, -17.6, 20.8, 22.4, 1.5, 'fix', 'benne');
  addBox(-7.2, -5, 18.4, 22.2, 1.4, 'fix', 'car', { c: '#ff5a5f' });
  addBox(8.4, 10.6, 18, 21.8, 1.4, 'fix', 'car', { c: '#3a86ff' });
  addBox(15.8, 18.0, 18.4, 22.2, 1.4, 'fix', 'car', { c: '#ffd23f' });
  for (const [x, z] of PALMS) addBox(x - 0.25, x + 0.25, z - 0.25, z + 0.25, 4, 'fix', 'palm');
})();

// ---------- Stations ----------
const ST = {};
function S(id, x, z, label, kind, hold, ex = {}) { ST[id] = { id, x, z, label, kind, hold, ...ex }; }
CHECKOUTS.forEach((c, i) => S('caisse' + i, c + 1.15, 10.1, 'Encaisser à la caisse ' + (i + 1), 'w', 5, { gain: 1, mg: 'scan', short: 'Caisse ' + (i + 1), ck: i }));
GOND_X.forEach((x, i) => {
  for (const k of [0, 1]) { const si = i * 2 + k; S('rayon' + si, x + (k ? 1.35 : -1.35), 1, 'Remplir le rayon ' + SHELF_NAMES[si], 'w', 3, { gain: 0.8, needs: 'carton', shelf: si, place: true, short: 'Rayon ' + SHELF_NAMES[si] }); }
  S('promo' + i, x, 5.75, "Poser l'affiche promo", 'w', 2, { gain: 1.8, needs: 'affiche', short: 'Tête de gondole ' + (i + 1) });
});
S('frais', 17.3, 1, 'Remplir le rayon Frais', 'w', 3, { gain: 0.8, needs: 'frais', shelf: 8, place: true, short: 'Rayon Frais' });
S('surgeles', 6.25, 0.75, 'Remplir les Surgelés', 'w', 3, { gain: 0.8, needs: 'frais', shelf: 9, place: true, short: 'Surgelés' });
S('fruits', 14.5, 3.3, 'Trier les fruits & légumes', 'w', 4, { gain: 1.6, mg: 'sort', short: 'Fruits & légumes' });
S('boucherie', 8.4, -4.05, 'Découper la viande', 'w', 5, { gain: 1.6, mg: 'timing', short: 'Boucherie' });
S('boulange', 13.2, -4.05, 'Garnir le présentoir à pain', 'w', 4, { gain: 1.4, short: 'Boulangerie' });
S('camion', -22.6, -10.5, 'Décharger le camion', 'w', 5, { gain: 2, short: 'Quai de livraison' });
S('abri', -12, 18.6, "Ranger le caddie à l'abri", 'w', 2, { gain: 1.8, needs: 'caddie', short: 'Abri caddies' });
S('benne', -18.5, 19.9, 'Jeter le sac dans la benne', 'w', 2, { gain: 1.8, needs: 'sac', short: 'Benne (parking)' });
S('inventaire', -9, -8.05, "Faire l'inventaire", 'w', 4, { gain: 1.6, mg: 'code', short: 'Réserve (palette)' });
S('eau', 10.1, 7.65, "Remonter les packs d'eau", 'w', 4, { gain: 1.4, short: "Palette d'eau" });
S('fleurs', 16.95, 10, 'Arroser les fleurs', 'w', 3, { gain: 1.2, short: 'Stand fleurs' });
for (let i = 0; i < 8; i++) S('carton' + i, -18.9 + i * 1.5, -12.2, 'Prendre un carton : ' + SHELF_NAMES[i], 'pk', 0.6, { gives: 'carton', cat: i, short: 'Réserve' });
S('crate8', -4.65, -10.75, 'Prendre une caisse : Frais', 'pk', 0.6, { gives: 'frais', cat: 8, short: 'Chambre froide' });
S('crate9', -2.65, -12.0, 'Prendre une caisse : Surgelés', 'pk', 0.6, { gives: 'frais', cat: 9, short: 'Chambre froide' });
S('trash_pick', -17.6, 11.8, 'Sortir le sac poubelle', 'pk', 1.5, { gives: 'sac', short: 'Poubelles (caisses)' });
S('imprimante', 11.95, -8.7, 'Imprimer une affiche promo', 'pk', 2.5, { gives: 'affiche', short: 'Imprimante (bureau)' });
[[5, 18], [-2, 20.2], [14.5, 20.6]].forEach(([x, z], i) => S('caddie' + i, x, z, 'Récupérer le caddie', 'pk', 1, { gives: 'caddie', short: 'Parking' }));
S('pyramide', 8, 4.15, 'Faire tomber la pyramide de conserves', 's', 2.5, { dmg: 3.5, short: 'Pyramide de conserves' });
S('lait', 17.3, -2.8, 'Renverser une bouteille de lait', 's', 2, { dmg: 2.5, short: 'Rayon Frais' });
S('sieste', -0.25, -11.65, 'Faire la sieste en chambre froide', 's', 7, { dmg: 4, short: 'Chambre froide' });
S('echant', 12.5, 0.15, 'Goûter tous les échantillons', 's', 4, { dmg: 2.5, short: 'Stand dégustation' });
S('micro', 5.4, 9.6, 'Faire une fausse annonce au micro', 's', 2, { dmg: 2, mg: 'choose', short: 'Accueil' });
S('arcade', 8.0, -7.1, "Jouer à la borne d'arcade", 's', 6, { dmg: 3.5, short: 'Salle de pause' });
S('microondes', 5.8, -12.45, 'Faire exploser un plat au micro-ondes', 's', 2, { dmg: 2.5, short: 'Salle de pause' });
S('congel', 6.25, -1.8, 'Débrancher le congélateur', 's', 2.5, { dmg: 3, short: 'Surgelés' });
S('four', 15.5, -4.05, 'Four à pain', 'e', 2, { short: 'Boulangerie' });
S('tel', 2.9, 9.6, 'Répondre au téléphone', 'e', 2, { gain: 2, short: 'Accueil' });
S('cafe', 9.15, -12.35, 'Pause café', 'p', 4, { mg: 'timing', short: 'Salle de pause' });
S('cams', 14.6, -11.45, 'Regarder les caméras', 'm', 0, { short: 'Bureau' });
// ---------- Besoins du magasin (jeu libre : personne n'impose de tâche) ----------
const JOBS = [
  { id: 'fruits', st: ['fruits'], rate: 1 / 105, txt: 'Fruits & légumes à trier', icon: '🍎' },
  { id: 'boucherie', st: ['boucherie'], rate: 1 / 120, txt: 'Viande à découper (boucherie)', icon: '🥩' },
  { id: 'boulange', st: ['boulange'], rate: 1 / 112, txt: 'Présentoir à pain vide', icon: '🥖' },
  { id: 'camion', st: ['camion'], rate: 1 / 135, txt: 'Camion à décharger (quai, derrière le rideau)', icon: '🚚' },
  { id: 'inventaire', st: ['inventaire'], rate: 1 / 165, txt: 'Inventaire à faire (réserve)', icon: '📋' },
  { id: 'eau', st: ['eau'], rate: 1 / 135, txt: "Packs d'eau à remonter", icon: '💧' },
  { id: 'fleurs', st: ['fleurs'], rate: 1 / 150, txt: 'Fleurs à arroser', icon: '🌷' },
  { id: 'caddies', st: ['abri'], rate: 1 / 105, txt: 'Caddies abandonnés sur le parking', icon: '🛒' },
  { id: 'poubelles', st: ['benne'], rate: 1 / 120, txt: 'Poubelles pleines (près des caisses)', icon: '🗑️' },
  { id: 'promo', st: ['promo0', 'promo1', 'promo2', 'promo3'], rate: 1 / 135, txt: 'Affiches promo à renouveler (imprimante du bureau)', icon: '🖨️' },
];
JOBS.forEach((j, k) => j.st.forEach((id) => (ST[id].job = k)));
const SAB_IDS = ['pyramide', 'lait', 'sieste', 'echant', 'micro', 'arcade', 'microondes', 'congel', 'four'];
function sabValid(id, G) {
  const ms = G?.ms || []; const has = (t) => ms.some((m) => m[1] === t);
  if (id === 'pyramide') return !G?.py; if (id === 'lait') return ms.filter((m) => m[1] === 'lait').length < TUNE.maxPuddles;
  if (id === 'microondes') return !has('smoke'); if (id === 'congel') return !has('melt'); if (id === 'four') return (G?.ov?.[0] ?? 0) !== 3;
  return true;
}
const MESS = {
  pyr: { clean: 'Remonter la pyramide de conserves', hold: 5, mg: 'mash', name: 'Pyramide renversée', icon: '🥫' },
  lait: { clean: 'Nettoyer la flaque', hold: 3, mg: 'mash', name: 'Flaque de lait', icon: '🥛' },
  tag: { clean: 'Remettre les étiquettes', hold: 3, name: 'Étiquettes inversées', icon: '🏷️' },
  mix: { clean: 'Remettre les produits en place', hold: 3, name: 'Produits mélangés', icon: '🔀' },
  smoke: { clean: 'Nettoyer le micro-ondes', hold: 4, mg: 'mash', name: 'Micro-ondes explosé', icon: '💥' },
  melt: { clean: 'Rebrancher le congélateur', hold: 2, name: 'Congélateur débranché', icon: '🧊' },
  burn: { clean: 'Jeter le pain brûlé', hold: 3, name: 'Pain brûlé (four)', icon: '🔥' },
};
const PUDDLES = [[-11.5, -1], [-6.5, 3], [-1.5, -2], [3.0, 4.4], [15, -2.2], [16, 2.4], [7.6, 6.6], [-16.6, 6]];
const SEATS = [[4.8, -11.8], [6, -11.8], [7.2, -11.8], [4.8, -8.6], [6, -8.6], [7.2, -8.6], [3.8, -10.6], [3.8, -9.8], [8.2, -10.6], [8.2, -9.8], [3.8, -11.6], [8.2, -11.6]];
const TABLE_C = [6, -10.2];
const SPAWNS = []; for (let i = 0; i < 12; i++) SPAWNS.push([-16 + (i % 6) * 2.6, 6.6 + Math.floor(i / 6) * 1.3]);
const PATROL = [[-11.5, 0], [-6.5, 1], [-1.5, 0], [3, 0], [7, -1], [10, 1], [15, 1.5], [-8, 7.4], [4, 7.4], [-13, -9.5], [-2.5, -9], [6, -7.6], [14, -9.5], [0, 17], [-22.5, -10.5], [12, -3]];
const BROWSE = [[-16.6, -1], [-16.6, 3], [-11.5, -1.5], [-11.5, 3], [-6.5, -1.5], [-6.5, 3], [-1.5, -1.5], [-1.5, 3], [3, -2], [3, 2.5], [6.6, 4.4], [10.5, 1.5], [16, -1], [16.2, 3], [14.5, 7.4], [9, -3.4], [13.2, -3.3], [17.2, 0.5], [8.6, 7.8]];
const CUST_DOOR = [13, 16.5];
const queueSpot = (k, pos) => [CHECKOUTS[k] - 1.0, 9.6 - pos * 0.85];
const CAMS = [
  { name: 'CAM 1 — Rayons', p: [-19.3, 3.7, -5.4], t: [-2, 0, 4] },
  { name: 'CAM 2 — Caisses', p: [19.4, 3.7, 13.4], t: [-8, 0, 8] },
  { name: 'CAM 3 — Réserve', p: [-6.6, 3.7, -6.6], t: [-15, 0, -11] },
  { name: 'CAM 4 — Chambre froide', p: [0.55, 3.5, -6.5], t: [-3, 0, -12] },
  { name: 'CAM 5 — Boucherie & boulangerie', p: [19.4, 3.7, 3.4], t: [6, 0, -4] },
  { name: 'CAM 6 — Salle de pause', p: [1.4, 3.6, -6.5], t: [7, 0, -11] },
  { name: 'CAM 7 — Parking', p: [19.5, 5, 22.3], t: [-4, 0, 16] },
  { name: 'CAM 8 — Quai', p: [-20.6, 4.5, -6.8], t: [-23, 0, -11] },
];

// ---------- Étagères à emplacements (façon Supermarket Simulator) ----------
const SHELVES = [];
GOND_X.forEach((gx) => { for (const k of [0, 1]) { const sd = k ? 1 : -1; SHELVES.push({ kind: 'gond', side: sd, face: gx + sd * 0.6, prodX: gx + sd * 0.33, levels: [0.34, 0.9, 1.46], cols: 8, z0: -2.5, dz: 1.0, zmin: -3, zmax: 5, per: 3, spread: 0.3 }); } });
SHELVES.push({ kind: 'fridge', side: -1, face: 18.3, prodX: 18.75, levels: [0.32, 0.92, 1.52], cols: 10, z0: -3.5, dz: 1.0, zmin: -4, zmax: 6, per: 3, spread: 0.3 });
SHELVES.push({ kind: 'freezer', rows: [4.6, 5.2], y: 0.55, cols: 8, z0: -2.1, dz: 0.8, per: 2, spread: 0.3 });
// vitrine à boissons fraîches (derrière ses portes vitrées)
SHELVES.push({ kind: 'vitrine', side: 1, face: -19.1, prodX: -19.45, levels: [0.165, 0.765, 1.365], cols: 10, z0: -0.95, dz: 0.43, zmin: -1.15, zmax: 3.15, per: 2, spread: 0.18, ymin: 0.1, ymax: 1.9 });
const SI_VITRINE = 10;
SHELVES.forEach((S2) => { S2.n = (S2.kind === 'freezer' ? 2 : S2.levels.length) * S2.cols; S2.full = (2 ** S2.n - 1) >>> 0; });
const BOX_SIZE = 8;
function slotPos(si, slot) { const S2 = SHELVES[si]; const r = Math.floor(slot / S2.cols), c = slot % S2.cols; if (S2.kind === 'freezer') return [S2.rows[r], S2.y, S2.z0 + c * S2.dz]; return [S2.prodX, S2.levels[r], S2.z0 + c * S2.dz]; }
const popcnt = (m) => { m >>>= 0; let c = 0; while (m) { m &= m - 1; c++; } return c; };
const fillFrac = (mask, si) => popcnt(mask) / SHELVES[si].n;
function nearestEmpty(si, mask, slot) {
  const S2 = SHELVES[si]; let best = -1, bd = 1e9; const r0 = Math.floor(slot / S2.cols), c0 = slot % S2.cols;
  for (let k = 0; k < S2.n; k++) { if ((mask >>> k) & 1) continue; const d = Math.abs(Math.floor(k / S2.cols) - r0) * 1.6 + Math.abs((k % S2.cols) - c0); if (d < bd) { bd = d; best = k; } }
  return best;
}
function shelfHit(o, d) {
  let best = null;
  SHELVES.forEach((S2, si) => {
    let t, x, y, z, slot;
    if (S2.kind === 'freezer') { if (d.y >= -0.05) return; t = (0.92 - o.y) / d.y; x = o.x + d.x * t; z = o.z + d.z * t; y = 0.92; if (x < 4.05 || x > 5.8 || z < -2.6 || z > 4.1) return; slot = (x < 4.9 ? 0 : 1) * S2.cols + clamp(Math.round((z - S2.z0) / S2.dz), 0, S2.cols - 1); }
    else { if (d.x * S2.side >= -0.05) return; t = (S2.face - o.x) / d.x; y = o.y + d.y * t; z = o.z + d.z * t; x = S2.face; if (z < S2.zmin || z > S2.zmax || y < (S2.ymin ?? 0.25) || y > (S2.ymax ?? 2.15)) return; const l = y < S2.levels[1] - 0.02 ? 0 : y < S2.levels[2] - 0.02 ? 1 : 2; slot = l * S2.cols + clamp(Math.round((z - S2.z0) / S2.dz), 0, S2.cols - 1); }
    if (t > 0 && (!best || t < best.t)) best = { si, slot, t, x, y, z };
  });
  return best;
}
function randomMask(si, p) { let m = 0; for (let k = 0; k < SHELVES[si].n; k++) if (Math.random() < p) m |= 1 << k; return m >>> 0; }
function randomBit(mask, set, n = 31) { const idx = []; for (let k = 0; k < n; k++) if (((mask >>> k) & 1) === (set ? 1 : 0)) idx.push(k); return idx.length ? pick(idx) : -1; }

// ---------- Portes, placards, tiroirs (synchronisés par l'hôte : g.op) ----------
// leaf : battant pivotant { h:[x,z] charnière, ry0 fermé, ry1 ouvert, w largeur, hgt, y0, th } ; tiroir : glisse le long de n
const OPEN = []; const DYN = [];
function OP(o) { o.i = OPEN.length; OPEN.push(o); if (o.box) { const [x0, x1, z0, z1] = o.box; o.dyn = { x0, x1, z0, z1, h: 2.9, kind: 'door', t: 'door', on: true, oi: o.i }; DYN.push(o.dyn); } return o; }
const HP = Math.PI / 2;
OP({ type: 'door', name: 'la porte de la réserve', aim: [-12, 1.3, -6], box: [-14, -10, -6.07, -5.93], leaves: [{ h: [-14, -6], ry0: 0, ry1: HP, w: 2, hgt: 2.85, th: 0.08, col: '#8fb0c9', win: 1 }, { h: [-10, -6], ry0: Math.PI, ry1: HP, w: 2, hgt: 2.85, th: 0.08, col: '#8fb0c9', win: 1 }] });
OP({ type: 'door', name: 'la porte de la chambre froide', cold: 1, aim: [-2.5, 1.3, -6], box: [-3.5, -1.5, -6.08, -5.92], leaves: [{ h: [-3.5, -6], ry0: 0, ry1: HP, w: 2, hgt: 2.85, th: 0.16, col: '#eef3f7', cold: 1 }] });
OP({ type: 'door', name: 'la porte de la salle de pause', aim: [3, 1.3, -6], box: [2, 4, -6.06, -5.94], leaves: [{ h: [4, -6], ry0: Math.PI, ry1: HP, w: 2, hgt: 2.85, th: 0.07, col: '#c58b4f', win: 1 }] });
OP({ type: 'door', name: 'la porte du bureau', aim: [18.8, 1.3, -6], box: [18, 19.6, -6.06, -5.94], leaves: [{ h: [19.6, -6], ry0: Math.PI, ry1: HP, w: 1.6, hgt: 2.85, th: 0.07, col: '#3d5a99' }] });
OP({ type: 'shutter', name: 'le rideau du quai', aim: [-20, 1.3, -10.5], aimOpen: [-20, 2.75, -10.5], box: [-20.08, -19.92, -12, -9], x: -20, z0: -12, z1: -9 });
for (let i = 0; i < 5; i++) { const z = -11.3 + i * 0.6; OP({ type: 'cab', name: 'le casier n°' + (i + 1), aim: [9.22, 1.15, z], leaves: [{ h: [9.24, z - 0.28], ry0: -HP, ry1: -HP - 1.9, w: 0.56, hgt: 1.88, y0: 0.06, th: 0.03, col: ['#2d7dd2', '#56c271', '#ff8a3d', '#9b6bff', '#ff5a5f'][i] }], locker: i }); }
for (let i = 0; i < 3; i++) { const x0 = 4.62 + i * 0.85; OP({ type: 'cab', name: 'le placard de la cuisine', aim: [x0 + 0.42, 0.5, -13.06], leaves: [{ h: [x0, -13.08], ry0: 0, ry1: -1.9, w: 0.83, hgt: 0.72, y0: 0.1, th: 0.03, col: '#e8c48f' }], kitchen: i }); }
for (let i = 0; i < 2; i++) OP({ type: 'drawer', name: 'le tiroir du bureau', base: [16.1, 0.55 - i * 0.3, -12.3], n: [0, 1], d: 0.45, w: 0.66, hgt: 0.26, dp: 0.7, col: '#6b4a2b', desk: i });
for (let c = 0; c < 4; c++) for (let i = 0; i < 2; i++) OP({ type: 'drawer', name: 'le classeur', base: [18.92, 0.95 - i * 0.52, -13.4 + c * 1.1], n: [-1, 0], d: 0.5, w: 0.9, hgt: 0.46, dp: 0.78, col: '#a9b2bc', file: c * 2 + i });
OP({ type: 'cab', name: 'le coffre-fort', aim: [10.85, 0.55, -12.86], leaves: [{ h: [10.42, -12.88], ry0: 0, ry1: -1.9, w: 0.86, hgt: 0.86, y0: 0.07, th: 0.09, col: '#3d4454', safe: 1 }], safe: 1 });
CHECKOUTS.forEach((c, i) => OP({ type: 'drawer', name: 'le tiroir-caisse ' + (i + 1), base: [c + 0.21, 0.95, 10.95], n: [1, 0], d: 0.28, w: 0.38, hgt: 0.09, dp: 0.4, col: '#2a2135', cash: i }));
for (let i = 0; i < 2; i++) OP({ type: 'drawer', name: "le tiroir de l'accueil", base: [3.6 + i * 1.3, 0.8, 10.4], n: [0, -1], d: 0.35, w: 0.6, hgt: 0.2, dp: 0.5, col: '#178f81', acc: i });
OP({ type: 'cab', name: "l'armoire à balais", aim: [-6.9, 1.2, -7.7], leaves: [{ h: [-6.87, -8.4], ry0: -HP, ry1: -Math.PI - 0.3, w: 0.7, hgt: 2.0, y0: 0.05, th: 0.04, col: '#7a8796' }, { h: [-6.87, -7.0], ry0: HP, ry1: Math.PI + 0.3, w: 0.7, hgt: 2.0, y0: 0.05, th: 0.04, col: '#7a8796' }], closet: 1 });
for (let k = 0; k < 3; k++) { const z0 = -1.1 + k * 1.45; OP({ type: 'cab', name: 'la vitrine à boissons', aim: [-19.0, 1.15, z0 + 0.72], leaves: [{ h: [-19.03, z0], ry0: -HP, ry1: 0.2, w: 1.42, hgt: 1.92, y0: 0.14, th: 0.05, col: '#d7e3ee', glass: 1 }], fridge: k }); }
const OPEN_COLD = OPEN.findIndex((o) => o.cold);
const OPEN_WORDS = Math.ceil(OPEN.length / 30);
const opGet = (op, i) => !!(((op?.[(i / 30) | 0] || 0) >>> i % 30) & 1);
function opSet(op, i, v) { const w = (i / 30) | 0, b = 1 << i % 30; op[w] = v ? (op[w] | b) >>> 0 : (op[w] & ~b) >>> 0; }
const leafDir = (ry) => [Math.cos(ry), -Math.sin(ry)];
function openAims(o, isOpen) {
  if (o.type === 'drawer') { const t = isOpen ? o.d : 0; return [[o.base[0] + o.n[0] * (t + 0.02), o.base[1], o.base[2] + o.n[1] * (t + 0.02)]]; }
  if (!isOpen) return [o.aim]; if (o.aimOpen) return [o.aimOpen];
  return o.leaves.map((L) => { const [dx, dz] = leafDir(L.ry1); return [L.h[0] + dx * L.w * 0.6, (L.y0 || 0) + L.hgt * 0.5, L.h[1] + dz * L.w * 0.6]; });
}
// distance d'un point à une porte (pour les bots qui ouvrent les portes)
const boxDist = (b, x, z) => Math.hypot(x - clamp(x, b.x0, b.x1), z - clamp(z, b.z0, b.z1));

// ---------- Objets physiques (produits lancés, cartons posés par terre) ----------
// item hôte : { id, k (0 produit, 1 carton), cat, v, n, x, y, z, vx, vy, vz, ry, vr, hh, hhL, s (0 debout, 1 couché, 2 en vol), rest }
function itemHH(it, lying) { return it.k === 1 ? (it.cat >= 8 ? 0.12 : 0.14) : prodHH(it.cat, it.v, lying); }
function itemStep(it, dt) {
  if (it.rest) return;
  const sp = Math.hypot(it.vx, it.vy, it.vz); const n = Math.max(1, Math.ceil((sp * dt) / 0.08)); const h = dt / n;
  for (let k = 0; k < n; k++) {
    const r = 0.1; let hh = it.hh; it.vy -= 15 * h;
    let nx = it.x + it.vx * h, ny = it.y + it.vy * h, nz = it.z + it.vz * h; let ground = false;
    const test = (b) => {
      if (nx < b.x0 - r || nx > b.x1 + r || nz < b.z0 - r || nz > b.z1 + r) return; const top = b.h;
      if (ny - hh >= top) return;
      if (it.y - hh >= top - 0.06) { ny = top + hh; it.vy = it.vy < -2.5 ? -it.vy * 0.25 : 0; ground = true; return; }
      const inX = it.x > b.x0 - r && it.x < b.x1 + r, inZ = it.z > b.z0 - r && it.z < b.z1 + r;
      if (!inX) { nx = it.x; it.vx = -it.vx * 0.35; it.vr *= 0.6; } else if (!inZ) { nz = it.z; it.vz = -it.vz * 0.35; it.vr *= 0.6; } else { ny = top + hh; it.vy = 0; ground = true; }
    };
    for (const b of BOXES) test(b); for (const d of DYN) if (d.on) test(d);
    if (ny - hh <= 0) { ny = hh; it.vy = it.vy < -2.5 ? -it.vy * 0.28 : 0; ground = true; }
    if (ground && it.s === 2) { it.s = it.tumble ? 1 : 0; const nh = itemHH(it, it.s === 1); ny += nh - hh; it.hh = nh; }
    if (ground) { const f = Math.max(0, 1 - 8 * h); it.vx *= f; it.vz *= f; it.vr *= f; }
    it.x = clamp(nx, -26.5, 20.5); it.y = ny; it.z = clamp(nz, -13.9, 22.5); it.ry += it.vr * h;
    if (ground && Math.hypot(it.vx, it.vz) < 0.15 && Math.abs(it.vy) < 0.01) { it.rt = (it.rt || 0) + h; if (it.rt > 0.2) { it.rest = true; it.vx = it.vy = it.vz = it.vr = 0; return; } } else it.rt = 0;
  }
}
const itemOnFloor = (it) => zoneAt(it.x, it.z)?.id === 'vente' && it.y < 0.6;

// ---------- Collision ----------
function walkable(x, z) { return !!zoneAt(x, z); }
function collide(x, z, r = 0.35) {
  for (let it = 0; it < 2; it++) for (const b of BOXES.concat(DYN)) {
    if (b.on === false) continue;
    if (x < b.x0 - r || x > b.x1 + r || z < b.z0 - r || z > b.z1 + r) continue;
    const cx = clamp(x, b.x0, b.x1), cz = clamp(z, b.z0, b.z1); const dx = x - cx, dz = z - cz; const d2 = dx * dx + dz * dz;
    if (d2 >= r * r) continue;
    if (d2 > 1e-8) { const d = Math.sqrt(d2); x = cx + (dx / d) * r; z = cz + (dz / d) * r; }
    else { const l = x - b.x0, rr = b.x1 - x, t = z - b.z0, bo = b.z1 - z; const m = Math.min(l, rr, t, bo); if (m === l) x = b.x0 - r; else if (m === rr) x = b.x1 + r; else if (m === t) z = b.z0 - r; else z = b.z1 + r; }
  }
  return [x, z];
}

// ---------- Navigation (A* sur grille) ----------
const NAV = { x0: -27, z0: -14.5, cs: 0.5, w: 0, h: 0, g: null };
function buildNav() {
  NAV.w = Math.ceil((21 - NAV.x0) / NAV.cs); NAV.h = Math.ceil((23 - NAV.z0) / NAV.cs);
  NAV.g = new Uint8Array(NAV.w * NAV.h); const r = 0.42;
  for (let j = 0; j < NAV.h; j++) for (let i = 0; i < NAV.w; i++) {
    const x = NAV.x0 + (i + 0.5) * NAV.cs, z = NAV.z0 + (j + 0.5) * NAV.cs; let bl = walkable(x, z) ? 0 : 1;
    if (!bl) for (const b of BOXES) { const cx = clamp(x, b.x0, b.x1), cz = clamp(z, b.z0, b.z1); if ((x - cx) ** 2 + (z - cz) ** 2 < r * r) { bl = 1; break; } }
    NAV.g[j * NAV.w + i] = bl;
  }
}
const navCell = (x, z) => [Math.floor((x - NAV.x0) / NAV.cs), Math.floor((z - NAV.z0) / NAV.cs)];
const navFree = (i, j) => i >= 0 && j >= 0 && i < NAV.w && j < NAV.h && NAV.g[j * NAV.w + i] === 0;
function navNearest(i, j) { if (navFree(i, j)) return [i, j]; for (let r = 1; r < 10; r++) for (let dj = -r; dj <= r; dj++) for (let di = -r; di <= r; di++) { if (Math.max(Math.abs(di), Math.abs(dj)) !== r) continue; if (navFree(i + di, j + dj)) return [i + di, j + dj]; } return null; }
function navLOS(ax, az, bx, bz) { const d = Math.hypot(bx - ax, bz - az); const n = Math.max(1, Math.ceil(d / 0.2)); for (let s = 0; s <= n; s++) { const t = s / n; const [i, j] = navCell(ax + (bx - ax) * t, az + (bz - az) * t); if (!navFree(i, j)) return false; } return true; }
function navPath(sx, sz, tx, tz) {
  const s = navNearest(...navCell(sx, sz)), t = navNearest(...navCell(tx, tz)); if (!s || !t) return null;
  const W = NAV.w, N = W * NAV.h, si = s[1] * W + s[0], ti = t[1] * W + t[0];
  const gS = new Float32Array(N).fill(Infinity), came = new Int32Array(N).fill(-1), closed = new Uint8Array(N); const heap = [];
  const push = (f, i) => { heap.push([f, i]); let k = heap.length - 1; while (k > 0) { const p = (k - 1) >> 1; if (heap[p][0] <= heap[k][0]) break; [heap[p], heap[k]] = [heap[k], heap[p]]; k = p; } };
  const pop = () => { const top = heap[0]; const last = heap.pop(); if (heap.length) { heap[0] = last; let k = 0; for (;;) { const l = 2 * k + 1, rr = l + 1; let m = k; if (l < heap.length && heap[l][0] < heap[m][0]) m = l; if (rr < heap.length && heap[rr][0] < heap[m][0]) m = rr; if (m === k) break; [heap[m], heap[k]] = [heap[k], heap[m]]; k = m; } } return top; };
  const hh = (i) => { const dx = Math.abs((i % W) - t[0]), dy = Math.abs(((i / W) | 0) - t[1]); return dx + dy - 0.5858 * Math.min(dx, dy); };
  const DIRS = [[1, 0, 1], [-1, 0, 1], [0, 1, 1], [0, -1, 1], [1, 1, 1.4142], [1, -1, 1.4142], [-1, 1, 1.4142], [-1, -1, 1.4142]];
  gS[si] = 0; push(hh(si), si); let found = false, iter = 0;
  while (heap.length) {
    const [, cur] = pop(); if (closed[cur]) continue; closed[cur] = 1; if (cur === ti) { found = true; break; } if (++iter > 30000) break;
    const cx = cur % W, cy = (cur / W) | 0;
    for (const [dx, dy, c] of DIRS) { const nx = cx + dx, ny = cy + dy; if (!navFree(nx, ny)) continue; if (dx && dy && (!navFree(cx + dx, cy) || !navFree(cx, cy + dy))) continue; const ni = ny * W + nx; if (closed[ni]) continue; const ng = gS[cur] + c; if (ng < gS[ni]) { gS[ni] = ng; came[ni] = cur; push(ng + hh(ni), ni); } }
  }
  if (!found) return null;
  const cells = []; for (let c = ti; c !== -1; c = came[c]) cells.push(c); cells.reverse();
  const pts = cells.map((c) => [NAV.x0 + ((c % W) + 0.5) * NAV.cs, NAV.z0 + (((c / W) | 0) + 0.5) * NAV.cs]); pts.push([tx, tz]);
  const res = []; let cx = sx, cz = sz, k = 0;
  while (k < pts.length) { let j = pts.length - 1; while (j > k && !navLOS(cx, cz, pts[j][0], pts[j][1])) j--; res.push(pts[j]); cx = pts[j][0]; cz = pts[j][1]; k = j + 1; }
  return res;
}

// ---------- Génération de tâches (partagée joueurs / bots) ----------
let TASK_SEQ = 0;
function mkTask(type, steps, label, icon) { return { tid: ++TASK_SEQ, type, steps, step: 0, label, icon }; }
function wpick(opts) { const tot = opts.reduce((a, o) => a + o.w, 0); if (tot <= 0) return null; let r = Math.random() * tot; for (const o of opts) { r -= o.w; if (r <= 0) return o; } return opts[opts.length - 1]; }
const stockW = (m, si) => { const f = fillFrac(m || 0, si); return f > 0.85 ? 0.05 : (1 - f) * 3.4; };
const hasMess = (W, type, shelf) => W.messes.some((m) => m[1] === type && (shelf === undefined || m[4] === shelf));
function genWork(W, ex) {
  const o = [];
  for (let i = 0; i < 8; i++) if (!ex.has('rayon' + i)) o.push({ w: stockW(W.stock[i], i), f: () => mkTask('w', [{ st: 'carton' + i }, { st: 'rayon' + i }], 'Remplir le rayon ' + SHELF_NAMES[i], '📦') });
  if (!ex.has('frais')) o.push({ w: stockW(W.stock[8], 8), f: () => mkTask('w', [{ st: 'crate8' }, { st: 'frais' }], 'Remplir le rayon Frais', '🥛') });
  if (!ex.has('surgeles')) o.push({ w: stockW(W.stock[9], 9), f: () => mkTask('w', [{ st: 'crate9' }, { st: 'surgeles' }], 'Remplir les Surgelés', '🧊') });
  for (let i = 0; i < 3; i++) if (!ex.has('caisse' + i)) o.push({ w: 0.5 + (W.queues?.[i] || 0) * 0.9, f: () => mkTask('w', [{ st: 'caisse' + i }], 'Encaisser à la caisse ' + (i + 1), '🧾') });
  const nw = (id) => 0.06 + ((W.nd?.[ST[id].job] ?? 50) / 100) * 2.4;
  const simple = [['fruits', '🍎'], ['boucherie', '🥩'], ['boulange', '🥖'], ['camion', '🚚'], ['inventaire', '📋'], ['eau', '💧'], ['fleurs', '🌷']];
  for (const [id, ic] of simple) if (!ex.has(id)) o.push({ w: nw(id), f: () => mkTask('w', [{ st: id }], ST[id].label, ic) });
  if (!ex.has('abri')) { const j = rndi(0, 2); o.push({ w: nw('abri'), f: () => mkTask('w', [{ st: 'caddie' + j }, { st: 'abri' }], 'Ramener un caddie du parking', '🛒') }); }
  if (!ex.has('benne')) o.push({ w: nw('benne'), f: () => mkTask('w', [{ st: 'trash_pick' }, { st: 'benne' }], 'Sortir les poubelles', '🗑️') });
  if (!ex.has('imprimante')) { const j = rndi(0, 3); o.push({ w: nw('promo0'), f: () => mkTask('w', [{ st: 'imprimante' }, { st: 'promo' + j }], 'Afficher une promo (tête de gondole ' + (j + 1) + ')', '🖨️') }); }
  return wpick(o)?.f() || null;
}
function genSab(W, ex) {
  const o = [];
  if (!W.pyr && !ex.has('pyramide')) o.push({ w: 1.2, f: () => mkTask('s', [{ st: 'pyramide' }], ST.pyramide.label, '🥫') });
  if (W.messes.filter((m) => m[1] === 'lait').length < TUNE.maxPuddles && !ex.has('lait')) o.push({ w: 1, f: () => mkTask('s', [{ st: 'lait' }], ST.lait.label, '🥛') });
  { const i = rndi(0, 7); if (!ex.has('rayon' + i)) o.push({ w: 1.0, f: () => mkTask('s', [{ st: 'rayon' + i, sab: 'jet' }], 'Jeter des produits par terre : ' + SHELF_NAMES[i], '💥') }); }
  if (W.op && !opGet(W.op, OPEN_COLD)) o.push({ w: 0.6, f: () => mkTask('s', [{ x: -2.5, z: -5.25, hold: 1.2, door: OPEN_COLD }], 'Laisser la chambre froide ouverte', '🚪') });
  for (const [id, ic] of [['sieste', '💤'], ['echant', '🧀'], ['micro', '📢'], ['arcade', '🕹️']]) if (!ex.has(id)) o.push({ w: 0.9, f: () => mkTask('s', [{ st: id }], ST[id].label, ic) });
  if (!ex.has('microondes') && !hasMess(W, 'smoke')) o.push({ w: 0.9, f: () => mkTask('s', [{ st: 'microondes' }], ST.microondes.label, '💥') });
  if (!ex.has('congel') && !hasMess(W, 'melt')) o.push({ w: 0.9, f: () => mkTask('s', [{ st: 'congel' }], ST.congel.label, '🔌') });
  if (!ex.has('four') && (W.ov?.[0] ?? 0) !== 3) o.push({ w: 0.8, f: () => mkTask('s', [{ st: 'four', sab: 'four' }], 'Monter le four à fond', '🔥') });
  return wpick(o)?.f() || null;
}
function genTaskFor(role, W, list) {
  const ex = new Set(list.flatMap((t) => t.steps.map((s) => s.st)));
  if (!list.some((t) => t.type === 'p') && !ex.has('cafe') && Math.random() < 0.12) return mkTask('p', [{ st: 'cafe' }], 'Pause café', '☕');
  if (role === 'gla') { const ns = list.filter((t) => t.type === 's').length; if (ns < 2) return genSab(W, ex) || genWork(W, ex); }
  return genWork(W, ex);
}
function taskValid(t, W) {
  if (t.type !== 's') return true;
  const s = t.steps[t.step];
  if (s.st === 'pyramide') return !W.pyr;
  if (s.st === 'lait') return W.messes.filter((m) => m[1] === 'lait').length < TUNE.maxPuddles;
  if (s.door !== undefined) return !opGet(W.op, s.door);
  if (s.sab === 'jet') return true;
  if (s.st === 'microondes') return !hasMess(W, 'smoke');
  if (s.st === 'congel') return !hasMess(W, 'melt');
  if (s.sab === 'four') return (W.ov?.[0] ?? 0) !== 3;
  return true;
}
const stepHold = (step) => (step.st === undefined ? step.hold : step.sab === 'jet' ? 2 : step.sab === 'four' ? 2 : ST[step.st].hold);
const stepMg = (step) => (step.sab || step.st === undefined ? null : ST[step.st].mg || null);
const gameW = (G) => ({ stock: G.st || [], messes: G.ms || [], pyr: !!G.py, ov: G.ov || [0, 0], queues: G.qs || [0, 0, 0], nd: G.nd || [], op: G.op || [0, 0] });
