import { createAdminClient } from '@/lib/supabase/admin'

/**
 * ABONNEMENTS
 *
 * Agnostique du fournisseur : Stripe aujourd'hui, l'achat intégré d'Apple
 * demain, un geste commercial à la main entre les deux. Le reste de
 * l'application ne connaît que `free` ou `pro`.
 */

export type StatutAbonnement = 'essai' | 'actif' | 'annule' | 'expire'
export type SourceAbonnement = 'stripe' | 'apple' | 'manuel'

export interface Abonnement {
  statut: StatutAbonnement
  source: SourceAbonnement
  /** Fin de la période couverte, ISO. */
  periodeFin: string
  essaiUtilise: boolean
}

/** Durée de l'essai, sans carte bancaire. */
export const JOURS_ESSAI = 14

export const PRIX = {
  mensuel: '9,99 €',
  annuel: '79,99 €',
} as const

/**
 * Cœur de la décision, pur et testable.
 *
 * Le retour à l'offre gratuite se déduit de la date de fin, il ne s'exécute
 * pas. C'est ce qui rend l'échéance fiable : aucune tâche planifiée ne peut
 * oublier de tourner, et un abonnement expiré ne peut pas continuer à donner
 * accès parce qu'un cron est tombé.
 *
 * Un abonnement résilié reste actif jusqu'au bout de la période déjà payée —
 * couper à l'instant de la résiliation reviendrait à facturer un service
 * qu'on retire.
 */
export function estPro(abonnement: Abonnement | null, maintenant: Date): boolean {
  if (!abonnement) return false
  if (abonnement.statut === 'expire') return false
  return new Date(abonnement.periodeFin) > maintenant
}

/** Jours restants avant l'échéance. Négatif si elle est passée. */
export function joursRestants(abonnement: Abonnement, maintenant: Date): number {
  const ms = new Date(abonnement.periodeFin).getTime() - maintenant.getTime()
  return Math.ceil(ms / 86_400_000)
}

interface LigneAbonnement {
  status: StatutAbonnement
  source: SourceAbonnement
  periode_fin: string
  essai_utilise: boolean
}

export async function lireAbonnement(userId: string): Promise<Abonnement | null> {
  const db = createAdminClient()
  const { data, error } = await db
    .from('subscriptions')
    .select('status, source, periode_fin, essai_utilise')
    .eq('user_id', userId)
    .maybeSingle<LigneAbonnement>()

  /*
   * Une lecture qui echoue ne doit pas offrir l'abonnement. On retombe sur
   * l'offre gratuite : l'athlete perd du confort, pas ses donnees.
   */
  if (error || !data) return null

  return {
    statut: data.status,
    source: data.source,
    periodeFin: data.periode_fin,
    essaiUtilise: data.essai_utilise,
  }
}

/** L'essai est-il encore disponible pour ce compte ? */
export async function essaiDisponible(userId: string): Promise<boolean> {
  const a = await lireAbonnement(userId)
  return a === null || !a.essaiUtilise
}
