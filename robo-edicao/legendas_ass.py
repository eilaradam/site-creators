"""Gera a legenda .ass de um modelo pronto (legendas.json) a partir das palavras com tempo.

Uso: python3 legendas_ass.py palavras.json legendas.json <id_do_modelo> <largura> <altura> saida.ass [marca]
  palavras.json: [{"w": "palavra", "s": 0.12, "e": 0.40}, ...]  (tempos do vídeo final)
Depois: ffmpeg -i video.mp4 -vf "ass=saida.ass:fontsdir=$HOME/robo-edicao/fontes" ...
"""
import json
import re
import sys

pal_arq, mod_arq, mod_id, W, H, saida = sys.argv[1:7]
marca = sys.argv[7] if len(sys.argv) > 7 else ""
W, H = int(W), int(H)
palavras = json.load(open(pal_arq, encoding="utf-8"))
m = next(x for x in json.load(open(mod_arq, encoding="utf-8")) if x["id"] == mod_id)


def cor(hexa, alfa=0):
    h = hexa.lstrip("#")
    return "&H%02X%s%s%s" % (alfa, h[4:6], h[2:4], h[0:2])


def tempo(t):
    t = max(0, t)
    return "%d:%02d:%05.2f" % (t // 3600, t % 3600 // 60, t % 60)


def limpo(w):
    return w.replace("{", "(").replace("}", ")").replace("\\", "/")


FORTES = {"nunca", "ninguem", "ninguém", "gratis", "grátis", "segredo", "agora", "sempre", "zero", "dinheiro", "nada"}
marca_n = re.sub(r"\W", "", marca.lower())


def forte(w):
    n = re.sub(r"[^\wà-ú%$]", "", w.lower())
    return bool(re.search(r"\d|r\$|%", n)) or n in FORTES or (marca_n and re.sub(r"\W", "", n) == marca_n)


tam = round(m["tamanho"] * H)
caixa = m["fundo"] == "caixa"
estilo = ",".join(str(x) for x in [
    "Base", m["fonte"], tam, cor(m["cor"]), cor(m["destaque"]), cor(m["contorno_cor"]), cor("#000000", 0x80),
    0, -1 if m.get("italico") else 0, 0, 0, 100, 100, 0, 0,
    3 if caixa else 1, m["contorno"], m["sombra"], 2, round(W * 0.08), round(W * 0.08), round(H * (1 - m["posicao"])), 1])

# agrupa: até N palavras por tela, quebrando em pontuação e em pausa maior que 0,5 s
grupos, atual = [], []
for i, p in enumerate(palavras):
    atual.append(p)
    pausa = i + 1 < len(palavras) and palavras[i + 1]["s"] - p["e"] > 0.5
    # não deixa uma palavra sozinha no fim da frase: se a próxima fecha a frase, ela entra nesta tela
    orfa = m["palavras"] > 1 and i + 1 < len(palavras) and re.search(r"[.!?…]$", palavras[i + 1]["w"]) and len(atual) == m["palavras"]
    if (len(atual) >= m["palavras"] and not orfa) or len(atual) > m["palavras"] or re.search(r"[.!?…]$", p["w"]) or pausa:
        grupos.append(atual)
        atual = []
if atual:
    grupos.append(atual)

entrada = {"pop": r"{\fscx80\fscy80\t(0,90,\fscx106\fscy106)\t(90,160,\fscx100\fscy100)}",
           "fade": r"{\fad(120,0)}", "nenhuma": ""}[m["animacao"]]
alta = m["caixa"] == "alta"
txt = (lambda w: limpo(w).upper()) if alta else limpo
linhas = []
for gi, g in enumerate(grupos):
    fim_g = g[-1]["e"] + 0.15
    if gi + 1 < len(grupos):
        fim_g = min(fim_g + 0.25, grupos[gi + 1][0]["s"])
    if m["modo"] == "karaoke":
        for k, p in enumerate(g):   # uma linha por palavra falada: ela acende, as outras ficam na cor base
            ini = p["s"] if k else g[0]["s"]
            fim = g[k + 1]["s"] if k + 1 < len(g) else fim_g
            partes = []
            for j, q in enumerate(g):
                if j == k:
                    partes.append(r"{\c%s\fscx112\fscy112\t(0,80,\fscx100\fscy100)}%s{\c%s}" % (cor(m["destaque"]), txt(q["w"]), cor(m["cor"])))
                else:
                    partes.append(txt(q["w"]))
            linhas.append((ini, fim, (entrada if k == 0 else "") + " ".join(partes)))
    else:
        partes = [(r"{\c%s}%s{\c%s}" % (cor(m["destaque"]), txt(q["w"]), cor(m["cor"])) if forte(q["w"]) else txt(q["w"])) for q in g]
        linhas.append((g[0]["s"], fim_g, entrada + " ".join(partes)))

with open(saida, "w", encoding="utf-8") as f:
    f.write("[Script Info]\nScriptType: v4.00+\nPlayResX: %d\nPlayResY: %d\nWrapStyle: 0\nScaledBorderAndShadow: yes\n\n" % (W, H))
    f.write("[V4+ Styles]\nFormat: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, "
            "Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding\n")
    f.write("Style: " + estilo + "\n\n[Events]\nFormat: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text\n")
    for ini, fim, t in linhas:
        f.write("Dialogue: 0,%s,%s,Base,,0,0,0,,%s\n" % (tempo(ini), tempo(fim), t))
print(len(linhas), "linhas de legenda")
