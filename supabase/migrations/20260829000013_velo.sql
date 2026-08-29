-- Seances de velo.
--
-- Le cyclisme etait declarable au profil mais aucune seance ne s'en deduisait :
-- l'onboarding refusait meme le velo seul, faute de pouvoir livrer autre chose
-- qu'un programme vide. Deux valeurs manquaient.

-- Un enum Postgres s'etend sans reecriture de table. `if not exists` rend la
-- migration rejouable.
alter type session_kind add value if not exists 'bike';

-- `type` est une contrainte texte, pas un enum : on la remplace.
alter table sessions drop constraint if exists sessions_type_check;
alter table sessions add constraint sessions_type_check
  check (type in ('RUN', 'LONG', 'SWIM', 'BIKE', 'RIDE', 'UPPER', 'LOWER', 'REST'));

comment on constraint sessions_type_check on sessions is
  'BIKE : sortie velo courte ou tempo. RIDE : sortie longue, l equivalent cycliste de LONG.';
