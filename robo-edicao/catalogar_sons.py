"""Banco de sons da Lara: cataloga musicas e efeitos de uma pasta, com licenca de cada arquivo.

Uso:  python catalogar_sons.py ~/Desktop/sons
Le:   licencas.csv na mesma pasta (arquivo, fonte, url, licenca, uso_comercial, credito, etiquetas)
      Uma linha pode valer para uma pasta inteira: em "arquivo" escreva o nome da pasta terminando em /
      (ex.: "Pack Motion/" com uso_comercial = sim vale para todos os arquivos dentro dela).
Gera: catalogo.json (para o Claude escolher) e catalogo.csv (para voce abrir no Numbers/Excel)

Arquivo sem linha no licencas.csv entra como "licenca desconhecida" e NAO e usado em video de cliente.
"""
import csv
import json
import sys
from pathlib import Path

import librosa
import numpy as np

EXT = {'.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac', '.aif', '.aiff'}
pasta = Path(sys.argv[1]).expanduser()
anterior = {}
if (pasta / 'catalogo.json').exists():   # reaproveita a análise de quem não mudou (librosa é lento)
    for it in json.loads((pasta / 'catalogo.json').read_text(encoding='utf-8')):
        anterior[it['arquivo']] = it

licencas = {}
lic_csv = pasta / 'licencas.csv'
if lic_csv.exists():
    with open(lic_csv, newline='', encoding='utf-8') as f:
        for row in csv.DictReader(f):
            licencas[row['arquivo'].strip()] = row

itens = []
for arq in sorted(p for p in pasta.rglob('*') if p.suffix.lower() in EXT):
    rel = str(arq.relative_to(pasta))
    velho = anterior.get(rel)
    if velho and velho.get('mtime') == int(arq.stat().st_mtime):
        dur, energia, tipo, bpm, batidas = velho['duracao_s'], velho['energia'], velho['tipo'], velho['bpm'], velho['batidas']
    else:
        y, sr = librosa.load(arq, sr=22050, mono=True)
        dur = len(y) / sr
        rms = librosa.feature.rms(y=y)[0]
        energia = float(np.clip(np.mean(rms) / 0.25, 0, 1))          # 0 = muito calma, 1 = muito forte
        tipo = 'efeito' if dur < 8 else 'musica'
        bpm, batidas = None, []
        if tipo == 'musica':
            tempo, frames = librosa.beat.beat_track(y=y, sr=sr)
            bpm = round(float(np.atleast_1d(tempo)[0]))
            batidas = [round(float(t), 3) for t in librosa.frames_to_time(frames, sr=sr)]
    lic = licencas.get(arq.name) or licencas.get(rel) or next(
        (v for k, v in sorted(licencas.items(), key=lambda kv: -len(kv[0])) if k.endswith('/') and rel.startswith(k)), {})
    comercial = (lic.get('uso_comercial', '').strip().lower() in ('sim', 's', 'yes', 'true'))
    itens.append({
        'arquivo': rel,
        'tipo': tipo,
        'duracao_s': round(dur, 2),
        'bpm': bpm,
        'energia': round(energia, 2),
        'clima': ('calma' if energia < 0.3 else 'media' if energia < 0.6 else 'animada') if tipo == 'musica' else None,
        'etiquetas': [e.strip() for e in lic.get('etiquetas', '').split(';') if e.strip()],
        'fonte': lic.get('fonte', ''),
        'url': lic.get('url', ''),
        'licenca': lic.get('licenca', 'DESCONHECIDA'),
        'uso_comercial': comercial,
        'credito': lic.get('credito', ''),
        'liberado_para_cliente': bool(lic) and comercial,
        'batidas': batidas,
        'mtime': int(arq.stat().st_mtime),
        'pasta': rel.split('/')[0] if '/' in rel else '',
    })

(pasta / 'catalogo.json').write_text(json.dumps(itens, ensure_ascii=False, indent=1), encoding='utf-8')
cols = ['arquivo', 'tipo', 'duracao_s', 'bpm', 'clima', 'energia', 'etiquetas', 'licenca', 'uso_comercial', 'credito', 'liberado_para_cliente']
with open(pasta / 'catalogo.csv', 'w', newline='', encoding='utf-8') as f:
    w = csv.writer(f)
    w.writerow(cols)
    for it in itens:
        w.writerow([';'.join(it[c]) if c == 'etiquetas' else it[c] for c in cols])

sem = [i['arquivo'] for i in itens if not i['liberado_para_cliente']]
print(f"{len(itens)} arquivos: {sum(i['tipo']=='musica' for i in itens)} musicas, {sum(i['tipo']=='efeito' for i in itens)} efeitos")
if sem:
    print(f"{len(sem)} sem licenca comercial confirmada (nao usar com cliente): " + ', '.join(sem[:10]))
