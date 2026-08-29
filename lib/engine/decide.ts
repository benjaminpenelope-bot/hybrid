import { addDays } from './date'
import { acuteChronic, consecutiveDays } from './load'
import { computeRecovery } from './recovery'
import { wellnessOn } from './state'
import type { AthleteState, ISODate, Session } from './types'

/**
 * COUCHE DE DÉCISION
 *
 * Répond à une seule question : « qu'est-ce que cette personne devrait faire
 * aujourd'hui, compte tenu de tout ce qu'on sait d'elle ? »
 *
 * Pure et déterministe. Aucun appel réseau, aucun modèle de langage. Le LLM
 * reçoit ce verdict pour l'écrire en français ; il ne le choisit jamais. Deux
 * conséquences voulues :
 *
 * - le jugement est testable sans clé API, et reproductible ;
 * - sans clé API, le coach garde exactement le même jugement, seule la
 *   formulation devient plus sèche. Le repli local cesse d'être un mode dégradé.
 *
 * Chaque verdict porte les preuves qui l'ont produit, avec leur valeur. Une
 * décision qu'on ne peut pas justifier chiffres en main n'est pas prise.
 */

/**
 * Latitude « équilibrée » : alléger, alourdir, déplacer, ou transformer en
 * repos. Jamais supprimer ni remplacer par une autre discipline — ces deux-là
 * relèvent d'une latitude étendue qui n'a pas été retenue.
 */
export type Action = 'maintenir' | 'progresser' | 'alleger' | 'deplacer' | 'repos'

export interface Preuve {
  /** Ce qui est observé. */
  quoi: string
  /** Sa valeur, telle qu'on peut la citer à l'athlète. */
  valeur: string
  /** Pourquoi cette observation pousse vers cette décision. */
  effet: string
}

export interface Verdict {
  action: Action
  /**
   * Facteur appliqué au volume, quand l'action en demande un.
   * 0.85 retire 15 %, 1.05 en ajoute 5. `null` si l'action n'en a pas besoin.
   */
  ampleur: number | null
  /** Séance visée. `null` un jour sans séance programmée. */
  sessionId: string | null
  /** Date d'accueil, uniquement pour un déplacement. */
  versDate: ISODate | null
  preuves: Preuve[]
  /**
   * Vrai quand la décision change la structure de la semaine. La latitude
   * équilibrée impose alors de demander avant d'appliquer.
   */
  confirmationRequise: boolean
}

/* ── Seuils ────────────────────────────────────────────────────
 * Repris de ceux déjà en vigueur dans le moteur, pour qu'une décision ne
 * contredise jamais un signal affiché à côté d'elle.
 */

/** Au-delà, la littérature associe le ratio aigu/chronique à un sur-risque. */
const ACWR_DANGER = 1.5
/** En dessous, la charge récente est nettement sous la charge habituelle. */
const ACWR_BAS = 0.8
/** Même seuil que l'alerte « jours sans coupure » de `alerts.ts`. */
const JOURS_SANS_COUPURE = 6
/** Une douleur déclarée pèse ce nombre de jours après sa saisie. */
const FENETRE_DOULEUR = 2

/** Mêmes facteurs que `adapt.ts`, pour ne pas avoir deux barèmes. */
const ALLEGER = 0.85
const ALLEGER_FORT = 0.7
const PROGRESSER = 1.05

function seanceDuJour(state: AthleteState, today: ISODate): Session | null {
  return state.sessions.find((s) => s.date === today && s.type !== 'REST') ?? null
}

function reposDuJour(state: AthleteState, today: ISODate): boolean {
  return state.sessions.some((s) => s.date === today && s.type === 'REST')
}

/** Douleur signalée dans les derniers jours, la plus récente d'abord. */
function douleurRecente(state: AthleteState, today: ISODate): Session | null {
  const depuis = addDays(today, -FENETRE_DOULEUR)
  return (
    state.sessions
      .filter((s) => s.date > depuis && s.date <= today && !!s.pain?.trim())
      .sort((a, b) => b.date.localeCompare(a.date))[0] ?? null
  )
}

