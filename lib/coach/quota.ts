import { createAdminClient } from '@/lib/supabase/admin'

/**
 * LIMITE D'USAGE DU COACH EN LIGNE
 *
 * Chaque message coûte de l'argent. Sans plafond, un compte peut dépenser sans
 * borne — un utilisateur intensif, ou simplement une boucle de réessai partie
 * en vrille.
 *
 * Deux plafonds, deux rôles distincts :
 *   - le jour borne les rafales. C'est lui qui protège d'un bug.
 *   - le mois borne le coût. C'est lui qui protège la marge.
 *
 * Un plafond atteint ne casse rien : le coach répond en local, comme quand la
 * clé est absente. L'athlète perd la finesse, pas le service.
 */

export type Plan = 'free' | 'pro'

export interface Limites {
  jour: number
  mois: number
}

/** Lit un entier d'environnement, sans jamais laisser passer une valeur absurde. */
function entier(nom: string, defaut: number): number {
  const brut = process.env[nom]
  if (!brut) return defaut
  const n = Number.parseInt(brut, 10)
  return Number.isFinite(n) && n >= 0 ? n : defaut
}

/**
 * Plafonds par défaut, calés sur l'offre.
 *
 * Coût mesuré d'un message : contexte 1 250 jetons, prompt système et outils
 * 1 450 (mis en cache), historique ~1 200, sortie ~600. Soit environ un
 * centime avec Claude Sonnet 5, deux fois et demie plus avec Opus 5.
 *
 *   free — 20 messages par mois : de quoi juger le coach, pas de quoi vivre
 *   dessus. Vingt centimes au pire par compte gratuit, soit un coût
 *   d'acquisition assumé.
 *
 *   pro — 100 par mois pour 9,99 €. Au pire un euro d'API, soit un dixième
 *   du prix ; en pratique bien moins, personne n'écrit cent messages à son
 *   coach. Le plafond ne borne pas l'usage normal, il borne la traîne.
 *
 * Réglables sans redéploiement : les mesures réelles vaudront toujours mieux
 * que cette estimation, et `coach_usage` les enregistre pour ça.
 */
export const LIMITES: Record<Plan, Limites> = {
  free: {
    jour: entier('COACH_LIMITE_FREE_JOUR', 3),
    mois: entier('COACH_LIMITE_FREE_MOIS', 20),
  },
  pro: {
    jour: entier('COACH_LIMITE_PRO_JOUR', 15),
    mois: entier('COACH_LIMITE_PRO_MOIS', 100),
  },
}

export interface EtatQuota {
  autorise: boolean
  plan: Plan
  restantJour: number
  restantMois: number
  /** Lequel des deux plafonds a bloqué. */
  motif: 'jour' | 'mois' | null
}

/**
 * Cœur de la décision, pur et testable : aucun accès réseau, aucune date
 * implicite. Le plafond mensuel passe avant le journalier — quand les deux
 * sont atteints, c'est le mois qui est la vraie mauvaise nouvelle.
 */
export function evaluer(plan: Plan, utiliseJour: number, utiliseMois: number): EtatQuota {
  const l = LIMITES[plan]
  const restantJour = Math.max(0, l.jour - utiliseJour)
  const restantMois = Math.max(0, l.mois - utiliseMois)
  const motif = restantMois === 0 ? 'mois' : restantJour === 0 ? 'jour' : null
  return { autorise: motif === null, plan, restantJour, restantMois, motif }
}

/**
 * Plan de l'athlète.
 *
 * Toujours `free` pour l'instant : la table `subscriptions` n'existe pas
 * encore, et rien ne permet de distinguer un abonné. Le jour où elle
 * arrivera, c'est cette fonction qui changera, et elle seule.
 */
export async function planDe(_userId: string): Promise<Plan> {
  return 'free'
}

/** Premier jour du mois d'une date ISO. */
export function debutDuMois(jour: string): string {
  return `${jour.slice(0, 7)}-01`
}

