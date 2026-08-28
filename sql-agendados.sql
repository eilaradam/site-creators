-- Agendamento de e-mails em massa: fila (emails_agendados) + edge function + cron.
-- Já aplicado em 2026-07-03 via Management API + CLI. Este arquivo é só o registro.
-- ⚠️ Repo público: o SECRET real do cron NÃO fica aqui (está nas secrets da função).

create table if not exists public.emails_agendados (
  id uuid primary key default gen_random_uuid(),
  created_at timestamptz not null default now(),
  assunto text not null,
  html text not null,
  destinatario text not null default 'todos',  -- 'todos' | 'teste' | <status>
  agendado_para timestamptz not null,
  status text not null default 'pendente',      -- pendente | enviando | enviado | erro | cancelado
  enviados int, falhas int, pulados int, total int,
  sent_at timestamptz,
  erro text
);
alter table public.emails_agendados enable row level security;
drop policy if exists emails_ag_admin_all on public.emails_agendados;
create policy emails_ag_admin_all on public.emails_agendados
  for all to authenticated using (true) with check (true);
create index if not exists idx_emails_ag_due on public.emails_agendados(status, agendado_para);

-- 2026-08-28: segmentacao geografica viaja junto com o agendamento.
-- Sem isso, agendar com o filtro de estado/cidade ligado no admin enviava pra base inteira.
alter table public.emails_agendados add column if not exists uf text;      -- UF (ex.: 'SP'), null = todos
alter table public.emails_agendados add column if not exists cidade text;  -- cidade exata (ex.: 'Sao Paulo'), so vale com uf

-- Edge function: supabase/functions/processar-emails-agendados/index.ts
--   deploy: supabase functions deploy processar-emails-agendados --project-ref <REF> --no-verify-jwt
--   secret: AGENDADOS_KEY setado nas secrets da função (NÃO commitar o valor).
--   Envia via Resend endpoint em lote (/emails/batch, 100 por chamada).
--
-- Cron (a cada minuto) chama a função com header x-sched-key = AGENDADOS_KEY.
-- Substituir <SECRET> pelo valor real ao rodar (não versionar):
--
--   select cron.schedule('processar-emails-agendados', '* * * * *', $cron$
--     select net.http_post(
--       url := 'https://<REF>.supabase.co/functions/v1/processar-emails-agendados',
--       headers := jsonb_build_object('Content-Type','application/json','x-sched-key','<SECRET>'),
--       body := '{}'::jsonb);
--   $cron$);