/**
 * L'athlète a-t-il dit comment il se sent AUJOURD'HUI ?
 *
 * Deux pièges évités ici, et il a fallu les deux.
 *
 * Le premier : `Recovery.measured` ne veut pas dire « il a parlé ». Le score
 * inclut le ratio de charge et les jours consécutifs, que le seul historique
 * rend mesurables. S'en servir pour progresser compterait deux fois la même
 * preuve — une charge basse rendrait la récupération verte, et on invoquerait
 * les deux.
 *
 * Le second : `computeRecovery` s'appuie sur le dernier relevé connu, sans
 * limite d'ancienneté. Affiché, un score un peu vieux reste informatif. Pour
 * décider de la séance du jour, non : dire « tu récupères bien aujourd'hui »
 * à partir d'un sommeil vieux de deux jours, c'est présenter une absence de
 * mesure comme une mesure. Un ressenti périmé vaut donc un ressenti absent.
 */
function ressentiDuJour(state: AthleteState, today: ISODate): boolean {
  const w = wellnessOn(state, today)
  return w !== null && (w.sleep !== null || w.fatigue !== null)
}

/** Le lendemain est-il un jour de repos ? Détermine si un report est possible. */
function lendemainLibre(state: AthleteState, today: ISODate): ISODate | null {
  const demain = addDays(today, 1)
  const occupe = state.sessions.some((s) => s.date === demain && s.type !== 'REST')
  return occupe ? null : demain
}

/**
 * Décide de la conduite du jour.
 *
 * Un arbre, pas une somme de scores : la première règle qui s'applique gagne,
 * de la plus grave à la plus favorable. Un score composite masquerait la raison
 * — or c'est la raison qui doit être expliquée à l'athlète.
 */
