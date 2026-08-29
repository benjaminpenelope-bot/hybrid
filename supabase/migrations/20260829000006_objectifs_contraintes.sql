-- HYBRID — objectifs, contraintes et profil étendu
--
-- Strictement additive. Aucune colonne supprimée, aucune contrainte durcie sur
-- l'existant, aucune séance touchée : les comptes en place continuent de
-- fonctionner exactement comme avant la migration.
--
-- Ce que ça débloque : le système peut enfin décrire QUI est l'utilisateur —
-- ses sports, son niveau, ce qu'il vise, ce qui le contraint. Jusqu'ici le seul
-- objectif représentable était `profiles.race_date`, la date d'un marathon.

/* ── Enums ─────────────────────────────────────────────────── */

do $$ begin
  create type athlete_level as enum ('debutant', 'intermediaire', 'avance', 'expert');
exception when duplicate_object then null; end $$;

-- Sports déclarés au profil. Distinct de `session_kind`, qui décrit ce qu'EST
-- une séance : ici on décrit ce que la personne PRATIQUE. Les cinq valeurs
-- existent dès maintenant même si le générateur n'en sait produire que trois,
-- pour éviter une seconde migration au moment du registre de sports.
do $$ begin
  create type sport as enum ('running', 'cycling', 'swimming', 'strength', 'street_workout');
exception when duplicate_object then null; end $$;

-- HYROX est un objectif, pas un sport : il se prépare avec de la course et de
-- la force, il ne se pratique pas comme une discipline hebdomadaire.
do $$ begin
  create type goal_type as enum (
    'marathon', 'semi', 'dix_km', 'hyrox',
    'force', 'hypertrophie', 'street_workout', 'endurance', 'hybride'
  );
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_priority as enum ('principal', 'secondaire');
exception when duplicate_object then null; end $$;

do $$ begin
  create type goal_status as enum ('actif', 'atteint', 'abandonne');
exception when duplicate_object then null; end $$;

/* ── Profil étendu ─────────────────────────────────────────── */

-- Tout est nullable ou vide par défaut : un profil existant reste valide.
-- `sex` reste facultatif et libre de rester non renseigné, conformément à la
-- formulation « sexe si renseigné ».
alter table profiles add column if not exists sex text
  check (sex is null or sex in ('homme', 'femme', 'autre'));

alter table profiles add column if not exists level athlete_level;

alter table profiles add column if not exists sports sport[] not null default '{}';

-- 0 = dimanche, comme `rest_weekday`. Vide signifie « pas encore renseigné »,
-- et non « aucun jour disponible » : c'est la même règle que partout ailleurs,
-- une absence de mesure ne vaut pas zéro.
alter table profiles add column if not exists available_weekdays int[] not null default '{}';

comment on column profiles.sports is
  'Sports pratiques declares. Distinct de session_kind, qui decrit une seance.';
comment on column profiles.available_weekdays is
  'Jours ou l athlete peut s entrainer. 0 = dimanche. Vide = non renseigne.';

/* ── Objectifs ─────────────────────────────────────────────── */

