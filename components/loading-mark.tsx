/* eslint-disable @next/next/no-img-element */

/**
 * MARQUE EN ATTENTE
 *
 * Le logo bat comme un cœur, sur un halo conique flouté qui pulse au même
 * rythme. Les deux durent 1,6 s et partent ensemble : décalés, ils donneraient
 * l'impression de deux animations qui se courent après.
 *
 * Le halo reprend les couleurs des disciplines plutôt que des teintes
 * arbitraires — c'est le vocabulaire de l'app, et le flou de 40 px les rend de
 * toute façon plus atmosphériques que lisibles.
 *
 * Aucun texte : un écran d'attente qui annonce « chargement » l'annonce déjà
 * par son mouvement. Le libellé existe, mais pour les lecteurs d'écran.
 */
export function LoadingMark({ size = 116 }: { size?: number }) {
  const halo = Math.round(size * 0.26)

  return (
    <div
      className="relative grid place-items-center"
      style={{ width: size, height: size }}
      aria-hidden
    >
      <div
        className="absolute rounded-full"
        style={{
          inset: -halo,
          background:
            'conic-gradient(from 0deg, var(--street), var(--run), var(--swim), var(--street))',
          filter: `blur(${Math.round(size * 0.3)}px)`,
          animation: 'halo 1.6s ease-out infinite',
        }}
      />
      <img
        src="/mark.png"
        alt=""
        width={size}
        height={size}
        className="relative"
        style={{ width: size, height: size, animation: 'battement 1.6s ease-in-out infinite' }}
      />
    </div>
  )
}
