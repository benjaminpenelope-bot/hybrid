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

/**
 * Traduit une erreur Stripe en une phrase pour l'athlète.
 *
 * Une erreur de configuration n'est pas une panne passagère. Les confondre
 * fait chercher au mauvais endroit : « le paiement est momentanément
 * indisponible » invite à réessayer plus tard, alors qu'un tarif absent ou une
 * clé du mauvais monde ne se répareront jamais tout seuls. Le détail exact
 * part dans les journaux du serveur, jamais vers le client — un message
 * d'erreur d'API peut contenir des morceaux de la requête.
 */
export function messageStripe(erreur: unknown): string {
  const type = (erreur as { type?: string } | null)?.type
  switch (type) {
    case 'StripeAuthenticationError':
    case 'StripePermissionError':
      return "Le paiement n'est pas correctement configuré sur ce serveur. On est prévenus."
    case 'StripeInvalidRequestError':
      // Tarif inexistant, cle de test face a des objets live, produit
      // supprime : rien que l'athlete puisse corriger.
      return "L'offre n'est pas disponible pour le moment. On est prévenus."
    case 'StripeConnectionError':
    case 'StripeAPIError':
    case 'StripeRateLimitError':
      return 'Le paiement est momentanément indisponible. Réessaie dans un instant.'
    default:
      return 'Le paiement est momentanément indisponible. Réessaie dans un instant.'
  }
}

/**
 * Adresse publique du site, pour les retours depuis Stripe.
 *
 * `??` ne rattrape que `null` et `undefined`, pas la chaîne vide — et une
 * variable d'environnement posée sans valeur est vide, pas absente. On
 * obtiendrait alors `"/pro"` en guise d'URL de retour : Stripe la refuse, et
 * le paiement échouerait pour une raison qui n'a rien à voir avec le
 * paiement. On teste donc le contenu, pas la présence.
 */
export function adresseDuSite(): string {
  const brut = process.env.NEXT_PUBLIC_SITE_URL?.trim()
  if (!brut) return 'http://localhost:3400'
  return brut.replace(/\/+$/, '')
}
