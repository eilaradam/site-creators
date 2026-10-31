"""Monta o vídeo a partir de saida/projeto.json: o mesmo projeto que a Lara reedita no admin.

Uso:
  python3 -I montar.py <pasta_do_job>                       gera saida/previa.mp4 e saida/base.mp4
  python3 -I montar.py <pasta_do_job> --projeto saida/projeto_b.json   opção B: saida/previa_b.mp4 e saida/base_b.mp4
  python3 -I montar.py <pasta_do_job> --legendas palavras.json
      cria as camadas de legenda no projeto.json (uma camada por tela, no modelo do projeto) e sai

saida/base.mp4 é a versão leve (720p) sem legenda e sem títulos: o admin desenha esses dois por cima
para a Lara mexer ao vivo. Trechos e títulos ficam guardados em work/montar/, então numa reedição
só o que mudou é refeito.

Camadas (tempos sempre no vídeo final):
  corte     inicio_s, fim_s, origem, origem_inicio_s, velocidade, mudo   trechos do bruto, emendados na ordem
            (mudo true = sem o som daquele trecho, ex.: cena coberta pela narração)
            (velocidade 2 = o dobro do bruto no mesmo tempo; o trecho usa (fim_s - inicio_s) * velocidade do bruto)
  zoom      inicio_s, fim_s, escala, cx, cy, entrada_s          punch-in com easing (entrada_s 0 = seco)
  rec/broll inicio_s, fim_s, arquivo, origem_inicio_s, x, y, escala   vídeo por cima (escala 1 = tela cheia)
  imagem    inicio_s, fim_s, arquivo, x, y, escala             png/jpg por cima (logo, print)
  animacao  com "arquivo": .mov com fundo transparente feito no Remotion
            com "modelo": título da biblioteca (titulos/), props texto, destaque, numero, prefixo, cor,
            corDestaque, corFundo, arquivoFonte; x, y = centro do título (0 a 1), escala
  legenda   inicio_s, fim_s, texto, palavras [{w, s, e}]       uma tela de legenda
  voz       inicio_s, fim_s, arquivo, origem_inicio_s, volume_db (padrão 0): locução gravada à parte
  musica    inicio_s, fim_s, arquivo, origem_inicio_s, volume_db = dB ABAIXO DA VOZ (padrão -16, medido em LUFS;
            o montador mede a voz e a música e acerta sozinho; volume constante, sem subir e descer)
  sfx       inicio_s, arquivo, volume_db (padrão -18)
Topo do projeto: formato, legenda {modelo, posicao, tamanho (multiplica o do modelo), ativa, e o que a Lara trocou do modelo no admin:
  cor, destaque, caixa, contorno, contorno_cor, fundo, sombra, animacao, modo}, marca, som_original (false = tira o som do bruto),
  cor {lut, forca}: LUT .cube na imagem gravada (lut = arquivo de luts/ do robô ou "storage:luts/x.cube" que o robô baixa
  em work/luts/; forca 0 a 1). Prints, telas e logos por cima ficam sem LUT, e a base do admin sai sem ela (o admin mostra ao vivo).
"""
import hashlib
import json
import os
import re
import subprocess
import sys
from concurrent.futures import ThreadPoolExecutor

DIR = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, DIR)
import legendas_ass  # noqa: E402

TAMANHO = {"9:16": (1080, 1920), "4:5": (1080, 1350), "1:1": (1080, 1080), "16:9": (1920, 1080)}
FPS = 30
SONS = os.path.expanduser(os.environ.get("ROBO_SONS", "~/Desktop/sons"))
FONTES = os.path.join(DIR, "fontes")
LUTS = os.path.join(DIR, "luts")
TITULOS = os.path.join(DIR, "titulos")
IMAGEM = re.compile(r"\.(png|jpe?g|webp)$", re.I)


_FF_VERSAO = None


def ffmpeg_versao():
    """Versão principal do ffmpeg instalado (ex.: 9). 0 se não der para saber."""
    global _FF_VERSAO
    if _FF_VERSAO is None:
        try:
            r = subprocess.run(["ffmpeg", "-version"], capture_output=True, text=True)
            m = re.search(r"ffmpeg version n?(\d+)", r.stdout)
            _FF_VERSAO = int(m.group(1)) if m else 0
        except Exception:
            _FF_VERSAO = 0
    return _FF_VERSAO


