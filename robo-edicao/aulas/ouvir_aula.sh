#!/bin/bash
# Grava uma aula que toca no Chrome: áudio pelo BlackHole 2ch e um print da tela a cada 3 s.
# Quando você aperta Enter, para tudo, transcreve e copia transcrição + prints para o Drive
# (Edição/_Aulas/<curso>/<aula>), onde o Claude lê para aprender com a skill aprender-video.
#
#   ~/robo-edicao/aulas/ouvir_aula.sh "Comunicadores Magnéticos" "Edição Magnética 02"
#   ~/robo-edicao/aulas/ouvir_aula.sh --teste        grava 10 s sozinho para conferir o áudio
set -u
D="$HOME/robo-edicao"
PY="$D/venv/bin/python"; [ -x "$PY" ] || PY=python3
RC="$D/bin/rclone"; [ -x "$RC" ] || RC=rclone
if [ "${1:-}" = "--teste" ]; then CURSO="_teste"; AULA="teste-$(date +%H%M%S)"; TESTE=1
else CURSO="${1:?Uso: ouvir_aula.sh \"curso\" \"aula\"}"; AULA="${2:?Falta o nome da aula}"; TESTE=0; fi
P="$D/aulas/$CURSO/$AULA"
mkdir -p "$P/frames"

# número do BlackHole 2ch na lista de entradas de áudio do Mac
IDX=$(ffmpeg -hide_banner -f avfoundation -list_devices true -i "" 2>&1 | sed -n '/audio devices/,$p' | grep -m1 'BlackHole 2ch' | grep -oE '\[[0-9]+\] BlackHole' | grep -oE '[0-9]+')
if [ -z "$IDX" ]; then
  echo "Não achei o BlackHole 2ch. Rode o instalar_aulas.sh e reinicie o Mac."; exit 1
fi

echo "Gravando em: $P"
ffmpeg -hide_banner -loglevel error -nostdin -y -f avfoundation -i ":$IDX" -ac 1 -ar 16000 "$P/audio.wav" &
FF=$!
INICIO=$(date +%s)
(
  while true; do
    t=$(( $(date +%s) - INICIO ))
    f=$(printf "%s/frames/%02dh%02dm%02ds.jpg" "$P" $((t / 3600)) $((t / 60 % 60)) $((t % 60)))
    screencapture -x -t jpg "$f" && sips -Z 1280 "$f" >/dev/null 2>&1
    sleep 3
  done
) &
SC=$!
trap 'kill $SC 2>/dev/null; kill -INT $FF 2>/dev/null' EXIT

if [ "$TESTE" = 1 ]; then
  echo "Teste: gravando 10 s. Deixe algum som tocando no Chrome agora."; sleep 10
else
  read -r -p "Dê play na aula. Para parar, aperte Enter aqui. " _
fi
kill $SC 2>/dev/null; kill -INT $FF 2>/dev/null; wait $FF 2>/dev/null; trap - EXIT
DUR=$(( $(date +%s) - INICIO ))
echo "Parei: $((DUR / 60)) min $((DUR % 60)) s gravados, $(ls "$P/frames" | wc -l | tr -d ' ') prints."

# áudio mudo = o som do Chrome não está passando pelo BlackHole
PICO=$(ffmpeg -hide_banner -i "$P/audio.wav" -af volumedetect -f null - 2>&1 | grep -oE 'max_volume: -?[0-9.]+' | grep -oE -- '-?[0-9.]+')
if [ -z "$PICO" ] || awk "BEGIN{exit !($PICO < -50)}"; then
  echo "ATENÇÃO: o áudio saiu mudo (pico ${PICO:-?} dB). Em Ajustes do Sistema > Som > Saída, escolha o Dispositivo de Saída Múltipla."
  [ "$TESTE" = 1 ] && exit 1
fi

echo "Transcrevendo (no Intel i5 isso demora; o tempo aparece no fim)…"
"$PY" "$D/aulas/transcrever_aula.py" "$P" small || { echo "A transcrição falhou."; exit 1; }
head -3 "$P/transcricao.txt"

# Drive: transcrição e prints (o áudio fica só no Mac)
if "$RC" listremotes 2>/dev/null | grep -q '^drive:$'; then
  "$RC" copy "$P" "drive:Edição/_Aulas/$CURSO/$AULA" --exclude audio.wav && echo "Copiado para o Drive: Edição/_Aulas/$CURSO/$AULA"
fi
echo "Pronto. Agora peça ao Claude: aprender com a aula \"$AULA\" do curso \"$CURSO\"."
