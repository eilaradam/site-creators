import React from 'react';
import { Composition } from 'remotion';
import { Legenda } from './Legenda';
import { Gancho } from './Gancho';
import { LEGENDA_EXEMPLO, Legenda as DadosLegenda } from './dados';

// Passe o legenda.json do projeto com --props=../projetos/<slug>/saida/legenda.json
export const RemotionRoot: React.FC = () => {
  const dados: DadosLegenda = LEGENDA_EXEMPLO;
  const { largura, altura, fps } = dados.alvo;

  return (
    <>
      <Composition
        id="Legenda"
        component={Legenda as React.FC<Record<string, unknown>>}
        durationInFrames={Math.max(1, Math.round(dados.duracao * fps))}
        fps={fps}
        width={largura}
        height={altura}
        defaultProps={{ dados } as Record<string, unknown>}
        calculateMetadata={({ props }) => {
          const d = (props as { dados: DadosLegenda }).dados;
          return {
            durationInFrames: Math.max(1, Math.round(d.duracao * d.alvo.fps)),
            fps: d.alvo.fps,
            width: d.alvo.largura,
            height: d.alvo.altura,
          };
        }}
      />
      <Composition
        id="Gancho"
        component={Gancho as React.FC<Record<string, unknown>>}
        durationInFrames={Math.round(fps * 2)}
        fps={fps}
        width={largura}
        height={altura}
        defaultProps={{ titulo: 'O maior erro é', destaque: 'cobrar pouco' }}
      />
    </>
  );
};
