// Wrappers finos em volta do ffmpeg/ffprobe. Tudo o que toca midia passa por aqui.
import { spawn } from 'node:child_process';
import { mkdtemp, writeFile, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

export const FFMPEG = process.env.FFMPEG_BIN || 'ffmpeg';
export const FFPROBE = process.env.FFPROBE_BIN || 'ffprobe';

export class ErroFfmpeg extends Error {
  constructor(bin, code, stderr) {
    const cauda = stderr.trim().split('\n').slice(-12).join('\n');
    super(`${bin} saiu com codigo ${code}:\n${cauda}`);
    this.name = 'ErroFfmpeg';
    this.code = code;
    this.stderr = stderr;
  }
}

// Roda um binario e devolve { stdout, stderr }. Lanca ErroFfmpeg se o codigo nao for 0.
export function exec(bin, args, { stdoutBinario = false, aoProgresso } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(bin, args, { stdio: ['ignore', 'pipe', 'pipe'] });
    const partesOut = [];
    let stderr = '';
    proc.stdout.on('data', (d) => partesOut.push(d));
    proc.stderr.on('data', (d) => {
      const texto = d.toString();
      stderr += texto;
      if (aoProgresso) aoProgresso(texto);
    });
    proc.on('error', (e) =>
      reject(e.code === 'ENOENT' ? new Error(`${bin} nao encontrado no PATH. Instale o ffmpeg.`) : e)
    );
    proc.on('close', (code) => {
      if (code !== 0) return reject(new ErroFfmpeg(bin, code, stderr));
      const buf = Buffer.concat(partesOut);
      resolve({ stdout: stdoutBinario ? buf : buf.toString(), stderr });
    });
  });
}

export async function probe(arquivo) {
  const { stdout } = await exec(FFPROBE, [
    '-v', 'error', '-print_format', 'json',
    '-show_format', '-show_streams', arquivo,
  ]);
  const dados = JSON.parse(stdout);
  const video = dados.streams.find((s) => s.codec_type === 'video');
  const audio = dados.streams.find((s) => s.codec_type === 'audio');
  return {
    arquivo,
    duracao: Number(dados.format?.duration) || 0,
    tamanhoBytes: Number(dados.format?.size) || 0,
    temVideo: Boolean(video),
    temAudio: Boolean(audio),
    largura: video?.width ?? 0,
    altura: video?.height ?? 0,
    fps: video ? fracaoParaNumero(video.avg_frame_rate || video.r_frame_rate) : 0,
    codecVideo: video?.codec_name ?? null,
    codecAudio: audio?.codec_name ?? null,
    taxaAudio: Number(audio?.sample_rate) || 0,
  };
}

function fracaoParaNumero(fracao) {
  if (!fracao) return 0;
  const [a, b] = String(fracao).split('/').map(Number);
  if (!b) return a || 0;
  return Number((a / b).toFixed(3));
}

// WAV 16k mono: o que whisper.cpp e faster-whisper esperam.
export async function extrairAudio(arquivo, saida, { taxa = 16000 } = {}) {
  await exec(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-i', arquivo,
    '-vn', '-ac', '1', '-ar', String(taxa), '-c:a', 'pcm_s16le',
    saida,
  ]);
  return saida;
}

// PCM mono cru na memoria, para analise de audio em JS (envelope, BPM).
export async function pcmMono(arquivo, { taxa = 8000 } = {}) {
  const { stdout } = await exec(
    FFMPEG,
    ['-hide_banner', '-loglevel', 'error', '-i', arquivo,
     '-vn', '-ac', '1', '-ar', String(taxa), '-f', 's16le', '-'],
    { stdoutBinario: true }
  );
  const amostras = new Float32Array(stdout.length >> 1);
  for (let i = 0; i < amostras.length; i++) amostras[i] = stdout.readInt16LE(i * 2) / 32768;
  return { amostras, taxa };
}

// Roda silencedetect e devolve as janelas de silencio em segundos.
export async function detectarSilencio(arquivo, { ruido = '-32dB', duracaoMinima = 0.35 } = {}) {
  const { stderr } = await exec(FFMPEG, [
    '-hide_banner', '-nostats', '-i', arquivo,
    '-af', `silencedetect=noise=${ruido}:d=${duracaoMinima}`,
    '-f', 'null', '-',
  ]);
  return lerSilencedetect(stderr);
}

// Exportado separado para dar teste sem precisar de midia.
export function lerSilencedetect(stderr) {
  const janelas = [];
  let aberto = null;
  for (const linha of stderr.split('\n')) {
    const inicio = linha.match(/silence_start:\s*(-?[\d.]+)/);
    if (inicio) { aberto = Math.max(0, Number(inicio[1])); continue; }
    const fim = linha.match(/silence_end:\s*([\d.]+)/);
    if (fim && aberto !== null) {
      janelas.push({ inicio: aberto, fim: Number(fim[1]) });
      aberto = null;
    }
  }
  if (aberto !== null) janelas.push({ inicio: aberto, fim: Infinity });
  return janelas;
}

