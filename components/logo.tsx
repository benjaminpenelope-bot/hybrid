/* eslint-disable @next/next/no-img-element */

/**
 * MARQUE HYBRID
 *
 * Le fichier source est `public/mark.png` : un triskèle chromé, trois branches
 * qui se rejoignent — les disciplines qui composent un entraînement hybride.
 * Défini ici et nulle part ailleurs : changer de logo, c'est changer ce
 * composant.
 *
 * Le chrome ne porte aucune couleur, et c'est délibéré. L'ancien logo était
 * violet, ce qui obligeait à réserver ce violet au châssis pour ne pas le
 * confondre avec le street workout. Le problème disparaît : la marque est un
 * argent, et l'argent n'est la couleur d'aucune discipline.
 *
 * Une image et non un `next/image` : le logo est minuscule à l'écran et déjà
 * dans le dossier public, l'optimiseur n'ajouterait qu'une requête.
 */

/** Argent de la marque. Voir `--brand` dans globals.css. */
export const LOGO_ARGENT = '#D6DAE2'

export function LogoMark({
  size = 32,
  title,
  /**
   * Halo derrière la marque. Réservé aux écrans où elle est le sujet —
   * connexion, chargement — jamais dans une barre de navigation, où elle
   * ferait concurrence au contenu.
   */
  halo = false,
}: {
  size?: number
  /** Renseigné, l'image est annoncée aux lecteurs d'écran. Sinon décorative. */
  title?: string
  halo?: boolean
}) {
  return (
    <span
      className="relative inline-flex shrink-0 items-center justify-center"
      style={{ width: size, height: size }}
    >
      {halo && (
        <span
          aria-hidden
          className="pointer-events-none absolute rounded-full"
          style={{
            /*
             * Un dégradé radial plutôt qu'une ombre portée : l'ombre s'arrête
             * net sur le bord de son élément et dessine un disque, là où le
             * dégradé s'éteint progressivement dans le noir.
             */
            inset: `-${Math.round(size * 0.55)}px`,
            background:
              'radial-gradient(closest-side, rgb(255 255 255 / 0.13), rgb(255 255 255 / 0.05) 45%, transparent 72%)',
          }}
        />
      )}
      <img
        src="/mark.png"
        width={size}
        height={size}
        alt={title ?? ''}
        aria-hidden={title ? undefined : true}
        className="relative shrink-0"
        style={{ width: size, height: size }}
      />
    </span>
  )
}
