/**
 * FENÊTRE DE CONVERSATION
 *
 * Combien de messages partent au modèle à chaque échange.
 *
 * Ce nombre vivait en trois exemplaires : la page en chargeait 20 depuis la
 * base, le client y ajoutait le message en cours, et le serveur en refusait
 * plus de 20. Vingt et un partaient donc, et la requête était rejetée — mais
 * seulement une fois l'historique plein, ce qui a laissé le coach marcher
 * quelques jours avant de tomber définitivement.
 *
 * Une seule constante, importée des trois côtés : le décalage ne peut plus
 * revenir. Le client tronque avant d'envoyer, le serveur garde sa limite
 * comme garde-fou — une requête forgée ne doit pas pouvoir gonfler la note.
 *
 * C'est aussi le premier levier de coût : l'historique représente à peu près
 * un tiers des jetons d'entrée d'un message.
 */
export const MAX_TOURS_ENVOYES = 20

/**
 * Réduit une conversation à sa fenêtre d'envoi, en gardant la fin —
 * c'est le contexte proche qui compte pour répondre.
 */
export function fenetre<T>(messages: T[]): T[] {
  return messages.slice(-MAX_TOURS_ENVOYES)
}
