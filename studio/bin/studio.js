#!/usr/bin/env node
// CLI do studio. Sem dependencia externa: so Node e ffmpeg.
import { basename } from 'node:path';
import { existsSync } from 'node:fs';
import * as projeto from '../src/projeto.js';
import * as pipeline from '../src/pipeline.js';
import * as musica from '../src/musica.js';
import * as edlMod from '../src/edl.js';

const cor = {
  forte: (s) => `\x1b[1m${s}\x1b[0m`,
  fraco: (s) => `\x1b[2m${s}\x1b[0m`,
  vermelho: (s) => `\x1b[31m${s}\x1b[0m`,
  verde: (s) => `\x1b[32m${s}\x1b[0m`,
};
const aviso = (m) => console.log(cor.fraco(`  ${m}`));

function lerArgs(argv) {
  const posicionais = [];
  const opcoes = {};
  for (const bruto of argv) {
    if (bruto.startsWith('--')) {
      const [chave, valor] = bruto.slice(2).split('=');
      opcoes[chave] = valor === undefined ? true : valor;
    } else posicionais.push(bruto);
  }
  return { posicionais, opcoes };
}

const AJUDA = `
${cor.forte('studio')} - linha de montagem dos videos

  studio novo "<nome do video>"
      Cria a pasta do projeto. Jogue os brutos em projetos/<slug>/bruto/
      e escreva o roteiro em projetos/<slug>/roteiro.txt (uma fala por linha).

  studio analisar <slug> [opcoes]
      Corta silencio, transcreve e escolhe o melhor take de cada linha.
      --sem-transcricao   so corta silencio (rapido, nao precisa de whisper)
      --backend=fasterwhisper|whispercpp
      --modelo=medium     modelo do whisper
      --criterio=ultimo|melhor
      --ordem=roteiro|gravacao
      --forcar            ignora o cache de transcricao

  studio render <slug> [opcoes]
      Gera o corte, a legenda e o pacote em projetos/<slug>/saida/.
      --legenda=queimada|arquivo|nao
      --musica=<caminho ou nome da faixa>
      --beat              encosta os cortes no beat da musica
      --gancho=2          segundo do corte onde o drop deve cair

  studio projetos                 lista os projetos
  studio status <slug>            mostra a EDL atual
  studio musica sync              analisa as faixas em musicas/
  studio musica sugerir <slug>    sugere faixa para a duracao do corte
  studio painel [--porta=4321]    sobe o painel e abre no navegador
      --sem-navegador     so sobe o servidor, nao abre nada
`;

