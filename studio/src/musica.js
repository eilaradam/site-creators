// Biblioteca de musica analisada em casa: BPM, grade de beats, drop e energia.
// Serve para responder "qual faixa cabe nesse corte" e para encostar os cortes no beat.
import { readFile, writeFile, readdir } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename, extname, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { probe, pcmMono, exec, FFMPEG } from './ffmpeg.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
export const PASTA_MUSICAS = process.env.STUDIO_MUSICAS || join(RAIZ, 'musicas');
export const EXTENSOES = ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.flac'];

const TAXA = 8000;
const SALTO = 256;              // ~32ms por quadro de envelope
const BPM_MIN = 60;
const BPM_MAX = 190;

// Envelope de energia: um valor RMS a cada ~32ms.
export function envelope(amostras, salto = SALTO) {
  const quadros = Math.floor(amostras.length / salto);
  const env = new Float32Array(quadros);
  for (let i = 0; i < quadros; i++) {
    let soma = 0;
    const base = i * salto;
    for (let j = 0; j < salto; j++) soma += amostras[base + j] * amostras[base + j];
    env[i] = Math.sqrt(soma / salto);
  }
  return env;
}

// Onset: so o que cresce. E o que marca a batida.
export function forcaDeOnset(env) {
  const onset = new Float32Array(env.length);
  for (let i = 1; i < env.length; i++) onset[i] = Math.max(0, env[i] - env[i - 1]);
  const media = onset.reduce((a, b) => a + b, 0) / (onset.length || 1);
  for (let i = 0; i < onset.length; i++) onset[i] = Math.max(0, onset[i] - media * 0.5);
  return onset;
}

// BPM por autocorrelacao da forca de onset, com refino parabolico no pico.
export function estimarBpm(onset, taxaQuadros) {
  const lagMin = Math.max(2, Math.floor((60 / BPM_MAX) * taxaQuadros));
  const lagMax = Math.min(onset.length - 1, Math.ceil((60 / BPM_MIN) * taxaQuadros));
  let melhorLag = lagMin;
  let melhorValor = -Infinity;
  const valores = new Map();
  for (let lag = lagMin; lag <= lagMax; lag++) {
    let soma = 0;
    for (let i = lag; i < onset.length; i++) soma += onset[i] * onset[i - lag];
    const normal = soma / (onset.length - lag);
    valores.set(lag, normal);
    if (normal > melhorValor) { melhorValor = normal; melhorLag = lag; }
  }
  // Refino: pico entre vizinhos.
  const y0 = valores.get(melhorLag - 1) ?? melhorValor;
  const y1 = melhorValor;
  const y2 = valores.get(melhorLag + 1) ?? melhorValor;
  const denominador = y0 - 2 * y1 + y2;
  const ajuste = denominador !== 0 ? (0.5 * (y0 - y2)) / denominador : 0;
  let bpm = (60 * taxaQuadros) / (melhorLag + ajuste);
  // Dobra ou divide para cair na faixa que se usa em edicao.
  while (bpm < 85) bpm *= 2;
  while (bpm > 180) bpm /= 2;
  return Number(bpm.toFixed(1));
}

// Grade de beats: acha a fase que mais cai em cima dos onsets.
export function gradeDeBeats({ onset, taxaQuadros, bpm, duracao }) {
  const periodo = (60 / bpm) * taxaQuadros;
  let melhorFase = 0;
  let melhorSoma = -Infinity;
  const passos = Math.max(1, Math.round(periodo));
  for (let fase = 0; fase < passos; fase++) {
    let soma = 0;
    for (let b = fase; b < onset.length; b += periodo) soma += onset[Math.round(b)] || 0;
    if (soma > melhorSoma) { melhorSoma = soma; melhorFase = fase; }
  }
  const beats = [];
  for (let b = melhorFase; b / taxaQuadros < duracao; b += periodo) {
    beats.push(Number((b / taxaQuadros).toFixed(3)));
  }
  return beats;
}

// Drop: maior salto de energia entre dois blocos de ~2s.
export function acharDrop({ env, taxaQuadros }) {
  const bloco = Math.max(4, Math.round(2 * taxaQuadros));
  let melhor = { instante: null, salto: 0 };
  for (let i = bloco; i + bloco < env.length; i += Math.max(1, Math.round(taxaQuadros / 4))) {
    const antes = media(env, i - bloco, i);
    const depois = media(env, i, i + bloco);
    const salto = depois - antes;
    if (salto > melhor.salto) melhor = { instante: Number((i / taxaQuadros).toFixed(2)), salto: Number(salto.toFixed(5)) };
  }
  // Faixa de energia uniforme nao tem drop: so conta se o salto for relevante.
  const energiaMedia = media(env, 0, env.length);
  if (melhor.salto < energiaMedia * 0.25) return { instante: null, salto: Number(melhor.salto.toFixed(5)) };
  return melhor;
}

const media = (arr, a, b) => {
  let s = 0;
  for (let i = a; i < b; i++) s += arr[i];
  return s / Math.max(1, b - a);
};

// Loudness integrada (LUFS) pelo ebur128 do ffmpeg.
export async function loudness(arquivo) {
  try {
    const { stderr } = await exec(FFMPEG, [
      '-hide_banner', '-nostats', '-i', arquivo,
      '-af', 'ebur128=framelog=quiet', '-f', 'null', '-',
    ]);
    const m = stderr.match(/I:\s*(-?[\d.]+)\s*LUFS/g);
    if (!m) return null;
    return Number(m[m.length - 1].match(/(-?[\d.]+)/)[1]);
  } catch {
    return null;
  }
}

