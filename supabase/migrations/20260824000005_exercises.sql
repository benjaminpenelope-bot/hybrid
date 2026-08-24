/*
 * CATALOGUE D'EXERCICES
 *
 * Table de référence, identique pour tout le monde : ce ne sont pas des
 * données personnelles, seulement la liste des mouvements que le programme
 * emploie. Elle sert à la saisie d'une séance de force passée, où « 45
 * répétitions » sans nom d'exercice ne veut rien dire.
 *
 * `benchmark_key` relie un mouvement à un repère testable. Attention : la
 * présence d'une clé ne fait pas d'une série un test. Un repère ne se pose
 * qu'au cours d'un test déclaré, jamais depuis une série de travail.
 */

create table if not exists exercises (
  key text primary key,
  name text not null,
  /* 'haut', 'bas', 'gainage' — regroupement d'affichage. */
  zone text not null check (zone in ('haut', 'bas', 'gainage')),
  /* Unité de saisie : des répétitions, ou des secondes pour le gainage. */
  unit text not null default 'reps' check (unit in ('reps', 's')),
  /* Repère correspondant, quand le mouvement en a un. */
  benchmark_key text check (
    benchmark_key in ('pullups', 'dips', 'muscleups', 'legraises', 'squats', 'pushups')
  ),
  sort int not null default 0
);

alter table exercises enable row level security;

/*
 * Lecture pour tout compte connecté, écriture pour personne : le catalogue
 * évolue par migration, pas depuis l'application.
 */
drop policy if exists "exercises_select_all" on exercises;
create policy "exercises_select_all" on exercises for select to authenticated using (true);

insert into exercises (key, name, zone, unit, benchmark_key, sort) values
  ('tractions_strictes',  'Tractions strictes',            'haut',    'reps', 'pullups',   10),
  ('tractions_supination','Tractions supination',          'haut',    'reps', null,        20),
  ('muscleups',           'Muscle-ups',                    'haut',    'reps', 'muscleups', 30),
  ('dips',                'Dips',                          'haut',    'reps', 'dips',      40),
  ('pompes',              'Pompes',                        'haut',    'reps', 'pushups',   50),
  ('pompes_lestees',      'Pompes lestées ou déclinées',   'haut',    'reps', null,        60),
  ('releves_jambes',      'Relevés de jambes suspendu',    'gainage', 'reps', 'legraises', 70),
  ('gainage_planche',     'Gainage planche',               'gainage', 's',    null,        80),
  ('squats',              'Squats poids du corps',         'bas',     'reps', 'squats',    90),
  ('fentes_bulgares',     'Fentes bulgares',               'bas',     'reps', null,       100),
  ('squats_sautes',       'Squats sautés',                 'bas',     'reps', null,       110),
  ('hip_thrust',          'Hip thrust / pont fessier',     'bas',     'reps', null,       120),
  ('mollets',             'Mollets debout',                'bas',     'reps', null,       130)
on conflict (key) do update
  set name = excluded.name,
      zone = excluded.zone,
      unit = excluded.unit,
      benchmark_key = excluded.benchmark_key,
      sort = excluded.sort;

comment on table exercises is
  'Catalogue de référence des mouvements de force. Lecture seule côté application.';
