#!/bin/bash
# Version autonome (GitHub Pages) : multijoueur pair-à-pair via PeerJS au lieu des salons Claude
set -e
cd "$(dirname "$0")"
OUT=${1:-dist_web}; mkdir -p "$OUT"
./build.sh >/dev/null
python3 - "$OUT" <<'PY'
import sys
s = open('dist/index.html', encoding='utf-8').read()
inj = '<script>window.__QG_STANDALONE=1</script>\n<script src="https://cdn.jsdelivr.net/npm/peerjs@1.5.5/dist/peerjs.min.js"></script>\n<script type="importmap">'
assert s.count('<script type="importmap">') == 1
s = s.replace('<script type="importmap">', inj, 1)
for a, b in [
  ("Partage cette page avec tes amis (ils doivent être connectés à Claude), crée un salon et donne-leur le code à 4 lettres.", "Envoie le lien de cette page à tes amis (aucun compte nécessaire), crée un salon et donne-leur le code à 4 lettres. La connexion se fait directement entre vos navigateurs : sur certains réseaux très verrouillés (école, entreprise), elle peut échouer."),
  ("Connecte-toi à Claude puis recharge la page. Le solo marche !", "Recharge la page. Le solo marche !"),
  ("Connecte-toi à Claude puis recharge la page.", "Recharge la page."),
]:
  assert a in s, a[:50]; s = s.replace(a, b)
open(sys.argv[1] + '/index.html', 'w', encoding='utf-8').write(s)
PY
echo "OK $OUT/index.html $(wc -c < "$OUT/index.html") octets"
