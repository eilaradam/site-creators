"""Filtro de gosto musical: só passa a música que soa mais parecida com as que a Lara aprovou.

Uso:
  python filtrar_musica.py <id> [<id> ...]            ouve as candidatas e diz quais passam
  python filtrar_musica.py <id>=<url_do_preview> ...  quando já tem o link do preview (lqmp3Url do Epidemic)
  python filtrar_musica.py candidatas.json            o resultado do SearchRecordings salvo em arquivo (com título e stems)
  python filtrar_musica.py --aprovar <id> [...]       a Lara aprovou: entra no gosto.json como aprovada
  python filtrar_musica.py --reprovar <id> [...]      a Lara reprovou: entra como reprovada
  python filtrar_musica.py --relatorio                o que separa as aprovadas das reprovadas (relatorio.md)
Opções: --json (saída para o robô), --margem 0.01 (exige ficar essa distância mais perto das aprovadas)

Regra: passa quem fica mais perto das APROVADAS do que das REPROVADAS, somando duas distâncias:
  - medidas (brilho e peso do grave, padronizados): o que mais separou o gosto dela nos testes;
  - ouvido CLAP (embedding de 3 trechos de 10 s), com peso 10.
  nota = (dist_reprovadas - dist_aprovadas) das medidas + 10 x (dist_reprovadas - dist_aprovadas) do CLAP; passa se nota > margem.
"""
import json
import os
import sys

import numpy as np

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ouvido  # noqa: E402


def separar_args(argv):
    opts, ids = {"json": False, "margem": 0.0, "modo": "filtrar"}, []
    i = 0
    while i < len(argv):
        a = argv[i]
        if a == "--json":
            opts["json"] = True
        elif a == "--margem":
            opts["margem"] = float(argv[i + 1]); i += 1
        elif a in ("--aprovar", "--reprovar", "--relatorio"):
            opts["modo"] = a[2:]
        else:
            ids.append(a)
        i += 1
    return opts, ids


def infos_de(ids):
    """aceita ID ou ID=URL; o que vier sem URL é buscado no Epidemic"""
    infos, faltam = {}, []
    try:   # faixas que já vieram com link (as 13 primeiras que a Lara julgou)
        locais = {f["id"]: f for f in json.load(open(os.path.join(ouvido.DIR, "faixas_iniciais.json"), encoding="utf-8"))}
    except (OSError, ValueError):
        locais = {}
    for x in list(ids):
        if x.endswith(".json") and os.path.exists(x):   # resultado da busca do Epidemic salvo pelo robô
            dados = json.load(open(x, encoding="utf-8"))
            nos = dados.get("data", {}).get("recordings", {}).get("nodes", []) if isinstance(dados, dict) else dados
            for n in nos:
                rid, info = ouvido.info_de_no(n)
                infos[rid] = info
            continue
        rid, _, url = x.partition("=")
        rid = rid.strip()
        if url:
            infos[rid] = {"preview": url.strip()}
        elif os.path.exists(os.path.join(ouvido.CACHE, rid + ".json")):
            infos[rid] = {}
        elif rid in locais:
            infos[rid] = locais[rid]
        else:
            faltam.append(rid)
    if faltam:
        achadas = ouvido.buscar_epidemic(faltam)
        for rid in faltam:
            if rid not in achadas:
                print("não achei no Epidemic:", rid, file=sys.stderr)
            else:
                infos[rid] = achadas[rid]
    return infos


def notar(ids, nota):
    g = ouvido.carregar_gosto()
    for rid, info in infos_de(ids).items():
        a = ouvido.analisar(rid, info)
        g["faixas"][rid] = dict(a, nota=nota)
        print("%s: %s" % (nota, a.get("titulo") or rid))
    ouvido.salvar_gosto(g)


def filtrar(ids, margem, como_json):
    g = ouvido.carregar_gosto()
    conhecidas = {k: np.array(f["embedding"]) for k, f in g["faixas"].items() if f.get("embedding")}
    saida = []
    for rid, info in infos_de(ids).items():
        a = ouvido.analisar(rid, info)
        p = ouvido.pontuar(a, [f for k, f in g["faixas"].items() if k != rid])
        vizinha = max(conhecidas.items(), key=lambda kv: float(np.dot(kv[1], a["embedding"]))) if conhecidas and a.get("embedding") else None
        nota_previa = g["faixas"].get(rid, {}).get("nota")
        passa = (nota_previa == "aprovada") or (nota_previa != "reprovada" and p["nota"] > margem)
        saida.append(dict({"id": rid, "titulo": a.get("titulo"), "passa": passa, "nota_da_lara": nota_previa,
                      "mais_parecida_com": g["faixas"][vizinha[0]]["titulo"] + " (" + g["faixas"][vizinha[0]]["nota"] + ")" if vizinha else None,
                      "medidas": a["medidas"]}, **p))
    saida.sort(key=lambda x: -x["nota"])
    if como_json:
        print(json.dumps(saida, ensure_ascii=False, indent=1))
        return
    print("%-36s %-5s %7s %9s %8s  %s" % ("faixa", "passa", "nota", "brilho_hz", "grave_%", "mais parecida com"))
    for s in saida:
        print("%-36s %-5s %7.2f %9.0f %8.1f  %s" % ((s["titulo"] or s["id"])[:36], "SIM" if s["passa"] else "não", s["nota"],
                                                  s["medidas"]["brilho_hz"], s["medidas"]["grave_pct"], s["mais_parecida_com"]))


