import type { ISODate } from './types'

/**
 * LE JOUR DE L'ATHLÈTE, PAS CELUI DU SERVEUR
 *
 * `todayISO()` lit l'horloge locale de la machine qui l'exécute. Dans le
 * navigateur, c'est la bonne : celle de l'athlète. Sur le serveur, c'est
 * celle de Vercel — UTC.
 *
 * Conséquence, mesurée à Paris : entre minuit et deux heures du matin en été,
 * le serveur calculait encore la veille. La séance du jour ne changeait donc
 * pas à minuit mais à deux heures, et le bilan, la charge et le verdict
 * suivaient le même décalage. L'hiver, le défaut s'inverse : de vingt-trois
 * heures à minuit, le serveur est déjà au lendemain et annonce la séance du
 * jour suivant.
 *
 * Le fuseau de l'athlète voyage donc dans un témoin, écrit par le navigateur
 * et relu à chaque rendu. Un témoin plutôt qu'une colonne en base : il n'y a
 * rien à migrer, rien à saisir, et il suit l'athlète qui change de pays sans
 * qu'on ait à le lui demander.
 */

/** Nom du témoin. Lisible par le script du navigateur, donc pas `httpOnly`. */
export const COOKIE_FUSEAU = 'hybrid_fuseau'

/**
 * Date du jour dans un fuseau donné.
 *
 * `en-CA` rend précisément `AAAA-MM-JJ`, ce qui évite de recomposer la chaîne
 * à la main. Un fuseau inconnu ferait lever `Intl` : on retombe alors sur
 * l'horloge de la machine plutôt que de faire échouer un écran entier.
 */
export function jourDansFuseau(fuseau: string | undefined, maintenant = new Date()): ISODate {
  if (!fuseau) return jourLocal(maintenant)
  try {
    return new Intl.DateTimeFormat('en-CA', {
      timeZone: fuseau,
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    }).format(maintenant)
  } catch {
    return jourLocal(maintenant)
  }
}

/** Date du jour selon l'horloge de la machine. Le repli, et le cas du navigateur. */
export function jourLocal(maintenant = new Date()): ISODate {
  const y = maintenant.getFullYear()
  const m = String(maintenant.getMonth() + 1).padStart(2, '0')
  const d = String(maintenant.getDate()).padStart(2, '0')
  return `${y}-${m}-${d}`
}

/**
 * Millisecondes avant le prochain minuit dans un fuseau donné.
 *
 * Sert à programmer le rafraîchissement d'une page laissée ouverte : une
 * application installée reste souvent ouverte toute la nuit, et sans ce
 * minuteur elle affiche encore la séance de la veille au réveil.
 *
 * On ne calcule pas « minuit » par arithmétique sur les heures : un
 * changement d'heure ferait alors tomber le minuteur une heure trop tôt ou
 * trop tard. On avance donc jour par jour jusqu'à voir la date changer.
 */
export function msAvantMinuit(fuseau: string | undefined, maintenant = new Date()): number {
  const aujourdhui = jourDansFuseau(fuseau, maintenant)

  /*
   * Recherche par dichotomie sur une fenetre de trente heures : assez large
   * pour couvrir n'importe quel decalage, et vingt iterations suffisent a
   * tomber a la seconde.
   */
  let bas = 0
  let haut = 30 * 3600 * 1000
  for (let i = 0; i < 24; i++) {
    const milieu = Math.floor((bas + haut) / 2)
    if (jourDansFuseau(fuseau, new Date(maintenant.getTime() + milieu)) === aujourdhui) {
      bas = milieu
    } else {
      haut = milieu
    }
  }
  return haut
}
