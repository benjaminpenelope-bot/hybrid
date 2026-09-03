'use client'

import { useEffect, useRef } from 'react'

/**
 * SPHÈRE DE PARTICULES
 *
 * Des points répartis sur une sphère, en rotation lente. Le dégradé radial
 * qui la précédait avait le défaut d'être plat : une sphère se lit à sa
 * profondeur, et la profondeur vient d'objets qui passent devant et derrière.
 *
 * Trois choix qui font l'essentiel du rendu :
 *
 * 1. **Répartition en spirale de Fibonacci.** Semer les points au hasard
 *    laisse des grappes et des trous ; les répartir en latitude et longitude
 *    régulières les entasse aux pôles. La spirale donne un semis d'apparence
 *    uniforme, qui est ce que l'œil attend d'une surface.
 *
 * 2. **La profondeur pilote la taille, l'opacité et le flou.** Un point du
 *    fond est petit, pâle et diffus ; un point de face est net. Sans ça les
 *    deux hémisphères se superposent en un disque illisible.
 *
 * 3. **Dessin en `lighter`.** Les points s'additionnent au lieu de se
 *    recouvrir, ce qui produit le halo là où ils se concentrent — au bord de
 *    la sphère, où la surface est vue de profil. C'est ce liseré qui donne
 *    l'impression d'une lumière.
 *
 * Argent et non bleu : le bleu de la référence appartient à une autre marque.
 * La teinte suit le chrome du logo, avec un souffle de prisme sur le bord.
 */
export function SphereParticules({ taille = 260 }: { taille?: number }) {
  const canvas = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const c = canvas.current
    if (!c) return
    const ctx = c.getContext('2d')
    if (!ctx) return

    // Rendu à la densité réelle de l'écran, sinon les points bavent.
    const dpr = Math.min(window.devicePixelRatio || 1, 2)
    c.width = taille * dpr
    c.height = taille * dpr
    ctx.scale(dpr, dpr)

    const N = 2400
    const R = taille * 0.36
    const or = (1 + Math.sqrt(5)) / 2

    /* Semis de Fibonacci : chaque point avance d'un tour d'or en longitude. */
    const points = Array.from({ length: N }, (_, i) => {
      const y = 1 - (i / (N - 1)) * 2
      const rayon = Math.sqrt(Math.max(0, 1 - y * y))
      const theta = (2 * Math.PI * i) / or
      return { x: Math.cos(theta) * rayon, y, z: Math.sin(theta) * rayon }
    })

    const reduit = window.matchMedia('(prefers-reduced-motion: reduce)').matches
    let angle = 0
    let brut = 0

    const dessiner = () => {
      ctx.clearRect(0, 0, taille, taille)
      ctx.globalCompositeOperation = 'lighter'

      const cos = Math.cos(angle)
      const sin = Math.sin(angle)
      const cx = taille / 2
      const cy = taille / 2

      for (const p of points) {
        // Rotation autour de l'axe vertical, puis legere inclinaison.
        const x = p.x * cos - p.z * sin
        const z = p.x * sin + p.z * cos
        const y = p.y * 0.94 + z * 0.12

        // `z` va de -1 (fond) a 1 (face) : toute la profondeur en decoule.
        const t = (z + 1) / 2
        // Distance au centre une fois projete : 0 au milieu, 1 sur le contour.
        const bord = Math.min(1, Math.sqrt(x * x + y * y))

        /*
         * Le liseré. Sur une sphere de particules, le bord parait plus
         * lumineux que le centre : la ligne de vue y traverse davantage
         * d'epaisseur de coque, donc davantage de points s'y superposent.
         * Le rendu ne simule pas cette epaisseur — on la restitue en
         * remontant l'opacite vers le contour. Sans elle, la sphere reste un
         * disque grisatre uniforme.
         */
        const liseré = 1 + Math.pow(bord, 4) * 3.4
        const taillePoint = 0.4 + t * 1.2
        const opacite = Math.min(0.95, (0.05 + t * t * 0.38) * liseré)

        // Un souffle de prisme la ou la surface est vue de profil.
        const teinte = 208 + bord * 46

        ctx.fillStyle = `hsl(${teinte} ${bord * 26}% ${74 + t * 24}% / ${opacite})`
        ctx.beginPath()
        ctx.arc(cx + x * R, cy + y * R, taillePoint, 0, Math.PI * 2)
        ctx.fill()
      }

      ctx.globalCompositeOperation = 'source-over'
    }

    const boucle = () => {
      angle += 0.0016
      dessiner()
      brut = requestAnimationFrame(boucle)
    }

    if (reduit) dessiner()
    else brut = requestAnimationFrame(boucle)

    return () => cancelAnimationFrame(brut)
  }, [taille])

  return (
    <div
      className="relative"
      style={{ width: taille, height: taille }}
      aria-hidden
    >
      {/* Le halo est peint dessous : le canvas ne sait produire que des
          points, pas la lueur diffuse qui les entoure. */}
      <div
        className="absolute inset-0 rounded-full"
        style={{
          background:
            'radial-gradient(circle, rgb(190 205 235 / 0.16), transparent 62%)',
          filter: 'blur(14px)',
        }}
      />
      <canvas
        ref={canvas}
        width={taille}
        height={taille}
        style={{ width: taille, height: taille }}
        className="relative"
      />
    </div>
  )
}
