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
/**
 * Part de la hauteur de la source conservée, centrée.
 *
 * Mesuré image par image : l'helice remplit toute la source, il n'y a pas de
 * region vide a supprimer. Ce qui paraissait vide venait de la hauteur de la
 * bande — cent soixante-dix-huit pixels sur un telephone — ou les endroits ou
 * un brin s'amincit se lisent comme des trous.
 *
 * En n'en gardant que la moitie centrale, deux choses s'arrangent ensemble :
 * la bande devient deux fois moins haute, donc moins encombrante en pied
 * d'ecran, et c'est justement la partie ou les deux brins se croisent — la
 * plus dense de l'image.
 */
const PART = 0.5

export function BandeVideo({ pleine = false }: { pleine?: boolean }) {
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
      className="pointer-events-none relative w-full"
      style={{
        /*
         * La hauteur suit la part conservee. `aspect-ratio` en style plutot
         * qu'en classe : la valeur se deduit de `PART`, et deux endroits qui
         * decrivent la meme coupe finiraient par diverger.
         */
        aspectRatio: `1216 / ${Math.round(576 * (pleine ? 1 : PART))}`,
      }}
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
          /*
           * LA COUPE SE FAIT AU MASQUE, JAMAIS A `overflow: hidden`.
           *
           * Un `overflow` sur le conteneur y ouvrirait un contexte
           * d'empilement, et un melange ne se fait qu'avec le fond du
           * contexte qui le contient : la video se melangerait avec du vide
           * au lieu de la page, et son cadre noir redeviendrait opaque.
           * C'est le rectangle qu'on voyait avant. Le masque, lui, ne groupe
           * rien.
           *
           * DEUX COUCHES, croisees.
           *
           * `to right` coupe la bande en hauteur : le masque s'applique dans
           * le repere propre de l'element, avant rotation, et sa largeur
           * locale est la hauteur de la bande une fois couchee. Les bords
           * sont adoucis plutot que francs — une coupe nette se lit comme
           * une video tronquee, un fondu comme une bande.
           *
           * `to bottom` estompe les deux extremites. L'helice remplit bien
           * toute la source, mesure faite image par image ; mais un brin qui
           * s'amincit pres d'un bord se lit comme un trou. Estompe, il se lit
           * comme une fin voulue.
           */
          ...(pleine
            ? {}
            : (() => {
                const b = (1 - PART) / 2
                const pct = (v: number) => `${(v * 100).toFixed(1)}%`
                const hauteur = `linear-gradient(to right, transparent 0, transparent ${pct(b - 0.03)}, #000 ${pct(b + 0.03)}, #000 ${pct(1 - b - 0.03)}, transparent ${pct(1 - b + 0.03)}, transparent 100%)`
                const bouts =
                  'linear-gradient(to bottom, transparent 0, #000 7%, #000 93%, transparent 100%)'
                const couches = `${hauteur}, ${bouts}`
                return {
                  WebkitMaskImage: couches,
                  maskImage: couches,
                  // Les deux couches se croisent : ne reste que ce que les
                  // deux gardent. Sans cela elles s'additionnent, et la
                  // coupe en hauteur ne coupe plus rien.
                  WebkitMaskComposite: 'source-in',
                  maskComposite: 'intersect',
                }
              })()),
          // Luminosite seule : le noir de la source vaut zero, voir la note
          // dans `anneau-video`. Un contraste n'eteindrait que l'helice.
          filter: 'brightness(2.6)',
        }}
      />
    </div>
  )
}
