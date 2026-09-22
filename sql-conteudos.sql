-- ============================================================
--  Aba Conteúdos do admin (creators.laradam.com/admin.html)
--  Campanhas da Lara copiadas do MeuManager em 22/09/2026.
--  Cola tudo no SQL Editor do projeto "Cadastro de Creators" e roda.
--  Pode rodar de novo sem duplicar (origem_id é único).
-- ============================================================
create table if not exists public.conteudos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  nome text not null,
  cliente text,
  cliente_instagram text,
  tipo text not null default 'publicidade' check (tipo in ('publicidade','ugc','permuta','outro')),
  status text not null default 'briefing' check (status in ('negociando','briefing','roteiro','aprovacao_roteiro','gravacao','aprovacao_video','aprovado','postado','cancelado')),
  quantidade_videos integer not null default 1,
  valor numeric(12,2) not null default 0,
  status_pagamento text not null default 'pendente' check (status_pagamento in ('pendente','pago')),
  prazo_pagamento text default '30dias',
  data_briefing date,
  data_roteiro date,
  data_gravacao date,
  data_aprovacao date,
  data_postagem date,
  data_faturamento date,
  data_pagamento_prevista date,
  data_pagamento date,
  contrato_assinado boolean not null default false,
  nota_fiscal_enviada boolean not null default false,
  link_briefing text,
  link_entrega_final text,
  roteiro text,
  observacoes text,
  destaque boolean not null default false,
  origem_id uuid unique
);
create index if not exists conteudos_created_idx on public.conteudos (created_at desc);

alter table public.conteudos enable row level security;
drop policy if exists "conteudos logado tudo" on public.conteudos;
create policy "conteudos logado tudo" on public.conteudos for all to authenticated using (true) with check (true);

