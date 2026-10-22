#!/usr/bin/env node
/* Robô de edição da Lara: roda no Mac, pega os pedidos da aba Edição do admin,
   cria a pasta no Drive, espera o bruto, edita com o Claude Code e devolve a prévia.

   node robo.mjs            roda sem parar (checa a fila a cada minuto)
   node robo.mjs --uma-vez  checa a fila uma vez e sai
   node robo.mjs --login    guarda o acesso ao admin (usa ROBO_EMAIL e ROBO_SENHA) */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const SUPA = process.env.ROBO_SUPABASE_URL || 'https://mfrmnquvwwuxraqgemyh.supabase.co';
const ANON = process.env.ROBO_SUPABASE_ANON || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im1mcm1ucXV2d3d1eHJhcWdlbXloIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzIwNDI1NDIsImV4cCI6MjA4NzYxODU0Mn0.zmsi08dV5L1IlXJSr34vOii71w0g0OsD5_5DKio5g-o';
const DIR = process.env.ROBO_DIR || path.dirname(new URL(import.meta.url).pathname);
const SESSAO = path.join(DIR, 'sessao.json');           // só o refresh token, nunca a senha
const TRABALHOS = path.join(DIR, 'trabalhos');
const RCLONE = fs.existsSync(path.join(DIR, 'bin', 'rclone')) ? path.join(DIR, 'bin', 'rclone') : 'rclone';
const CLAUDE = process.env.ROBO_CLAUDE || 'claude';
const PASTA_RAIZ = 'Edição';
const INTERVALO_S = Number(process.env.ROBO_INTERVALO_S || 60);
const LIMITE_EDICAO_MIN = Number(process.env.ROBO_LIMITE_MIN || 90);
const VIDEO = /\.(mov|mp4|m4v|mkv|avi|webm)$/i;
const MIDIA = /\.(mov|mp4|m4v|mkv|avi|webm|jpg|jpeg|png|heic|webp|mp3|wav|m4a|aac)$/i;
const DO_ROBO = /^(PREVIA|PRÉVIA|FINAL|REC)\b/i;            // arquivos que o próprio robô sobe

const log = (...a) => console.log(new Date().toLocaleTimeString('pt-BR'), ...a);

/* ── Supabase (login da Lara, com as mesmas permissões de admin do site) ── */
let token = null, tokenAte = 0, usuarioId = null;
async function entrar(corpo, tipo) {
    const r = await fetch(SUPA + '/auth/v1/token?grant_type=' + tipo, {
        method: 'POST', headers: { apikey: ANON, 'Content-Type': 'application/json' }, body: JSON.stringify(corpo) });
    const j = await r.json().catch(() => ({}));
    if (!r.ok) throw new Error('Login no admin falhou: ' + (j.error_description || j.msg || r.status));
    fs.writeFileSync(SESSAO, JSON.stringify({ refresh_token: j.refresh_token }), { mode: 0o600 });
    usuarioId = j.user && j.user.id; token = j.access_token; tokenAte = Date.now() + (j.expires_in - 120) * 1000;
}
async function acesso() {
    if (token && Date.now() < tokenAte) return token;
    if (!fs.existsSync(SESSAO)) throw new Error('Robô sem login. Rode de novo o instalador.');
    await entrar({ refresh_token: JSON.parse(fs.readFileSync(SESSAO, 'utf8')).refresh_token }, 'refresh_token');
    return token;
}
async function db(caminho, opcoes = {}, tentativa = 1) {
    // depois de uma etapa longa (render, Claude) a conexão guardada pode ter caído: tenta de novo
    try { return await db1(caminho, opcoes); }
    catch (e) { if (tentativa >= 3 || !/fetch failed|ECONNRESET|socket|other side closed/i.test(e.message + ' ' + (e.cause && e.cause.message))) throw e;
        await new Promise(r => setTimeout(r, 1000 * tentativa)); return db(caminho, opcoes, tentativa + 1); }
}
async function db1(caminho, { metodo = 'GET', corpo } = {}) {
    const r = await fetch(SUPA + '/rest/v1/' + caminho, {
        method: metodo,
        headers: { apikey: ANON, Authorization: 'Bearer ' + await acesso(), 'Content-Type': 'application/json', Prefer: 'return=representation' },
        body: corpo ? JSON.stringify(corpo) : undefined });
    const tx = await r.text();
    if (!r.ok) throw new Error('Supabase ' + r.status + ': ' + tx.slice(0, 300));
    return tx ? JSON.parse(tx) : null;
}
const q = encodeURIComponent;
async function mudar(p, patch) {
    Object.assign(p, patch);
    await db('edicao_pedidos?id=eq.' + p.id, { metodo: 'PATCH', corpo: Object.assign({ updated_at: new Date().toISOString() }, patch) });
    log('#' + p.numero, p.pasta_nome, '→', patch.status || '', patch.status_msg || '');
}

