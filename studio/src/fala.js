// Silencio detectado -> regioes de fala utilizaveis.
// Esta etapa nao precisa de transcricao: e o corte barato que ja resolve pausa e respiro.

export const PADROES_FALA = {
  padding: 0.12,        // folga em cada ponta para nao decapitar palavra
  gapMinimo: 0.22,      // pausas menores que isso nao viram corte
  duracaoMinima: 0.35,  // trecho menor que isso costuma ser estalo, nao fala
};

export function regioesDeFala({ duracao, silencios, ...opcoes }) {
  const { padding, gapMinimo, duracaoMinima } = { ...PADROES_FALA, ...opcoes };
  if (!Number.isFinite(duracao) || duracao <= 0) throw new Error('duracao invalida');

  const janelas = [...silencios]
    .map((s) => ({ inicio: Math.max(0, s.inicio), fim: Math.min(duracao, s.fim) }))
    .filter((s) => s.fim > s.inicio)
    .sort((a, b) => a.inicio - b.inicio);

  // Inverte: o que nao e silencio e fala.
  const falas = [];
  let cursor = 0;
  for (const s of janelas) {
    if (s.inicio > cursor) falas.push({ inicio: cursor, fim: s.inicio });
    cursor = Math.max(cursor, s.fim);
  }
  if (cursor < duracao) falas.push({ inicio: cursor, fim: duracao });

  // Folga nas pontas, sem invadir o vizinho nem estourar o arquivo.
  const comFolga = falas.map((f, i) => {
    const anterior = falas[i - 1];
    const seguinte = falas[i + 1];
    const limiteEsq = anterior ? (anterior.fim + f.inicio) / 2 : 0;
    const limiteDir = seguinte ? (f.fim + seguinte.inicio) / 2 : duracao;
    return {
      inicio: Math.max(limiteEsq, f.inicio - padding),
      fim: Math.min(limiteDir, f.fim + padding),
    };
  });

  // Junta o que ficou perto demais para valer um corte.
  const juntas = [];
  for (const f of comFolga) {
    const ultima = juntas[juntas.length - 1];
    if (ultima && f.inicio - ultima.fim < gapMinimo) ultima.fim = Math.max(ultima.fim, f.fim);
    else juntas.push({ ...f });
  }

  return juntas.filter((f) => f.fim - f.inicio >= duracaoMinima);
}

// Quanto tempo o corte de silencio economiza.
export function economia({ duracao, regioes }) {
  const falado = regioes.reduce((t, r) => t + (r.fim - r.inicio), 0);
  return {
    duracaoOriginal: duracao,
    duracaoFalada: falado,
    segundosCortados: Math.max(0, duracao - falado),
    proporcao: duracao > 0 ? falado / duracao : 0,
  };
}
