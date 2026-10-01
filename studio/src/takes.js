// Escolha de take: casa o que foi falado com as linhas do roteiro e mantem so o take bom.
// Sem roteiro, agrupa tentativas parecidas que vieram em sequencia e mantem a ultima.
import { palavras as todasPalavras } from './transcricao.js';
import { segmento } from './edl.js';

// Fala que e so muleta nao vira segmento.
export const MULETAS = [
  'ah', 'aah', 'ahn', 'ahm', 'eh', 'hum', 'hmm', 'uhum', 'ok', 'ta', 'tipo',
  'entao', 'peraí', 'perai', 'pera', 'calma', 'de novo', 'denovo', 'corta',
  'corta isso', 'espera', 'merda', 'droga', 'errei', 'ops', 'nao', 'sim', 'ja',
];

export const PADROES_TAKES = {
  limiar: 0.52,      // similaridade minima para dizer que a fala e aquela linha
  margem: 0.08,      // quanto o ultimo take pode ser pior que o melhor e ainda ganhar
  criterio: 'ultimo', // 'ultimo' (convencao de gravacao) ou 'melhor'
  ordem: 'roteiro',   // 'roteiro' ou 'gravacao'
};

export function normalizar(texto) {
  return String(texto || '')
    .normalize('NFD').replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function bigramas(s) {
  const t = ` ${s} `;
  const saida = new Map();
  for (let i = 0; i < t.length - 1; i++) {
    const par = t.slice(i, i + 2);
    saida.set(par, (saida.get(par) || 0) + 1);
  }
  return saida;
}

// Dice sobre bigramas de caractere: aguenta flexao, plural e erro de transcricao.
export function similaridade(a, b) {
  const x = normalizar(a);
  const y = normalizar(b);
  if (!x || !y) return 0;
  if (x === y) return 1;
  const ba = bigramas(x);
  const bb = bigramas(y);
  let comuns = 0;
  let totalA = 0;
  let totalB = 0;
  for (const n of ba.values()) totalA += n;
  for (const [par, n] of bb) {
    totalB += n;
    if (ba.has(par)) comuns += Math.min(n, ba.get(par));
  }
  return (2 * comuns) / (totalA + totalB);
}

export function soMuleta(texto) {
  const t = normalizar(texto);
  if (!t) return true;
  const partes = t.split(' ');
  if (partes.length > 4) return false;
  return partes.every((p) => MULETAS.includes(p)) || MULETAS.includes(t);
}

// Roteiro em texto -> linhas de fala. Descarta cabecalho de cena e marcacao de acao.
export function lerRoteiro(texto) {
  return String(texto || '')
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean)
    .filter((l) => !/^(cena|bloco|take|gancho|cta|corte|b-?roll)\s*\d*\s*[:.\-–]?\s*$/i.test(l))
    .filter((l) => !/^#{1,6}\s/.test(l))
    .map((l) => l
      .replace(/^(cena|bloco)\s*\d+\s*[:.\-–]\s*/i, '')
      .replace(/^[-*>\d.)\s]+/, '')
      .replace(/\[[^\]]*\]/g, ' ')
      .replace(/\([^)]*\)/g, ' ')
      .replace(/\s+/g, ' ')
      .trim())
    .filter((l) => normalizar(l).split(' ').length >= 2);
}

// Junta as palavras da transcricao dentro de cada regiao de fala.
export function montarFalas(transcricao, regioes) {
  const palavras = todasPalavras(transcricao);
  return regioes.map((r, i) => {
    const dentro = palavras.filter((p) => {
      const centro = (p.inicio + p.fim) / 2;
      return centro >= r.inicio && centro <= r.fim;
    });
    const probs = dentro.map((p) => p.prob).filter((p) => p > 0);
    return {
      indice: i,
      inicio: r.inicio,
      fim: r.fim,
      texto: dentro.map((p) => p.palavra).join(' ').replace(/\s+/g, ' ').trim(),
      palavras: dentro,
      confianca: probs.length ? Number((probs.reduce((a, b) => a + b, 0) / probs.length).toFixed(3)) : null,
    };
  });
}

