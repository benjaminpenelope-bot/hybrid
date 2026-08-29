import Link from 'next/link'

/**
 * Écran pas encore construit. Il dit à quelle étape il arrive et ce qu'il
 * contiendra, plutôt que de faire semblant avec des données de démonstration.
 */
export function AVenir({
  titre,
  etape,
  detail,
}: {
  titre: string
  etape: number
  detail: string
}) {
  return (
    <main className="wrap flex min-h-[70vh] flex-col justify-center py-10">
      <p className="eyebrow">Étape {etape} sur 9</p>
      <h1 className="dsp mt-1 text-[26px]">{titre}</h1>
      <p className="mt-3 text-[13.5px] leading-relaxed text-mut">{detail}</p>
      <p className="mt-4 text-[12.5px] leading-relaxed text-dim">
        Cet écran n&apos;est pas encore construit. Rien n&apos;est affiché ici tant qu&apos;il
        n&apos;y a rien de réel à montrer.
      </p>
      <Link
        href="/aujourdhui"
        className="mt-6 flex w-full items-center justify-center rounded-[13px] border border-line2 p-3 font-display text-[13px] font-bold uppercase tracking-[0.09em] text-text"
      >
        Retour à l&apos;accueil
      </Link>
    </main>
  )
}
