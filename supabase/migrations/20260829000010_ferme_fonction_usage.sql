-- Ferme reellement l'acces a `enregistrer_usage_coach`.
--
-- La migration precedente ne revoquait qu'a PUBLIC, en pensant que cela
-- couvrait tout le monde. C'est faux sur Supabase : les privileges par defaut
-- du schema `public` accordent EXECUTE nommement a `anon` et `authenticated`
-- a la creation de chaque fonction. Une revocation a PUBLIC ne retire pas un
-- droit accorde nommement — il faut revoquer aux deux roles en plus.
--
-- Verifie : avec la cle publique, l'appel passait la barriere des droits et
-- n'echouait que sur la RLS de la table. La donnee etait protegee, mais par
-- une seule couche au lieu de deux. Le jour ou quelqu'un ajoute une politique
-- d'insertion a `coach_usage`, cette couche unique disparait et n'importe qui
-- peut gonfler son propre compteur — ou celui d'un autre compte.

revoke execute on function enregistrer_usage_coach(uuid, bigint, bigint, bigint) from public;
revoke execute on function enregistrer_usage_coach(uuid, bigint, bigint, bigint) from anon;
revoke execute on function enregistrer_usage_coach(uuid, bigint, bigint, bigint) from authenticated;
grant  execute on function enregistrer_usage_coach(uuid, bigint, bigint, bigint) to service_role;