def ff(args, quieto=True):
    # Do ffmpeg 7 em diante o grafo em arquivo é "-/filter_complex arquivo";
    # o ffmpeg 9 não aceita mais o antigo "-filter_complex_script".
    if ffmpeg_versao() >= 7:
        args = ["-/filter_complex" if a == "-filter_complex_script" else a for a in args]
    r = subprocess.run(["ffmpeg", "-v", "error", "-y"] + args, capture_output=True, text=True)
    if r.returncode != 0:
        raise SystemExit("ffmpeg: " + (r.stderr.strip().splitlines() or ["erro"])[-1])


def medir_volume(arq):
    """Loudness integrada (LUFS) e pico real (dBTP) do áudio do arquivo."""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-nostats", "-i", arq, "-map", "0:a:0", "-af", "ebur128=peak=true", "-f", "null", "-"],
                       capture_output=True, text=True)
    txt = r.stderr.split("Summary:")[-1]
    i = re.search(r"I:\s+(-?[\d.]+) LUFS", txt)
    tp = re.search(r"Peak:\s+(-?[\d.]+) dBFS", txt)
    return (float(i.group(1)) if i else None), (float(tp.group(1)) if tp else None)


def acertar_volume(arq, alvo=-14.0, teto=-1.0):
    """Segunda passada: o loudnorm numa passada só fica abaixo do alvo (ex.: -16,3 LUFS).
    Mede o arquivo pronto e corrige só o ganho do áudio, sem passar do teto de pico."""
    if not os.path.exists(arq) or not tem_audio(arq):
        return
    lufs, _ = medir_volume(arq)
    if lufs is None:
        return
    ganho = max(-6.0, min(6.0, alvo - lufs))
    if abs(ganho) < 0.3:
        return
    # o limitador segura os picos que o ganho empurraria acima do teto (-1 dBTP com folga)
    limite = 10 ** ((teto - 0.5) / 20)
    filtro = "volume=%.2fdB,alimiter=limit=%.3f:attack=2:release=50:level=false" % (ganho, limite)
    tmp = arq + ".vol.mp4"
    ff(["-i", arq, "-map", "0", "-c:v", "copy", "-af", filtro, "-c:a", "aac",
        "-b:a", "192k", "-movflags", "+faststart", tmp])
    os.replace(tmp, arq)
    depois, pico = medir_volume(arq)
    print("montar: volume acertado de %.1f para %s LUFS (pico %s dBTP)" % (lufs, depois, pico), flush=True)


def tem_audio(arq):
    r = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a", "-show_entries", "stream=index", "-of", "csv=p=0", arq],
                       capture_output=True, text=True)
    return bool(r.stdout.strip())


def lufs(arq, ss=None, t=None):
    """loudness integrada (LUFS) de um arquivo ou trecho; None se for silêncio ou não der para medir"""
    args = ["ffmpeg", "-hide_banner", "-nostats"] + (["-ss", "%.3f" % ss] if ss else []) + (["-t", "%.3f" % t] if t else []) + \
        ["-i", arq, "-vn", "-af", "ebur128=framelog=quiet", "-f", "null", "-"]
    r = subprocess.run(args, capture_output=True, text=True)
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    v = float(m[-1]) if m else None
    return v if v is not None and v > -60 else None


def caixa_visivel(mov, dur):
    """retângulo (x1, y1, x2, y2) onde o título tem pixel visível, no meio da animação; None se não der para medir"""
    r = subprocess.run(["ffmpeg", "-hide_banner", "-ss", "%.2f" % max(0, dur * 0.55), "-i", mov, "-vf", "alphaextract,bbox=min_val=24",
                        "-frames:v", "1", "-f", "null", "-"], capture_output=True, text=True)
    m = re.findall(r"x1:(\d+) x2:(\d+) y1:(\d+) y2:(\d+)", r.stderr)
    if not m:
        return None
    x1, x2, y1, y2 = map(int, m[-1])
    return x1, y1, x2, y2


def hash_de(*partes):
    return hashlib.sha1(json.dumps(partes, sort_keys=True, ensure_ascii=False).encode()).hexdigest()[:16]


