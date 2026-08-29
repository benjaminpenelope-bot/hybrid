-- Compteur d'usage du coach en ligne.
--
-- Le coach en ligne coute de l'argent a chaque message. Sans compteur, rien
-- ne borne ce qu'un compte peut depenser : ni un usage intensif, ni une
-- boucle de reessai partie en vrille.
--
-- Deux granularites, deux roles distincts :
--   - le jour borne les rafales, c'est ce qui protege d'un bug ;
--   - le mois borne le cout, c'est ce qui protege la marge.
--
-- On compte les messages parce que c'est ce qu'on peut annoncer a l'athlete
-- (« il te reste 12 echanges »), et on enregistre les jetons parce que c'est
-- la vraie unite de cout. Regler les limites sur des mesures reelles vaut
-- mieux que sur une estimation.

create table if not exists coach_usage (
  user_id uuid not null references profiles on delete cascade,
  -- Jour de l'echange, en UTC. La cle primaire porte le jour : les totaux
  -- mensuels s'obtiennent par somme, sans seconde table a tenir a jour.
  jour date not null default current_date,
  messages int not null default 0,
  input_tokens bigint not null default 0,
  output_tokens bigint not null default 0,
  -- Jetons lus depuis le cache : factures a 10 % de l'entree. Les isoler
  -- permet de verifier que la mise en cache fonctionne vraiment.
  cache_read_tokens bigint not null default 0,
  primary key (user_id, jour)
);

comment on table coach_usage is
  'Usage du coach en ligne, par jour. Ecrit uniquement par le serveur, avec la cle service.';

alter table coach_usage enable row level security;

-- Lecture seule pour l'athlete : il doit pouvoir voir ou il en est.
drop policy if exists "coach_usage_select_own" on coach_usage;
create policy "coach_usage_select_own" on coach_usage
  for select using (user_id = (select auth.uid()));

-- Aucune politique d'ecriture, volontairement. Un compte capable de mettre a
-- jour sa propre ligne pourrait remettre son compteur a zero, ce qui viderait
-- la limite de son sens. Seule la cle service ecrit ici.

create index if not exists coach_usage_user_jour on coach_usage (user_id, jour desc);

-- Increment atomique.
--
-- Un lire-puis-ecrire depuis l'application perdrait des messages des que deux
-- requetes du meme compte se croisent — exactement le cas qu'une limite doit
-- attraper. L'increment se fait donc en une seule instruction.
create or replace function enregistrer_usage_coach(
  p_user_id uuid,
  p_input_tokens bigint,
  p_output_tokens bigint,
  p_cache_read_tokens bigint
) returns void
language sql
as $$
  insert into coach_usage as c (user_id, jour, messages, input_tokens, output_tokens, cache_read_tokens)
  values (p_user_id, current_date, 1, p_input_tokens, p_output_tokens, p_cache_read_tokens)
  on conflict (user_id, jour) do update set
    messages          = c.messages + 1,
    input_tokens      = c.input_tokens + excluded.input_tokens,
    output_tokens     = c.output_tokens + excluded.output_tokens,
    cache_read_tokens = c.cache_read_tokens + excluded.cache_read_tokens;
$$;

-- Personne ne l'appelle depuis le navigateur : seule la cle service ecrit.
-- On revoque a PUBLIC et pas seulement a anon/authenticated : le droit
-- d'execution est accorde a PUBLIC par defaut, donc ne retirer que les deux
-- roles nommes ne fermerait rien du tout.
revoke execute on function enregistrer_usage_coach(uuid, bigint, bigint, bigint) from public;
grant execute on function enregistrer_usage_coach(uuid, bigint, bigint, bigint) to service_role;
