import Stripe from 'stripe'

/**
 * STRIPE — serveur uniquement.
 *
 * La clé secrète ne quitte jamais le serveur. Aucun module de ce dossier ne
 * doit être importé depuis un composant client.
 *
 * Tout est facultatif : sans clés, l'application tourne exactement comme
 * avant, l'essai gratuit compris. C'est ce qui permet de développer et de
 * déployer sans compte Stripe, et ce qui évite qu'une clé absente en
 * production fasse tomber des écrans qui n'ont rien à voir avec le paiement.
 */

export type Periodicite = 'mensuel' | 'annuel'

/** Configuration lue une fois. `null` = paiement non branché. */
export function configStripe(): { cle: string; prix: Record<Periodicite, string> } | null {
  const cle = process.env.STRIPE_SECRET_KEY
  const mensuel = process.env.STRIPE_PRIX_MENSUEL
  const annuel = process.env.STRIPE_PRIX_ANNUEL
  if (!cle || !mensuel || !annuel) return null
  return { cle, prix: { mensuel, annuel } }
}

export function paiementOuvert(): boolean {
  return configStripe() !== null
}

export function stripeClient(): Stripe {
  const config = configStripe()
  if (!config) throw new Error('Stripe n’est pas configuré sur ce serveur.')
  return new Stripe(config.cle)
}

/**
 * Traduit un statut Stripe vers le nôtre.
 *
 * `canceled` chez Stripe veut dire « terminé », pas « résilié en cours » : une
 * résiliation programmée reste `active` jusqu'à l'échéance. Les confondre
 * couperait l'accès à quelqu'un qui a payé jusqu'au bout du mois.
 */
export function statutDepuisStripe(s: Stripe.Subscription.Status): 'actif' | 'annule' | 'expire' {
  switch (s) {
    case 'active':
    case 'trialing':
      return 'actif'
    case 'past_due':
    case 'unpaid':
      // Le paiement a echoue mais Stripe reessaie : l'acces court jusqu'a
      // l'echeance deja couverte, et `periode_fin` s'en charge.
      return 'annule'
    default:
      return 'expire'
  }
}