ROTULOS = [("bpm_medido", "BPM (medido no áudio)"), ("bpm_epidemic", "BPM (do Epidemic)"), ("brilho_hz", "Brilho, centroide espectral (Hz)"),
           ("energia_db", "Energia média (dBFS)"), ("variacao_db", "Variação da energia (desvio, dB)"), ("grave_pct", "Peso do grave < 150 Hz (% da energia)"),
           ("melodia_db", "Melodia vs mistura (dB, stem MELODY)"), ("ataques_por_s", "Ataques por segundo (onsets)")]


def relatorio():
    g = ouvido.carregar_gosto()
    fx = list(g["faixas"].values())
    ap = [f for f in fx if f["nota"] == "aprovada"]
    rp = [f for f in fx if f["nota"] == "reprovada"]

    def val(f, k):
        return f.get("bpm_epidemic") if k == "bpm_epidemic" else f["medidas"].get(k)

    L = ["# O que separa as músicas aprovadas das reprovadas", "",
         "%d aprovadas, %d reprovadas. Modelo: %s; %s." % (len(ap), len(rp), g.get("modelo"), g.get("trechos")), "",
         "| Medida | Aprovadas (média e faixa) | Reprovadas (média e faixa) | Separa? |", "|---|---|---|---|"]
    for k, nome in ROTULOS:
        a = [val(f, k) for f in ap if val(f, k) is not None]
        r = [val(f, k) for f in rp if val(f, k) is not None]
        if not a or not r:
            continue
        sd = np.sqrt((np.var(a) * len(a) + np.var(r) * len(r)) / max(1, len(a) + len(r))) or 1e-9
        efeito = (np.mean(a) - np.mean(r)) / sd
        fora = sum(1 for x in r if x < min(a) or x > max(a))
        sep = "forte" if abs(efeito) >= 1.2 else "média" if abs(efeito) >= 0.6 else "fraca"
        L.append("| %s | %.1f (%.1f a %.1f) | %.1f (%.1f a %.1f) | %s (d=%.2f); %d de %d reprovadas fora da faixa das aprovadas |"
                 % (nome, np.mean(a), min(a), max(a), np.mean(r), min(r), max(r), sep, efeito, fora, len(r)))
    # teste justo: cada faixa julgada com as médias calculadas SEM ela (como se fosse uma música nova)
    L += ["", "## Teste: cada faixa julgada como se fosse nova (fora do grupo)", "",
          "| Faixa | Nota da Lara | Só CLAP diria | Filtro (medidas + CLAP) diria | nota |", "|---|---|---|---|---|"]
    ac_clap = ac_fil = 0
    for f in fx:
        resto = [v for v in fx if v is not f]
        if not any(v["nota"] == "aprovada" for v in resto) or not any(v["nota"] == "reprovada" for v in resto):
            continue
        p = ouvido.pontuar(f, resto)
        so_clap = "aprovada" if p["clap_dist_aprovadas"] < p["clap_dist_reprovadas"] else "reprovada"
        filtro = "aprovada" if p["nota"] > 0 else "reprovada"
        ac_clap += so_clap == f["nota"]; ac_fil += filtro == f["nota"]
        L.append("| %s | %s | %s%s | %s%s | %.2f |" % (f["titulo"], f["nota"], so_clap, "" if so_clap == f["nota"] else " ✗",
                                                     filtro, "" if filtro == f["nota"] else " ✗", p["nota"]))
    L += ["", "Só o CLAP acertou %d de %d; o filtro (medidas + CLAP) acertou %d de %d, sem ter visto a faixa antes." % (ac_clap, len(fx), ac_fil, len(fx))]
    texto = "\n".join(L) + "\n"
    open(os.path.join(ouvido.DIR, "relatorio.md"), "w", encoding="utf-8").write(texto)
    print(texto)


if __name__ == "__main__":
    opts, ids = separar_args(sys.argv[1:])
    if opts["modo"] == "relatorio":
        relatorio()
    elif not ids:
        raise SystemExit(__doc__)
    elif opts["modo"] in ("aprovar", "reprovar"):
        notar(ids, opts["modo"][:-1] + "da")
    else:
        filtrar(ids, opts["margem"], opts["json"])
