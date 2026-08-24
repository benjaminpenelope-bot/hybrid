'use client'

import { useEffect, useState } from 'react'

/**
 * SONDE DE MISE EN PAGE — temporaire
 *
 * Affiche les mesures réelles de l'appareil, pour un défaut d'alignement qui
 * ne se reproduit sur aucune largeur testée en local. Déduire une largeur des
 * proportions d'une capture d'écran m'a déjà induit en erreur : ici, ce sont
 * les valeurs calculées par le navigateur lui-même.
 *
 * S'active avec `?debug=1` sur l'accueil. À retirer une fois la cause trouvée.
 */

interface Ligne {
  quoi: string
  valeur: string
}

export function DebugMiseEnPage() {
  const [lignes, setLignes] = useState<Ligne[]>([])

  useEffect(() => {
    const mesurer = () => {
      const doc = document.documentElement
      const main = document.querySelector('main')
      const out: Ligne[] = [
        { quoi: 'écran', valeur: `${screen.width}×${screen.height} @${devicePixelRatio}x` },
        { quoi: 'fenêtre', valeur: `${innerWidth}×${innerHeight}` },
        { quoi: 'client', valeur: `${doc.clientWidth}` },
        { quoi: 'scroll doc', valeur: `${doc.scrollWidth}` },
        { quoi: 'scroll body', valeur: `${document.body.scrollWidth}` },
        { quoi: 'visualViewport', valeur: visualViewport ? `${Math.round(visualViewport.width)} éch.${visualViewport.scale.toFixed(2)}` : '—' },
      ]

      if (main) {
        const r = main.getBoundingClientRect()
        const cs = getComputedStyle(main)
        out.push(
          { quoi: 'main x / largeur', valeur: `${Math.round(r.x)} / ${Math.round(r.width)}` },
          { quoi: 'main max-width', valeur: cs.maxWidth },
          { quoi: 'main padding', valeur: `${cs.paddingLeft} / ${cs.paddingRight}` },
        )

        const zone = main.clientWidth
        const trop = [...main.querySelectorAll('*')]
          .map((e) => ({ e, b: e.getBoundingClientRect() }))
          .filter(({ b }) => b.right > r.right + 1 || b.left < r.left - 1)
          .sort((a, b) => b.b.right - a.b.right)
          .slice(0, 4)

        out.push({ quoi: 'zone contenu', valeur: `${zone}` })
        out.push({ quoi: 'éléments hors cadre', valeur: `${trop.length}` })
        trop.forEach(({ e, b }, i) => {
          const nom = e.tagName.toLowerCase() + (e.className ? '.' + e.className.toString().split(' ')[0] : '')
          out.push({ quoi: `  ${i + 1}. ${nom}`.slice(0, 34), valeur: `${Math.round(b.left)}→${Math.round(b.right)}` })
        })
      }

      setLignes(out)
    }

    mesurer()
    addEventListener('resize', mesurer)
    return () => removeEventListener('resize', mesurer)
  }, [])

  return (
    <div className="mb-4 rounded-card border border-warn/50 bg-warn/10 p-3">
      <p className="eyebrow mb-2 text-warn">Sonde de mise en page</p>
      <dl className="flex flex-col gap-1">
        {lignes.map((l) => (
          <div key={l.quoi} className="flex items-baseline justify-between gap-3">
            <dt className="text-[11.5px] text-mut">{l.quoi}</dt>
            <dd className="num text-[12px] text-text">{l.valeur}</dd>
          </div>
        ))}
      </dl>
    </div>
  )
}
