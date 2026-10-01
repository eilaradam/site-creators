"""Transcricao com faster-whisper, com timestamp por palavra.

Uso: python3 transcrever.py <audio.wav> <modelo> <idioma>
Imprime no stdout o JSON normalizado que o studio consome.
"""
import json
import sys


def main() -> int:
    if len(sys.argv) < 2:
        print("uso: transcrever.py <audio> [modelo] [idioma]", file=sys.stderr)
        return 2
    audio = sys.argv[1]
    modelo = sys.argv[2] if len(sys.argv) > 2 else "medium"
    idioma = sys.argv[3] if len(sys.argv) > 3 else "pt"

    try:
        from faster_whisper import WhisperModel
    except ImportError:
        print(
            "faster-whisper nao instalado. Rode: pip install faster-whisper",
            file=sys.stderr,
        )
        return 3

    model = WhisperModel(modelo, device="auto", compute_type="int8")
    segmentos_iter, info = model.transcribe(
        audio,
        language=idioma,
        word_timestamps=True,
        vad_filter=False,
        condition_on_previous_text=False,
    )

    segmentos = []
    for s in segmentos_iter:
        palavras = [
            {
                "inicio": round(w.start, 3),
                "fim": round(w.end, 3),
                "palavra": w.word.strip(),
                "prob": round(getattr(w, "probability", 0.0) or 0.0, 3),
            }
            for w in (s.words or [])
            if w.word and w.word.strip()
        ]
        segmentos.append(
            {
                "inicio": round(s.start, 3),
                "fim": round(s.end, 3),
                "texto": s.text.strip(),
                "palavras": palavras,
            }
        )

    json.dump(
        {
            "idioma": info.language,
            "modelo": modelo,
            "backend": "fasterwhisper",
            "segmentos": segmentos,
        },
        sys.stdout,
        ensure_ascii=False,
    )
    return 0


if __name__ == "__main__":
    sys.exit(main())
