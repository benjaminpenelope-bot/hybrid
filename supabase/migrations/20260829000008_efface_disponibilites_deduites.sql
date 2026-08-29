-- HYBRID — efface toute disponibilite deduite, pas seulement les cas a sept jours
--
-- La correction precedente ne visait que les profils affichant les sept jours,
-- en supposant que six jours pouvaient etre une saisie volontaire. C'etait
-- faux : l'onboarding ne pose pas encore la question, donc **aucune** valeur
-- presente en base ne vient d'un utilisateur. Toutes sortent du remplissage
-- retroactif de la migration 006, et souffrent du meme defaut de raisonnement.
--
-- Deduire les jours disponibles des jours ayant porte une seance revient a
-- confondre ce qui a eu lieu avec ce qui est possible. Un athlete qui a couru
-- un dimanche par exception n'est pas disponible tous les dimanches.
--
-- Cette migration est ecrite pour etre sans effet une fois l'onboarding en
-- place : elle ne s'execute qu'une fois, avant que la moindre saisie existe.

update profiles
set available_weekdays = '{}'
where cardinality(available_weekdays) > 0;
