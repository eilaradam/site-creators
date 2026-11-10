"""Ouvido de gosto musical do robô: transforma uma faixa do Epidemic em números que dá para comparar.

- embedding(): o "ouvido" (LAION-CLAP, checkpoint de música). 3 trechos de 10 s (começo, meio e fim),
  um vetor de 512 números por trecho, média dos 3 e normalizado. Faixas que soam parecidas ficam perto.
- medidas(): o que dá para medir e explicar (librosa): BPM, brilho, energia, variação, grave e melodia.
- baixar(): preview do Epidemic (MP3 de baixa qualidade, basta para ouvir o estilo) e o stem MELODY, quando existe.

O cache fica em gosto-musical/cache/ (áudio e medidas por faixa) e o modelo em gosto-musical/modelos/.
Nada disso vai para o GitHub: só o gosto.json (as notas da Lara e os números de cada faixa).
"""
import contextlib
import json
import os
import subprocess
import sys
import time
import urllib.request

import numpy as np

DIR = os.path.dirname(os.path.abspath(__file__))
CACHE = os.path.join(DIR, "cache")
MODELOS = os.path.join(DIR, "modelos")
GOSTO = os.path.join(DIR, "gosto.json")
CKPT = "music_audioset_epoch_15_esc_90.14.pt"   # LAION-CLAP treinado com música (HTSAT-base)
CKPT_URL = "https://huggingface.co/lukewys/laion_clap/resolve/main/" + CKPT
EPIDEMIC_MCP = "https://www.epidemicsound.com/a/mcp-service/mcp"
os.makedirs(CACHE, exist_ok=True)


# ── Epidemic ─────────────────────────────────────────────────────────────────────────────
def _chave_epidemic():
    if os.environ.get("EPIDEMIC_SOUND_MCP_API_KEY"):
        return os.environ["EPIDEMIC_SOUND_MCP_API_KEY"].strip()
    try:   # a mesma chave que o robô guarda com `node robo.mjs --epidemic`
        return json.load(open(os.path.join(DIR, "..", "epidemic.json"))).get("chave", "").strip()
    except (OSError, ValueError):
        return ""


def _mcp(corpo, chave, sessao=None):
    h = {"Authorization": "Bearer " + chave, "Content-Type": "application/json", "Accept": "application/json, text/event-stream"}
    if sessao:
        h["mcp-session-id"] = sessao
    r = urllib.request.urlopen(urllib.request.Request(EPIDEMIC_MCP, data=json.dumps(corpo).encode(), headers=h), timeout=60)
    sessao = r.headers.get("mcp-session-id") or sessao
    tx = r.read().decode("utf-8", "replace")
    linhas = [l[5:].strip() for l in tx.splitlines() if l.startswith("data:")]   # resposta em SSE ou JSON puro
    msgs = [json.loads(l) for l in (linhas or [tx]) if l.strip()]
    return (msgs[-1] if msgs else {}), sessao


def info_de_no(n):
    """um resultado do SearchRecordings do Epidemic (com ou sem a chave "recording") vira {titulo, preview, melody...}"""
    r = n.get("recording", n)
    stems = {s["type"]: s["audioFile"]["lqmp3Url"] for s in r.get("stems", [])}
    artista = next((c["artist"]["name"] for c in r.get("credits", []) if c["role"] == "MAIN_ARTIST"), "")
    return r["id"], {"titulo": r.get("title"), "artista": artista, "bpm": r.get("bpm"), "preview": r["audioFile"]["lqmp3Url"],
                     "melody": stems.get("MELODY"), "tags": [t["displayName"] for t in r.get("tags", [])]}


def buscar_epidemic(ids):
    """{id: {titulo, artista, bpm, tags, preview, melody}} pelos IDs, pelo MCP do Epidemic (plano Pro da Lara)."""
    chave = _chave_epidemic()
    if not chave:
        raise SystemExit("Sem chave do Epidemic: rode `node robo.mjs --epidemic` ou passe ID=URL_do_preview.")
    _, sessao = _mcp({"jsonrpc": "2.0", "id": 1, "method": "initialize", "params": {
        "protocolVersion": "2025-03-26", "capabilities": {}, "clientInfo": {"name": "gosto-musical", "version": "1"}}}, chave)
    try:
        _mcp({"jsonrpc": "2.0", "method": "notifications/initialized"}, chave, sessao)
    except Exception:
        pass
    resp, _ = _mcp({"jsonrpc": "2.0", "id": 2, "method": "tools/call", "params": {"name": "SearchRecordings", "arguments": {
        "filter": {"recordingIDs": list(ids)}, "first": max(1, len(ids))}}}, chave, sessao)
    texto = "".join(c.get("text", "") for c in resp.get("result", {}).get("content", []))
    nos = json.loads(texto).get("data", {}).get("recordings", {}).get("nodes", []) if texto else []
    return dict(info_de_no(n) for n in nos)


