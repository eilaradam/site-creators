#!/usr/bin/env bash
# Confere o que o studio precisa e instala o que falta.
set -u

ok()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
falta() { printf '  \033[31mfalta\033[0m %s\n' "$1"; }

echo "studio: conferindo o ambiente"

if command -v node >/dev/null 2>&1; then
  versao=$(node -p 'process.versions.node.split(".")[0]')
  if [ "$versao" -ge 20 ]; then ok "node $(node -v)"; else falta "node 20+ (voce tem $(node -v))"; fi
else
  falta "node 20+ — https://nodejs.org"
fi

if command -v ffmpeg >/dev/null 2>&1; then
  ok "ffmpeg $(ffmpeg -version | head -1 | cut -d' ' -f3)"
  if ffmpeg -hide_banner -filters 2>/dev/null | grep -q ' ass '; then
    ok "libass (legenda queimada)"
  else
    falta "libass no ffmpeg — a legenda queimada nao vai funcionar"
  fi
else
  falta "ffmpeg — macOS: brew install ffmpeg | Windows: winget install ffmpeg"
fi

if command -v python3 >/dev/null 2>&1; then
  ok "python $(python3 -V | cut -d' ' -f2)"
  if python3 -c 'import faster_whisper' 2>/dev/null; then
    ok "faster-whisper"
  else
    falta "faster-whisper"
    printf '        instalar agora? [s/N] '
    read -r resposta
    case "$resposta" in
      [sS]*) python3 -m pip install faster-whisper && ok "faster-whisper instalado" ;;
      *) echo "        sem ele o studio so corta silencio (use --sem-transcricao)" ;;
    esac
  fi
else
  falta "python3 — sem ele nao ha transcricao nem escolha de take"
fi

mkdir -p projetos musicas
echo
echo "pronto. comece com:  node bin/studio.js novo \"nome do video\""
