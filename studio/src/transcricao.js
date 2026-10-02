// Transcricao com timestamp por palavra, com cache em disco.
// Backends: faster-whisper (recomendado, timestamp por palavra nativo) e whisper.cpp.
import { createHash } from 'node:crypto';
import { stat, readFile, writeFile, mkdir, rm } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { exec, extrairAudio } from './ffmpeg.js';

const AQUI = dirname(fileURLToPath(import.meta.url));
export const BACKENDS = ['fasterwhisper', 'whispercpp'];

async function chave(arquivo, { backend, modelo, idioma }) {
  const s = await stat(arquivo);
  return createHash('sha1')
    .update([arquivo, s.size, Math.round(s.mtimeMs), backend, modelo, idioma].join('|'))
    .digest('hex')
    .slice(0, 16);
}

export async function transcrever(arquivo, {
  backend = process.env.STUDIO_BACKEND || 'fasterwhisper',
  modelo = process.env.STUDIO_MODELO || 'medium',
  idioma = 'pt',
  pastaCache,
  forcar = false,
} = {}) {
  if (!BACKENDS.includes(backend)) {
    throw new Error(`backend "${backend}" desconhecido. Use: ${BACKENDS.join(', ')}`);
  }
  let cache = null;
  if (pastaCache) {
    await mkdir(pastaCache, { recursive: true });
    cache = join(pastaCache, `transcricao-${await chave(arquivo, { backend, modelo, idioma })}.json`);
    if (!forcar && existsSync(cache)) {
      return { ...JSON.parse(await readFile(cache, 'utf8')), doCache: true };
    }
  }

  const wav = join(pastaCache || dirname(arquivo), `.audio-${Date.now()}.wav`);
  await extrairAudio(arquivo, wav);
  try {
    const bruto = backend === 'fasterwhisper'
      ? await viaFasterWhisper(wav, { modelo, idioma })
      : await viaWhisperCpp(wav, { modelo, idioma });
    const resultado = { arquivo, ...bruto, doCache: false };
    if (cache) await writeFile(cache, JSON.stringify(resultado, null, 2), 'utf8');
    return resultado;
  } finally {
    await rm(wav, { force: true });
  }
}

// Onde a transcricao de um arquivo fica em cache.
export async function caminhoDoCache(arquivo, {
  backend = process.env.STUDIO_BACKEND || 'fasterwhisper',
  modelo = process.env.STUDIO_MODELO || 'medium',
  idioma = 'pt',
  pastaCache,
} = {}) {
  if (!pastaCache) return null;
  return join(pastaCache, `transcricao-${await chave(arquivo, { backend, modelo, idioma })}.json`);
}

// Le a transcricao do cache sem rodar nada. Devolve null se nao houver.
export async function lerCache(arquivo, {
  backend = process.env.STUDIO_BACKEND || 'fasterwhisper',
  modelo = process.env.STUDIO_MODELO || 'medium',
  idioma = 'pt',
  pastaCache,
} = {}) {
  const caminho = await caminhoDoCache(arquivo, { backend, modelo, idioma, pastaCache });
  if (!caminho || !existsSync(caminho)) return null;
  return JSON.parse(await readFile(caminho, 'utf8'));
}

// Prefere o venv do proprio studio; so cai no python do sistema se ele nao existir.
export function pythonDoStudio() {
  if (process.env.STUDIO_PYTHON) return process.env.STUDIO_PYTHON;
  const raiz = join(AQUI, '..');
  for (const relativo of ['.venv/bin/python', '.venv/Scripts/python.exe']) {
    const candidato = join(raiz, relativo);
    if (existsSync(candidato)) return candidato;
  }
  return 'python3';
}

async function viaFasterWhisper(wav, { modelo, idioma }) {
  const python = pythonDoStudio();
  const { stdout } = await exec(python, [join(AQUI, 'py', 'transcrever.py'), wav, modelo, idioma]);
  return JSON.parse(stdout);
}

// whisper.cpp: --output-json-full traz tokens com t0/t1 em centissegundos.
async function viaWhisperCpp(wav, { modelo, idioma }) {
  const bin = process.env.WHISPER_CPP_BIN || 'whisper-cli';
  const caminhoModelo = process.env.WHISPER_CPP_MODELO;
  if (!caminhoModelo) {
    throw new Error('Defina WHISPER_CPP_MODELO com o caminho do .bin (ex: ggml-medium.bin).');
  }
  const prefixo = wav.replace(/\.wav$/, '');
  await exec(bin, [
    '-m', caminhoModelo, '-f', wav, '-l', idioma,
    '--output-json-full', '--output-file', prefixo,
  ]);
  const saida = `${prefixo}.json`;
  const dados = JSON.parse(await readFile(saida, 'utf8'));
  await rm(saida, { force: true });
  return {
    idioma,
    modelo: modelo || caminhoModelo,
    backend: 'whispercpp',
    segmentos: (dados.transcription || []).map((s) => ({
      inicio: (s.offsets?.from ?? 0) / 1000,
      fim: (s.offsets?.to ?? 0) / 1000,
      texto: (s.text || '').trim(),
      palavras: palavrasDeTokens(s.tokens || []),
    })),
  };
}

// whisper.cpp quebra em subpalavras: junta token que nao comeca com espaco.
export function palavrasDeTokens(tokens) {
  const palavras = [];
  for (const t of tokens) {
    const texto = t.text ?? '';
    if (!texto.trim() || /^\[/.test(texto.trim())) continue;
    const inicio = (t.offsets?.from ?? 0) / 1000;
    const fim = (t.offsets?.to ?? 0) / 1000;
    const prob = Number(t.p ?? 0);
    if (texto.startsWith(' ') || palavras.length === 0) {
      palavras.push({ inicio, fim, palavra: texto.trim(), prob: Number(prob.toFixed(3)) });
    } else {
      const ultima = palavras[palavras.length - 1];
      ultima.palavra += texto.trim();
      ultima.fim = fim;
      ultima.prob = Number(Math.min(ultima.prob || 1, prob).toFixed(3));
    }
  }
  return palavras.filter((p) => p.palavra);
}

// Todas as palavras em ordem, independente de como o backend quebrou os segmentos.
export function palavras(transcricao) {
  const todas = [];
  for (const s of transcricao.segmentos || []) {
    if (s.palavras?.length) todas.push(...s.palavras);
    else if (s.texto) todas.push({ inicio: s.inicio, fim: s.fim, palavra: s.texto, prob: 0 });
  }
  return todas.sort((a, b) => a.inicio - b.inicio);
}
