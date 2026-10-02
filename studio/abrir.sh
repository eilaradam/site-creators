#!/usr/bin/env bash
# Sobe o studio e abre o painel no navegador desta maquina.
# Primeira vez: confere ffmpeg, python e faster-whisper antes de subir.
set -u
cd "$(dirname "$0")"

PORTA="${1:-4321}"

if [ ! -f .setup-ok ]; then
  bash setup.sh
  touch .setup-ok
fi

echo
echo "abrindo http://127.0.0.1:${PORTA}  (ctrl+c encerra)"
exec node bin/studio.js painel --porta="$PORTA"
