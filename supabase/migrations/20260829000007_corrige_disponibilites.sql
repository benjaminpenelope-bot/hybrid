-- HYBRID — corrige un remplissage retroactif errone
--
-- La migration precedente deduisait `available_weekdays` des jours ayant porte
-- une seance non-repos. Sur un historique de plusieurs mois, ou le jour de
-- repos se deplace et ou des seances sont reportees, cela finit par designer
-- les sept jours de la semaine.
--
-- Le resultat est exact et inutilisable : « une seance a eu lieu ce jour-la »
-- n'est pas « cette personne est disponible ce jour-la ». Un planificateur qui
-- lirait sept jours disponibles placerait un entrainement le jour de repos.
--
-- On revient donc a vide, qui signifie « non renseigne » et non « aucun jour ».
-- L'onboarding posera la question. C'est la meme regle que partout ailleurs
-- dans le produit : une donnee non mesuree ne se devine pas.
--
-- La condition sur les sept jours evite d'effacer une disponibilite qu'un
-- utilisateur aurait deja saisie volontairement.

update profiles
set available_weekdays = '{}'
where cardinality(available_weekdays) = 7;

comment on column profiles.available_weekdays is
  'Jours ou l athlete peut s entrainer, saisis a l onboarding. 0 = dimanche. '
  'Vide = non renseigne. Ne jamais deduire de l historique : la presence d une '
  'seance un jour donne ne prouve pas la disponibilite ce jour-la.';
