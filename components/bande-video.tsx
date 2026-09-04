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
 * Même principe que l'anneau pour l'intégration : le noir de la source vaut
 * zéro, donc `mix-blend-mode: screen` la pose sur la page sans rien y ajouter.
 *
 * Aucun masque, et surtout aucun `overflow: hidden` sur le conteneur : l'un
 * comme l'autre y ouvrent un contexte d'empilement, et un mélange ne se fait
 * qu'avec le fond du contexte qui le contient. La vidéo se mélangeait donc
 * avec du vide au lieu de la page, et son cadre noir redevenait opaque —
 * c'est le rectangle qu'on voyait. Sans eux, `contain` laisse des marges
 * noires sur les côtés, que le mélange rend invisibles.
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
      className="pointer-events-none relative h-[180px] w-full sm:h-[250px] md:h-[320px] lg:h-[400px]"
      aria-hidden
    >
      {/*
        Largeur et hauteur sont echangees avant rotation : l'element mesure la
        hauteur de la bande en largeur, et au moins la largeur de l'ecran en
        hauteur. Une fois pivote, il couvre donc exactement la bande.

        `cover`, et la bande grandit avec l'ecran.
        
        `contain` laissait l'helice au milieu d'une bande deux fois plus
        large qu'elle : sur un ecran de 1280 pixels, elle n'en occupait que la
        moitie et le reste etait vide. La source est verticale et deux fois
        plus longue que large — pour qu'elle traverse toute la largeur une
        fois couchee, il faut la recadrer sur son epaisseur, donc lui donner
        assez de hauteur pour que le recadrage tombe dans les marges de
        l'image plutot que dans le brin.
      */}
      <video
        ref={ref}
        src="/video/transition.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute left-1/2 top-1/2 h-[100vw] w-[180px] object-cover sm:w-[250px] md:w-[320px] lg:w-[400px]"
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
