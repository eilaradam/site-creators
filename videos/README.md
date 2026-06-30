# Vídeos com Remotion — Lara Adam Creators

Vídeos verticais feitos por código (React + [Remotion](https://remotion.dev)).

## Composições

### `CabecaFlutuante`

Efeito "cabeça flutuante" para gancho de Reels — **1080×1920, 30fps, 5s**.
Uma cabeça recortada surge crescendo (efeito carimbo com leve overshoot),
segura, encolhe e some; o rosto só troca quando está invisível (nunca corte
seco). A cabeça flutua de leve, gira o mínimo e tem contorno branco estilo
sticker + sombra suave.

### `ConselhoDigitando`

Conselho "sendo escrito" em um card no estilo da marca **EITA Mentora
Virtual** (verde-menta + azul claro + navy) — **1080×1920, 30fps, 5s**.
O texto é digitado letra por letra, com cursor piscando, etiqueta verde
"Conselho da EITA" (lâmpada) e **som de teclado** (um clique por caractere).
O som está em `public/teclado.wav` (gerado por código). Edite frase, trecho
em destaque e cores nas `defaultProps` em `src/Root.tsx`.

Renderizar (neste ambiente remoto, ver nota do Chromium abaixo):
```bash
npx remotion render src/index.ts ConselhoDigitando out/conselho-digitando.mp4 \
  --codec=h264 --concurrency=4 --gl=angle --browser-executable=/tmp/chromium
```

### `CarrosselJulho`

Carrossel de JULHO no template **"Lara Dam | UGC Manager"** — fundo creme,
tarja laranja no título, corpo escuro, faixa azul de "Dica de abordagem",
3 slots de foto e rodapé. Feed **1080×1350 (4:5)**, 9 lâminas: capa (0),
7 datas (1–7) e CTA (8). Conteúdo no array `CARDS` de
`src/CarrosselJulho.tsx` (use `**negrito**` no corpo). As fotos são **slots
marcados** ("sua foto aqui") pra trocar pelas imagens reais no Canva.
```bash
mkdir -p out/julho
for i in 0 1 2 3 4 5 6 7 8; do \
  npx remotion still src/index.ts CarrosselJulho out/julho/julho-$i.png \
    --props="{\"indice\":$i}" --browser-executable=/tmp/chromium; done
```

### `CarrosselCreators`

Carrossel de feed **1080×1350 (4:5)** no estilo da marca — verde-menta +
detalhes laranja/coral + navy. 6 cards (capa, 4 tipos de creator, CTA).
O conteúdo de cada card fica no array `CARDS` em
`src/CarrosselCreators.tsx`; troque o card visível pela prop `indice`
(0 = capa … 5 = CTA). Cada card é exportado como **imagem** (still):
```bash
mkdir -p out/carrossel
for i in 0 1 2 3 4 5; do n=$((i+1)); \
  npx remotion still src/index.ts CarrosselCreators out/carrossel/card-$n.png \
    --props="{\"indice\":$i}" --browser-executable=/tmp/chromium; done
```

---

## Como rodar

```bash
cd videos
npm install

# Abrir o editor visual (preview ao vivo, ajusta props no painel direito):
npm run dev          # abre o Remotion Studio no navegador

# Renderizar o MP4:
npm run render CabecaFlutuante out/cabeca-flutuante.mp4
```

> **Renderizar neste ambiente remoto:** o download oficial do Chrome do
> Remotion é bloqueado pela rede. Foi instalado um Chromium via npm
> (`@sparticuz/chromium`). Para renderizar aqui use:
> ```bash
> node -e 'require("@sparticuz/chromium").default.executablePath()' # extrai p/ /tmp/chromium
> npx remotion render src/index.ts CabecaFlutuante out/cabeca-flutuante.mp4 \
>   --codec=h264 --concurrency=4 --gl=angle --browser-executable=/tmp/chromium
> ```
> Na **sua máquina** isso não é necessário: o `npm run render` baixa o Chrome
> sozinho.

---

## ✏️ Como trocar os TEXTOS e CORES

Tudo fica em **`src/Root.tsx`**, no bloco `defaultProps`:

```tsx
defaultProps={{
  textoTopo: "TUTORIAL",                          // texto de cima
  textoBaixo: "Como Criar esse efeito no Claude",  // texto de baixo
  palavraDestaque: "Claude",   // palavra do texto de baixo em itálico serifado
  corDestaque: "#E8623D",      // cor da palavra em destaque (coral)
  corTexto: "#17223B",         // cor do restante do texto (azul-tinta)
}}
```

- **Trocar a frase:** edite `textoTopo` e `textoBaixo`.
- **Mudar a palavra em itálico/cor:** ela precisa aparecer em `textoBaixo`.
  Ex.: para destacar "efeito", ponha `palavraDestaque: "efeito"`.
- **Mudar cores:** troque `corDestaque` e `corTexto` por qualquer cor hex.

Se editar pelo **Remotion Studio** (`npm run dev`), dá pra mudar esses campos
no painel da direita sem mexer no código.

---

## 🖼️ Como trocar as FOTOS (cabeças)

1. Coloque seus PNGs **com fundo transparente** em `public/cabecas/`.
2. Liste-os no array `CABECAS` em **`src/CabecaFlutuante.tsx`**:
   ```ts
   const CABECAS = [
     "cabecas/rosto1.png",
     "cabecas/rosto2.png",
     // ...adicione quantos quiser
   ];
   ```
O efeito usa todas as cabeças da lista, em sequência.

### Trocar o FUNDO
Substitua **`public/fundo.jpg`** por outra imagem (qualquer proporção; ela é
cortada pra cobrir a tela). Se o arquivo não existir, aparece um fundo creme
`#F1E9D2` com linhas verticais azuis desenhadas automaticamente.

---

## 🎚️ Ajustes finos (em `src/CabecaFlutuante.tsx`)

| O quê | Onde | Padrão |
|---|---|---|
| Velocidade da troca de rosto | `CICLO` (frames) | `27` (~0,9s) |
| Tamanho da cabeça | `ALTURA_CABECA` (px) | `780` |
| Intensidade da flutuação | `flutuaY` (`* 18`) | ±18px |
| Giro | `giro` (`* 2.6`) | ±2,6° |
| Espessura do contorno branco | `transform: scale(1.05)` na silhueta | 1.05 |

A duração total e o FPS ficam no `<Composition>` em `src/Root.tsx`
(`durationInFrames={150}`, `fps={30}`).
