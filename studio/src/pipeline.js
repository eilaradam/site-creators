// Amarra as etapas: bruto -> EDL -> corte -> legenda -> entrega.
import { writeFile, mkdir, copyFile } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, basename } from 'node:path';
import * as ff from './ffmpeg.js';
import * as falaMod from './fala.js';
import * as edlMod from './edl.js';
import * as takesMod from './takes.js';
import * as legendaMod from './legenda.js';
import * as musicaMod from './musica.js';
import * as projetoMod from './projeto.js';
import { carregarPerfil } from './perfil.js';
import { transcrever } from './transcricao.js';

const log = (aviso, msg) => { if (aviso) aviso(msg); };

// Monta a EDL: corta silencio sempre, e escolhe take quando ha transcricao.
export async function analisar(slug, {
  transcrever: comTranscricao = true,
  backend, modelo, criterio, ordem, forcar = false, aviso,
} = {}) {
  const cfg = await projetoMod.carregarConfig(slug);
  const perfil = await carregarPerfil(cfg.perfil || 'lara');
  const videos = await projetoMod.videosBrutos(slug);
  if (!videos.length) throw new Error(`nenhum video em ${cfg.caminhos.bruto}`);

  const roteiro = takesMod.lerRoteiro(await projetoMod.lerRoteiroBruto(slug));
  const edl = edlMod.novaEdl({ projeto: slug, alvo: perfil.alvo });
  const transcricoes = {};
  const resumo = { videos: [], roteiro: roteiro.length, transcrito: false };

  for (const video of videos) {
    log(aviso, `lendo ${basename(video)}`);
    const info = await ff.probe(video);
    const silencios = await ff.detectarSilencio(video, {
      ruido: perfil.corte.ruido,
      duracaoMinima: perfil.corte.duracaoMinimaSilencio,
    });
    const regioes = falaMod.regioesDeFala({
      duracao: info.duracao,
      silencios,
      padding: perfil.corte.padding,
      gapMinimo: perfil.corte.gapMinimo,
      duracaoMinima: perfil.corte.duracaoMinimaFala,
    });
    const economia = falaMod.economia({ duracao: info.duracao, regioes });
    resumo.videos.push({ arquivo: video, ...economia, falas: regioes.length });

    if (!comTranscricao) {
      for (const r of regioes) edl.segmentos.push(edlMod.segmento({ arquivo: video, inicio: r.inicio, fim: r.fim }));
      continue;
    }

    log(aviso, `transcrevendo ${basename(video)} (pode demorar na primeira vez)`);
    const transcricao = await transcrever(video, {
      backend, modelo, pastaCache: cfg.caminhos.cache, forcar,
    });
    transcricoes[video] = transcricao;
    resumo.transcrito = true;

    const falas = takesMod.montarFalas(transcricao, regioes);
    const falasComLinha = roteiro.length
      ? takesMod.alinhar({ falas, linhas: roteiro, limiar: perfil.takes.limiar })
      : falas;
    const decisao = roteiro.length
      ? takesMod.escolherTakes(falasComLinha, { criterio: criterio || perfil.takes.criterio })
      : takesMod.agruparRepeticoes(falas);
    edl.segmentos.push(...takesMod.montarSegmentos({
      arquivo: video,
      falas: falasComLinha,
      decisao,
      linhas: roteiro,
      ordem: roteiro.length ? (ordem || perfil.takes.ordem) : 'gravacao',
    }));
  }

  edlMod.reindexar(edl);
  await edlMod.salvar(cfg.caminhos.edl, edl);
  return { edl, resumo, transcricoes, perfil, cfg };
}

