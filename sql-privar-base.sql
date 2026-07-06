-- ============================================================
-- PRIVAR A BASE — fechar leitura pública de creators + casting
-- ============================================================
-- Rodado em 2026-07-05 (projeto mfrmnquvwwuxraqgemyh).
--
-- Motivo: a tabela creators tinha uma policy de SELECT liberada pra
-- {public} (USING true) => qualquer anônimo baixava nome/email/whatsapp
-- da base inteira com a anon key. Isso existia só pra alimentar o CRM
-- agencia.laradam, que tem login "de fachada" (conecta como anon).
--
-- Decisão da Lara: sem marcas ativas no momento => PRIVAR agora. O login
-- de verdade do CRM (Supabase Auth) fica pra depois; enquanto isso, a
-- busca de creators e a planilha de casting DENTRO do CRM ficam sem dados.
--
-- Continua funcionando: painel das alunas e admin (leem como authenticated),
-- cadastro público (INSERT segue liberado), e /apresentacao (usa
-- casting_vitrine, SECURITY DEFINER, que ignora RLS).
--
-- ROLLBACK (se precisar reabrir):
--   create policy "Allow anon read creators" on public.creators
--     for select to public using (true);
--   grant execute on function public.casting_agencia_full(text) to anon;
--   grant execute on function public.casting_agencia(text) to anon;
-- ============================================================

-- 1) Fechar leitura anônima da base de creators.
--    (a policy "Autenticados podem ler creators" continua => logados leem)
drop policy if exists "Allow anon read creators" on public.creators;

-- 2) Tirar do anônimo as funções de casting com PII completa.
--    IMPORTANTE: funções no Postgres têm grant pra PUBLIC por padrão, e anon
--    herda disso. Só revogar de anon NÃO basta — tem que revogar de PUBLIC.
--    (authenticated segue com acesso, pro CRM quando tiver login de verdade;
--     casting_vitrine, mascarada, continua liberada pra anon na /apresentacao)
revoke execute on function public.casting_agencia_full(text) from public;
revoke execute on function public.casting_agencia_full(text) from anon;
revoke execute on function public.casting_agencia(text) from public;
revoke execute on function public.casting_agencia(text) from anon;
grant execute on function public.casting_agencia_full(text) to authenticated;
grant execute on function public.casting_agencia(text) to authenticated;
