// Painel local. So escuta em 127.0.0.1 e so serve arquivo de dentro do studio.
import { createServer } from 'node:http';
import { createReadStream } from 'node:fs';
import { readFile, writeFile, stat } from 'node:fs/promises';
import { existsSync } from 'node:fs';
import { join, extname, resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import * as projeto from './projeto.js';
import * as pipeline from './pipeline.js';
import * as musica from './musica.js';
import * as edlMod from './edl.js';

const RAIZ = join(dirname(fileURLToPath(import.meta.url)), '..');
const WEB = join(RAIZ, 'web');

const TIPOS = {
  '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8',
  '.css': 'text/css; charset=utf-8', '.json': 'application/json; charset=utf-8',
  '.mp4': 'video/mp4', '.webm': 'video/webm', '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg', '.wav': 'audio/wav', '.srt': 'text/plain; charset=utf-8',
  '.ass': 'text/plain; charset=utf-8', '.md': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml', '.png': 'image/png',
};

// Tarefa longa (analisar, render) roda em background e o painel pergunta o estado.
const tarefas = new Map();
let proximaTarefa = 1;

function abrirTarefa(titulo, executar) {
  const id = String(proximaTarefa++);
  const tarefa = { id, titulo, estado: 'rodando', linhas: [], erro: null, resultado: null, inicio: Date.now() };
  tarefas.set(id, tarefa);
  executar((m) => tarefa.linhas.push(m))
    .then((r) => { tarefa.resultado = r; tarefa.estado = 'pronto'; })
    .catch((e) => { tarefa.erro = e.message; tarefa.estado = 'erro'; })
    .finally(() => { tarefa.fim = Date.now(); });
  return tarefa;
}

const json = (res, dados, status = 200) => {
  res.writeHead(status, { 'content-type': 'application/json; charset=utf-8' });
  res.end(JSON.stringify(dados));
};

async function corpo(req) {
  const partes = [];
  for await (const p of req) partes.push(p);
  if (!partes.length) return {};
  return JSON.parse(Buffer.concat(partes).toString('utf8'));
}

// So deixa sair arquivo de dentro das pastas do studio.
function caminhoPermitido(caminho) {
  const alvo = resolve(caminho);
  return [resolve(projeto.PASTA_PROJETOS), resolve(musica.PASTA_MUSICAS)]
    .some((raiz) => alvo === raiz || alvo.startsWith(raiz + '/'));
}

async function servirArquivo(res, caminho, req) {
  if (!existsSync(caminho)) return json(res, { erro: 'nao encontrado' }, 404);
  const info = await stat(caminho);
  const tipo = TIPOS[extname(caminho).toLowerCase()] || 'application/octet-stream';
  const faixa = req.headers.range;
  if (faixa && /^bytes=/.test(faixa)) {
    const [de, ate] = faixa.replace('bytes=', '').split('-');
    const inicio = Number(de) || 0;
    const fim = ate ? Number(ate) : info.size - 1;
    res.writeHead(206, {
      'content-type': tipo,
      'content-range': `bytes ${inicio}-${fim}/${info.size}`,
      'accept-ranges': 'bytes',
      'content-length': fim - inicio + 1,
    });
    return createReadStream(caminho, { start: inicio, end: fim }).pipe(res);
  }
  res.writeHead(200, { 'content-type': tipo, 'content-length': info.size, 'accept-ranges': 'bytes' });
  createReadStream(caminho).pipe(res);
}

async function api(req, res, url) {
  const partes = url.pathname.split('/').filter(Boolean).slice(1); // tira 'api'
  const metodo = req.method;

  if (partes[0] === 'projetos' && partes.length === 1) {
    if (metodo === 'GET') return json(res, await projeto.listar());
    if (metodo === 'POST') {
      const { nome, perfil } = await corpo(req);
      const c = await projeto.criar({ nome, perfil });
      return json(res, { slug: c.slug }, 201);
    }
  }

  if (partes[0] === 'projetos' && partes[1]) {
    const slug = partes[1];
    const acao = partes[2];
    const cfg = await projeto.carregarConfig(slug);

    if (!acao && metodo === 'GET') {
      const edl = existsSync(cfg.caminhos.edl) ? await edlMod.carregar(cfg.caminhos.edl) : null;
      return json(res, {
        ...cfg,
        roteiro: await projeto.lerRoteiroBruto(slug),
        brutos: (await projeto.videosBrutos(slug)).map((a) => ({ arquivo: a, nome: a.split('/').pop() })),
        edl,
        duracao: edl ? edlMod.duracaoFinal(edl) : 0,
        saida: ['corte.mp4', 'corte-legendado.mp4', 'legenda.srt', 'legenda.ass', 'legenda.json', 'musica.m4a', 'entrega.md']
          .filter((n) => existsSync(join(cfg.caminhos.saida, n)))
          .map((n) => ({ nome: n, caminho: join(cfg.caminhos.saida, n) })),
      });
    }

    if (acao === 'roteiro' && metodo === 'PUT') {
      const { texto } = await corpo(req);
      await writeFile(cfg.caminhos.roteiro, String(texto ?? ''), 'utf8');
      return json(res, { ok: true });
    }

    if (acao === 'edl' && metodo === 'PUT') {
      const { segmentos } = await corpo(req);
      const edl = await edlMod.carregar(cfg.caminhos.edl);
      const porId = new Map(edl.segmentos.map((s) => [s.id, s]));
      for (const mudanca of segmentos || []) {
        const alvo = porId.get(mudanca.id);
        if (!alvo) continue;
        if (typeof mudanca.incluir === 'boolean') {
          alvo.incluir = mudanca.incluir;
          alvo.motivo = mudanca.incluir ? null : 'tirado no painel';
        }
      }
      await edlMod.salvar(cfg.caminhos.edl, edl);
      return json(res, { ok: true, duracao: edlMod.duracaoFinal(edl) });
    }

    if (acao === 'analisar' && metodo === 'POST') {
      const opcoes = await corpo(req);
      const tarefa = abrirTarefa(`analisar ${slug}`, (aviso) =>
        pipeline.analisar(slug, { ...opcoes, aviso }).then((r) => ({ resumo: r.resumo })));
      return json(res, { tarefa: tarefa.id }, 202);
    }

    if (acao === 'render' && metodo === 'POST') {
      const opcoes = await corpo(req);
      const tarefa = abrirTarefa(`render ${slug}`, (aviso) =>
        pipeline.renderizar(slug, { ...opcoes, aviso }).then((r) => ({ saidas: r.saidas, duracao: r.duracao })));
      return json(res, { tarefa: tarefa.id }, 202);
    }

    if (acao === 'sugerir-musica' && metodo === 'GET') {
      const edl = await edlMod.carregar(cfg.caminhos.edl);
      const { faixas } = await musica.carregarBiblioteca();
      const tags = (url.searchParams.get('tags') || '').split(',').filter(Boolean);
      return json(res, musica.sugerir({ faixas, duracao: edlMod.duracaoFinal(edl), tags }));
    }
  }

  if (partes[0] === 'musicas') {
    if (metodo === 'GET') return json(res, await musica.carregarBiblioteca());
    if (metodo === 'POST') {
      const tarefa = abrirTarefa('analisar musicas', (aviso) =>
        musica.sincronizarBiblioteca(musica.PASTA_MUSICAS, {
          aoAnalisar: (a) => aviso(`analisando ${a.split('/').pop()}`),
        }));
      return json(res, { tarefa: tarefa.id }, 202);
    }
  }

  if (partes[0] === 'tarefas' && partes[1]) {
    const tarefa = tarefas.get(partes[1]);
    if (!tarefa) return json(res, { erro: 'tarefa nao encontrada' }, 404);
    return json(res, tarefa);
  }

  return json(res, { erro: 'rota desconhecida' }, 404);
}

export function iniciar({ porta = 4321, host = '127.0.0.1' } = {}) {
  const servidor = createServer(async (req, res) => {
    const url = new URL(req.url, `http://${host}:${porta}`);
    try {
      if (url.pathname.startsWith('/api/')) return await api(req, res, url);

      if (url.pathname === '/arquivo') {
        const caminho = url.searchParams.get('caminho');
        if (!caminho || !caminhoPermitido(caminho)) return json(res, { erro: 'caminho fora do studio' }, 403);
        return await servirArquivo(res, caminho, req);
      }

      const nome = url.pathname === '/' ? 'index.html' : url.pathname.slice(1);
      const arquivo = join(WEB, nome);
      if (!resolve(arquivo).startsWith(resolve(WEB))) return json(res, { erro: 'caminho invalido' }, 403);
      if (!existsSync(arquivo)) return json(res, { erro: 'nao encontrado' }, 404);
      res.writeHead(200, { 'content-type': TIPOS[extname(arquivo)] || 'text/plain' });
      res.end(await readFile(arquivo));
    } catch (e) {
      json(res, { erro: e.message }, 500);
    }
  });

  return new Promise((resolvePromise) => {
    servidor.listen(porta, host, () => {
      console.log(`painel em http://${host}:${porta}`);
      resolvePromise(servidor);
    });
  });
}