insert into public.conteudos (origem_id, nome, cliente, cliente_instagram, tipo, status, quantidade_videos, valor, status_pagamento, prazo_pagamento, data_briefing, data_roteiro, data_gravacao, data_aprovacao, data_postagem, data_faturamento, data_pagamento_prevista, data_pagamento, contrato_assinado, nota_fiscal_enviada, link_briefing, link_entrega_final, roteiro, observacoes, destaque, created_at, updated_at) values
('0c5a5be1-3cef-4309-aa0d-a54d9bfd9fa8', 'Banco BV', null, null, 'ugc', 'postado', 1, '1350', 'pago', '45dias', '2026-02-01', '2026-02-05', '2026-02-10', null, '2026-02-16', '2026-03-10', null, '2026-05-02', false, false, null, null, '----- ROTEIRO 1
Cena 1
Fala: Muita gente acha que eu sou ''Pão-duro'', mas a real é que eu só parei de aceitar que o meu dinheiro fique dormindo enquanto eu trabalho. 
Imagem: Mostrando o pão para a câmera com um sorriso. 

Cena 2
Fala: Eu tinha essa mania de deixar o dinheiro da reserva na conta corrente por medo de precisar dele e estar ''preso'' em investimento difícil. Mas aí eu descobri o CDB do Banco BV. 
Imagem: Corta o pão, passa manteiga e coloca as fatias no forno. 

Cena 3
Fala: O que me explodiu a cabeça foi que dá pra investir a partir de R$ 1. Sim, um real. Eu abri minha Conta BV e coloquei pra render. 
Imagem: Limpando a mão e pegando o celular para mostrar a Conta BV rapidamente. 

Cena 4
Fala: Ele rende 120% do CDI. É mais que a poupança e, se precisar, eu resgato no mesmo dia porque tem liquidez diária. É a segurança de um banco com mais de 30 anos de história. 
Imagem: Mostrando o banco no App e falando com a câmera, dando destaque para algumas palavras. 

Cena 5
Fala: Para de perder rentabilidade à toa. Abra a sua conta no Banco BV e invista já. 
Imagem: Dando uma mordida na torrada e apontando para o link. 

---- ROTEIRO 2
Cena 1
Fala: Dizem que casa limpa e incenso de canela atraem prosperidade... Mas sabe o que atrai mesmo? Tirar o dinheiro da conta corrente e colocar pra render no App certo. 
Imagem: Acendendo o incenso, voz calma e depois falando em um tom de bronca. 

Cena 2
Fala: Não adianta só vibrar na abundância e deixar o dinheiro lá parado, perdendo valor. Eu mudei minha frequência para a do Banco BV. 
Imagem: Mudando o tom para algo mais prático, pegando o celular de forma rápida. 

Cena 3
Fala: Com a minha Conta BV, eu coloco qualquer valor (tipo, a partir de R$ 1) no CDB que rende 120% do CDI. 
Imagem: Mostra a tela do celular. 

Cena 4
Fala: É segurança de um banco com mais de 30 anos de história, mas com a liberdade da liquidez diária: se eu precisar do dinheiro hoje, ele volta pra mim na hora. 
Imagem: Fala com a câmera. 

Cena 5
Fala: Manifesta essa conta aí! Abra a sua conta no Banco BV e invista já. 
Imagem: (Informação de imagem não consta no documento para esta cena). 

ROTEIRO 3
Cena 1
Fala: O que você consegue comprar com 1 real hoje? No mercado, quase nada, né? Mas eu vou te mostrar como começar um investimento sério com ele. 
Imagem: Andando no mercado e falando, colocando coisas no carrinho. 

Cena 2
Fala: Muita gente usa a desculpa de que ''não tem dinheiro'' pra começar. Mas existe um banco que faz isso ser possível! Vou te mostrar. 
Imagem: Saindo do mercado com sacolas. 

Cena 3
Fala: No app do Banco BV, a barreira de entrada não existe. Você abre sua Conta BV e já pode colocar esse 1 real pra render 120% do CDI. É muito mais que a poupança, com liquidez diária e a segurança de um banco especialista em crédito com mais de 30 anos de mercado. 
Imagem: Dentro do carro, mostrar o app e falar com a câmera de forma mais Lo-fi. 

Cena 4
Fala: O segredo não é o quanto você tem, é por onde você começa. E o melhor lugar hoje é aqui. 
Imagem: Falando com a câmera. 

Cena 5
Fala: Abra a sua conta no Banco BV e invista já. 
Imagem: (Informação de imagem não consta no documento para esta cena). ', 'oioi', false, '2026-02-09 01:16:16.468133+00', '2026-05-03 00:45:07.14504+00'),
('16f42f35-ecb7-449d-b948-675cbc673fd6', 'Brinox UGC', null, null, 'ugc', 'postado', 1, '450', 'pago', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-02-09 21:51:50.597514+00', '2026-04-01 13:30:48.191502+00'),
('52a95332-560f-456b-b8ea-55be349ca9ef', 'WAP', null, null, 'permuta', 'cancelado', 1, '0', 'pago', '30dias', null, null, null, null, null, null, null, '2026-04-02', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-02-09 21:52:43.40888+00', '2026-06-22 18:41:37.108699+00'),
('797e3c9f-6d46-47c9-b5b7-2af73360af36', 'Ateliê', null, null, 'ugc', 'postado', 1, '600', 'pago', '30dias', null, null, null, null, null, null, null, '2026-05-21', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', 'BRIEFING DE CONTEÚDO – FIRELET MARKETING DE INFLUÊNCIA
Campanha: UGC JAN/FEV 26
Marcações obrigatórias: @atelieoficialbrasil, #publi, #Ateliê e #NoSeuRitmo

1. Sobre a Marca

Categoria: A Ateliê é líder e pioneira na categoria "Grab and Go" (pegue e leve) há mais de 10 anos, oferecendo produtos frescos, gostosos e naturais.


Portfólio: Possui a maior quantidade de produtos da categoria (mais de 35 itens), incluindo sanduíches naturais, especiais, saladas e sucos.


Objetivo no Brasil: Tornar a marca conhecida e mostrar seus benefícios (atributos naturais, saudáveis e práticos).


Sazonalidade: Os produtos vendem muito mais na temporada de verão.


Público: Urbano, jovem, ativo, com rotina agitada e que gosta de aproveitar a vida (pessoas "em movimento").

2. Sobre a Campanha

Objetivo: Desenvolver awareness (consciência) da marca, recrutando novos consumidores (foco em SP e RJ) e reforçar a assinatura "Ateliê. No Seu Ritmo".

Mensagem Principal: A Ateliê entende o ritmo acelerado do dia a dia e oferece produtos que se inserem perfeitamente no cotidiano de quem busca conveniência sem abrir mão da qualidade e frescor. "Com Ateliê, a correria do dia fica mais leve e saborosa".


Foco Visual: Reforçar o frescor dos ingredientes e o appetite appeal (o quanto o produto parece gostoso), mostrando-o dentro e fora da embalagem.

3. Linha Criativa e Conceito
Conceito: "Ateliê - no ritmo do seu dia". Não é sobre ser a opção mais saudável, mas a opção certa para quem busca equilíbrio entre correria e bem-estar.
+2

Tema: Verão. Reforçar que é a escolha leve, saborosa e prática.
+1

Cenário/Situação:

Retratar situações reais de consumo em ambiente externo (rua, parque, transporte público, ambientes abertos).


Obrigatório: Um take (mesmo que fake) do creator entrando e saindo de um mercado/loja de conveniência, passando a ideia de compra.

O consumo deve transmitir naturalidade e prazer.

4. Detalhes dos Produtos (Destaques)
Sanduíches: Pães feitos na própria fábrica, sem conservantes. A linha "Clássicos" tem várias receitas.

Saladas: Ingredientes selecionados e frescos (chegam à loja 24h após a colheita). Acompanham molho. Linha "Bowl" inclui: Frango Caesar, Peito de Peru, Mussarela de Búfala, Italiana e Ovo de Codorna.

5. Direcionamento de Produção (DO''s)
Embalagem: Deve aparecer sempre, preferencialmente em pé para leitura do logo. Cuidado com reflexos e sombras.
+1


Conteúdo: Enfatizar rapidez/praticidade e mostrar o produto fora da embalagem (appetite appeal).


Degustação: É um ponto-chave para gerar desejo.


Estética: Usar roupas/objetos em cores neutras ou tons da marca (verde).


Linguagem: Simples, cotidiana e direta.

6. O que NÃO fazer (DONT''s)

Concorrentes: Não citar nem mostrar produtos de concorrentes ou marcas de supermercado.


Cenário: Não mostrar outras marcas (ex: garrafas com rótulo).

Produtos:

Nunca mostrar apenas os sucos (devem estar acompanhados de comida).

Não mostrar produtos "feios", saladas murchas ou wraps desiguais.
+1


Associações Proibidas: Universo de refrigerantes, junk food, política ou assuntos polêmicos.
+2


Comportamento: Não usar palavras de baixo calão ou roupas com logos aparentes.
+1

7. Figurino e Linguagem
Figurino: Roupa normal do dia a dia, cores neutras ou tons de verde. Evitar roupas vulgares.
+1

Tom de Voz: Leve, próximo, verdadeiro e espontâneo. Sem exageros.

8. Pontos de Atenção Extras

Pronúncia: A marca se fala "ATELIÊ", como se lê.


Legenda: Enviar sugestão de legenda junto com o roteiro.


Cuidados na gravação: Não tampar o logo ou nome do produto com a mão.

Referências Visuais (Links)
O briefing cita exemplos de vídeos que mostram a gravação externa, a entrada sutil em lojas (ex: Oxxo) e a conexão com o verão.
+2', false, '2026-02-09 21:53:24.216343+00', '2026-05-21 17:19:33.7251+00'),
('4f278af5-45fe-4739-8f44-7402dc011d10', 'Tropical', null, null, 'ugc', 'postado', 1, '1800', 'pago', '30dias', null, null, null, null, null, null, null, '2026-04-15', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-02-09 21:53:58.196772+00', '2026-04-20 15:33:01.879044+00'),
('7f5606b8-c83d-4a6c-b53d-f8c311c25615', 'Shopping dos Lustres', null, null, 'permuta', 'gravacao', 1, '0', 'pago', '30dias', null, null, null, null, null, null, null, '2026-09-14', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-02-09 21:54:18.154853+00', '2026-09-15 00:52:55.398715+00'),
('ed1f6150-2ad4-4e7f-acec-7e881c022b70', 'BF Colchões', null, null, 'publicidade', 'postado', 1, '0', 'pago', '30dias', null, null, null, null, null, null, null, '2026-03-18', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-02-09 21:54:38.006105+00', '2026-04-20 15:32:33.966184+00'),
('d0881389-bd9c-4a58-91fe-796f2a8f9b95', 'DT3', null, null, 'ugc', 'postado', 1, '0', 'pago', '30dias', null, null, null, null, null, null, null, '2026-05-01', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-02-09 21:54:56.10369+00', '2026-05-01 14:50:04.166026+00'),
('c1a9f5aa-430d-4b0a-afc7-9bc831ba72e6', 'Coala', null, null, 'publicidade', 'postado', 1, '500', 'pago', '30dias', null, null, null, null, null, null, null, '2026-04-14', false, false, null, null, 'Aqui estão somente as falas para o *Vídeo 2 (A Revelação)*, seguindo o tom direto e orgânico que combinamos:

"O mistério acabou. Saiu a senha e eu vim correndo abrir essa caixa com vocês. Chega de suspense!"

"A Coala caprichou demais nessa experiência... Olha isso! Finalmente vou conhecer os nomes oficiais."

"Então o spoiler era esse aqui: *[Nome da Fragrância 1]*. Agora faz todo sentido. Aquele cheirinho de casa renovada que eu senti na amostra vem desse frasco lindo."

"E o segundo é o *[Nome da Fragrância 2]*. Esse aqui ganhou meu coração. Ele deixa uma sensação de limpeza prolongada que é surreal."

"A Coala conseguiu juntar frescor e aconchego nesses lançamentos. A casa muda de energia na hora. Eu já adotei pra minha rotina de limpeza."

"Quem ama casa perfumada vai entender o que eu tô falando quando testar. Vou deixar todas as informações aqui na legenda pra vocês. Depois me contem o favorito!" ', null, false, '2026-02-09 21:55:08.024743+00', '2026-04-20 15:32:37.063253+00'),
('5eaba9c1-3ca3-40eb-b4ce-829ee620070a', 'Mercado Bitcoin', null, null, 'publicidade', 'postado', 1, '700', 'pago', '30dias', null, null, null, null, null, null, null, '2026-05-02', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-02-09 21:55:30.589763+00', '2026-05-03 00:51:57.914147+00'),
('a28c79fc-58bf-422b-a520-9adcece4f0e1', 'Infinite Pay', null, null, 'ugc', 'postado', 1, '950', 'pago', '30dias', null, null, null, null, null, null, null, '2026-05-02', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-02-09 21:55:48.358149+00', '2026-05-03 00:53:21.920117+00'),
('983d51fb-5cb3-4bec-b37d-582996160e59', 'Decolar.com', null, null, 'ugc', 'postado', 1, '450', 'pago', '30dias', null, null, null, null, null, null, null, '2026-04-14', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-02-09 21:56:10.438407+00', '2026-04-20 15:32:41.133851+00'),
('658b0c79-82eb-485f-948c-13aaacebcd88', 'Opera Navegador', null, null, 'ugc', 'postado', 1, '450', 'pago', '30dias', '2026-02-16', '2026-02-18', null, null, null, null, null, '2026-04-14', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', 'Estamos novamente em parceria com o navegador Opera (https://www.opera.com/pt-br/lp/students)  em uma campanha focada em estudantes e queríamos saber se você teria interesse em participar. A ideia é falar sobre o app para estudos, menos distrações, organização de abas, modo leitura e outros recursos que ajudam no foco.

O escopo seria:
* 1 vídeo vertical com 90 dias de direito de imagem para uso em anúncios
* Ao mostrar o navegador no vídeo, precisa ser em um celular Android
* Valor: R$450
* Entrega do Roteiro: entre segunda e terça-feira que vem. 

Você teria interesse nessa marca também? :)

Fico no aguardo! ', false, '2026-02-12 19:44:26.445091+00', '2026-04-20 15:32:58.8825+00'),
('02580398-2ea1-4db2-a771-f3990b197243', 'Pharmapele ', null, null, 'ugc', 'postado', 1, '450', 'pago', '30dias', null, null, null, null, null, null, null, '2026-04-14', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', '🎬 ROTEIRO FINAL — “SABOR ÔMEGA”
Tom: humor, cotidiano, levemente constrangedor
Atuação: Quanto mais natural, melhor.

CENA 1 
📍 Drogaria comum (Pode ser fundo verde)
Cliente (normal, educado):
“Oi, você tem ômega-3?”
Farmacêutico de jaleco branco (prático, sem pensar muito):
“Tenho sim…
esse potão aqui, ó… baratinho.”
👉 Farma pega um pote grande, coloca no balcão com certa confiança.

CENA 2 
Cliente: “Esse é bom?”
(meio segundo de silêncio — importante)

CENA 3
Farmacêutico, meio sem graça, constrangido, gaguejando: “É…assim… sabor ômega, né.”

CENA 4 
Cliente faz cara de medo, desconfiado (não exagerada, só um “hmm…”)


Farmacêutico faz cara de constrangimento (tipo “pois é”)


Cliente balança a cabeça em negação (“não, obrigado”)


Nenhuma fala.  Só linguagem corporal.

CENA 5 
📍 Casa do cliente -  Sala ou cozinha
Ele tira da sacola da Pharmapele um frasco de ômega-3 (discreto, bonito). Zoom no frasco.
Retira uma cápsula e toma a cápsula com água.
Sorriso pequeno, satisfeito.


LEGENDA

“Sabor ômega” é aquele que parece ômega, mas é só óleo de peixe diluído e pouquíssimo princípio ativo. 🐠😣 Resultado: você precisa de vááárias cápsulas pra atingir uma dose minimamente relevante. ⬇️
Um bom ômega-3 é definido pela proporção de EPA e DHA,💊 responsáveis pelos efeitos reais no organismo. 🧬
Aqui a conversa é outra: Super Ômega-3 com alta concentração de EPA e DHA.🙏🏻🔝
Menos cápsulas e benefícios reais para o coração, a inflamação e o cérebro. ❤️🧠🧬

Fazer stories com fotos da UGC, pra não ficar parecendo card pronto.
STORY 1 
Texto na tela: Você usa ômega-3?
ENQUETE
Uso, claro


Não uso ainda

STORY 2 
Texto na tela: Você sabe escolher um bom ômega-3? (Foto da influ segurando os dois potes: pharmapele e sabor ômega)
ENQUETE
Escolho pelo preço e tamanho do pote


Escolho pela quantidade de EPA e DHA


STORY 3 -  Repost do Feed 
', false, '2026-02-13 17:09:45.781497+00', '2026-04-20 15:32:44.233247+00'),
('47397a8c-1ab0-4bce-b0d7-b3af1c28efec', 'Ateliê', null, null, 'publicidade', 'briefing', 1, '0', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, null, null, false, '2026-02-20 01:11:14.277854+00', '2026-04-01 13:30:48.191502+00'),
('7412a70f-445b-4b6a-972c-4592e32e154c', 'Lust | Mocassim Sophie', null, null, 'ugc', 'postado', 1, '350', 'pago', '30dias', null, '2026-03-02', '2026-03-03', null, null, null, null, '2026-04-24', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', 'Oi, Lara! Vou te contextualizar rapidamente sobre a Lust e o Mocassim Sophie para te ajudar na criação 💛

A Lust é uma marca de calçados femininos produzidos sob demanda, de forma artesanal, 100% em couro legítimo. Nosso ateliê fica no Rio Grande do Sul (polo calçadista do Brasil) e enviamos para todo o país.

Nosso branding tem como essência a elegância, o clássico e o artesanal ! Valorizamos peças atemporais, bem feitas e fáceis de usar no dia a dia de mulheres reais.

Sobre o Mocassim Sophie:

Público principal: mulheres entre 26 e 48 anos

Perfil: mulher prática, elegante e que preza por qualidade e conforto

Uso: trabalho, compromissos do dia a dia e looks mais arrumados sem perder conforto

Diferencial: couro macio, acabamento refinado e design clássico que não sai de moda.

A ideia do vídeo é mostrar o Sophie como um calçado versátil, sofisticado e confortável, algo que “eleva” qualquer look sem esforço ', false, '2026-03-01 08:21:14.622378+00', '2026-04-24 21:45:18.029784+00'),
('86ad5c46-fadb-40b0-ad01-ef4269e20f15', 'Mercado Bitcoin', null, null, 'ugc', 'postado', 1, '900', 'pago', '30dias', null, null, null, null, null, '2026-04-07', null, '2026-06-16', false, false, null, null, '📹 VISUAL/CENA:
MERB0520: https://docs.google.com/document/d/1mNfAr2QgnnAmg11TfYV2DlRBf4-_lsisHonEuJVCBtY/edit?tab=t.0#heading=h.d049v0ta7df2

MERB0525: https://docs.google.com/document/d/1YNuA5tzEx44cgn1lGpe8_xUPew6AtAWoVbKoB9QS714/edit?tab=t.0#heading=h.uxta9doys7ag

MERB0529: https://docs.google.com/document/d/1MQbpWF1InJeKAbEag2qwiqylOiVPMREsb5zloqSnK5o/edit?tab=t.0#heading=h.hko6uco345jc

🎙️ ÁUDIO/FALA:
 oo', 'MERB0520: https://docs.google.com/document/d/1mNfAr2QgnnAmg11TfYV2DlRBf4-_lsisHonEuJVCBtY/edit?tab=t.0#heading=h.d049v0ta7df2

MERB0525: https://docs.google.com/document/d/1YNuA5tzEx44cgn1lGpe8_xUPew6AtAWoVbKoB9QS714/edit?tab=t.0#heading=h.uxta9doys7ag

MERB0529: https://docs.google.com/document/d/1MQbpWF1InJeKAbEag2qwiqylOiVPMREsb5zloqSnK5o/edit?tab=t.0#heading=h.hko6uco345jc', false, '2026-03-02 16:26:07.014846+00', '2026-06-16 14:29:13.209586+00'),
('6665fd1d-d9f0-46c0-a1dc-8f1818a761ab', 'Oka Hauss', 'Oka Hauss', null, 'ugc', 'postado', 1, '0', 'pago', '30dias', null, null, '2026-04-01', '2026-04-02', '2026-04-04', null, null, '2026-04-02', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-04-02 12:13:01.726528+00', '2026-05-28 21:59:27.152467+00'),
('25c2d34f-223a-418d-8a3f-8485152f36f5', 'Box magenta', null, null, 'publicidade', 'postado', 1, '1440', 'pago', '30dias', null, null, null, null, null, null, null, '2026-04-22', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-04-14 19:47:10.395236+00', '2026-04-22 15:13:06.967998+00'),
('b003a241-0066-4f65-afdd-df832d36ba22', 'Noma', null, null, 'publicidade', 'postado', 1, '850', 'pago', '60dias', null, null, null, null, null, null, null, '2026-06-18', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-04-14 19:54:42.17498+00', '2026-06-18 17:50:58.937698+00'),
('e03c08d4-918d-402f-b535-07c9c455bda8', 'InfinityPay | Amplify', null, null, 'ugc', 'postado', 1, '1000', 'pago', '60dias', null, null, null, null, null, null, null, '2026-06-16', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-04-22 15:18:39.26971+00', '2026-06-16 14:29:18.268889+00'),
('9b485038-8110-42dc-9711-ddbd42e0c269', 'Seu Influencer | Vero internet', null, null, 'ugc', 'postado', 1, '400', 'pago', '60dias', null, null, null, null, null, null, null, '2026-06-18', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-04-24 12:44:09.637926+00', '2026-06-18 17:53:07.969739+00'),
('7cab3aa1-e722-417f-bed9-d341d6569aa7', 'Seu Influencer | Squadz', null, null, 'ugc', 'postado', 1, '250', 'pago', '60dias', null, null, null, null, null, null, null, '2026-06-01', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-04-24 12:44:40.851775+00', '2026-06-01 15:10:37.50737+00'),
('28c4aa80-c903-4fa7-9cec-d5ba25b79c23', 'Voy', null, null, 'publicidade', 'postado', 1, '1000', 'pago', '30dias', null, null, null, null, null, null, null, '2026-06-02', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-04-24 12:45:24.376728+00', '2026-06-02 13:39:09.822761+00'),
('7438cd61-34c9-4376-b45c-786fd474ba13', 'Box Magenta', null, null, 'ugc', 'postado', 1, '1520', 'pago', '30dias', null, null, null, null, null, null, null, '2026-06-22', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-01 14:42:21.52465+00', '2026-06-22 18:41:26.774456+00'),
('7716a078-c8aa-4cc9-80a9-983fbe00b10e', ' Lemon Clash - Gummy Agencia ', 'Lemon Clash', null, 'publicidade', 'postado', 1, '1700', 'pago', '30dias', '2026-05-14', '2026-05-15', '2026-05-17', null, '2026-05-20', null, null, '2026-07-19', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-11 14:43:26.511037+00', '2026-07-20 01:37:59.576581+00'),
('63ef9cc2-e730-4e35-be6a-eec368402239', 'Coza | Maio ', 'Coza', null, 'ugc', 'postado', 1, '250', 'pago', '30dias', null, null, null, null, null, null, null, '2026-06-27', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-11 17:46:49.5881+00', '2026-06-27 16:35:05.516269+00'),
('a992213a-5ce5-4e54-9264-f28ae3ebf506', 'Labotrate', null, null, 'publicidade', 'postado', 1, '250', 'pago', '30dias', null, null, null, null, null, null, null, '2026-08-17', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-12 14:15:09.349084+00', '2026-08-17 14:23:56.861247+00'),
('bbae0fb5-8185-4951-b0d5-8d890dbab73c', 'Circle Beauty ', 'circle', null, 'ugc', 'postado', 1, '650', 'pago', '30dias', '2026-05-19', '2026-05-22', '2026-05-30', null, null, null, null, '2026-07-19', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-19 17:16:42.218371+00', '2026-08-03 15:21:24.732947+00'),
('62c85646-0d78-48cb-9385-de660daec87e', 'Seu Influencer', 'Seu Influencer', null, 'ugc', 'postado', 1, '250', 'pago', '30dias', null, null, null, null, null, null, null, '2026-09-04', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-19 17:22:44.634493+00', '2026-09-04 19:16:45.706901+00'),
('5a820fab-acd2-430b-a847-6b6148003baf', 'Use Eu Memo', 'Seu Influencer', null, 'ugc', 'postado', 1, '250', 'pago', '30dias', null, null, null, null, null, null, null, '2026-06-24', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-19 17:26:53.936112+00', '2026-06-24 16:25:31.222843+00'),
('8d18b77d-267b-42e4-b3a5-3f85b15aa19d', 'BelTempo - Manager', null, null, 'outro', 'negociando', 1, '0', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-22 14:02:22.980492+00', '2026-09-04 19:42:07.415125+00'),
('1ae618e5-e77a-4294-9bf0-52828679ec64', 'Ds', null, null, 'ugc', 'postado', 1, '350', 'pago', '30dias', null, null, null, null, null, null, null, '2026-07-19', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-22 14:03:23.711624+00', '2026-07-20 01:39:35.842193+00'),
('955efe4a-c12b-4cbd-a33c-bae7a70c4eee', 'OLX', null, null, 'ugc', 'postado', 1, '250', 'pendente', '30dias', null, null, null, null, '2026-06-02', null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-22 14:03:35.875719+00', '2026-07-20 01:40:06.542559+00'),
('278a20d4-658d-409d-8bea-5515e8420979', 'Touti Cosmetics', 'Touti Cosmetics', null, 'ugc', 'postado', 1, '400', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-23 02:49:29.147555+00', '2026-08-12 19:26:50.812882+00'),
('3e4d2c19-4e6e-484d-bc94-0d7164187d6c', 'Shopee ', null, null, 'publicidade', 'postado', 1, '500', 'pago', '30dias', null, null, null, null, null, null, null, '2026-06-08', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-23 02:59:19.001519+00', '2026-06-14 14:49:56.212674+00'),
('4c120324-94a1-4bd9-b1d7-b1b148df307e', 'Meta Brandlovrs | Instagram ', null, null, 'publicidade', 'postado', 1, '900', 'pago', '30dias', null, null, null, null, null, null, null, '2026-06-18', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-23 03:02:52.341166+00', '2026-06-18 17:54:03.061577+00'),
('57488bcb-b943-43b5-b995-679e387a3319', 'Sincrofit | Smartwatch ', 'Sincrofit', null, 'ugc', 'postado', 1, '400', 'pago', '30dias', null, null, null, null, null, null, null, '2026-07-19', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-25 14:46:37.129427+00', '2026-07-20 01:39:08.561006+00'),
('1225937f-a2e7-4797-9415-4cfa1e0b770b', 'XP Investimento', 'brandlovrs', null, 'publicidade', 'postado', 1, '2860', 'pago', '30dias', null, null, null, null, null, null, null, '2026-06-08', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-27 03:22:56.998874+00', '2026-06-08 18:30:21.605547+00'),
('460327d7-2037-4508-b890-a45e0783e953', ' Joar Company | Proton VPN', null, null, 'publicidade', 'postado', 1, '5000', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-27 03:23:21.298956+00', '2026-08-03 15:21:17.229383+00'),
('19a3f81a-17f8-4b07-ba99-125ba0c72f16', 'Milha Ai - Aureo Travel', null, null, 'publicidade', 'briefing', 1, '350', 'pago', '30dias', null, null, null, null, null, null, null, '2026-05-28', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-27 03:24:24.20539+00', '2026-06-05 15:05:23.006444+00'),
('e404a689-b629-4bfa-99f7-f742f084010a', 'Abelheiro | Dia dos namorados', 'Seu Influencer', null, 'publicidade', 'postado', 1, '350', 'pago', '30dias', '2026-05-29', '2026-06-01', null, null, null, null, null, '2026-08-01', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-05-30 02:11:04.710414+00', '2026-08-03 15:22:07.801185+00'),
('8623f95b-18bd-401b-b84b-6f54e76ce409', 'Volta Vibe | Sup Combate Álcool ', 'Seu Influencer', null, 'publicidade', 'postado', 1, '250', 'pago', '30dias', null, null, null, null, null, null, null, '2026-06-24', false, false, null, null, '
pensamos em algo nessa linha:
sinta-se a vontade para dar seu toque ao vídeo!

Objetivo: Educação + identificação + conversão

⸻

CENA 1 | HOOK

(olhando direto para a câmera)

“Sabe aquela dor de cabeça depois de beber? Ela não acontece só porque você bebeu demais.”

⸻

CENA 2 | QUEBRA DE PADRÃO

(corte rápido)

“Na verdade, o álcool faz você perder líquidos e eletrólitos importantes, além de aumentar a inflamação no organismo.”

Texto na tela:
“Desidratação + perda de eletrólitos”

⸻

CENA 3 | EDUCAÇÃO

(imagens da pessoa voltando de um evento, acordando cansada ou tomando café pela manhã)

“Por isso, no dia seguinte você pode sentir dor de cabeça, cansaço, indisposição e aquela sensação de que sua energia ficou pelo caminho.”

⸻

CENA 4 | SOLUÇÃO

(segurando a Volta Vibe)

“Foi exatamente por isso que eu comecei a usar a Volta Vibe.”

“Ela combina eletrólitos, vitaminas e nutrientes que ajudam a repor o que o álcool faz seu corpo perder.”

⸻

CENA 5 | BENEFÍCIO

(imagens treinando, trabalhando, passeando ou aproveitando o dia)

“Porque eu não quero escolher entre aproveitar um momento especial e me sentir bem no dia seguinte.”

⸻

CENA 6 | CTA

(close no produto)

“Se você gosta de aproveitar seus momentos, mas não gosta de perder o dia seguinte por causa deles, conheça a Volta Vibe.”

“Porque uma vida equilibrada não exige que você abra mão dos bons momentos.”

“Ela só exige que você esteja preparado para viver todos eles.”', null, false, '2026-06-01 16:39:26.961057+00', '2026-06-24 16:25:19.031933+00'),
('18555636-c948-4e1d-a6b4-a5a96c123627', 'Eita | Wpp com IA ', 'Seu Influencer', null, 'publicidade', 'postado', 1, '250', 'pago', '30dias', null, null, null, null, null, null, null, '2026-07-19', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-06-01 16:48:54.437075+00', '2026-07-20 01:36:42.043774+00'),
('ccedcbd1-cfe0-4354-afc2-ba0e0f1346d3', 'Voy Saude | Junho ', 'voy', null, 'publicidade', 'postado', 1, '0', 'pago', '30dias', null, null, null, null, '2026-06-10', null, null, '2026-06-22', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-06-07 15:38:25.600047+00', '2026-06-22 18:41:13.840231+00'),
('6292aabb-073d-4538-adfc-2a18572d42a6', 'Marquei.ia.br', 'Seu Influencer', null, 'publicidade', 'postado', 1, '350', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-06-09 15:01:54.762773+00', '2026-08-03 15:21:13.614228+00'),
('6b85faf3-6989-43d2-afb4-87e164431852', 'História De Reforma - Reforma100', 'Seu Influencer', null, 'publicidade', 'postado', 1, '250', 'pago', '30dias', null, null, null, null, null, null, null, '2026-06-22', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-06-10 22:43:56.000854+00', '2026-06-22 19:02:11.298382+00'),
('6d20c756-b7c9-4e38-acc9-2ac92a5facc4', 'Aneethun', 'Seu Influencer', null, 'publicidade', 'postado', 1, '500', 'pago', '30dias', null, null, null, null, null, null, null, '2026-09-04', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-06-10 22:44:44.230101+00', '2026-09-04 19:24:51.105166+00'),
('efd09f1e-b0ff-4bb3-92d3-887168605747', 'Shopee (Sho Creators) ', null, null, 'publicidade', 'postado', 1, '400', 'pago', '30dias', null, null, null, null, '2026-06-20', '2026-07-15', null, '2026-07-19', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', 'Responsavel Ana Vitoria: 14 99162-3037 ', false, '2026-06-16 17:19:43.383823+00', '2026-07-20 01:36:21.994874+00'),
('f8bc3785-fdcb-473f-901d-b84d063ae905', 'Banco BV', 'Banco BV', null, 'ugc', 'postado', 1, '1350', 'pago', '30dias', null, null, null, '2026-07-06', null, null, null, '2026-08-18', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-07-04 15:36:39.050157+00', '2026-08-18 14:46:28.309721+00'),
('d8eac34d-ba99-4683-a77f-bc0d1034ad09', 'VOY Saude | Julho', null, null, 'publicidade', 'postado', 1, '1000', 'pago', '30dias', null, null, null, null, null, null, null, '2026-08-12', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-07-09 14:17:45.243066+00', '2026-08-12 19:27:24.563179+00'),
('c834edd3-00ae-49ec-9860-014dd6e929c8', 'meta', null, null, 'publicidade', 'postado', 1, '1204', 'pago', '90dias', null, null, null, null, null, null, null, '2026-09-04', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-07-20 01:43:49.86241+00', '2026-09-04 19:19:19.668092+00'),
('7fa036ec-22ba-4dbf-8dee-6ed7112c4756', 'Reforma 100', null, null, 'publicidade', 'postado', 1, '500', 'pago', '30dias', null, null, null, null, null, null, null, '2026-09-04', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-07-20 01:44:27.521751+00', '2026-09-04 19:21:48.851669+00'),
('1d850160-5a67-457f-bbf7-ca450cc5deb2', 'Infinite Pay', null, null, 'publicidade', 'postado', 1, '900', 'pago', '30dias', null, null, null, null, null, null, null, '2026-09-04', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-07-20 01:44:48.028931+00', '2026-09-04 19:18:54.197655+00'),
('45dfe77c-91d2-482c-8cc3-2011dbb87cf1', 'Cola de rodape', null, null, 'publicidade', 'postado', 1, '250', 'pago', '30dias', null, null, null, null, null, null, null, '2026-08-17', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-07-20 01:48:39.357149+00', '2026-08-17 14:20:29.034714+00'),
('13b78499-650a-401b-9df8-7a4705256b44', 'lorenzetti', null, null, 'publicidade', 'postado', 1, '750', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-03 16:57:09.777444+00', '2026-09-04 19:40:55.741339+00'),
('07bda806-ca52-4a01-ba70-c43cbe4e9488', 'pharmapele', null, null, 'publicidade', 'postado', 1, '300', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-03 18:10:23.366305+00', '2026-09-04 19:20:38.53106+00'),
('b5daa253-faaa-46c7-89fe-af04c565cb0c', 'hostgator', null, null, 'publicidade', 'postado', 1, '350', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-03 18:17:38.051288+00', '2026-09-04 19:20:35.582194+00'),
('527b21e5-1149-420e-a4a1-24ace891c599', 'Vozo | PAG 17 e 24 de setembro', null, null, 'publicidade', 'postado', 1, '600', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', '17 e 24 de setembro.', false, '2026-08-03 18:19:00.906921+00', '2026-09-08 12:55:13.198382+00'),
('dab7a778-6251-4810-a7a8-91bebdd7b2b9', 'Sintra IA', null, null, 'publicidade', 'postado', 1, '2198', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-07 11:54:20.874654+00', '2026-09-04 19:40:52.368527+00'),
('04bee609-fd77-48d6-a871-020aee564742', 'Invision.lov | Sutiã Adesivo', 'Seu Influencer', null, 'publicidade', 'gravacao', 1, '400', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-17 16:03:55.294498+00', '2026-09-04 19:41:44.49868+00'),
('cdffa256-c9b4-45f6-becb-ae4c96550943', 'Embaixadoras Nixnix ', 'Seu Influencer', null, 'publicidade', 'roteiro', 1, '350', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, true, '2026-08-17 16:04:17.618973+00', '2026-09-17 03:25:25.870014+00'),
('8b6b033e-2214-4258-b2c8-7bdff7a2b35c', 'Brandlovr | Mercado Pago', 'brandlovrs', null, 'publicidade', 'postado', 1, '602.67', 'pago', '30dias', null, null, null, null, '2026-08-19', null, null, '2026-09-04', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-17 18:49:47.987242+00', '2026-09-04 19:19:15.700325+00'),
('f7203722-1996-4ea9-8288-f16041e28227', 'Meliuz', null, null, 'publicidade', 'postado', 1, '1200', 'pago', '30dias', null, null, null, null, null, null, null, '2026-09-04', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-18 16:06:10.165577+00', '2026-09-04 19:19:33.154499+00'),
('f13d1e80-c322-403c-918f-acf3d37efc60', 'Salvatore br', 'Seu Influencer', null, 'ugc', 'roteiro', 1, '212', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, true, '2026-08-18 16:06:50.044002+00', '2026-09-08 02:02:34.394479+00'),
('c6911380-54ab-429d-8b73-f10f7e9d907d', 'Campanha Creamy | Pore Refiner ', 'Seu Influencer', null, 'publicidade', 'postado', 1, '1000', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-18 16:07:22.328662+00', '2026-09-04 19:40:57.395133+00'),
('889e99fd-2874-4440-9bd9-114ee9baa55c', 'Avora Cosmeticos | Shampoo', 'Seu Influencer', null, 'ugc', 'briefing', 1, '500', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-18 16:08:05.982707+00', '2026-08-18 16:08:14.248566+00'),
('7d7e8abf-58a7-4019-8f82-53efa3690776', 'Video Composer IA + Lara Dam', null, null, 'publicidade', 'postado', 1, '300', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-18 16:53:56.245752+00', '2026-09-04 19:40:59.177986+00'),
('f10b5eca-ca81-4757-b0e2-c782120cf71c', 'Maracugina', 'brandlovrs', null, 'publicidade', 'aprovado', 1, '726.75', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, true, '2026-08-22 22:21:59.447118+00', '2026-09-17 19:41:42.898777+00'),
('a9bfe546-a69e-46b9-b278-dac918456675', 'Chá Branco  - Coala', 'Seu Influencer', null, 'publicidade', 'postado', 1, '500', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-22 23:07:52.077031+00', '2026-09-02 14:37:17.992596+00'),
('10f3251e-4901-4275-ba52-99e56aad18bb', 'Apsela Skin Reset', 'Seu Influencer', null, 'publicidade', 'briefing', 1, '330', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-22 23:08:50.334493+00', '2026-08-22 23:08:50.334493+00'),
('30ef628d-3456-4662-a74a-4f64cd117ded', 'Garimpeiros Oficial', 'Seu Influencer', null, 'publicidade', 'postado', 1, '250', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-22 23:09:11.522576+00', '2026-09-04 19:41:02.57517+00'),
('7b865833-9954-46b2-b558-3ecbbd3c01ac', 'Akkermat | Saciedade', 'Seu Influencer', null, 'publicidade', 'aprovacao_roteiro', 1, '350', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-22 23:09:46.952143+00', '2026-09-17 03:22:46.468956+00'),
('8bd0d82c-b154-402c-9cab-ddcd91374d16', 'Hoomy', null, null, 'publicidade', 'postado', 1, '0', 'pago', '30dias', null, null, null, null, null, null, null, '2026-09-04', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-08-23 01:41:48.852967+00', '2026-09-04 19:41:04.583313+00'),
('59a9553b-0250-409c-8cb9-6b0ebedb9458', 'Ivete.ai | ', 'Seu Influencer', null, 'publicidade', 'aprovacao_video', 1, '321', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-01 17:58:31.971224+00', '2026-09-19 17:44:33.717968+00'),
('05451c55-b6a3-4c2f-b6e8-017702465fd5', 'Liv for her - Aplicativo ', 'Seu Influencer', null, 'ugc', 'aprovacao_video', 1, '350', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-04 19:56:39.259328+00', '2026-09-10 16:34:05.729999+00'),
('b858bca7-24c0-4081-bfaa-cba225c333db', 'Abelheiro', null, null, 'ugc', 'gravacao', 1, '1350', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, true, '2026-09-04 19:57:11.21121+00', '2026-09-21 14:15:08.970929+00'),
('ab2115e5-b813-4216-89c5-25e0d1db6006', 'Verdurar', 'Seu Influencer', null, 'publicidade', 'aprovacao_video', 1, '350', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, 'https://drive.google.com/drive/u/0/folders/1euvHjL4AfumwyboFnY18oXU1pe6OSRdt', '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-04 19:59:57.2366+00', '2026-09-21 13:44:36.576497+00'),
('5bfa9510-708c-495d-a3f0-a5782ace6b47', 'Fancy | Bateria portatil', 'Seu Influencer', null, 'publicidade', 'gravacao', 1, '350', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, true, '2026-09-04 20:01:21.794165+00', '2026-09-15 13:52:26.580149+00'),
('095fd3e0-da8e-43d2-9ec6-e10ef71f59ec', 'Vale Fertil', 'Vale Fertil', null, 'publicidade', 'aprovacao_video', 1, '2500', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-08 00:23:42.793234+00', '2026-09-17 17:54:49.394661+00'),
('8d1e17d6-ea5b-4749-9fe9-c2b5fe124429', 'hiCreator', 'hiCreator', null, 'publicidade', 'gravacao', 1, '1.537', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', '300 dolares', true, '2026-09-08 00:24:14.780483+00', '2026-09-17 00:08:46.056063+00'),
('e70d179a-9812-4623-b524-e3f8b0a2a25a', 'Pollo AI', null, null, 'publicidade', 'gravacao', 1, '512', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', '100 dolares', true, '2026-09-08 00:24:54.184098+00', '2026-09-21 14:15:12.59738+00'),
('532014f9-76d9-4371-afdd-c30ec00333a1', 'CapCut', null, null, 'publicidade', 'negociando', 1, '0', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-08 00:25:30.464431+00', '2026-09-08 00:25:33.8543+00'),
('23a63ff6-6ccb-4ad0-b05e-ecb5bbb7fa55', 'Brinox ', null, null, 'permuta', 'roteiro', 1, '0', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-08 13:28:46.70089+00', '2026-09-15 02:36:05.030045+00'),
('ad236ef7-4cb9-41fd-b7e5-58953b4126cd', 'HiNoter', null, null, 'publicidade', 'gravacao', 1, '1025.24', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, true, '2026-09-08 13:30:03.27069+00', '2026-09-21 14:15:00.194581+00'),
('cdc336f5-c16d-4362-b50c-f6222125900e', 'Campanha COZA', null, null, 'outro', 'postado', 1, '1400', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-08 15:04:35.579545+00', '2026-09-08 15:04:46.291742+00'),
('1334cd4a-c2fb-4227-a52c-41cf6fc4c883', 'Sleepo', null, null, 'publicidade', 'roteiro', 1, '992', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-08 17:33:32.009901+00', '2026-09-17 03:18:45.552446+00'),
('c7868443-21f2-4446-8957-564f0faaf905', 'Mercago Pago', null, null, 'publicidade', 'aprovacao_video', 1, '500', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-09 21:23:53.621296+00', '2026-09-16 18:53:57.890983+00'),
('078a2286-6fa9-4aaa-94d4-35dbcbcb14e8', 'Bradesco', null, null, 'publicidade', 'negociando', 1, '1000', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-10 19:13:56.173772+00', '2026-09-10 19:14:05.728584+00'),
('5bcdf221-1bac-4280-854c-8ca7c69cffc0', 'Caixa Tomada', null, null, 'permuta', 'briefing', 1, '0', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-10 19:16:25.981477+00', '2026-09-15 00:36:49.064669+00'),
('e8d31eeb-3342-48dd-894c-103588e80b1f', 'Energia Solar - Noroeste Solar', 'Seu Influencer', null, 'ugc', 'aprovado', 1, '300', 'pago', '30dias', null, null, null, null, null, null, null, '2026-09-21', false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-15 00:43:56.838365+00', '2026-09-21 13:44:19.146915+00'),
('49d95c84-0f00-439c-9768-d8ae45cd0330', 'DesignKit', 'DesignKit', null, 'publicidade', 'gravacao', 1, '770.87', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, true, '2026-09-15 03:49:51.697004+00', '2026-09-21 14:14:58.16746+00'),
('30bd3f78-e41e-4c6d-986e-c98041a7df6e', 'Cabide A Vácuo', 'Seu Influencer', null, 'publicidade', 'briefing', 1, '600', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-17 00:59:39.469782+00', '2026-09-17 00:59:39.469782+00'),
('49240a64-70b7-4d8d-88e5-5f1122711f40', 'Quem disse, Berenice? ', 'brandlovrs', null, 'publicidade', 'briefing', 1, '613.12', 'pendente', '30dias', null, null, '2026-09-20', null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-17 17:52:05.564958+00', '2026-09-17 17:52:05.564958+00'),
('a8f304d8-1e27-4b0e-ac01-ae89f3d06d3f', 'UTUA | Cartão de Credito', 'brandlovrs', null, 'publicidade', 'briefing', 1, '529.99', 'pendente', '30dias', null, null, '2026-09-18', null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-17 17:52:42.921077+00', '2026-09-17 17:52:42.921077+00'),
('edd0736e-84c4-480c-b9b9-060862842a51', 'Serviço De Ass | Medicos ', 'Seu Influencer', null, 'publicidade', 'briefing', 1, '750', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-17 17:53:47.412293+00', '2026-09-17 17:53:47.412293+00'),
('12db1f69-f68e-41c3-b2f9-94a292adab64', 'Reforma100', 'reforma100', null, 'ugc', 'aprovacao_video', 1, '1000', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, true, '2026-09-17 19:41:17.649965+00', '2026-09-21 13:36:19.261107+00'),
('d5fe095c-6054-48c9-9774-86b92c04dbc5', 'Infinite Pay | Amplify', 'Amply', null, 'ugc', 'briefing', 1, '600', 'pendente', '30dias', null, null, null, null, null, null, null, null, false, false, null, null, '📹 VISUAL/CENA:


🎙️ ÁUDIO/FALA:
', null, false, '2026-09-21 16:41:03.451738+00', '2026-09-21 16:41:03.451738+00')
on conflict (origem_id) do nothing;
