-- ATHLETE OS — schema initial
-- Multi-utilisateur des le premier jour : chaque ligne porte son user_id,
-- meme si l'application ne sert qu'un athlete au depart.

create extension if not exists "pgcrypto";

/* ── Enums ─────────────────────────────────────────────────── */

do $$ begin
  create type session_status as enum ('planned', 'done', 'skipped');
exception when duplicate_object then null; end $$;

do $$ begin
  create type session_kind as enum ('run', 'swim', 'strength', 'rest');
exception when duplicate_object then null; end $$;

do $$ begin
  create type data_source as enum ('manual', 'strava', 'health');
exception when duplicate_object then null; end $$;

/* ── Profils ───────────────────────────────────────────────── */

create table if not exists profiles (
  id uuid primary key references auth.users on delete cascade,
  name text not null,
  birth_date date,
  height_cm int check (height_cm between 100 and 250),
  start_weight numeric(4,1),
  goal_weight numeric(4,1),
  program_start date not null default current_date,
  race_date date,                       -- date du marathon cible, nullable
  rest_weekday int not null default 1 check (rest_weekday between 0 and 6), -- 0 = dimanche
  allow_doubles boolean not null default false,
  onboarded_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on column profiles.race_date is
  'Quand elle est renseignee, les phases du programme se calent sur cette date au lieu du compteur de semaines.';

/* ── Séances ───────────────────────────────────────────────── */

create table if not exists sessions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  date date not null,
  type text not null check (type in ('RUN', 'LONG', 'SWIM', 'UPPER', 'LOWER', 'REST')),
  kind session_kind not null,
  status session_status not null default 'planned',
  week int not null,
  title text not null,
  goal text,
  why text,
  target text,
  cues jsonb not null default '[]',
  duration int not null default 0 check (duration >= 0),
  intensity int not null default 0 check (intensity between 0 and 5),
  exercises jsonb not null default '[]',   -- [{n,sets,reps,rest,rir,cue,unit,test}]
  finisher jsonb,                          -- bloc enchaîné, nullable
  extra jsonb,                             -- double du jour, uniquement si autorise
  log jsonb,                               -- rempli a la validation
  rpe int check (rpe between 1 and 10),
  rpe_est int check (rpe_est between 1 and 10),
  note text,
  pain text,
  edited boolean not null default false,
  moved boolean not null default false,
  adapted text,                            -- trace de l'adaptation automatique
  volume_factor numeric(3,2),
  unplanned boolean not null default false, -- séance hors programme (import)
  source data_source not null default 'manual',
  strava_activity_id bigint,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index if not exists sessions_user_date_idx on sessions (user_id, date);
create index if not exists sessions_user_status_idx on sessions (user_id, status);
create unique index if not exists sessions_strava_activity_uidx
  on sessions (user_id, strava_activity_id) where strava_activity_id is not null;

comment on column sessions.rpe_est is
  'RPE estimé pour une séance importee ou reconstituee. Jamais presente comme une mesure.';

/* ── Suivi physique ────────────────────────────────────────── */

create table if not exists weights (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  date date not null,
  kg numeric(4,1) not null check (kg between 30 and 250),
  source data_source not null default 'manual',
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists measurements (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  date date not null,
  waist numeric(4,1),
  chest numeric(4,1),
  arm numeric(4,1),
  thigh numeric(4,1),
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

create table if not exists photos (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  date date not null,
  storage_path text not null,      -- bucket prive 'progress-photos'
  created_at timestamptz not null default now()
);

create index if not exists photos_user_date_idx on photos (user_id, date);

create table if not exists wellness (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  date date not null,
  sleep numeric(3,1) check (sleep between 0 and 24),
  fatigue int check (fatigue between 1 and 10),
  motivation int check (motivation between 1 and 10),
  soreness text,
  resting_hr int check (resting_hr between 25 and 150),
  source data_source not null default 'manual',
  created_at timestamptz not null default now(),
  unique (user_id, date)
);

/* ── Repères et records ────────────────────────────────────── */

create table if not exists benchmarks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  key text not null check (key in ('pullups', 'dips', 'muscleups', 'legraises', 'squats', 'pushups')),
  value numeric not null check (value >= 0),
  unit text not null default 'reps',
  partial boolean not null default false,  -- true = minimum connu, max non testé
  note text,
  tested_at date not null,
  created_at timestamptz not null default now()
);

create index if not exists benchmarks_user_key_idx on benchmarks (user_id, key, tested_at desc);

comment on table benchmarks is
  'Historique des tests. Le repère courant est la ligne la plus recente pour une clé donnée. Aucune clé absente n''est comblee par une valeur par defaut : elle s''affiche « A TESTER ».';

create table if not exists records (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  label text not null,
  value text not null,
  date date not null,
  created_at timestamptz not null default now()
);

create index if not exists records_user_date_idx on records (user_id, date desc);

/* ── Coach ─────────────────────────────────────────────────── */

create table if not exists coach_messages (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references profiles on delete cascade,
  role text not null check (role in ('user', 'assistant')),
  content text not null,
  created_at timestamptz not null default now()
);

create index if not exists coach_messages_user_idx on coach_messages (user_id, created_at);

/* ── Integrations ──────────────────────────────────────────── */

create table if not exists integrations (
  user_id uuid primary key references profiles on delete cascade,
  strava_athlete_id bigint,
  -- Tokens chiffrés applicativement (AES-256-GCM) avant insertion.
  -- Les droits sont révoqués pour anon et authenticated : ces colonnes ne
  -- sortent que via la clé service, cote serveur.
  strava_access_token text,
  strava_refresh_token text,
  strava_expires_at timestamptz,
  strava_webhook_id bigint,
  last_sync timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

/* ── updated_at ────────────────────────────────────────────── */

create or replace function set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'sessions', 'integrations'] loop
    execute format('drop trigger if exists %I_set_updated_at on %I', t, t);
    execute format(
      'create trigger %I_set_updated_at before update on %I
       for each row execute function set_updated_at()', t, t);
  end loop;
end $$;
