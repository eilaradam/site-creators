#!/bin/bash
# Prepara o Mac para gravar aulas: BlackHole 2ch (leva o som do Chrome para a gravação), ffmpeg e faster-whisper.
# Uso: curl -fsSL https://raw.githubusercontent.com/eilaradam/site-creators/main/robo-edicao/aulas/instalar_aulas.sh | bash
set -e
D="$HOME/robo-edicao"; BASE="https://raw.githubusercontent.com/eilaradam/site-creators/main/robo-edicao/aulas"
mkdir -p "$D/aulas"
for f in ouvir_aula.sh transcrever_aula.py; do curl -fsSL "$BASE/$f" -o "$D/aulas/$f"; done
chmod +x "$D/aulas/ouvir_aula.sh"
command -v brew >/dev/null || { echo "Falta o Homebrew: https://brew.sh"; exit 1; }
brew list ffmpeg >/dev/null 2>&1 || brew install ffmpeg
brew list --cask blackhole-2ch >/dev/null 2>&1 || brew install --cask blackhole-2ch   # pede a senha do Mac
[ -x "$D/venv/bin/python" ] || python3 -m venv "$D/venv"
"$D/venv/bin/pip" install -q faster-whisper
if system_profiler SPAudioDataType 2>/dev/null | grep -q "BlackHole 2ch"; then
  echo; echo "✅ BlackHole instalado. Agora crie o Dispositivo de Saída Múltipla à mão (passo a passo na conversa)."
else
  echo; echo "BlackHole instalado, mas o Mac ainda não mostra. Reinicie o Mac e confira em Configuração de Áudio e MIDI."
fi
