/*
 * DERNIER ENVOI RECU
 *
 * C'est la seule facon de dire « ca marche » a quelqu'un qui vient de brancher
 * un raccourci : sans cette date, l'ecran ne peut qu'affirmer que le jeton
 * existe, ce qui ne prouve rien.
 */
alter table profiles
  add column if not exists ingest_token_last_used_at timestamptz;
