#!/usr/bin/env bash
# Confere o que o studio precisa e instala o que falta.
set -u
cd "$(dirname "$0")"

ok()    { printf '  \033[32mok\033[0m    %s\n' "$1"; }
falta() { printf '  \033[31mfalta\033[0m %s\n' "$1"; }
nota()  { printf '        %s\n' "$1"; }

pendencias=0

echo "studio: conferindo o ambiente"

if command -v node >/dev/null 2>&1; then
  versao=$(node -p 'process.versions.node.split(".")[0]' 2>/dev/null || echo 0)
  if [ "$versao" -ge 20 ]; then ok "node $(node -v)"; else falta "node 20+ (voce tem $(node -v))"; pendencias=1; fi
else
  falta "node 20+"
  nota "macOS: brew install node   |   ou baixe em https://nodejs.org"
  pendencias=1
fi

if command -v ffmpeg >/dev/null 2>&1; then
  ok "ffmpeg $(ffmpeg -version | head -1 | cut -d' ' -f3)"
  if ffmpeg -hide_banner -filters 2>/dev/null | grep -q ' ass '; then
    ok "libass (legenda queimada)"
  else
    falta "libass no ffmpeg — a legenda queimada nao vai funcionar"
  fi
else
  falta "ffmpeg"
  nota "macOS: brew install ffmpeg   |   Windows: winget install ffmpeg"
  pendencias=1
fi

# A transcricao mora num venv proprio: nao mexe no python do sistema e escapa
# do bloqueio de pip que o macOS e o Homebrew aplicam fora de ambiente virtual.
VENV_PY=".venv/bin/python"
[ -f "$VENV_PY" ] || VENV_PY=".venv/Scripts/python.exe"

if [ -f "$VENV_PY" ] && "$VENV_PY" -c 'import faster_whisper' 2>/dev/null; then
  ok "faster-whisper (em studio/.venv)"
elif command -v python3 >/dev/null 2>&1; then
  ok "python $(python3 -V | cut -d' ' -f2)"
  falta "faster-whisper"
  nota "sem ele o studio so corta silencio (marque 'so cortar silencio' no painel)"
  printf '        instalar num ambiente proprio agora? [s/N] '
  read -r resposta
  case "$resposta" in
    [sS]*)
      python3 -m venv .venv || { falta "nao consegui criar o .venv"; pendencias=1; }
      VENV_PY=".venv/bin/python"
      [ -f "$VENV_PY" ] || VENV_PY=".venv/Scripts/python.exe"
      if [ -f "$VENV_PY" ]; then
        "$VENV_PY" -m pip install --quiet --upgrade pip \
          && "$VENV_PY" -m pip install --quiet faster-whisper \
          && ok "faster-whisper instalado em studio/.venv" \
          || { falta "a instalacao do faster-whisper falhou"; pendencias=1; }
      fi
      ;;
    *) nota "depois e so rodar: bash setup.sh" ;;
  esac
else
  falta "python3 — sem ele nao ha transcricao nem escolha de take"
  nota "macOS: brew install python"
fi

mkdir -p projetos musicas

echo
if [ "$pendencias" -eq 1 ]; then
  echo "instale o que esta faltando acima e rode de novo: bash abrir.sh"
  exit 1
fi
echo "pronto. o painel abre com:  bash abrir.sh"
