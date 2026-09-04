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
      className="pointer-events-none relative aspect-[1216/576] w-full"
      aria-hidden
    >
      {/*
        Largeur et hauteur sont echangees avant rotation : l'element mesure la
        hauteur de la bande en largeur, et au moins la largeur de l'ecran en
        hauteur. Une fois pivote, il couvre donc exactement la bande.

        LA HAUTEUR SUIT LA LARGEUR, AU RATIO EXACT DE LA SOURCE.

        Mesure faite image par image sur la video : l'helice occupe 99,7 % de
        la largeur du cadre. Il n'y a donc aucune marge a sacrifier — tout
        recadrage coupe les branches, et tout boitage laisse du noir sur les
        cotes. Les deux defauts sont le meme, vus de deux hauteurs
        differentes.

        La seule geometrie qui n'ait ni l'un ni l'autre est le ratio de la
        source elle-meme, une fois couchee : 1216 sur 576, soit une bande
        haute de 47,4 % de sa largeur. L'element mesure alors exactement la
        bande apres rotation, et `cover` comme `contain` donnent le meme
        resultat — il n'y a plus rien a recadrer.

        Les 100vw comptent la barre de defilement, que la bande n'a pas :
        l'element deborde donc d'environ six pixels dans sa longueur.
        `cover` les rogne, la ou `contain` aurait laisse un jour.
      */}
      <video
        ref={ref}
        src="/video/transition.mp4"
        autoPlay
        muted
        loop
        playsInline
        preload="metadata"
        className="absolute left-1/2 top-1/2 h-[100vw] w-[47.37vw] object-cover"
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
