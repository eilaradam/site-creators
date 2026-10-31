"""Gera uma imagem por emenda do vídeo: tira de quadros + forma de onda, para conferir o corte olhando.

Use no vídeo JÁ RENDERIZADO (saida/previa.mp4), nunca no bruto. Em cada emenda, olhe a imagem (Read) e procure:
pulo de imagem estranho, estalo (pico na onda bem no corte), palavra cortada no meio (onda cortada em cima da voz),
respiração sobrando no começo do trecho, legenda escondida atrás de título.

Uso:
  python3 -I conferir_cortes.py <video> --projeto saida/projeto.json [--saida work/conferir]
  python3 -I conferir_cortes.py <video> 12.4 30.1 ...          (tempos avulsos, em segundos)
Opções: --janela 1.5 (segundos antes e depois da emenda), --quadros 6

Só usa ffmpeg (sem bibliotecas extras). Ideia adaptada do video-use (browser-use/video-use, licença MIT): timeline_view.py.
"""
import json
import os
import subprocess
import sys


def emendas_do_projeto(caminho):
    with open(caminho, encoding="utf-8") as f:
        pj = json.load(f)
    cortes = sorted((c for c in pj.get("camadas", []) if c.get("tipo") == "corte"), key=lambda c: c["inicio_s"])
    # a emenda é o fim de cada corte (menos o último)
    return [round(c["fim_s"], 3) for c in cortes[:-1]]


def duracao(video):
    r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", video],
                       capture_output=True, text=True)
    return float(r.stdout.strip() or 0)


def imagem(video, t, janela, n, saida):
    ini = max(0.0, t - janela)
    dur = janela * 2
    largura = 1200
    w_quadro = largura // n
    fps = n / dur
    # quadros em fileira + onda do mesmo trecho + marca vermelha no meio (a emenda)
    filtro = (
        "[0:v]fps=%f,scale=%d:-2,tile=%dx1[q];"
        "[0:a]aformat=channel_layouts=mono,showwavespic=s=%dx160:colors=white:split_channels=0[o];"
        "[q][o]vstack=inputs=2,drawbox=x=%d:y=0:w=3:h=ih:color=red@0.9:t=fill[s]"
    ) % (fps, w_quadro, n, w_quadro * n, (w_quadro * n) // 2 - 1)
    cmd = ["ffmpeg", "-v", "error", "-y", "-ss", "%.3f" % ini, "-t", "%.3f" % dur, "-i", video,
           "-filter_complex", filtro, "-map", "[s]", "-frames:v", "1", saida]
    r = subprocess.run(cmd, capture_output=True, text=True)
    if r.returncode != 0:
        raise RuntimeError(r.stderr.strip().splitlines()[-1] if r.stderr.strip() else "ffmpeg falhou")


def main():
    args = sys.argv[1:]
    opc = {"--projeto": None, "--saida": "work/conferir", "--janela": "1.5", "--quadros": "6"}
    resto = []
    i = 0
    while i < len(args):
        if args[i] in opc:
            opc[args[i]] = args[i + 1]
            i += 2
        else:
            resto.append(args[i])
            i += 1
    video = resto[0]
    tempos = [float(x) for x in resto[1:]]
    if opc["--projeto"]:
        tempos += emendas_do_projeto(opc["--projeto"])
    total = duracao(video)
    # sempre confere também o começo e o fim do vídeo
    tempos = sorted(set([min(1.5, total / 2)] + tempos + [max(0, total - 1.5)]))
    os.makedirs(opc["--saida"], exist_ok=True)
    feitos = []
    for k, t in enumerate(tempos, 1):
        arq = os.path.join(opc["--saida"], "emenda_%02d_%06.2fs.png" % (k, t))
        try:
            imagem(video, t, float(opc["--janela"]), int(opc["--quadros"]), arq)
            feitos.append(arq)
        except RuntimeError as e:
            print("não consegui a emenda em %.2f s: %s" % (t, e))
    print(len(feitos), "imagens em", opc["--saida"], "(a linha vermelha é a emenda)")


if __name__ == "__main__":
    main()
