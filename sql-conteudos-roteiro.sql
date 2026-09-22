-- 22/09/2026: coluna "Roteiro" na aba Conteúdos (modelo de roteiro por link ou arquivo)
alter table public.conteudos add column if not exists roteiro_url text;
alter table public.conteudos add column if not exists roteiro_arquivo text; -- caminho no storage quando foi upload

insert into storage.buckets (id, name, public) values ('conteudos', 'conteudos', true) on conflict (id) do nothing;
drop policy if exists "conteudos storage leitura publica" on storage.objects;
drop policy if exists "conteudos storage logado sobe" on storage.objects;
drop policy if exists "conteudos storage logado atualiza" on storage.objects;
drop policy if exists "conteudos storage logado apaga" on storage.objects;
create policy "conteudos storage leitura publica" on storage.objects for select using (bucket_id = 'conteudos');
create policy "conteudos storage logado sobe" on storage.objects for insert to authenticated with check (bucket_id = 'conteudos');
create policy "conteudos storage logado atualiza" on storage.objects for update to authenticated using (bucket_id = 'conteudos');
create policy "conteudos storage logado apaga" on storage.objects for delete to authenticated using (bucket_id = 'conteudos');
