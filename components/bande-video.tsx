'use client'

import { useEffect, useRef } from 'react'

/**
 * BANDE DE TRANSITION
 *
 * L'hélice d'ADN qui passe entre la promesse et sa démonstration.
 *
 * La source est verticale (576 × 1216) et la bande est horizontale : plutôt
 * que d'en recadrer une tranche — ce qui n'aurait montré qu'un fragment de
 * l'hélice au milieu d'une large bande noire — la vidéo est pivotée d'un
 * quart de tour. Le brin traverse alors la page dans sa largeur, ce qui est
 * exactement le geste qu'on attend d'une transition.
 *
 * Même principe que l'anneau pour l'intégration : claire sur fond noir, donc
 * `mix-blend-mode: screen` la pose sans découpe. Quatre bords éteints par des
 * masques — une transition qui se voit n'en est plus une.
 */
export function BandeVideo() {
  const ref = useRef<HTMLVideoElement | null>(null)

  useEffect(() => {
    const v = ref.current
    if (!v) return
    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)')
    const appliquer = () => {
      if (reduit.matches) v.pause()
      else void v.play().catch(() => {})
    }
    appliquer()
    reduit.addEventListener('change', appliquer)
    return () => reduit.removeEventListener('change', appliquer)
  }, [])

  return (
    <div
      className="pointer-events-none relative h-[180px] w-full overflow-hidden sm:h-[250px] md:h-[320px]"
      aria-hidden
      style={{
        /*
         * Un fondu lateral seulement. J'avais ajoute un fondu haut-bas :
         * apres rotation, la hauteur de la bande n'est plus que l'epaisseur
         * du brin, et le masque mangeait donc l'helice elle-meme. Le noir de
         * la source suffit a eteindre ces deux bords-la.
         */
        WebkitMaskImage: 'linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)',
        maskImage: 'linear-gradient(90deg, transparent, #000 14%, #000 86%, transparent)',
      }}
    >
      {/*
        Largeur et hauteur sont echangees avant rotation : l'element mesure la
        hauteur de la bande en largeur, et au moins la largeur de l'ecran en
        hauteur. Une fois pivote, il couvre donc exactement la bande.

        `contain` et non `cover` : recadrer rognait l'helice sur sa largeur,
        c'est-a-dire son epaisseur une fois couchee, et il n'en restait que
        des fragments. Les marges que `contain` laisse sur les cotes sont
        noires, donc invisibles sous `screen`.
      */}
      <video
        ref={ref}
        src="/video/transition.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute left-1/2 top-1/2 h-[100vw] w-[180px] object-contain sm:w-[250px] md:w-[320px]"
        style={{
          transform: 'translate(-50%, -50%) rotate(90deg)',
          mixBlendMode: 'screen',
          // Luminosite seule : le noir de la source vaut zero, voir la note
          // dans `anneau-video`. Un contraste n'eteindrait que l'helice.
          filter: 'brightness(2.6)',
        }}
      />
    </div>
  )
}
