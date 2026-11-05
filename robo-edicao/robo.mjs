#!/usr/bin/env node
/* Robô de edição da Lara (o Estagiário): roda só no Mac, sem admin, sem Supabase e sem Drive.
   Tudo acontece na pasta "Estagiário" da Mesa:

     1 - Pra editar   você joga aqui uma pasta com o bruto (e b-rolls, e um pedido.txt se quiser)
                      ou só o arquivo de vídeo solto
     2 - Editando     o robô move a pasta pra cá enquanto edita (tirar a pasta daqui cancela a edição)
     3 - Prontos      a pasta volta pra cá com "<nome> - com legenda vN.mp4" e "<nome> - sem legenda vN.mp4"
                      pra pedir ajuste: escreva um ajustes.txt (ou grave um áudio ajustes.m4a) dentro da pasta pronta
     Aprender         vídeos prontos seus pra ele estudar o estilo
     Regras do estilo.md, Dicionário de legendas.txt, O que estou fazendo.txt

   node robo.mjs            roda sem parar (olha as pastas a cada minuto)
   node robo.mjs --uma-vez  olha uma vez e sai
   node robo.mjs --epidemic guarda a chave do Epidemic Sound (MCP Server API key, conta Pro da Lara)
   node robo.mjs --servico  liga o robô escondido (liga sozinho quando o Mac liga) */
