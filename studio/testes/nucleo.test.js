import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lerSilencedetect, escaparFiltro } from '../src/ffmpeg.js';
import { regioesDeFala, economia } from '../src/fala.js';
import { novaEdl, segmento, reindexar, duracaoFinal, mapaDeTempo, validar } from '../src/edl.js';
import { similaridade, soMuleta, lerRoteiro, alinhar, escolherTakes, agruparRepeticoes, montarSegmentos, montarFalas } from '../src/takes.js';
import { corAss, tempoAss, tempoSrt, montarBlocos, gerarAss, gerarSrt, palavrasNoCorte } from '../src/legenda.js';
import { envelope, forcaDeOnset, estimarBpm, gradeDeBeats, sugerir, beatMaisProximo, alinharCortesAoBeat, entradaParaDrop } from '../src/musica.js';
import { palavrasDeTokens, palavras } from '../src/transcricao.js';
import { apelido } from '../src/projeto.js';

test('silencedetect: le pares e fecha janela aberta no fim', () => {
  const texto = 'silence_start: 1.5\nsilence_end: 2.75 | silence_duration: 1.25\nsilence_start: 9.0\n';
  const janelas = lerSilencedetect(texto);
  assert.deepEqual(janelas[0], { inicio: 1.5, fim: 2.75 });
  assert.equal(janelas[1].fim, Infinity);
});

test('escaparFiltro escapa os dois-pontos do caminho', () => {
  assert.equal(escaparFiltro('C:/a/leg.ass'), 'C\\:/a/leg.ass');
});

test('regioes de fala invertem o silencio e respeitam o gap minimo', () => {
  const r = regioesDeFala({ duracao: 10, silencios: [{ inicio: 2, fim: 3 }, { inicio: 5, fim: 5.1 }], gapMinimo: 0.22 });
  assert.equal(r.length, 2, 'pausa de 0.1s nao vira corte');
  assert.ok(r[0].fim > 2 && r[0].fim < 2.5, 'folga nao invade o vizinho');
  assert.equal(economia({ duracao: 10, regioes: r }).segundosCortados > 0, true);
});

test('regiao menor que a duracao minima some', () => {
  const r = regioesDeFala({ duracao: 10, silencios: [{ inicio: 0.1, fim: 9.9 }], duracaoMinima: 0.35, padding: 0 });
  assert.equal(r.length, 0);
});

test('mapa de tempo leva o bruto para o corte final e ignora o que saiu', () => {
  const edl = novaEdl({ projeto: 't' });
  edl.segmentos.push(
    segmento({ arquivo: 'a.mp4', inicio: 1, fim: 3 }),
    segmento({ arquivo: 'a.mp4', inicio: 6, fim: 7, incluir: false }),
    segmento({ arquivo: 'a.mp4', inicio: 8, fim: 10 }),
  );
  reindexar(edl);
  const mapa = mapaDeTempo(edl);
  assert.equal(duracaoFinal(edl), 4);
  assert.equal(mapa.paraFinal('a.mp4', 2), 1);
  assert.equal(mapa.paraFinal('a.mp4', 6.5), null, 'trecho cortado nao tem lugar no final');
  assert.equal(mapa.paraFinal('a.mp4', 9), 3);
  assert.deepEqual(mapa.intervaloParaFinal('a.mp4', 2.5, 8.5), { inicio: 1.5, fim: 2 });
});

test('EDL invalida reclama com o motivo', () => {
  const edl = novaEdl({ projeto: 't' });
  edl.segmentos.push(segmento({ arquivo: 'a.mp4', inicio: 5, fim: 2 }));
  assert.throws(() => validar(edl), /nao e maior que inicio/);
});

test('similaridade reconhece o mesmo texto gaguejado e rejeita texto alheio', () => {
  assert.ok(similaridade('o maior erro que toda creator comete', 'o maior er o maior erro que toda creator comete') > 0.7);
  assert.ok(similaridade('comenta aqui embaixo', 'o maior erro que toda creator comete') < 0.4);
});

test('muleta e descartada, fala de verdade nao', () => {
  assert.ok(soMuleta('ahn peraí'));
  assert.ok(soMuleta('corta'));
  assert.ok(!soMuleta('o maior erro que toda creator comete'));
});

