/* Modelos de título animado do robô de edição da Lara.
   Cada modelo recebe o texto, as cores e a fonte (arquivo em public/fontes) e renderiza com fundo transparente,
   para o robô sobrepor no vídeo com FFmpeg. As prévias da aba "Modelos de título" do admin saem daqui. */
import React, { useEffect, useState } from 'react';
import { AbsoluteFill, continueRender, delayRender, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Easing } from 'remotion';

export type TituloProps = {
  texto: string;            // "|" quebra em linhas ou itens (empilhado, lista)
  destaque?: string;        // palavra(s) do texto que ganham a cor de destaque
  numero?: string;          // contador: "2.400"
  prefixo?: string;         // contador: "R$ "
  cor?: string;
  corDestaque?: string;
  corFundo?: string;
  arquivoFonte?: string;    // ex.: "Montserrat-ExtraBold.ttf" (pasta public/fontes)
  posicao?: number;         // centro do título em fração da altura (0 = topo, 1 = base)
  duracao_s?: number;
};

const PADRAO: Required<Omit<TituloProps, 'destaque' | 'numero' | 'prefixo'>> = {
  texto: 'você sabe quanto valem as suas milhas?', cor: '#FFFFFF', corDestaque: '#C8441A', corFundo: '#1B1B1B',
  arquivoFonte: 'Montserrat-ExtraBold.ttf', posicao: 0.32, duracao_s: 2.6,
};

const FONTE = 'TituloLara';
function useFonte(arquivo: string) {
  const [h] = useState(() => delayRender('fonte ' + arquivo));
  useEffect(() => {
    const f = new FontFace(FONTE, `url(${staticFile('fontes/' + arquivo)})`);
    f.load().then(x => { document.fonts.add(x); continueRender(h); }).catch(() => continueRender(h));
  }, [arquivo, h]);
}

const ehDestaque = (w: string, destaque?: string) =>
  !!destaque && destaque.toLowerCase().split(/\s+/).includes(w.toLowerCase().replace(/[.,!?;:]+$/, ''));

/* entrada com mola + saída rápida no fim (todo título some sozinho) */
function useEntradaSaida(atraso = 0) {
  const frame = useCurrentFrame(), { fps, durationInFrames } = useVideoConfig();
  const entra = spring({ frame: frame - atraso, fps, config: { damping: 12, stiffness: 180, mass: 0.6 } });
  const sai = interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return { entra, sai, frame, fps };
}

const Base: React.FC<{ p: TituloProps; children: React.ReactNode }> = ({ p, children }) => {
  useFonte(p.arquivoFonte || PADRAO.arquivoFonte);
  return (
    <AbsoluteFill style={{ fontFamily: FONTE, color: p.cor || PADRAO.cor }}>
      <div style={{ position: 'absolute', left: 70, right: 70, top: `${(p.posicao ?? PADRAO.posicao) * 100}%`, transform: 'translateY(-50%)',
        display: 'flex', flexDirection: 'column', alignItems: 'center', textAlign: 'center' }}>{children}</div>
    </AbsoluteFill>
  );
};

/* 1. Caixa pop: frase numa caixa de cor sólida que entra com pulinho */
export const CaixaPop: React.FC<TituloProps> = (p) => {
  const { entra, sai } = useEntradaSaida();
  const s = interpolate(entra, [0, 1], [0.6, 1]);
  return (
    <Base p={p}>
      <div style={{ transform: `scale(${s}) rotate(${interpolate(entra, [0, 1], [-4, -1.5])}deg)`, opacity: Math.min(1, entra * 2) * sai,
        background: p.corDestaque || PADRAO.corDestaque, padding: '22px 40px', borderRadius: 18, fontSize: 84, lineHeight: 1.05,
        boxShadow: '0 14px 0 rgba(0,0,0,.25)' }}>{p.texto}</div>
    </Base>
  );
};

