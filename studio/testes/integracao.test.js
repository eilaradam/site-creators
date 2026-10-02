// Integracao de ponta a ponta com ffmpeg de verdade, sem depender do whisper:
// a transcricao e injetada no cache como se o whisper ja tivesse rodado.
import { test, before, after } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, rm, mkdir, writeFile, readFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { exec, FFMPEG } from '../src/ffmpeg.js';
import { caminhoDoCache } from '../src/transcricao.js';
import * as edlMod from '../src/edl.js';

let raiz;
let video;
const SLUG = 'teste-integracao';

// Dois takes da linha 1 (o primeiro cortado no meio), um da linha 2 e uma muleta.
// As janelas batem com o audio gerado abaixo: 2s de tom a cada 4s.
const FALAS = [
  { de: 0.1, ate: 1.9, texto: 'o maior erro que toda' },
  { de: 4.1, ate: 5.9, texto: 'ahn peraí' },
  { de: 8.1, ate: 9.9, texto: 'o maior erro que toda creator comete' },
  { de: 12.1, ate: 13.9, texto: 'e cobrar pouco demais pelo proprio trabalho' },
];

before(async () => {
  raiz = await mkdtemp(join(tmpdir(), 'studio-integracao-'));
  process.env.STUDIO_PROJETOS = raiz;

  const base = join(raiz, SLUG);
  await mkdir(join(base, 'bruto'), { recursive: true });
  await mkdir(join(base, 'cache'), { recursive: true });
  await mkdir(join(base, 'saida'), { recursive: true });
  await writeFile(join(base, 'projeto.json'), JSON.stringify({ nome: 'teste', slug: SLUG, perfil: 'lara' }));
  await writeFile(join(base, 'roteiro.txt'),
    'O maior erro que toda creator comete\ne cobrar pouco demais pelo proprio trabalho\n');

  // 16s: 2s de tom a cada 4s, uma janela de fala para cada entrada de FALAS.
  video = join(base, 'bruto', 'bruto.mp4');
  await exec(FFMPEG, [
    '-y', '-hide_banner', '-loglevel', 'error',
    '-f', 'lavfi', '-i', 'color=c=gray:size=360x640:rate=15:duration=16',
    '-f', 'lavfi', '-i', 'aevalsrc=0.4*sin(440*2*PI*t)*between(mod(t\\,4)\\,0\\,2):d=16:s=48000',
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '30', '-c:a', 'aac', '-shortest', video,
  ]);

  // Cache de transcricao: palavras espalhadas dentro de cada janela de fala.
  const segmentos = FALAS.map((f) => {
    const partes = f.texto.split(' ');
    const passo = (f.ate - f.de - 0.2) / partes.length;
    return {
      inicio: f.de, fim: f.ate, texto: f.texto,
      palavras: partes.map((palavra, i) => ({
        inicio: Number((f.de + 0.1 + i * passo).toFixed(3)),
        fim: Number((f.de + 0.1 + (i + 1) * passo - 0.02).toFixed(3)),
        palavra, prob: 0.92,
      })),
    };
  });
  const caminho = await caminhoDoCache(video, { pastaCache: join(base, 'cache') });
  await writeFile(caminho, JSON.stringify({ arquivo: video, idioma: 'pt', modelo: 'medium', backend: 'fasterwhisper', segmentos }));
});

after(async () => {
  if (raiz) await rm(raiz, { recursive: true, force: true });
  delete process.env.STUDIO_PROJETOS;
});

// O import do pipeline fica dentro do teste de proposito: projeto.js le
// STUDIO_PROJETOS na hora em que e carregado, e o before() define a variavel.
test('analisar: fica o ultimo take bom, muleta e descartada', async () => {
  const { analisar } = await import('../src/pipeline.js');
  const { edl } = await analisar(SLUG, { aviso: () => {} });

  const dentro = edlMod.incluidos(edl);
  assert.equal(dentro.length, 2, 'uma fala por linha do roteiro');
  assert.match(dentro[0].texto, /comete$/, 'o take completo ganha do cortado');
  assert.match(dentro[1].texto, /pelo proprio trabalho$/);

  const fora = edl.segmentos.filter((s) => !s.incluir);
  assert.equal(fora.length, 2);
  assert.ok(fora.some((s) => /muleta|fora do roteiro/.test(s.motivo)), 'a muleta sai com motivo');
  assert.ok(fora.some((s) => /take 1 de 2/.test(s.motivo)), 'o take descartado diz qual era');
});

test('render: corte, legenda e entrega saem com a duracao da EDL', async () => {
  const { renderizar } = await import('../src/pipeline.js');
  const { saidas, duracao } = await renderizar(SLUG, { legenda: 'queimada', aviso: () => {} });

  for (const chave of ['corte', 'ass', 'srt', 'legendaJson', 'legendado', 'entrega']) {
    assert.ok(existsSync(saidas[chave]), `faltou ${chave}`);
  }

  const { probe } = await import('../src/ffmpeg.js');
  const info = await probe(saidas.corte);
  assert.ok(Math.abs(info.duracao - duracao) < 0.3, `corte ${info.duracao}s vs edl ${duracao}s`);

  // A legenda cobre o corte inteiro e nao carrega palavra de trecho descartado.
  const legenda = JSON.parse(await readFile(saidas.legendaJson, 'utf8'));
  const texto = legenda.blocos.map((b) => b.texto).join(' ');
  assert.ok(texto.includes('comete'));
  assert.ok(!/peraí|perai/.test(texto), 'muleta cortada nao aparece na legenda');
  assert.ok(legenda.blocos[legenda.blocos.length - 1].fim <= duracao + 0.1);
  assert.equal(legenda.blocos[0].inicio < 1, true, 'a legenda comeca junto com o corte');
});
