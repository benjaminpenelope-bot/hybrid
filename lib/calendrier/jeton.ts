import { createHmac, timingSafeEqual } from 'node:crypto'

/**
 * JETON DE CALENDRIER
 *
 * Un calendrier auquel on s'abonne se relit tout seul : la montre et le
 * téléphone vont chercher le fichier plusieurs fois par jour, et la séance
 * déplacée hier apparaît sans que personne n'ait rien réimporté. C'est ce qui
 * sépare un abonnement d'un export — un fichier téléchargé est une photo, un
 * abonnement est un lien.
 *
 * Mais une application de calendrier ne sait pas s'authentifier : elle
 * appelle une adresse, sans cookie ni en-tête. L'adresse doit donc porter
 * elle-même la preuve.
 *
 * D'où un jeton signé plutôt qu'un jeton tiré au sort : il contient
 * l'identifiant du compte et sa signature, si bien que le serveur le vérifie
 * par un calcul, sans rien avoir stocké. Aucune colonne, aucune migration, et
 * surtout aucune table à balayer à chaque requête. La révocation existe quand
 * même : changer le secret invalide tous les liens d'un coup.
 *
 * Ce jeton ne donne accès qu'en lecture, et qu'au programme. Il ne peut ni
 * écrire, ni lire une pesée, ni ouvrir une session.
 */

const SECRET = 'CALENDRIER_SECRET'

/** Le calendrier n'est proposé que si le serveur peut signer. */
export function calendrierOuvert(): boolean {
  return (process.env[SECRET] ?? '').length >= 16
}

function signature(userId: string, secret: string): string {
  return createHmac('sha256', secret).update(userId).digest('base64url')
}

/**
 * Jeton d'un compte, de la forme `<identifiant>.<signature>`.
 * `null` quand le serveur n'a pas de secret : mieux vaut ne rien proposer
 * qu'un lien qui ne s'ouvrira jamais.
 */
export function jetonDe(userId: string): string | null {
  const secret = process.env[SECRET]
  if (!secret || secret.length < 16) return null
  return `${userId}.${signature(userId, secret)}`
}

/**
 * Identifiant du compte porté par un jeton, ou `null` s'il n'est pas
 * authentique.
 *
 * La comparaison est à temps constant : sans elle, le temps de réponse dirait
 * combien de caractères de la signature sont justes, et une signature se
 * devine caractère par caractère.
 */
export function compteDuJeton(jeton: string): string | null {
  const secret = process.env[SECRET]
  if (!secret || secret.length < 16) return null

  // `lastIndexOf` et non `split` : un identifiant Supabase ne contient pas de
  // point, mais s'en remettre a cette hypothese rendrait le decoupage fragile.
  const coupure = jeton.lastIndexOf('.')
  if (coupure <= 0) return null

  const userId = jeton.slice(0, coupure)
  const fournie = Buffer.from(jeton.slice(coupure + 1), 'utf8')
  const attendue = Buffer.from(signature(userId, secret), 'utf8')
  if (fournie.length !== attendue.length) return null
  return timingSafeEqual(fournie, attendue) ? userId : null
}
