'use server'

import { revalidatePath } from 'next/cache'
import { JOURS_ESSAI, lireAbonnement } from '@/lib/coach/abonnement'
import { configStripe, messageStripe, stripeClient, type Periodicite } from '@/lib/paiement/stripe'
import { createAdminClient } from '@/lib/supabase/admin'
import { currentUserId } from '@/lib/supabase/server'

/**
 * Démarrage de l'essai gratuit.
 *
 * Sans carte bancaire, quatorze jours, puis retour automatique à l'offre
 * gratuite — le retour se déduit de la date de fin, rien ne l'exécute.
 *
 * L'identifiant vient de la session, jamais d'un paramètre : une action qui
 * accepterait un `userId` du client offrirait l'abonnement à n'importe qui.
 */
export async function demarrerEssai(): Promise<{ ok: boolean; message: string }> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Session expirée. Reconnecte-toi.' }

  /*
   * Un seul essai par compte, definitivement. Sans cette garde, resilier puis
   * recommencer suffirait a rester en PRO sans jamais payer.
   */
  const existant = await lireAbonnement(userId)
  if (existant?.essaiUtilise) {
    return { ok: false, message: 'Tu as déjà utilisé ton essai gratuit sur ce compte.' }
  }

  const fin = new Date()
  fin.setDate(fin.getDate() + JOURS_ESSAI)

  const db = createAdminClient()
  const { error } = await db.from('subscriptions').upsert(
    {
      user_id: userId,
      status: 'essai',
      source: 'manuel',
      periode_fin: fin.toISOString(),
      essai_utilise: true,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )

  if (error) return { ok: false, message: "L'essai n'a pas pu démarrer. Réessaie dans un moment." }

  revalidatePath('/coach')
  revalidatePath('/pro')
  return { ok: true, message: `Ton essai est actif pour ${JOURS_ESSAI} jours.` }
}

/* ── Paiement ─────────────────────────────────────────────── */

/**
 * Ouvre une page de paiement Stripe.
 *
 * On ne crée jamais l'abonnement ici : cette action ne fait qu'emmener
 * l'athlète chez Stripe. C'est le webhook, signé, qui décidera de l'accès —
 * un retour de navigateur ne prouve rien, il se fabrique à la main.
 */
export async function ouvrirPaiement(
  periodicite: Periodicite,
): Promise<{ ok: boolean; url?: string; message?: string }> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Session expirée. Reconnecte-toi.' }

  const config = configStripe()
  if (!config) return { ok: false, message: 'Le paiement n’est pas encore ouvert.' }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3400'

  /*
   * S'abonner pendant l'essai ne doit pas faire perdre les jours restants.
   * On decale donc le premier prelevement a la fin de l'essai maison : sans
   * ca, souscrire au deuxieme jour reviendrait a jeter douze jours offerts,
   * et l'athlete a raison d'attendre — exactement ce qu'un essai ne doit pas
   * encourager.
   *
   * Stripe refuse un `trial_end` a moins de 48 h : passe ce seuil on
   * n'envoie rien, l'abonnement demarre tout de suite.
   */
  const essaiEnCours = await lireAbonnement(userId)
  const finEssai =
    essaiEnCours?.statut === 'essai' ? new Date(essaiEnCours.periodeFin).getTime() : 0
  const dansPlusDe48h = finEssai - Date.now() > 48 * 3600 * 1000

  try {
    const session = await stripeClient().checkout.sessions.create({
      mode: 'subscription',
      line_items: [{ price: config.prix[periodicite], quantity: 1 }],
      success_url: `${site}/pro?paiement=ok`,
      cancel_url: `${site}/pro?paiement=annule`,
      client_reference_id: userId,
      /*
       * L'identifiant voyage sur l'abonnement, pas seulement sur la session :
       * les evenements de renouvellement et de resiliation ne portent que
       * l'abonnement, et sans lui le webhook ne saurait pas a qui l'attribuer.
       */
      subscription_data: {
        metadata: { hybrid_user_id: userId },
        ...(dansPlusDe48h ? { trial_end: Math.floor(finEssai / 1000) } : {}),
      },
      metadata: { hybrid_user_id: userId },
    })
    if (!session.url) return { ok: false, message: 'Stripe n’a pas renvoyé de page de paiement.' }
    return { ok: true, url: session.url }
  } catch (e) {
    console.error('[stripe] ouverture du paiement impossible', e)
    return { ok: false, message: messageStripe(e) }
  }
}

/**
 * Ouvre le portail Stripe : moyen de paiement, factures, résiliation.
 *
 * Résilier doit être aussi simple que souscrire — c'est une obligation légale
 * en France, et de toute façon la moindre des choses.
 */
export async function ouvrirPortail(): Promise<{ ok: boolean; url?: string; message?: string }> {
  const userId = await currentUserId()
  if (!userId) return { ok: false, message: 'Session expirée. Reconnecte-toi.' }

  const abonnement = await lireAbonnement(userId)
  if (!abonnement?.externalId || abonnement.source !== 'stripe') {
    return { ok: false, message: 'Aucun abonnement payant à gérer sur ce compte.' }
  }

  const site = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3400'
  try {
    const stripe = stripeClient()
    // Le portail s'ouvre pour un client, pas pour un abonnement : on relit
    // l'abonnement pour retrouver a qui il appartient chez Stripe.
    const sub = await stripe.subscriptions.retrieve(abonnement.externalId)
    const client = typeof sub.customer === 'string' ? sub.customer : sub.customer.id
    const portail = await stripe.billingPortal.sessions.create({
      customer: client,
      return_url: `${site}/pro`,
    })
    return { ok: true, url: portail.url }
  } catch (e) {
    console.error('[stripe] ouverture du portail impossible', e)
    return { ok: false, message: messageStripe(e) }
  }
}
