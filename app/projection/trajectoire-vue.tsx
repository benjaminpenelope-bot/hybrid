'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CourbeTrajectoire } from '@/components/courbe-trajectoire'
import { formatDate } from '@/lib/engine/date'
import { fr, frMille } from '@/lib/ui/nombre'
import { surHorizon, type Trajectoire } from '@/lib/engine/trajectoire'
import type { Jalon } from '@/lib/engine/projection'

/**
 * TA TRAJECTOIRE
 *
 * L'écran répondait à « où ça mène » par une liste de six lignes
 * « départ → arrivée ». C'était exact, et ça ne donnait envie de rien : un
 * tableau ne se regarde pas deux fois, et personne ne s'accroche à un plan
 * parce qu'il en a lu le tableau.
 *
 * Ce qui accroche, c'est de voir sa propre pente. D'où une seule courbe qui
 * joint les semaines déjà courues à celles que le plan contient, un horizon
 * qu'on fait glisser du mois à l'année, et des paliers datés — la seule
 * chose de l'application qui donne un rendez-vous.
 *
 * Toute la découpe se fait ici, sans aller-retour : le volume d'une semaine
 * ne dépend pas de l'horizon d'où on la regarde. Voir `surHorizon`.
 */

const HORIZONS = [
  { semaines: 4, label: '1 mois' },
  { semaines: 12, label: '3 mois' },
  { semaines: 26, label: '6 mois' },
  { semaines: 52, label: '1 an' },
] as const

