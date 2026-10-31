"""Tratamentos que o montador aplica: cor automática, zoom no rosto e tratamento de voz.

Ligados no topo do projeto.json:
  "cor": "auto"          correção leve por arquivo (como o "Aprimorar" do CapCut): clareia se está escuro,
                         um pouco de contraste e nitidez; nunca muda a cor da pele nem passa de ±8%
  "voz": "tratada"       limpeza da voz (ruído de fundo, grave embolado, presença, chiado do "s"),
                         no MESMO volume da voz original (a Lara quer a voz a 100%, como no CapCut)
  zoom sem cx/cy         o centro do zoom é o rosto (OpenCV); sem OpenCV instalado, usa o centro padrão

A análise de cor é adaptada do video-use (browser-use/video-use, licença MIT): helpers/grade.py.
"""
import json
import os
import subprocess
import tempfile

# ---------------------------------------------------------------- cor

_COR = {}


def _stats(src, ini=0.0, dur=None, amostras=10):
    if dur is None:
        r = subprocess.run(["ffprobe", "-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", src],
                           capture_output=True, text=True)
        dur = float(r.stdout.strip() or 10)
    fps = max(0.5, min(amostras / max(dur, 0.1), 10.0))
    fd, meta = tempfile.mkstemp(suffix=".txt")
    os.close(fd)
    try:
        subprocess.run(["ffmpeg", "-y", "-hide_banner", "-nostats", "-ss", "%.3f" % ini, "-i", src, "-t", "%.3f" % dur,
                        "-vf", "fps=%.2f,signalstats,metadata=print:file=%s" % (fps, meta), "-f", "null", "-"],
                       stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        val = {"YAVG": [], "YMIN": [], "YMAX": [], "SATAVG": []}
        prof = 8
        for linha in open(meta):
            for k in val:
                if "lavfi.signalstats.%s=" % k in linha:
                    try:
                        val[k].append(float(linha.rsplit("=", 1)[1]))
                    except ValueError:
                        pass
            if "lavfi.signalstats.YBITDEPTH=" in linha:
                try:
                    prof = int(float(linha.rsplit("=", 1)[1]))
                except ValueError:
                    pass
    finally:
        os.remove(meta)
    if not val["YAVG"]:
        return None
    mx = 2 ** prof - 1
    media = lambda l: sum(l) / len(l)
    return {"luz": media(val["YAVG"]) / mx,
            "faixa": (media(val["YMAX"]) - media(val["YMIN"])) / mx if val["YMAX"] else 0.7,
            "sat": media(val["SATAVG"]) / mx if val["SATAVG"] else 0.25}


def cor_auto(src):
    """filtro ffmpeg de correção leve para este arquivo (fica guardado por arquivo)"""
    chave = (src, os.path.getmtime(src))
    if chave in _COR:
        return _COR[chave]
    s = _stats(src)
    if not s:
        _COR[chave] = ""
        return ""
    # contraste: só sobe, mais quando a imagem está lavada
    if s["faixa"] < 0.65:
        t = max(0.0, min(1.0, (s["faixa"] - 0.50) / 0.15))
        contraste = 1.08 - 0.05 * t
    else:
        contraste = 1.03
    # gama: clareia quando está escuro (celular em ambiente de casa costuma ficar abaixo de 0,42)
    gama = 1.0
    if s["luz"] < 0.42:
        t = max(0.0, min(1.0, (s["luz"] - 0.30) / 0.12))
        gama = 1.10 - 0.08 * t
    elif s["luz"] > 0.62:
        gama = 0.97
    # saturação: só quando está muito apagada; nunca puxa a pele para outra cor
    sat = 1.0
    if s["sat"] < 0.12:
        sat = 1.06
    filtro = "eq=contrast=%.3f:gamma=%.3f:saturation=%.3f,unsharp=5:5:0.35:5:5:0" % (contraste, gama, sat)
    _COR[chave] = filtro
    return filtro


# ---------------------------------------------------------------- rosto

def tem_opencv():
    try:
        import cv2  # noqa: F401
        return True
    except Exception:
        return False


def _detectar(pasta):
    """centro do maior rosto em cada quadro .jpg da pasta (precisa do OpenCV)"""
    import cv2
    det = cv2.CascadeClassifier(cv2.data.haarcascades + "haarcascade_frontalface_default.xml")
    achados = []
    for nome in sorted(os.listdir(pasta)):
        img = cv2.imread(os.path.join(pasta, nome))
        if img is None:
            continue
        h, w = img.shape[:2]
        cinza = cv2.cvtColor(img, cv2.COLOR_BGR2GRAY)
        rostos = det.detectMultiScale(cinza, scaleFactor=1.1, minNeighbors=6, minSize=(int(w * 0.12), int(w * 0.12)))
        if len(rostos):
            # o maior rosto do quadro (orelha e óculos dão falso positivo bem menor)
            x, y, rw, rh = max(rostos, key=lambda r: r[2] * r[3])
            achados.append(((x + rw / 2) / w, (y + rh * 0.45) / h))
    return achados


def centro_rosto(src, oi, dur, vf_enquadrar, cache_dir):
    """centro do rosto (fx, fy de 0 a 1) no quadro já enquadrado do trecho; None se não achar ou sem OpenCV.
    O montador roda com o python3 do sistema; o OpenCV fica no venv do robô, então a detecção roda por lá."""
    import hashlib
    import shutil
    venv_py = os.path.join(os.path.dirname(os.path.abspath(__file__)), "venv", "bin", "python")
    local = tem_opencv()
    if not local and not os.path.exists(venv_py):
        return None
    chave = hashlib.sha1(json.dumps([src, os.path.getmtime(src), round(oi, 2), round(dur, 2), vf_enquadrar]).encode()).hexdigest()[:16]
    arq_cache = os.path.join(cache_dir, "rosto_" + chave + ".json")
    if os.path.exists(arq_cache):
        v = json.load(open(arq_cache))
        return tuple(v) if v else None
    pasta = tempfile.mkdtemp()
    n = 5
    fps = n / max(dur, 0.2)
    subprocess.run(["ffmpeg", "-v", "error", "-y", "-ss", "%.3f" % oi, "-t", "%.3f" % dur, "-i", src,
                    "-vf", vf_enquadrar + ",fps=%.3f,scale=540:-2" % fps, "-frames:v", str(n), os.path.join(pasta, "q%02d.jpg")],
                   capture_output=True)
    achados = []
    try:
        if local:
            achados = _detectar(pasta)
        else:
            r = subprocess.run([venv_py, "-I", os.path.abspath(__file__), "--rosto", pasta], capture_output=True, text=True, timeout=120)
            if r.returncode != 0:
                return None   # sem OpenCV no venv: não guarda cache, tenta de novo depois do instalador
            achados = json.loads(r.stdout or "[]")
    finally:
        shutil.rmtree(pasta, ignore_errors=True)
    res = None
    if achados:
        xs = sorted(a[0] for a in achados)
        ys = sorted(a[1] for a in achados)
        res = (round(xs[len(xs) // 2], 3), round(ys[len(ys) // 2], 3))
    json.dump(res, open(arq_cache, "w"))
    return res


# ---------------------------------------------------------------- voz

# ruído de fundo leve, tira o grave embolado, dá presença na fala, segura o chiado do "s",
# compressão bem suave só para igualar sílabas (o volume final é recolocado no da voz original)
FILTRO_VOZ = ("afftdn=nr=10:nf=-40:tn=1,"
              "equalizer=f=250:t=q:w=1.0:g=-2,"
              "equalizer=f=3500:t=q:w=1.2:g=2.5,"
              "equalizer=f=7500:t=q:w=2.0:g=-1.5,"
              "acompressor=threshold=-22dB:ratio=2:attack=10:release=150:makeup=1")


def lufs_com_filtro(arq, filtro=None):
    args = ["ffmpeg", "-hide_banner", "-nostats", "-i", arq, "-map", "0:a:0", "-af",
            (filtro + "," if filtro else "") + "ebur128", "-f", "null", "-"]
    r = subprocess.run(args, capture_output=True, text=True)
    import re
    m = re.findall(r"I:\s+(-?[\d.]+) LUFS", r.stderr)
    try:
        v = float(m[-1]) if m else None
    except ValueError:
        v = None
    return v if v is not None and v > -70 else None


def filtro_voz_no_mesmo_volume(arq):
    """FILTRO_VOZ + o ganho que devolve a voz exatamente ao volume que ela tinha antes do tratamento"""
    antes = lufs_com_filtro(arq, "highpass=f=80")
    depois = lufs_com_filtro(arq, "highpass=f=80," + FILTRO_VOZ)
    ganho = 0.0
    if antes is not None and depois is not None:
        ganho = max(-12.0, min(12.0, antes - depois))
    return FILTRO_VOZ + ",volume=%.2fdB" % ganho


if __name__ == "__main__":
    import sys
    if len(sys.argv) == 3 and sys.argv[1] == "--rosto":
        print(json.dumps(_detectar(sys.argv[2])))
