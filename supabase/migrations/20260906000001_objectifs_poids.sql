/*
 * PERTE DE POIDS ET PRISE DE MASSE
 *
 * Deux objectifs de plus, et les deux premiers dont la cible se lit sur une
 * balance plutot que sur un chronometre.
 *
 * `prise_de_masse` cohabite avec `hypertrophie` plutot que de la remplacer.
 * Les deux se travaillent de la meme facon a la barre — series longues,
 * repos courts, une repetition en reserve — mais elles ne se jugent pas au
 * meme endroit : l'une au muscle, l'autre au poids. Et surtout elles ne
 * protegent pas la recuperation pareil, `prise_de_masse` faisant passer la
 * course en entretien pour que la barre garde la priorite.
 *
 * ALTER TYPE ... ADD VALUE s'execute bien dans une transaction depuis
 * PostgreSQL 12, a condition que la valeur ajoutee ne soit pas utilisee dans
 * la meme transaction. Cette migration ne fait que l'ajouter.
 *
 * L'operation est additive : aucun objectif existant n'est touche, et un
 * compte deja cree reste valide.
 */

do $$ begin
  alter type goal_type add value if not exists 'perte_de_poids';
exception when duplicate_object then null; end $$;

do $$ begin
  alter type goal_type add value if not exists 'prise_de_masse';
exception when duplicate_object then null; end $$;
