import type { StrengthBenchmarkKey } from './types'

/**
 * PRESCRIPTION DE FORCE, ANCRÉE SUR CE QUI A ÉTÉ MESURÉ
 *
 * Le volume de course était ancré depuis longtemps : la base part de ce qui a
 * réellement été couru sur quatre semaines, et se ré-ancre à chaque
 * prolongation. La barre, elle, ne l'a jamais été. `buildStrength` recevait
 * bien une liste de repères, mais c'était une liste de *noms* — elle servait
 * uniquement à savoir s'il fallait reposer la séance de tests. Pas une seule
 * valeur mesurée n'entrait dans la prescription.
 *
 * Conséquence, mesurée sur un compte réel : dix-sept tractions strictes au
 * test, et quatre séries de cinq à huit prescrites, deux répétitions en
 * réserve. Quarante pour cent du maximum. Et la progression — une répétition
 * toutes les trois semaines, la même pour tout le monde — n'aurait atteint
 * dix-sept qu'à la semaine vingt-huit.
 *
 * Deux leviers manquaient, et ce module les apporte tous les deux.
 *
 * LE PREMIER est l'ancrage : une série de travail se calcule en part du
 * maximum mesuré, jamais en constante.
 *
 * LE SECOND est propre au street workout, et c'est le plus important : on n'y
 * progresse pas en ajoutant des répétitions, on progresse en durcissant le
 * mouvement. Quand douze tractions strictes deviennent faciles, la suite
 * n'est pas treize, c'est la traction lestée. D'où les échelles ci-dessous.
 *
 * Ce qui n'a pas été mesuré ne s'invente pas : sans repère, chaque mouvement
 * retombe exactement sur la prescription d'avant.
 */

/** Repères mesurés, par mouvement. Absent = jamais testé. */
export type ReperesMesures = Partial<Record<StrengthBenchmarkKey, number>>

/**
 * Au-delà, un repère ne décrit plus l'athlète d'aujourd'hui.
 *
 * Huit semaines, soit la durée d'un bloc : le plan se re-teste donc au début
 * du bloc suivant. Sans ça, l'ancrage vieillit en silence et le programme
 * redevient progressivement trop facile — le défaut même qu'on corrige ici,
 * réapparu deux mois plus tard.
 */
export const RETEST_JOURS = 56

/** En dessous, une série au poids du corps n'a plus de sens. */
const REPS_MIN = 3

export interface Palier {
  /** Repère minimal, dans le mouvement de base, pour accéder à ce palier. */
  min: number
  n: string
  cue: string
  /**
   * Part du maximum de base qu'on tient encore dans cette variante.
   *
   * Une traction lestée ne se fait pas autant de fois qu'une traction
   * stricte. Sans ce facteur, monter d'un palier reviendrait à durcir deux
   * fois : une fois par le mouvement, une fois par le nombre — et la séance
   * deviendrait infaisable au lieu de devenir exigeante.
   */
  facteur: number
}

/* ── Échelles de difficulté ─────────────────────────────────
 *
 * Les seuils sont ceux qu'emploient les pratiquants : on passe au lest quand
 * le mouvement au poids du corps dépasse la dizaine, parce qu'au-delà on
 * travaille l'endurance de force plutôt que la force.
 */

export const ECHELLE_TRACTIONS: Palier[] = [
  {
    min: 0,
    n: 'Tractions négatives',
    cue: 'Monte avec un appui ou un saut, redescends en 5 s en retenant. C’est la descente qui construit la traction.',
    facteur: 1,
  },
  {
    min: 3,
    n: 'Tractions strictes',
    cue: 'Scapulas basses, menton au-dessus de la barre, descente contrôlée 2 s.',
    facteur: 1,
  },
  {
    min: 12,
    n: 'Tractions lestées',
    cue: 'Ceinture de lest ou sac à dos, environ 10 % de ton poids. Même exigence de forme : si le menton ne passe plus proprement, la série est finie.',
    facteur: 0.6,
  },
  {
    min: 20,
    n: 'Tractions archer',
    cue: 'Un bras tire, l’autre reste tendu sur la barre. Alterne à chaque répétition.',
    facteur: 0.35,
  },
]

export const ECHELLE_DIPS: Palier[] = [
  {
    min: 0,
    n: 'Dips sur banc, pieds au sol',
    cue: 'Mains derrière toi sur un banc, pieds au sol. Descends jusqu’à ce que le coude fasse un angle droit.',
    facteur: 1,
  },
  { min: 5, n: 'Dips', cue: 'Buste légèrement penché, coudes proches, épaules loin des oreilles.', facteur: 1 },
  {
    min: 20,
    n: 'Dips lestés',
    cue: 'Environ 10 % de ton poids. Descends jusqu’à l’étirement, sans forcer sur l’épaule.',
    facteur: 0.6,
  },
  {
    min: 35,
    n: 'Dips aux anneaux',
    cue: 'Anneaux tournés vers l’avant en haut. L’instabilité fait tout le travail : reste bas en nombre.',
    facteur: 0.35,
  },
]

export const ECHELLE_MUSCLEUPS: Palier[] = [
  {
    min: 1,
    n: 'Muscle-ups — séries courtes',
    cue: 'Séries très courtes, à distance de l’échec. Le muscle-up se travaille frais, jamais en fin de séance.',
    facteur: 1,
  },
  {
    min: 4,
    n: 'Muscle-ups',
    cue: 'Traction explosive jusqu’au bas de la poitrine, transition franche. Arrête la série dès que le passage devient laborieux.',
    facteur: 1,
  },
  {
    min: 10,
    n: 'Muscle-ups lestés',
    cue: 'Lest léger, 5 % du poids de corps. La transition doit rester nette.',
    facteur: 0.6,
  },
]

