'use client'

import { useEffect, useRef, useState } from 'react'
import { IconFermer, IconMicro, IconOndes, IconPlus } from '@/components/ui/icons'

/**
 * BARRE DU COACH
 *
 * Une question s'écrit, s'attarde, s'efface, la suivante arrive. C'est la
 * démonstration la plus courte de ce qu'on peut demander au coach — plus
 * courte qu'une capture de conversation, et sans avoir à en inventer les
 * réponses.
 *
 * Les questions ne sont pas écrites pour la vitrine : ce sont celles que
 * `quickPrompts` propose réellement dans l'application, recopiées ici parce
 * qu'elles y sont calculées à partir de l'état d'un athlète, qu'un visiteur
 * n'a pas.
 */
const QUESTIONS = [
  'Je n’ai que 30 minutes',
  'J’ai encore mal, je fais quoi ?',
  'Ma charge monte trop vite ?',
  'Comment je teste mes tractions ?',
] as const

/** Millisecondes par caractère, à la frappe puis à l'effacement. */
const FRAPPE = 52
const EFFACE = 26
/** Temps de lecture, une fois la question entière. */
const PAUSE = 1900

export function BarreCoach() {
  const [texte, setTexte] = useState('')
  const [fige, setFige] = useState(false)

  /*
   * Une seule minuterie vivante à la fois, et son identifiant conservé pour
   * l'annuler au démontage : sans cela, un changement de page laisse la
   * chaîne se poursuivre et écrire dans un composant qui n'existe plus.
   */
  const minuterie = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setTexte(QUESTIONS[0])
      setFige(true)
      return
    }

    let q = 0
    let i = 0
    let efface = false

    const pas = () => {
      const question = QUESTIONS[q]!
      if (!efface) {
        i += 1
        setTexte(question.slice(0, i))
        if (i >= question.length) {
          efface = true
          minuterie.current = setTimeout(pas, PAUSE)
          return
        }
        minuterie.current = setTimeout(pas, FRAPPE)
        return
      }
      i -= 1
      setTexte(question.slice(0, i))
      if (i <= 0) {
        efface = false
        q = (q + 1) % QUESTIONS.length
        minuterie.current = setTimeout(pas, 380)
        return
      }
      minuterie.current = setTimeout(pas, EFFACE)
    }

    minuterie.current = setTimeout(pas, 700)
    return () => {
      if (minuterie.current) clearTimeout(minuterie.current)
    }
  }, [])

  return (
    <div className="flex items-center justify-center gap-2.5 sm:gap-3">
      {/*
        La barre. `lisere` lui donne le filet argenté qui tourne, comme la
        carte d'inscription : c'est la même invitation à commencer.
      */}
      <div className="lisere glass flex min-w-0 flex-1 items-center gap-3 rounded-full py-3 pl-4 pr-3.5 sm:max-w-[440px] sm:gap-4 sm:py-3.5 sm:pl-5">
        <span className="shrink-0 text-mut" aria-hidden>
          <IconPlus size={19} />
        </span>

        {/*
          `aria-live` annonce chaque question aux lecteurs d'écran, mais la
          zone est décorative : on la marque donc poliment, sans interrompre.
        */}
        <p
          className="min-w-0 flex-1 truncate text-left text-[13px] leading-none text-mut sm:text-[14.5px]"
          aria-live="polite"
        >
          {texte || ' '}
          {!fige && <span className="curseur" aria-hidden />}
        </p>

        {/* Les deux pictogrammes disparaissent sous 640 px : ils y prenaient
            la moitie de la place du texte, et la question s'y coupait avant
            d'etre lisible. */}
        <span className="hidden shrink-0 items-center gap-3 text-dim sm:flex" aria-hidden>
          <IconMicro size={18} />
          <IconOndes size={18} />
        </span>
      </div>

      {/* Le bouton de fermeture de la maquette : présent pour la forme de
          l'ensemble, et explicitement inerte. */}
      <span
        className="glass flex h-[46px] w-[46px] shrink-0 items-center justify-center rounded-full text-dim sm:h-[50px] sm:w-[50px]"
        aria-hidden
      >
        <IconFermer size={17} />
      </span>
    </div>
  )
}