create table if not exists goals (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  type goal_type not null,
  priority goal_priority not null default 'principal',
  -- Nullable : on peut viser un marathon sans date, ce qui est justement le
  -- cas du compte existant.
  target_date date,
  -- Cible chiffree, interpretee selon le type : minutes pour un chrono,
  -- kilos pour la force, repetitions pour le street workout.
  target_value numeric(7,2),
  target_unit text,
  status goal_status not null default 'actif',
  note text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists goals_user_status_idx on goals (user_id, status);

-- Un seul objectif principal actif a la fois : c'est ce qui rend l'arbitrage
-- possible. Sans cette contrainte, deux objectifs principaux se disputeraient
-- la priorite sans qu'aucune regle ne puisse trancher.
create unique index if not exists goals_un_seul_principal_actif
  on goals (user_id)
  where priority = 'principal' and status = 'actif';

/* ── Limitations ───────────────────────────────────────────── */

-- Table separee des objectifs : une blessure n'est pas un objectif inverse,
-- elle a sa propre duree de vie et se termine.
create table if not exists limitations (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  zone text not null,
  description text,
  started_on date not null default current_date,
  -- Nullable tant que la limitation dure. C'est ce qui permet au moteur de
  -- distinguer une blessure en cours d'un antecedent.
  ended_on date,
  created_at timestamptz not null default now(),
  check (ended_on is null or ended_on >= started_on)
);

create index if not exists limitations_user_actives_idx
  on limitations (user_id) where ended_on is null;

/* ── updated_at ────────────────────────────────────────────── */

drop trigger if exists goals_set_updated_at on goals;
create trigger goals_set_updated_at before update on goals
  for each row execute function set_updated_at();

/* ── RLS ───────────────────────────────────────────────────── */

alter table goals       enable row level security;
alter table limitations enable row level security;

do $$
declare t text;
begin
  foreach t in array array['goals', 'limitations'] loop
    execute format('drop policy if exists "%s_select_own" on %I', t, t);
    execute format(
      'create policy "%s_select_own" on %I for select using (user_id = (select auth.uid()))',
      t, t);

    execute format('drop policy if exists "%s_insert_own" on %I', t, t);
    execute format(
      'create policy "%s_insert_own" on %I for insert with check (user_id = (select auth.uid()))',
      t, t);

    execute format('drop policy if exists "%s_update_own" on %I', t, t);
    execute format(
      'create policy "%s_update_own" on %I for update using (user_id = (select auth.uid()))',
      t, t);

    execute format('drop policy if exists "%s_delete_own" on %I', t, t);
    execute format(
      'create policy "%s_delete_own" on %I for delete using (user_id = (select auth.uid()))',
      t, t);
  end loop;
end $$;

/* ── Remplissage retroactif ────────────────────────────────── */

-- Les sports sont deduits des seances reellement enregistrees, pas supposes.
-- Un profil qui n'a jamais nage ne se verra pas attribuer la natation.
-- `session_kind` et `sport` ne partagent pas leur vocabulaire : run/swim d'un
-- cote, running/swimming de l'autre. La correspondance est explicite.
update profiles p
set sports = coalesce((
  select array_agg(distinct
    case s.kind
      when 'run'      then 'running'::sport
      when 'swim'     then 'swimming'::sport
      when 'strength' then 'strength'::sport
    end)
  from sessions s
  where s.user_id = p.id and s.kind <> 'rest'
), '{}')
where cardinality(p.sports) = 0;

-- Les jours disponibles sont deduits des jours ou une seance non-repos a ete
-- programmee. C'est une observation, pas une supposition : ces jours ont
-- effectivement porte un entrainement.
update profiles p
set available_weekdays = coalesce((
  select array_agg(distinct extract(dow from s.date)::int)
  from sessions s
  where s.user_id = p.id and s.type <> 'REST'
), '{}')
where cardinality(p.available_weekdays) = 0;

-- `level` et `sex` restent volontairement vides. Les deduire d'un volume ou
-- d'un prenom serait exactement le genre d'invention que le produit s'interdit
-- ailleurs. L'onboarding les demandera.

-- Un objectif marathon explicite pour les profils qui suivaient deja le
-- programme marathon. Ce n'est pas une invention : le generateur applique une
-- periodisation marathon et l'ecran Perfs affiche une preparation marathon.
-- On rend visible ce qui etait implicite dans le code.
insert into goals (user_id, type, priority, target_date, status)
select p.id, 'marathon', 'principal', p.race_date, 'actif'
from profiles p
where p.onboarded_at is not null
  and not exists (select 1 from goals g where g.user_id = p.id);

comment on table goals is
  'Objectifs de l athlete. Un seul principal actif a la fois, contrainte par index unique.';
comment on table limitations is
  'Blessures et limitations declarees. ended_on nul = encore en cours.';
