#!/bin/bash
# Instala o robô de edição no Mac da Lara.
# Uso (no Terminal):  curl -fsSL https://raw.githubusercontent.com/eilaradam/site-creators/main/robo-edicao/instalar.sh | bash
set -e
D="$HOME/robo-edicao"
BASE="https://raw.githubusercontent.com/eilaradam/site-creators/main/robo-edicao"
mkdir -p "$D/bin" "$D/trabalhos"
cd "$D"

echo "1/5 Baixando o robô…"
for f in robo.mjs icone.png INSTRUCOES_EDICAO.md INSTRUCOES_CENAS.md transcrever.py legendas.json legendas_ass.py montar.py catalogar_sons.py encaixar_musica.py baixar_fontes.py fontes.json empacotar_transcricao.py conferir_cortes.py INSTRUCOES_APRENDER.md titulos/package.json titulos/src/index.ts titulos/src/Raiz.tsx titulos/src/Titulos.tsx; do
  mkdir -p "$(dirname "$D/$f")"; curl -fsSL "$BASE/$f" -o "$D/$f"
done

echo "2/5 Instalando o rclone (conversa com o Google Drive)…"
if [ -x "$D/bin/rclone" ] || command -v rclone >/dev/null; then
  echo "   já tinha"
else
  [ "$(uname -m)" = "arm64" ] && A=arm64 || A=amd64
  T=$(mktemp -d)
  curl -fsSL "https://downloads.rclone.org/rclone-current-osx-$A.zip" -o "$T/r.zip"
  unzip -q "$T/r.zip" -d "$T"
  cp "$T"/rclone-*/rclone "$D/bin/rclone" && chmod +x "$D/bin/rclone"
  rm -rf "$T"
fi
RC="$D/bin/rclone"; [ -x "$RC" ] || RC=rclone

echo "3/5 Preparando o Python da edição (transcrição e download de referências)… pode levar uns minutos"
[ -x "$D/venv/bin/python" ] || python3 -m venv "$D/venv"
"$D/venv/bin/pip" install -q --upgrade pip
"$D/venv/bin/pip" install -q faster-whisper yt-dlp edge-tts librosa
echo "   Biblioteca de fontes (44 famílias do Google Fonts, licença livre)… na primeira vez demora uns minutos"
"$D/venv/bin/pip" install -q fonttools
"$D/venv/bin/python" "$D/baixar_fontes.py" "$D/fontes.json" "$D/fontes"
echo "   Modelos de título animado (Remotion)… na primeira vez demora uns minutos"
mkdir -p "$D/titulos/public"; ln -sfn "$D/fontes" "$D/titulos/public/fontes"
(cd "$D/titulos" && npm install --silent --no-audit --no-fund >/dev/null && npx --yes remotion browser ensure >/dev/null 2>&1 || true)

echo "4/5 Conectando o seu Google Drive…"
if "$RC" listremotes | grep -q '^drive:$'; then
  echo "   já estava conectado"
else
  echo "   Vai abrir o navegador: entre na conta do Google onde ficam os vídeos e clique em Permitir."
  "$RC" config create drive drive scope drive >/dev/null
fi
"$RC" mkdir "drive:Edição"

echo "5/5 Ligando o robô ao admin do site"
if [ -f "$D/sessao.json" ]; then
  echo "   já estava ligado"
else
  read -r -p "   E-mail do admin: " ROBO_EMAIL </dev/tty
  read -r -s -p "   Senha do admin (não aparece enquanto digita): " ROBO_SENHA </dev/tty; echo
  ROBO_EMAIL="$ROBO_EMAIL" ROBO_SENHA="$ROBO_SENHA" node "$D/robo.mjs" --login
fi

node "$D/robo.mjs" --app
node "$D/robo.mjs" --servico

echo
echo "Pronto. O Estagiário já está trabalhando escondido (liga sozinho quando o Mac liga)."
echo "Acompanhe pela aba Edição do admin. O crachá \"Estagiário\" na Mesa religa e abre o admin."
