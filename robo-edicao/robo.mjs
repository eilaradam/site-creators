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
async function db(caminho, { metodo = 'GET', corpo } = {}) {
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

async function editar(p, arquivos) {
    const job = path.join(TRABALHOS, p.numero + '-' + slug(p.pasta_nome));
    const entrada = path.join(job, 'entrada'), saida = path.join(job, 'saida');
    fs.mkdirSync(entrada, { recursive: true }); fs.rmSync(saida, { recursive: true, force: true }); fs.mkdirSync(saida, { recursive: true });

    await mudar(p, { status: 'baixando', status_msg: 'Baixando ' + arquivos.length + ' arquivo(s) do Drive' });
    rclone(['copy', 'drive:', entrada, ...naPasta(p.drive_pasta_id), '--exclude', '{PREVIA,PRÉVIA,FINAL,REC}*', '--max-depth', '3']);

    const [refs, regras, dic] = await Promise.all([
        db('edicao_referencias?pedido_id=eq.' + p.id + '&select=tipo,link,nota,analise&order=created_at'),
        db('edicao_regras?status=eq.aprovada&select=texto,motivo,categoria,cliente&order=categoria'),
        db('edicao_dicionario?select=cliente,errado,certo'),
    ]);
    const daMarca = c => !c || String(c).trim().toLowerCase() === String(p.marca || '').trim().toLowerCase();
    fs.writeFileSync(path.join(job, 'pedido.json'), JSON.stringify({ pedido: p, referencias: refs, regras: regras.filter(r => daMarca(r.cliente)), dicionario: dic.filter(d => daMarca(d.cliente)) }, null, 2));
    fs.writeFileSync(path.join(job, 'PEDIDO.md'), pedidoMd(p, refs, regras.filter(r => daMarca(r.cliente)), dic.filter(d => daMarca(d.cliente)), arquivos));
    fs.copyFileSync(path.join(DIR, 'INSTRUCOES_EDICAO.md'), path.join(job, 'CLAUDE.md'));

    await mudar(p, { status: 'editando', status_msg: 'Claude editando (pode levar uns 20 a 40 min)' });
    const ok = await rodarClaude(job);
    const previa = path.join(saida, 'previa.mp4');
    if (!fs.existsSync(previa)) throw new Error(ok ? 'O Claude terminou sem gerar a prévia. Veja ' + path.join(job, 'claude.log') : 'A edição passou de ' + LIMITE_EDICAO_MIN + ' min ou deu erro. Veja ' + path.join(job, 'claude.log'));

    await mudar(p, { status: 'renderizando', status_msg: 'Subindo a prévia para o Drive' });
    const versao = 1 + fs.readdirSync(job).filter(n => /^previa_v\d+\.mp4$/.test(n)).length;
    fs.copyFileSync(previa, path.join(job, 'previa_v' + versao + '.mp4'));
    const link = subir(p.drive_pasta_id, previa, 'PREVIA v' + versao + ' - ' + p.pasta_nome + '.mp4');
    for (const n of fs.readdirSync(saida).filter(n => /^rec.*\.mp4$/i.test(n)))
        subir(p.drive_pasta_id, path.join(saida, n), 'REC - ' + n);

    let projeto = null, resumo = '';
    try { projeto = JSON.parse(fs.readFileSync(path.join(saida, 'projeto.json'), 'utf8')); } catch (_) {}
    try { resumo = fs.readFileSync(path.join(saida, 'resumo.md'), 'utf8').trim(); } catch (_) {}
    await mudar(p, { status: 'previa_pronta', previa_link: link, projeto,
        status_msg: (resumo.split('\n').find(l => l.trim()) || 'Prévia v' + versao + ' no Drive').replace(/^#+\s*/, '').slice(0, 280) });
}

function pedidoMd(p, refs, regras, dic, arquivos) {
    const L = [];
    L.push('# Pedido #' + p.numero + ': ' + p.pasta_nome, '');
    L.push('- Marca: ' + (p.marca || p.pasta_nome));
    L.push('- Formato: ' + p.formato + (p.duracao_alvo_s ? ' · duração desejada: ' + p.duracao_alvo_s + ' s' : ''));
    if (p.marca_site) L.push('- Site da marca: ' + p.marca_site);
    if (p.marca_redes) L.push('- Redes da marca: ' + p.marca_redes.split('\n').map(s => s.trim()).filter(Boolean).join(' · '));
    L.push('', '## Arquivos (pasta entrada/)', ...arquivos.map(f => '- ' + f.Path + ' (' + (f.Size / 1048576).toFixed(1) + ' MB)'));
    L.push('', '## Roteiro', p.roteiro || '(sem roteiro: siga a fala do bruto)');
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

function rodarClaude(job) {
    const prompt = 'Leia CLAUDE.md e PEDIDO.md e faça a edição completa deste pedido sozinho, sem perguntar nada. ' +
        'No fim precisa existir saida/previa.mp4, saida/projeto.json e saida/resumo.md.';
    return new Promise(resolve => {
        const out = fs.openSync(path.join(job, 'claude.log'), 'a');
        const c = spawn(CLAUDE, ['-p', prompt, '--permission-mode', 'bypassPermissions'], { cwd: job, stdio: ['ignore', out, out] });
        const t = setTimeout(() => { c.kill('SIGTERM'); resolve(false); }, LIMITE_EDICAO_MIN * 60000);
        c.on('error', e => { fs.appendFileSync(path.join(job, 'claude.log'), '\n[robô] ' + e.message + '\n'); clearTimeout(t); resolve(false); });
        c.on('exit', code => { clearTimeout(t); resolve(code === 0); });
    });
}

/* ── Fila ── */
async function rodada() {
    const pedidos = await db('edicao_pedidos?status=in.(na_fila,aguardando_bruto)&select=*&order=created_at');
    for (const p of pedidos) {
        try {
            if (p.status === 'na_fila') await prepararPasta(p);
            if (p.status === 'aguardando_bruto') await olharBruto(p);
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
    do {
        try { await rodada(); } catch (e) { log('Não consegui olhar a fila:', e.message); }
        if (process.argv.includes('--uma-vez')) break;
        await new Promise(r => setTimeout(r, INTERVALO_S * 1000));
    } while (true);
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
