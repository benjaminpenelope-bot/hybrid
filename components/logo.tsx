/* eslint-disable @next/next/no-img-element */

/**
 * MARQUE HYBRID
 *
 * Le fichier source est `public/logo.png` : trois bandes entrelacées, une par
 * discipline. Défini ici et nulle part ailleurs — changer de logo, c'est
 * changer ce composant.
 *
 * Une image et non un `next/image` : le logo est minuscule à l'écran et déjà
 * dans le dossier public, l'optimiseur n'apporterait qu'une requête de plus.
 *
 * Le fichier porte son propre fond sombre (pas de transparence). Les coins
 * arrondis le font lire comme une tuile d'application plutôt que comme un
 * carré noir posé sur l'interface.
 */

/** Violet de la marque. */
export const LOGO_VIOLET = '#924DDE'

export function LogoMark({
  size = 32,
  title,
}: {
  size?: number
  /** Renseigné, l'image est annoncée aux lecteurs d'écran. Sinon décorative. */
  title?: string
}) {
  return (
    <img
      src="/logo.png"
      width={size}
      height={size}
      alt={title ?? ''}
      aria-hidden={title ? undefined : true}
      className="shrink-0 rounded-[22%]"
      style={{ width: size, height: size }}
    />
  )
}
