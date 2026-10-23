-- Ultimas aprovacoes do Seu Influencer (aba Robo de inscricoes do admin). Valor e observacoes a Lara preenche no painel.
create table if not exists public.robo_aprovadas (
  chave text primary key,
  titulo text not null,
  marca text,
  etapa text,
  ultima text,
  ordem integer,
  valor numeric(12,2),
  obs text,
  atualizado_em timestamptz not null default now()
);
alter table public.robo_aprovadas enable row level security;
drop policy if exists "robo_aprovadas logado le" on public.robo_aprovadas;
create policy "robo_aprovadas logado le" on public.robo_aprovadas for select to authenticated using (true);
drop policy if exists "robo_aprovadas logado edita" on public.robo_aprovadas;
create policy "robo_aprovadas logado edita" on public.robo_aprovadas for update to authenticated using (true) with check (true);
insert into public.robo_aprovadas (chave,titulo,marca,etapa,ultima,ordem) values
('saciedade com akkermat','Saciedade Com Akkermat',null,'6 - Aprovar gravação','17:52',1),
('embaixadoras nixnix pr','Embaixadoras Nixnix | Produtos De Autocuidado E Fragrâncias Para Corpo E Casa',null,'6 - Aprovar gravação','17:52',2),
('black coperalcool','Black Coperalcool',null,'1 - Aprovado','15:19',3),
('black friday sutias se','Black Friday - Sutiãs Sem Aros - Cygnuss Lingerie','Cygnuss Lingerie','1 - Aprovado','11:02 - 21/10',4),
('cabide a vacuo para or','Cabide A Vácuo Para Organização De Guarda-roupas - Top Viagem Ltda','Top Viagem Ltda','4 - Aprovar roteiro','13:10 - 20/10',5),
('produtos profissionais','Produtos Profissionais Para Cabelo - Aneethun','Aneethun','7 - Pagamento','13:09 - 20/10',6),
('2 campanha de primaver','2ª Campanha De Primavera/verão 2027 - Salvatore','Salvatore','8 - Concluído','13:07 - 20/10',7),
('clube de assinaturas d','Clube De Assinaturas De Vinho - Wine','Wine','5 - Em gravação','16:32 - 16/10',8),
('creatina rosa sabor pi','Creatina Rosa Sabor Pink Lemonade Desenvolvida Especialmente Para Mulheres. Fórm',null,'3 - Roteiro em andamento','17:29 - 14/10',9),
('preciso de criadores d','Preciso De Criadores De Contudo Para Gravar Videos De Iphone, Produtos De Casa E',null,'7 - Pagamento','12:36 - 14/10',10)
on conflict (chave) do update set etapa=excluded.etapa, ultima=excluded.ultima, ordem=excluded.ordem, atualizado_em=now();