// Cada fala aponta para a linha do roteiro que ela esta tentando dizer.
export function alinhar({ falas, linhas, limiar = PADROES_TAKES.limiar }) {
  let ancora = 0;
  return falas.map((fala) => {
    if (soMuleta(fala.texto)) {
      return { ...fala, linhaRoteiro: null, score: 0, motivo: 'so muleta ou ruido' };
    }
    const janela = [];
    for (let i = Math.max(0, ancora - 1); i <= Math.min(linhas.length - 1, ancora + 3); i++) janela.push(i);

    let melhor = maiorScore(fala.texto, linhas, janela);
    if (melhor.score < limiar) {
      const global = maiorScore(fala.texto, linhas, linhas.map((_, i) => i));
      if (global.score > melhor.score) melhor = global;
    }
    if (melhor.score < limiar) {
      return { ...fala, linhaRoteiro: null, score: Number(melhor.score.toFixed(3)), motivo: 'fora do roteiro' };
    }
    ancora = Math.max(ancora, melhor.indice);
    return { ...fala, linhaRoteiro: melhor.indice, score: Number(melhor.score.toFixed(3)), motivo: null };
  });
}

function maiorScore(texto, linhas, indices) {
  let melhor = { indice: -1, score: 0 };
  for (const i of indices) {
    const score = similaridade(texto, linhas[i]);
    if (score > melhor.score) melhor = { indice: i, score };
  }
  return melhor;
}

// Varias falas na mesma linha = varios takes. Fica um.
export function escolherTakes(falasAlinhadas, { criterio = PADROES_TAKES.criterio, margem = PADROES_TAKES.margem } = {}) {
  const grupos = new Map();
  for (const fala of falasAlinhadas) {
    if (fala.linhaRoteiro === null) continue;
    if (!grupos.has(fala.linhaRoteiro)) grupos.set(fala.linhaRoteiro, []);
    grupos.get(fala.linhaRoteiro).push(fala);
  }

  const decisao = new Map();
  for (const [linha, takes] of grupos) {
    takes.sort((a, b) => a.inicio - b.inicio);
    const melhorScore = Math.max(...takes.map((t) => t.score));
    let escolhido;
    if (criterio === 'melhor') {
      escolhido = takes.reduce((a, b) => (b.score > a.score ? b : a));
    } else {
      // O ultimo take ganha, desde que nao tenha saido bem pior que o melhor.
      const aceitaveis = takes.filter((t) => t.score >= melhorScore - margem);
      escolhido = aceitaveis[aceitaveis.length - 1] || takes[takes.length - 1];
    }
    takes.forEach((t, i) => {
      decisao.set(t.indice, {
        linha,
        take: i + 1,
        totalTakes: takes.length,
        escolhido: t === escolhido,
      });
    });
  }
  return decisao;
}

// Sem roteiro: tentativas seguidas e parecidas sao o mesmo trecho. Mantem a ultima.
export function agruparRepeticoes(falas, { limiar = 0.62 } = {}) {
  const grupos = [];
  for (const fala of falas) {
    const ultimo = grupos[grupos.length - 1];
    if (ultimo && similaridade(ultimo[ultimo.length - 1].texto, fala.texto) >= limiar) ultimo.push(fala);
    else grupos.push([fala]);
  }
  const decisao = new Map();
  grupos.forEach((grupo, g) => {
    grupo.forEach((fala, i) => {
      decisao.set(fala.indice, {
        linha: g,
        take: i + 1,
        totalTakes: grupo.length,
        escolhido: i === grupo.length - 1,
      });
    });
  });
  return decisao;
}

// Falas + decisao -> segmentos de EDL, na ordem pedida.
export function montarSegmentos({ arquivo, falas, decisao, linhas = [], ordem = PADROES_TAKES.ordem }) {
  const segmentos = falas.map((fala) => {
    const d = decisao.get(fala.indice);
    const incluir = d ? d.escolhido : false;
    let motivo = null;
    if (!incluir) {
      motivo = d
        ? `take ${d.take} de ${d.totalTakes}${d.totalTakes > 1 ? ' (sobrou)' : ''}`
        : fala.motivo || 'fora do roteiro';
    }
    return {
      ...segmento({
        arquivo,
        inicio: fala.inicio,
        fim: fala.fim,
        texto: fala.texto,
        linhaRoteiro: d ? d.linha : null,
        take: d ? d.take : null,
        incluir,
        motivo,
        origem: d ? 'take' : 'extra',
      }),
      score: fala.score ?? null,
      confianca: fala.confianca ?? null,
      textoRoteiro: d && linhas[d.linha] ? linhas[d.linha] : null,
      inicioGravacao: fala.inicio,
    };
  });

  if (ordem === 'roteiro') {
    segmentos.sort((a, b) => {
      const la = a.linhaRoteiro ?? Number.MAX_SAFE_INTEGER;
      const lb = b.linhaRoteiro ?? Number.MAX_SAFE_INTEGER;
      if (la !== lb) return la - lb;
      return a.inicioGravacao - b.inicioGravacao;
    });
  }
  return segmentos;
}
