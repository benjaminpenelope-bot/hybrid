/*
 * COMPTEUR DE PAS
 *
 * Les pas sont une donnee du jour, comme le sommeil et la fatigue : ils
 * rejoignent donc `wellness` plutot qu'une table a eux. Cette table porte
 * deja une contrainte d'unicite sur (user_id, date), ce qui donne
 * gratuitement la bonne semantique — un jour, une valeur — et evite qu'un
 * import repete empile des doublons.
 *
 * Le compte n'est jamais deduit : sans mesure, la colonne reste nulle et
 * l'ecran affiche « non mesure » plutot qu'un zero, qui se lirait comme une
 * journee sans un pas.
 */
alter table wellness
  add column if not exists steps int check (steps >= 0 and steps <= 200000);

comment on column wellness.steps is
  'Pas du jour. Null = non mesure, jamais zero par defaut.';
