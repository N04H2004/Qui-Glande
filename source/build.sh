#!/bin/bash
# Assemble la page unique dist/index.html
set -e
cd "$(dirname "$0")"
mkdir -p dist
{
  cat src/00_head.html
  echo '<script type="importmap">{"imports":{"three":"https://cdn.jsdelivr.net/npm/three@0.170.0/build/three.module.js"}}</script>'
  echo '<script type="module">'
  echo "import * as THREE from 'three';"
  for f in src/10_core.js src/12_gfx.js src/20_world.js src/22_fx.js src/25_props.js src/26_decor.js src/27_wing.js src/30_chars.js src/40_net.js src/50_host.js src/60_client.js src/70_ui.js src/75_post.js src/80_main.js; do
    cat "$f"; echo
  done
  echo '</script>'
  echo '</body>'
  echo '</html>'
} > dist/index.html
# vérification de syntaxe du JS assemblé
sed -n '/<script type="module">/,/<\/script>/p' dist/index.html | sed '1d;$d' > /tmp/qg_check.mjs
node --check /tmp/qg_check.mjs
echo "OK $(wc -c < dist/index.html) octets"