test('roteiro ignora cabecalho de cena, marcacao e bullet', () => {
  const linhas = lerRoteiro('CENA 1 - gancho\n[ela olha pra camera]\nO maior erro que toda creator comete\n> e cobrar pouco demais\n\n(pausa)\nCENA 2:\nComenta aqui embaixo');
  assert.deepEqual(linhas, ['O maior erro que toda creator comete', 'e cobrar pouco demais', 'Comenta aqui embaixo']);
});

test('tres takes da mesma linha: fica o ultimo bom', () => {
  const linhas = ['o maior erro que toda creator comete', 'e cobrar pouco demais'];
  const falas = [
    { indice: 0, inicio: 0, fim: 2, texto: 'o maior erro que toda' },
    { indice: 1, inicio: 3, fim: 5, texto: 'o maior erro que toda creator comet' },
    { indice: 2, inicio: 6, fim: 8, texto: 'o maior erro que toda creator comete' },
    { indice: 3, inicio: 9, fim: 11, texto: 'e cobrar pouco demais' },
  ];
  const alinhadas = alinhar({ falas, linhas });
  assert.equal(alinhadas[0].linhaRoteiro, 0);
  assert.equal(alinhadas[3].linhaRoteiro, 1);
  const decisao = escolherTakes(alinhadas);
  assert.equal(decisao.get(2).escolhido, true, 'o ultimo take completo ganha');
  assert.equal(decisao.get(0).escolhido, false);
  assert.equal(decisao.get(1).escolhido, false);
  assert.equal(decisao.get(3).escolhido, true);
  assert.equal(decisao.get(0).totalTakes, 3);
});

test('criterio melhor escolhe por score, nao por ordem', () => {
  const linhas = ['o maior erro que toda creator comete'];
  const falas = [
    { indice: 0, inicio: 0, fim: 2, texto: 'o maior erro que toda creator comete' },
    { indice: 1, inicio: 3, fim: 5, texto: 'o maior erro que toda creator com' },
  ];
  const decisao = escolherTakes(alinhar({ falas, linhas }), { criterio: 'melhor' });
  assert.equal(decisao.get(0).escolhido, true);
});

test('fala fora do roteiro nao entra no corte', () => {
  const linhas = ['o maior erro que toda creator comete'];
  const falas = [{ indice: 0, inicio: 0, fim: 2, texto: 'deixa eu ver se o celular ta gravando' }];
  const alinhadas = alinhar({ falas, linhas });
  assert.equal(alinhadas[0].linhaRoteiro, null);
  const segs = montarSegmentos({ arquivo: 'a.mp4', falas: alinhadas, decisao: escolherTakes(alinhadas), linhas });
  assert.equal(segs[0].incluir, false);
  assert.match(segs[0].motivo, /fora do roteiro/);
});

test('sem roteiro, repeticoes seguidas viram um take so', () => {
  const falas = [
    { indice: 0, inicio: 0, fim: 2, texto: 'bom dia gente tudo bem com voces' },
    { indice: 1, inicio: 3, fim: 5, texto: 'bom dia gente tudo bem com voces' },
    { indice: 2, inicio: 6, fim: 8, texto: 'hoje eu vou falar de contrato' },
  ];
  const decisao = agruparRepeticoes(falas);
  assert.equal(decisao.get(0).escolhido, false);
  assert.equal(decisao.get(1).escolhido, true);
  assert.equal(decisao.get(2).escolhido, true);
});

test('ordem roteiro reordena o que foi gravado fora de ordem', () => {
  const linhas = ['comenta aqui embaixo', 'o maior erro que toda creator comete'];
  const falas = [
    { indice: 0, inicio: 0, fim: 2, texto: 'o maior erro que toda creator comete' },
    { indice: 1, inicio: 3, fim: 5, texto: 'comenta aqui embaixo' },
  ];
  const alinhadas = alinhar({ falas, linhas });
  const segs = montarSegmentos({ arquivo: 'a.mp4', falas: alinhadas, decisao: escolherTakes(alinhadas), linhas, ordem: 'roteiro' });
  assert.equal(segs[0].texto, 'comenta aqui embaixo');
  const naOrdem = montarSegmentos({ arquivo: 'a.mp4', falas: alinhadas, decisao: escolherTakes(alinhadas), linhas, ordem: 'gravacao' });
  assert.equal(naOrdem[0].texto, 'o maior erro que toda creator comete');
});

