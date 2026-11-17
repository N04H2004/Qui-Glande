# Qui glande ? — Le Super 🛒

Jeu 3D de déduction sociale dans un supermarché (inspiré de *Dale & Dawson Stationery Supplies*) : un directeur, des employés… et des glandeurs cachés parmi eux.

**Jouer :** ouvrir la page du jeu (GitHub Pages), créer un salon et partager le code à 4 lettres. Aucun compte nécessaire.

- 3D low-poly cartoon chaleureux (three.js), vue 1re / 3e personne
- Réglage **Graphismes** (Bas / Moyen / Haut) dans le menu et dans l'aide (H) : néons, soleil de fin d'après-midi, reflets, bloom ; la résolution s'adapte toute seule si la machine peine
- Mise en rayon façon *Supermarket Simulator*, produits à prendre, poser et lancer
- Portes, tiroirs, casiers, coffre-fort, vitrine à boissons…
- 3 tâches perso par joueur, le reste est libre
- Multijoueur en pair-à-pair (PeerJS / WebRTC) : l'hôte du salon fait tourner la partie. Bots pour compléter.

> Sur certains réseaux très verrouillés (école, entreprise), la connexion directe entre navigateurs peut échouer.

## Code
- `index.html` : le jeu complet (une seule page)
- `source/src/` : les sources ; `source/build_web.sh` reconstruit `index.html` (version autonome)
- Rendu : `12_gfx.js` (niveaux de qualité), `20_world.js` (monde, matières, lumières), `22_fx.js` (particules et moments forts), `30_chars.js` (personnages), `75_post.js` (post-traitement, reflets). Le gameplay et le réseau sont dans `10_core.js`, `40_net.js`, `50_host.js`, `60_client.js`.
