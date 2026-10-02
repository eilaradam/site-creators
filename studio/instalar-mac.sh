#!/usr/bin/env bash
# Instalador do studio para macOS: poe de pe o que falta e abre o painel.
# Nada roda sem voce ver: cada instalacao e anunciada, e o Homebrew pede confirmacao.
set -u
cd "$(dirname "$0")"

titulo() { printf '\n\033[1m%s\033[0m\n' "$1"; }
ok()     { printf '  \033[32mok\033[0m    %s\n' "$1"; }
indo()   { printf '  \033[33m...\033[0m   %s\n' "$1"; }
erro()   { printf '  \033[31merro\033[0m  %s\n' "$1"; }

if [ "$(uname -s)" != "Darwin" ]; then
  erro "este instalador e do macOS. No Windows, rode: bash setup.sh"
  exit 1
fi

titulo "1. Homebrew"
if command -v brew >/dev/null 2>&1; then
  ok "ja instalado"
else
  # Em Apple Silicon o brew vive em /opt/homebrew; em Intel, em /usr/local.
  for candidato in /opt/homebrew/bin/brew /usr/local/bin/brew; do
    if [ -x "$candidato" ]; then eval "$("$candidato" shellenv)"; break; fi
  done
fi

if ! command -v brew >/dev/null 2>&1; then
  echo "  O Homebrew e o instalador de programas do Mac. O studio precisa dele"
  echo "  para o ffmpeg. Ele vem do site oficial (brew.sh) e vai pedir a senha"
  echo "  do seu Mac."
  printf '  instalar o Homebrew agora? [s/N] '
  read -r resposta
  case "$resposta" in
    [sS]*)
      indo "baixando o Homebrew (alguns minutos)"
      /bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)" || {
        erro "a instalacao do Homebrew falhou"; exit 1;
      }
      for candidato in /opt/homebrew/bin/brew /usr/local/bin/brew; do
        if [ -x "$candidato" ]; then
          eval "$("$candidato" shellenv)"
          perfil="$HOME/.zprofile"
          linha="eval \"\$($candidato shellenv)\""
          grep -qF "$linha" "$perfil" 2>/dev/null || echo "$linha" >> "$perfil"
          ok "brew no PATH, agora e nos proximos terminais"
          break
        fi
      done
      ;;
    *)
      erro "sem o Homebrew nao da para instalar o ffmpeg. Instale por brew.sh e rode de novo."
      exit 1
      ;;
  esac
fi
command -v brew >/dev/null 2>&1 || { erro "o brew nao entrou no PATH. Feche o terminal, abra outro e rode de novo."; exit 1; }

titulo "2. node, ffmpeg e python"
faltando=""
command -v node   >/dev/null 2>&1 || faltando="$faltando node"
command -v ffmpeg >/dev/null 2>&1 || faltando="$faltando ffmpeg"
# O python que vem com o macOS e velho demais para a transcricao.
python3 -c 'import sys; sys.exit(0 if sys.version_info >= (3,10) else 1)' 2>/dev/null || faltando="$faltando python"

if [ -z "$faltando" ]; then
  ok "ja estao instalados"
else
  indo "instalando:$faltando"
  # shellcheck disable=SC2086
  brew install $faltando || { erro "o brew nao conseguiu instalar:$faltando"; exit 1; }
fi

titulo "3. transcricao (faster-whisper)"
indo "criando o ambiente em studio/.venv"
rm -f .setup-ok
bash setup.sh --com-whisper || { erro "faltou alguma coisa; leia as linhas acima"; exit 1; }
touch .setup-ok

titulo "4. painel"
exec bash abrir.sh
