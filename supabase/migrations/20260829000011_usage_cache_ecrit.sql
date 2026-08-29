-- Enregistre aussi les jetons ecrits dans le cache.
--
-- La table comptait l'entree, la sortie et les jetons relus du cache, mais pas
-- ceux qui y sont ecrits. Or une ecriture de cache est facturee 1,25 fois le
-- prix de l'entree : c'est la ligne de cout la plus chere au jeton, et elle
-- manquait. Le premier message d'une conversation en ecrit environ 2 400.
--
-- Consequence : les couts calcules depuis cette table etaient sous-estimes,
-- et c'est justement sur eux qu'on doit regler les plafonds.

alter table coach_usage add column if not exists cache_write_tokens bigint not null default 0;

comment on column coach_usage.cache_write_tokens is
  'Jetons ecrits dans le cache. Factures 1,25 fois le prix de l entree.';

-- La signature change : on remplace, on n'ajoute pas une surcharge.
drop function if exists enregistrer_usage_coach(uuid, bigint, bigint, bigint);

create or replace function enregistrer_usage_coach(
  p_user_id uuid,
  p_input_tokens bigint,
  p_output_tokens bigint,
  p_cache_read_tokens bigint,
  p_cache_write_tokens bigint
) returns void
language sql
as $$
  insert into coach_usage as c (
    user_id, jour, messages, input_tokens, output_tokens, cache_read_tokens, cache_write_tokens
  )
  values (
    p_user_id, current_date, 1, p_input_tokens, p_output_tokens, p_cache_read_tokens, p_cache_write_tokens
  )
  on conflict (user_id, jour) do update set
    messages           = c.messages + 1,
    input_tokens       = c.input_tokens + excluded.input_tokens,
    output_tokens      = c.output_tokens + excluded.output_tokens,
    cache_read_tokens  = c.cache_read_tokens + excluded.cache_read_tokens,
    cache_write_tokens = c.cache_write_tokens + excluded.cache_write_tokens;
$$;

-- Meme fermeture que pour l'ancienne signature : revoquer a PUBLIC ne suffit
-- pas, les privileges par defaut du schema accordent EXECUTE nommement a anon
-- et authenticated a la creation.
revoke execute on function enregistrer_usage_coach(uuid, bigint, bigint, bigint, bigint) from public;
revoke execute on function enregistrer_usage_coach(uuid, bigint, bigint, bigint, bigint) from anon;
revoke execute on function enregistrer_usage_coach(uuid, bigint, bigint, bigint, bigint) from authenticated;
grant  execute on function enregistrer_usage_coach(uuid, bigint, bigint, bigint, bigint) to service_role;
