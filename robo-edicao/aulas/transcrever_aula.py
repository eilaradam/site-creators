"""Transcreve o áudio de uma aula com faster-whisper (local, grátis) e mede o tempo.

Uso: python transcrever_aula.py <pasta_da_aula> [modelo]
Lê <pasta>/audio.wav e escreve:
  transcricao.txt   uma frase por linha: [00:01:23 - 00:01:27] texto
  transcricao.json  as mesmas frases com início e fim em segundos
"""
import json
import os
import subprocess
import sys
import time

import numpy as np
from faster_whisper import WhisperModel

pasta = sys.argv[1]
modelo = sys.argv[2] if len(sys.argv) > 2 else "small"
audio = os.path.join(pasta, "audio.wav")
dur = float(subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", audio],
                           capture_output=True, text=True).stdout or 0)


def hms(t):
    t = int(t)
    return "%02d:%02d:%02d" % (t // 3600, t // 60 % 60, t % 60)


t0 = time.time()
m = WhisperModel(modelo, device="cpu", compute_type="int8")
carregar = time.time() - t0
# o áudio é lido pelo ffmpeg (16 kHz mono): não depende da versão do PyAV, que às vezes quebra o faster-whisper
bruto = subprocess.run(["ffmpeg", "-v", "error", "-i", audio, "-f", "f32le", "-ac", "1", "-ar", "16000", "-"], capture_output=True).stdout
segs, info = m.transcribe(np.frombuffer(bruto, dtype=np.float32), language="pt", vad_filter=True, beam_size=5)
frases = [{"inicio": round(s.start, 2), "fim": round(s.end, 2), "texto": s.text.strip()} for s in segs if s.text.strip()]
gasto = time.time() - t0
with open(os.path.join(pasta, "transcricao.txt"), "w", encoding="utf-8") as f:
    for s in frases:
        f.write("[%s - %s] %s\n" % (hms(s["inicio"]), hms(s["fim"]), s["texto"]))
with open(os.path.join(pasta, "transcricao.json"), "w", encoding="utf-8") as f:
    json.dump({"modelo": modelo, "duracao_audio_s": round(dur, 1), "tempo_transcricao_s": round(gasto, 1), "frases": frases}, f, ensure_ascii=False, indent=1)
vel = gasto / dur if dur else 0
print("Transcrição pronta: %d frases. Áudio de %s levou %s (%.1f s carregando o modelo); %.2f s de trabalho por s de áudio."
      % (len(frases), hms(dur), hms(gasto), carregar, vel))
