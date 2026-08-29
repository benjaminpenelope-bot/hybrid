'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import type { Route } from 'next'
import { LogoMark } from '@/components/logo'

const TABS = [
  { href: '/aujourdhui', icon: '🏠', label: 'Accueil' },
  { href: '/semaine', icon: '🗓', label: 'Semaine' },
  { href: '/perfs', icon: '📈', label: 'Perfs' },
  { href: '/corps', icon: '🧍', label: 'Corps' },
  { href: '/coach', icon: '💬', label: 'Coach' },
] as const

/**
 * Sur grand écran la barre latérale a la place d'afficher aussi les écrans
 * secondaires, qui sur mobile passent par les raccourcis de l'accueil.
 */
const SECONDAIRES = [
  { href: '/objectifs', icon: '🎯', label: 'Objectifs' },
  { href: '/recuperation', icon: '🌙', label: 'Récupération' },
  { href: '/bilan', icon: '📋', label: 'Bilan' },
  { href: '/reglages', icon: '⚙️', label: 'Réglages' },
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
      <nav
        className="fixed inset-x-0 bottom-0 z-50 border-t border-line bg-bg/[0.93] backdrop-blur-xl lg:hidden"
        style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}
        aria-label="Navigation principale"
      >
        <div className="mx-auto flex w-full max-w-app px-1 py-2">
          {TABS.map((tab) => {
            const active = isActive(pathname, tab.href)
            return (
              <Link
                key={tab.href}
                href={tab.href as Route}
                aria-current={active ? 'page' : undefined}
                /*
                 * `min-h` explicite : la règle des 44 px de globals.css vise
                 * les boutons, pas un lien nu. `touch-manipulation` retire le
                 * délai que Safari garde pour guetter un double appui.
                 */
                className={`flex min-h-[48px] flex-1 touch-manipulation flex-col items-center justify-center gap-1 py-1.5 font-display text-[10px] font-semibold uppercase tracking-[0.09em] transition-colors active:opacity-60 ${
                  active ? 'text-text' : 'text-dim'
                }`}
              >
                <span
                  className={`text-[17px] leading-none transition-[filter] ${
                    active ? '' : 'grayscale opacity-60'
                  }`}
                  aria-hidden
                >
                  {tab.icon}
                </span>
                {tab.label}
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
            <div className="dsp text-[20px] tracking-[0.04em]">POLYTRAIN</div>
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
  icon,
  label,
  active,
}: {
  href: string
  icon: string
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
      <span className={`text-[15px] leading-none ${active ? '' : 'grayscale opacity-70'}`} aria-hidden>
        {icon}
      </span>
      {label}
    </Link>
  )
}

/** Réserve la place de la barre latérale, et seulement quand elle est là. */
export function NavOffset({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  return <div className={sansOnglets(pathname) ? undefined : 'lg:pl-[220px]'}>{children}</div>
}
