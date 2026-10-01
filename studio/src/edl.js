// EDL: o formato intermediario que todas as etapas leem e escrevem.
// Quem corta silencio, quem escolhe take, o painel e o render falam todos este JSON.
import { readFile, writeFile } from 'node:fs/promises';

export const VERSAO_EDL = 1;

export function novaEdl({ projeto, alvo = { largura: 1080, altura: 1920, fps: 30 } }) {
  const agora = new Date().toISOString();
  return {
    versao: VERSAO_EDL,
    projeto,
    alvo,
    criadoEm: agora,
    atualizadoEm: agora,
    segmentos: [],
    musica: null,
    legenda: { perfil: 'lara', estilo: 'karaoke' },
  };
}

export function segmento({ arquivo, inicio, fim, texto = '', linhaRoteiro = null, take = null, incluir = true, motivo = null, origem = 'silencio' }) {
  return { id: null, arquivo, inicio, fim, texto, linhaRoteiro, take, incluir, motivo, origem };
}

export function reindexar(edl) {
  edl.segmentos.forEach((s, i) => { s.id = i + 1; });
  return edl;
}

export function validar(edl) {
  const erros = [];
  if (edl.versao !== VERSAO_EDL) erros.push(`versao ${edl.versao} desconhecida (esperado ${VERSAO_EDL})`);
  if (!Array.isArray(edl.segmentos)) erros.push('segmentos precisa ser lista');
  else edl.segmentos.forEach((s, i) => {
    const onde = `segmento ${i + 1}`;
    if (!s.arquivo) erros.push(`${onde}: sem arquivo`);
    if (!(Number.isFinite(s.inicio) && Number.isFinite(s.fim))) erros.push(`${onde}: tempo invalido`);
    else if (s.fim <= s.inicio) erros.push(`${onde}: fim (${s.fim}) nao e maior que inicio (${s.inicio})`);
  });
  if (erros.length) throw new Error(`EDL invalida:\n- ${erros.join('\n- ')}`);
  return edl;
}

export const incluidos = (edl) => edl.segmentos.filter((s) => s.incluir);

export const duracaoFinal = (edl) =>
  incluidos(edl).reduce((t, s) => t + (s.fim - s.inicio), 0);

// Tabela bruto -> corte final. A legenda depende disso para nao sair dessincronizada.
export function mapaDeTempo(edl) {
  let offset = 0;
  const trechos = incluidos(edl).map((s) => {
    const t = { arquivo: s.arquivo, inicio: s.inicio, fim: s.fim, offset };
    offset += s.fim - s.inicio;
    return t;
  });
  return {
    trechos,
    duracao: offset,
    // Devolve o instante no corte final, ou null se o instante foi cortado fora.
    paraFinal(arquivo, t) {
      for (const trecho of trechos) {
        if (trecho.arquivo !== arquivo) continue;
        if (t >= trecho.inicio && t <= trecho.fim) return trecho.offset + (t - trecho.inicio);
      }
      return null;
    },
    // Encaixa um intervalo do bruto no corte final, aparando o que caiu fora.
    intervaloParaFinal(arquivo, inicio, fim) {
      for (const trecho of trechos) {
        if (trecho.arquivo !== arquivo) continue;
        if (fim <= trecho.inicio || inicio >= trecho.fim) continue;
        const a = Math.max(inicio, trecho.inicio);
        const b = Math.min(fim, trecho.fim);
        if (b <= a) continue;
        return { inicio: trecho.offset + (a - trecho.inicio), fim: trecho.offset + (b - trecho.inicio) };
      }
      return null;
    },
  };
}

export async function salvar(caminho, edl) {
  edl.atualizadoEm = new Date().toISOString();
  validar(reindexar(edl));
  await writeFile(caminho, JSON.stringify(edl, null, 2) + '\n', 'utf8');
  return caminho;
}

export async function carregar(caminho) {
  return validar(JSON.parse(await readFile(caminho, 'utf8')));
}