/** Où en est ce compte aujourd'hui et ce mois-ci. */
export async function etatQuota(userId: string, jour: string): Promise<EtatQuota> {
  const plan = await planDe(userId)
  const db = createAdminClient()

  // Une seule lecture : le mois entier, dont on extrait le jour courant.
  const { data, error } = await db
    .from('coach_usage')
    .select('jour, messages')
    .eq('user_id', userId)
    .gte('jour', debutDuMois(jour))

  /*
   * Une lecture qui echoue ne doit pas ouvrir le robinet. On refuse l'appel
   * en ligne plutot que de laisser passer un usage non compte : le coach
   * local prend le relais, donc l'athlete a quand meme une reponse.
   */
  if (error) return { autorise: false, plan, restantJour: 0, restantMois: 0, motif: 'jour' }

  const lignes = (data ?? []) as { jour: string; messages: number }[]
  const utiliseMois = lignes.reduce((acc, l) => acc + l.messages, 0)
  const utiliseJour = lignes.find((l) => l.jour === jour)?.messages ?? 0

  return evaluer(plan, utiliseJour, utiliseMois)
}

export interface UsageJetons {
  input: number
  output: number
  cacheRead: number
}

/**
 * Enregistre un message consommé.
 *
 * Appelé après coup : on compte ce qui a réellement été dépensé, jetons
 * compris. Un échec d'écriture ne doit pas faire disparaître la réponse déjà
 * streamée à l'athlète — il est donc journalisé, pas propagé.
 */
export async function enregistrerUsage(userId: string, jetons: UsageJetons): Promise<void> {
  try {
    const db = createAdminClient()
    const { error } = await db.rpc('enregistrer_usage_coach', {
      p_user_id: userId,
      p_input_tokens: jetons.input,
      p_output_tokens: jetons.output,
      p_cache_read_tokens: jetons.cacheRead,
    })
    if (error) console.error('[coach] usage non enregistre', error)
  } catch (e) {
    console.error('[coach] usage non enregistre', e)
  }
}

/** Message affiché quand le plafond est atteint. */
export function messageQuota(etat: EtatQuota): string {
  return etat.motif === 'mois'
    ? 'Tu as atteint ta limite de messages pour ce mois-ci. Le coach répond en local jusqu’au mois prochain.'
    : 'Tu as atteint ta limite de messages pour aujourd’hui. Le coach répond en local, et repart demain.'
}

/**
 * MODÈLE PAR PLAN
 *
 * Le coût suit le revenu au lieu de le précéder. Un compte gratuit tourne sur
 * Claude Sonnet 5, environ un centime le message ; un abonné sur Claude
 * Opus 5, deux fois et demie plus cher, ce que ses 9,99 € couvrent largement.
 *
 * Ce découpage n'est pas qu'une économie : il donne à l'offre payante quelque
 * chose de réel à vendre, au lieu d'un simple compteur relevé.
 *
 * Pourquoi Sonnet suffit au gratuit : le raisonnement dur — charge aiguë sur
 * chronique, récupération, arbre de décision, périodisation — est calculé en
 * TypeScript, pas par le modèle. Le verdict lui arrive tout fait. Il présente,
 * il nuance, il propose une action ; il ne décide pas.
 */
export interface ConfigModele {
  modele: 'claude-sonnet-5' | 'claude-opus-5'
  effort: 'low' | 'medium'
  /**
   * Repli serveur quand les classificateurs déclinent la requête. Réservé aux
   * modèles Opus, les seuls pour lesquels il est documenté — l'activer
   * ailleurs risquerait un refus de requête pour un cas qui n'arrive
   * pratiquement jamais à un coach sportif.
   */
  repliServeur: boolean
}

export const MODELES: Record<Plan, ConfigModele> = {
  free: { modele: 'claude-sonnet-5', effort: 'low', repliServeur: false },
  pro: { modele: 'claude-opus-5', effort: 'medium', repliServeur: true },
}
