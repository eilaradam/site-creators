"""Coloca uma musica do banco embaixo de um video: no tamanho exato, terminando numa batida,
abaixando quando alguem fala, com fade no fim.

Uso:  python encaixar_musica.py video.mp4 ~/Desktop/sons musica.mp3 saida.mp4 [--volume -20]
"""
import json
import subprocess
import sys
from pathlib import Path

video, pasta, nome, saida = sys.argv[1], Path(sys.argv[2]).expanduser(), sys.argv[3], sys.argv[4]
vol = float(sys.argv[sys.argv.index('--volume') + 1]) if '--volume' in sys.argv else -20.0   # dB da musica

cat = {i['arquivo']: i for i in json.loads((pasta / 'catalogo.json').read_text(encoding='utf-8'))}
m = cat[nome]
if not m['liberado_para_cliente']:
    print(f"ATENCAO: {nome} nao tem licenca comercial confirmada no catalogo.")

dur_v = float(subprocess.run(['ffprobe', '-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', video],
                             capture_output=True, text=True, check=True).stdout)
batidas = m['batidas'] or []
# Ponto de inicio: a primeira batida forte depois de 0,5 s (evita silencio de abertura da faixa).
inicio = next((b for b in batidas if b >= 0.5), 0.0)
fim_desejado = inicio + dur_v
# Se a musica for curta, ela repete (loop); o fade final cai no fim do video.
loop = ['-stream_loop', '-1'] if m['duracao_s'] - inicio < dur_v else []
fade = 1.5

fc = (f"[1:a]atrim=start={inicio:.3f},asetpts=PTS-STARTPTS,atrim=0:{dur_v:.3f},volume={vol}dB,"
      f"afade=t=in:d=0.3,afade=t=out:st={max(0, dur_v - fade):.3f}:d={fade}[mus];"
      # sidechain: a musica abaixa ~10 dB enquanto ha voz
      "[0:a]asplit=2[voz][sc];"
      "[mus][sc]sidechaincompress=threshold=0.02:ratio=6:attack=20:release=350[musd];"
      "[voz][musd]amix=inputs=2:duration=first:normalize=0,loudnorm=I=-14:TP=-1:LRA=11[a]")
subprocess.run(['ffmpeg', '-v', 'error', '-y', '-i', video, *loop, '-i', str(pasta / nome), '-filter_complex', fc,
                '-map', '0:v', '-map', '[a]', '-c:v', 'copy', '-c:a', 'aac', '-b:a', '192k', saida], check=True)
print(f"ok: {saida} ({dur_v:.1f}s, musica a partir de {inicio:.2f}s, {m['bpm']} BPM, volume {vol} dB)")
