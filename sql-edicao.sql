-- ============================================================
--  Aba Edição do admin (creators.laradam.com/admin.html)
--  Versões de vídeo, comentários no segundo exato, regras do estilo
--  de edição e dicionário de correções de transcrição por cliente.
--  Cola tudo no SQL Editor do projeto "Cadastro de Creators" e roda.
--  Pode rodar de novo sem quebrar nada.
-- ============================================================

-- Versões de cada vídeo em edição (ligadas à campanha da aba Conteúdos)
create table if not exists public.edicao_versoes (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  conteudo_id uuid not null references public.conteudos(id) on delete cascade,
  numero integer not null default 1,
  titulo text,
  arquivo_path text,          -- caminho no bucket privado "edicao"
  link text,                  -- ou um link externo (Drive etc.)
  notas text
);
create index if not exists edicao_versoes_conteudo_idx on public.edicao_versoes (conteudo_id, numero desc);

-- Comentários marcados no segundo exato do vídeo
create table if not exists public.edicao_comentarios (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  versao_id uuid not null references public.edicao_versoes(id) on delete cascade,
  conteudo_id uuid not null references public.conteudos(id) on delete cascade,
  tempo_s numeric(8,2) not null default 0,
  tipo text not null default 'outro' check (tipo in ('corte','zoom','som','musica','legenda','animacao','cor','outro')),
  texto text not null,
  resolvido boolean not null default false
);
create index if not exists edicao_comentarios_versao_idx on public.edicao_comentarios (versao_id, tempo_s);

-- Regras do estilo de edição (o que o Claude lê antes de editar)
create table if not exists public.edicao_regras (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  texto text not null,
  motivo text,
  categoria text not null default 'outro' check (categoria in ('corte','zoom','som','musica','legenda','animacao','cor','ritmo','outro')),
  cliente text,               -- vazio = vale para todos os vídeos
  status text not null default 'proposta' check (status in ('proposta','aprovada','descartada')),
  origem_comentario_id uuid references public.edicao_comentarios(id) on delete set null
);
create index if not exists edicao_regras_status_idx on public.edicao_regras (status, cliente);

-- Dicionário de correções de transcrição por cliente ("Infinity Pay" -> "InfinitePay")
create table if not exists public.edicao_dicionario (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  cliente text,               -- vazio = vale para todos
  errado text not null,
  certo text not null
);

-- Só admin lê e escreve (as alunas também fazem login no site)
alter table public.edicao_versoes enable row level security;
alter table public.edicao_comentarios enable row level security;
alter table public.edicao_regras enable row level security;
alter table public.edicao_dicionario enable row level security;
drop policy if exists "edicao_versoes admin" on public.edicao_versoes;
drop policy if exists "edicao_comentarios admin" on public.edicao_comentarios;
drop policy if exists "edicao_regras admin" on public.edicao_regras;
drop policy if exists "edicao_dicionario admin" on public.edicao_dicionario;
create policy "edicao_versoes admin" on public.edicao_versoes for all to authenticated using (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin')) with check (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin'));
create policy "edicao_comentarios admin" on public.edicao_comentarios for all to authenticated using (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin')) with check (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin'));
create policy "edicao_regras admin" on public.edicao_regras for all to authenticated using (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin')) with check (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin'));
create policy "edicao_dicionario admin" on public.edicao_dicionario for all to authenticated using (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin')) with check (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin'));

