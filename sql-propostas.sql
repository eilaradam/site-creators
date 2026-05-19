-- ════════════════════════════════════════════════════════════════
-- PROPOSTAS (admin.html → seção Propostas) — rede de segurança + setup
-- ════════════════════════════════════════════════════════════════
-- Cria a tabela onde as propostas ficam salvas, libera o admin (logado)
-- pra criar/editar/excluir, e libera LEITURA pública (a página de
-- proposta que o cliente abre precisa ler o conteúdo).
--
-- COMO RODAR (uma vez só):
--   Supabase → projeto "Cadastro de Creators" → SQL Editor → New query
--   → cole tudo isto → Run. Rodar de novo não apaga nada.
-- ════════════════════════════════════════════════════════════════

create table if not exists public.propostas (
    slug        text primary key,
    cliente     text not null,
    nicho       text,
    status      text default 'rascunho',
    data_envio  text,
    conteudo    jsonb not null default '{}'::jsonb,
    updated_at  timestamptz default now()
);

alter table public.propostas enable row level security;

-- Leitura pública (a página da proposta é aberta pelo cliente, sem login)
drop policy if exists "propostas leitura publica" on public.propostas;
create policy "propostas leitura publica" on public.propostas
    for select using (true);

-- Só quem está logado (admin) pode criar/editar/excluir
drop policy if exists "propostas escrita logada" on public.propostas;
create policy "propostas escrita logada" on public.propostas
    for all to authenticated using (true) with check (true);

-- Proposta da Miriele já cadastrada (a página estática dela continua valendo;
-- isto é só pra ela ficar salva e gerenciável no painel).
insert into public.propostas (slug, cliente, nicho, status, data_envio, conteudo, updated_at)
values ('cliente-mirielesousa', 'Miriele Sousa', 'Beauty & Wellness', 'enviado', '', '{"contexto":["Suas marcas de beauty precisam de criativo novo toda semana pra não saturar a mídia paga, e isso significa volume real de UGC rodando o tempo todo.","Cada campanha exige falar com 20, 30 creators diferentes: filtro, briefing, follow-up, revisão, NF. É operação demais pra quem precisa estar pensando em estratégia.","Marca de beauty tem nuance: pele, idade, rotina, perfil. Curadoria errada queima orçamento e não converte. Curadoria certa é o que diferencia campanha boa de campanha medíocre."],"frase":"Você passa o briefing da marca. Eu devolvo os vídeos prontos pra entrar no ar. Tudo no meio (seleção de creator, alinhamento, produção, revisão, NF, direito de uso) fica do meu lado.","pacotes":[{"creators":30,"videosCreator":1,"valorVideo":450,"gestaoPct":20},{"creators":15,"videosCreator":2,"valorVideo":400,"gestaoPct":20},{"creators":5,"videosCreator":2,"valorVideo":400,"gestaoPct":25}],"videos":["i62BOlzvQlo","15nOoGJ872g","ATz4wOA_mAc","r-n9UcOlC24"],"validade":"Esta proposta é válida por 15 dias a partir do envio.","cronograma":"Início em até 5 dias úteis após aprovação · entrega conforme o escopo."}'::jsonb, now())
on conflict (slug) do nothing;
