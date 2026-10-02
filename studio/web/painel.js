// Painel local: lista projetos, roda as etapas e deixa revisar trecho a trecho.
const area = document.getElementById('area');
const listaProjetos = document.getElementById('lista-projetos');
const log = document.getElementById('log');
const logTitulo = document.getElementById('log-titulo');
const logLinhas = document.getElementById('log-linhas');

let slugAberto = null;

const api = async (rota, opcoes = {}) => {
  const res = await fetch(`/api${rota}`, {
    ...opcoes,
    headers: opcoes.body ? { 'content-type': 'application/json' } : undefined,
  });
  const dados = await res.json();
  if (!res.ok) throw new Error(dados.erro || `falhou: ${res.status}`);
  return dados;
};

const tempo = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${(s % 60).toFixed(1).padStart(4, '0')}`;
const arquivoUrl = (caminho) => `/arquivo?caminho=${encodeURIComponent(caminho)}`;

// Toda etapa longa vira tarefa: o painel pergunta o estado ate acabar.
async function acompanhar(id, titulo) {
  log.classList.remove('oculto');
  logTitulo.textContent = titulo;
  logLinhas.textContent = '';
  for (;;) {
    const tarefa = await api(`/tarefas/${id}`);
    logLinhas.textContent = tarefa.linhas.join('\n');
    if (tarefa.estado === 'pronto') {
      logLinhas.textContent += '\npronto.';
      setTimeout(() => log.classList.add('oculto'), 2500);
      return tarefa.resultado;
    }
    if (tarefa.estado === 'erro') {
      logLinhas.textContent += `\nerro: ${tarefa.erro}`;
      throw new Error(tarefa.erro);
    }
    await new Promise((r) => setTimeout(r, 700));
  }
}

async function carregarProjetos() {
  const projetos = await api('/projetos');
  listaProjetos.innerHTML = '';
  for (const p of projetos) {
    const li = document.createElement('li');
    const botao = document.createElement('button');
    botao.textContent = p.nome;
    botao.setAttribute('aria-current', String(p.slug === slugAberto));
    const small = document.createElement('small');
    small.textContent = p.temEdl ? 'edl pronta' : 'sem edl';
    botao.append(small);
    botao.onclick = () => abrir(p.slug);
    li.append(botao);
    listaProjetos.append(li);
  }
  return projetos;
}

async function abrir(slug, abaAtiva = 'roteiro') {
  slugAberto = slug;
  location.hash = `${slug}/${abaAtiva}`;
  const dados = await api(`/projetos/${slug}`);
  await carregarProjetos();
  area.innerHTML = '';
  const no = document.getElementById('tpl-projeto').content.cloneNode(true);
  const raiz = no.querySelector('.projeto');

  raiz.querySelector('.titulo').textContent = dados.nome;
  raiz.querySelector('.meta').textContent =
    `${dados.brutos.length} bruto(s) · perfil ${dados.perfil} · ${dados.caminhos.base}`;
  raiz.querySelector('.duracao .numero').textContent = dados.duracao.toFixed(1);

  const mostrarAba = (nome) => {
    raiz.querySelectorAll('.aba').forEach((a) => a.classList.toggle('ativa', a.dataset.aba === nome));
    raiz.querySelectorAll('.painel').forEach((p) => p.classList.toggle('oculto', p.dataset.painel !== nome));
    location.hash = `${slug}/${nome}`;
    if (nome === 'musica') carregarMusicas(raiz, slug);
  };
  for (const aba of raiz.querySelectorAll('.aba')) {
    aba.onclick = () => mostrarAba(aba.dataset.aba);
  }

  const roteiro = raiz.querySelector('.roteiro');
  roteiro.value = dados.roteiro;
  raiz.querySelector('.salvar-roteiro').onclick = async (e) => {
    await comBotao(e.target, () => api(`/projetos/${slug}/roteiro`, {
      method: 'PUT', body: JSON.stringify({ texto: roteiro.value }),
    }));
  };

  raiz.querySelector('.analisar').onclick = async (e) => {
    const semTranscricao = raiz.querySelector('.sem-transcricao').checked;
    await comBotao(e.target, async () => {
      await api(`/projetos/${slug}/roteiro`, { method: 'PUT', body: JSON.stringify({ texto: roteiro.value }) });
      const { tarefa } = await api(`/projetos/${slug}/analisar`, {
        method: 'POST', body: JSON.stringify({ transcrever: !semTranscricao }),
      });
      await acompanhar(tarefa, 'analisando os brutos');
      await abrir(slug);
    });
  };

  raiz.querySelector('.render').onclick = async (e) => {
    await comBotao(e.target, async () => {
      const { tarefa } = await api(`/projetos/${slug}/render`, {
        method: 'POST', body: JSON.stringify({ legenda: 'queimada' }),
      });
      await acompanhar(tarefa, 'gerando o corte');
      await abrir(slug);
    });
  };

  desenharTrechos(raiz, dados, slug);
  desenharSaida(raiz, dados);
  area.append(no);
  mostrarAba(abaAtiva);
}

function desenharTrechos(raiz, dados, slug) {
  const lista = raiz.querySelector('.trechos');
  const preview = raiz.querySelector('.preview-bruto');
  const contagem = raiz.querySelector('.contagem');
  lista.innerHTML = '';

  if (!dados.edl) {
    contagem.textContent = 'sem edl ainda: analise os brutos primeiro.';
    preview.classList.add('oculto');
    return;
  }

  const dentro = dados.edl.segmentos.filter((s) => s.incluir).length;
  contagem.textContent = `${dentro} de ${dados.edl.segmentos.length} trechos no corte`;
  if (dados.brutos[0]) preview.src = arquivoUrl(dados.brutos[0].arquivo);

  for (const seg of dados.edl.segmentos) {
    const li = document.createElement('li');
    li.className = `trecho${seg.incluir ? '' : ' fora'}`;

    const caixa = document.createElement('input');
    caixa.type = 'checkbox';
    caixa.checked = seg.incluir;
    caixa.onchange = async () => {
      const r = await api(`/projetos/${slug}/edl`, {
        method: 'PUT', body: JSON.stringify({ segmentos: [{ id: seg.id, incluir: caixa.checked }] }),
      });
      li.classList.toggle('fora', !caixa.checked);
      raiz.querySelector('.duracao .numero').textContent = r.duracao.toFixed(1);
    };

    const pular = document.createElement('button');
    pular.className = 'tempo';
    pular.textContent = tempo(seg.inicio);
    pular.onclick = () => {
      preview.src = arquivoUrl(seg.arquivo);
      preview.currentTime = seg.inicio;
      preview.play().catch(() => {});
    };

    const corpo = document.createElement('div');
    const texto = document.createElement('p');
    texto.className = 'texto';
    texto.textContent = seg.texto || '(sem fala transcrita)';
    corpo.append(texto);

    const tags = document.createElement('div');
    tags.className = 'tags';
    if (seg.take) tags.append(etiqueta(`linha ${seg.linhaRoteiro + 1} · take ${seg.take}`));
    if (seg.score !== null && seg.score !== undefined) tags.append(etiqueta(`casou ${(seg.score * 100).toFixed(0)}%`));
    if (!seg.incluir && seg.motivo) tags.append(etiqueta(seg.motivo, true));
    if (tags.children.length) corpo.append(tags);

    li.append(caixa, pular, corpo);
    lista.append(li);
  }

  raiz.querySelector('.marcar-todos').onclick = async () => {
    const mudancas = dados.edl.segmentos.map((s) => ({ id: s.id, incluir: true }));
    await api(`/projetos/${slug}/edl`, { method: 'PUT', body: JSON.stringify({ segmentos: mudancas }) });
    await abrir(slug);
  };
}

function etiqueta(texto, alerta = false) {
  const span = document.createElement('span');
  span.className = `etiqueta${alerta ? ' alerta' : ''}`;
  span.textContent = texto;
  return span;
}

async function carregarMusicas(raiz, slug) {
  const lista = raiz.querySelector('.musicas');
  lista.innerHTML = '<li class="fraco">carregando…</li>';
  let faixas = [];
  try {
    faixas = await api(`/projetos/${slug}/sugerir-musica`);
  } catch {
    lista.innerHTML = '<li class="fraco">analise os brutos antes de pedir sugestão de música.</li>';
    return;
  }
  lista.innerHTML = '';
  if (!faixas.length) {
    lista.innerHTML = '<li class="fraco">nenhuma faixa em musicas/. Jogue mp3 lá e clique em "analisar músicas".</li>';
    return;
  }
  for (const f of faixas) {
    const li = document.createElement('li');
    li.className = 'faixa';
    const nome = document.createElement('span');
    nome.className = 'nome';
    nome.textContent = f.nome;
    const dados = document.createElement('span');
    dados.className = 'dados';
    dados.textContent = `${f.bpm} bpm · ${f.duracao.toFixed(0)}s · drop ${f.drop ?? '—'} · nota ${f.nota}`;
    const usar = document.createElement('button');
    usar.className = 'botao';
    usar.textContent = 'gerar com essa';
    usar.onclick = async (e) => comBotao(e.target, async () => {
      const { tarefa } = await api(`/projetos/${slug}/render`, {
        method: 'POST',
        body: JSON.stringify({ legenda: 'queimada', musica: f.arquivo, alinharBeat: true, ganchoEm: 1 }),
      });
      await acompanhar(tarefa, `gerando com ${f.nome}`);
      await abrir(slug);
    });
    li.append(nome, dados, usar);
    lista.append(li);
  }
}

function desenharSaida(raiz, dados) {
  const caixa = raiz.querySelector('.saida-arquivos');
  const preview = raiz.querySelector('.preview-saida');
  caixa.innerHTML = '';
  if (!dados.saida.length) {
    caixa.innerHTML = '<p class="fraco">nada gerado ainda.</p>';
    preview.classList.add('oculto');
    return;
  }
  for (const s of dados.saida) {
    const a = document.createElement('a');
    a.href = arquivoUrl(s.caminho);
    a.textContent = s.nome;
    a.download = s.nome;
    caixa.append(a);
  }
  const video = dados.saida.find((s) => s.nome === 'corte-legendado.mp4') || dados.saida.find((s) => s.nome === 'corte.mp4');
  if (video) {
    preview.classList.remove('oculto');
    preview.src = arquivoUrl(video.caminho);
  } else preview.classList.add('oculto');
}

async function comBotao(botao, acao) {
  const texto = botao.textContent;
  botao.disabled = true;
  try {
    await acao();
  } catch (e) {
    alert(e.message);
  } finally {
    botao.disabled = false;
    botao.textContent = texto;
  }
}

document.getElementById('btn-novo').onclick = async () => {
  const nome = prompt('nome do vídeo');
  if (!nome) return;
  const { slug } = await api('/projetos', { method: 'POST', body: JSON.stringify({ nome }) });
  await abrir(slug);
};

document.getElementById('btn-musicas').onclick = async (e) => {
  await comBotao(e.target, async () => {
    const { tarefa } = await api('/musicas', { method: 'POST' });
    await acompanhar(tarefa, 'analisando as músicas');
  });
};

// Abre o que estiver no endereco, ou o ultimo projeto mexido.
const [slugUrl, abaUrl] = decodeURIComponent(location.hash.slice(1)).split('/');
const projetos = await carregarProjetos();
const inicial = projetos.find((p) => p.slug === slugUrl) || projetos[0];
if (inicial) await abrir(inicial.slug, abaUrl || 'roteiro');
