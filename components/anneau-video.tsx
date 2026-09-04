'use client'

import { useEffect, useRef } from 'react'

/**
 * L'ANNEAU
 *
 * La vidéo de référence, intégrée telle quelle.
 *
 * Elle est blanche sur fond noir, et c'est ce qui permet de s'en servir sans
 * découpe : `mix-blend-mode: screen` ne garde d'une image que ce qui est plus
 * clair que le fond. Le noir de la vidéo disparaît donc entièrement dans le
 * noir de la page — pas de rectangle, pas de bord visible, et le halo qui
 * entoure l'anneau se fond au lieu d'être coupé net. Un détourage aurait
 * demandé un canal alpha que le format n'a pas.
 *
 * Le cadre est carré et l'image recadrée au centre : la source est en 720×510,
 * ses marges noires latérales n'apportent rien.
 *
 * Une seule balise, dimensionnée en CSS. Deux instances — une par point de
 * rupture, l'autre masquée — auraient mis deux décodeurs vidéo en marche pour
 * n'en montrer qu'un, et la balise masquee ne rend meme pas de dimensions
 * exploitables.
 */
export function AnneauVideo({ className = '' }: { className?: string }) {
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return

    /*
     * `autoPlay` ne suffit pas partout : Safari refuse la lecture automatique
     * si la balise n'est pas encore muette au moment de la décision, et les
     * navigateurs rendent la promesse de `play()` rejetée sans prévenir. On
     * réessaie une fois, et on abandonne silencieusement — une décoration ne
     * doit jamais faire remonter d'erreur.
     */
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)')

    const appliquer = () => {
      if (reduit.matches) {
        v.pause()
        // Un instant du cycle où le faisceau est ouvert : la forme reste
        // reconnaissable sans qu'aucun pixel ne bouge.
        v.currentTime = 3.2
      } else {
        void v.play().catch(() => {})
      }
    }

    appliquer()
    reduit.addEventListener('change', appliquer)
    return () => reduit.removeEventListener('change', appliquer)
  }, [])

  return (
    <video
      ref={ref}
      src="/video/anneau.mp4"
      autoPlay
      muted
      loop
      playsInline
      preload="metadata"
      aria-hidden
      className={`block aspect-square object-cover ${className}`}
      style={{
        mixBlendMode: 'screen',
        pointerEvents: 'none',
        /*
         * Le noir de la source n'est pas un vrai noir : compression aidant,
         * il tire vers le gris tres sombre. Or `screen` ne rend jamais plus
         * sombre que ce qu'il recouvre — ce gris suffisait donc a dessiner un
         * carre plat au milieu du degrade de la page. Le contraste le ramene
         * a zero sans toucher aux traits blancs.
         *
         * Il ecrase aussi le halo diffus que la source entoure de l'anneau :
         * tres sombre mais pas nul, il eclaircissait un disque autour de la
         * video, et c'est ce disque qu'on voyait comme un changement de
         * couleur.
         */
        filter: 'contrast(2.1) brightness(0.96)',
        /*
         * Et le masque efface les angles : meme noire, une image reste un
         * rectangle, et l'oeil finit toujours par le trouver.
         */
        WebkitMaskImage:
          'radial-gradient(circle at 50% 50%, #000 40%, rgb(0 0 0 / 0.35) 62%, transparent 76%)',
        maskImage:
          'radial-gradient(circle at 50% 50%, #000 40%, rgb(0 0 0 / 0.35) 62%, transparent 76%)',
      }}
    />
  )
}
