-- Lista de espera (próxima turma da Imersão)
-- Página pública: creators.laradam.com/lista-espera
-- Rodar 1x no SQL Editor do projeto "Cadastro de Creators".

create table if not exists public.lista_espera (
    id          uuid primary key default gen_random_uuid(),
    created_at  timestamptz not null default now(),
    nome        text not null,
    email       text not null,
    whatsapp    text,
    instagram   text,
    origem      text,                      -- ?ref= do link (dm, comentario, bio, story...)
    interesse   text not null default 'imersao',
    avisada     boolean not null default false
);

-- Mesma pessoa não entra duas vezes na mesma lista (o site trata o erro como "já está na lista").
create unique index if not exists lista_espera_email_uidx
    on public.lista_espera (lower(email), interesse);

create index if not exists lista_espera_created_idx
    on public.lista_espera (created_at desc);

alter table public.lista_espera enable row level security;

-- Qualquer pessoa se inscreve (formulário público, anon).
drop policy if exists "lista_espera insert publico" on public.lista_espera;
create policy "lista_espera insert publico" on public.lista_espera
    for insert to public with check (true);

-- Só a Lara (logada) lê e gerencia. Anon NÃO lê os e-mails de quem se inscreveu.
drop policy if exists "lista_espera leitura logada" on public.lista_espera;
create policy "lista_espera leitura logada" on public.lista_espera
    for select to authenticated using (true);

drop policy if exists "lista_espera update logada" on public.lista_espera;
create policy "lista_espera update logada" on public.lista_espera
    for update to authenticated using (true) with check (true);

drop policy if exists "lista_espera delete logada" on public.lista_espera;
create policy "lista_espera delete logada" on public.lista_espera
    for delete to authenticated using (true);
