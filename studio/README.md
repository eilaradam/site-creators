# studio

Linha de montagem local para os vídeos. Entra o bruto da gravação, sai um corte
sem silêncio, com o melhor take de cada linha do roteiro, legenda no estilo da
conta e uma música que cabe no tempo do corte. O ajuste fino continua no CapCut
do celular, só que em cima de um vídeo que já está 80% pronto.

Roda na sua máquina. Nada sobe para lugar nenhum.

## O que dá e o que não dá com o CapCut

O CapCut **não tem API pública**. O que existe de automação é engenharia reversa
do arquivo de projeto do app de desktop (`draft_content.json`), e isso só vale
para o CapCut de computador. **Editando no celular, injetar timeline montada
está fora** — não existe caminho honesto para isso.

Então a divisão aqui é essa: o studio faz no computador o trabalho chato e
determinístico (ouvir tudo, cortar pausa, achar o take bom, escrever legenda,
escolher música) e te entrega arquivos prontos. Você manda para o celular e usa
o CapCut para o que ele é bom: efeito, trend, transição, capa, ajuste de ritmo.

Se um dia você passar a editar no CapCut de desktop, dá para gerar o projeto já
montado — o formato EDL deste repositório existe justamente para isso.

## O que você precisa instalar

- **ffmpeg** (obrigatório). macOS: `brew install ffmpeg`. Windows: `winget install ffmpeg`.
- **Python 3 + faster-whisper** (para transcrição e escolha de take). O
  `setup.sh` instala num ambiente próprio em `studio/.venv`, sem tocar no Python
  do sistema; é o que evita o bloqueio de `pip` do macOS e do Homebrew. Sem isso,
  o studio ainda corta silêncio.
- **Fonte Be Vietnam Pro** instalada no sistema, se quiser a legenda na fonte da
  marca. Sem ela, o ffmpeg cai numa fonte padrão e a legenda sai certa, só com
  outro desenho de letra.

Node 20+ já basta para o resto: o núcleo não tem nenhuma dependência npm.

## Fluxo

```bash
node bin/studio.js novo "gancho cobrar pouco"
# jogue os vídeos em projetos/gancho-cobrar-pouco/bruto/
# escreva o roteiro em projetos/gancho-cobrar-pouco/roteiro.txt (uma fala por linha)

node bin/studio.js analisar gancho-cobrar-pouco
node bin/studio.js musica sugerir gancho-cobrar-pouco
node bin/studio.js render gancho-cobrar-pouco --musica=nome-da-faixa --beat --gancho=1
```

Ou pelo painel, que faz tudo isso com o vídeo na tela. Um comando sobe o
servidor e já abre o navegador em `http://127.0.0.1:4321`:

```bash
bash abrir.sh          # ou: node bin/studio.js painel
```

O painel escuta só em `127.0.0.1`, de propósito: ele lê seus vídeos e a pasta de
música, então não deve ficar acessível para a rede. É o localhost da sua máquina,
não de um servidor. Para rodar noutra porta, `bash abrir.sh 4500`.

## Como ele decide o que cortar

1. **Silêncio.** `silencedetect` do ffmpeg acha as pausas; o que sobra é fala.
   Cada trecho ganha uma folga de 0,12s nas pontas para não decapitar palavra, e
   pausa menor que 0,22s não vira corte (senão o vídeo fica picotado).
2. **Take.** Com o roteiro em mãos, cada trecho falado é comparado com as linhas
   por similaridade de bigramas (aguenta gaguejo e erro de transcrição). Três
   tentativas da mesma linha viram três takes; fica o **último que saiu bom** —
   que é como se grava na prática. `--criterio=melhor` troca para maior score.
   Sem roteiro, tentativas seguidas e parecidas são agrupadas e fica a última.
3. **Sobra.** Muleta ("ahn", "peraí", "corta") e fala fora do roteiro saem do
   corte, mas continuam na EDL marcadas com o motivo — é só remarcar no painel.

Nada disso é destrutivo: o bruto não é tocado, tudo vive no `edl.json`.

