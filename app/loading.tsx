/**
 * Écran d'attente affiché pendant qu'un écran se charge.
 *
 * Sans lui, un appui sur un onglet ne produit rien de visible tant que le
 * serveur n'a pas répondu : chaque écran est `force-dynamic` et interroge
 * Supabase. En réseau mobile, ça se traduit par « l'app ne réagit pas » et par
 * des appuis répétés. La frontière Suspense fait basculer la navigation
 * immédiatement, et l'onglet actif suit tout de suite.
 *
 * Des blocs vides, jamais de chiffres factices : une valeur de remplissage
 * qu'on prendrait pour une mesure serait pire qu'une attente.
 */

function Bloc({ h, className = '' }: { h: number; className?: string }) {
  return (
    <div
      className={`animate-pulse rounded-card bg-card ${className}`}
      style={{ height: h }}
      aria-hidden
    />
  )
}

export default function Loading() {
  return (
    <main className="wrap py-[18px]" aria-busy="true" aria-live="polite">
      <span className="sr-only">Chargement…</span>

      <div className="flex items-start justify-between">
        <Bloc h={26} className="w-[140px]" />
        <Bloc h={26} className="w-[70px]" />
      </div>

      <div className="mt-3.5 flex flex-col gap-2.5">
        <Bloc h={168} />
        <Bloc h={64} />
        <Bloc h={92} />
        <Bloc h={120} />
      </div>
    </main>
  )
}