async function principal() {
  const [comando, ...resto] = process.argv.slice(2);
  const { posicionais, opcoes } = lerArgs(resto);

  switch (comando) {
    case 'novo': {
      const nome = posicionais.join(' ');
      if (!nome) throw new Error('de um nome: studio novo "gancho cobrar pouco"');
      const c = await projeto.criar({ nome, perfil: opcoes.perfil || 'lara' });
      console.log(cor.verde(`projeto ${c.slug} criado`));
      console.log(`  brutos em  ${c.bruto}`);
      console.log(`  roteiro em ${c.roteiro}`);
      break;
    }

    case 'analisar': {
      const slug = exigirSlug(posicionais);
      const { edl, resumo } = await pipeline.analisar(slug, {
        transcrever: !opcoes['sem-transcricao'],
        backend: opcoes.backend,
        modelo: opcoes.modelo,
        criterio: opcoes.criterio,
        ordem: opcoes.ordem,
        forcar: Boolean(opcoes.forcar),
        aviso,
      });
      for (const v of resumo.videos) {
        console.log(`${basename(v.arquivo)}: ${v.duracaoOriginal.toFixed(1)}s -> ${v.duracaoFalada.toFixed(1)}s de fala (${v.falas} trechos, ${v.segundosCortados.toFixed(1)}s de silencio fora)`);
      }
      resumoEdl(edl);
      break;
    }

    case 'render': {
      const slug = exigirSlug(posicionais);
      const faixa = opcoes.musica ? await acharFaixa(opcoes.musica) : null;
      const { saidas, duracao } = await pipeline.renderizar(slug, {
        legenda: opcoes.legenda || 'queimada',
        musica: faixa,
        alinharBeat: Boolean(opcoes.beat),
        ganchoEm: Number(opcoes.gancho || 0),
        aviso,
      });
      console.log(cor.verde(`corte de ${duracao.toFixed(1)}s pronto`));
      for (const [k, v] of Object.entries(saidas)) console.log(`  ${k}: ${v}`);
      break;
    }

    case 'projetos': {
      const todos = await projeto.listar();
      if (!todos.length) return console.log('nenhum projeto ainda. comece com: studio novo "nome"');
      for (const p of todos) console.log(`${p.slug.padEnd(28)} ${p.temEdl ? cor.verde('edl pronta') : cor.fraco('sem edl')}  ${p.nome}`);
      break;
    }

    case 'status': {
      const slug = exigirSlug(posicionais);
      const cfg = await projeto.carregarConfig(slug);
      if (!existsSync(cfg.caminhos.edl)) return console.log('sem edl. rode: studio analisar ' + slug);
      resumoEdl(await edlMod.carregar(cfg.caminhos.edl), { detalhado: true });
      break;
    }

    case 'musica': {
      const [sub, ...args] = posicionais;
      if (sub === 'sync') {
        const { faixas } = await musica.sincronizarBiblioteca(musica.PASTA_MUSICAS, {
          forcar: Boolean(opcoes.forcar),
          aoAnalisar: (a) => aviso(`analisando ${basename(a)}`),
        });
        for (const f of faixas) {
          console.log(`${f.nome.padEnd(32)} ${String(f.bpm).padStart(5)} bpm  ${f.duracao.toFixed(0).padStart(4)}s  drop ${f.drop ?? '-'}  ${(f.tags || []).join(',')}`);
        }
        break;
      }
      if (sub === 'sugerir') {
        const slug = exigirSlug(args);
        const cfg = await projeto.carregarConfig(slug);
        const edl = await edlMod.carregar(cfg.caminhos.edl);
        const duracao = edlMod.duracaoFinal(edl);
        const { faixas } = await musica.carregarBiblioteca();
        if (!faixas.length) return console.log('biblioteca vazia. jogue mp3 em musicas/ e rode: studio musica sync');
        const tags = opcoes.tags ? String(opcoes.tags).split(',') : [];
        console.log(`corte de ${duracao.toFixed(1)}s:`);
        for (const f of musica.sugerir({ faixas, duracao, tags })) {
          console.log(`  ${String(f.nota).padStart(6)}  ${f.nome.padEnd(30)} ${f.bpm} bpm  ${f.porque.join(' | ')}`);
        }
        break;
      }
      console.log('use: studio musica sync | studio musica sugerir <slug>');
      break;
    }

    case 'painel': {
      const { iniciar } = await import('../src/servidor.js');
      await iniciar({
        porta: Number(opcoes.porta || 4321),
        abrir: !opcoes['sem-navegador'],
      });
      break;
    }

    case 'ajuda': case '--help': case '-h': case undefined:
      console.log(AJUDA);
      break;

    default:
      console.log(cor.vermelho(`comando desconhecido: ${comando}`));
      console.log(AJUDA);
      process.exitCode = 1;
  }
}

function exigirSlug(posicionais) {
  const slug = posicionais[0];
  if (!slug) throw new Error('informe o slug do projeto (veja em: studio projetos)');
  return slug;
}

async function acharFaixa(pedido) {
  if (existsSync(pedido)) return pedido;
  const { faixas } = await musica.carregarBiblioteca();
  const alvo = String(pedido).toLowerCase();
  const achada = faixas.find((f) => f.nome.toLowerCase().includes(alvo));
  if (!achada) throw new Error(`faixa "${pedido}" nao encontrada. rode: studio musica sync`);
  return achada.arquivo;
}

function resumoEdl(edl, { detalhado = false } = {}) {
  const dentro = edlMod.incluidos(edl);
  const fora = edl.segmentos.filter((s) => !s.incluir);
  console.log(cor.forte(`\nEDL: ${dentro.length} trechos, ${edlMod.duracaoFinal(edl).toFixed(1)}s | ${fora.length} fora`));
  const lista = detalhado ? edl.segmentos : dentro;
  for (const s of lista) {
    const marca = s.incluir ? cor.verde('+') : cor.vermelho('-');
    const take = s.take ? cor.fraco(` [linha ${s.linhaRoteiro + 1} take ${s.take}]`) : '';
    const motivo = s.incluir ? '' : cor.fraco(` (${s.motivo})`);
    console.log(`${marca} ${String(s.id).padStart(2)} ${s.inicio.toFixed(2)}-${s.fim.toFixed(2)}  ${(s.texto || '').slice(0, 64)}${take}${motivo}`);
  }
}

principal().catch((e) => {
  console.error(cor.vermelho(`\nerro: ${e.message}`));
  process.exitCode = 1;
});
