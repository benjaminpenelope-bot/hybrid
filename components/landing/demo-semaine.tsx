'use client'

import { useEffect, useRef, useState } from 'react'
import { ApercuSemaine } from '@/components/apercu-semaine'
import type { GoalType } from '@/lib/engine/types'

/**
 * DÉMONSTRATION SUR LA PAGE D'ACCUEIL
 *
 * La page promettait « un seul programme, qui se réajuste » et n'en montrait
 * rien : quatre cartes en paraphrasaient le principe, et la place laissée
 * libre était occupée par le mot de la marque en filigrane. Un visiteur
 * repartait sans avoir vu une seule ligne du produit.
 *
 * Ces sept cellules sont le même composant que l'inscription, branché sur le
 * même générateur. Ce n'est donc pas une maquette : la semaine affichée ici
 * est celle que le programme construirait. Une divergence entre la vitrine et
 * le produit serait impossible à maintenir.
 *
 * Le carrousel avance seul jusqu'au premier geste, puis s'arrête
 * définitivement. Une animation qui continue de bouger pendant qu'on lit
 * dispute l'attention au lieu de la retenir.
 */

const DEMOS: { objectif: GoalType; onglet: string; legende: string }[] = [
  {
    objectif: 'marathon',
    onglet: 'Marathon',
    legende: 'Trois courses, dont une sortie longue, et une seule séance de force : elle sert la foulée, elle ne la concurrence pas.',
  },
  {
    objectif: 'hyrox',
    onglet: 'HYROX',
    legende: 'Course et force en alternance serrée, parce que la compétition demande les deux dans la même heure.',
  },
  {
    objectif: 'force',
    onglet: 'Force',
    legende: 'Le haut et le bas du corps alternent, et la course passe en entretien : elle ne doit pas manger la récupération.',
  },
  {
    objectif: 'hybride',
    onglet: 'Hybride',
    legende: 'Aucune discipline ne domine. C’est l’équilibre le plus difficile à tenir seul, et c’est celui que le générateur arbitre.',
  },
]

/** Durée d'un objectif à l'écran, tant que personne n'a touché aux onglets. */
const DEFILEMENT_MS = 3600

export function DemoSemaine() {
  const [i, setI] = useState(0)
  const [auto, setAuto] = useState(true)
  /*
   * `auto` seul ne suffit pas : l'effet capture sa valeur au montage, et il
   * faut aussi que l'intervalle en cours cesse immédiatement au clic, sans
   * attendre la fin du cycle.
   */
  const arrete = useRef(false)

  useEffect(() => {
    if (!auto) return
    const id = setInterval(() => {
      if (arrete.current) return
      setI((n) => (n + 1) % DEMOS.length)
    }, DEFILEMENT_MS)
    return () => clearInterval(id)
  }, [auto])

  const choisir = (n: number) => {
    arrete.current = true
    setAuto(false)
    setI(n)
  }

  const demo = DEMOS[i]!

  return (
    <div className="glass mx-auto w-full max-w-[560px] rounded-[26px] p-5 sm:p-6">
      {/* Les onglets débordent plutôt que de se replier sur deux lignes : la
          hauteur du bloc ne doit pas changer quand on en choisit un. */}
      <div className="-mx-5 mb-5 overflow-x-auto px-5 sm:-mx-6 sm:px-6 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        <div className="flex w-max gap-2">
          {DEMOS.map((d, n) => (
            <button
              key={d.objectif}
              type="button"
              onClick={() => choisir(n)}
              aria-pressed={n === i}
              className={`shrink-0 select-none rounded-full px-3.5 py-2 text-[13px] font-semibold tracking-[-0.01em] transition-[background-color,color,box-shadow] duration-300 ${
                n === i
                  ? 'bg-[rgb(255_255_255/0.13)] text-text shadow-[inset_0_1px_0_rgb(255_255_255/0.2)]'
                  : 'bg-[rgb(255_255_255/0.04)] text-mut'
              }`}
            >
              {d.onglet}
            </button>
          ))}
        </div>
      </div>

      <ApercuSemaine objectif={demo.objectif} />

      {/*
        La légende est reliée à l'objectif affiché par sa `key` : elle est
        remontée à chaque changement, donc rejouée. Sans cela, le texte
        changeait sèchement au milieu d'une semaine qui, elle, se recompose.
      */}
      <p key={demo.objectif} className="entre mt-4 text-[12.5px] leading-6 text-mut">
        {demo.legende}
      </p>
    </div>
  )
}