export function TrajectoireVue({
  complete,
  jalons,
}: {
  complete: Trajectoire
  /** Un jeu de jalons par horizon : ils doivent suivre le curseur. */
  jalons: Record<number, Jalon[]>
}) {
  const [horizon, setHorizon] = useState<number>(12)
  const t = useMemo(() => surHorizon(complete, horizon), [complete, horizon])
  const autres = jalons[horizon] ?? []

  /*
   * La comparaison se fait sur ce qui est reellement couru, pas sur la
   * semaine en cours : une semaine sur quatre est une decharge, et le point
   * de depart tombait alors dans un creux voulu. L'ecart annonce doublait.
   */
  const reference = t.reelHebdo
  const progression =
    reference !== null && reference > 0
      ? Math.round(((t.arrivee - reference) / reference) * 100)
      : null

  return (
    <>
      {/* ── La courbe ── */}
      <section className="lisere glass rounded-card p-5">
        <div className="mb-4">
          <p className="eyebrow">Volume de course</p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-mut">
            À gauche ce que tu as couru, à droite ce que le plan contient.
            {t.ancree
              ? ' La suite est calculée sur tes quatre dernières semaines.'
              : ' La suite part encore de ce que tu as déclaré : trois sorties enregistrées suffiront à la mesurer.'}
          </p>
        </div>

        <CourbeTrajectoire points={t.points} bascule={t.bascule} />

        {/* Un seul geste sur cet ecran : choisir jusqu'ou regarder. */}
        <div className="mt-4 flex gap-1.5">
          {HORIZONS.map((h) => (
            <button
              key={h.semaines}
              type="button"
              aria-pressed={horizon === h.semaines}
              onClick={() => setHorizon(h.semaines)}
              className={`min-h-[38px] flex-1 select-none rounded-full text-[12.5px] font-semibold tracking-[-0.01em] transition-[background-color,color,box-shadow] duration-200 active:scale-[0.97] ${
                horizon === h.semaines
                  ? 'bg-[rgb(255_255_255/0.12)] text-text shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]'
                  : 'bg-[rgb(255_255_255/0.04)] text-mut'
              }`}
            >
              {h.label}
            </button>
          ))}
        </div>
      </section>

      {/* ── Ce que ça représente ── */}
      <section className="mt-3 grid grid-cols-2 gap-2">
        <div className="card">
          <p className="eyebrow">Semaine d&rsquo;arrivée</p>
          <p className="num mt-1.5 text-[26px] leading-none">{fr(t.arrivee)}</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
            km, la semaine du {formatDate(t.quand)}
          </p>
          {progression !== null && progression > 0 && (
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-mut">
              <span className="text-ok">+{progression} %</span> sur tes {fr(reference as number)} km
              hebdomadaires actuels
            </p>
          )}
        </div>
        <div className="card">
          <p className="eyebrow">D&rsquo;ici là</p>
          <p className="num mt-1.5 text-[26px] leading-none">{t.kmAVenir}</p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
            kilomètres à courir, répartis sur {t.points.length - t.bascule} semaines
          </p>
        </div>
      </section>

      {/* ── Les paliers ── */}
      <section className="mt-6">
        <h2 className="eyebrow mb-1">Tes rendez-vous</h2>
        <p className="mb-3 text-[12px] leading-5 text-dim">
          La semaine où ta sortie longue atteint chaque distance. Ce ne sont pas des prédictions :
          ces séances sont déjà écrites dans ton programme.
        </p>

        {t.paliers.length > 0 ? (
          <ol className="card flex flex-col gap-0 py-0">
            {t.paliers.map((p, i) => (
              <li
                key={p.km}
                className={`flex items-center gap-3.5 py-3.5 ${i > 0 ? 'border-t border-line' : ''}`}
              >
                {/* Une pastille chiffree plutot qu'une puce : la distance est
                    le sujet de la ligne, elle n'a pas a etre relue plus bas. */}
                <span
                  className="num flex h-11 w-11 shrink-0 items-center justify-center rounded-full border text-[12.5px]"
                  style={{ borderColor: 'rgb(var(--run-c) / 0.4)', color: 'var(--run)' }}
                >
                  {frMille(p.km)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] leading-tight">
                    {p.nom ? `Ton ${p.nom}` : `${frMille(p.km)} km d’une traite`}
                  </span>
                  <span className="mt-0.5 block text-[11.5px] text-dim">
                    semaine {p.semaine} du plan
                  </span>
                </span>
                <span className="num shrink-0 text-right text-[12.5px] text-mut">
                  {formatDate(p.quand)}
                </span>
              </li>
            ))}
          </ol>
        ) : (
          <p className="card text-[12.5px] leading-relaxed text-mut">
            Aucun palier de distance n&rsquo;est franchi sur cet horizon. Regarde plus loin, ou
            construis d&rsquo;abord le volume : la sortie longue est plafonnée par ce que tu cours
            à la semaine, et c&rsquo;est ce plafond qui décide.
          </p>
        )}
      </section>

      {/* ── Le reste du plan ── */}
      {autres.length > 0 && (
        <section className="mt-6">
          <h2 className="eyebrow mb-1">Le reste du plan</h2>
          <p className="mb-3 text-[12px] leading-5 text-dim">
            Ce que le programme contient à la semaine {t.points[t.points.length - 1]!.semaine},
            discipline par discipline.
          </p>
          <div className="flex flex-col gap-2">
            {autres.map((j) => (
              <div key={j.quoi} className="card flex items-center justify-between gap-3 py-3">
                <span className="min-w-0 flex-1 truncate text-[13px]">{j.quoi}</span>
                <span className="num flex shrink-0 items-baseline gap-2 text-[13px]">
                  <span className="text-dim">{j.depart}</span>
                  <span className="text-dim" aria-hidden>
                    →
                  </span>
                  <span className="text-[15px] text-text">{j.arrivee}</span>
                </span>
              </div>
            ))}
          </div>
        </section>
      )}

      <p className="mt-6 text-[11.5px] leading-relaxed text-dim">
        Tout ce qui est à droite d&rsquo;aujourd&rsquo;hui est une lecture de ton programme, pas
        une prédiction : ces séances existent déjà, avec leur distance. Elles bougeront si tu
        changes d&rsquo;objectif, de jours disponibles, ou si ton volume réel s&rsquo;écarte de ce
        qui était prévu — c&rsquo;est le plan qui suit, pas l&rsquo;inverse.{' '}
        <Link href="/semaine" className="underline">
          Voir la semaine
        </Link>
        .
      </p>
    </>
  )
}