## Música

Jogue mp3 em `musicas/` e rode `node bin/studio.js musica sync`. O studio mede
duração, loudness, BPM (autocorrelação da força de onset), a grade de beats e o
drop de cada faixa, e guarda em `musicas/biblioteca.json`. Você pode escrever
tags à mão nesse arquivo (`"tags": ["viral", "calma"]`) que elas são preservadas.

Com isso, `musica sugerir` ranqueia por: cabe na duração do corte, bate com as
tags pedidas, energia parecida com a média e drop cedo. No render,
`--beat` encosta o fim de cada corte no beat mais próximo (só desloca até 0,12s,
acima disso o corte fica visível) e `--gancho=N` entra na faixa no ponto que faz
o drop cair no segundo N do seu vídeo.

## O que sai em `saida/`

| arquivo | para quê |
| --- | --- |
| `corte.mp4` | o corte limpo, sem legenda. É o que vai para o CapCut. |
| `corte-legendado.mp4` | o mesmo com a legenda queimada, se quiser publicar direto. |
| `legenda.srt` | para importar em quem aceita legenda externa. |
| `legenda.ass` | o karaokê estilizado (cor, contorno, palavra ativa). |
| `legenda.json` | o mesmo conteúdo para o Remotion animar. |
| `musica.m4a` | a faixa já recortada no trecho certo, com fade. |
| `entrega.md` | o que entrou, o que saiu e por quê. |

## Remotion

`remotion/` tem as camadas animadas: `Legenda` (karaokê lendo o `legenda.json`)
e `Gancho` (cartela de abertura na identidade). Renderizam com fundo
transparente, então entram como overlay por cima do corte.

```bash
cd remotion && npm install
npx remotion studio                    # preview
npm run legenda -- --props=../projetos/<slug>/saida/legenda.json
```

A saída é `.mov` ProRes 4444 (`yuva444p10le`), que é o formato de overlay que
editor e ffmpeg leem com o alpha intacto:

```bash
ffmpeg -i corte.mp4 -i out/legenda.mov -filter_complex "[0:v][1:v]overlay" saida.mp4
```

Existe também `npm run legenda-web`, que sai em VP8/webm para usar na web. Esse
formato guarda o alpha num stream separado do WebM e **o ffmpeg comum não o
decodifica** — se for compor com ffmpeg ou levar para um editor, use o `.mov`.

Use o Remotion quando quiser animação que o `.ass` não faz (máscara, elemento
entrando pelo lado, contador, cartela). Para legenda comum, o caminho do `.ass`
queimado é mais rápido e não precisa instalar nada.

## Estrutura

```
bin/studio.js      CLI
src/ffmpeg.js      probe, silêncio, corte, queima de legenda, PCM
src/fala.js        silêncio -> regiões de fala
src/edl.js         o formato intermediário (e o mapa bruto -> corte final)
src/transcricao.js faster-whisper / whisper.cpp, com cache
src/takes.js       similaridade, alinhamento ao roteiro, escolha de take
src/legenda.js     .ass karaokê, .srt e .json
src/musica.js      BPM, beats, drop, sugestão e alinhamento
src/pipeline.js    amarra tudo
src/servidor.js    painel local (só 127.0.0.1)
web/               o painel
remotion/          camadas animadas em alpha
perfis/lara.json   cores, fonte e limiares
```

`npm test` roda os 28 testes do núcleo.

## Limites conhecidos

- A transcrição é o passo lento. O resultado fica em cache por arquivo; só muda
  se o vídeo mudar ou você passar `--forcar`.
- O corte reencoda (trim + concat), então vídeo longo demora. É o preço de
  cortar no frame pedido em vez do keyframe mais próximo.
- O BPM erra por volta de 0,5% em faixa com batida clara, e erra mais em faixa
  sem percussão. Para alinhar corte isso basta; para sincronizar coreografia não.
- A escolha de take depende da transcrição. Áudio ruim gera alinhamento ruim —
  por isso tudo que ele descarta fica visível no painel, com o motivo.
