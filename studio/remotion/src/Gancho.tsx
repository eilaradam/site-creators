import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';

// Cartela de abertura na identidade: grafite com a palavra-chave em vermelho.
export const Gancho: React.FC<{ titulo: string; destaque: string }> = ({ titulo, destaque }) => {
  const frame = useCurrentFrame();
  const { fps, width } = useVideoConfig();
  const entrada = interpolate(frame, [0, fps * 0.3], [0, 1], { extrapolateRight: 'clamp' });
  const saida = interpolate(frame, [fps * 1.5, fps * 1.8], [1, 0], { extrapolateLeft: 'clamp' });

  return (
    <AbsoluteFill
      style={{
        backgroundColor: '#1B1B1B',
        justifyContent: 'center',
        alignItems: 'center',
        padding: width * 0.09,
        opacity: entrada * saida,
      }}
    >
      <h1
        style={{
          margin: 0,
          fontFamily: "'Be Vietnam Pro', system-ui, sans-serif",
          fontWeight: 700,
          fontSize: width * 0.11,
          lineHeight: 1.08,
          letterSpacing: '-0.02em',
          color: '#FFF8F2',
          textAlign: 'center',
          transform: `translateY(${(1 - entrada) * 40}px)`,
        }}
      >
        {titulo} <span style={{ color: '#C8441A' }}>{destaque}</span>
      </h1>
    </AbsoluteFill>
  );
};
