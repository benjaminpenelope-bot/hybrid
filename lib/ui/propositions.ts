/**
 * PROPOSITIONS DE RÉPÉTITIONS
 *
 * Une séance de force compte dix-sept séries. Le compteur partait de zéro à
 * chaque fois, et il fallait donc appuyer huit à quinze fois sur `+` pour
 * saisir une série — deux cents appuis pour une séance, avec le téléphone à
 * la main entre deux exercices.
 *
 * Or la prescription est écrite juste au-dessus : « 7–10 ». On propose donc
 * ces valeurs-là en pastilles. Aucune n'est présélectionnée : l'athlète en
 * choisit une, personne ne décide à sa place, et une série non validée reste
 * non validée. La saisie passe d'une dizaine d'appuis à un seul, sans que le
 * produit invente le moindre chiffre.
 *
 * Rendu vide, le pavé numérique reprend la main : c'est le cas d'un test
 * (« AMRAP »), où le nombre à saisir est justement celui qu'on ne connaît
 * pas.
 */

/** Au-delà, la rangée déborde et le choix cesse d'être immédiat. */
const MAX_PASTILLES = 6

/**
 * Valeurs à proposer pour une prescription donnée, de la plus basse à la plus
 * haute. Vide quand la prescription ne porte aucun nombre.
 */
export function propositionsDeReps(reps: string, unit?: string): number[] {
  const texte = reps.trim()

  // Un test se mesure : proposer un chiffre reviendrait a le suggerer.
  if (/amrap|max/i.test(texte)) return []

  // « 7–10 », « 8-12 » : la plage prescrite, telle quelle.
  const plage = texte.match(/^(\d+)\s*[–-]\s*(\d+)/)
  if (plage) {
    const bas = Number(plage[1])
    const haut = Number(plage[2])
    if (haut > bas && haut - bas < MAX_PASTILLES) {
      return Array.from({ length: haut - bas + 1 }, (_, i) => bas + i)
    }
  }

  /*
   * « 19 », « 10 / jambe », « 45 s » : un seul nombre prescrit. On l'encadre,
   * puisque personne ne fait exactement le compte demande a chaque serie.
   * Le pas suit l'unite — cinq secondes pour du gainage, une repetition
   * sinon : proposer 44, 45, 46 secondes n'aiderait personne.
   */
  const seul = texte.match(/^(\d+)/)
  if (seul) {
    const v = Number(seul[1])
    if (v <= 0) return []
    const pas = unit === 's' ? 5 : 1
    return [v - 2 * pas, v - pas, v, v + pas, v + 2 * pas].filter((n) => n > 0)
  }

  return []
}
