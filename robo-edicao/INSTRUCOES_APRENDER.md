# Aprender o estilo de edição da Lara Dam

Você está rodando sozinho, sem ninguém olhando. Não pergunte nada.
Na pasta `videos/` estão vídeos que a Lara já editou (exportados do CapCut do celular), organizados em subpastas.
Cada subpasta de marca (ex.: "Shopee + LaraDam") é UM conteúdo, e os arquivos dentro dela são versões dele:
"sem legenda" x "com legenda"/"editado", "Teste A" x "Teste B", "Ajustado" (versão final depois de pedido da marca).
Compare as versões entre si: a diferença entre elas mostra decisões dela (o que entra na legenda, o que mudou no ajuste).
Às vezes vem também o bruto (nome com "bruto", ou um vídeo bem mais longo com a mesma fala).
Alguns arquivos vêm sem extensão (export do CapCut): use `ffprobe` para conferir que é vídeo.
Se houver anotações `.md`/`.txt` (ex.: "CAPCUT - observado.md"), elas foram escritas olhando os projetos dela dentro do
CapCut (nome exato da fonte, animação, efeito, transição, volume). Leia primeiro: o que está lá é dado exato e vale mais
que a sua estimativa pelo vídeo. Use para dar nome certo às coisas e confira se bate com o que você mede.
Seu trabalho é MEDIR como ela edita, para o robô de edição copiar o jeito dela. Antes de cada etapa, escreva uma
frase curta em português do que vai fazer (ela acompanha ao vivo).

Use o Python do robô: `~/robo-edicao/venv/bin/python` (tem faster_whisper, librosa, numpy).

## O que medir em cada vídeo pronto

1. **Ritmo**: detecte os cortes (`ffmpeg -vf "select='gt(scene,0.25)',showinfo"` ou PySceneDetect se der para instalar no venv).
   Cortes por minuto, duração média e mediana de cada plano, o plano mais longo.
2. **Zoom**: compare quadros vizinhos dentro do mesmo plano (o rosto fica maior sem corte). Quantos zooms, de quanto
   (ex.: 100% para 112%), seco ou suave, em que momento da fala (começo de frase, palavra forte).
3. **Legenda**: extraia um quadro por segundo (`ffmpeg -vf fps=1`) e OLHE as imagens (Read). Anote fonte (parecida com
   qual da biblioteca `~/robo-edicao/fontes.json`), peso, caixa alta ou não, quantas palavras por tela, cor do texto,
   cor de destaque, contorno/sombra/caixa de fundo, posição na tela (em % da altura), animação de entrada.
4. **Gráficos e textos na tela**: o que aparece além da legenda (números, emojis, setas, prints, logo), estilo, quando.
5. **Som**: tem música? volume em relação à voz (meça com `ebur128`/`astats` nos trechos com e sem fala);
   efeitos sonoros (picos curtos fora da fala) e onde entram (cortes, entrada de texto).
6. **Abertura e fechamento**: como os 3 primeiros segundos prendem; como termina (chamada, logo, corte seco).
7. **Fala**: transcreva (faster_whisper `small`, pt, word_timestamps) e veja pausas que sobraram (ela deixa respiro ou corta tudo?).

## Se tiver o bruto de algum vídeo

Transcreva os dois e alinhe pelo texto. Liste o que ela TIROU (repetições, erros, pausas de quanto tempo, vícios,
frases inteiras) e o que manteve. Isso é o mais valioso: diz exatamente o critério de corte dela.

## O que entregar

- `saida/relatorio.md` em português simples, para a Lara ler: um resumo de 5 linhas do estilo dela, depois uma tabela por
  assunto (ritmo, zoom, legenda, gráficos, som, abertura/fechamento, cortes) com os números medidos e de quais vídeos.
  Diga com honestidade quando algo não deu para medir.
- `saida/regras_propostas.json`: regras GERAIS que o robô deve seguir, cada uma com um número sempre que possível
  ("zoom de 100% para 110% a cada 3 a 5 s, no começo da frase", não "usar zoom").
  Formato: `[{"texto": "...", "motivo": "medido em X de Y vídeos: ...", "categoria": "corte|zoom|som|musica|legenda|animacao|cor|ritmo|outro", "so_desta_marca": false}]`.
  No máximo 10. Não repita o que já está em REGRAS_ATUAIS.md. Só proponha o que aparece em mais de um vídeo.
- `saida/modelo_legenda.json` (se conseguir medir): a legenda dela no formato de `~/robo-edicao/legendas.json`
  (id "lara", nome "Do jeito da Lara", fonte da biblioteca, tamanho, cores, posição, palavras por tela, modo, animação).

## Limites

Trabalhe só dentro desta pasta (e leia `~/robo-edicao`). Não suba nada para lugar nenhum. Não altere os vídeos.