// Monta o corte final a partir de uma lista de segmentos { arquivo, inicio, fim }.
// Usa trim+concat em filter_complex: reencoda, mas corta no frame exato pedido.
export async function cortar(segmentos, saida, opcoes = {}) {
  const {
    largura = 1080, altura = 1920, fps = 30,
    crf = 18, preset = 'medium', bitrateAudio = '192k',
    aoProgresso,
  } = opcoes;
  if (!segmentos.length) throw new Error('Nenhum segmento para cortar.');

  const entradas = [...new Set(segmentos.map((s) => s.arquivo))];
  const indice = new Map(entradas.map((a, i) => [a, i]));

  const linhas = [];
  const rotulos = [];
  segmentos.forEach((seg, n) => {
    const i = indice.get(seg.arquivo);
    const ini = seg.inicio.toFixed(6);
    const fim = seg.fim.toFixed(6);
    linhas.push(
      `[${i}:v]trim=start=${ini}:end=${fim},setpts=PTS-STARTPTS,` +
      `scale=${largura}:${altura}:force_original_aspect_ratio=decrease,` +
      `pad=${largura}:${altura}:(ow-iw)/2:(oh-ih)/2:color=black,` +
      `setsar=1,fps=${fps},format=yuv420p[v${n}]`
    );
    linhas.push(
      `[${i}:a]atrim=start=${ini}:end=${fim},asetpts=PTS-STARTPTS,` +
      `aresample=48000,aformat=sample_fmts=fltp:channel_layouts=stereo[a${n}]`
    );
    rotulos.push(`[v${n}][a${n}]`);
  });
  linhas.push(`${rotulos.join('')}concat=n=${segmentos.length}:v=1:a=1[vsaida][asaida]`);

  const dir = await mkdtemp(join(tmpdir(), 'studio-'));
  const scriptFiltro = join(dir, 'filtro.txt');
  await writeFile(scriptFiltro, linhas.join(';\n'), 'utf8');
  try {
    const args = ['-y', '-hide_banner', '-loglevel', 'error', '-stats'];
    for (const entrada of entradas) args.push('-i', entrada);
    args.push(
      '-filter_complex_script', scriptFiltro,
      '-map', '[vsaida]', '-map', '[asaida]',
      '-c:v', 'libx264', '-preset', preset, '-crf', String(crf),
      '-c:a', 'aac', '-b:a', bitrateAudio,
      '-movflags', '+faststart',
      saida
    );
    await exec(FFMPEG, args, { aoProgresso });
    return saida;
  } finally {
    await rm(dir, { recursive: true, force: true });
  }
}

// Queima um .ass no video (libass respeita fonte, contorno e karaoke).
export async function queimarLegenda(video, ass, saida, { crf = 18, preset = 'medium', pastaFontes } = {}) {
  const filtro = pastaFontes
    ? `ass=${escaparFiltro(ass)}:fontsdir=${escaparFiltro(pastaFontes)}`
    : `ass=${escaparFiltro(ass)}`;
  await exec(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error', '-stats',
    '-i', video, '-vf', filtro,
    '-c:v', 'libx264', '-preset', preset, '-crf', String(crf),
    '-c:a', 'copy', '-movflags', '+faststart',
    saida,
  ]);
  return saida;
}

// ffmpeg usa ':' e '\' como separadores dentro de filtros.
export function escaparFiltro(caminho) {
  return caminho.replace(/\\/g, '/').replace(/:/g, '\\:').replace(/'/g, "\\'");
}

// Recorta um trecho de audio (usado para entregar a musica ja no ponto certo).
export async function recortarAudio(arquivo, saida, { inicio = 0, duracao, fadeIn = 0, fadeOut = 0 }) {
  const filtros = [];
  if (fadeIn > 0) filtros.push(`afade=t=in:st=0:d=${fadeIn}`);
  if (fadeOut > 0 && duracao) filtros.push(`afade=t=out:st=${Math.max(0, duracao - fadeOut)}:d=${fadeOut}`);
  const args = ['-y', '-hide_banner', '-loglevel', 'error', '-ss', String(inicio), '-i', arquivo];
  if (duracao) args.push('-t', String(duracao));
  if (filtros.length) args.push('-af', filtros.join(','));
  args.push('-c:a', 'aac', '-b:a', '192k', saida);
  await exec(FFMPEG, args);
  return saida;
}
