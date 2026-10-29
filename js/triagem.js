/* ── Triagem de creators · uma por vez, Boa / Não boa ──
   Usado na aba Triagem do admin e na página triagem.html (acesso "equipe").
   Fila = creators sem nao_qualificada e sem qualificada_em.
   Grava pela função triagem_marcar (sql-triagem.sql), que só aceita admin e equipe
   e só mexe nas colunas da triagem. */
(function() {
    'use strict';

    const MOTIVOS = ['Sem portfólio', 'Portfólio ruim', 'Conteúdo ruim', 'Link inválido'];
    const TIPOS = { ugc_creator: 'UGC Creator', influenciadora: 'Influenciadora', ugc_influenciadora: 'UGC + Influenciadora' };
    const SEGUIDORES = { ate_1k: 'Até 1k', '1k_5k': '1k-5k', '5k_10k': '5k-10k', '10k_30k': '10k-30k', '30k_mais': '30k+' };
    const EXPERIENCIA = { sim: 'Já fez publi', nao: 'Nunca fez publi', permuta: 'Só permuta' };

    const CSS = `
    .tri-wrap { max-width:560px; margin:0 auto; }
    .tri-topo { display:flex; justify-content:space-between; align-items:baseline; gap:12px; margin-bottom:14px; flex-wrap:wrap; }
    .tri-topo h2 { margin:0; font-size:20px; }
    .tri-cont { font-size:13px; color:var(--text-soft); }
    .tri-cont b { color:var(--text); }
    .tri-barra { height:4px; border-radius:4px; background:var(--border); overflow:hidden; margin-bottom:16px; }
    .tri-barra div { height:100%; background:var(--accent); transition:width .25s ease; }
    .tri-card { background:var(--card); border:1px solid var(--border); border-radius:18px; box-shadow:0 4px 14px rgba(33,29,26,0.07), 0 2px 5px rgba(33,29,26,0.04); padding:22px; touch-action:pan-y; user-select:none; -webkit-user-select:none; transition:transform .22s ease, opacity .22s ease; position:relative; }
    .tri-card.arrastando { transition:none; }
    .tri-carimbo { position:absolute; top:18px; padding:4px 10px; border:2px solid; border-radius:8px; font-weight:800; font-size:13px; letter-spacing:1px; text-transform:uppercase; opacity:0; pointer-events:none; }
    .tri-carimbo.boa { right:18px; color:var(--success); }
    .tri-carimbo.nao { left:18px; color:var(--error); }
    .tri-cab { display:flex; gap:16px; align-items:center; margin-bottom:14px; }
    .tri-foto { width:84px; height:84px; border-radius:50%; object-fit:cover; background:var(--warm); flex-shrink:0; display:flex; align-items:center; justify-content:center; font-weight:700; font-size:24px; color:var(--text-soft); }
    .tri-nome { font-size:19px; font-weight:700; margin:0 0 3px; }
    .tri-sub { font-size:13px; color:var(--text-soft); line-height:1.5; }
    .tri-tags { display:flex; flex-wrap:wrap; gap:6px; margin-bottom:12px; }
    .tri-tag { padding:3px 10px; border-radius:100px; background:var(--warm); font-size:12px; font-weight:600; color:var(--text-soft); }
    .tri-sobre { font-size:13.5px; line-height:1.55; color:var(--text); margin:0 0 14px; max-height:120px; overflow:auto; white-space:pre-line; }
    .tri-links { display:flex; flex-wrap:wrap; gap:8px; }
    .tri-links a { padding:8px 13px; border:1px solid var(--border-strong); border-radius:100px; font-size:13px; font-weight:600; color:var(--text); text-decoration:none; }
    .tri-links a:hover { border-color:var(--accent); color:var(--accent); }
    .tri-links a.principal { background:var(--accent); border-color:var(--accent); color:#fff; }
    .tri-sem { font-size:13px; color:var(--error); font-weight:600; }
    .tri-acoes { display:flex; gap:12px; margin-top:16px; }
    .tri-acoes button { flex:1; padding:14px; border-radius:14px; font-family:inherit; font-size:15px; font-weight:700; cursor:pointer; border:1.5px solid; background:var(--card); }
    .tri-btn-nao { color:var(--error); border-color:var(--error) !important; }
    .tri-btn-nao:hover { background:#FEF2F2 !important; }
    .tri-btn-boa { color:#fff; background:var(--success) !important; border-color:var(--success) !important; }
    .tri-btn-boa:hover { filter:brightness(.95); }
    .tri-motivos { display:none; gap:8px; flex-wrap:wrap; margin-top:12px; }
    .tri-motivos.show { display:flex; }
    .tri-motivos button { flex:1 1 40%; padding:10px; border:1px solid var(--border-strong); border-radius:10px; background:var(--card); font-family:inherit; font-size:13px; font-weight:600; cursor:pointer; color:var(--text); }
    .tri-motivos button:hover { border-color:var(--error); color:var(--error); }
    .tri-outro { display:flex; gap:8px; flex:1 1 100%; }
    .tri-outro input { flex:1; padding:10px 12px; border:1px solid var(--border-strong); border-radius:10px; font-family:inherit; font-size:13px; }
    .tri-outro input:focus { outline:none; border-color:var(--error); }
    .tri-outro button { flex:0 0 auto; }
    .tri-motivos kbd, .tri-acoes kbd { font-family:inherit; font-size:11px; opacity:.6; margin-left:4px; }
    .tri-mini { display:flex; justify-content:space-between; margin-top:12px; font-size:13px; }
    .tri-mini button { background:none; border:none; font-family:inherit; font-size:13px; color:var(--text-soft); cursor:pointer; padding:4px 0; }
    .tri-mini button:hover { color:var(--accent); }
    .tri-mini button:disabled { opacity:.35; cursor:default; color:var(--text-soft); }
    .tri-atalhos { margin-top:18px; font-size:12px; color:var(--text-muted); text-align:center; line-height:1.7; }
    .tri-vazio { text-align:center; padding:48px 20px; color:var(--text-soft); }
    .tri-vazio b { display:block; font-size:18px; color:var(--text); margin-bottom:6px; }
    .tri-carregando { text-align:center; padding:48px 20px; color:var(--text-muted); font-size:14px; }
    `;

    let raiz = null, fila = [], feitas = [], total = 0, boas = 0, naoBoas = 0, ocupado = false;

    const sb = () => window.Auth && window.Auth.sb;
    const $ = sel => raiz && raiz.querySelector(sel);

    function esc(s) {
        return String(s == null ? '' : s).replace(/[&<>"']/g, ch => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[ch]));
    }
    function url(u) {
        const s = String(u || '').trim();
        if (!s) return '';
        return /^https?:\/\//i.test(s) ? s : 'https://' + s;
    }
    function handle(h, dominio) {
        let s = String(h || '').trim();
        const m = s.match(new RegExp('(?:https?://)?(?:www\\.)?' + dominio + '/@?([^/?]+)', 'i'));
        if (m) s = m[1];
        return s.replace(/^@/, '');
    }
    function iniciais(nome) {
        return esc((nome || '?').split(' ').map(w => w[0]).filter(Boolean).slice(0, 2).join('').toUpperCase());
    }
    function nichos(val) {
        if (!val) return [];
        try { const arr = JSON.parse(val); if (Array.isArray(arr)) return arr; } catch (e) {}
        return [val];
    }
    function data(d) {
        return d ? new Date(d).toLocaleDateString('pt-BR') : '-';
    }

    async function carregar() {
        raiz.querySelector('#triArea').innerHTML = '<div class="tri-carregando">Carregando creators...</div>';
        const { data: rows, error } = await sb().from('creators')
            .select('id, nome, foto_perfil, cidade, estado, nicho, tipo_creator, sobre, seguidores, instagram, tiktok, portfolio, melhor_conteudo, experiencia, created_at')
            .is('nao_qualificada', null).is('qualificada_em', null)
            .order('created_at', { ascending: false });
        if (error) { $('#triArea').innerHTML = '<div class="tri-vazio"><b>Erro ao carregar</b>' + esc(error.message) + '</div>'; return; }
        fila = rows || [];
        total = fila.length; feitas = []; boas = 0; naoBoas = 0;
        render();
    }

    function render() {
        const area = $('#triArea');
        $('#triCont').innerHTML = `<b>${fila.length}</b> na fila · ${boas} boas · ${naoBoas} não boas`;
        $('#triBarra').style.width = total ? ((boas + naoBoas) / total * 100) + '%' : '0';
        const c = fila[0];
        if (!c) {
            area.innerHTML = `<div class="tri-card tri-vazio"><b>Tudo triado 🎉</b>Nenhuma creator esperando avaliação.${feitas.length ? '<div class="tri-mini" style="justify-content:center"><button data-acao="desfazer">Desfazer a última</button></div>' : ''}</div>`;
            return;
        }
        const ig = handle(c.instagram, 'instagram\\.com');
        const tt = handle(c.tiktok, 'tiktok\\.com');
        const loc = [c.cidade, c.estado].filter(Boolean).map(esc).join(' · ');
        const links = [
            c.portfolio ? `<a class="principal" href="${esc(url(c.portfolio))}" target="_blank" rel="noopener">Portfólio</a>` : '',
            c.melhor_conteudo ? `<a href="${esc(url(c.melhor_conteudo))}" target="_blank" rel="noopener">Melhor conteúdo</a>` : '',
            ig ? `<a href="https://www.instagram.com/${encodeURIComponent(ig)}" target="_blank" rel="noopener">Instagram</a>` : '',
            tt ? `<a href="https://www.tiktok.com/@${encodeURIComponent(tt)}" target="_blank" rel="noopener">TikTok</a>` : ''
        ].join('');
        const tags = [TIPOS[c.tipo_creator] || c.tipo_creator, EXPERIENCIA[c.experiencia]].concat(nichos(c.nicho))
            .filter(Boolean).map(t => `<span class="tri-tag">${esc(t)}</span>`).join('');
        const foto = c.foto_perfil
            ? `<img class="tri-foto" src="${esc(c.foto_perfil)}" alt="" onerror="this.outerHTML='<div class=&quot;tri-foto&quot;>${iniciais(c.nome)}</div>'">`
            : `<div class="tri-foto">${iniciais(c.nome)}</div>`;
        area.innerHTML = `
            <div class="tri-card" id="triCard">
                <span class="tri-carimbo boa">Boa</span><span class="tri-carimbo nao">Não boa</span>
                <div class="tri-cab">
                    ${foto}
                    <div>
                        <p class="tri-nome">${esc(c.nome)}</p>
                        <div class="tri-sub">${ig ? '@' + esc(ig) : ''}${loc ? ' · ' + loc : ''}<br>Seguidores: ${esc(SEGUIDORES[c.seguidores] || c.seguidores || '-')} · Cadastro ${data(c.created_at)}</div>
                    </div>
                </div>
                ${tags ? `<div class="tri-tags">${tags}</div>` : ''}
                ${c.sobre ? `<p class="tri-sobre">${esc(c.sobre)}</p>` : ''}
                <div class="tri-links">${links || '<span class="tri-sem">Sem portfólio nem links</span>'}</div>
                <div class="tri-acoes">
                    <button class="tri-btn-nao" data-acao="motivos">✕ Não boa<kbd>←</kbd></button>
                    <button class="tri-btn-boa" data-acao="boa">✓ Boa<kbd>→</kbd></button>
                </div>
                <div class="tri-motivos" id="triMotivos">
                    ${MOTIVOS.map((m, i) => `<button data-motivo="${i}">${m}<kbd>${i + 1}</kbd></button>`).join('')}
                    <form class="tri-outro">
                        <input name="motivo" placeholder="Ou escreva outro motivo e aperte Enter" autocomplete="off">
                        <button type="submit">Salvar</button>
                    </form>
                </div>
                <div class="tri-mini">
                    <button data-acao="desfazer" ${feitas.length ? '' : 'disabled'}>↶ Desfazer</button>
                    <button data-acao="pular">Pular →</button>
                </div>
            </div>`;
        $('.tri-outro').addEventListener('submit', e => { e.preventDefault(); marcar(e.target.motivo.value); });
        if (!c.portfolio && !c.melhor_conteudo) abrirMotivos();
        ligarArraste($('#triCard'));
        /* pré-carrega a foto da próxima */
        if (fila[1] && fila[1].foto_perfil) new Image().src = fila[1].foto_perfil;
    }

    function abrirMotivos() {
        const el = $('#triMotivos');
        if (el) el.classList.add('show');
    }

    /* qual: 'boa', o índice de um MOTIVO, ou um texto escrito no campo */
    async function marcar(qual) {
        const c = fila[0];
        if (!c || ocupado) return;
        const boa = qual === 'boa';
        const motivo = boa ? null : typeof qual === 'number' ? MOTIVOS[qual] : String(qual || '').trim();
        if (!boa && !motivo) return;
        ocupado = true;
        const card = $('#triCard');
        if (card) { card.style.transform = `translateX(${boa ? 120 : -120}%) rotate(${boa ? 12 : -12}deg)`; card.style.opacity = '0'; }
        const { error } = await sb().rpc('triagem_marcar', { p_id: c.id, p_status: boa ? 'boa' : 'nao', p_motivo: motivo });
        ocupado = false;
        if (error) { alert('Não deu pra salvar: ' + error.message); render(); return; }
        fila.shift();
        feitas.push({ c, boa });
        if (boa) boas++; else naoBoas++;
        setTimeout(render, 120);
    }

    async function desfazer() {
        const ult = feitas[feitas.length - 1];
        if (!ult || ocupado) return;
        ocupado = true;
        const { error } = await sb().rpc('triagem_marcar', { p_id: ult.c.id, p_status: 'limpar', p_motivo: null });
        ocupado = false;
        if (error) { alert('Não deu pra desfazer: ' + error.message); return; }
        feitas.pop();
        if (ult.boa) boas--; else naoBoas--;
        fila.unshift(ult.c);
        render();
    }

    function pular() {
        if (fila.length < 2) return;
        fila.push(fila.shift());
        render();
    }

    /* Arrastar o card (dedo ou mouse): direita = boa, esquerda = abre os motivos */
    function ligarArraste(card) {
        if (!card) return;
        let x0 = null, dx = 0;
        const cBoa = card.querySelector('.tri-carimbo.boa'), cNao = card.querySelector('.tri-carimbo.nao');
        card.addEventListener('pointerdown', e => {
            if (e.target.closest('a, button, input')) return;
            x0 = e.clientX; dx = 0; card.classList.add('arrastando'); card.setPointerCapture(e.pointerId);
        });
        card.addEventListener('pointermove', e => {
            if (x0 === null) return;
            dx = e.clientX - x0;
            card.style.transform = `translateX(${dx}px) rotate(${dx / 25}deg)`;
            cBoa.style.opacity = Math.max(0, Math.min(1, dx / 100));
            cNao.style.opacity = Math.max(0, Math.min(1, -dx / 100));
        });
        const solta = () => {
            if (x0 === null) return;
            x0 = null; card.classList.remove('arrastando');
            if (dx > 110) { marcar('boa'); return; }
            card.style.transform = ''; cBoa.style.opacity = 0; cNao.style.opacity = 0;
            if (dx < -110) abrirMotivos();
        };
        card.addEventListener('pointerup', solta);
        card.addEventListener('pointercancel', solta);
    }

    function visivel() {
        return raiz && raiz.offsetParent !== null;
    }

    function teclado(e) {
        if (!visivel()) return;
        if (e.target.closest('input, textarea, select, [contenteditable]') || e.metaKey || e.ctrlKey || e.altKey) return;
        const c = fila[0];
        if (e.key === 'ArrowRight') { e.preventDefault(); marcar('boa'); }
        else if (e.key === 'ArrowLeft') { e.preventDefault(); abrirMotivos(); }
        else if (['1', '2', '3', '4'].includes(e.key) && $('#triMotivos.show')) marcar(+e.key - 1);
        else if (e.key === 'z' || e.key === 'Z') desfazer();
        else if (e.key === ' ') { e.preventDefault(); pular(); }
        else if ((e.key === 'p' || e.key === 'P') && c && (c.portfolio || c.melhor_conteudo)) window.open(url(c.portfolio || c.melhor_conteudo), '_blank', 'noopener');
    }

    function clique(e) {
        const b = e.target.closest('[data-acao], [data-motivo]');
        if (!b) return;
        if (b.dataset.motivo !== undefined) return marcar(+b.dataset.motivo);
        ({ boa: () => marcar('boa'), motivos: abrirMotivos, desfazer, pular })[b.dataset.acao]();
    }

    /* Monta a triagem dentro de el. Chamadas seguintes só recarregam a fila. */
    function mount(el) {
        if (raiz !== el) {
            if (!document.getElementById('triCss')) {
                const st = document.createElement('style');
                st.id = 'triCss'; st.textContent = CSS;
                document.head.appendChild(st);
            }
            raiz = el;
            raiz.innerHTML = `
                <div class="tri-wrap">
                    <div class="tri-topo"><h2>Triagem de creators</h2><div class="tri-cont" id="triCont"></div></div>
                    <div class="tri-barra"><div id="triBarra" style="width:0"></div></div>
                    <div id="triArea"></div>
                    <div class="tri-atalhos">Atalhos: <b>→</b> boa · <b>←</b> não boa e depois <b>1</b>–<b>4</b> pro motivo (ou escreva outro) · <b>P</b> abre o portfólio · <b>espaço</b> pula · <b>Z</b> desfaz<br>No celular, arraste o card pra direita (boa) ou pra esquerda (não boa).</div>
                </div>`;
            raiz.addEventListener('click', clique);
            document.addEventListener('keydown', teclado);
        }
        carregar();
    }

    window.Triagem = { mount };
})();