test('montarFalas usa a palavra cujo centro cai na regiao', () => {
  const transcricao = { segmentos: [{ inicio: 0, fim: 4, texto: 'um dois tres', palavras: [
    { inicio: 0.1, fim: 0.4, palavra: 'um', prob: 0.9 },
    { inicio: 1.0, fim: 1.4, palavra: 'dois', prob: 0.8 },
    { inicio: 3.0, fim: 3.4, palavra: 'tres', prob: 0.7 },
  ] }] };
  const falas = montarFalas(transcricao, [{ inicio: 0, fim: 2 }, { inicio: 2.5, fim: 4 }]);
  assert.equal(falas[0].texto, 'um dois');
  assert.equal(falas[1].texto, 'tres');
  assert.equal(falas[0].confianca, 0.85);
});

test('cor ASS inverte os canais e aceita alpha', () => {
  assert.equal(corAss('#C8441A'), '&H001A44C8');
  assert.equal(corAss('#FFF'), '&H00FFFFFF');
  assert.equal(corAss('#1B1B1B', 128), '&H801B1B1B');
});

test('tempos de legenda em ASS e SRT', () => {
  assert.equal(tempoAss(72.345), '0:01:12.34');
  assert.equal(tempoSrt(72.345), '00:01:12,345');
  assert.equal(tempoSrt(-1), '00:00:00,000');
});

test('blocos quebram por quantidade de palavras e por pausa', () => {
  const palavras = [
    { inicio: 0, fim: 0.3, palavra: 'o' }, { inicio: 0.3, fim: 0.6, palavra: 'maior' },
    { inicio: 0.6, fim: 0.9, palavra: 'erro' }, { inicio: 2.0, fim: 2.3, palavra: 'olha' },
  ];
  const blocos = montarBlocos(palavras, { palavrasPorBloco: 3, maxCaracteres: 24, pausaQuebraBloco: 0.5 });
  assert.equal(blocos.length, 2);
  assert.equal(blocos[0].texto, 'o maior erro');
  assert.equal(blocos[1].texto, 'olha');
});

test('ASS gerado tem um evento por palavra, com a ativa em destaque', () => {
  const estilo = { fonte: 'Be Vietnam Pro', tamanho: 88, corTexto: '#FFFFFF', corDestaque: '#C8441A', corContorno: '#1B1B1B', palavrasPorBloco: 3, maxCaracteres: 24, posicaoVertical: 0.74 };
  const blocos = montarBlocos([
    { inicio: 0, fim: 0.4, palavra: 'o' }, { inicio: 0.4, fim: 0.8, palavra: 'maior' },
  ], estilo);
  const ass = gerarAss({ blocos, estilo, alvo: { largura: 1080, altura: 1920 } });
  const eventos = ass.split('\n').filter((l) => l.startsWith('Dialogue'));
  assert.equal(eventos.length, 2);
  assert.ok(ass.includes('PlayResX: 1080'));
  assert.ok(eventos[0].includes(corAss('#C8441A')), 'a palavra ativa usa a cor de destaque');
  assert.ok(gerarSrt(blocos).startsWith('1\n00:00:00,000 --> '));
});

test('legenda segue o corte: palavra de trecho descartado nao aparece', () => {
  const edl = novaEdl({ projeto: 't' });
  edl.segmentos.push(
    segmento({ arquivo: 'a.mp4', inicio: 0, fim: 2 }),
    segmento({ arquivo: 'a.mp4', inicio: 4, fim: 6, incluir: false }),
    segmento({ arquivo: 'a.mp4', inicio: 8, fim: 10 }),
  );
  reindexar(edl);
  const transcricoes = { 'a.mp4': { segmentos: [{ inicio: 0, fim: 10, texto: '', palavras: [
    { inicio: 0.5, fim: 1.0, palavra: 'bom' },
    { inicio: 4.5, fim: 5.0, palavra: 'errei' },
    { inicio: 8.5, fim: 9.0, palavra: 'dia' },
  ] }] } };
  const saida = palavrasNoCorte({ edl, transcricoes });
  assert.deepEqual(saida.map((p) => p.palavra), ['bom', 'dia']);
  assert.equal(saida[1].inicio, 2.5, 'a segunda palavra desloca pelo que foi cortado');
});

