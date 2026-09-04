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
         * Aucune correction de contraste : mesure faite sur la source, son
         * noir vaut exactement zero. `screen` laisse donc le fond de la page
         * intact tout seul, et les filtres que j'avais empiles pour « ecraser
         * le noir » n'ecrasaient en realite que l'anneau. Il ne reste qu'une
         * luminosite, qui multiplie — donc qui releve les gris du trace sans
         * jamais ressusciter un noir nul.
         */
        filter: 'brightness(1.7)',
        /*
         * Le masque n'efface plus un rectangle — il n'y en a pas — mais il
         * adoucit la fin du halo, qui sinon s'arrete net au bord du cadre.
         */
        WebkitMaskImage:
          'radial-gradient(circle at 50% 50%, #000 58%, rgb(0 0 0 / 0.5) 76%, transparent 92%)',
        maskImage:
          'radial-gradient(circle at 50% 50%, #000 58%, rgb(0 0 0 / 0.5) 76%, transparent 92%)',
      }}
    />
  )
}
