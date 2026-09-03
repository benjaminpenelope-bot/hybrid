'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Route } from 'next'
import { LogoMark } from '@/components/logo'
import {
  IconAccueil,
  IconBilan,
  IconCoach,
  IconCorps,
  IconObjectifs,
  IconPerfs,
  IconRecuperation,
  IconReglages,
  IconSemaine,
} from '@/components/ui/icons'

const TABS = [
  { href: '/aujourdhui', Icon: IconAccueil, label: 'Accueil' },
  { href: '/semaine', Icon: IconSemaine, label: 'Semaine' },
  { href: '/perfs', Icon: IconPerfs, label: 'Perfs' },
  { href: '/corps', Icon: IconCorps, label: 'Corps' },
  { href: '/coach', Icon: IconCoach, label: 'Coach' },
] as const

/**
 * Sur grand écran la barre latérale a la place d'afficher aussi les écrans
 * secondaires, qui sur mobile passent par les raccourcis de l'accueil.
 */
const SECONDAIRES = [
  { href: '/objectifs', Icon: IconObjectifs, label: 'Objectifs' },
  { href: '/recuperation', Icon: IconRecuperation, label: 'Récupération' },
  { href: '/bilan', Icon: IconBilan, label: 'Bilan' },
  { href: '/reglages', Icon: IconReglages, label: 'Réglages' },
] as const

/** Écrans plein cadre : connexion, onboarding, séance en cours. */
const SANS_ONGLETS = ['/', '/login', '/auth', '/onboarding', '/seance']

export function sansOnglets(pathname: string): boolean {
  return SANS_ONGLETS.some((r) => pathname === r || pathname.startsWith(`${r}/`))
}

function isActive(pathname: string, href: string): boolean {
  return href === '/' ? pathname === '/' : pathname.startsWith(href)
}

/**
 * Onglets en bas sur mobile, colonne à gauche sur laptop. Les deux rendus
 * partagent la même liste : aucun écran n'est joignable d'un côté seulement.
 */
export function TabBar() {
  const pathname = usePathname()
  if (sansOnglets(pathname)) return null

  return (
    <>
      {/*
        Barre flottante en pilule, et non collee au bord.
        
        Detachee du bas, elle laisse voir le contenu defiler dessous : c'est
        ce passage d'image derriere le verre qui le fait lire comme du verre.
        Une barre collee au bord n'a plus rien derriere elle, et son flou ne
        capte que du noir.

        L'element actif porte une capsule plus claire et son libelle ; les
        autres n'ont que leur glyphe. La barre reste ainsi lisible sans
        etiqueter cinq fois, et le libelle apparait la ou on le cherche.
      */}
      <nav
        className="fixed inset-x-0 bottom-0 z-50 flex justify-center px-4 lg:hidden"
        style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 12px)' }}
        aria-label="Navigation principale"
      >
        <div className="glass flex items-center gap-0.5 rounded-full p-1.5">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href as Route}
                aria-label={tab.label}
                aria-current={active ? 'page' : undefined}
                /*
                 * `touch-manipulation` retire le delai que Safari garde pour
                 * guetter un double appui. La hauteur de 44 px est tenue par
                 * la combinaison du glyphe et du rembourrage.
                 */
                className={`flex min-h-[44px] touch-manipulation items-center gap-2 rounded-full transition-[background-color,color,padding] duration-200 active:scale-[0.96] ${
                  active
                    ? 'bg-[rgb(255_255_255/0.11)] px-3.5 text-text shadow-[inset_0_1px_0_rgb(255_255_255/0.16)]'
                    : 'px-3 text-dim'
                }`}
              >
                <tab.Icon size={21} />
                {active && (
                  <span className="text-[13px] font-semibold tracking-[-0.01em]">{tab.label}</span>
                )}
              </Link>
            )
          })}
        </div>
      </nav>

      <nav
        className="fixed inset-y-0 left-0 z-50 hidden w-[220px] flex-col gap-1 border-r border-line bg-bg2 px-3 py-6 lg:flex"
        aria-label="Navigation principale"
      >
        <div className="flex items-center gap-2.5 px-2 pb-5">
          <LogoMark size={30} />
          <div>
            <div className="dsp text-[20px] tracking-[0.04em]">HYBRID</div>
            <div className="eyebrow mt-0.5">Course · Nage · Barre</div>
          </div>
        </div>

        {TABS.map((tab) => (
          <SideLink key={tab.href} {...tab} active={isActive(pathname, tab.href)} />
        ))}

        <div className="eyebrow mt-6 px-2 pb-1">Suivi</div>
        {SECONDAIRES.map((tab) => (
          <SideLink key={tab.href} {...tab} active={isActive(pathname, tab.href)} />
        ))}
      </nav>
    </>
  )
}

function SideLink({
  href,
  Icon,
  label,
  active,
}: {
  href: string
  Icon: (p: { size?: number }) => React.ReactElement
  label: string
  active: boolean
}) {
  return (
    <Link
      href={href as Route}
      aria-current={active ? 'page' : undefined}
      className={`flex min-h-[44px] touch-manipulation items-center gap-3 rounded-[10px] px-3 py-2 text-[13px] font-medium transition-colors active:opacity-60 ${
        active ? 'bg-cardHi text-text' : 'text-mut hover:bg-card hover:text-text'
      }`}
      style={active ? { boxShadow: 'inset 2px 0 0 var(--brand)' } : undefined}
    >
      <Icon size={18} />
      {label}
    </Link>
  )
}

/** Réserve la place de la barre latérale, et seulement quand elle est là. */
export function NavOffset({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return <div className={sansOnglets(pathname) ? undefined : 'lg:pl-[220px]'}>{children}</div>
}