class Projeto:
    def __init__(self, job, arq=None):
        self.job = os.path.abspath(job)
        self.arq = os.path.join(self.job, arq) if arq else os.path.join(self.job, "saida", "projeto.json")
        # opção B (saida/projeto_b.json) sai como previa_b.mp4, base_b.mp4 e legendas_b.srt
        m = re.match(r"projeto(_\w+)?\.json$", os.path.basename(self.arq))
        self.sufixo = (m.group(1) or "") if m else "_" + os.path.splitext(os.path.basename(self.arq))[0]
        self.p = json.load(open(self.arq, encoding="utf-8"))
        self.W, self.H = TAMANHO.get(self.p.get("formato") or "9:16", (1080, 1920))
        self.cache = os.path.join(self.job, "work", "montar")
        os.makedirs(self.cache, exist_ok=True)
        self._sons = None

    def camadas(self, *tipos):
        cam = [c for c in self.p.get("camadas", []) if c.get("tipo") in tipos]
        return sorted(cam, key=lambda c: float(c.get("inicio_s") or 0))

    def achar(self, nome):
        """arquivo da camada: caminho do job, entrada/, work/, ou do banco de sons pelo nome"""
        if not nome:
            raise SystemExit("camada sem arquivo")
        for c in [nome, os.path.join(self.job, nome), os.path.join(self.job, "entrada", nome), os.path.join(self.job, "work", nome),
                  os.path.join(self.job, "work", "sfx", nome), os.path.join(self.job, "work", "musica", nome), os.path.join(self.job, "saida", nome)]:
            if os.path.isfile(c):
                return os.path.abspath(c)
        if self._sons is None:
            self._sons = {}
            for raiz, _, arqs in os.walk(SONS):
                for a in arqs:
                    self._sons.setdefault(a.lower(), os.path.join(raiz, a))
        achado = self._sons.get(os.path.basename(nome).lower())
        if achado:
            return achado
        raise SystemExit("não achei o arquivo " + nome)


def zoom_expr(zooms, t0):
    """fator de zoom no frame 'on' do trecho que começa em t0 no vídeo final"""
    T = "(%.3f+on/%d)" % (t0, FPS)
    partes = []
    for z in zooms:
        a, b, s = float(z["inicio_s"]), float(z["fim_s"]), float(z.get("escala") or 1.12)
        rampa = float(z.get("entrada_s", 0.25))
        sobe = "(1-pow(1-min(1,(%s-%.3f)/%.3f),3))" % (T, a, rampa) if rampa > 0 else "1"
        partes.append("if(between(%s,%.3f,%.3f),%.4f*%s,0)" % (T, a, b, s - 1, sobe))
    return "1+" + "+".join(partes)


def trechos(pj):
    W, H = pj.W, pj.H
    cortes = pj.camadas("corte")
    if not cortes:
        raise SystemExit("o projeto não tem nenhuma camada corte")
    zooms = pj.camadas("zoom")
    mudo = pj.p.get("som_original") is False      # vlog sem fala: o som do bruto sai, fica só música e efeitos
    tarefas, t = [], 0.0
    for c in cortes:
        dur = round(float(c["fim_s"]) - float(c["inicio_s"]), 3)
        if dur <= 0.04:
            continue
        src = pj.achar(c.get("origem"))
        oi = float(c.get("origem_inicio_s") or 0)
        vel = max(0.25, min(8.0, float(c.get("velocidade") or 1)))   # 2 = duas vezes mais rápido (usa o dobro do bruto)
        if vel < 1 and not pj.p.get("camera_lenta"):   # câmera lenta só quando a Lara pede (observação ou ela mesma no editor)
            vel = 1.0
        vf = ("setpts=PTS/%.4f," % vel if vel != 1 else "") + "scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d,setsar=1,fps=%d" % (W, H, W, H, FPS)
        aqui = [z for z in zooms if float(z["inicio_s"]) < t + dur and float(z["fim_s"]) > t and float(z.get("escala") or 1) != 1]
        if aqui:
            cx = float(aqui[0].get("cx", 0.5))
            cy = float(aqui[0].get("cy", 0.42))
            vf += ",zoompan=z='%s':x='(iw-iw/zoom)*%.3f':y='(ih-ih/zoom)*%.3f':d=1:s=%dx%d:fps=%d" % (zoom_expr(aqui, t), cx, cy, W, H, FPS)
        fade = min(0.03, dur / 4)
        af = None if mudo or c.get("mudo") else ("atempo=%.4f," % vel if vel != 1 else "") + "aresample=48000,afade=t=in:d=%.3f,afade=t=out:st=%.3f:d=%.3f" % (fade, dur - fade, fade)
        chave = hash_de(src, os.path.getmtime(src), oi, dur, vel, vf, af)
        tarefas.append((os.path.join(pj.cache, "trecho_" + chave + ".mp4"), src, oi, dur, vf, af, vel))
        t += dur
    return tarefas, round(t, 3)