test('tokens do whisper.cpp viram palavras inteiras', () => {
  const toks = [
    { text: ' bom', offsets: { from: 0, to: 300 }, p: 0.9 },
    { text: 'dia', offsets: { from: 300, to: 500 }, p: 0.8 },
    { text: ' gente', offsets: { from: 520, to: 900 }, p: 0.95 },
    { text: '[_TT_12]', offsets: { from: 900, to: 900 }, p: 1 },
  ];
  const p = palavrasDeTokens(toks);
  assert.deepEqual(p.map((x) => x.palavra), ['bomdia', 'gente']);
  assert.equal(p[0].fim, 0.5);
});

test('palavras() cai para o segmento quando o backend nao da timestamp por palavra', () => {
  assert.deepEqual(palavras({ segmentos: [{ inicio: 1, fim: 2, texto: 'oi', palavras: [] }] }),
    [{ inicio: 1, fim: 2, palavra: 'oi', prob: 0 }]);
});

test('BPM de um pulso regular de 120 bpm', () => {
  const taxa = 8000;
  const salto = 256;
  const amostras = new Float32Array(taxa * 20);
  for (let batida = 0; batida * 0.5 < 20; batida++) {
    const base = Math.round(batida * 0.5 * taxa);
    for (let i = 0; i < 400 && base + i < amostras.length; i++) {
      amostras[base + i] = Math.sin((i / taxa) * 2 * Math.PI * 1200) * Math.exp(-i / 200);
    }
  }
  const env = envelope(amostras, salto);
  const bpm = estimarBpm(forcaDeOnset(env), taxa / salto);
  assert.ok(Math.abs(bpm - 120) < 3, `bpm estimado ${bpm}`);
  const beats = gradeDeBeats({ onset: forcaDeOnset(env), taxaQuadros: taxa / salto, bpm, duracao: 20 });
  assert.ok(beats.length > 35 && beats.length < 45);
});

test('sugestao rejeita faixa curta e premia tag e drop cedo', () => {
  const faixas = [
    { nome: 'curta', duracao: 5, energia: 4, drop: 2, tags: ['viral'] },
    { nome: 'certa', duracao: 60, energia: 4, drop: 3, tags: ['viral'] },
    { nome: 'sem tag', duracao: 60, energia: 4, drop: 30, tags: [] },
  ];
  const r = sugerir({ faixas, duracao: 20, tags: ['viral'] });
  assert.equal(r[0].nome, 'certa');
  assert.ok(r.find((f) => f.nome === 'curta').nota < r[0].nota);
});

test('alinhar ao beat so desloca dentro da tolerancia', () => {
  const edl = novaEdl({ projeto: 't' });
  edl.segmentos.push(segmento({ arquivo: 'a.mp4', inicio: 0, fim: 1.95 }));
  reindexar(edl);
  const { ajustes } = alinharCortesAoBeat({ edl, beats: [0, 0.5, 1, 1.5, 2, 2.5], tolerancia: 0.12 });
  assert.equal(ajustes.length, 1);
  assert.equal(edl.segmentos[0].fim, 2);

  const longe = novaEdl({ projeto: 't' });
  longe.segmentos.push(segmento({ arquivo: 'a.mp4', inicio: 0, fim: 1.7 }));
  reindexar(longe);
  const r2 = alinharCortesAoBeat({ edl: longe, beats: [0, 0.5, 1, 1.5, 2], tolerancia: 0.12 });
  assert.equal(r2.ajustes.length, 0, 'desvio de 0.2s e corte visivel, nao ajusta');
});

test('entrada da musica poe o drop no instante do gancho', () => {
  assert.equal(entradaParaDrop({ analise: { drop: 7.9 }, instanteAlvo: 2 }), 5.9);
  assert.equal(entradaParaDrop({ analise: { drop: 1 }, instanteAlvo: 3 }), 0);
});

test('beatMaisProximo', () => {
  assert.equal(beatMaisProximo([0, 0.5, 1], 0.6), 0.5);
  assert.equal(beatMaisProximo([], 0.6), 0.6);
});

test('apelido de projeto tira acento e espaco', () => {
  assert.equal(apelido('Gancho: cobrar POUCO demais!'), 'gancho-cobrar-pouco-demais');
});