/* 2. Palavra por palavra: cada palavra sobe na hora dela; o destaque muda de cor */
export const PalavraPorPalavra: React.FC<TituloProps> = (p) => {
  const frame = useCurrentFrame(), { fps, durationInFrames } = useVideoConfig();
  const palavras = p.texto.split(/\s+/);
  const passo = Math.max(3, Math.floor((durationInFrames * 0.45) / palavras.length));
  const sai = interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Base p={p}>
      <div style={{ fontSize: 96, lineHeight: 1.08, opacity: sai, textShadow: '0 6px 24px rgba(0,0,0,.45)' }}>
        {palavras.map((w, i) => {
          const e = spring({ frame: frame - i * passo, fps, config: { damping: 14, stiffness: 200 } });
          return <span key={i} style={{ display: 'inline-block', margin: '0 12px', transform: `translateY(${(1 - e) * 60}px)`, opacity: e,
            color: ehDestaque(w, p.destaque) ? p.corDestaque || PADRAO.corDestaque : undefined }}>{w}</span>;
        })}
      </div>
    </Base>
  );
};

/* 3. Máquina de escrever: letra por letra com cursor piscando */
export const MaquinaEscrever: React.FC<TituloProps> = (p) => {
  const frame = useCurrentFrame(), { durationInFrames } = useVideoConfig();
  const n = Math.round(interpolate(frame, [2, durationInFrames * 0.55], [0, p.texto.length], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }));
  const sai = interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Base p={p}>
      <div style={{ fontSize: 80, lineHeight: 1.15, opacity: sai, background: p.corFundo || PADRAO.corFundo, padding: '18px 30px', borderRadius: 14 }}>
        {p.texto.slice(0, n)}<span style={{ opacity: Math.floor(frame / 8) % 2 ? 0 : 1, color: p.corDestaque || PADRAO.corDestaque }}>▍</span>
      </div>
    </Base>
  );
};

/* 4. Marcador: o destaque ganha uma faixa de marca-texto que passa por trás */
export const Marcador: React.FC<TituloProps> = (p) => {
  const { entra, sai, frame } = useEntradaSaida();
  const risco = interpolate(frame, [8, 20], [0, 100], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  return (
    <Base p={p}>
      <div style={{ fontSize: 92, lineHeight: 1.15, opacity: Math.min(1, entra * 2) * sai, transform: `translateY(${(1 - entra) * 40}px)`, textShadow: '0 4px 18px rgba(0,0,0,.35)' }}>
        {p.texto.split(/\s+/).map((w, i) => ehDestaque(w, p.destaque)
          ? <span key={i} style={{ position: 'relative', display: 'inline-block', margin: '0 12px' }}>
              <span style={{ position: 'absolute', left: -14, top: '18%', height: '72%', width: `calc(${risco}% + 28px)`, background: p.corDestaque || PADRAO.corDestaque,
                borderRadius: 10, transform: 'rotate(-2deg)', zIndex: 0 }} />
              <span style={{ position: 'relative' }}>{w}</span></span>
          : <span key={i} style={{ display: 'inline-block', margin: '0 12px' }}>{w}</span>)}
      </div>
    </Base>
  );
};

/* 5. Empilhado: linhas ("|") alternando tamanho, entrando de lados opostos */
export const Empilhado: React.FC<TituloProps> = (p) => {
  const frame = useCurrentFrame(), { fps, durationInFrames } = useVideoConfig();
  const linhas = p.texto.split('|').map(s => s.trim()).filter(Boolean);
  const sai = interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Base p={p}>
      {linhas.map((l, i) => {
        const e = spring({ frame: frame - i * 5, fps, config: { damping: 15, stiffness: 170 } });
        const grande = i % 2 === 0;
        return <div key={i} style={{ fontSize: grande ? 120 : 64, lineHeight: 1.02, opacity: e * sai, transform: `translateX(${(1 - e) * (i % 2 ? 300 : -300)}px)`,
          color: grande ? undefined : p.corDestaque || PADRAO.corDestaque, textTransform: grande ? 'uppercase' : 'none', textShadow: '0 6px 22px rgba(0,0,0,.4)' }}>{l}</div>;
      })}
    </Base>
  );
};