def fazer_trecho(tarefa):
    saida, src, oi, dur, vf, af, vel = tarefa
    if os.path.exists(saida):
        return False
    args = ["-ss", "%.3f" % oi, "-t", "%.3f" % (dur * vel), "-i", src]
    if af and tem_audio(src):
        canais = subprocess.run(["ffprobe", "-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels", "-of", "csv=p=0", src],
                                capture_output=True, text=True).stdout.strip()
        if canais == "1":   # mono vira estéreo no mesmo volume (o padrão do ffmpeg baixaria 3 dB)
            af = "pan=stereo|c0=c0|c1=c0," + af
        args += ["-map", "0:v:0", "-map", "0:a:0", "-af", af]
    else:
        args += ["-f", "lavfi", "-t", "%.3f" % dur, "-i", "anullsrc=r=48000:cl=stereo", "-map", "0:v:0", "-map", "1:a:0"]
    ff(args + ["-vf", vf, "-c:v", "libx264", "-preset", "veryfast", "-crf", "18", "-pix_fmt", "yuv420p",
               "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-ac", "2", "-t", "%.3f" % dur, saida + ".tmp.mp4"])
    os.replace(saida + ".tmp.mp4", saida)
    return True


def titulo(pj, c):
    """renderiza (ou reaproveita) o título da biblioteca no Remotion, com fundo transparente"""
    props = {k: c[k] for k in ("texto", "destaque", "numero", "prefixo", "cor", "corDestaque", "corFundo", "arquivoFonte") if c.get(k) not in (None, "")}
    props.update(c.get("props") or {})
    props["posicao"] = 0.5   # renderiza no centro; a posição (x, y) e a escala entram no encaixe, sem renderizar de novo
    props["duracao_s"] = round(float(c["fim_s"]) - float(c["inicio_s"]), 2)
    props["largura"], props["altura"] = pj.W, pj.H
    modelo = c["modelo"]
    saida = os.path.join(pj.cache, "titulo_" + hash_de(modelo, props, os.path.getmtime(os.path.join(TITULOS, "src", "Titulos.tsx"))) + ".mov")
    if os.path.exists(saida):
        return saida
    arq_props = saida + ".json"
    json.dump(props, open(arq_props, "w", encoding="utf-8"), ensure_ascii=False)
    print("montar: renderizando o título", modelo, "·", props.get("texto", ""), flush=True)
    r = subprocess.run(["npx", "remotion", "render", "src/index.ts", modelo, saida + ".tmp.mov", "--props=" + arq_props,
                        "--image-format=png", "--codec=prores", "--prores-profile=4444", "--pixel-format=yuva444p10le", "--log=error"]
                       + (["--browser-executable=" + os.environ["ROBO_NAVEGADOR"]] if os.environ.get("ROBO_NAVEGADOR") else []),
                       cwd=TITULOS, capture_output=True, text=True)
    if r.returncode != 0 or not os.path.exists(saida + ".tmp.mov"):
        raise SystemExit("Remotion não renderizou o título %s: %s" % (modelo, (r.stderr or r.stdout).strip()[-400:]))
    os.replace(saida + ".tmp.mov", saida)
    return saida


