'use client'

import Link from 'next/link'
import type { Route } from 'next'
import { useEffect, useRef, useState } from 'react'
import { IconReglages } from '@/components/ui/icons'

/**
 * MENU PROFIL
 *
 * En haut à droite de l'accueil : le nom, les réglages, la déconnexion.
 *
 * Les réglages vivaient jusqu'ici dans une rangée de raccourcis, au milieu
 * d'écrans d'entraînement — Objectifs, Récupération, Bilan — auxquels ils
 * n'ont rien à voir. Et la déconnexion trainait seule tout en bas de la page,
 * après les graphiques. Les deux sont des affaires de compte, pas
 * d'entraînement : elles se rangent là où l'on cherche son compte.
 */
/*
 * Rien que des affaires de compte. « Mes objectifs » y figurait, en double
 * avec le raccourci de l'accueil : un meme ecran a deux endroits fait douter
 * qu'il s'agisse du meme.
 */
const LIENS: { href: Route; label: string; Icon: (p: { size?: number }) => React.ReactElement }[] = [
  { href: '/reglages' as Route, label: 'Réglages', Icon: IconReglages },
]

export function MenuProfil({ nom }: { nom: string }) {
  const [ouvert, setOuvert] = useState(false)
  const bloc = useRef<HTMLDivElement | null>(null)

  /*
   * Fermeture au clic hors du menu et a la touche Echap. Sans elle, le
   * panneau reste ouvert derriere le doigt qui vient de toucher autre chose,
   * et il faut revenir sur le bouton pour s'en debarrasser.
   */
  useEffect(() => {
    if (!ouvert) return
    const dehors = (e: MouseEvent) => {
      if (bloc.current && !bloc.current.contains(e.target as Node)) setOuvert(false)
    }
    const echap = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOuvert(false)
    }
    document.addEventListener('mousedown', dehors)
    document.addEventListener('keydown', echap)
    return () => {
      document.removeEventListener('mousedown', dehors)
      document.removeEventListener('keydown', echap)
    }
  }, [ouvert])

  const initiale = nom.trim().charAt(0).toUpperCase() || '?'

  return (
    <div ref={bloc} className="relative">
      <button
        type="button"
        onClick={() => setOuvert((o) => !o)}
        aria-expanded={ouvert}
        aria-haspopup="menu"
        aria-label={`Compte de ${nom}`}
        className="glass flex h-[38px] w-[38px] select-none items-center justify-center rounded-full font-display text-[15px] font-semibold tracking-[-0.01em] transition-[background-color] duration-200 active:scale-[0.96]"
      >
        {initiale}
      </button>

      {ouvert && (
        <div
          role="menu"
          className="entre glass absolute right-0 top-[46px] z-30 w-[204px] overflow-hidden rounded-[16px] p-1.5"
        >
          <p className="px-2.5 pb-1.5 pt-1 text-[11.5px] text-dim">{nom}</p>

          {LIENS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              role="menuitem"
              onClick={() => setOuvert(false)}
              className="flex items-center gap-2.5 rounded-[11px] px-2.5 py-2.5 text-[13.5px] text-text active:bg-[rgb(255_255_255/0.06)]"
            >
              <span className="text-mut" aria-hidden>
                <l.Icon size={16} />
              </span>
              {l.label}
            </Link>
          ))}

          <div className="my-1 h-px bg-line2" />

          <form action="/auth/signout" method="post">
            <button
              type="submit"
              role="menuitem"
              className="w-full rounded-[11px] px-2.5 py-2.5 text-left text-[13.5px] text-mut active:bg-[rgb(255_255_255/0.06)]"
            >
              Déconnexion
            </button>
          </form>
        </div>
      )}
    </div>
  )
}