/* ── Drive pelo rclone (remote "drive") ── */
function rclone(args, { silencioso } = {}) {
    const r = spawnSync(RCLONE, args, { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.error) throw new Error('rclone não encontrado (' + r.error.message + ')');
    if (r.status !== 0) { if (silencioso) return null; throw new Error('rclone ' + args[0] + ': ' + (r.stderr || '').trim().split('\n').pop()); }
    return r.stdout;
}
const naPasta = id => ['--drive-root-folder-id', id];
const linkPasta = id => 'https://drive.google.com/drive/folders/' + id;
const linkArquivo = id => 'https://drive.google.com/file/d/' + id + '/view';
function idDaPasta(link) { const m = String(link || '').match(/\/folders\/([\w-]+)|[?&]id=([\w-]+)/); return m ? (m[1] || m[2]) : null; }
function listar(pastaId) { return JSON.parse(rclone(['lsjson', 'drive:', '-R', '--files-only', ...naPasta(pastaId)]) || '[]'); }
function criarPasta(nome) {
    rclone(['mkdir', 'drive:' + PASTA_RAIZ + '/' + nome]);
    const dirs = JSON.parse(rclone(['lsjson', 'drive:' + PASTA_RAIZ, '--dirs-only']) || '[]');
    const d = dirs.find(x => x.Name === nome);
    if (!d || !d.ID) throw new Error('Criei a pasta mas não achei o ID dela no Drive');
    return d.ID;
}
function subir(pastaId, local, nomeNoDrive) {
    rclone(['copyto', local, 'drive:' + nomeNoDrive, ...naPasta(pastaId)]);
    const f = listar(pastaId).find(x => x.Path === nomeNoDrive);
    return f && f.ID ? linkArquivo(f.ID) : linkPasta(pastaId);
}

/* ── Etapas ── */
const tamanhos = new Map();   // pedido -> "arquivo:tamanho" da última olhada (upload só conta quando para de crescer)

async function prepararPasta(p) {
    let id = p.drive_pasta_id || idDaPasta(p.drive_pasta_link);
    if (!id) id = criarPasta(p.pasta_nome);
    if (p.tipo === 'cenas') {
        await mudar(p, { drive_pasta_id: id, drive_pasta_link: p.drive_pasta_link || linkPasta(id) });
        return criarCenas(p);
    }
    await mudar(p, { drive_pasta_id: id, drive_pasta_link: p.drive_pasta_link || linkPasta(id), status: 'aguardando_bruto',
        status_msg: 'Pasta pronta no Drive. Jogue o bruto lá dentro.' });
}

async function olharBruto(p) {
    const arquivos = listar(p.drive_pasta_id).filter(f => MIDIA.test(f.Path) && !DO_ROBO.test(path.basename(f.Path)));
    if (!arquivos.some(f => VIDEO.test(f.Path))) { tamanhos.delete(p.id); return; }
    const assinatura = arquivos.map(f => f.Path + ':' + f.Size).sort().join('|');
    if (tamanhos.get(p.id) !== assinatura) { tamanhos.set(p.id, assinatura); log('#' + p.numero, 'bruto apareceu, conferindo se terminou de subir…'); return; }
    tamanhos.delete(p.id);
    await editar(p, arquivos);
}

function slug(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase(); }

/* Banco de sons (~/Desktop/sons): atualiza o catalogo.json antes de editar, só analisando o que mudou */
const SONS = process.env.ROBO_SONS || path.join(os.homedir(), 'Desktop', 'sons');
function atualizarBancoDeSons() {
    if (!fs.existsSync(SONS)) return;
    const py = fs.existsSync(path.join(VENV_BIN, 'python')) ? path.join(VENV_BIN, 'python') : 'python3';
    const r = spawnSync(py, ['-I', path.join(DIR, 'catalogar_sons.py'), SONS], { encoding: 'utf8', timeout: 20 * 60000 });
    log(r.status === 0 ? 'banco de sons: ' + (r.stdout || '').trim().split('\n')[0] : 'banco de sons não atualizado: ' + (r.stderr || '').trim().split('\n').pop());
}

async function editar(p, arquivos) {
    const job = path.join(TRABALHOS, p.numero + '-' + slug(p.pasta_nome));
    const entrada = path.join(job, 'entrada'), saida = path.join(job, 'saida');
    fs.mkdirSync(entrada, { recursive: true }); fs.rmSync(saida, { recursive: true, force: true }); fs.mkdirSync(saida, { recursive: true });

    await mudar(p, { status: 'baixando', status_msg: 'Baixando ' + arquivos.length + ' arquivo(s) do Drive' });
    // sync (não copy): o que a Lara apagou da pasta também some daqui, para o Claude não usar arquivo velho
    rclone(['sync', 'drive:', entrada, ...naPasta(p.drive_pasta_id), '--exclude', '{PREVIA,PRÉVIA,FINAL,REC,LOCUCAO}*', '--max-depth', '3']);

    const [refs, regras, dic] = await Promise.all([
        db('edicao_referencias?pedido_id=eq.' + p.id + '&select=tipo,link,nota,analise&order=created_at'),
        db('edicao_regras?status=eq.aprovada&select=texto,motivo,categoria,cliente&order=categoria'),
        db('edicao_dicionario?select=cliente,errado,certo'),
    ]);
    const daMarca = c => !c || String(c).trim().toLowerCase() === String(p.marca || '').trim().toLowerCase();
    fs.writeFileSync(path.join(job, 'pedido.json'), JSON.stringify({ pedido: p, referencias: refs, regras: regras.filter(r => daMarca(r.cliente)), dicionario: dic.filter(d => daMarca(d.cliente)) }, null, 2));
    fs.writeFileSync(path.join(job, 'PEDIDO.md'), pedidoMd(p, refs, regras.filter(r => daMarca(r.cliente)), dic.filter(d => daMarca(d.cliente)), arquivos));
    fs.copyFileSync(path.join(DIR, 'INSTRUCOES_EDICAO.md'), path.join(job, 'CLAUDE.md'));
    atualizarBancoDeSons();

    await mudar(p, { status: 'editando', status_msg: 'Claude editando (pode levar uns 20 a 40 min)' });
    const ok = await rodarClaude(job, p);
    const previa = path.join(saida, 'previa.mp4');
    if (!fs.existsSync(previa)) throw new Error(ok ? 'O Claude terminou sem gerar a prévia. Veja ' + path.join(job, 'claude.log') : 'A edição passou de ' + LIMITE_EDICAO_MIN + ' min ou deu erro. Veja ' + path.join(job, 'claude.log'));

    await entregar(p, job, ['transcricao', 'tomadas', 'cortes', 'legendas', 'zoom', 'som', 'render']);
}

async function entregar(p, job, etapas) {
    const saida = path.join(job, 'saida'), previa = path.join(saida, 'previa.mp4');
    await mudar(p, { status: 'renderizando', status_msg: 'Subindo a prévia para o Drive' });
    const versao = 1 + fs.readdirSync(job).filter(n => /^previa_v\d+\.mp4$/.test(n)).length;
    fs.copyFileSync(previa, path.join(job, 'previa_v' + versao + '.mp4'));
    const link = subir(p.drive_pasta_id, previa, 'PREVIA v' + versao + ' - ' + p.pasta_nome + '.mp4');
    for (const n of fs.readdirSync(saida).filter(n => /^rec.*\.mp4$/i.test(n)))
        subir(p.drive_pasta_id, path.join(saida, n), 'REC - ' + n);

    let previa_path = p.previa_path || null;
    try {
        const leve = path.join(job, 'previa_leve.mp4');
        ffmpeg(['-i', previa, '-vf', "scale='if(gt(iw,ih),-2,720)':'if(gt(iw,ih),720,-2)'", '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '28', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', leve]);
        const caminho = 'pedidos/' + p.id + '/previa_v' + versao + '.mp4';
        const r = await fetch(SUPA + '/storage/v1/object/edicao/' + caminho, { method: 'POST', body: fs.readFileSync(leve),
            headers: { apikey: ANON, Authorization: 'Bearer ' + await acesso(), 'Content-Type': 'video/mp4', 'x-upsert': 'true' } });
        if (r.ok) previa_path = caminho; else log('prévia leve não subiu:', r.status, (await r.text()).slice(0, 200));
    } catch (e) { log('prévia leve não subiu:', e.message); }
    let projeto = null, resumo = '';
    try { projeto = JSON.parse(fs.readFileSync(path.join(saida, 'projeto.json'), 'utf8')); } catch (_) {}
    try { resumo = fs.readFileSync(path.join(saida, 'resumo.md'), 'utf8').trim(); } catch (_) {}
    if (projeto) projeto.etapas = { feitas: etapas };
    await proporRegras(p, job);
    await mudar(p, { status: 'previa_pronta', previa_link: link, projeto, previa_path, ajustes: null,
        status_msg: (resumo.split('\n').find(l => l.trim()) || 'Prévia v' + versao + ' no Drive').replace(/^#+\s*/, '').slice(0, 280) });
}

/* ── Locução + cenas: Claude escreve locução e prompts, o robô grava a voz, a Lara gera as cenas, o robô monta ── */
const VENV_BIN = path.join(DIR, 'venv', 'bin');
const AUDIO = /\.(m4a|mp3|wav|ogg|opus|aac|caf|amr|flac)$/i;
const ARQ_CENA = /^(?:cena|block|scene)[\s_-]*0*(\d+)\.(mp4|mov|m4v|webm)$/i;
const TAMANHO = { '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080], '16:9': [1920, 1080] };
const pasta2 = n => String(n).padStart(2, '0');
const jobDe = p => path.join(TRABALHOS, p.numero + '-' + slug(p.pasta_nome));
function duracao(arq) {
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq], { encoding: 'utf8' });
    return parseFloat(r.stdout) || 0;
}
function ffmpeg(args) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) throw new Error('ffmpeg: ' + (r.stderr || '').trim().split('\n').pop());
}

async function criarCenas(p) {
    const job = jobDe(p), saida = path.join(job, 'saida'), voz = path.join(job, 'voz');
    fs.rmSync(saida, { recursive: true, force: true }); fs.mkdirSync(saida, { recursive: true }); fs.mkdirSync(voz, { recursive: true });
    const [refs, regras] = await Promise.all([
        db('edicao_referencias?pedido_id=eq.' + p.id + '&select=tipo,link,nota&order=created_at'),
        db('edicao_regras?status=eq.aprovada&select=texto,motivo,categoria,cliente&order=categoria'),
    ]);
    const daMarca = c => !c || String(c).trim().toLowerCase() === String(p.marca || '').trim().toLowerCase();
    fs.writeFileSync(path.join(job, 'PEDIDO.md'), pedidoMd(p, refs, regras.filter(r => daMarca(r.cliente)), [], []));
    fs.copyFileSync(path.join(DIR, 'INSTRUCOES_CENAS.md'), path.join(job, 'CLAUDE.md'));

    await mudar(p, { status: 'editando', status_msg: 'Escrevendo a locução e os prompts das cenas' });
    const ok = await rodarClaude(job, p, 'Leia CLAUDE.md e PEDIDO.md e prepare este pedido de locução + cenas sozinho, sem perguntar nada. ' +
        'No fim precisa existir saida/cenas.json no formato do CLAUDE.md.');
    let c; try { c = JSON.parse(fs.readFileSync(path.join(saida, 'cenas.json'), 'utf8')); } catch (_) {}
    if (!c || !Array.isArray(c.cenas) || !c.cenas.length) throw new Error(ok ? 'O Claude terminou sem gerar saida/cenas.json' : 'O Claude parou ou passou do tempo. Veja ' + path.join(job, 'claude.log'));

    const propria = !p.voz || p.voz === 'minha';
    c.voz_propria = propria;
    if (!propria) await mudar(p, { status_msg: 'Gravando a narração (' + c.cenas.length + ' cenas)' });
    const edgeTts = fs.existsSync(path.join(VENV_BIN, 'edge-tts')) ? path.join(VENV_BIN, 'edge-tts') : 'edge-tts';
    for (const x of c.cenas) {
        x.arquivo = 'cena' + pasta2(x.n) + '.mp4';
        if (propria) continue;
        const mp3 = path.join(voz, 'cena' + pasta2(x.n) + '.mp3');
        const r = spawnSync(edgeTts, ['--voice', p.voz || 'pt-BR-FranciscaNeural', '--text', x.texto, '--write-media', mp3], { encoding: 'utf8' });
        if (r.status !== 0 || !fs.existsSync(mp3)) throw new Error('Não consegui gerar a voz da cena ' + x.n + ': ' + ((r.stderr || r.error && r.error.message || '').trim().split('\n').pop()));
        x.voz_s = Math.round(duracao(mp3) * 100) / 100;
        subir(p.drive_pasta_id, mp3, 'LOCUCAO - cena' + pasta2(x.n) + '.mp3');
    }
    const longas = c.cenas.filter(x => x.voz_s > 12).map(x => x.n);
    c.recebidas = [];
    c.instrucoes = c.instrucoes || 'Gere a imagem-chave uma vez. Depois gere cada cena de 10 s no Dreamina (Seedance) anexando a imagem-chave e salve na pasta do pedido como cena01.mp4, cena02.mp4…';
    await db('edicao_pedidos?id=eq.' + p.id, { metodo: 'PATCH', corpo: { cenas: c, updated_at: new Date().toISOString() } });
    p.cenas = c;
    await mudar(p, { status: 'aguardando_cenas', status_msg: (propria ? 'Texto e prompts prontos. Grave o texto, gere as ' + c.cenas.length + ' cenas e jogue o áudio e as cenas na pasta' : 'Prompts prontos. Gere as ' + c.cenas.length + ' cenas e jogue na pasta como cena01.mp4…') +
        (longas.length ? ' (atenção: a fala da cena ' + longas.join(', ') + ' passou de 12 s)' : '') });
}

async function olharCenas(p) {
    const c = p.cenas || {}; const total = (c.cenas || []).length; if (!total || !p.drive_pasta_id) return;
    const todos = listar(p.drive_pasta_id);
    const arqs = todos.filter(f => ARQ_CENA.test(path.basename(f.Path)));
    // a locução da Lara pode vir como áudio (gravador, WhatsApp) ou como vídeo gravado (um bruto qualquer que não seja cenaNN)
    const recente = l => l.sort((a, b) => String(b.ModTime).localeCompare(String(a.ModTime)))[0];
    const livre = f => !/^LOCUCAO/i.test(path.basename(f.Path)) && !DO_ROBO.test(path.basename(f.Path)) && !ARQ_CENA.test(path.basename(f.Path));
    const audio = c.voz_propria ? (recente(todos.filter(f => AUDIO.test(f.Path) && livre(f))) || recente(todos.filter(f => VIDEO.test(f.Path) && livre(f)))) : null;
    const porN = new Map(); arqs.forEach(f => porN.set(Number(path.basename(f.Path).match(ARQ_CENA)[1]), f));
    const recebidas = [...porN.keys()].filter(n => n >= 1 && n <= total).sort((a, b) => a - b);
    const audioNome = audio ? path.basename(audio.Path) : null;
    if (JSON.stringify(recebidas) !== JSON.stringify(c.recebidas || []) || audioNome !== (c.audio || null)) {
        c.recebidas = recebidas; c.audio = audioNome;
        await db('edicao_pedidos?id=eq.' + p.id, { metodo: 'PATCH', corpo: { cenas: c, updated_at: new Date().toISOString(),
            status_msg: recebidas.length + ' de ' + total + ' cenas na pasta' + (c.voz_propria ? (audioNome ? ' · áudio recebido' : ' · falta o seu áudio') : '') } });
    }
    if (recebidas.length < total || (c.voz_propria && !audio)) { tamanhos.delete(p.id); return; }
    const assinatura = recebidas.map(n => porN.get(n).Path + ':' + porN.get(n).Size).join('|') + (audio ? '|' + audio.Path + ':' + audio.Size : '');
    if (tamanhos.get(p.id) !== assinatura) { tamanhos.set(p.id, assinatura); log('#' + p.numero, 'todas as cenas chegaram, conferindo se terminaram de subir…'); return; }
    tamanhos.delete(p.id);
    await montarCenas(p, recebidas.map(n => porN.get(n)), audio);
}

/* Acha na fala da Lara onde começa cada cena: transcreve com tempo por palavra e casa com o texto de cada cena */
const norm = w => String(w).normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
function fatiarFala(palavras, cenas) {
    const M = palavras.length; if (!M) throw new Error('Não ouvi fala nenhuma no seu áudio');
    const qtd = cenas.map(x => String(x.texto || '').split(/\s+/).filter(Boolean).length || 1);
    const N = qtd.reduce((a, b) => a + b, 0);
    const cortes = [];   // índice da primeira palavra de cada cena (a partir da 2ª)
    let acum = 0;
    for (let k = 0; k < cenas.length - 1; k++) {
        acum += qtd[k];
        let i = Math.min(M - 1, Math.max(1, Math.round(acum / N * M)));
        const primeira = norm(String(cenas[k + 1].texto || '').split(/\s+/)[0] || '');
        let melhor = -1;
        for (let d = 0; d <= 8 && melhor < 0; d++)
            for (const j of [i - d, i + d]) if (j > (cortes[k - 1] || 0) && j < M && norm(palavras[j].w) === primeira) { melhor = j; break; }
        cortes.push(melhor >= 0 ? melhor : Math.max(i, (cortes[k - 1] || 0) + 1));
    }
    const ini = [0, ...cortes], fim = [...cortes.map(c => c - 1), M - 1];
    return cenas.map((_, k) => {
        const a = palavras[ini[k]], b = palavras[Math.max(ini[k], fim[k])];
        const antes = ini[k] > 0 ? palavras[ini[k] - 1].e : Math.max(0, a.s - 0.15);
        const depois = fim[k] < M - 1 ? palavras[fim[k] + 1].s : b.e + 0.3;
        return { s: Math.max(antes, a.s - 0.12), e: Math.min(depois, b.e + 0.15), texto: palavras.slice(ini[k], fim[k] + 1).map(x => x.w).join(' ') };
    });
}

function legendaAss(palavras, modelo, W, H, saida, marca) {
    const pj = saida.replace(/\.ass$/, '.palavras.json');
    fs.writeFileSync(pj, JSON.stringify(palavras));
    const r = spawnSync('python3', ['-I', path.join(DIR, 'legendas_ass.py'), pj, path.join(DIR, 'legendas.json'), modelo, String(W), String(H), saida, marca || ''], { encoding: 'utf8' });
    if (r.status !== 0) { log('legenda não gerada:', (r.stderr || '').trim().split('\n').pop()); return false; }
    return true;
}
function srt(palavras) {
    const t = x => { const ms = Math.round(x * 1000); return new Date(ms).toISOString().slice(11, 19) + ',' + String(ms % 1000).padStart(3, '0'); };
    const blocos = []; for (let i = 0; i < palavras.length; i += 6) blocos.push(palavras.slice(i, i + 6));
    return blocos.map((b, i) => (i + 1) + '\n' + t(b[0].s) + ' --> ' + t(b[b.length - 1].e) + '\n' + b.map(w => w.w).join(' ') + '\n').join('\n');
}

async function montarCenas(p, arqs, audio) {
    const job = jobDe(p), cenasDir = path.join(job, 'cenas'), work = path.join(job, 'work'), saida = path.join(job, 'saida');
    for (const d of [cenasDir, work, saida]) fs.mkdirSync(d, { recursive: true });
    await mudar(p, { status: 'baixando', status_msg: 'Baixando as ' + arqs.length + ' cenas do Drive' });
    for (const f of arqs) rclone(['copyto', 'drive:' + f.Path, path.join(cenasDir, path.basename(f.Path)), ...naPasta(p.drive_pasta_id)]);

    const cenas = (p.cenas && p.cenas.cenas) || [];
    const vozDir = path.join(job, 'voz'); fs.mkdirSync(vozDir, { recursive: true });
    let fatias = null;
    if (audio) {
        await mudar(p, { status: 'editando', status_msg: 'Ouvindo o seu áudio para achar o começo de cada cena' });
        const orig = path.join(vozDir, 'minha' + path.extname(audio.Path).toLowerCase());
        rclone(['copyto', 'drive:' + audio.Path, orig, ...naPasta(p.drive_pasta_id)]);
        const wav = path.join(vozDir, 'minha.wav');
        ffmpeg(['-i', orig, '-vn', '-ac', '1', '-ar', '48000', '-af', 'highpass=f=80', wav]);
        const py = fs.existsSync(path.join(VENV_BIN, 'python')) ? path.join(VENV_BIN, 'python') : 'python3';
        const pj = path.join(vozDir, 'palavras.json');
        const r = spawnSync(process.env.ROBO_TRANSCREVER || py, [path.join(DIR, 'transcrever.py'), wav, pj], { encoding: 'utf8' });
        if (r.status !== 0 || !fs.existsSync(pj)) throw new Error('Não consegui transcrever o seu áudio: ' + ((r.stderr || '').trim().split('\n').pop() || 'erro'));
        fatias = fatiarFala(JSON.parse(fs.readFileSync(pj, 'utf8')), cenas.slice(0, arqs.length));
        fatias.forEach((f, i) => ffmpeg(['-i', wav, '-ss', f.s.toFixed(3), '-to', f.e.toFixed(3), '-af', 'afade=t=in:d=0.03,areverse,afade=t=in:d=0.03,areverse',
            path.join(vozDir, 'cena' + pasta2(i + 1) + '.wav')]));
    }
    await mudar(p, { status: 'editando', status_msg: 'Montando cenas + locução' });
    const [W, H] = TAMANHO[p.formato] || TAMANHO['9:16'];
    const lista = [], camadas = [];
    let t0 = 0;
    const palavrasFinais = [];
    const palavrasLara = fatias ? JSON.parse(fs.readFileSync(path.join(vozDir, 'palavras.json'), 'utf8')) : [];
    arqs.forEach((f, i) => {
        const n = i + 1, clip = path.join(cenasDir, path.basename(f.Path));
        const mp3 = path.join(vozDir, 'cena' + pasta2(n) + (fatias ? '.wav' : '.mp3'));
        if (!fs.existsSync(mp3)) throw new Error('Falta a locução da cena ' + n + ' (' + mp3 + ')');
        const vd = duracao(mp3);
        // voz gerada: blocos de 10 s; voz da Lara: a cena dura o tempo da fala dela
        const dur = fatias ? Math.max(1.5, vd + 0.35) : 10;
        const tempo = !fatias && vd > 9.7 ? Math.min(vd / 9.7, 1.25) : 1;
        const atraso = fatias ? 150 : 250;
        const af = (tempo > 1 ? 'atempo=' + tempo.toFixed(3) + ',' : '') + 'adelay=' + atraso + '|' + atraso + ',apad';
        const temAudio = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', clip], { encoding: 'utf8' }).stdout.trim();
        const v = '[0:v]scale=' + W + ':' + H + ':force_original_aspect_ratio=increase,crop=' + W + ':' + H + ',fps=30,setsar=1,tpad=stop_mode=clone:stop_duration=' + Math.ceil(dur) + '[v]';
        const a = temAudio ? '[0:a]volume=0.22[amb];[1:a]' + af + '[vo];[amb][vo]amix=inputs=2:duration=longest:normalize=0[a]' : '[1:a]' + af + '[a]';
        const seg = path.join(work, 'seg' + pasta2(n) + '.mp4');
        ffmpeg(['-i', clip, '-i', mp3, '-filter_complex', v + ';' + a, '-map', '[v]', '-map', '[a]', '-t', dur.toFixed(3),
            '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-ac', '2', seg]);
        lista.push("file '" + seg.replace(/'/g, "'\\''") + "'");
        camadas.push({ tipo: 'corte', inicio_s: t0, fim_s: t0 + dur, origem: path.basename(f.Path) });
        camadas.push({ tipo: 'voz', inicio_s: t0 + atraso / 1000, fim_s: t0 + Math.min(atraso / 1000 + vd / tempo, dur) });
        if (fatias) palavrasLara.filter(w => w.s >= fatias[i].s - 0.01 && w.e <= fatias[i].e + 0.01)
            .forEach(w => palavrasFinais.push({ w: w.w, s: +(t0 + atraso / 1000 + w.s - fatias[i].s).toFixed(3), e: +(t0 + atraso / 1000 + w.e - fatias[i].s).toFixed(3) }));
        const txt = fatias ? fatias[i].texto : cenas[i] && cenas[i].texto;
        if (txt) camadas.push({ tipo: 'legenda', inicio_s: t0 + atraso / 1000, fim_s: t0 + dur - 0.1, texto: txt });
        t0 += dur;
    });
    fs.writeFileSync(path.join(work, 'lista.txt'), lista.join('\n') + '\n');
    const junto = path.join(work, 'junto.mp4');
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', path.join(work, 'lista.txt'), '-c', 'copy', junto]);
    // legenda do modelo escolhido (só quando temos o tempo de cada palavra, ou seja, com a voz da Lara)
    const ass = path.join(work, 'legenda.ass');
    const comLegenda = p.legenda_modelo && palavrasFinais.length && legendaAss(palavrasFinais, p.legenda_modelo, W, H, ass, p.marca);
    ffmpeg(['-i', junto, ...(comLegenda ? ['-vf', 'ass=' + ass + ':fontsdir=' + path.join(DIR, 'fontes'), '-c:v', 'libx264', '-preset', 'veryfast', '-crf', '20', '-pix_fmt', 'yuv420p'] : ['-c:v', 'copy']),
        '-af', 'loudnorm=I=-14:TP=-1:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', path.join(saida, 'previa.mp4')]);
    if (palavrasFinais.length) fs.writeFileSync(path.join(saida, 'legendas.srt'), srt(palavrasFinais));
    fs.writeFileSync(path.join(saida, 'projeto.json'), JSON.stringify({ duracao_s: Math.round(t0 * 100) / 100, formato: p.formato, camadas }));
    fs.writeFileSync(path.join(saida, 'resumo.md'), 'Vídeo montado: ' + arqs.length + ' cenas + ' + (fatias ? 'a sua locução' : 'locução gerada (' + p.voz + ')') + ', ' + Math.round(t0) + ' s.\n');
    await entregar(p, job, ['roteiro', 'estilo', 'prompts', 'locucao', 'cenas', 'montagem']);
}

/* V2: a Lara ajustou na linha do tempo do admin (tirar, trocar texto, comentários no segundo exato) */
function ajustesMd(p) {
    const cam = (p.projeto && p.projeto.camadas) || [];
    const L = ['# Ajustes da Lara para a próxima versão', '',
        'Aplique SÓ estes ajustes em cima da versão anterior (saida/projeto.json e a pasta work/), reaproveitando o que já foi feito.',
        'Tempos são da versão anterior. Depois de aplicar, gere de novo saida/previa.mp4, saida/projeto.json e saida/resumo.md.', ''];
    (p.ajustes || []).forEach((a, k) => {
        const c = a.camada || cam[a.i] || {};
        const onde = (x => Math.floor(x / 60) + ':' + String(Math.round(x % 60)).padStart(2, '0'));
        if (a.tipo === 'remover') L.push((k + 1) + '. TIRAR ' + c.tipo + ' de ' + onde(c.inicio_s) + ' a ' + onde(c.fim_s) + (c.texto ? ' ("' + c.texto + '")' : '') + (c.tipo === 'corte' ? ' (tire este trecho do vídeo e emende sem engolir sílaba)' : ''));
        else if (a.tipo === 'texto') L.push((k + 1) + '. TROCAR o texto do ' + c.tipo + ' em ' + onde(c.inicio_s) + ': "' + a.de + '" vira "' + a.para + '"');
        else L.push((k + 1) + '. COMENTÁRIO em ' + onde(a.tempo_s) + ' [' + a.categoria + ']: ' + a.texto);
    });
    L.push('', '## Aprender com os ajustes',
        'Escreva também `saida/regras_propostas.json`: uma lista de regras GERAIS do estilo da Lara que esses ajustes revelam',
        '(o que vale para os próximos vídeos, não a correção pontual). Formato: [{"texto": "...", "motivo": "...", "categoria": "corte|zoom|som|musica|legenda|animacao|cor|ritmo|outro", "so_desta_marca": false}].',
        'Se um ajuste for só um erro deste vídeo (nome errado, palavra trocada), não vire regra. Lista vazia é melhor que regra inventada.');
    return L.join('\n') + '\n';
}

async function aplicarAjustes(p) {
    const job = jobDe(p);
    if (!fs.existsSync(job)) throw new Error('Não achei a pasta da versão anterior neste Mac (' + job + ')');
    fs.writeFileSync(path.join(job, 'AJUSTES.md'), ajustesMd(p));
    fs.appendFileSync(path.join(job, 'ajustes_historico.json'), JSON.stringify({ quando: new Date().toISOString(), ajustes: p.ajustes }) + '\n');
    // a V2 é sempre uma edição em cima do que já existe (também no modo cenas), então valem as instruções de edição
    fs.copyFileSync(path.join(DIR, 'INSTRUCOES_EDICAO.md'), path.join(job, 'CLAUDE.md'));
    atualizarBancoDeSons();
    await mudar(p, { status: 'editando', status_msg: 'Aplicando ' + (p.ajustes || []).length + ' ajuste(s) da Lara' });
    const previa = path.join(job, 'saida', 'previa.mp4');
    fs.rmSync(previa, { force: true });
    const ok = await rodarClaude(job, p, 'Leia CLAUDE.md, PEDIDO.md e AJUSTES.md. Aplique só os ajustes da Lara na versão anterior, sem refazer o resto, ' +
        'e gere de novo saida/previa.mp4, saida/projeto.json, saida/resumo.md e saida/regras_propostas.json. Não pergunte nada.');
    if (!fs.existsSync(previa)) throw new Error(ok ? 'O Claude terminou sem gerar a nova prévia. Veja ' + path.join(job, 'claude.log') : 'A nova versão passou do tempo ou deu erro. Veja ' + path.join(job, 'claude.log'));
    await entregar(p, job, p.tipo === 'cenas' ? ['roteiro', 'estilo', 'prompts', 'locucao', 'cenas', 'montagem'] : ['transcricao', 'tomadas', 'cortes', 'legendas', 'zoom', 'som', 'render']);
}

/* O que a Lara corrigiu vira regra PROPOSTA em "Regras do estilo"; ela aprova ou descarta no admin */
async function proporRegras(p, job) {
    const arq = path.join(job, 'saida', 'regras_propostas.json');
    let regras; try { regras = JSON.parse(fs.readFileSync(arq, 'utf8')); } catch (_) { return; }
    fs.renameSync(arq, arq.replace(/\.json$/, '_' + Date.now() + '.json'));
    const CATS = ['corte', 'zoom', 'som', 'musica', 'legenda', 'animacao', 'cor', 'ritmo', 'outro'];
    const linhas = (Array.isArray(regras) ? regras : []).filter(r => r && String(r.texto || '').trim()).slice(0, 8).map(r => ({
        texto: String(r.texto).trim().slice(0, 400), motivo: ('Dos seus ajustes no pedido #' + p.numero + (r.motivo ? ': ' + r.motivo : '')).slice(0, 400),
        categoria: CATS.includes(r.categoria) ? r.categoria : 'outro', cliente: r.so_desta_marca ? (p.marca || null) : null, status: 'proposta' }));
    if (linhas.length) await db('edicao_regras', { metodo: 'POST', corpo: linhas }).then(() => log('#' + p.numero, linhas.length + ' regra(s) proposta(s) para a Lara aprovar')).catch(e => log('regras não salvas:', e.message));
}

function pedidoMd(p, refs, regras, dic, arquivos) {
    const L = [];
    L.push('# Pedido #' + p.numero + ': ' + p.pasta_nome, '');
    L.push('- Marca: ' + (p.marca || p.pasta_nome));
    L.push('- Formato: ' + p.formato + (p.duracao_alvo_s ? ' · duração desejada: ' + p.duracao_alvo_s + ' s' : ''));
    if (p.tipo === 'cenas') L.push('- Tipo: locução + cenas animadas · ' + Math.max(1, Math.round((p.duracao_alvo_s || 60) / 10)) + ' cenas de 10 s · visual: ' + (p.estilo_visual || 'marca') + ' · voz: ' + (p.voz || 'pt-BR-FranciscaNeural'));
    L.push('- Legenda: ' + (p.legenda_modelo ? 'modelo `' + p.legenda_modelo + '` (veja "Legenda" no CLAUDE.md)' : 'SEM legenda (a Lara escolheu não legendar)'));
    if (p.marca_site) L.push('- Site da marca: ' + p.marca_site);
    if (p.marca_redes) L.push('- Redes da marca: ' + p.marca_redes.split('\n').map(s => s.trim()).filter(Boolean).join(' · '));
    if (arquivos.length) L.push('', '## Arquivos (pasta entrada/)', ...arquivos.map(f => '- ' + f.Path + ' (' + (f.Size / 1048576).toFixed(1) + ' MB)'));
    L.push('', p.tipo === 'cenas' ? '## Texto da locução ou ideia' : '## Roteiro', p.roteiro || (p.tipo === 'cenas' ? '(sem texto: use as observações)' : '(sem roteiro: siga a fala do bruto)'));
    if (p.observacoes) L.push('', '## Observações da Lara', p.observacoes);
    if (p.rec_gravar) L.push('', '## Gravação de tela do site (pedida)', 'Site: ' + (p.marca_site || '(não informado)'), p.rec_passos || '(sem passo a passo: mostre a página principal e o que o roteiro cita)');
    L.push('', '## Referências');
    if (!refs.length) L.push('(nenhuma: siga as regras do estilo)');
    refs.forEach(r => L.push('- [' + r.tipo + '] ' + r.link + (r.nota ? ' · copiar: ' + r.nota : '')));
    L.push('', '## Regras do estilo aprovadas (obrigatórias)');
    regras.forEach(r => L.push('- [' + r.categoria + '] ' + r.texto + (r.cliente ? ' (só ' + r.cliente + ')' : '')));
    L.push('', '## Dicionário de correções (legenda)');
    dic.forEach(d => L.push('- "' + d.errado + '" → "' + d.certo + '"'));
    return L.join('\n') + '\n';
}

/* Mostra o que o Claude está fazendo: na janela do robô e no admin (status_msg, no máximo a cada 15 s) */
function passoDoEvento(ev) {
    if (ev.type !== 'assistant' || !ev.message || !Array.isArray(ev.message.content)) return [];
    return ev.message.content.map(c => {
        if (c.type === 'text') return (c.text || '').trim().split('\n').find(l => l.trim()) || '';
        if (c.type === 'tool_use') {
            const i = c.input || {};
            if (c.name === 'Bash') return '› ' + (i.description || String(i.command || '').split('\n')[0]);
            if (['Write', 'Edit'].includes(c.name)) return '› escrevendo ' + path.basename(i.file_path || '');
            if (c.name === 'Read') return '› lendo ' + path.basename(i.file_path || '');
            return '› ' + c.name;
        }
        return '';
    }).map(t => t.replace(/^#+\s*/, '').slice(0, 160)).filter(Boolean);
}

const MCP_VAZIO = path.join(DIR, 'mcp-vazio.json');
function rodarClaude(job, p, pedidoTexto) {
    fs.writeFileSync(MCP_VAZIO, '{"mcpServers":{}}');
    const prompt = (pedidoTexto || 'Leia CLAUDE.md e PEDIDO.md e faça a edição completa deste pedido sozinho, sem perguntar nada. ' +
        'No fim precisa existir saida/previa.mp4, saida/projeto.json e saida/resumo.md.') +
        ' Antes de cada etapa, escreva uma frase curta em português dizendo o que vai fazer (a Lara acompanha ao vivo).';
    return new Promise(resolve => {
        const logArq = path.join(job, 'claude.log');
        // Só as ferramentas básicas: nenhum MCP/conector da Lara (Gmail, Metricool, Higgsfield...) roda sem ela ver
        const c = spawn(CLAUDE, ['-p', prompt, '--permission-mode', 'bypassPermissions', '--output-format', 'stream-json', '--verbose',
            '--strict-mcp-config', '--mcp-config', MCP_VAZIO],
            { cwd: job, stdio: ['ignore', 'pipe', 'pipe'], env: Object.assign({}, process.env, { ENABLE_CLAUDEAI_MCP_SERVERS: 'false' }) });
        let resto = '', ultimoEnvio = 0, ultimaFrase = '';
        const enviar = frase => {
            ultimaFrase = frase;
            if (Date.now() - ultimoEnvio < 15000) return;
            ultimoEnvio = Date.now();
            db('edicao_pedidos?id=eq.' + p.id, { metodo: 'PATCH', corpo: { status_msg: frase.slice(0, 280), updated_at: new Date().toISOString() } }).catch(() => {});
        };
        c.stdout.on('data', buf => {
            fs.appendFileSync(logArq, buf);
            const linhas = (resto + buf.toString()).split('\n'); resto = linhas.pop();
            for (const l of linhas) {
                let ev; try { ev = JSON.parse(l); } catch (_) { continue; }
                for (const passo of passoDoEvento(ev)) { log('#' + p.numero, passo); if (!passo.startsWith('›')) enviar(passo); }
            }
        });
        c.stderr.on('data', buf => fs.appendFileSync(logArq, buf));
        // Etapas e linha do tempo parcial (saida/progresso.json + saida/projeto.json) vão para o painel Editor IA do admin
        let ultimoProjeto = '';
        const vigia = setInterval(() => {
            const ler = n => { try { return JSON.parse(fs.readFileSync(path.join(job, 'saida', n), 'utf8')); } catch (_) { return null; } };
            const prog = ler('progresso.json'), proj = ler('projeto.json');
            if (!prog && !proj) return;
            const novo = JSON.stringify(Object.assign({}, proj || {}, { etapas: prog || {} }));
            if (novo === ultimoProjeto) return;
            ultimoProjeto = novo;
            db('edicao_pedidos?id=eq.' + p.id, { metodo: 'PATCH', corpo: { projeto: JSON.parse(novo), updated_at: new Date().toISOString() } }).catch(() => {});
        }, 15000);
        c.on('exit', () => clearInterval(vigia));
        const t = setTimeout(() => { c.kill('SIGTERM'); resolve(false); }, LIMITE_EDICAO_MIN * 60000);
        c.on('error', e => { fs.appendFileSync(logArq, '\n[robô] ' + e.message + '\n'); clearTimeout(t); resolve(false); });
        c.on('exit', code => { clearTimeout(t); resolve(code === 0); });
    });
}

/* ── Fila ── */
async function rodada() {
    const pedidos = await db('edicao_pedidos?status=in.(na_fila,aguardando_bruto,aguardando_cenas,ajustes_na_fila)&select=*&order=created_at');
    for (const p of pedidos) {
        try {
            if (p.status === 'na_fila') await prepararPasta(p);
            if (p.status === 'aguardando_bruto') await olharBruto(p);
            if (p.status === 'aguardando_cenas') await olharCenas(p);
            if (p.status === 'ajustes_na_fila') await aplicarAjustes(p);
        } catch (e) {
            log('#' + p.numero, 'ERRO', e.message);
            await mudar(p, { status: 'erro', status_msg: e.message.slice(0, 280) }).catch(() => {});
        }
    }
}

async function main() {
    fs.mkdirSync(TRABALHOS, { recursive: true });
    if (process.argv.includes('--login')) {
        await entrar({ email: process.env.ROBO_EMAIL, password: process.env.ROBO_SENHA }, 'password');
        const eu = await db('usuarios?select=role&id=eq.' + usuarioId);
        if (!eu.length || eu[0].role !== 'admin') throw new Error('Esse login não é admin do site.');
        return log('Login ok. O robô está ligado ao admin.');
    }
    log('Robô de edição ligado. Olhando a fila a cada ' + INTERVALO_S + ' s. Deixe esta janela aberta.');
    // Se o robô foi fechado no meio de uma edição, o pedido ficou preso em "editando": volta para recomeçar
    try {
        for (const p of await db('edicao_pedidos?status=in.(baixando,analisando,editando,renderizando)&select=*'))
            await mudar(p, { status: p.tipo !== 'cenas' ? 'aguardando_bruto' : (p.cenas ? 'aguardando_cenas' : 'na_fila'),
                status_msg: 'O robô foi reiniciado no meio da edição. Recomeçando.' });
    } catch (e) { log('Não consegui conferir pedidos interrompidos:', e.message); }
    do {
        try { await rodada(); } catch (e) { log('Não consegui olhar a fila:', e.message); }
        if (process.argv.includes('--uma-vez')) break;
        await new Promise(r => setTimeout(r, INTERVALO_S * 1000));
    } while (true);
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
