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