def telas_de_legenda(pj):
    """uma tela por camada legenda; se a Lara mudou o texto, os tempos das palavras são redistribuídos"""
    grupos, fins = [], []
    for c in pj.camadas("legenda"):
        ini, fim = float(c["inicio_s"]), float(c["fim_s"])
        texto = str(c.get("texto") or "").split()
        pal = c.get("palavras") or []
        if not texto:
            continue
        if [p["w"] for p in pal] != texto:
            passo = (fim - ini) / len(texto)
            pal = [{"w": w, "s": round(ini + k * passo, 3), "e": round(ini + (k + 1) * passo, 3)} for k, w in enumerate(texto)]
        grupos.append(pal)
        fins.append(fim)
    return grupos, fins


def srt(pj):
    def t(x):
        ms = int(round(max(0, x) * 1000))
        return "%02d:%02d:%02d,%03d" % (ms // 3600000, ms // 60000 % 60, ms // 1000 % 60, ms % 1000)
    linhas = []
    for k, c in enumerate(pj.camadas("legenda")):
        linhas.append("%d\n%s --> %s\n%s\n" % (k + 1, t(float(c["inicio_s"])), t(float(c["fim_s"])), c.get("texto", "")))
    return "\n".join(linhas)


def modelo_legenda(pj):
    leg = pj.p.get("legenda") or {}
    if leg.get("ativa") is False or leg.get("modelo") is None and "modelo" in leg:
        return None, leg
    m = dict(legendas_ass.modelo(os.path.join(DIR, "legendas.json"), leg.get("modelo") or "lara"))
    if leg.get("tamanho"):   # a Lara aumentou ou diminuiu a legenda no admin
        m["tamanho"] = m["tamanho"] * float(leg["tamanho"])
    for k in LEG_TROCAVEL:   # cor, caixa, contorno... que ela trocou no admin por cima do modelo
        if leg.get(k) is not None and leg.get(k) != "":
            m[k] = leg[k]
    return m, leg


LEG_TROCAVEL = ("cor", "destaque", "caixa", "contorno", "contorno_cor", "fundo", "sombra", "animacao", "modo")


def lut_do_projeto(pj):
    """(caminho do .cube, força 0 a 1) ou (None, 0) se o projeto não tem cor"""
    cor = pj.p.get("cor") or {}
    nome = str(cor.get("lut") or "").strip()
    forca = max(0.0, min(1.0, float(cor.get("forca", 1) or 0)))
    if not nome or forca < 0.02:
        return None, 0
    base = os.path.basename(nome.replace("storage:", ""))
    for arq in (os.path.join(pj.job, "work", "luts", base), os.path.join(LUTS, base)):
        if os.path.exists(arq):
            return arq, forca
    raise SystemExit("LUT não encontrada: %s (procurei em work/luts/ e na biblioteca luts/)" % nome)


def criar_legendas(pj, palavras_arq):
    m, leg = modelo_legenda(pj)
    m = m or legendas_ass.modelo(os.path.join(DIR, "legendas.json"), "lara")
    palavras = json.load(open(palavras_arq, encoding="utf-8"))
    grupos = legendas_ass.agrupar(palavras, m)
    novas = []
    for gi, g in enumerate(grupos):
        fim = g[-1]["e"] + 0.15
        if gi + 1 < len(grupos):
            fim = min(fim + 0.25, grupos[gi + 1][0]["s"])
        novas.append({"tipo": "legenda", "inicio_s": round(g[0]["s"], 3), "fim_s": round(fim, 3),
                      "texto": " ".join(p["w"] for p in g), "palavras": g})
    pj.p["camadas"] = [c for c in pj.p.get("camadas", []) if c.get("tipo") != "legenda"] + novas
    pj.p.setdefault("legenda", {}).setdefault("modelo", m["id"])
    json.dump(pj.p, open(pj.arq, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("montar:", len(novas), "telas de legenda no projeto.json")


def montar(pj):
    W, H = pj.W, pj.H
    tarefas, total = trechos(pj)
    print("montar: %d trechos, %.1f s" % (len(tarefas), total), flush=True)
    with ThreadPoolExecutor(max_workers=max(2, min(6, (os.cpu_count() or 4) // 2))) as ex:
        novos = sum(ex.map(fazer_trecho, tarefas))
    print("montar: %d trecho(s) refeitos, %d reaproveitados" % (novos, len(tarefas) - novos), flush=True)
    lista = os.path.join(pj.cache, "lista" + pj.sufixo + ".txt")
    with open(lista, "w") as f:
        for tf in tarefas:
            f.write("file '%s'\n" % tf[0].replace("'", "'\\''"))
    emendado = os.path.join(pj.cache, "emendado" + pj.sufixo + ".mp4")
    ff(["-f", "concat", "-safe", "0", "-i", lista, "-c", "copy", emendado])

    entradas = ["-i", emendado]
    filtros = []
    n = 1

    def entrada(args):
        nonlocal n
        entradas.extend(args)
        n += 1
        return n - 1

    # 1) vídeos e imagens por cima (entram na base que o admin mostra)
    v = "[0:v]"
    k = 0

    def por_cima(idx, c, cheio, ox, oy, escala):
        nonlocal v, k
        ini, fim = float(c["inicio_s"]), float(c["fim_s"])
        if cheio:
            prep = "scale=%d:%d:force_original_aspect_ratio=increase,crop=%d:%d" % (W, H, W, H)
        else:
            prep = "scale=%d:%d" % (W, H)
        if escala != 1:
            prep += ",scale=trunc(iw*%.4f/2)*2:trunc(ih*%.4f/2)*2" % (escala, escala)
        filtros.append("[%d:v]%s,format=yuva420p,setpts=PTS-STARTPTS+%.3f/TB[o%d]" % (idx, prep, ini, k))
        filtros.append("%s[o%d]overlay=x=%s:y=%s:eof_action=pass:enable='between(t,%.3f,%.3f)'[v%d]" % (v, k, ox, oy, ini, fim, k))
        v = "[v%d]" % k
        k += 1

    idx_de = {}

    def sobreposicoes():
        nonlocal v, k
        for j, c in enumerate(pj.camadas("rec", "broll", "imagem", "animacao")):
            if c["tipo"] == "animacao" and c.get("modelo"):
                continue
            ini, fim = float(c["inicio_s"]), float(c["fim_s"])
            arq = pj.achar(c.get("arquivo"))
            if j not in idx_de:
                if IMAGEM.search(arq):
                    idx_de[j] = entrada(["-loop", "1", "-t", "%.3f" % (fim - ini), "-i", arq])
                else:
                    idx_de[j] = entrada(["-ss", "%.3f" % float(c.get("origem_inicio_s") or 0), "-t", "%.3f" % (fim - ini), "-i", arq])
            idx = idx_de[j]
            s = float(c.get("escala") or 1)
            x, y = float(c.get("x", 0.5)), float(c.get("y", 0.5))
            if c["tipo"] == "imagem":   # imagem: escala = fração da largura do vídeo
                filtros.append("[%d:v]scale=%d:-2,format=yuva420p,setpts=PTS-STARTPTS+%.3f/TB[o%d]" % (idx, round(W * s / 2) * 2, ini, k))
                filtros.append("%s[o%d]overlay=x=%.0f-w/2:y=%.0f-h/2:eof_action=pass:enable='between(t,%.3f,%.3f)'[v%d]" % (v, k, x * W, y * H, ini, fim, k))
                v = "[v%d]" % k
                k += 1
                continue
            por_cima(idx, c, c["tipo"] in ("rec", "broll"), "%.0f" % (x * W - W * s / 2), "%.0f" % (y * H - H * s / 2), s)

    lut, forca = lut_do_projeto(pj)
    if lut:
        # base do admin sem a LUT (o admin aplica ao vivo) e o final com a LUT só na imagem gravada, antes dos prints e logos
        sobreposicoes()
        filtros.append("%sscale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)'[base720]" % v)
        esc_l = lut.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
        if forca >= 0.99:
            filtros.append("[0:v]lut3d=file='%s':interp=tetrahedral[cor]" % esc_l)
        else:
            filtros.append("[0:v]split=2[cru][paralut];[paralut]lut3d=file='%s':interp=tetrahedral[comlut];[comlut][cru]blend=all_opacity=%.3f[cor]" % (esc_l, forca))
        print("montar: LUT %s em %d%%" % (os.path.basename(lut), round(forca * 100)), flush=True)
        v = "[cor]"
        sobreposicoes()
    else:
        sobreposicoes()
        filtros.append("%ssplit=2[base][cheio]" % v)
        filtros.append("[base]scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)'[base720]")
        v = "[cheio]"

    # 2) legenda queimada
    m, leg = modelo_legenda(pj)
    if m:
        grupos, fins = telas_de_legenda(pj)
        if grupos:
            ass, linhas = legendas_ass.gerar_ass(grupos, m, W, H, pj.p.get("marca") or "", leg.get("posicao"), fins)
            arq_ass = os.path.join(pj.cache, "legenda" + pj.sufixo + ".ass")
            open(arq_ass, "w", encoding="utf-8").write(ass)
            esc = lambda s: s.replace("\\", "/").replace(":", "\\:").replace("'", "\\'")
            filtros.append("%sass='%s':fontsdir='%s'[leg]" % (v, esc(arq_ass), esc(FONTES)))
            v = "[leg]"
    srt_txt = srt(pj)
    if srt_txt:
        open(os.path.join(pj.job, "saida", "legendas" + pj.sufixo + ".srt"), "w", encoding="utf-8").write(srt_txt)

    # 3) títulos da biblioteca por cima de tudo
    for c in pj.camadas("animacao"):
        if not c.get("modelo"):
            continue
        mov = titulo(pj, c)
        idx = entrada(["-i", mov])
        s = float(c.get("escala") or 1)
        x, y = float(c.get("x", 0.5)), float(c.get("y", 0.32))
        ox, oy = x * W - W * s / 2, y * H - H * s / 2
        # nunca deixa o título sair da tela (ex.: "R$ 12.000" cortado na borda): empurra para dentro da margem
        cx = caixa_visivel(mov, float(c["fim_s"]) - float(c["inicio_s"]))
        if cx:
            mg = 0.05 * W
            x1, y1, x2, y2 = (v * s for v in cx)
            if x2 - x1 > W - 2 * mg:   # mais largo que a tela: diminui até caber
                s2 = s * (W - 2 * mg) / (x2 - x1)
                ox, oy = x * W - W * s2 / 2, y * H - H * s2 / 2
                x1, y1, x2, y2 = (v * s2 for v in cx)
                s = s2
            ox += max(0, mg - (ox + x1)) - max(0, (ox + x2) - (W - mg))
            oy += max(0, mg - (oy + y1)) - max(0, (oy + y2) - (H - mg))
        por_cima(idx, c, False, "%.0f" % ox, "%.0f" % oy, s)

    # 4) áudio: voz tratada, música abaixando na fala, efeitos
    # locução gravada à parte (vídeo narrado): entra junto com o som dos trechos e passa pelo mesmo tratamento de voz
    vozes = ["[0:a]"]
    for j, c in enumerate(pj.camadas("voz")):
        ini, fim = float(c["inicio_s"]), min(float(c["fim_s"]), total)
        if fim - ini <= 0.1:
            continue
        idx = entrada(["-ss", "%.3f" % float(c.get("origem_inicio_s") or 0), "-t", "%.3f" % (fim - ini), "-i", pj.achar(c.get("arquivo"))])
        filtros.append("[%d:a]aresample=48000,volume=%sdB,adelay=%d:all=1[vz%d]" % (idx, c.get("volume_db", 0), round(ini * 1000), j))
        vozes.append("[vz%d]" % j)
    if len(vozes) > 1:
        filtros.append("%samix=inputs=%d:normalize=0:duration=first[vozbase]" % ("".join(vozes), len(vozes)))
    # voz no volume original, como a Lara deixa no CapCut (100%): só tira o grave de fundo, sem compressor nem normalizar
    filtros.append("%shighpass=f=80,asplit=2[voz][vozsc]" % ("[vozbase]" if len(vozes) > 1 else "[0:a]"))
    # a música entra num volume medido a partir da voz (não um número fixo): volume_db = quantos dB abaixo da voz
    voz_lufs = lufs(emendado) or next((v for v in (lufs(pj.achar(c.get("arquivo"))) for c in pj.camadas("voz")) if v), None)
    print("montar: voz em %s LUFS" % ("%.1f" % voz_lufs if voz_lufs else "silêncio"), flush=True)
    mix = ["[voz]"]
    musicas = []
    for c in pj.camadas("musica"):
        ini, fim = float(c["inicio_s"]), min(float(c["fim_s"]), total)
        dur = fim - ini
        if dur <= 0.2:
            continue
        arq_m, oi_m = pj.achar(c.get("arquivo")), float(c.get("origem_inicio_s") or 0)
        idx = entrada(["-ss", "%.3f" % oi_m, "-t", "%.3f" % dur, "-i", arq_m])
        abaixo = float(c.get("volume_db", -16))
        mus_lufs = lufs(arq_m, oi_m, min(dur, 60)) or -14.0
        alvo = (voz_lufs + abaixo) if voz_lufs else -16.0 + (abaixo + 16)   # sem voz (vlog só música): música em -16 LUFS
        ganho = max(-40.0, min(6.0, alvo - mus_lufs))
        filtros.append("[%d:a]aresample=48000,volume=%.1fdB,afade=t=in:d=0.4,afade=t=out:st=%.3f:d=1.5,adelay=%d:all=1[m%d]"
                       % (idx, ganho, max(0, dur - 1.5), round(ini * 1000), len(musicas)))
        musicas.append("[m%d]" % len(musicas))
    if musicas:
        if len(musicas) > 1:
            filtros.append("%samix=inputs=%d:normalize=0[mus]" % ("".join(musicas), len(musicas)))
        else:
            filtros.append("%sanull[mus]" % musicas[0])
        # volume constante (a Lara não quer a música subindo e descendo): sem abaixar na fala, já fica bem abaixo da voz
        filtros.append("[vozsc]anullsink")
        mix.append("[mus]")
    else:
        filtros.append("[vozsc]anullsink")
    for j, c in enumerate(pj.camadas("sfx")):
        idx = entrada(["-i", pj.achar(c.get("arquivo"))])
        filtros.append("[%d:a]aresample=48000,volume=%sdB,adelay=%d:all=1[s%d]" % (idx, c.get("volume_db", -18), round(float(c["inicio_s"]) * 1000), j))
        mix.append("[s%d]" % j)
    # sem normalizar o volume (era isso que deixava a voz alta demais): só um limitador para não estourar
    filtros.append("%samix=inputs=%d:normalize=0:duration=first,afade=t=in:d=0.2,afade=t=out:st=%.3f:d=0.8,"
                   "alimiter=limit=0.89:level=false,aresample=48000,asplit=2[a1][a2]" % ("".join(mix), len(mix), max(0, total - 0.8)))

    grafo = os.path.join(pj.cache, "grafo" + pj.sufixo + ".txt")
    open(grafo, "w", encoding="utf-8").write(";\n".join(filtros))
    previa = os.path.join(pj.job, "saida", "previa" + pj.sufixo + ".mp4")
    base = os.path.join(pj.job, "saida", "base" + pj.sufixo + ".mp4")
    print("montar: juntando legenda, títulos e som", flush=True)
    ff(entradas + ["-filter_complex_script", grafo,
                   "-map", v, "-map", "[a1]", "-t", "%.3f" % total, "-c:v", "libx264", "-preset", "medium", "-crf", "17", "-pix_fmt", "yuv420p",
                   "-c:a", "aac", "-b:a", "192k", "-movflags", "+faststart", previa,
                   "-map", "[base720]", "-map", "[a2]", "-t", "%.3f" % total, "-c:v", "libx264", "-preset", "veryfast", "-crf", "28", "-pix_fmt", "yuv420p",
                   "-c:a", "aac", "-b:a", "96k", "-movflags", "+faststart", base])
    # sem segunda passada de volume: subir o vídeo para -14 LUFS deixava a voz alta demais (a Lara usa a voz a 100%)
    pj.p["duracao_s"] = total
    json.dump(pj.p, open(pj.arq, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("montar: pronto, %.1f s → saida/previa%s.mp4" % (total, pj.sufixo))


if __name__ == "__main__":
    if len(sys.argv) < 2:
        raise SystemExit(__doc__)
    pj = Projeto(sys.argv[1], sys.argv[sys.argv.index("--projeto") + 1] if "--projeto" in sys.argv else None)
    if "--legendas" in sys.argv:
        criar_legendas(pj, sys.argv[sys.argv.index("--legendas") + 1])
    else:
        montar(pj)