export const ECHELLE_RELEVES: Palier[] = [
  {
    min: 0,
    n: 'Relevés de genoux suspendu',
    cue: 'Genoux vers la poitrine, bassin qui bascule. Aucun élan.',
    facteur: 1,
  },
  { min: 8, n: 'Relevés de jambes suspendu', cue: 'Jambes tendues, bassin qui bascule, aucun élan.', facteur: 1 },
  {
    min: 20,
    n: 'Toes-to-bar',
    cue: 'Les orteils touchent la barre à chaque répétition. Dès que tu balances pour y arriver, la série est finie.',
    facteur: 0.7,
  },
]

export const ECHELLE_SQUATS: Palier[] = [
  {
    min: 0,
    n: 'Squats poids du corps',
    cue: "Talons au sol, genoux dans l'axe, descente sous la parallèle.",
    facteur: 1,
  },
  {
    min: 40,
    n: 'Squats bulgares',
    cue: 'Pied arrière surélevé, buste droit. Une jambe travaille, l’autre équilibre.',
    facteur: 0.35,
  },
  {
    min: 70,
    n: 'Pistol squats — progression',
    cue: 'Sur une jambe, l’autre tendue devant. Tiens-toi à un montant si la descente n’est pas contrôlée.',
    facteur: 0.12,
  },
]

/** Le palier le plus haut que le repère mesuré permet d'atteindre. */
export function palierDe(echelle: Palier[], max: number): Palier {
  return [...echelle].reverse().find((p) => max >= p.min) ?? echelle[0]!
}

/**
 * Part du maximum prescrite à la semaine `w`.
 *
 * Trois points de plus toutes les trois semaines, et pas au-delà de dix-huit
 * points : la progression vient ensuite du repère lui-même, qu'un nouveau
 * test relève. Continuer à monter la part sur un maximum vieux de six mois
 * reviendrait à prescrire sur une donnée périmée.
 */
export function partDeLaSemaine(base: number, w: number, plafond = 0.18): number {
  const prog = Math.floor((Math.max(1, w) - 1) / 3)
  return base + Math.min(prog * 0.03, plafond)
}

/**
 * Fourchette de répétitions d'une série de travail, en part du maximum.
 * `largeur` est l'écart entre le bas et le haut de la fourchette.
 */
export function fourchette(
  max: number,
  part: number,
  facteur: number,
  largeur = 0.12,
): string {
  const bas = Math.max(REPS_MIN, Math.round(max * part * facteur))
  const haut = Math.max(bas + 1, Math.round(max * (part + largeur) * facteur))
  return `${bas}–${haut}`
}

/* ── Lecture des repères ────────────────────────────────────
 *
 * Ces deux fonctions prennent des lignes de base telles quelles. Elles
 * restent ici, et non dans la couche base de données, parce que ce qu'elles
 * décident — quelle valeur fait foi, quand elle est périmée — est une règle
 * d'entraînement, pas une question de stockage.
 */

/** Une ligne de repère, telle qu'elle sort de la table `benchmarks`. */
export interface LigneRepere {
  key: string
  value: number | string
  tested_at: string
}

const MOUVEMENTS: StrengthBenchmarkKey[] = [
  'pullups',
  'dips',
  'muscleups',
  'legraises',
  'squats',
  'pushups',
]

/**
 * Le maximum de chaque mouvement, la mesure la plus récente faisant foi.
 *
 * La distance nagée est écartée : elle n'entre dans aucune série. Une valeur
 * nulle ou négative l'est aussi — « zéro muscle-up » n'est pas un maximum sur
 * lequel prescrire, c'est l'absence du mouvement, et le repli s'en charge.
 */
export function reperesDepuisLignes(lignes: LigneRepere[]): ReperesMesures {
  const out: ReperesMesures = {}
  // Les lignes arrivent triees par date : la derniere ecrase la precedente,
  // donc la plus recente gagne, comme partout ailleurs.
  for (const l of [...lignes].sort((a, b) => a.tested_at.localeCompare(b.tested_at))) {
    const cle = MOUVEMENTS.find((m) => m === l.key)
    if (!cle) continue
    const v = typeof l.value === 'number' ? l.value : Number.parseFloat(l.value)
    if (Number.isFinite(v) && v > 0) out[cle] = Math.round(v)
  }
  return out
}

/**
 * Les repères ont-ils vieilli au point qu'il faille re-mesurer ?
 *
 * On regarde le plus ancien, pas le plus récent : une séance de test les
 * repasse tous, et se caler sur le plus récent reviendrait à ne jamais
 * re-tester ce qui n'a été mesuré qu'une fois.
 *
 * Sans aucun repère, la réponse est non : il n'y a rien à rafraîchir, et
 * c'est la semaine 1 qui pose le premier test.
 */
export function reperesPerimes(
  lignes: LigneRepere[],
  aujourdhui: string,
  jours = RETEST_JOURS,
): boolean {
  const dates = lignes
    .filter((l) => MOUVEMENTS.some((m) => m === l.key))
    .map((l) => l.tested_at.slice(0, 10))
  if (dates.length === 0) return false
  const plusAncien = dates.sort()[0]!
  const ecart = (new Date(aujourdhui).getTime() - new Date(plusAncien).getTime()) / 86_400_000
  return ecart >= jours
}
