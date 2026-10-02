#!/usr/bin/env bash
# Sobe o studio e abre o painel no navegador desta maquina.
# Na primeira vez confere ffmpeg, node e faster-whisper antes de subir.
set -u
cd "$(dirname "$0")"

PORTA="${1:-4321}"

if [ ! -f .setup-ok ]; then
  if bash setup.sh; then
    touch .setup-ok
  else
    exit 1
  fi
fi

echo
echo "abrindo http://127.0.0.1:${PORTA}  (ctrl+c encerra)"
exec node bin/studio.js painel --porta="$PORTA"
