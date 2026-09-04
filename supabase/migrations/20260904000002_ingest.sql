/*
 * JETON D'IMPORT AUTOMATIQUE
 *
 * Un site web ne peut pas lire HealthKit : Apple le reserve aux applications
 * natives. L'import automatique ne peut donc pas venir du serveur — c'est au
 * telephone de pousser, par un raccourci iOS execute chaque jour, ou par une
 * application d'export automatique.
 *
 * Ce jeton authentifie cet envoi. Il est stocke hache : le serveur n'a besoin
 * que de reconnaitre celui qu'on lui presente, jamais de le relire. Une fuite
 * de la table ne donnerait donc pas de quoi ecrire sur un compte.
 */
alter table profiles
  add column if not exists ingest_token_hash text unique,
  add column if not exists ingest_token_created_at timestamptz;

comment on column profiles.ingest_token_hash is
  'SHA-256 du jeton d''import. Le jeton lui-meme n''est montre qu''une fois.';
