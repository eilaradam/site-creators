// Legenda no estilo da conta: blocos curtos, palavra ativa em vermelho.
// Gera .ass (karaoke, para queimar com libass) e .srt (para importar em outro editor).
import { writeFile } from 'node:fs/promises';
import { mapaDeTempo, duracaoFinal } from './edl.js';
import { palavras as todasPalavras } from './transcricao.js';

// ASS usa &HAABBGGRR: alpha primeiro e os canais invertidos.
export function corAss(hex, alpha = 0) {
  const m = String(hex).replace('#', '').trim();
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  const r = n.slice(0, 2);
  const g = n.slice(2, 4);
  const b = n.slice(4, 6);
  const a = alpha.toString(16).padStart(2, '0');
  return `&H${a}${b}${g}${r}`.toUpperCase();
}

export function tempoAss(s) {
  const t = Math.max(0, s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const seg = Math.floor(t % 60);
  const cs = Math.round((t - Math.floor(t)) * 100);
  return `${h}:${String(m).padStart(2, '0')}:${String(seg).padStart(2, '0')}.${String(cs).padStart(2, '0')}`;
}

export function tempoSrt(s) {
  const t = Math.max(0, s);
  const h = Math.floor(t / 3600);
  const m = Math.floor((t % 3600) / 60);
  const seg = Math.floor(t % 60);
  const ms = Math.round((t - Math.floor(t)) * 1000);
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:${String(seg).padStart(2, '0')},${String(ms).padStart(3, '0')}`;
}

// Palavras do bruto -> palavras no tempo do corte final (so o que sobreviveu ao corte).
export function palavrasNoCorte({ edl, transcricoes }) {
  const mapa = mapaDeTempo(edl);
  const saida = [];
  for (const [arquivo, transcricao] of Object.entries(transcricoes)) {
    for (const p of todasPalavras(transcricao)) {
      const janela = mapa.intervaloParaFinal(arquivo, p.inicio, p.fim);
      if (!janela) continue;
      saida.push({ inicio: janela.inicio, fim: janela.fim, palavra: p.palavra, prob: p.prob ?? 0 });
    }
  }
  return saida.sort((a, b) => a.inicio - b.inicio);
}

// Agrupa palavras em blocos curtos de leitura, quebrando em pausa longa.
export function montarBlocos(palavras, estilo) {
  const { palavrasPorBloco = 3, maxCaracteres = 24, pausaQuebraBloco = 0.5 } = estilo;
  const blocos = [];
  let atual = null;
  for (const p of palavras) {
    const pausa = atual ? p.inicio - atual.fim : 0;
    const caracteres = atual ? atual.palavras.map((x) => x.palavra).join(' ').length + 1 + p.palavra.length : p.palavra.length;
    const cheio = atual && (atual.palavras.length >= palavrasPorBloco || caracteres > maxCaracteres);
    if (!atual || cheio || pausa >= pausaQuebraBloco) {
      atual = { inicio: p.inicio, fim: p.fim, palavras: [p] };
      blocos.push(atual);
    } else {
      atual.palavras.push(p);
      atual.fim = p.fim;
    }
  }
  return blocos.map((b) => ({ ...b, texto: b.palavras.map((p) => p.palavra).join(' ') }));
}

function escaparAss(texto) {
  return texto.replace(/\\/g, '\\\\').replace(/\{/g, '\\{').replace(/\}/g, '\\}');
}

export function gerarAss({ blocos, estilo, alvo }) {
  const e = estilo;
  const largura = alvo.largura ?? 1080;
  const altura = alvo.altura ?? 1920;
  // MarginV no ASS conta de baixo para cima com alinhamento 2 (centro inferior).
  const margemBaixo = Math.round(altura * (1 - (e.posicaoVertical ?? 0.74)));
  const fonte = e.fonte || 'DejaVu Sans';

  const cabecalho = [
    '[Script Info]',
    'ScriptType: v4.00+',
    'WrapStyle: 2',
    'ScaledBorderAndShadow: yes',
    'YCbCr Matrix: TV.709',
    `PlayResX: ${largura}`,
    `PlayResY: ${altura}`,
    '',
    '[V4+ Styles]',
    'Format: Name, Fontname, Fontsize, PrimaryColour, SecondaryColour, OutlineColour, BackColour, Bold, Italic, Underline, StrikeOut, ScaleX, ScaleY, Spacing, Angle, BorderStyle, Outline, Shadow, Alignment, MarginL, MarginR, MarginV, Encoding',
    [
      'Style: Studio', fonte, e.tamanho ?? 76,
      corAss(e.corTexto ?? '#FFFFFF'),
      corAss(e.corDestaque ?? '#C8441A'),
      corAss(e.corContorno ?? '#1B1B1B'),
      corAss(e.corContorno ?? '#1B1B1B', 128),
      e.negrito === false ? 0 : -1, 0, 0, 0,
      100, 100, 0, 0, 1,
      e.espessuraContorno ?? 6, e.sombra ?? 2, 2,
      e.margemLateral ?? 90, e.margemLateral ?? 90, margemBaixo, 1,
    ].join(','),
    '',
    '[Events]',
    'Format: Layer, Start, End, Style, Name, MarginL, MarginR, MarginV, Effect, Text',
  ];

  const corTexto = corAss(e.corTexto ?? '#FFFFFF');
  const corDestaque = corAss(e.corDestaque ?? '#C8441A');
  const pop = e.popPalavraAtiva ?? 106;
  const eventos = [];

  for (const bloco of blocos) {
    // Um evento por palavra: o bloco inteiro aparece e a palavra que esta sendo dita acende.
    bloco.palavras.forEach((ativa, i) => {
      const inicio = i === 0 ? bloco.inicio : ativa.inicio;
      const fim = i === bloco.palavras.length - 1 ? bloco.fim : bloco.palavras[i + 1].inicio;
      if (fim <= inicio) return;
      const partes = bloco.palavras.map((p, j) => {
        const texto = escaparAss(e.maiusculas ? p.palavra.toUpperCase() : p.palavra);
        if (j !== i) return `{\\c${corTexto}\\fscx100\\fscy100}${texto}`;
        return `{\\c${corDestaque}\\fscx${pop}\\fscy${pop}}${texto}`;
      });
      eventos.push(
        `Dialogue: 0,${tempoAss(inicio)},${tempoAss(fim)},Studio,,0,0,0,,${partes.join(' ')}`
      );
    });
  }

  return `${cabecalho.join('\n')}\n${eventos.join('\n')}\n`;
}

export function gerarSrt(blocos, { maiusculas = false } = {}) {
  return blocos
    .map((b, i) => {
      const texto = maiusculas ? b.texto.toUpperCase() : b.texto;
      return `${i + 1}\n${tempoSrt(b.inicio)} --> ${tempoSrt(b.fim)}\n${texto}\n`;
    })
    .join('\n');
}

// Caminho curto: EDL + transcricoes -> arquivos de legenda em disco.
export async function escreverLegendas({ edl, transcricoes, perfil, caminhoAss, caminhoSrt, caminhoJson }) {
  const estilo = perfil.legenda;
  const alvo = edl.alvo || perfil.alvo;
  const blocos = montarBlocos(palavrasNoCorte({ edl, transcricoes }), estilo);
  if (caminhoAss) await writeFile(caminhoAss, gerarAss({ blocos, estilo, alvo }), 'utf8');
  if (caminhoSrt) await writeFile(caminhoSrt, gerarSrt(blocos, estilo), 'utf8');
  // O Remotion le este JSON para animar a legenda em cima do corte.
  if (caminhoJson) {
    await writeFile(caminhoJson, JSON.stringify({ alvo, estilo, duracao: duracaoFinal(edl), blocos }, null, 2), 'utf8');
  }
  return { blocos, total: blocos.length };
}
