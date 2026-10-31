"""Transcreve um áudio com tempo por palavra (faster-whisper, local, grátis).

Uso: ~/robo-edicao/venv/bin/python transcrever.py audio.wav saida.json [modelo] [idioma]
     idioma: pt (padrão), en, es... ou "auto" para o whisper detectar
Saída: [{"w": "palavra", "s": 0.12, "e": 0.40}, ...]
"""
import json
import sys

from faster_whisper import WhisperModel

audio, saida = sys.argv[1], sys.argv[2]
modelo = sys.argv[3] if len(sys.argv) > 3 else "small"
idioma = sys.argv[4] if len(sys.argv) > 4 else "pt"
m = WhisperModel(modelo, device="cpu", compute_type="int8")
segs, _ = m.transcribe(audio, language=None if idioma == "auto" else idioma, word_timestamps=True, vad_filter=True)
palavras = [{"w": w.word.strip(), "s": round(w.start, 3), "e": round(w.end, 3)}
            for seg in segs for w in (seg.words or []) if w.word.strip()]
with open(saida, "w", encoding="utf-8") as f:
    json.dump(palavras, f, ensure_ascii=False)
print(len(palavras), "palavras")