export function decide(state: AthleteState, today: ISODate): Verdict {
  const seance = seanceDuJour(state, today)
  const rec = computeRecovery(state, today)
  const { acwr, l7, reliable } = acuteChronic(state, today)
  const streak = consecutiveDays(state, today)
  const preuves: Preuve[] = []

  /* ── 1. Douleur déclarée ──────────────────────────────────
   * La règle la plus forte, et la seule qui ne dépende d'aucun calcul. Le
   * produit ne pose aucun diagnostic : il allège et renvoie vers un
   * professionnel de santé, il ne qualifie jamais la douleur.
   */
  const douleur = douleurRecente(state, today)
  if (douleur) {
    preuves.push({
      quoi: 'Douleur signalée',
      valeur: douleur.pain!.trim(),
      effet: 'Une douleur récente impose de réduire la charge sur la zone concernée.',
    })
    if (!seance) {
      return { action: 'maintenir', ampleur: null, sessionId: null, versDate: null, preuves, confirmationRequise: false }
    }
    return {
      action: 'alleger',
      ampleur: ALLEGER_FORT,
      sessionId: seance.id,
      versDate: null,
      preuves,
      confirmationRequise: false,
    }
  }

  /* ── 2. Jour sans séance ──────────────────────────────────
   * Rien à décider sur un repos programmé. On ne propose pas d'ajouter une
   * séance : le repos fait partie du plan, pas des trous à combler.
   */
  if (!seance) {
    if (reposDuJour(state, today)) {
      preuves.push({
        quoi: 'Journée',
        valeur: 'Repos programmé',
        effet: 'Le repos est prévu par le microcycle, il se prend.',
      })
    }
    return { action: 'maintenir', ampleur: null, sessionId: null, versDate: null, preuves, confirmationRequise: false }
  }

  /* ── 3. Enchaînement trop long ────────────────────────────
   * Indépendant de la récupération déclarée : c'est une donnée d'agenda, pas
   * de ressenti, donc toujours disponible.
   */
  if (streak >= JOURS_SANS_COUPURE) {
    preuves.push({
      quoi: 'Jours consécutifs avec séance',
      valeur: `${streak}`,
      effet: 'Au-delà de six jours enchaînés, la coupure rapporte plus que la séance.',
    })
    const demain = lendemainLibre(state, today)
    if (demain) {
      return {
        action: 'deplacer',
        ampleur: null,
        sessionId: seance.id,
        versDate: demain,
        preuves,
        // Un déplacement change la structure de la semaine : on demande.
        confirmationRequise: true,
      }
    }
    return { action: 'repos', ampleur: null, sessionId: seance.id, versDate: null, preuves, confirmationRequise: true }
  }

  /* ── 4. Récupération dégradée ─────────────────────────────
   * Uniquement si elle est mesurée. Un score neutre fabriqué à partir de rien
   * ne justifie aucune décision — c'est la règle centrale du produit.
   */
  const ressenti = ressentiDuJour(state, today)

  if (ressenti && rec.zone === 'RED') {
    preuves.push({
      quoi: 'Score de récupération',
      valeur: `${rec.score} sur 100`,
      effet: 'Sous 45, reprendre à l’identique aggrave la dette de récupération.',
    })
    return { action: 'repos', ampleur: null, sessionId: seance.id, versDate: null, preuves, confirmationRequise: true }
  }

  /* ── 5. Charge aiguë trop haute ───────────────────────────
   * `reliable` protège des premières semaines, où sept jours de charge se
   * compareraient à une moyenne qui n'existe pas encore.
   */
  if (reliable && acwr > ACWR_DANGER) {
    preuves.push({
      quoi: 'Charge des 7 derniers jours',
      valeur: `${l7} unités, soit ${acwr.toFixed(2)} fois ton habitude`,
      effet: 'Une charge qui dépasse de moitié l’habitude expose à la blessure.',
    })
    return { action: 'alleger', ampleur: ALLEGER, sessionId: seance.id, versDate: null, preuves, confirmationRequise: false }
  }

  if (ressenti && rec.zone === 'YELLOW') {
    preuves.push({
      quoi: 'Score de récupération',
      valeur: `${rec.score} sur 100`,
      effet: 'Entre 45 et 70, la séance se fait mais sans chercher l’intensité.',
    })
    return { action: 'alleger', ampleur: ALLEGER, sessionId: seance.id, versDate: null, preuves, confirmationRequise: false }
  }

  /* ── 6. Marge disponible ──────────────────────────────────
   * Progresser exige les deux : une récupération mesurée et bonne, et une
   * charge réellement basse. Une seule des deux ne suffit pas — une charge
   * basse peut venir d'une semaine de maladie.
   */
  if (ressenti && rec.zone === 'GREEN' && reliable && acwr < ACWR_BAS) {
    preuves.push({
      quoi: 'Score de récupération',
      valeur: `${rec.score} sur 100`,
      effet: 'Au-dessus de 70, le corps encaisse une charge supplémentaire.',
    })
    preuves.push({
      quoi: 'Charge des 7 derniers jours',
      valeur: `${l7} unités, soit ${acwr.toFixed(2)} fois ton habitude`,
      effet: 'La charge récente est sous ton habitude : il reste de la marge.',
    })
    return { action: 'progresser', ampleur: PROGRESSER, sessionId: seance.id, versDate: null, preuves, confirmationRequise: false }
  }

  /* ── 7. Rien ne s'oppose au plan ──────────────────────────
   * On dit pourquoi on ne change rien, ce qui vaut mieux qu'un silence.
   */
  if (ressenti) {
    preuves.push({
      quoi: 'Score de récupération',
      valeur: `${rec.score} sur 100`,
      effet: 'Rien dans ta récupération ne justifie de modifier la séance.',
    })
  } else {
    preuves.push({
      quoi: 'Récupération',
      valeur: 'non mesurée aujourd’hui',
      effet:
        'Sans sommeil ni fatigue saisis pour la journée, aucune conclusion n’est tirée : la séance prévue s’applique telle quelle. Un relevé d’avant-hier ne dit rien de ce matin.',
    })
  }

  return { action: 'maintenir', ampleur: null, sessionId: seance.id, versDate: null, preuves, confirmationRequise: false }
}
