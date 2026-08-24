import Link from 'next/link'

/**
 * Objectifs, Récupération et Bilan n'ont pas leur place dans la barre
 * d'onglets — cinq onglets, pas plus. Sans cette rangée, ces trois écrans
 * n'étaient atteignables que par hasard, depuis un signal.
 */
const LINKS = [
  { href: '/objectifs', label: 'Objectifs' },
  { href: '/recuperation', label: 'Récupération' },
  { href: '/bilan', label: 'Bilan' },
  { href: '/reglages', label: 'Réglages' },
] as const

export function SecondaryNav() {
  return (
    <nav className="mt-6 grid grid-cols-3 gap-2" aria-label="Autres écrans">
      {LINKS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="flex items-center justify-center rounded-[10px] border border-line2 px-2 py-2.5 text-center font-display text-[12px] font-bold uppercase tracking-[0.06em] text-text"
        >
          {l.label}
        </Link>
      ))}
    </nav>
  )
}