export async function analisar(arquivo) {
  const info = await probe(arquivo);
  const { amostras } = await pcmMono(arquivo, { taxa: TAXA });
  const taxaQuadros = TAXA / SALTO;
  const env = envelope(amostras);
  const onset = forcaDeOnset(env);
  const bpm = estimarBpm(onset, taxaQuadros);
  const beats = gradeDeBeats({ onset, taxaQuadros, bpm, duracao: info.duracao });
  const drop = acharDrop({ env, taxaQuadros });
  const energia = Number((media(env, 0, env.length) * 100).toFixed(2));
  return {
    arquivo,
    nome: basename(arquivo, extname(arquivo)),
    duracao: Number(info.duracao.toFixed(2)),
    bpm,
    beats,
    drop: drop.instante,
    energia,
    lufs: await loudness(arquivo),
    analisadoEm: new Date().toISOString(),
  };
}

export async function listarArquivos(pasta = PASTA_MUSICAS) {
  if (!existsSync(pasta)) return [];
  const nomes = await readdir(pasta);
  return nomes
    .filter((n) => EXTENSOES.includes(extname(n).toLowerCase()))
    .map((n) => join(pasta, n))
    .sort();
}

const caminhoCache = (pasta) => join(pasta, 'biblioteca.json');

export async function carregarBiblioteca(pasta = PASTA_MUSICAS) {
  const caminho = caminhoCache(pasta);
  if (!existsSync(caminho)) return { faixas: [] };
  return JSON.parse(await readFile(caminho, 'utf8'));
}

// Analisa o que ainda nao foi analisado e preserva as tags escritas a mao.
export async function sincronizarBiblioteca(pasta = PASTA_MUSICAS, { forcar = false, aoAnalisar } = {}) {
  const biblioteca = await carregarBiblioteca(pasta);
  const porArquivo = new Map(biblioteca.faixas.map((f) => [basename(f.arquivo), f]));
  const arquivos = await listarArquivos(pasta);
  const faixas = [];
  for (const arquivo of arquivos) {
    const anterior = porArquivo.get(basename(arquivo));
    if (anterior && !forcar && anterior.bpm) { faixas.push({ ...anterior, arquivo }); continue; }
    if (aoAnalisar) aoAnalisar(arquivo);
    const analise = await analisar(arquivo);
    faixas.push({ tags: [], ...anterior, ...analise, arquivo });
  }
  const saida = { atualizadoEm: new Date().toISOString(), faixas };
  await writeFile(caminhoCache(pasta), JSON.stringify(saida, null, 2) + '\n', 'utf8');
  return saida;
}

// Ranking: cabe no corte, energia parecida, drop cedo e tags pedidas.
export function sugerir({ faixas, duracao, tags = [], energiaAlvo = null, limite = 5 }) {
  const pedidas = tags.map((t) => t.toLowerCase());
  const energias = faixas.map((f) => f.energia).filter(Number.isFinite);
  const alvo = energiaAlvo ?? (energias.length ? energias.reduce((a, b) => a + b, 0) / energias.length : 0);

  return faixas
    .map((f) => {
      const notas = [];
      let nota = 0;
      if (f.duracao >= duracao + 0.5) { nota += 0.35; }
      else { notas.push('curta para o corte'); nota -= 0.25; }

      if (pedidas.length) {
        const dela = (f.tags || []).map((t) => t.toLowerCase());
        const bate = pedidas.filter((t) => dela.includes(t)).length;
        nota += 0.3 * (bate / pedidas.length);
        if (bate) notas.push(`tags: ${pedidas.filter((t) => dela.includes(t)).join(', ')}`);
      }

      if (Number.isFinite(f.energia) && alvo > 0) {
        const diferenca = Math.abs(f.energia - alvo) / alvo;
        nota += 0.2 * Math.max(0, 1 - diferenca);
      }

      if (Number.isFinite(f.drop)) {
        if (f.drop <= 4) { nota += 0.15; notas.push(`drop em ${f.drop}s`); }
        else if (f.drop <= duracao) { nota += 0.05; notas.push(`drop em ${f.drop}s`); }
      }
      return { ...f, nota: Number(nota.toFixed(3)), porque: notas };
    })
    .sort((a, b) => b.nota - a.nota)
    .slice(0, limite);
}

export const beatMaisProximo = (beats, t) =>
  beats.length ? beats.reduce((a, b) => (Math.abs(b - t) < Math.abs(a - t) ? b : a)) : t;

// Encosta a duracao de cada segmento no beat, sem deslocar mais que `tolerancia`.
export function alinharCortesAoBeat({ edl, beats, offsetMusica = 0, tolerancia = 0.12 }) {
  let acumulado = 0;
  const ajustes = [];
  for (const seg of edl.segmentos.filter((s) => s.incluir)) {
    const duracaoSeg = seg.fim - seg.inicio;
    const fimNoFinal = acumulado + duracaoSeg;
    const alvo = beatMaisProximo(beats.map((b) => b - offsetMusica), fimNoFinal);
    const desvio = alvo - fimNoFinal;
    if (Math.abs(desvio) <= tolerancia && seg.fim + desvio > seg.inicio + 0.2) {
      seg.fim = Number((seg.fim + desvio).toFixed(3));
      ajustes.push({ id: seg.id, desvio: Number(desvio.toFixed(3)) });
      acumulado += duracaoSeg + desvio;
    } else {
      acumulado += duracaoSeg;
    }
  }
  return { ajustes, duracao: acumulado };
}

// Offset de entrada da musica para o drop cair no instante pedido do corte.
export function entradaParaDrop({ analise, instanteAlvo }) {
  const offset = Math.max(0, (analise.drop ?? 0) - instanteAlvo);
  return Number(offset.toFixed(3));
}
