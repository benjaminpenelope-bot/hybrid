'use client'

import { useId, useMemo, useRef, useState } from 'react'
import { formatDate } from '@/lib/engine/date'
import { fr } from '@/lib/ui/nombre'
import type { SemaineTrajectoire } from '@/lib/engine/trajectoire'

/**
 * LA COURBE
 *
 * Une seule ligne, du passé mesuré vers l'avenir prescrit, sans rupture.
 *
 * Le trait plein est ce qui a été couru, le trait pointillé ce que le plan
 * contient. La distinction n'est pas décorative : elle est la seule chose qui
 * empêche de lire une prévision comme un résultat, et elle doit rester
 * visible sans légende.
 *
 * Tracée à la main plutôt qu'avec la bibliothèque de graphiques : il fallait
 * deux traits de nature différente sur une même série, un repère
 * « aujourd'hui », les creux de décharge marqués, et un point d'arrivée mis
 * en valeur. Autant de choses qui se contournent dans une bibliothèque et
 * s'écrivent directement en SVG.
 */

const L = 320
const H = 132
const MARGE = { haut: 16, bas: 20, gauche: 4, droite: 4 }

export function CourbeTrajectoire({
  points,
  bascule,
}: {
  points: SemaineTrajectoire[]
  bascule: number
}) {
  const gid = useId().replace(/:/g, '')
  const svg = useRef<SVGSVGElement | null>(null)
  const [survol, setSurvol] = useState<number | null>(null)

  const geo = useMemo(() => {
    const max = Math.max(1, ...points.map((p) => p.km))
    const echelle = max * 1.15
    const larg = L - MARGE.gauche - MARGE.droite
    const haut = H - MARGE.haut - MARGE.bas
    const x = (i: number) =>
      MARGE.gauche + (points.length <= 1 ? larg / 2 : (i / (points.length - 1)) * larg)
    const y = (km: number) => MARGE.haut + haut - (km / echelle) * haut
    return { x, y, max, bas: MARGE.haut + haut }
  }, [points])

  if (points.length === 0) return null

  const d = (de: number, a: number): string =>
    points
      .slice(de, a)
      .map((p, k) => `${k === 0 ? 'M' : 'L'} ${geo.x(de + k).toFixed(1)} ${geo.y(p.km).toFixed(1)}`)
      .join(' ')

  /*
   * Le passe et l'avenir partagent un point : celui de la bascule. Sans ce
   * recouvrement, les deux traits se toucheraient sans se joindre, et un
   * blanc d'un pixel apparaitrait pile a l'endroit qui compte le plus.
   */
  const passe = bascule > 0 ? d(0, bascule + 1) : ''
  const futur = d(Math.max(0, bascule - (bascule > 0 ? 0 : 0)), points.length)

  const aire =
    bascule > 0
      ? `${passe} L ${geo.x(bascule).toFixed(1)} ${geo.bas} L ${geo.x(0).toFixed(1)} ${geo.bas} Z`
      : ''

  const dernier = points.length - 1
  const actif = survol ?? dernier
  const p = points[actif]!

  const viser = (clientX: number) => {
    const el = svg.current
    if (!el) return
    const r = el.getBoundingClientRect()
    const rel = ((clientX - r.left) / r.width) * L
    let proche = 0
    let ecart = Infinity
    for (let i = 0; i < points.length; i++) {
      const e = Math.abs(geo.x(i) - rel)
      if (e < ecart) {
        ecart = e
        proche = i
      }
    }
    setSurvol(proche)
  }

  return (
    <div>
      {/*
        La valeur survolee vit au-dessus du graphique et non dans une bulle
        flottante : une bulle qui suit le doigt est cachee par le doigt.
      */}
      <div className="mb-2 flex items-baseline justify-between gap-3">
        <div className="min-w-0">
          <span className="num text-[30px] leading-none">{fr(p.km)}</span>
          <span className="ml-1.5 text-[12.5px] text-mut">km cette semaine-là</span>
        </div>
        <span className="shrink-0 text-right text-[11.5px] leading-tight text-dim">
          {formatDate(p.lundi)}
          <br />
          <span className={p.reel ? 'text-mut' : ''}>
            {p.reel ? 'couru' : p.decharge ? 'décharge prévue' : 'prévu'}
          </span>
        </span>
      </div>

      <svg
        ref={svg}
        viewBox={`0 0 ${L} ${H}`}
        className="w-full touch-none"
        style={{ height: 132 }}
        role="img"
        aria-label={`Volume de course par semaine, de ${formatDate(points[0]!.lundi)} à ${formatDate(points[dernier]!.lundi)}. ${bascule} semaines mesurées puis ${points.length - bascule} semaines prévues, jusqu'à ${fr(points[dernier]!.km)} km.`}
        onPointerDown={(e) => viser(e.clientX)}
        onPointerMove={(e) => e.buttons > 0 && viser(e.clientX)}
        onPointerLeave={() => setSurvol(null)}
      >
        <defs>
          <linearGradient id={`aire-${gid}`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="var(--run)" stopOpacity="0.28" />
            <stop offset="100%" stopColor="var(--run)" stopOpacity="0" />
          </linearGradient>
          {/* L'argent de la marque pour ce qui n'a pas encore eu lieu. */}
          <linearGradient id={`futur-${gid}`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="var(--run)" />
            <stop offset="55%" stopColor="var(--brand)" />
            <stop offset="100%" stopColor="var(--brand)" />
          </linearGradient>
        </defs>

        {aire && <path d={aire} fill={`url(#aire-${gid})`} />}

        {/* Le repere d'aujourd'hui, entre les deux moities. */}
        {bascule > 0 && bascule < points.length && (
          <line
            x1={geo.x(bascule)}
            x2={geo.x(bascule)}
            y1={MARGE.haut - 8}
            y2={geo.bas}
            stroke="var(--line2)"
            strokeWidth="1"
            strokeDasharray="2 3"
          />
        )}

        {passe && (
          <path d={passe} fill="none" stroke="var(--run)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" />
        )}
        <path
          d={futur}
          fill="none"
          stroke={`url(#futur-${gid})`}
          strokeWidth="2.2"
          strokeLinecap="round"
          strokeLinejoin="round"
          strokeDasharray="5 4"
        />

        {/* Les creux voulus. Un cercle vide plutot qu'un plein : c'est un
            repere de lecture, pas une valeur de plus. */}
        {points.map((pt, i) =>
          pt.decharge ? (
            <circle
              key={pt.lundi}
              cx={geo.x(i)}
              cy={geo.y(pt.km)}
              r="2.6"
              fill="var(--bg)"
              stroke="var(--line2)"
              strokeWidth="1.2"
            />
          ) : null,
        )}

        {/* L'arrivee. C'est le point de l'ecran, il est le seul a briller. */}
        <circle cx={geo.x(dernier)} cy={geo.y(points[dernier]!.km)} r="7" fill="var(--brand)" opacity="0.16" />
        <circle cx={geo.x(dernier)} cy={geo.y(points[dernier]!.km)} r="3.4" fill="var(--brand)" />

        {survol !== null && (
          <>
            <line
              x1={geo.x(survol)}
              x2={geo.x(survol)}
              y1={MARGE.haut - 8}
              y2={geo.bas}
              stroke="var(--mut)"
              strokeWidth="1"
            />
            <circle cx={geo.x(survol)} cy={geo.y(points[survol]!.km)} r="3.6" fill="var(--text)" />
          </>
        )}
      </svg>

      <div className="mt-1 flex items-center justify-between text-[10.5px] text-dim">
        <span>{formatDate(points[0]!.lundi)}</span>
        {bascule > 0 && bascule < points.length && <span>aujourd&rsquo;hui</span>}
        <span>{formatDate(points[dernier]!.lundi)}</span>
      </div>
    </div>
  )
}
