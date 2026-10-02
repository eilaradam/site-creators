import React from 'react';
import { AbsoluteFill, useCurrentFrame, useVideoConfig, spring } from 'remotion';
import { Bloco, Legenda as DadosLegenda } from './dados';

// Legenda karaoke em camada transparente: entra por cima do corte no editor.
export const Legenda: React.FC<{ dados: DadosLegenda }> = ({ dados }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const t = frame / fps;
  const { estilo, alvo } = dados;

  const bloco = dados.blocos.find((b) => t >= b.inicio && t <= b.fim);
  if (!bloco) return <AbsoluteFill />;

  return (
    <AbsoluteFill
      style={{
        justifyContent: 'flex-end',
        alignItems: 'center',
        paddingBottom: alvo.altura * (1 - estilo.posicaoVertical),
        paddingLeft: estilo.margemLateral,
        paddingRight: estilo.margemLateral,
      }}
    >
      <Frase bloco={bloco} dados={dados} t={t} frame={frame} fps={fps} />
    </AbsoluteFill>
  );
};

const Frase: React.FC<{
  bloco: Bloco;
  dados: DadosLegenda;
  t: number;
  frame: number;
  fps: number;
}> = ({ bloco, dados, t, frame, fps }) => {
  const { estilo } = dados;
  // A frase inteira entra com uma mola curta; a palavra ativa cresce sozinha.
  const entrada = spring({
    frame: frame - Math.round(bloco.inicio * fps),
    fps,
    config: { damping: 200, stiffness: 180 },
    durationInFrames: Math.round(fps * 0.22),
  });

  return (
    <div
      style={{
        display: 'flex',
        flexWrap: 'wrap',
        justifyContent: 'center',
        gap: estilo.tamanho * 0.34,
        fontFamily: `'${estilo.fonte}', system-ui, sans-serif`,
        fontWeight: 700,
        fontSize: estilo.tamanho,
        lineHeight: 1.15,
        textAlign: 'center',
        transform: `scale(${0.94 + entrada * 0.06})`,
        opacity: entrada,
      }}
    >
      {bloco.palavras.map((p, i) => {
        const ativa = t >= p.inicio && t <= p.fim;
        const escala = ativa ? estilo.popPalavraAtiva / 100 : 1;
        return (
          <span
            key={`${p.palavra}-${i}`}
            style={{
              color: ativa ? estilo.corDestaque : estilo.corTexto,
              WebkitTextStroke: `${estilo.espessuraContorno}px ${estilo.corContorno}`,
              paintOrder: 'stroke fill',
              transform: `scale(${escala})`,
              display: 'inline-block',
            }}
          >
            {estilo.maiusculas ? p.palavra.toUpperCase() : p.palavra}
          </span>
        );
      })}
    </div>
  );
};
