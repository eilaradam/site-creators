"""Biblioteca de fontes do robô: baixa as famílias de fontes.json (Google Fonts, licença livre para uso comercial)
para ~/robo-edicao/fontes. Fonte variável vira arquivos fixos por peso (Regular, SemiBold, Bold, ExtraBold, Black),
porque a legenda (libass) não escolhe peso de fonte variável.

Uso: ~/robo-edicao/venv/bin/python baixar_fontes.py fontes.json ~/robo-edicao/fontes
Só baixa o que ainda não tem; pode rodar de novo quando a lista crescer.
"""
import json
import sys
import urllib.request
from pathlib import Path

from fontTools.ttLib import TTFont
from fontTools.varLib import instancer

lista, destino = json.load(open(sys.argv[1], encoding="utf-8")), Path(sys.argv[2]).expanduser()
destino.mkdir(parents=True, exist_ok=True)
# tudo direto na pasta (a legenda só lê a pasta, não subpastas); as variáveis originais ficam ao lado
variaveis = destino.parent / (destino.name + "_variaveis")
variaveis.mkdir(exist_ok=True)
BASE = "https://raw.githubusercontent.com/google/fonts/main/"
NOMES = {100: "Thin", 200: "ExtraLight", 300: "Light", 400: "Regular", 500: "Medium", 600: "SemiBold",
         700: "Bold", 800: "ExtraBold", 900: "Black"}


def baixar(url, arq):
    if not arq.exists():
        tmp = arq.with_suffix(".parcial")
        urllib.request.urlretrieve(url, tmp)
        tmp.rename(arq)


def renomear(f, familia, estilo):
    """Nome que a legenda e o Remotion procuram: família "Montserrat ExtraBold", estilo Regular/Italic."""
    italico = "Italic" in estilo
    base = estilo.replace("Italic", "").strip() or "Regular"
    fam = familia if base == "Regular" else "%s %s" % (familia, base)
    sub = "Italic" if italico else "Regular"
    completo = ("%s %s" % (familia, estilo)).replace(" Regular Italic", " Italic")
    nome = f["name"]
    for rec in list(nome.names):
        if rec.nameID in (1, 2, 4, 6, 16, 17, 21, 22, 25):
            nome.removeNames(nameID=rec.nameID)
    for i, v in ((1, fam), (2, sub), (4, completo), (6, completo.replace(" ", "-")), (16, familia), (17, estilo)):
        nome.setName(v, i, 3, 1, 0x409)
        nome.setName(v, i, 1, 0, 0)


feitas = 0
for item in lista:
    pasta = destino
    for nome in item["arquivos"]:
        url = BASE + item["pasta"] + "/" + urllib.request.quote(nome)
        if "[" not in nome:
            baixar(url, pasta / nome)
            continue
        var = variaveis / nome.replace("[", "_").replace("]", "").replace(",", "_")
        baixar(url, var)
        italico = "Italic" in nome
        for peso in item["pesos_fixos"]:
            estilo = NOMES[peso] + (" Italic" if italico else "")
            saida = pasta / ("%s-%s.ttf" % (item["familia"].replace(" ", ""), estilo.replace(" ", "")))
            if saida.exists():
                continue
            f = TTFont(var)
            eixos = {a.axisTag: a for a in f["fvar"].axes}
            if "wght" not in eixos and peso != item["pesos_fixos"][0]:
                continue   # sem eixo de peso (ex.: League Gothic só varia a largura): um arquivo basta
            fixo = {tag: a.defaultValue for tag, a in eixos.items()}   # largura, tamanho óptico... no padrão
            if "wght" in eixos:
                fixo["wght"] = max(eixos["wght"].minValue, min(eixos["wght"].maxValue, peso))
            else:
                estilo = "Regular" + (" Italic" if italico else "")
                saida = pasta / ("%s-%s.ttf" % (item["familia"].replace(" ", ""), estilo.replace(" ", "")))
            inst = instancer.instantiateVariableFont(f, fixo)
            renomear(inst, item["familia"], estilo)
            inst.save(saida)
            feitas += 1
print("fontes prontas em", destino, "(%d novas)" % feitas)
