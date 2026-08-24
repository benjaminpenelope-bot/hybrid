-- ATHLETE OS — Row Level Security
-- Une règle unique, repetee sur chaque table : on ne voit et on n'ecrit que
-- ses propres lignes. Aucune table n'est laissee ouverte.

alter table profiles        enable row level security;
alter table sessions        enable row level security;
alter table weights         enable row level security;
alter table measurements    enable row level security;
alter table photos          enable row level security;
alter table wellness        enable row level security;
alter table benchmarks      enable row level security;
alter table records         enable row level security;
alter table coach_messages  enable row level security;
alter table integrations    enable row level security;

/* ── profiles : la clé primaire est l'identifiant utilisateur ── */

drop policy if exists "profiles_select_own" on profiles;
create policy "profiles_select_own" on profiles
  for select using (id = (select auth.uid()));

drop policy if exists "profiles_insert_own" on profiles;
create policy "profiles_insert_own" on profiles
  for insert with check (id = (select auth.uid()));

drop policy if exists "profiles_update_own" on profiles;
create policy "profiles_update_own" on profiles
  for update using (id = (select auth.uid())) with check (id = (select auth.uid()));

drop policy if exists "profiles_delete_own" on profiles;
create policy "profiles_delete_own" on profiles
  for delete using (id = (select auth.uid()));

/* ── toutes les autres tables : user_id = auth.uid() ────────── */

do $$
declare t text;
begin
  foreach t in array array[
    'sessions', 'weights', 'measurements', 'photos', 'wellness',
    'benchmarks', 'records', 'coach_messages', 'integrations'
  ] loop
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
      'create policy "%s_update_own" on %I for update using (user_id = (select auth.uid()))
       with check (user_id = (select auth.uid()))', t, t);

    execute format('drop policy if exists "%s_delete_own" on %I', t, t);
    execute format(
      'create policy "%s_delete_own" on %I for delete using (user_id = (select auth.uid()))',
      t, t);
  end loop;
end $$;

/* ── Tokens Strava : jamais accessibles depuis le client ─────
   La RLS suffirait a isoler les utilisateurs entre eux, mais elle
   n'empeche pas l'athlete lui-meme de lire son token depuis le navigateur.
   Les droits sont donc révoqués : seule la clé service, cote serveur,
   peut lire cette table.                                           */

revoke all on integrations from anon, authenticated;

create or replace function public.strava_status()
returns table (connected boolean, athlete_id bigint, last_sync timestamptz)
language sql
security definer
set search_path = public
as $$
  select
    (strava_access_token is not null) as connected,
    strava_athlete_id,
    last_sync
  from integrations
  where user_id = (select auth.uid());
$$;

comment on function public.strava_status is
  'Seule fenêtre du client sur la table integrations : indique si le compte est connecté, sans jamais exposer de token.';

grant execute on function public.strava_status() to authenticated;
