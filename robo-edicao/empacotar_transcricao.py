"""Transforma a transcrição palavra por palavra numa leitura por frases, com o tempo de cada uma.

É a "visão principal" para escolher tomadas e cortes: dá a mesma precisão das palavras com
uma fração do texto. Cada linha é uma frase; a frase quebra em silêncio >= 0,5 s ou em fim de frase
seguido de pausa. Entre as linhas aparece o tamanho do silêncio.

Uso: python3 -I empacotar_transcricao.py palavras.json [saida.md] [--pausa 0.5]
Entrada: [{"w": "palavra", "s": 0.12, "e": 0.40}, ...]  (saída do transcrever.py)

Ideia adaptada do video-use (browser-use/video-use, licença MIT): pack_transcripts.py.
"""
import json
import re
import sys


def empacotar(palavras, pausa=0.5):
    frases, atual = [], []
    for i, p in enumerate(palavras):
        atual.append(p)
        prox = palavras[i + 1] if i + 1 < len(palavras) else None
        gap = (prox["s"] - p["e"]) if prox else 99
        fim = bool(re.search(r"[.!?]$", p["w"]))
        if gap >= pausa or (fim and gap >= 0.25):
            frases.append(atual)
            atual = []
    if atual:
        frases.append(atual)
    return frases


def main():
    args = [a for a in sys.argv[1:]]
    pausa = 0.5
    if "--pausa" in args:
        i = args.index("--pausa")
        pausa = float(args[i + 1])
        del args[i:i + 2]
    entrada = args[0]
    saida = args[1] if len(args) > 1 else None
    with open(entrada, encoding="utf-8") as f:
        palavras = [p for p in json.load(f) if str(p.get("w", "")).strip()]
    frases = empacotar(palavras, pausa)
    linhas = ["# Transcrição por frases (%d frases, %.1f s)" % (len(frases), palavras[-1]["e"] if palavras else 0), "",
              "Formato: [início-fim] frase. Entre as frases, o silêncio. Frases parecidas em sequência = tomadas repetidas.", ""]
    ant = None
    for fr in frases:
        if ant is not None:
            g = fr[0]["s"] - ant
            if g >= 0.15:
                linhas.append("      · silêncio %.2f s" % g)
        linhas.append("[%07.2f-%07.2f] %s" % (fr[0]["s"], fr[-1]["e"], " ".join(p["w"].strip() for p in fr)))
        ant = fr[-1]["e"]
    texto = "\n".join(linhas) + "\n"
    if saida:
        with open(saida, "w", encoding="utf-8") as f:
            f.write(texto)
        print(len(frases), "frases →", saida)
    else:
        sys.stdout.write(texto)


if __name__ == "__main__":
    main()
