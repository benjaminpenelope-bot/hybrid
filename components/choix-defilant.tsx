'use client'

import { useEffect, useRef } from 'react'

/**
 * CHOIX PAR DÉFILEMENT
 *
 * Une rangée de cartes qui défile ; celle du centre est celle qu'on choisit.
 *
 * Neuf cartes empilées faisaient une liste plus haute que l'écran : on tapait
 * la sixième sans plus voir l'aperçu qu'elle était censée transformer, donc
 * sans voir l'effet de son choix. Le défilement remet les deux dans le même
 * regard, et permet de balayer les options en regardant la semaine se
 * recomposer — ce qu'aucune liste ne permet.
 *
 * Le calage est laissé à `scroll-snap` : le navigateur choisit lui-même la
 * carte la plus proche du centre, avec l'inertie du système. Le code se
 * contente de lire laquelle a gagné, une fois le défilement arrêté.
 */
export function ChoixDefilant<T extends string>({
  valeurs,
  valeur,
  onChange,
  children,
}: {
  valeurs: readonly T[]
  valeur: T | null
  onChange: (v: T) => void
  children: (v: T, actif: boolean) => React.ReactNode
}) {
  const piste = useRef<HTMLDivElement>(null)
  /*
   * Empeche la boucle : choisir replace la carte au centre, ce qui declenche
   * un defilement, qui rechoisirait. Le drapeau ignore le defilement que
   * l'on a soi-meme provoque.
   */
  const programme = useRef(false)
  /*
   * Le defilement ne vaut choix qu'apres un geste.
   *
   * Sans ce drapeau, la mise en page initiale suffit a declencher un
   * evenement de defilement, et la premiere carte se trouve choisie sans que
   * personne n'ait rien fait. L'application aurait donc decide de l'objectif
   * a la place de l'athlete — la meme faute que d'inventer une mesure.
   */
  const interagi = useRef(false)

  useEffect(() => {
    const el = piste.current
    if (!el) return

    let t: ReturnType<typeof setTimeout>
    const geste = () => {
      interagi.current = true
    }

    const auRepos = () => {
      if (!interagi.current) return
      if (programme.current) {
        programme.current = false
        return
      }
      const centre = el.scrollLeft + el.clientWidth / 2
      let plusProche = 0
      let ecartMin = Infinity
      Array.from(el.children).forEach((enfant, i) => {
        const e = enfant as HTMLElement
        const milieu = e.offsetLeft + e.offsetWidth / 2
        const ecart = Math.abs(milieu - centre)
        if (ecart < ecartMin) {
          ecartMin = ecart
          plusProche = i
        }
      })
      const v = valeurs[plusProche]
      if (v && v !== valeur) onChange(v)
    }

    const auDefilement = () => {
      clearTimeout(t)
      // 110 ms : assez pour laisser l'inertie finir, assez court pour que la
      // semaine se recompose pendant qu'on regarde encore la carte.
      t = setTimeout(auRepos, 110)
    }

    el.addEventListener('scroll', auDefilement, { passive: true })
    for (const e of ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const) {
      el.addEventListener(e, geste, { passive: true })
    }
    return () => {
      clearTimeout(t)
      el.removeEventListener('scroll', auDefilement)
      for (const e of ['pointerdown', 'touchstart', 'wheel', 'keydown'] as const) {
        el.removeEventListener(e, geste)
      }
    }
  }, [valeurs, valeur, onChange])

  /** Amène une carte au centre. Utilisé au clic et à l'ouverture. */
  const centrer = (i: number, doux = true) => {
    const el = piste.current
    if (!el) return
    const enfant = el.children[i] as HTMLElement | undefined
    if (!enfant) return
    programme.current = true
    el.scrollTo({
      left: enfant.offsetLeft + enfant.offsetWidth / 2 - el.clientWidth / 2,
      behavior: doux ? 'smooth' : 'auto',
    })
  }

  // À l'ouverture, on remet le choix déjà fait sous les yeux.
  useEffect(() => {
    if (valeur === null) return
    const i = valeurs.indexOf(valeur)
    if (i >= 0) centrer(i, false)
    // Volontairement une seule fois : ensuite c'est le defilement qui mene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div ref={piste} className="carrousel" role="radiogroup">
      {valeurs.map((v, i) => (
        <button
          key={v}
          type="button"
          role="radio"
          aria-checked={valeur === v}
          onClick={() => {
            interagi.current = true
            onChange(v)
            centrer(i)
          }}
        >
          {children(v, valeur === v)}
        </button>
      ))}
    </div>
  )
}