// EDL -> arquivos em saida/.
export async function renderizar(slug, {
  legenda = 'queimada', // 'queimada' | 'arquivo' | 'nao'
  musica = null,
  alinharBeat = false,
  ganchoEm = 0,
  aviso,
} = {}) {
  const cfg = await projetoMod.carregarConfig(slug);
  const perfil = await carregarPerfil(cfg.perfil || 'lara');
  const edl = await edlMod.carregar(cfg.caminhos.edl);
  const incluidos = edlMod.incluidos(edl);
  if (!incluidos.length) throw new Error('a EDL nao tem nenhum segmento ativo');
  await mkdir(cfg.caminhos.saida, { recursive: true });

  let analiseMusica = null;
  if (musica) {
    log(aviso, 'analisando a musica');
    analiseMusica = await musicaMod.analisar(musica);
    if (alinharBeat) {
      const ajustes = musicaMod.alinharCortesAoBeat({ edl, beats: analiseMusica.beats });
      log(aviso, `${ajustes.ajustes.length} cortes encostados no beat`);
      await edlMod.salvar(cfg.caminhos.edl, edl);
    }
  }

  const corte = join(cfg.caminhos.saida, 'corte.mp4');
  log(aviso, `cortando ${edlMod.incluidos(edl).length} trechos`);
  await ff.cortar(
    edlMod.incluidos(edl).map((s) => ({ arquivo: s.arquivo, inicio: s.inicio, fim: s.fim })),
    corte,
    { ...edl.alvo, ...perfil.render }
  );
  const saidas = { corte };

  if (legenda !== 'nao') {
    const transcricoes = await carregarTranscricoes(slug, edl, cfg);
    if (Object.keys(transcricoes).length) {
      const ass = join(cfg.caminhos.saida, 'legenda.ass');
      const srt = join(cfg.caminhos.saida, 'legenda.srt');
      const jsonLegenda = join(cfg.caminhos.saida, 'legenda.json');
      const { total } = await legendaMod.escreverLegendas({
        edl, transcricoes, perfil, caminhoAss: ass, caminhoSrt: srt, caminhoJson: jsonLegenda,
      });
      saidas.ass = ass;
      saidas.srt = srt;
      saidas.legendaJson = jsonLegenda;
      log(aviso, `${total} blocos de legenda`);
      if (legenda === 'queimada') {
        const legendado = join(cfg.caminhos.saida, 'corte-legendado.mp4');
        await ff.queimarLegenda(corte, ass, legendado, perfil.render);
        saidas.legendado = legendado;
      }
    } else {
      log(aviso, 'sem transcricao em cache: rode "analisar" antes para ter legenda');
    }
  }

  if (analiseMusica) {
    const duracao = edlMod.duracaoFinal(edl);
    const entrada = analiseMusica.drop !== null
      ? musicaMod.entradaParaDrop({ analise: analiseMusica, instanteAlvo: ganchoEm })
      : 0;
    const destino = join(cfg.caminhos.saida, 'musica.m4a');
    await ff.recortarAudio(musica, destino, { inicio: entrada, duracao, fadeIn: 0.1, fadeOut: 0.6 });
    saidas.musica = destino;
    edl.musica = { arquivo: musica, offset: entrada, bpm: analiseMusica.bpm, drop: analiseMusica.drop };
    await edlMod.salvar(cfg.caminhos.edl, edl);
  }

  saidas.entrega = await escreverEntrega({ cfg, edl, saidas, analiseMusica });
  return { saidas, edl, duracao: edlMod.duracaoFinal(edl) };
}

// Render nunca dispara transcricao: usa so o que "analisar" ja deixou em cache.
async function carregarTranscricoes(slug, edl, cfg) {
  const { lerCache } = await import('./transcricao.js');
  const arquivos = [...new Set(edl.segmentos.map((s) => s.arquivo))];
  const saida = {};
  for (const arquivo of arquivos) {
    if (!existsSync(arquivo)) continue;
    const t = await lerCache(arquivo, { pastaCache: cfg.caminhos.cache });
    if (t) saida[arquivo] = t;
  }
  return saida;
}

async function escreverEntrega({ cfg, edl, saidas, analiseMusica }) {
  const duracao = edlMod.duracaoFinal(edl);
  const usados = edlMod.incluidos(edl);
  const fora = edl.segmentos.filter((s) => !s.incluir);
  const linhas = [
    `# ${cfg.nome}`,
    '',
    `Duracao do corte: ${duracao.toFixed(1)}s em ${usados.length} trechos.`,
    `Descartados: ${fora.length}.`,
    '',
    '## Para o celular',
    '',
    ...Object.entries(saidas).map(([k, v]) => `- ${k}: ${basename(v)}`),
    '',
    '## Trechos usados',
    '',
    ...usados.map((s) => `${String(s.id).padStart(2, '0')}. ${fmt(s.inicio)}-${fmt(s.fim)}  ${s.texto || '(sem fala)'}`),
  ];
  if (fora.length) {
    linhas.push('', '## Deixados de fora', '', ...fora.map((s) => `- ${fmt(s.inicio)}-${fmt(s.fim)} (${s.motivo}) ${s.texto || ''}`.trim()));
  }
  if (analiseMusica) {
    linhas.push('', '## Musica', '',
      `- faixa: ${basename(analiseMusica.arquivo)}`,
      `- bpm: ${analiseMusica.bpm}`,
      `- drop: ${analiseMusica.drop === null ? 'sem drop claro' : analiseMusica.drop + 's'}`,
      `- entra em: ${edl.musica?.offset ?? 0}s da faixa original`);
  }
  const caminho = join(cfg.caminhos.saida, 'entrega.md');
  await writeFile(caminho, linhas.join('\n') + '\n', 'utf8');
  return caminho;
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
