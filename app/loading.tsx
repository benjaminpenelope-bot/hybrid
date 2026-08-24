import { LoadingMark } from '@/components/loading-mark'

/**
 * Écran d'attente affiché pendant qu'un écran se charge.
 *
 * Sans lui, un appui sur un onglet ne produit rien de visible tant que le
 * serveur n'a pas répondu : chaque écran est `force-dynamic` et interroge
 * Supabase. En réseau mobile, ça se traduisait par « l'app ne réagit pas » et
 * par des appuis répétés. La frontière Suspense fait basculer la navigation
 * immédiatement, et l'onglet actif suit tout de suite.
 *
 * La marque animée a remplacé un squelette de blocs gris. Un squelette dessine
 * une structure qui ne correspond pas forcément à l'écran demandé, et faire
 * miroiter des cartes à l'emplacement de chiffres réels ne renseigne sur rien.
 * Ici, rien n'est promis : seulement que ça travaille.
 */
export default function Loading() {
  return (
    <main className="wrap flex min-h-[68vh] items-center justify-center py-[18px]" aria-busy="true">
      <span className="sr-only" role="status">
        Chargement…
      </span>
      <LoadingMark />
    </main>
  )
}
