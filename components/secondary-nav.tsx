import Link from 'next/link'
import { IconBilan, IconObjectifs, IconRecuperation } from '@/components/ui/icons'

/**
 * RACCOURCIS DE L'ACCUEIL
 *
 * Objectifs, Récupération et Bilan n'ont pas leur place dans la barre
 * d'onglets — cinq onglets, pas plus. Sans cette rangée, ces trois écrans ne
 * seraient atteignables que par hasard, depuis un signal.
 *
 * Réglages n'y figure plus : c'est une affaire de compte et non
 * d'entraînement, et le quatrième lien tombait seul sur une deuxième ligne
 * dans une grille de trois colonnes. Il vit maintenant dans le menu profil,
 * en haut à droite.
 *
 * Trois cartes de verre plutôt que trois cadres de texte en capitales : un
 * pictogramme se reconnaît avant d'être lu, et ces trois écrans se
 * distinguent mieux par ce qu'ils montrent que par la longueur de leur nom.
 */
const LIENS = [
  { href: '/objectifs', label: 'Objectifs', Icon: IconObjectifs },
  { href: '/recuperation', label: 'Récupération', Icon: IconRecuperation },
  { href: '/bilan', label: 'Bilan', Icon: IconBilan },
] as const

export function SecondaryNav() {
  return (
    <nav className="mt-6 grid grid-cols-3 gap-2.5" aria-label="Autres écrans">
      {LIENS.map((l) => (
        <Link
          key={l.href}
          href={l.href}
          className="glass flex select-none flex-col items-center justify-center gap-2 rounded-card px-2 py-4 text-center transition-[background-color] duration-200 active:scale-[0.98]"
        >
          <span className="text-mut" aria-hidden>
            <l.Icon size={19} />
          </span>
          <span className="text-[12.5px] font-semibold tracking-[-0.01em]">{l.label}</span>
        </Link>
      ))}
    </nav>
  )
}
