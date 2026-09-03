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