import { spawn, spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';

const DIR = process.env.ROBO_DIR || path.dirname(new URL(import.meta.url).pathname);
const TRABALHOS = path.join(DIR, 'trabalhos');
const CLAUDE = process.env.ROBO_CLAUDE || 'claude';
const ESTAG = process.env.ROBO_PASTA || path.join(os.homedir(), 'Desktop', 'Estagiário');
const P_EDITAR = path.join(ESTAG, '1 - Pra editar'), P_EDITANDO = path.join(ESTAG, '2 - Editando'), P_PRONTOS = path.join(ESTAG, '3 - Prontos');
const P_APRENDER = path.join(ESTAG, 'Aprender');
const ARQ_REGRAS = path.join(ESTAG, 'Regras do estilo.md'), ARQ_DIC = path.join(ESTAG, 'Dicionário de legendas.txt');
const ARQ_STATUS = path.join(ESTAG, 'O que estou fazendo.txt');
const ESTADO = '.estagiario.json';
const INTERVALO_S = Number(process.env.ROBO_INTERVALO_S || 60);
const LIMITE_EDICAO_MIN = Number(process.env.ROBO_LIMITE_MIN || 90);
const VIDEO = /\.(mov|mp4|m4v|mkv|avi|webm)$/i;
const MIDIA = /\.(mov|mp4|m4v|mkv|avi|webm|jpg|jpeg|png|heic|webp|mp3|wav|m4a|aac)$/i;
const AUDIO = /\.(m4a|mp3|wav|ogg|opus|aac|caf|amr|flac)$/i;
const DO_ROBO = / - (com legenda|sem legenda|opção B|locução cena)\b|^(O que eu fiz|PROMPTS DAS CENAS|ERRO|REC) /i;   // arquivos que o próprio robô entrega
const AJUSTE = /^ajustes?\b.*\.(txt|md|m4a|mp3|wav|aac|caf|ogg|opus|mp4|mov)$/i;
const PEDIDO_TXT = /^pedido\b.*\.(txt|md)$/i;

/* ── Registro: janela/log do serviço + "O que estou fazendo.txt" (as últimas 40 linhas) ── */
let ultimas = [];
const log = (...a) => {
    const l = new Date().toLocaleTimeString('pt-BR') + ' ' + a.join(' ');
    console.log(l);
    ultimas = [...ultimas, l.slice(0, 400)].slice(-40);
    try { fs.writeFileSync(ARQ_STATUS, 'O Estagiário, ao vivo (a linha mais nova fica embaixo)\n\n' + ultimas.join('\n') + '\n'); } catch (_) {}
};

/* ── Utilidades ── */
function slug(s) { return String(s).normalize('NFD').replace(/[̀-ͯ]/g, '').replace(/[^\w]+/g, '-').replace(/^-|-$/g, '').toLowerCase(); }
const pasta2 = n => String(n).padStart(2, '0');
const VENV_BIN = path.join(DIR, 'venv', 'bin');
const PY = () => fs.existsSync(path.join(VENV_BIN, 'python')) ? path.join(VENV_BIN, 'python') : 'python3';
const TAMANHO = { '9:16': [1080, 1920], '4:5': [1080, 1350], '1:1': [1080, 1080], '16:9': [1920, 1080] };
function duracao(arq) {
    const r = spawnSync('ffprobe', ['-v', 'error', '-show_entries', 'format=duration', '-of', 'csv=p=0', arq], { encoding: 'utf8' });
    return parseFloat(r.stdout) || 0;
}
function ffmpeg(args) {
    const r = spawnSync('ffmpeg', ['-v', 'error', '-y', ...args], { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024 });
    if (r.status !== 0) throw new Error('ffmpeg: ' + (r.stderr || '').trim().split('\n').pop());
}
const visivel = n => !n.startsWith('.') && n !== 'Icon\r';
function listarArquivos(pasta, base = pasta) {   // tudo dentro da pasta do pedido (até 3 níveis), com caminho relativo e tamanho
    const out = [];
    const andar = (d, nivel) => {
        for (const n of fs.readdirSync(d).filter(visivel)) {
            const c = path.join(d, n), st = fs.statSync(c);
            if (st.isDirectory()) { if (nivel < 3) andar(c, nivel + 1); }
            else out.push({ Path: path.relative(base, c), Size: st.size, mtime: st.mtimeMs });
        }
    };
    if (fs.existsSync(pasta)) andar(pasta, 0);
    return out;
}
function lerEstado(pasta) { try { return JSON.parse(fs.readFileSync(path.join(pasta, ESTADO), 'utf8')); } catch (_) { return null; } }
function gravarEstado(pasta, e) { fs.writeFileSync(path.join(pasta, ESTADO), JSON.stringify(e, null, 1)); }
function mover(de, paraDir) {
    fs.mkdirSync(paraDir, { recursive: true });
    let destino = path.join(paraDir, path.basename(de)), k = 2;
    while (fs.existsSync(destino)) destino = path.join(paraDir, path.basename(de) + ' (' + k++ + ')');
    fs.renameSync(de, destino);
    return destino;
}
function proximoNumero() {
    const arq = path.join(DIR, 'contador.txt');
    let n = 0; try { n = Number(fs.readFileSync(arq, 'utf8')) || 0; } catch (_) {}
    if (!n) n = fs.existsSync(TRABALHOS) ? fs.readdirSync(TRABALHOS).map(x => parseInt(x, 10)).filter(Boolean).reduce((a, b) => Math.max(a, b), 0) : 0;
    fs.writeFileSync(arq, String(n + 1));
    return n + 1;
}

/* ── Pastas da Mesa: cria na primeira vez, com o "Como usar" ── */
const COMO_USAR = `COMO USAR O ESTAGIÁRIO (tudo aqui no Mac, nada no admin)

1. Joga em "1 - Pra editar" uma PASTA com o nome do conteúdo (ex.: "Reforma100 01") com o bruto dentro.
   B-rolls, gravações de tela e imagens vão na mesma pasta. Pode jogar só o vídeo solto também.
2. Quando o arquivo termina de copiar, eu movo a pasta pra "2 - Editando" e começo.
   Pra cancelar, é só tirar a pasta de "2 - Editando".
3. Quando acabo, a pasta vai pra "3 - Prontos" com:
   "<nome> - com legenda v1.mp4", "<nome> - sem legenda v1.mp4" e "O que eu fiz v1.txt".
4. Ajuste: dentro da pasta pronta, escreva um "ajustes.txt" (ou grave um áudio "ajustes.m4a")
   dizendo o que mudar. Eu faço a v2 na mesma pasta. Linha que começa com "sempre:" vira regra pra todos os vídeos.
5. Deu erro? A pasta volta pra "1 - Pra editar" com um ERRO.txt explicando. Apague o ERRO.txt que eu tento de novo.

PEDIDO.TXT (opcional, dentro da pasta do conteúdo). Uma coisa por linha, tudo opcional:
   marca: Reforma100
   legenda: lara            (ou "sem" pra não legendar, ou o nome de outro modelo)
   formato: 9:16            (4:5, 1:1, 16:9)
   audio: fala              (narrado, musica, misto)
   duas opções: sim
   titulos: caixa-pop, sublinhado
   site: https://reforma100.com.br
   referencia: https://www.instagram.com/reel/...
   duração: 45
   Qualquer outra linha vira observação que eu sou obrigado a cumprir.

REGRAS: "Regras do estilo.md" é o que eu sigo. O que eu aprender cai em "Propostas": você aprova
movendo a linha pra "Valendo". "Dicionário de legendas.txt" corrige palavra que a transcrição erra.
APRENDER: joga vídeos prontos seus em "Aprender" que eu estudo o estilo e proponho regras.
`;
function prepararMesa() {
    for (const d of [P_EDITAR, P_EDITANDO, P_PRONTOS, P_APRENDER]) fs.mkdirSync(d, { recursive: true });
    const como = path.join(ESTAG, 'Como usar.txt');
    if (!fs.existsSync(como) || fs.readFileSync(como, 'utf8') !== COMO_USAR) fs.writeFileSync(como, COMO_USAR);
    // regras e dicionário salvos do admin antigo (vêm junto com o robô na primeira vez)
    for (const [orig, dest] of [[path.join(DIR, 'Regras do estilo.md'), ARQ_REGRAS], [path.join(DIR, 'Dicionário de legendas.txt'), ARQ_DIC]])
        if (!fs.existsSync(dest) && fs.existsSync(orig)) fs.copyFileSync(orig, dest);
    if (!fs.existsSync(ARQ_REGRAS)) fs.writeFileSync(ARQ_REGRAS, '# Regras do estilo do Estagiário\n\n## Valendo\n\n## Propostas (pra você aprovar)\n');
    if (!fs.existsSync(ARQ_DIC)) fs.writeFileSync(ARQ_DIC, '# Uma por linha:  errado => certo      (só numa marca: [Marca] errado => certo)\n');
}

/* ── Regras e dicionário (arquivos de texto na pasta Estagiário) ── */
function lerRegras() {
    let tx = ''; try { tx = fs.readFileSync(ARQ_REGRAS, 'utf8'); } catch (_) {}
    const out = { valendo: [], propostas: [] };
    let sec = null;
    for (const l of tx.split('\n')) {
        if (/^##\s*valendo/i.test(l)) { sec = 'valendo'; continue; }
        if (/^##\s*propostas/i.test(l)) { sec = 'propostas'; continue; }
        if (/^##/.test(l)) { sec = null; continue; }
        const m = l.match(/^\s*-\s*(?:\[([^\]]+)\]\s*)?(.+?)\s*(?:\(só ([^)]+)\))?\s*$/);
        if (sec && m) out[sec].push({ categoria: (m[1] || 'outro').trim(), texto: m[2].trim(), cliente: m[3] ? m[3].trim() : null });
    }
    return out;
}
function lerDicionario() {
    let tx = ''; try { tx = fs.readFileSync(ARQ_DIC, 'utf8'); } catch (_) {}
    return tx.split('\n').map(l => l.trim()).filter(l => l && !l.startsWith('#')).map(l => {
        const m = l.match(/^(?:\[([^\]]+)\]\s*)?(.+?)\s*=>\s*(.+)$/);
        return m ? { cliente: m[1] || null, errado: m[2].trim(), certo: m[3].trim() } : null;
    }).filter(Boolean);
}
const daMarca = (c, marca) => !c || String(c).trim().toLowerCase() === String(marca || '').trim().toLowerCase();
/* O que o Claude aprendeu vira PROPOSTA no arquivo de regras (ou já Valendo, quando ela escreveu "sempre:") */
function proporRegras(p, job, origem, valendo = false) {
    const arq = path.join(job, 'saida', 'regras_propostas.json');
    let regras; try { regras = JSON.parse(fs.readFileSync(arq, 'utf8')); } catch (_) { return; }
    fs.renameSync(arq, arq.replace(/\.json$/, '_' + Date.now() + '.json'));
    const linhas = (Array.isArray(regras) ? regras : []).filter(r => r && String(r.texto || '').trim()).slice(0, 8).map(r =>
        '- [' + (r.categoria || 'outro') + '] ' + String(r.texto).trim().replace(/\s+/g, ' ').slice(0, 400) + (r.so_desta_marca && p.marca ? ' (só ' + p.marca + ')' : ''));
    if (!linhas.length) return;
    let tx = fs.readFileSync(ARQ_REGRAS, 'utf8');
    const nota = '  <!-- ' + (origem || 'dos ajustes de ' + p.pasta_nome) + ', ' + new Date().toLocaleDateString('pt-BR') + ' -->';
    const bloco = linhas.join('\n') + '\n';
    if (valendo) {
        const i = tx.search(/^##\s*propostas/im);
        tx = i >= 0 ? tx.slice(0, i) + bloco + '\n' + tx.slice(i) : tx + '\n' + bloco;
    } else {
        if (!/^##\s*propostas/im.test(tx)) tx += '\n## Propostas (pra você aprovar)\n';
        tx = tx.replace(/\s*$/, '\n') + nota + '\n' + bloco;
    }
    fs.writeFileSync(ARQ_REGRAS, tx);
    log(p.pasta_nome + ':', linhas.length + (valendo ? ' regra(s) nova(s) já valendo' : ' regra(s) proposta(s) em "Regras do estilo.md"'));
}

/* ── Pedido a partir da pasta (pedido.txt opcional) ── */
const PADRAO = { formato: '9:16', audio_tipo: 'fala', legenda_modelo: 'lara', tipo: 'edicao' };
function lerPedido(pasta, estado) {
    const nome = path.basename(pasta).replace(/ \(\d+\)$/, '');
    const p = Object.assign({}, PADRAO, { pasta_nome: nome, marca: nome.replace(/\s*\d+\s*$/, '').trim() || nome, numero: estado.numero, refs: [], observacoes: '' });
    const txt = fs.readdirSync(pasta).find(n => PEDIDO_TXT.test(n));
    if (!txt) return p;
    const obs = [];
    for (const bruta of fs.readFileSync(path.join(pasta, txt), 'utf8').split('\n')) {
        const l = bruta.trim(); if (!l) continue;
        const m = l.match(/^([a-zçãõéêíóú ]+?)\s*:\s*(.+)$/i);
        const k = m ? slug(m[1]) : '', v = m ? m[2].trim() : '';
        if (k === 'marca') p.marca = v;
        else if (k === 'legenda') p.legenda_modelo = /^(sem|nao|não|nenhuma)$/i.test(v) ? null : v;
        else if (k === 'formato' && TAMANHO[v]) p.formato = v;
        else if (k === 'audio') p.audio_tipo = slug(v);
        else if (k === 'duas-opcoes') p.duas_opcoes = /^s/i.test(v);
        else if (k === 'titulos') p.titulos_modelos = v;
        else if (k === 'site') p.marca_site = v;
        else if (k === 'redes') p.marca_redes = v;
        else if (k === 'referencia' || k === 'ref') p.refs.push({ tipo: 'geral', link: v.split(/\s+/)[0], nota: v.split(/\s+/).slice(1).join(' ') });
        else if (k === 'duracao') p.duracao_alvo_s = parseInt(v, 10) || null;
        else if (k === 'tipo') p.tipo = /cena/i.test(v) ? 'cenas' : 'edicao';
        else if (k === 'voz') p.voz = v;
        else if (k === 'estilo') p.estilo_visual = v;
        else if (k === 'roteiro') p.roteiro = v;
        else if (k === 'gravar-site' || k === 'gravacao-de-tela') { p.rec_gravar = true; p.rec_passos = v; }
        else obs.push(l);
    }
    p.observacoes = obs.join('\n');
    return p;
}

/* ── Áudio de ajuste: transcreve local (faster-whisper) ── */
function transcreverAudio(arq, pasta) {
    fs.mkdirSync(pasta, { recursive: true });
    const wav = path.join(pasta, slug(path.basename(arq)) + '.wav'), js = wav + '.json';
    ffmpeg(['-i', arq, '-vn', '-ac', '1', '-ar', '16000', wav]);
    const t = spawnSync(PY(), ['-I', path.join(DIR, 'transcrever.py'), wav, js, 'small'], { encoding: 'utf8', timeout: 10 * 60000 });
    if (t.status !== 0) throw new Error((t.stderr || '').trim().split('\n').pop());
    return JSON.parse(fs.readFileSync(js, 'utf8')).map(w => w.w).join(' ').replace(/\s+([,.!?])/g, '$1');
}

/* ── Banco de sons local (opcional, ~/Desktop/sons) ── */
const SONS = process.env.ROBO_SONS || path.join(os.homedir(), 'Desktop', 'sons');
function atualizarBancoDeSons() {
    if (!fs.existsSync(SONS)) return;
    const r = spawnSync(PY(), ['-I', path.join(DIR, 'catalogar_sons.py'), SONS], { encoding: 'utf8', timeout: 20 * 60000 });
    log(r.status === 0 ? 'banco de sons: ' + (r.stdout || '').trim().split('\n')[0] : 'banco de sons não atualizado: ' + (r.stderr || '').trim().split('\n').pop());
}

/* ── entrada/ do trabalho: links físicos dos arquivos da pasta (não ocupa espaço de novo) ── */
function espelharEntrada(pasta, entrada) {
    fs.rmSync(entrada, { recursive: true, force: true }); fs.mkdirSync(entrada, { recursive: true });
    const arqs = listarArquivos(pasta).filter(f => MIDIA.test(f.Path) && !DO_ROBO.test(path.basename(f.Path)) && !AJUSTE.test(path.basename(f.Path)));
    for (const f of arqs) {
        const dest = path.join(entrada, f.Path);
        fs.mkdirSync(path.dirname(dest), { recursive: true });
        try { fs.linkSync(path.join(pasta, f.Path), dest); } catch (_) { fs.copyFileSync(path.join(pasta, f.Path), dest); }
    }
    return arqs;
}
function baixarReferencias(p, entrada) {
    const ytdlp = fs.existsSync(path.join(VENV_BIN, 'yt-dlp')) ? path.join(VENV_BIN, 'yt-dlp') : 'yt-dlp';
    p.refs.forEach((r, i) => {
        const dest = path.join(entrada, 'REF' + (i + 1) + '.mp4');
        if (fs.existsSync(dest)) return;
        const d = spawnSync(ytdlp, ['-q', '--no-playlist', '-f', 'mp4/bestvideo*+bestaudio/best', '--merge-output-format', 'mp4', '-o', dest, r.link], { encoding: 'utf8', timeout: 5 * 60000 });
        log(p.pasta_nome + ':', fs.existsSync(dest) ? 'baixei a referência ' + (i + 1) : 'não consegui baixar a referência ' + r.link + ' (' + ((d.stderr || '').trim().split('\n').pop() || 'sem resposta').slice(0, 120) + ')');
    });
}

/* ── Editar ── */
const jobDe = p => path.join(TRABALHOS, p.numero + '-' + slug(p.pasta_nome));
async function editar(pasta, estado) {
    const p = lerPedido(pasta, estado);
    const job = jobDe(p), entrada = path.join(job, 'entrada'), saida = path.join(job, 'saida');
    fs.mkdirSync(job, { recursive: true });
    if (p.tipo === 'cenas' && !estado.cenas) return criarCenas(pasta, estado, p);
    if (p.tipo === 'cenas') return montarCenas(pasta, estado, p);
    fs.rmSync(saida, { recursive: true, force: true }); fs.mkdirSync(saida, { recursive: true });
    const arquivos = espelharEntrada(pasta, entrada);
    baixarReferencias(p, entrada);
    const { valendo } = lerRegras(), regras = valendo.filter(r => daMarca(r.cliente, p.marca)), dic = lerDicionario().filter(d => daMarca(d.cliente, p.marca));
    fs.writeFileSync(path.join(job, 'pedido.json'), JSON.stringify({ pedido: p, referencias: p.refs, regras, dicionario: dic }, null, 2));
    fs.writeFileSync(path.join(job, 'PEDIDO.md'), pedidoMd(p, p.refs, regras, dic, arquivos));
    fs.copyFileSync(path.join(DIR, 'INSTRUCOES_EDICAO.md'), path.join(job, 'CLAUDE.md'));
    atualizarBancoDeSons();
    log(p.pasta_nome + ': tô editando (leva uns 20 a 40 min)');
    const ok = await rodarClaude(job, p, null, pasta);
    if (!fs.existsSync(path.join(saida, 'previa.mp4'))) throw new Error(ok ? 'O Claude terminou sem gerar o vídeo. Veja ' + path.join(job, 'claude.log') : 'A edição passou de ' + LIMITE_EDICAO_MIN + ' min, deu erro ou foi cancelada. Veja ' + path.join(job, 'claude.log'));
    return entregar(pasta, estado, p, job);
}

/* versão sem legenda: o mesmo projeto com a legenda desligada (o montador reaproveita os trechos já feitos) */
function montarSemLegenda(job, nomeProjeto, sufixo) {
    const saida = path.join(job, 'saida');
    let pj; try { pj = JSON.parse(fs.readFileSync(path.join(saida, nomeProjeto), 'utf8')); } catch (_) { return null; }
    const temLegenda = (pj.camadas || []).some(c => c.tipo === 'legenda') && !(pj.legenda && pj.legenda.ativa === false);
    if (!temLegenda) return null;
    pj.legenda = Object.assign({}, pj.legenda || {}, { ativa: false });
    fs.writeFileSync(path.join(saida, 'projeto_' + sufixo + '.json'), JSON.stringify(pj));
    const r = spawnSync(PY(), ['-I', path.join(DIR, 'montar.py'), job, '--projeto', 'saida/projeto_' + sufixo + '.json'], { encoding: 'utf8', timeout: 60 * 60000 });
    const arq = path.join(saida, 'previa_' + sufixo + '.mp4');
    if (r.status !== 0 || !fs.existsSync(arq)) { log('versão sem legenda não saiu:', ((r.stderr || r.stdout || '').trim().split('\n').pop() || '').slice(0, 200)); return null; }
    return arq;
}

function entregar(pasta, estado, p, job) {
    const saida = path.join(job, 'saida');
    const versao = (estado.versao || 0) + 1;
    const nome = p.pasta_nome, v = ' v' + versao;
    const temLegenda = !!p.legenda_modelo;
    fs.copyFileSync(path.join(saida, 'previa.mp4'), path.join(pasta, nome + (temLegenda ? ' - com legenda' : ' - sem legenda') + v + '.mp4'));
    if (temLegenda) {
        log(nome + ': montando a versão sem legenda');
        const sem = montarSemLegenda(job, 'projeto.json', 'semleg');
        if (sem) fs.copyFileSync(sem, path.join(pasta, nome + ' - sem legenda' + v + '.mp4'));
    }
    if (fs.existsSync(path.join(saida, 'previa_b.mp4'))) fs.copyFileSync(path.join(saida, 'previa_b.mp4'), path.join(pasta, nome + ' - opção B' + v + '.mp4'));
    for (const n of fs.readdirSync(saida).filter(n => /^rec.*\.mp4$/i.test(n))) fs.copyFileSync(path.join(saida, n), path.join(pasta, 'REC ' + n));
    let resumo = ''; try { resumo = fs.readFileSync(path.join(saida, 'resumo.md'), 'utf8').trim(); } catch (_) {}
    fs.writeFileSync(path.join(pasta, 'O que eu fiz' + v + '.txt'), (resumo || 'Versão ' + versao + ' pronta.') + '\n');
    if (fs.existsSync(path.join(saida, 'projeto.json'))) fs.copyFileSync(path.join(saida, 'projeto.json'), path.join(job, 'projeto_v' + versao + '.json'));
    proporRegras(p, job, estado.sempre ? 'do que você marcou com "sempre:"' : undefined, !!estado.sempre);
    Object.assign(estado, { versao, status: 'pronto', entregue_em: Date.now(), sempre: false, job });
    return (resumo.split('\n').find(l => l.trim()) || 'pronto').replace(/^#+\s*/, '').slice(0, 200);
}

/* ── Ajustes (v2, v3…): ajustes.txt ou áudio dentro da pasta pronta ── */
function ajustesNovos(pasta, estado) {
    return fs.readdirSync(pasta).filter(n => AJUSTE.test(n)).map(n => ({ n, mtime: fs.statSync(path.join(pasta, n)).mtimeMs }))
        .filter(a => a.mtime > (estado.ajustes_vistos || {})[a.n] || !(estado.ajustes_vistos || {})[a.n]);
}
async function aplicarAjustes(pasta, estado, novos) {
    const p = lerPedido(pasta, estado);
    const job = estado.job && fs.existsSync(estado.job) ? estado.job : jobDe(p);
    if (!fs.existsSync(path.join(job, 'saida'))) throw new Error('Não achei o trabalho da versão anterior neste Mac (' + job + ')');
    const textos = [];
    for (const a of novos) {
        const arq = path.join(pasta, a.n);
        if (/\.(txt|md)$/i.test(a.n)) textos.push(fs.readFileSync(arq, 'utf8').trim());
        else { try { textos.push('(áudio) ' + transcreverAudio(arq, path.join(job, 'falas'))); } catch (e) { textos.push('(não consegui ouvir o áudio ' + a.n + ': ' + e.message + ')'); } }
    }
    const linhas = textos.join('\n').split('\n').map(l => l.trim()).filter(Boolean);
    estado.sempre = linhas.some(l => /^sempre\s*:/i.test(l));
    const L = ['# Ajustes da Lara para a versão ' + ((estado.versao || 1) + 1), '',
        'Aplique SÓ estes ajustes em cima da versão anterior (saida/projeto.json e a pasta work/), reaproveitando o que já foi feito.',
        'Tempos (ex.: 0:12) são da versão anterior. Depois de aplicar, gere de novo saida/previa.mp4, saida/projeto.json e saida/resumo.md.', '',
        '## ⚠️ O que ela pediu (OBRIGATÓRIO: cumpra cada item e diga no resumo como cumpriu)',
        ...linhas.map((l, k) => (k + 1) + '. ' + l.replace(/^sempre\s*:\s*/i, '') + (/^sempre\s*:/i.test(l) ? '  [vale para todos os próximos vídeos]' : '')), '',
        '## Aprender com os ajustes',
        'Escreva também `saida/regras_propostas.json`: uma lista de regras GERAIS do estilo da Lara que esses ajustes revelam',
        '(o que vale para os próximos vídeos, não a correção pontual). Formato: [{"texto": "...", "motivo": "...", "categoria": "corte|zoom|som|musica|legenda|animacao|cor|ritmo|outro", "so_desta_marca": false}].',
        'Se um ajuste for só um erro deste vídeo (nome errado, palavra trocada), não vire regra. Lista vazia é melhor que regra inventada.'];
    fs.writeFileSync(path.join(job, 'AJUSTES.md'), L.join('\n') + '\n');
    fs.appendFileSync(path.join(job, 'ajustes_historico.json'), JSON.stringify({ quando: new Date().toISOString(), ajustes: linhas }) + '\n');
    espelharEntrada(pasta, path.join(job, 'entrada'));   // b-roll novo que ela jogou na pasta também entra
    for (const n of ['previa.mp4', 'base.mp4', 'previa_b.mp4', 'base_b.mp4', 'projeto_b.json', 'previa_semleg.mp4']) fs.rmSync(path.join(job, 'saida', n), { force: true });
    fs.copyFileSync(path.join(DIR, 'INSTRUCOES_EDICAO.md'), path.join(job, 'CLAUDE.md'));
    atualizarBancoDeSons();
    log(p.pasta_nome + ': aplicando ' + linhas.length + ' ajuste(s)');
    const ok = await rodarClaude(job, p, 'Leia CLAUDE.md, PEDIDO.md e AJUSTES.md. Aplique só os ajustes da Lara na versão anterior, sem refazer o resto, ' +
        'e gere de novo saida/previa.mp4, saida/projeto.json, saida/resumo.md e saida/regras_propostas.json. Não pergunte nada.', pasta);
    if (!fs.existsSync(path.join(job, 'saida', 'previa.mp4'))) throw new Error(ok ? 'O Claude terminou sem gerar a nova versão. Veja ' + path.join(job, 'claude.log') : 'A nova versão passou do tempo, deu erro ou foi cancelada. Veja ' + path.join(job, 'claude.log'));
    estado.ajustes_vistos = Object.assign({}, estado.ajustes_vistos, Object.fromEntries(novos.map(a => [a.n, a.mtime])));
    return entregar(pasta, estado, p, job);
}

/* ── Locução + cenas (pedido.txt com "tipo: cenas"): o Claude escreve locução e prompts, você gera as cenas,
   joga na pasta como cena01.mp4, cena02.mp4… (e o seu áudio, se a voz for sua) e o robô monta ── */
const ARQ_CENA = /^(?:cena|block|scene)[\s_-]*0*(\d+)\.(mp4|mov|m4v|webm)$/i;
async function criarCenas(pasta, estado, p) {
    const job = jobDe(p), saida = path.join(job, 'saida'), voz = path.join(job, 'voz');
    fs.rmSync(saida, { recursive: true, force: true }); fs.mkdirSync(saida, { recursive: true }); fs.mkdirSync(voz, { recursive: true });
    const regras = lerRegras().valendo.filter(r => daMarca(r.cliente, p.marca));
    fs.writeFileSync(path.join(job, 'PEDIDO.md'), pedidoMd(p, p.refs, regras, [], []));
    fs.copyFileSync(path.join(DIR, 'INSTRUCOES_CENAS.md'), path.join(job, 'CLAUDE.md'));
    log(p.pasta_nome + ': escrevendo a locução e os prompts das cenas');
    const ok = await rodarClaude(job, p, 'Leia CLAUDE.md e PEDIDO.md e prepare este pedido de locução + cenas sozinho, sem perguntar nada. ' +
        'No fim precisa existir saida/cenas.json no formato do CLAUDE.md.', pasta);
    let c; try { c = JSON.parse(fs.readFileSync(path.join(saida, 'cenas.json'), 'utf8')); } catch (_) {}
    if (!c || !Array.isArray(c.cenas) || !c.cenas.length) throw new Error(ok ? 'O Claude terminou sem gerar saida/cenas.json' : 'O Claude parou ou passou do tempo. Veja ' + path.join(job, 'claude.log'));
    const propria = !p.voz || p.voz === 'minha';
    c.voz_propria = propria;
    const edgeTts = fs.existsSync(path.join(VENV_BIN, 'edge-tts')) ? path.join(VENV_BIN, 'edge-tts') : 'edge-tts';
    for (const x of c.cenas) {
        x.arquivo = 'cena' + pasta2(x.n) + '.mp4';
        if (propria) continue;
        const mp3 = path.join(voz, 'cena' + pasta2(x.n) + '.mp3');
        const r = spawnSync(edgeTts, ['--voice', p.voz, '--text', x.texto, '--write-media', mp3], { encoding: 'utf8' });
        if (r.status !== 0 || !fs.existsSync(mp3)) throw new Error('Não consegui gerar a voz da cena ' + x.n + ': ' + ((r.stderr || r.error && r.error.message || '').trim().split('\n').pop()));
        x.voz_s = Math.round(duracao(mp3) * 100) / 100;
        fs.copyFileSync(mp3, path.join(pasta, p.pasta_nome + ' - locução cena' + pasta2(x.n) + '.mp3'));
    }
    const instr = c.instrucoes || 'Gere a imagem-chave uma vez. Depois gere cada cena de 10 s anexando a imagem-chave e salve nesta pasta como cena01.mp4, cena02.mp4…';
    fs.writeFileSync(path.join(pasta, 'PROMPTS DAS CENAS.txt'), instr + '\n\n' + c.cenas.map(x => 'CENA ' + pasta2(x.n) + (x.voz_s ? ' (' + x.voz_s + ' s de fala)' : '') +
        '\nFala: ' + (x.texto || '') + '\nPrompt: ' + (x.prompt || x.prompt_video || JSON.stringify(x)) + '\n').join('\n') +
        (propria ? '\nDepois grave você mesma o texto de todas as falas num áudio só e jogue nesta pasta junto com as cenas.\n' : ''));
    Object.assign(estado, { cenas: c, status: 'aguardando_cenas', job });
    return 'prompts prontos: gere as ' + c.cenas.length + ' cenas e jogue na pasta (veja PROMPTS DAS CENAS.txt)';
}
function cenasCompletas(pasta, estado) {
    const c = estado.cenas || {}, total = (c.cenas || []).length;
    const todos = fs.readdirSync(pasta).filter(visivel);
    const nums = todos.map(n => (n.match(ARQ_CENA) || [])[1]).filter(Boolean).map(Number);
    const livre = n => !DO_ROBO.test(n) && !ARQ_CENA.test(n) && !AJUSTE.test(n);
    const audio = c.voz_propria ? (todos.filter(n => AUDIO.test(n) && livre(n))[0] || todos.filter(n => VIDEO.test(n) && livre(n))[0]) : true;
    return total && [...Array(total)].every((_, i) => nums.includes(i + 1)) && !!audio;
}
function fatiarFala(palavras, cenas) {
    const norm = w => String(w).normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase().replace(/[^a-z0-9]/g, '');
    const M = palavras.length; if (!M) throw new Error('Não ouvi fala nenhuma no seu áudio');
    const qtd = cenas.map(x => String(x.texto || '').split(/\s+/).filter(Boolean).length || 1);
    const N = qtd.reduce((a, b) => a + b, 0);
    const cortes = []; let acum = 0;
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
async function montarCenas(pasta, estado, p) {
    const job = jobDe(p), work = path.join(job, 'work'), saida = path.join(job, 'saida'), vozDir = path.join(job, 'voz');
    for (const d of [work, saida, vozDir]) fs.mkdirSync(d, { recursive: true });
    const c = estado.cenas, cenas = c.cenas;
    const todos = fs.readdirSync(pasta).filter(visivel);
    const arqs = cenas.map((_, i) => todos.find(n => (n.match(ARQ_CENA) || [])[1] && Number(n.match(ARQ_CENA)[1]) === i + 1));
    let fatias = null;
    if (c.voz_propria) {
        const livre = n => !DO_ROBO.test(n) && !ARQ_CENA.test(n) && !AJUSTE.test(n);
        const audio = todos.filter(n => AUDIO.test(n) && livre(n))[0] || todos.filter(n => VIDEO.test(n) && livre(n))[0];
        log(p.pasta_nome + ': ouvindo o seu áudio para achar o começo de cada cena');
        const wav = path.join(vozDir, 'minha.wav');
        ffmpeg(['-i', path.join(pasta, audio), '-vn', '-ac', '1', '-ar', '48000', '-af', 'highpass=f=80', wav]);
        const pj = path.join(vozDir, 'palavras.json');
        const r = spawnSync(process.env.ROBO_TRANSCREVER || PY(), [path.join(DIR, 'transcrever.py'), wav, pj], { encoding: 'utf8' });
        if (r.status !== 0 || !fs.existsSync(pj)) throw new Error('Não consegui transcrever o seu áudio: ' + ((r.stderr || '').trim().split('\n').pop() || 'erro'));
        fatias = fatiarFala(JSON.parse(fs.readFileSync(pj, 'utf8')), cenas);
        fatias.forEach((f, i) => ffmpeg(['-i', wav, '-ss', f.s.toFixed(3), '-to', f.e.toFixed(3), '-af', 'afade=t=in:d=0.03,areverse,afade=t=in:d=0.03,areverse', path.join(vozDir, 'cena' + pasta2(i + 1) + '.wav')]));
    }
    log(p.pasta_nome + ': montando cenas + locução');
    const [W, H] = TAMANHO[p.formato] || TAMANHO['9:16'];
    const lista = [], camadas = [], palavrasFinais = [];
    const palavrasLara = fatias ? JSON.parse(fs.readFileSync(path.join(vozDir, 'palavras.json'), 'utf8')) : [];
    let t0 = 0;
    arqs.forEach((nomeArq, i) => {
        const n = i + 1, clip = path.join(pasta, nomeArq);
        const voz = path.join(vozDir, 'cena' + pasta2(n) + (fatias ? '.wav' : '.mp3'));
        if (!fs.existsSync(voz)) throw new Error('Falta a locução da cena ' + n);
        const vd = duracao(voz), dur = fatias ? Math.max(1.5, vd + 0.35) : 10;
        const tempo = !fatias && vd > 9.7 ? Math.min(vd / 9.7, 1.25) : 1, atraso = fatias ? 150 : 250;
        const af = (tempo > 1 ? 'atempo=' + tempo.toFixed(3) + ',' : '') + 'adelay=' + atraso + '|' + atraso + ',apad';
        const temAudio = spawnSync('ffprobe', ['-v', 'error', '-select_streams', 'a', '-show_entries', 'stream=index', '-of', 'csv=p=0', clip], { encoding: 'utf8' }).stdout.trim();
        const v = '[0:v]scale=' + W + ':' + H + ':force_original_aspect_ratio=increase,crop=' + W + ':' + H + ',fps=30,setsar=1,tpad=stop_mode=clone:stop_duration=' + Math.ceil(dur) + '[v]';
        const a = temAudio ? '[0:a]volume=0.22[amb];[1:a]' + af + '[vo];[amb][vo]amix=inputs=2:duration=longest:normalize=0[a]' : '[1:a]' + af + '[a]';
        const seg = path.join(work, 'seg' + pasta2(n) + '.mp4');
        ffmpeg(['-i', clip, '-i', voz, '-filter_complex', v + ';' + a, '-map', '[v]', '-map', '[a]', '-t', dur.toFixed(3),
            '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-ar', '48000', '-ac', '2', seg]);
        lista.push("file '" + seg.replace(/'/g, "'\\''") + "'");
        camadas.push({ tipo: 'corte', inicio_s: t0, fim_s: t0 + dur, origem: nomeArq });
        if (fatias) palavrasLara.filter(w => w.s >= fatias[i].s - 0.01 && w.e <= fatias[i].e + 0.01)
            .forEach(w => palavrasFinais.push({ w: w.w, s: +(t0 + atraso / 1000 + w.s - fatias[i].s).toFixed(3), e: +(t0 + atraso / 1000 + w.e - fatias[i].s).toFixed(3) }));
        t0 += dur;
    });
    fs.writeFileSync(path.join(work, 'lista.txt'), lista.join('\n') + '\n');
    const junto = path.join(work, 'junto.mp4');
    ffmpeg(['-f', 'concat', '-safe', '0', '-i', path.join(work, 'lista.txt'), '-c', 'copy', junto]);
    const ass = path.join(work, 'legenda.ass');
    const comLegenda = p.legenda_modelo && palavrasFinais.length && legendaAss(palavrasFinais, p.legenda_modelo, W, H, ass, p.marca);
    const final = (arq, leg) => ffmpeg(['-i', junto, ...(leg ? ['-vf', 'ass=' + ass + ':fontsdir=' + path.join(DIR, 'fontes'), '-c:v', 'libx264', '-preset', 'medium', '-crf', '16', '-pix_fmt', 'yuv420p'] : ['-c:v', 'copy']),
        '-af', 'loudnorm=I=-14:TP=-1:LRA=11', '-c:a', 'aac', '-b:a', '192k', '-ar', '48000', '-movflags', '+faststart', arq]);
    final(path.join(saida, 'previa.mp4'), comLegenda);
    if (comLegenda) final(path.join(saida, 'previa_semleg.mp4'), false);
    fs.writeFileSync(path.join(saida, 'projeto.json'), JSON.stringify({ duracao_s: Math.round(t0 * 100) / 100, formato: p.formato, camadas }));
    fs.writeFileSync(path.join(saida, 'resumo.md'), 'Vídeo montado: ' + arqs.length + ' cenas + ' + (fatias ? 'a sua locução' : 'locução gerada (' + p.voz + ')') + ', ' + Math.round(t0) + ' s.\n');
    const versao = (estado.versao || 0) + 1, v = ' v' + versao;
    fs.copyFileSync(path.join(saida, 'previa.mp4'), path.join(pasta, p.pasta_nome + (comLegenda ? ' - com legenda' : ' - sem legenda') + v + '.mp4'));
    if (comLegenda) fs.copyFileSync(path.join(saida, 'previa_semleg.mp4'), path.join(pasta, p.pasta_nome + ' - sem legenda' + v + '.mp4'));
    fs.writeFileSync(path.join(pasta, 'O que eu fiz' + v + '.txt'), fs.readFileSync(path.join(saida, 'resumo.md'), 'utf8'));
    Object.assign(estado, { versao, status: 'pronto', entregue_em: Date.now(), job });
    return 'cenas montadas';
}

function pedidoMd(p, refs, regras, dic, arquivos) {
    const L = ['# Pedido #' + p.numero + ': ' + p.pasta_nome, ''];
    if (p.observacoes) L.push('## ⚠️ Observações da Lara (OBRIGATÓRIO: cumpra cada item e diga no resumo como cumpriu)', p.observacoes, '');
    L.push('- Marca: ' + (p.marca || p.pasta_nome));
    L.push('- Formato: ' + p.formato + (p.duracao_alvo_s ? ' · duração desejada: ' + p.duracao_alvo_s + ' s' : ''));
    if (p.tipo === 'cenas') L.push('- Tipo: locução + cenas animadas · ' + Math.max(1, Math.round((p.duracao_alvo_s || 60) / 10)) + ' cenas de 10 s · visual: ' + (p.estilo_visual || 'marca') + ' · voz: ' + (p.voz || 'minha'));
    if (p.tipo !== 'cenas') L.push('- Áudio: ' + ({ narrado: 'NARRADO: as cenas não têm fala; a locução da Lara é um áudio separado na pasta (veja "Vídeo narrado" no CLAUDE.md)',
        musica: 'SEM FALA, só música (vlog/b-roll): veja "Vídeo sem fala" no CLAUDE.md',
        misto: 'FALANDO + NARRADO: partes dela falando para a câmera e partes narradas por cima de cenas (veja "Falando + narrado" no CLAUDE.md)' }[p.audio_tipo] || 'a Lara falando no vídeo (edição normal pela fala)'));
    if (p.duas_opcoes && p.tipo !== 'cenas') L.push('- Duas opções: SIM, entregue a A e a B (veja "Duas opções" no CLAUDE.md)');
    L.push('- Títulos animados: ' + (p.titulos_modelos ? 'use estes modelos: ' + p.titulos_modelos.split(',').map(s => '`' + s.trim() + '`').join(', ') + ' (veja "Títulos" no CLAUDE.md)' : 'escolha entre os modelos da biblioteca (veja "Títulos" no CLAUDE.md)'));
    L.push('- Legenda: ' + (p.legenda_modelo ? 'modelo `' + p.legenda_modelo + '` (veja "Legenda" no CLAUDE.md). O robô gera sozinho a versão sem legenda depois.' : 'SEM legenda (a Lara escolheu não legendar)'));
    if (p.marca_site) L.push('- Site da marca: ' + p.marca_site);
    if (p.marca_redes) L.push('- Redes da marca: ' + p.marca_redes);
    if (arquivos.length) L.push('', '## Arquivos (pasta entrada/)', ...arquivos.map(f => '- ' + f.Path + ' (' + (f.Size / 1048576).toFixed(1) + ' MB)'));
    L.push('', p.tipo === 'cenas' ? '## Texto da locução ou ideia' : '## Roteiro', p.roteiro || (p.tipo === 'cenas' ? '(sem texto: use as observações)' : '(sem roteiro: siga a fala do bruto)'));
    if (p.rec_gravar) L.push('', '## Gravação de tela do site (pedida)', 'Site: ' + (p.marca_site || '(não informado)'), p.rec_passos || '(sem passo a passo: mostre a página principal e o que o roteiro cita)');
    L.push('', '## Referências');
    if (!refs.length) L.push('(nenhuma: siga as regras do estilo)');
    refs.forEach((r, i) => L.push('- REF' + (i + 1) + ': ' + r.link + (r.nota ? ' · copiar: ' + r.nota : '') + ' (se baixou, está em entrada/REF' + (i + 1) + '.mp4)'));
    L.push('', '## Regras do estilo aprovadas (obrigatórias)');
    regras.forEach(r => L.push('- [' + r.categoria + '] ' + r.texto + (r.cliente ? ' (só ' + r.cliente + ')' : '')));
    L.push('', '## Dicionário de correções (legenda)');
    dic.forEach(d => L.push('- "' + d.errado + '" → "' + d.certo + '"'));
    return L.join('\n') + '\n';
}

/* ── Claude Code ── */
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
const MCP_EPIDEMIC = path.join(DIR, 'mcp-epidemic.json');
const EPIDEMIC_CHAVE = path.join(DIR, 'epidemic.json');      // só a chave, permissão 600, nunca vai pro log
function chaveEpidemic() {
    if (process.env.EPIDEMIC_SOUND_MCP_API_KEY) return process.env.EPIDEMIC_SOUND_MCP_API_KEY.trim();
    try { return String(JSON.parse(fs.readFileSync(EPIDEMIC_CHAVE, 'utf8')).chave || '').trim(); } catch (_) { return ''; }
}
/* Único MCP liberado para o robô: o Epidemic Sound (música e efeitos com a licença Pro da Lara) */
function configMcp() {
    fs.writeFileSync(MCP_VAZIO, '{"mcpServers":{}}');
    const chave = chaveEpidemic();
    if (!chave) return MCP_VAZIO;
    fs.writeFileSync(MCP_EPIDEMIC, JSON.stringify({ mcpServers: { 'epidemic-sound': {
        type: 'http', url: 'https://www.epidemicsound.com/a/mcp-service/mcp', headers: { Authorization: 'Bearer ' + chave } } } }, null, 1), { mode: 0o600 });
    fs.chmodSync(MCP_EPIDEMIC, 0o600);
    return MCP_EPIDEMIC;
}
function rodarClaude(job, p, pedidoTexto, pastaVigiada) {
    const prompt = (pedidoTexto || 'Leia CLAUDE.md e PEDIDO.md e faça a edição completa deste pedido sozinho, sem perguntar nada. ' +
        'No fim precisa existir saida/previa.mp4, saida/projeto.json e saida/resumo.md' +
        (p.duas_opcoes ? ', e também a opção B (saida/projeto_b.json montado em saida/previa_b.mp4), como explica "Duas opções" no CLAUDE.md.' : '. Faça só uma opção (a A): a Lara não pediu duas.')) +
        ' Antes de cada etapa, escreva uma frase curta em português, em primeira pessoa (você é o Estagiário de edição dela), dizendo o que vai fazer.';
    return new Promise(resolve => {
        const logArq = path.join(job, 'claude.log');
        // Só as ferramentas básicas + Epidemic Sound: nenhum outro MCP/conector da Lara roda sem ela ver
        const c = spawn(CLAUDE, ['-p', prompt, '--permission-mode', 'bypassPermissions', '--output-format', 'stream-json', '--verbose',
            '--strict-mcp-config', '--mcp-config', configMcp()],
            { cwd: job, stdio: ['ignore', 'pipe', 'pipe'], detached: true, env: Object.assign({}, process.env, { ENABLE_CLAUDEAI_MCP_SERVERS: 'false' }) });
        const parar = () => { try { process.kill(-c.pid, 'SIGTERM'); } catch (_) { try { c.kill('SIGTERM'); } catch (__) {} } };
        let resto = '';
        c.stdout.on('data', buf => {
            fs.appendFileSync(logArq, buf);
            const linhas = (resto + buf.toString()).split('\n'); resto = linhas.pop();
            for (const l of linhas) { let ev; try { ev = JSON.parse(l); } catch (_) { continue; } for (const passo of passoDoEvento(ev)) log(p.pasta_nome + ':', passo); }
        });
        c.stderr.on('data', buf => fs.appendFileSync(logArq, buf));
        // tirou a pasta de "2 - Editando": cancela na hora
        const vigia = setInterval(() => {
            if (pastaVigiada && !fs.existsSync(pastaVigiada) && !p._cancelado) { p._cancelado = true; log(p.pasta_nome + ': você tirou a pasta de "2 - Editando", parei a edição'); parar(); }
        }, 10000);
        const t = setTimeout(() => { parar(); resolve(false); }, LIMITE_EDICAO_MIN * 60000);
        c.on('error', e => { fs.appendFileSync(logArq, '\n[robô] ' + e.message + '\n'); clearInterval(vigia); clearTimeout(t); resolve(false); });
        c.on('exit', code => { clearInterval(vigia); clearTimeout(t); resolve(code === 0); });
    });
}

/* ── Fila: olha as pastas ── */
const assinaturas = new Map();   // pasta -> "arquivo:tamanho" da última olhada (só começa quando parou de copiar)
function estavel(chave, pasta) {
    const ass = listarArquivos(pasta).map(f => f.Path + ':' + f.Size).sort().join('|');
    if (assinaturas.get(chave) !== ass) { assinaturas.set(chave, ass); return false; }
    assinaturas.delete(chave); return true;
}
async function trabalhar(pastaOrigem, fazer, voltarPara) {
    const nome = path.basename(pastaOrigem);
    const pasta = mover(pastaOrigem, P_EDITANDO);
    const estado = lerEstado(pasta) || { numero: proximoNumero() };
    estado.status = 'editando'; gravarEstado(pasta, estado);
    try {
        const msg = await fazer(pasta, estado);
        if (!fs.existsSync(pasta)) return;
        gravarEstado(pasta, estado);
        const destino = estado.status === 'aguardando_cenas' ? P_EDITAR : P_PRONTOS;
        mover(pasta, destino);
        log(nome + ': ' + msg + (destino === P_PRONTOS ? ' → está em "3 - Prontos"' : ''));
        spawnSync('osascript', ['-e', 'display notification "' + (nome + ': ' + msg).replace(/"/g, "'").slice(0, 180) + '" with title "Estagiário"']);
    } catch (e) {
        if (!fs.existsSync(pasta)) { log(nome + ': cancelado'); return; }
        log(nome + ': ERRO ' + e.message);
        fs.writeFileSync(path.join(pasta, 'ERRO.txt'), 'Deu erro: ' + e.message + '\n\nApague este arquivo que eu tento de novo.\n');
        estado.status = 'erro'; gravarEstado(pasta, estado);
        mover(pasta, voltarPara);
    }
}
async function rodada() {
    // vídeo solto em "1 - Pra editar": vira uma pasta com o nome dele
    for (const n of fs.readdirSync(P_EDITAR).filter(visivel)) {
        const c = path.join(P_EDITAR, n);
        if (fs.statSync(c).isFile() && VIDEO.test(n)) {
            const st = fs.statSync(c).size;
            if (assinaturas.get('solto:' + n) !== st) { assinaturas.set('solto:' + n, st); continue; }
            assinaturas.delete('solto:' + n);
            const dir = path.join(P_EDITAR, n.replace(/\.[^.]+$/, ''));
            fs.mkdirSync(dir, { recursive: true }); fs.renameSync(c, path.join(dir, n));
        }
    }
    for (const n of fs.readdirSync(P_EDITAR).filter(visivel)) {
        const pasta = path.join(P_EDITAR, n);
        if (!fs.statSync(pasta).isDirectory() || fs.existsSync(path.join(pasta, 'ERRO.txt'))) continue;
        const estado = lerEstado(pasta);
        if (estado && estado.status === 'aguardando_cenas') {
            if (cenasCompletas(pasta, estado) && estavel(pasta, pasta)) await trabalhar(pasta, (d, e) => editar(d, e), P_EDITAR);
            continue;
        }
        const temVideo = listarArquivos(pasta).some(f => VIDEO.test(f.Path)) || fs.readdirSync(pasta).some(x => PEDIDO_TXT.test(x) && /tipo\s*:\s*cena/i.test(fs.readFileSync(path.join(pasta, x), 'utf8')));
        if (!temVideo) continue;
        if (!estavel(pasta, pasta)) { log(n + ': chegou, esperando terminar de copiar…'); continue; }
        if (estado && estado.versao) { // pasta pronta que ela trouxe de volta: só ajustes contam
            const novos = ajustesNovos(pasta, estado);
            await trabalhar(pasta, (d, e) => novos.length ? aplicarAjustes(d, e, novos) : editar(d, Object.assign(e, { cenas: null })), P_EDITAR);
        } else await trabalhar(pasta, (d, e) => editar(d, e), P_EDITAR);
    }
    for (const n of fs.readdirSync(P_PRONTOS).filter(visivel)) {
        const pasta = path.join(P_PRONTOS, n);
        if (!fs.statSync(pasta).isDirectory() || fs.existsSync(path.join(pasta, 'ERRO.txt'))) continue;
        const estado = lerEstado(pasta); if (!estado || !estado.versao) continue;
        const novos = ajustesNovos(pasta, estado);
        if (!novos.length) continue;
        if (!estavel(pasta, pasta)) { log(n + ': vi o seu ajuste, esperando você terminar…'); continue; }
        await trabalhar(pasta, (d, e) => aplicarAjustes(d, e, ajustesNovos(d, e)), P_PRONTOS);
    }
}

/* ── Aprender com os vídeos da Lara (pasta "Aprender") ── */
const APRENDER = path.join(DIR, 'aprender');
let aprenderUltimaOlhada = 0;
async function olharAprender() {
    if (Date.now() - aprenderUltimaOlhada < 10 * 60000) return;
    aprenderUltimaOlhada = Date.now();
    const arqs = listarArquivos(P_APRENDER).filter(f => (VIDEO.test(f.Path) || /\.(md|txt)$/i.test(f.Path)) && !/^ESTILO/i.test(path.basename(f.Path)));
    if (!arqs.length) return;
    const assinatura = arqs.map(f => f.Path + ':' + f.Size).sort().join('|');
    const estadoArq = path.join(APRENDER, 'estado.json');
    let feito = null; try { feito = JSON.parse(fs.readFileSync(estadoArq, 'utf8')).assinatura; } catch (_) {}
    if (assinatura === feito) return;
    if (!estavel('aprender', P_APRENDER)) { aprenderUltimaOlhada = Date.now() - 9 * 60000; log('aprender: vídeos novos, esperando terminar de copiar…'); return; }
    const job = path.join(APRENDER, 'rodada-' + new Date().toISOString().slice(0, 16).replace(/[:T]/g, '-'));
    fs.mkdirSync(path.join(job, 'saida'), { recursive: true });
    fs.symlinkSync(P_APRENDER, path.join(job, 'videos'));
    fs.copyFileSync(path.join(DIR, 'INSTRUCOES_APRENDER.md'), path.join(job, 'CLAUDE.md'));
    const r = lerRegras();
    fs.writeFileSync(path.join(job, 'REGRAS_ATUAIS.md'), '# Regras que já existem (não repita)\n\n' +
        [...r.valendo.map(x => '- [' + x.categoria + '] ' + x.texto + ' (valendo)'), ...r.propostas.map(x => '- [' + x.categoria + '] ' + x.texto + ' (proposta)')].join('\n') + '\n');
    log('aprender: estudando ' + arqs.length + ' arquivo(s) da pasta Aprender');
    const ok = await rodarClaude(job, { pasta_nome: 'aprender' }, 'Leia CLAUDE.md e REGRAS_ATUAIS.md e estude os vídeos da pasta videos/ sozinho, sem perguntar nada. ' +
        'Não altere nada dentro de videos/. No fim precisa existir saida/relatorio.md e saida/regras_propostas.json.');
    if (!fs.existsSync(path.join(job, 'saida', 'relatorio.md'))) { log('aprender: o Claude não entregou o relatório (' + (ok ? 'terminou' : 'parou') + '). Veja ' + path.join(job, 'claude.log')); return; }
    proporRegras({ marca: null, pasta_nome: 'aprender' }, job, 'aprendido com a pasta Aprender');
    fs.copyFileSync(path.join(job, 'saida', 'relatorio.md'), path.join(P_APRENDER, 'ESTILO - o que aprendi ' + new Date().toISOString().slice(0, 10) + '.md'));
    fs.writeFileSync(estadoArq, JSON.stringify({ assinatura: listarArquivos(P_APRENDER).filter(f => (VIDEO.test(f.Path) || /\.(md|txt)$/i.test(f.Path)) && !/^ESTILO/i.test(path.basename(f.Path))).map(f => f.Path + ':' + f.Size).sort().join('|'), quando: new Date().toISOString() }));
    log('aprender: pronto. Relatório na pasta Aprender e regras propostas em "Regras do estilo.md".');
}

/* ── App na Mesa: dois cliques ligam o robô escondido e abrem a pasta Estagiário ── */
const APP = path.join(os.homedir(), 'Desktop', 'Estagiário.app');
const LANCADOR = path.join(DIR, 'Estagiario.command');
function criarApp() {
    if (process.platform !== 'darwin') return;
    const icone = path.join(DIR, 'icone.png');
    if (!fs.existsSync(icone)) return;
    const versao = String(fs.statSync(icone).size) + ':' + process.execPath + ':local-v1';
    const marca = path.join(APP, 'Contents', 'Resources', 'versao.txt');
    try { if (fs.readFileSync(marca, 'utf8') === versao) return; } catch (_) {}
    try {
        fs.writeFileSync(LANCADOR, '#!/bin/bash\ncd "' + DIR + '" && caffeinate -i "' + process.execPath + '" robo.mjs\n', { mode: 0o755 });
        const mac = path.join(APP, 'Contents', 'MacOS'), res = path.join(APP, 'Contents', 'Resources');
        fs.mkdirSync(mac, { recursive: true }); fs.mkdirSync(res, { recursive: true });
        fs.writeFileSync(path.join(APP, 'Contents', 'Info.plist'), '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n' +
            '<plist version="1.0"><dict><key>CFBundleName</key><string>Estagiário</string><key>CFBundleDisplayName</key><string>Estagiário</string>' +
            '<key>CFBundleIdentifier</key><string>com.laradam.estagiario</string><key>CFBundleExecutable</key><string>Estagiario</string>' +
            '<key>CFBundleIconFile</key><string>Estagiario</string><key>CFBundlePackageType</key><string>APPL</string><key>CFBundleVersion</key><string>2</string></dict></plist>\n');
        fs.writeFileSync(path.join(mac, 'Estagiario'), '#!/bin/bash\n"' + process.execPath + '" "' + path.join(DIR, 'robo.mjs') + '" --servico >> "' + LOG_SERVICO + '" 2>&1\n' +
            'open "' + ESTAG + '"\n', { mode: 0o755 });
        const set = path.join(os.tmpdir(), 'Estagiario.iconset');
        fs.rmSync(set, { recursive: true, force: true }); fs.mkdirSync(set);
        for (const t of [16, 32, 128, 256, 512]) {
            spawnSync('sips', ['-z', String(t), String(t), icone, '--out', path.join(set, 'icon_' + t + 'x' + t + '.png')]);
            spawnSync('sips', ['-z', String(t * 2), String(t * 2), icone, '--out', path.join(set, 'icon_' + t + 'x' + t + '@2x.png')]);
        }
        spawnSync('iconutil', ['-c', 'icns', set, '-o', path.join(res, 'Estagiario.icns')], { encoding: 'utf8' });
        fs.writeFileSync(marca, versao);
        spawnSync('touch', [APP]);
        log('App "Estagiário" na Mesa: dois cliques me ligam e abrem a pasta Estagiário.');
    } catch (e) { log('não consegui criar o app na Mesa:', e.message); }
}
/* Serviço do macOS (launchd): liga sozinho quando o Mac liga e volta se cair */
const SERVICO = 'com.laradam.estagiario';
const PLIST = path.join(os.homedir(), 'Library', 'LaunchAgents', SERVICO + '.plist');
const LOG_SERVICO = path.join(DIR, 'estagiario.log');
const PATH_SALVO = path.join(DIR, 'path.txt');
function guardarPath() {
    if (process.env.ROBO_SERVICO || !/homebrew|local\/bin/.test(process.env.PATH || '')) return;
    try { fs.writeFileSync(PATH_SALVO, process.env.PATH); } catch (_) {}
}
function instalarServico() {
    if (process.platform !== 'darwin') return log('O serviço escondido só existe no Mac.');
    let salvo = ''; try { salvo = fs.readFileSync(PATH_SALVO, 'utf8').trim(); } catch (_) {}
    const extras = [path.dirname(process.execPath), '/opt/homebrew/bin', '/usr/local/bin', path.join(os.homedir(), '.local', 'bin'),
        path.join(os.homedir(), '.claude', 'local'), path.join(DIR, 'bin'), '/usr/bin', '/bin', '/usr/sbin', '/sbin'];
    const PATH = [...new Set([...salvo.split(':'), ...(process.env.PATH || '').split(':'), ...extras].filter(Boolean))].join(':');
    const esc = t => String(t).replace(/&/g, '&amp;').replace(/</g, '&lt;');
    const plist = '<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">\n<plist version="1.0"><dict>' +
        '<key>Label</key><string>' + SERVICO + '</string>' +
        '<key>ProgramArguments</key><array><string>/usr/bin/caffeinate</string><string>-s</string><string>' + esc(process.execPath) + '</string><string>' + esc(path.join(DIR, 'robo.mjs')) + '</string></array>' +
        '<key>WorkingDirectory</key><string>' + esc(DIR) + '</string>' +
        '<key>EnvironmentVariables</key><dict><key>PATH</key><string>' + esc(PATH) + '</string><key>ROBO_SERVICO</key><string>1</string><key>HOME</key><string>' + esc(os.homedir()) + '</string></dict>' +
        '<key>RunAtLoad</key><true/><key>KeepAlive</key><true/><key>ThrottleInterval</key><integer>30</integer>' +
        '<key>StandardOutPath</key><string>' + esc(LOG_SERVICO) + '</string><key>StandardErrorPath</key><string>' + esc(LOG_SERVICO) + '</string>' +
        '</dict></plist>\n';
    fs.mkdirSync(path.dirname(PLIST), { recursive: true });
    const mudou = !fs.existsSync(PLIST) || fs.readFileSync(PLIST, 'utf8') !== plist;
    const dominio = 'gui/' + process.getuid();
    if (mudou) {
        spawnSync('launchctl', ['bootout', dominio + '/' + SERVICO]);
        fs.writeFileSync(PLIST, plist);
        const r = spawnSync('launchctl', ['bootstrap', dominio, PLIST], { encoding: 'utf8' });
        if (r.status !== 0) return log('Não consegui ligar o serviço:', (r.stderr || '').trim());
        log('Pronto: agora eu trabalho escondido, sem janela, e ligo sozinho quando o Mac liga.');
    } else {
        spawnSync('launchctl', ['bootstrap', dominio, PLIST]);
        spawnSync('launchctl', ['kickstart', dominio + '/' + SERVICO]);
    }
}
/* Um Estagiário só por Mac */
const TRAVA = path.join(DIR, 'robo.pid');
function soUmEstagiario() {
    let pid = 0; try { pid = Number(fs.readFileSync(TRAVA, 'utf8')) || 0; } catch (_) {}
    const vivo = n => { try { process.kill(n, 0); return true; } catch (_) { return false; } };
    if (pid && pid !== process.pid && vivo(pid)) return false;
    fs.writeFileSync(TRAVA, String(process.pid));
    process.on('exit', () => { try { if (Number(fs.readFileSync(TRAVA, 'utf8')) === process.pid) fs.rmSync(TRAVA); } catch (_) {} });
    for (const sinal of ['SIGINT', 'SIGTERM', 'SIGHUP']) process.on(sinal, () => process.exit(0));
    return true;
}
/* Restos da época do admin: o login do admin some (o robô não fala mais com o site) */
function limparAdmin() {
    for (const n of ['sessao.json']) { try { fs.rmSync(path.join(DIR, n)); log('Apaguei o login antigo do admin (' + n + '): agora eu só trabalho no Mac.'); } catch (_) {} }
}

async function main() {
    fs.mkdirSync(TRABALHOS, { recursive: true });
    if (process.argv.includes('--epidemic')) {
        const rl = (await import('node:readline')).createInterface({ input: process.stdin, output: process.stdout });
        const chave = (await new Promise(r => rl.question('Cole a chave do Epidemic Sound (Account > API keys > MCP Server) e aperte Enter: ', r))).trim();
        rl.close();
        if (!chave) return console.log('Nenhuma chave colada. Nada mudou.');
        fs.writeFileSync(EPIDEMIC_CHAVE, JSON.stringify({ chave, salva_em: new Date().toISOString() }), { mode: 0o600 });
        const r = await fetch('https://www.epidemicsound.com/a/mcp-service/mcp', { method: 'POST',
            headers: { Authorization: 'Bearer ' + chave, 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' },
            body: JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'initialize', params: { protocolVersion: '2025-03-26', capabilities: {}, clientInfo: { name: 'robo-edicao', version: '1' } } }) }).catch(e => ({ ok: false, status: e.message }));
        return console.log(r.ok ? 'Epidemic Sound ligado: o robô já escolhe música e efeitos sozinho.' : 'Chave salva, mas o Epidemic não aceitou (' + r.status + '). Confira se copiou a chave do "MCP Server" inteira.');
    }
    prepararMesa();
    if (process.argv.includes('--app')) return criarApp();
    if (process.argv.includes('--servico')) { guardarPath(); return instalarServico(); }
    guardarPath();
    if (!process.argv.includes('--uma-vez') && !soUmEstagiario()) return log('O Estagiário já está trabalhando. Pode fechar esta janela.');
    limparAdmin();
    criarApp();
    if (process.platform === 'darwin' && !process.env.ROBO_SERVICO && !process.argv.includes('--uma-vez') && !process.env.ROBO_COM_JANELA) {
        instalarServico();
        if (spawnSync('launchctl', ['print', 'gui/' + process.getuid() + '/' + SERVICO]).status === 0) {
            log('A partir de agora eu trabalho escondido, sem esta janela. Pode fechar o Terminal.');
            try { fs.rmSync(TRAVA); } catch (_) {}
            spawnSync('launchctl', ['kickstart', '-k', 'gui/' + process.getuid() + '/' + SERVICO]);
            process.exit(0);
        }
    }
    log('Epidemic Sound: ' + (chaveEpidemic() ? 'ligado (música e efeitos com a licença Pro)' : 'desligado. Para ligar: node robo.mjs --epidemic'));
    log('Estagiário chegou (versão só Mac, sem admin). Olho a pasta "' + ESTAG + '" a cada ' + INTERVALO_S + ' s.');
    // robô fechado no meio de uma edição: a pasta volta pra recomeçar
    for (const n of fs.readdirSync(P_EDITANDO).filter(visivel)) {
        const pasta = path.join(P_EDITANDO, n), e = lerEstado(pasta);
        mover(pasta, e && e.versao ? P_PRONTOS : P_EDITAR);
        log(n + ': fui reiniciado no meio da edição, recomeço sozinho');
    }
    do {
        try { await rodada(); } catch (e) { log('Não consegui olhar as pastas:', e.message); }
        try { await olharAprender(); } catch (e) { log('aprender:', e.message); }
        if (process.argv.includes('--uma-vez')) break;
        await new Promise(r => setTimeout(r, INTERVALO_S * 1000));
    } while (true);
}
main().catch(e => { console.error('ERRO:', e.message); process.exit(1); });