def _baixar_url(url, destino):
    if os.path.exists(destino) and os.path.getsize(destino) > 1000:
        return destino
    for tentativa in range(3):
        try:
            urllib.request.urlretrieve(url, destino + ".tmp")
            os.replace(destino + ".tmp", destino)
            return destino
        except Exception:
            if tentativa == 2:
                raise
            time.sleep(2 * (tentativa + 1))


def baixar(rid, info):
    """baixa o preview (e o stem MELODY) para o cache; devolve (preview, melody ou None)"""
    pv = _baixar_url(info["preview"], os.path.join(CACHE, rid + "_preview.mp3"))
    ml = _baixar_url(info["melody"], os.path.join(CACHE, rid + "_melody.mp3")) if info.get("melody") else None
    return pv, ml


# ── Ouvido (CLAP) ────────────────────────────────────────────────────────────────────────
_modelo = None


def modelo():
    global _modelo
    if _modelo is not None:
        return _modelo
    os.environ.setdefault("TRANSFORMERS_VERBOSITY", "error")
    import warnings
    warnings.filterwarnings("ignore")
    import torch
    with contextlib.redirect_stdout(sys.stderr):   # o CLAP e o transformers imprimem avisos: nada disso vai para a saída --json
        import laion_clap
    os.makedirs(MODELOS, exist_ok=True)
    ck = os.path.join(MODELOS, CKPT)
    if not os.path.exists(ck):
        print("baixando o modelo de música do CLAP (2,3 GB, só na primeira vez)…", flush=True)
        _baixar_url(CKPT_URL, ck)
    with contextlib.redirect_stdout(sys.stderr):
        m = laion_clap.CLAP_Module(enable_fusion=False, amodel="HTSAT-base")
    sd = torch.load(ck, map_location="cpu", weights_only=False)
    sd = sd.get("state_dict", sd)
    sd = {k[7:] if k.startswith("module.") else k: v for k, v in sd.items()}
    sd.pop("text_branch.embeddings.position_ids", None)   # chave que as versões novas do transformers não têm
    m.model.load_state_dict(sd, strict=False)
    m.model.eval()
    _modelo = m
    return m


def _ler(arq, sr):
    bruto = subprocess.run(["ffmpeg", "-v", "error", "-i", arq, "-f", "f32le", "-ac", "1", "-ar", str(sr), "-"], capture_output=True).stdout
    return np.frombuffer(bruto, dtype=np.float32).copy()


def tres_trechos(y, sr, seg=10.0):
    """começo, meio e fim (10 s cada), pulando 2 s de cada ponta (entrada e final costumam ser vazios)"""
    n = int(seg * sr)
    if len(y) < n:
        y = np.pad(y, (0, n - len(y)))
    ini = min(int(2 * sr), len(y) - n)
    fim = max(ini, len(y) - n - int(2 * sr))
    meio = (ini + fim) // 2
    return [y[i:i + n] for i in (ini, meio, fim)]


def embedding(arq):
    import torch
    y = _ler(arq, 48000)
    x = np.stack(tres_trechos(y, 48000))
    x = (np.clip(x, -1, 1) * 32767).astype(np.int16).astype(np.float32) / 32767   # como o CLAP foi treinado
    with torch.no_grad():
        e = modelo().get_audio_embedding_from_data(x=x, use_tensor=False)
    v = np.asarray(e).mean(axis=0)
    return (v / np.linalg.norm(v)).astype(float)


