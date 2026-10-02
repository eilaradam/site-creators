// Formato do legenda.json que o studio escreve em projetos/<slug>/saida/.
export type Palavra = { inicio: number; fim: number; palavra: string; prob?: number };
export type Bloco = { inicio: number; fim: number; texto: string; palavras: Palavra[] };

export type Estilo = {
  fonte: string;
  tamanho: number;
  corTexto: string;
  corDestaque: string;
  corContorno: string;
  espessuraContorno: number;
  maiusculas: boolean;
  posicaoVertical: number;
  margemLateral: number;
  popPalavraAtiva: number;
};

export type Legenda = {
  alvo: { largura: number; altura: number; fps: number };
  estilo: Estilo;
  duracao: number;
  blocos: Bloco[];
};

export const ESTILO_PADRAO: Estilo = {
  fonte: 'Be Vietnam Pro',
  tamanho: 88,
  corTexto: '#FFFFFF',
  corDestaque: '#C8441A',
  corContorno: '#1B1B1B',
  espessuraContorno: 6,
  maiusculas: false,
  posicaoVertical: 0.74,
  margemLateral: 90,
  popPalavraAtiva: 106,
};

export const LEGENDA_EXEMPLO: Legenda = {
  alvo: { largura: 1080, altura: 1920, fps: 30 },
  estilo: ESTILO_PADRAO,
  duracao: 4,
  blocos: [
    {
      inicio: 0.2, fim: 1.6, texto: 'o maior erro',
      palavras: [
        { inicio: 0.2, fim: 0.6, palavra: 'o' },
        { inicio: 0.6, fim: 1.1, palavra: 'maior' },
        { inicio: 1.1, fim: 1.6, palavra: 'erro' },
      ],
    },
    {
      inicio: 1.8, fim: 3.4, texto: 'e cobrar pouco',
      palavras: [
        { inicio: 1.8, fim: 2.2, palavra: 'e' },
        { inicio: 2.2, fim: 2.8, palavra: 'cobrar' },
        { inicio: 2.8, fim: 3.4, palavra: 'pouco' },
      ],
    },
  ],
};
