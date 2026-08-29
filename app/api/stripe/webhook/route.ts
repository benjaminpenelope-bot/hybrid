import type Stripe from 'stripe'
import { NextResponse, type NextRequest } from 'next/server'
import { statutDepuisStripe, stripeClient } from '@/lib/paiement/stripe'
import { createAdminClient } from '@/lib/supabase/admin'

/**
 * WEBHOOK STRIPE
 *
 * Seule source de vérité sur l'état d'un abonnement. Le retour de navigateur
 * après paiement ne prouve rien : l'athlète peut fermer l'onglet avant, ou
 * fabriquer l'URL de retour à la main. C'est Stripe qui dit ce qui est payé.
 *
 * La vérification de signature n'est pas une précaution, c'est la serrure :
 * sans elle, n'importe qui s'offre l'abonnement en postant un JSON.
 */

export const dynamic = 'force-dynamic'

/** Événements traités. Les autres sont acquittés sans rien faire. */
const SUIVIS = new Set([
  'checkout.session.completed',
  'customer.subscription.created',
  'customer.subscription.updated',
  'customer.subscription.deleted',
])

export async function POST(request: NextRequest) {
  const secret = process.env.STRIPE_WEBHOOK_SECRET
  if (!secret) {
    console.error('[stripe] STRIPE_WEBHOOK_SECRET absente : webhook refuse')
    return NextResponse.json({ error: 'non configuré' }, { status: 503 })
  }

  const signature = request.headers.get('stripe-signature')
  if (!signature) return NextResponse.json({ error: 'signature absente' }, { status: 400 })

  // Le corps brut, jamais l'objet analyse : la signature porte sur les octets.
  const brut = await request.text()

  let evenement: Stripe.Event
  try {
    evenement = stripeClient().webhooks.constructEvent(brut, signature, secret)
  } catch (e) {
    console.error('[stripe] signature invalide', e instanceof Error ? e.message : e)
    return NextResponse.json({ error: 'signature invalide' }, { status: 400 })
  }

  if (!SUIVIS.has(evenement.type)) return NextResponse.json({ recu: true })

  try {
    await appliquer(evenement)
  } catch (e) {
    /*
     * On renvoie une erreur pour que Stripe reessaie. Acquitter un evenement
     * qu'on n'a pas su traiter perdrait l'abonnement en silence, et l'athlete
     * paierait sans acces.
     */
    console.error('[stripe] traitement impossible', evenement.type, e)
    return NextResponse.json({ error: 'traitement impossible' }, { status: 500 })
  }

  return NextResponse.json({ recu: true })
}

/** Identifiant POLYTRAIN porte par l'abonnement Stripe. */
function userIdDe(objet: { metadata?: Stripe.Metadata | null }): string | null {
  return objet.metadata?.hybrid_user_id ?? null
}

async function appliquer(evenement: Stripe.Event): Promise<void> {
  const stripe = stripeClient()

  /*
   * `checkout.session.completed` ne porte pas la periode couverte. On relit
   * donc l'abonnement chez Stripe plutot que de deviner : une date inventee
   * ici deciderait de l'acces pendant un mois.
   */
  let abonnement: Stripe.Subscription
  if (evenement.type === 'checkout.session.completed') {
    const session = evenement.data.object
    if (typeof session.subscription !== 'string') return
    abonnement = await stripe.subscriptions.retrieve(session.subscription)
  } else {
    abonnement = evenement.data.object as Stripe.Subscription
  }

  const userId = userIdDe(abonnement) ?? userIdDe({ metadata: abonnement.metadata })
  if (!userId) {
    console.error('[stripe] abonnement sans hybrid_user_id', abonnement.id)
    return
  }

  const fin = abonnement.items.data[0]?.current_period_end
  if (!fin) {
    console.error('[stripe] abonnement sans echeance', abonnement.id)
    return
  }

  const db = createAdminClient()
  const { error } = await db.from('subscriptions').upsert(
    {
      user_id: userId,
      status: statutDepuisStripe(abonnement.status),
      source: 'stripe',
      periode_fin: new Date(fin * 1000).toISOString(),
      external_id: abonnement.id,
      // On ne remet jamais `essai_utilise` a faux : un abonnement paye puis
      // resilie ne redonne pas droit a l'essai gratuit.
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'user_id' },
  )
  if (error) throw new Error(error.message)
}
