/**
 * NOMBRES À LA FRANÇAISE
 *
 * `toFixed` rend toujours un point décimal. L'application affichait donc
 * « 83.4 kg » sur une carte et « 83,4 » dans le champ juste en dessous —
 * même écran, deux conventions, parce que le champ était saisi à la main et
 * la carte calculée.
 *
 * Réservé à l'affichage. Le contexte envoyé au modèle garde le point : c'est
 * la convention que les langages et les modèles attendent, et l'y traduire
 * n'apporterait rien.
 */
export function fr(n: number, decimales = 1): string {
  return n.toFixed(decimales).replace('.', ',')
}

/**
 * Comme `fr`, mais avec les milliers separes par une espace fine insecable :
 * « 10 000 pas » plutot que « 10000 pas ».
 *
 * L'espace est fine et insecable (U+202F) parce que c'est la convention
 * typographique francaise et parce qu'une espace ordinaire laisserait le
 * nombre se couper en fin de ligne.
 *
 * Cette fonction vivait en double, privee dans le moteur d'objectifs : elle
 * y avait ete ecrite pour la meme raison — « 10.2 km · objectif 42,2 km » sur
 * une seule ligne.
 */
export function frMille(v: number, decimales = 1): string {
  const arrondi = Number.isInteger(v) ? `${v}` : v.toFixed(decimales)
  const [entier, dec] = arrondi.split('.')
  const groupe = entier!.replace(/\B(?=(\d{3})+(?!\d))/g, '\u202f')
  return dec ? `${groupe},${dec}` : groupe
}
