-- email_stats v2 (25/09/2026): cada evento cai na campanha (assunto + dia) do ENVIO com o
-- mesmo resend_id, em vez de "qualquer campanha com o mesmo assunto a partir daquele dia".
-- "Nao chegou" passa a somar bounced + suppressed (o Resend nem tentou entregar).
CREATE OR REPLACE FUNCTION public.email_stats(dias integer DEFAULT 30)
 RETURNS json
 LANGUAGE sql
 SECURITY DEFINER
 SET search_path TO 'public'
AS $function$
  with envios as (
    select assunto, date_trunc('day', ts) dia, count(*) enviados,
           count(*) filter (where status <> 'ok') erros,
           min(ts) primeiro
    from email_envios
    where ts > now() - (dias || ' days')::interval
    group by 1,2
  ),
  eventos as (
    select e.assunto, date_trunc('day', e.ts) dia, ev.tipo, ev.resend_id
    from email_eventos ev
    join email_envios e on e.resend_id = ev.resend_id
    where e.ts > now() - (dias || ' days')::interval
  ),
  por_campanha as (
    select en.assunto, en.dia, en.enviados, en.erros, en.primeiro,
      count(distinct ev.resend_id) filter (where ev.tipo = 'email.delivered') entregues,
      count(distinct ev.resend_id) filter (where ev.tipo = 'email.opened') abertos,
      count(distinct ev.resend_id) filter (where ev.tipo = 'email.clicked') clicaram,
      count(*) filter (where ev.tipo = 'email.clicked') cliques,
      count(distinct ev.resend_id) filter (where ev.tipo in ('email.bounced', 'email.suppressed')) bounces,
      count(distinct ev.resend_id) filter (where ev.tipo = 'email.complained') spam
    from envios en
    left join eventos ev on ev.assunto is not distinct from en.assunto and ev.dia = en.dia
    group by 1,2,3,4,5
  )
  select json_build_object(
    'campanhas', coalesce((select json_agg(row_to_json(c) order by c.primeiro desc) from por_campanha c), '[]'::json),
    'links', coalesce((select json_agg(row_to_json(l)) from (
        select url, count(*) cliques, count(distinct resend_id) pessoas
        from email_eventos where tipo='email.clicked' and url is not null
          and coalesce(ocorrido_em,criado_em) > now() - (dias || ' days')::interval
        group by 1 order by 2 desc limit 20) l), '[]'::json),
    'total_eventos', (select count(*) from email_eventos),
    'atualizado_em', now()
  );
$function$;