# ── Medidas (librosa) ────────────────────────────────────────────────────────────────────
def medidas(arq, arq_melody=None):
    import librosa
    sr = 22050
    y = _ler(arq, sr)
    tempo = librosa.beat.beat_track(y=y, sr=sr)[0]
    centroide = librosa.feature.spectral_centroid(y=y, sr=sr)[0]
    rms = librosa.feature.rms(y=y, frame_length=2048, hop_length=512)[0]
    db = 20 * np.log10(np.maximum(rms, 1e-6))
    por_s = max(1, sr // 512)
    db_s = np.array([db[i:i + por_s].mean() for i in range(0, len(db), por_s)])
    S = np.abs(librosa.stft(y, n_fft=4096, hop_length=1024)) ** 2
    freqs = librosa.fft_frequencies(sr=sr, n_fft=4096)
    grave = float(S[freqs < 150].sum() / max(S.sum(), 1e-12))
    m = {
        "bpm_medido": round(float(np.atleast_1d(tempo)[0]), 1),
        "brilho_hz": round(float(centroide.mean()), 0),
        "energia_db": round(float(db_s.mean()), 1),
        "variacao_db": round(float(db_s.std()), 2),
        "grave_pct": round(100 * grave, 1),
        "ataques_por_s": round(float(len(librosa.onset.onset_detect(y=y, sr=sr)) / (len(y) / sr)), 2),
        "melodia_db": None,
    }
    if arq_melody:
        ym = _ler(arq_melody, sr)
        n = min(len(ym), len(y))
        if n:   # nível da melodia em relação à faixa inteira (0 dB = melodia tão alta quanto a mistura)
            m["melodia_db"] = round(float(10 * np.log10(max((ym[:n] ** 2).mean(), 1e-12) / max((y[:n] ** 2).mean(), 1e-12))), 1)
    return m


# ── Gosto ────────────────────────────────────────────────────────────────────────────────
def carregar_gosto():
    try:
        return json.load(open(GOSTO, encoding="utf-8"))
    except (OSError, ValueError):
        return {"modelo": "LAION-CLAP " + CKPT + " (HTSAT-base)", "trechos": "3 x 10 s (começo, meio, fim), média normalizada", "faixas": {}}


def salvar_gosto(g):
    tmp = GOSTO + ".tmp"
    json.dump(g, open(tmp, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    os.replace(tmp, GOSTO)


def analisar(rid, info):
    """embedding + medidas da faixa, com cache por ID (não recalcula o que já foi ouvido)"""
    arq = os.path.join(CACHE, rid + ".json")
    try:
        return json.load(open(arq, encoding="utf-8"))
    except (OSError, ValueError):
        pass
    pv, ml = baixar(rid, info)
    try:
        emb = [round(v, 6) for v in embedding(pv)]
    except ImportError:   # sem PyTorch/CLAP (ex.: Mac Intel com Python novo): julga só pelas medidas
        emb = None
    a = {"id": rid, "titulo": info.get("titulo"), "artista": info.get("artista"), "bpm_epidemic": info.get("bpm"),
         "tags": info.get("tags", []), "tem_melody": bool(ml), "embedding": emb, "medidas": medidas(pv, ml)}
    json.dump(a, open(arq, "w", encoding="utf-8"), ensure_ascii=False)
    return a


def centroides(g):
    grupos = {"aprovada": [], "reprovada": []}
    for f in g["faixas"].values():
        if f.get("nota") in grupos:
            grupos[f["nota"]].append(np.array(f["embedding"]))
    saida = {}
    for k, vs in grupos.items():
        if vs:
            c = np.mean(vs, axis=0)
            saida[k] = c / np.linalg.norm(c)
    return saida


def distancias(emb, cents):
    """distância de cosseno (0 = igual, 2 = oposto) até a média das aprovadas e das reprovadas"""
    e = np.array(emb)
    return {k: round(float(1 - np.dot(e, c)), 4) for k, c in cents.items()}


# ── Julgamento: o CLAP sozinho erra com poucas aprovadas (ele ouve "gênero", e várias reprovadas são do mesmo
#    artista e estilo das aprovadas). O que separou de verdade nos testes foi o brilho e o peso do grave.
#    Por isso a nota soma as duas coisas: medidas (brilho e grave, padronizados) + CLAP (peso 10).
MEDIDAS_DO_GOSTO = ["brilho_hz", "grave_pct"]
PESO_CLAP = 10.0


def pontuar(a, faixas):
    """compara a faixa `a` com as faixas julgadas (lista de dicts com nota, embedding e medidas)"""
    ap = [f for f in faixas if f.get("nota") == "aprovada"]
    rp = [f for f in faixas if f.get("nota") == "reprovada"]
    if not ap or not rp:
        raise ValueError("precisa de pelo menos uma aprovada e uma reprovada")
    def cent(fs):
        c = np.mean([f["embedding"] for f in fs if f.get("embedding")], axis=0)
        return c / np.linalg.norm(c)

    com_clap = bool(a.get("embedding")) and any(f.get("embedding") for f in ap) and any(f.get("embedding") for f in rp)
    if com_clap:
        e = np.array(a["embedding"])
        clap_a, clap_r = float(1 - e @ cent(ap)), float(1 - e @ cent(rp))
    else:
        clap_a = clap_r = 0.0
    X = np.array([[f["medidas"][k] for k in MEDIDAS_DO_GOSTO] for f in ap + rp], float)
    mu, sd = X.mean(0), X.std(0) + 1e-9
    v = (np.array([a["medidas"][k] for k in MEDIDAS_DO_GOSTO], float) - mu) / sd
    med_a = float(np.linalg.norm(v - ((X[:len(ap)] - mu) / sd).mean(0)))
    med_r = float(np.linalg.norm(v - ((X[len(ap):] - mu) / sd).mean(0)))
    nota = (med_r - med_a) + PESO_CLAP * (clap_r - clap_a)
    return {"com_clap": com_clap, "clap_dist_aprovadas": round(clap_a, 4), "clap_dist_reprovadas": round(clap_r, 4),
            "medidas_dist_aprovadas": round(med_a, 3), "medidas_dist_reprovadas": round(med_r, 3), "nota": round(nota, 3)}
