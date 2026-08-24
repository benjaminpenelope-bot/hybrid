-- La distance nagée sans pause est un repère au même titre que les tractions :
-- elle peut être déclarée à l'onboarding avant d'avoir été enregistrée en séance.
-- Sans cette clé, une distance annoncée à l'inscription serait perdue, et le
-- sous-score natation resterait vide alors que l'athlète a fourni la donnée.

alter table benchmarks drop constraint if exists benchmarks_key_check;

alter table benchmarks add constraint benchmarks_key_check
  check (key in (
    'pullups', 'dips', 'muscleups', 'legraises', 'squats', 'pushups', 'swim_continuous'
  ));

-- Contraintes matérielles et de temps recueillies à l'onboarding.
-- Elles ne modifient pas encore le contenu des séances : elles sont conservées
-- pour l'étape 5, et servent dès maintenant à signaler un écart entre le
-- programme généré et ce dont l'athlète dispose réellement.
alter table profiles add column if not exists equipment text[] not null default '{}';
alter table profiles add column if not exists session_minutes int
  check (session_minutes between 20 and 180);

-- Volume de course de la première semaine, propre à chaque athlète.
-- L'échelle du programme est ancrée dessus : sans cette colonne, tout le monde
-- démarrerait à 15 km, ce qui triplerait la charge d'un débutant.
alter table profiles add column if not exists base_weekly_km numeric(4,1)
  check (base_weekly_km between 4 and 200);
