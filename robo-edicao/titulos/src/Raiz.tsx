import React from 'react';
import { Composition } from 'remotion';
import { MODELOS, TituloProps } from './Titulos';

/* Uma composição por modelo: 30 fps, duração vinda de duracao_s (padrão 2,6 s), tamanho de largura/altura (padrão 1080x1920).
   Render do robô: npx remotion render src/index.ts <modelo> saida.mov --props='{"texto":"..."}'
                   --codec=prores --prores-profile=4444 --pixel-format=yuva444p10le */
export const Raiz: React.FC = () => (
  <>
    {Object.entries(MODELOS).map(([id, m]) => (
      <Composition
        key={id}
        id={id}
        component={m.componente as React.FC<TituloProps>}
        width={1080}
        height={1920}
        fps={30}
        durationInFrames={78}
        defaultProps={m.exemplo as TituloProps}
        calculateMetadata={({ props }) => {
          const p = props as TituloProps & { largura?: number; altura?: number };
          return { durationInFrames: Math.max(20, Math.round((p.duracao_s || 2.6) * 30)), width: p.largura || 1080, height: p.altura || 1920 };
        }}
      />
    ))}
  </>
);
