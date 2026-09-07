/**
 * PHRASES DU TEMPS DE REPOS
 *
 * Elles sont écrites pour l'application, et c'est un choix autant qu'une
 * contrainte.
 *
 * La contrainte : les phrases d'un auteur vivant lui appartiennent. Embarquer
 * une base de citations de David Goggins, ou de n'importe qui d'autre, c'est
 * redistribuer son travail dans un produit qu'on vend. Ce n'est pas une
 * précaution excessive, c'est la même règle que pour la musique d'une vidéo.
 *
 * Le choix : une phrase attribuée à quelqu'un d'autre parle à sa place. Celles
 * d'ici tutoient, ne s'exclament jamais, et disent la même chose que le reste
 * de l'application — la discipline se joue dans les séries que personne ne
 * regarde. Certaines lisent la séance en cours, ce qu'aucune citation ne peut
 * faire.
 *
 * Le tirage est déterministe : la phrase ne doit pas changer sous les yeux
 * de quelqu'un qui la lit pendant deux minutes de repos, et elle doit être
 * différente à la série suivante.
 */

const PHRASES = [
  'La série que tu n’as pas envie de faire est celle qui compte.',
  'Personne ne verra cette série. C’est exactement pour ça qu’elle compte.',
  'Le repos fait partie de l’effort. Prends-le en entier.',
  'Ce que tu poses ici, tu le retrouveras dans six semaines.',
  'L’envie vient rarement avant. Elle vient pendant.',
  'Ton corps a fini bien après ta tête.',
  'Il n’y a pas de séance parfaite. Il y a la séance faite.',
  'Le confort ne t’a jamais rien appris.',
  'Reste dans la fourchette. La discipline se voit dans les détails ennuyeux.',
  'Ce n’est pas le talent qui manque, c’est la répétition.',
  'Tu es en train de gagner la séance de la semaine prochaine.',
  'Compte les séries, pas les excuses.',
  'Le doute passe. La série reste.',
  'Personne ne vient te chercher. C’est toi qui y vas.',
  'La forme d’abord. La fatigue viendra toute seule.',
  'Ce qui est dur aujourd’hui sera ton échauffement dans six mois.',
  'Fais la série. Tu réfléchiras après.',
  'Tu n’as pas besoin d’être motivé. Tu as besoin d’être là.',
  'Chaque répétition propre est une décision.',
  'Rien ne se construit un jour de forme. Tout se construit un jour de flemme.',
  'Respire. Puis remonte sur la barre.',
  'Un jour, tu seras content d’avoir tenu aujourd’hui.',
  'La barre ne ment pas.',
  'Tu peux être fatigué et faire la série quand même. Les deux tiennent ensemble.',
  'Ce n’est pas la dernière répétition qui construit. C’est d’être revenu la faire.',
] as const

export interface ContexteMotivation {
  /** Index de la série en cours, à partir de zéro. */
  serie: number
  /** Nombre total de séries de la séance. */
  total: number
  /** Dernière série de l'exercice en cours. */
  finDExercice: boolean
  /** De quoi varier d'une séance à l'autre sans tirage aléatoire. */
  graine?: string
}

/** Somme des codes de caractères. Assez pour décaler, inutile de plus. */
function decalage(graine: string): number {
  let n = 0
  for (let i = 0; i < graine.length; i++) n = (n + graine.charCodeAt(i)) % 997
  return n
}

/**
 * La phrase à afficher pendant ce repos.
 *
 * Les moments qui se remarquent ont leur phrase à eux : la première série
 * donne le ton, la dernière est celle dont on se souvient. Le reste vient du
 * fonds commun, décalé par la séance pour que deux jours de suite ne se
 * ressemblent pas.
 */
export function motivation({
  serie,
  total,
  finDExercice,
  graine = '',
}: ContexteMotivation): string {
  if (total > 1 && serie === total - 1) {
    return 'Dernière série de la séance. C’est celle dont tu te souviendras.'
  }
  if (serie === 0) return 'Première série. Elle donne le ton de tout le reste.'
  if (finDExercice) return 'Dernière série de cet exercice. Donne ce qu’il te reste.'
  if (total > 3 && serie === Math.floor(total / 2)) {
    return 'La moitié est derrière toi. La seconde compte double.'
  }
  return PHRASES[(serie + decalage(graine)) % PHRASES.length]!
}