-- Bucket PRIVADO para as prévias (vídeo de cliente não fica com link público)
insert into storage.buckets (id, name, public) values ('edicao', 'edicao', false) on conflict (id) do nothing;
drop policy if exists "edicao storage admin le" on storage.objects;
drop policy if exists "edicao storage admin sobe" on storage.objects;
drop policy if exists "edicao storage admin apaga" on storage.objects;
create policy "edicao storage admin le" on storage.objects for select to authenticated using (bucket_id = 'edicao' and exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin'));
create policy "edicao storage admin sobe" on storage.objects for insert to authenticated with check (bucket_id = 'edicao' and exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin'));
create policy "edicao storage admin apaga" on storage.objects for delete to authenticated using (bucket_id = 'edicao' and exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin'));

-- Regras iniciais, tiradas das edições já aprovadas (Reach Up e InfinitePay)
insert into public.edicao_regras (texto, motivo, categoria, cliente, status)
select * from (values
  ('Nunca aplicar zoom nem gráfico por cima de inserções que já vêm no bruto (telas de site, relatórios, logos).', 'Corta o conteúdo da inserção e polui.', 'zoom', null, 'aprovada'),
  ('Zoom de ritmo alternando 100% e 112% nas viradas de frase, centrado um pouco acima do meio (rosto).', 'Aprovado na V1 da Reach Up.', 'zoom', null, 'aprovada'),
  ('Legenda em caixa alta, 2 a 3 palavras por vez, com pop curto na entrada.', 'Aprovado na V1 da Reach Up.', 'legenda', null, 'aprovada'),
  ('Toda edição precisa ter música de fundo e efeitos sonoros nas trocas de cena e na entrada dos textos.', 'Feedback da V1 da InfinitePay: "falta muita coisa".', 'som', null, 'aprovada'),
  ('Só usar música e efeito com licença de uso comercial confirmada.', 'Vídeo de marca é uso comercial.', 'musica', null, 'aprovada'),
  ('Em esquete com duas personagens, não cortar falas como se fossem repetição; só tirar pausas mortas.', 'Diálogo não é repetição.', 'corte', null, 'aprovada')
) as v(texto, motivo, categoria, cliente, status)
where not exists (select 1 from public.edicao_regras);

insert into public.edicao_dicionario (cliente, errado, certo)
select * from (values
  ('InfinitePay', 'Infinity Pay', 'InfinitePay'),
  ('InfinitePay', 'Infinity Py', 'InfinitePay'),
  ('InfinitePay', 'Tép', 'Tap'),
  ('InfinitePay', 'Tasha', 'taxa'),
  ('Reach Up', 'Reet Up', 'Reach Up'),
  (null, 'UC', 'UGC'),
  (null, 'brefin', 'briefing')
) as v(cliente, errado, certo)
where not exists (select 1 from public.edicao_dicionario);

-- ============================================================
--  Fase 1: pedidos de edição automática + referências por tipo
-- ============================================================

-- Pedido: o bruto fica numa pasta do Drive (link); o robô do Mac baixa pelo ID da pasta,
-- edita e devolve a prévia e o final na mesma pasta.
create table if not exists public.edicao_pedidos (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  conteudo_id uuid references public.conteudos(id) on delete set null,
  numero bigint generated always as identity,
  marca text,
  pasta_nome text not null,    -- nome da pasta no Drive: Edição/<pasta_nome>. Não repete (ex.: "InfinitePay", "InfinitePay 2")
  titulo text not null,
  drive_pasta_link text,       -- o robô cria a pasta Edição/<pasta_nome> e escreve o link aqui (ou você cola um link de pasta que já existe)
  drive_pasta_id text,
  roteiro text,
  formato text not null default '9:16' check (formato in ('9:16','4:5','1:1','16:9')),
  duracao_alvo_s integer,
  observacoes text,
  status text not null default 'na_fila' check (status in ('na_fila','aguardando_bruto','baixando','analisando','editando','previa_pronta','em_revisao','renderizando','final_pronto','erro','cancelado')),
  status_msg text,             -- o robô escreve aqui o que está fazendo ou o erro
  projeto jsonb,               -- o projeto em camadas (timeline) que o robô devolve
  previa_link text,
  final_link text
);
create index if not exists edicao_pedidos_status_idx on public.edicao_pedidos (status, created_at);
create unique index if not exists edicao_pedidos_pasta_unica on public.edicao_pedidos (lower(trim(pasta_nome)));

-- Referências: com pedido_id = do pedido; sem pedido_id = biblioteca para reaproveitar
create table if not exists public.edicao_referencias (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  pedido_id uuid references public.edicao_pedidos(id) on delete cascade,
  nome text,                   -- nome na biblioteca ("minha legenda padrão")
  tipo text not null default 'geral' check (tipo in ('geral','legenda','animacao','cortes_zoom','som','cor')),
  link text not null,
  nota text,
  analise jsonb                -- o que o robô mediu na referência (ritmo, zoom, legenda...)
);
create index if not exists edicao_referencias_pedido_idx on public.edicao_referencias (pedido_id);

alter table public.edicao_pedidos enable row level security;
alter table public.edicao_referencias enable row level security;
drop policy if exists "edicao_pedidos admin" on public.edicao_pedidos;
drop policy if exists "edicao_referencias admin" on public.edicao_referencias;
create policy "edicao_pedidos admin" on public.edicao_pedidos for all to authenticated using (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin')) with check (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin'));
create policy "edicao_referencias admin" on public.edicao_referencias for all to authenticated using (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin')) with check (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin'));

-- Marca no pedido: site e redes para o robô pesquisar, e gravação de tela simulando o uso
alter table public.edicao_pedidos add column if not exists marca_site text;
alter table public.edicao_pedidos add column if not exists marca_redes text;
alter table public.edicao_pedidos add column if not exists rec_gravar boolean not null default false;
alter table public.edicao_pedidos add column if not exists rec_passos text;

-- Tipo "Locução + cenas animadas": voz, visual, prompts das cenas e o status "esperando as cenas"
alter table public.edicao_pedidos add column if not exists tipo text not null default 'edicao';
alter table public.edicao_pedidos add column if not exists voz text;
alter table public.edicao_pedidos add column if not exists estilo_visual text;
alter table public.edicao_pedidos add column if not exists cenas jsonb;
alter table public.edicao_pedidos drop constraint if exists edicao_pedidos_tipo_check;
alter table public.edicao_pedidos add constraint edicao_pedidos_tipo_check check (tipo in ('edicao','cenas'));
alter table public.edicao_pedidos drop constraint if exists edicao_pedidos_status_check;
alter table public.edicao_pedidos add constraint edicao_pedidos_status_check check (status in ('na_fila','aguardando_bruto','aguardando_cenas','baixando','analisando','editando','previa_pronta','em_revisao','renderizando','final_pronto','erro','cancelado'));

-- Modelo de legenda escolhido no pedido (lista em robo-edicao/legendas.json)
alter table public.edicao_pedidos add column if not exists legenda_modelo text;

-- Ajustar depois de pronto: ajustes da Lara na linha do tempo, prévia leve para o player do admin e status da V2
alter table public.edicao_pedidos add column if not exists ajustes jsonb;
alter table public.edicao_pedidos add column if not exists previa_path text;
alter table public.edicao_pedidos drop constraint if exists edicao_pedidos_status_check;
alter table public.edicao_pedidos add constraint edicao_pedidos_status_check check (status in ('na_fila','aguardando_bruto','aguardando_cenas','ajustes_na_fila','baixando','analisando','editando','previa_pronta','em_revisao','renderizando','final_pronto','erro','cancelado'));

-- Modelos de título animado liberados no pedido (ids de robo-edicao/titulos, separados por vírgula; vazio = o robô escolhe)
alter table public.edicao_pedidos add column if not exists titulos_modelos text;

-- Reeditar no admin: a Lara mexe no projeto (cortes, legenda, títulos) e o robô só remonta, sem refazer a edição
alter table public.edicao_pedidos drop constraint if exists edicao_pedidos_status_check;
alter table public.edicao_pedidos add constraint edicao_pedidos_status_check check (status in ('na_fila','aguardando_bruto','aguardando_cenas','ajustes_na_fila','remontar_na_fila','baixando','analisando','editando','previa_pronta','em_revisao','renderizando','final_pronto','erro','cancelado'));

-- Áudio do vídeo: 'fala' (ela falando), 'narrado' (cenas + locução gravada à parte) ou 'musica' (vlog sem fala, só música)
alter table public.edicao_pedidos add column if not exists audio_tipo text;

-- Pedido pode pedir duas opções (A e B); sem marcar, o estagiário faz só uma (mais rápido)
alter table public.edicao_pedidos add column if not exists duas_opcoes boolean not null default false;

-- Sinal de vida do estagiário (ele trabalha escondido no Mac): o admin mostra se está ligado
create table if not exists public.edicao_robo (
  id int primary key default 1,
  visto_em timestamptz,
  ultima_msg text,
  escondido boolean
);
insert into public.edicao_robo (id) values (1) on conflict (id) do nothing;
alter table public.edicao_robo enable row level security;
drop policy if exists "edicao_robo admin" on public.edicao_robo;
create policy "edicao_robo admin" on public.edicao_robo for all to authenticated using (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin')) with check (exists (select 1 from public.usuarios where id = auth.uid() and role = 'admin'));