/* 6. Contador: número que sobe até o valor, com o texto embaixo */
export const Contador: React.FC<TituloProps> = (p) => {
  const { entra, sai, frame } = useEntradaSaida();
  const { durationInFrames } = useVideoConfig();
  const alvo = Number(String(p.numero || '0').replace(/\./g, '').replace(',', '.')) || 0;
  const v = alvo * interpolate(frame, [3, durationInFrames * 0.5], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp', easing: Easing.out(Easing.cubic) });
  const casas = String(p.numero || '').includes(',') ? 2 : 0;
  return (
    <Base p={p}>
      <div style={{ fontSize: 170, lineHeight: 1, color: p.corDestaque || PADRAO.corDestaque, opacity: sai, transform: `scale(${interpolate(entra, [0, 1], [0.7, 1])})`,
        textShadow: '0 8px 30px rgba(0,0,0,.45)', fontVariantNumeric: 'tabular-nums' }}>
        {(p.prefixo || '') + v.toLocaleString('pt-BR', { minimumFractionDigits: casas, maximumFractionDigits: casas })}
      </div>
      <div style={{ fontSize: 58, marginTop: 10, opacity: Math.min(1, entra * 1.5) * sai, textShadow: '0 4px 18px rgba(0,0,0,.45)' }}>{p.texto}</div>
    </Base>
  );
};

/* 7. Etiqueta: adesivo inclinado com borda branca, quica na entrada (igual sticker do CapCut) */
export const Etiqueta: React.FC<TituloProps> = (p) => {
  const { entra, sai, frame, fps } = useEntradaSaida();
  const balanco = Math.sin(frame / fps * 5) * 1.2;
  return (
    <Base p={p}>
      <div style={{ transform: `scale(${entra}) rotate(${-6 + balanco}deg)`, opacity: sai, background: p.corDestaque || PADRAO.corDestaque,
        border: '8px solid #FFFFFF', borderRadius: 26, padding: '16px 34px', fontSize: 74, boxShadow: '0 16px 30px rgba(0,0,0,.35)' }}>{p.texto}</div>
    </Base>
  );
};

/* 8. Lista com check: itens ("|") aparecendo um por um com ✓ */
export const ListaCheck: React.FC<TituloProps> = (p) => {
  const frame = useCurrentFrame(), { fps, durationInFrames } = useVideoConfig();
  const itens = p.texto.split('|').map(s => s.trim()).filter(Boolean);
  const passo = Math.max(5, Math.floor((durationInFrames * 0.5) / itens.length));
  const sai = interpolate(frame, [durationInFrames - 8, durationInFrames - 1], [1, 0], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });
  return (
    <Base p={p}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 18, alignItems: 'flex-start', opacity: sai }}>
        {itens.map((it, i) => {
          const e = spring({ frame: frame - i * passo, fps, config: { damping: 14, stiffness: 190 } });
          return <div key={i} style={{ display: 'flex', alignItems: 'center', gap: 22, fontSize: 64, opacity: e, transform: `translateX(${(1 - e) * -80}px)`,
            background: p.corFundo || PADRAO.corFundo, padding: '12px 26px 12px 14px', borderRadius: 16 }}>
            <span style={{ width: 64, height: 64, borderRadius: 32, background: p.corDestaque || PADRAO.corDestaque, display: 'flex', alignItems: 'center',
              justifyContent: 'center', fontSize: 40, transform: `scale(${e})` }}>✓</span>{it}</div>;
        })}
      </div>
    </Base>
  );
};

export const MODELOS = {
  "caixa-pop": { nome: 'Caixa pop', componente: CaixaPop, exemplo: { texto: 'quase paguei a passagem inteira' } },
  "palavra-por-palavra": { nome: 'Palavra por palavra', componente: PalavraPorPalavra, exemplo: { texto: 'você sabe quanto valem as suas milhas?', destaque: 'milhas?' } },
  "maquina-escrever": { nome: 'Máquina de escrever', componente: MaquinaEscrever, exemplo: { texto: 'o buscador que acha a passagem mais barata' } },
  marcador: { nome: 'Marca-texto', componente: Marcador, exemplo: { texto: 'pontos parados viram dinheiro', destaque: 'dinheiro' } },
  empilhado: { nome: 'Empilhado', componente: Empilhado, exemplo: { texto: 'smiles|compara com|latam pass|e tudoazul' } },
  contador: { nome: 'Contador', componente: Contador, exemplo: { texto: 'que eu quase gastei', numero: '2.400', prefixo: 'R$ ' } },
  etiqueta: { nome: 'Etiqueta', componente: Etiqueta, exemplo: { texto: 'sem mensalidade' } },
  "lista-check": { nome: 'Lista com check', componente: ListaCheck, exemplo: { texto: 'escolhe o destino|compara os programas|mostra o mais barato' } },
} as const;
