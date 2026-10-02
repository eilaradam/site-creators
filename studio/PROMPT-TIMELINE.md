# Tarefa: dar ao studio uma timeline no estilo CapCut

Você vai construir a interface de edição do `studio`, que já existe e funciona
neste repositório. **Não comece do zero e não troque a stack.** O motor de
análise, corte, legenda e música está pronto e testado; o que falta é a camada
visual que deixa a Lara ver e mexer no que ele decidiu.

Leia `studio/README.md` antes de escrever qualquer linha.

## O que já existe (use, não reescreva)

| arquivo | o que entrega |
| --- | --- |
| `src/edl.js` | o `edl.json`: `segmentos[{id, arquivo, inicio, fim, texto, linhaRoteiro, take, incluir, motivo, origem}]`, `musica`, `legenda`, `alvo{largura,altura,fps}`. Tem `mapaDeTempo()` que converte tempo do bruto para tempo do corte final. |
| `src/ffmpeg.js` | `probe`, `detectarSilencio`, `cortar(segmentos, saida)`, `queimarLegenda`, `pcmMono` (PCM cru na memória), `recortarAudio` |
| `src/takes.js` | similaridade com o roteiro, escolha do melhor take |
| `src/legenda.js` | `.ass` karaokê, `.srt` e `legenda.json` com `blocos[{inicio, fim, palavras[{inicio, fim, palavra}]}]` já no tempo do corte |
| `src/musica.js` | BPM, **grade de beats**, drop, sugestão e `alinharCortesAoBeat` |
| `src/transcricao.js` | faster-whisper com cache, palavras com timestamp |
| `src/servidor.js` | o servidor do painel, em 127.0.0.1 |
| `web/` | o painel atual: HTML, CSS e JS puros, **sem build e sem dependência npm** |
| `remotion/` | composições `Legenda` (karaokê lendo o `legenda.json`) e `Gancho`, render em ProRes 4444 com alpha |

API que o servidor já expõe: `GET /api/projetos`, `GET /api/projetos/:slug`,
`PUT /api/projetos/:slug/roteiro`, `PUT /api/projetos/:slug/edl`,
`POST /api/projetos/:slug/analisar`, `POST /api/projetos/:slug/render`,
`GET /api/projetos/:slug/sugerir-musica`, `GET|POST /api/musicas`,
`GET /api/tarefas/:id`, `GET /arquivo?caminho=` (com suporte a Range, já serve
vídeo para o `<video>`).

## Regras que não se negociam

1. **Sem build.** Continua HTML, CSS e JS de módulo nativo servidos pelo próprio
   servidor. Nada de React, Vite, bundler ou `npm install` no núcleo.
2. **O `edl.json` é a verdade.** Toda edição na timeline grava nele pelo
   endpoint `PUT /edl`, que você vai estender. Nada de estado só no navegador.
3. **Nada destrutivo no bruto.** Cortar na timeline muda `inicio`/`fim` do
   segmento, nunca o arquivo original.
4. **Só escuta em 127.0.0.1**, e `/arquivo` continua recusando caminho fora das
   pastas do studio.
5. **Os 30 testes continuam passando** (`npm test`) e cada fase nova ganha teste.

## Visual

Escuro, como todo editor, usando a identidade da marca: fundo `#1B1B1B`,
superfícies `#242424` e `#2E2E2E`, texto `#FFF8F2`, ação e playhead `#C8441A`,
fonte DM Sans e DM Mono para números e timecode. Densidade de ferramenta
profissional: controles pequenos, espaçamento apertado, nada de card arredondado
gigante. A referência de layout é o CapCut de desktop.

## Fase 1 — a timeline que toca sem renderizar

Entregue esta fase inteira e funcionando antes de ir para a 2.

- Layout em três zonas: biblioteca do projeto à esquerda (brutos e faixas),
  player no centro-topo, propriedades do trecho selecionado à direita, timeline
  ocupando a faixa inferior inteira.
- A timeline desenha os segmentos **incluídos** do `edl.json` numa régua de
  tempo com zoom. Desenhe em `<canvas>`, não com uma div por clipe.
- **Reprodução da EDL sem render**: um `<video>` apontando para o bruto, e um
  laço que pula para o próximo segmento quando o `currentTime` passa do `fim` do
  segmento atual. É isso que deixa a Lara ver o corte na hora, sem esperar o
  ffmpeg. Trate o engasgo do seek: faça o pulo no `timeupdate` com uma margem e
  pré-posicione o próximo segmento.
- Forma de onda atrás de cada clipe. Crie `GET /api/projetos/:slug/ondas` que
  usa `pcmMono` para extrair picos, guarde em `cache/` e sirva JSON.
- Arrastar a borda de um clipe faz trim (muda `inicio`/`fim`); arrastar o clipe
  inteiro reordena. Com música carregada, encoste no beat usando a grade que
  `musica.js` já calcula, com tolerância de 0,12s.
- Clicar num clipe mostra à direita o que o studio decidiu e por quê: a fala
  transcrita, qual linha do roteiro ela casa, o número do take, o score, e os
  outros takes daquela linha com um botão para trocar.
- Barra de espaço toca e pausa, `J K L` navegam, `S` corta no playhead.

## Fase 2 — camadas

- Trilha de b-roll acima da A-roll: soltar um arquivo na timeline posiciona um
  clipe de vídeo com início, duração e opacidade.
- Trilha de legenda mostrando os blocos do `legenda.json`, editáveis no texto.
- Trilha de música com a forma de onda e os beats marcados em vermelho.
- **O render precisa passar a compor camadas.** Hoje `ffmpeg.js:cortar` faz
  trim e concat de uma trilha só. Estenda para montar `overlay` das camadas de
  vídeo e `amix` do áudio, mantendo a assinatura atual funcionando.

## Fase 3 — Remotion dentro do player

- Preview da legenda animada por cima do player, lendo o mesmo `legenda.json`
  que a composição `Legenda` usa, para o que se vê na timeline ser o que sai no
  render.
- Botão que renderiza o overlay em ProRes 4444 e compõe com o corte.

## O que não tentar

- Não reimplemente transcrição, escolha de take, BPM ou legenda: já estão
  prontos e testados.
- Não faça render de preview a cada mexida. O preview é a reprodução da EDL; o
  ffmpeg só entra no render final.
- Não suba nada para a nuvem. Tudo roda local.

## Como entregar

Trabalhe na branch `claude/magical-meitner-uamedt`. Commit por fase, com os
testes passando. No fim de cada fase, suba o painel com `bash abrir.sh`, abra no
navegador e confirme que funciona antes de dizer que terminou.
