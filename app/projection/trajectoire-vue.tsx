'use client'

import { useMemo, useState } from 'react'
import Link from 'next/link'
import { CourbeTrajectoire } from '@/components/courbe-trajectoire'
import { formatDate } from '@/lib/engine/date'
import { fr, frMille } from '@/lib/ui/nombre'
import { DISCIPLINES, surHorizon, type Discipline, type Trajectoire } from '@/lib/engine/trajectoire'
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
  completes,
  jalons,
}: {
  /** Une trajectoire par discipline praticable, calculée au plus long. */
  completes: Partial<Record<Discipline, Trajectoire>>
  /** Un jeu de jalons par horizon : ils doivent suivre le curseur. */
  jalons: Record<number, Jalon[]>
}) {
  const offertes = useMemo(
    () => (Object.keys(completes) as Discipline[]).filter((d) => completes[d] !== undefined),
    [completes],
  )
  const [discipline, setDiscipline] = useState<Discipline>(offertes[0] ?? 'course')
  const [horizon, setHorizon] = useState<number>(12)

  const complete = completes[discipline] ?? completes[offertes[0] ?? 'course']!
  const t = useMemo(() => surHorizon(complete, horizon), [complete, horizon])
  const meta = DISCIPLINES[t.discipline]
  const autres = jalons[horizon] ?? []

  /*
   * La comparaison se fait sur ce qui est reellement couru, pas sur la
   * semaine en cours : une semaine sur quatre est une decharge, et le point
   * de depart tombait alors dans un creux voulu. L'ecart annonce doublait.
   */
  const reference = t.reelHebdo ?? (t.depart > 0 ? t.depart : null)
  const progression =
    reference !== null && reference > 0
      ? Math.round(((t.arrivee - reference) / reference) * 100)
      : null

  return (
    <>
      {/*
        Les disciplines d'abord : elles changent ce qu'on regarde, l'horizon
        ne change que jusqu'ou. Seules celles que l'athlete pratique sont
        proposees — un onglet natation chez qui ne nage pas n'aurait rien a
        montrer, et un onglet vide se lit comme une panne.
      */}
      {offertes.length > 1 && (
        <div className="segment mb-3" role="tablist">
          {offertes.map((d) => (
            <button
              key={d}
              role="tab"
              aria-selected={discipline === d}
              onClick={() => setDiscipline(d)}
              className="segment-item"
              data-actif={discipline === d}
            >
              {DISCIPLINES[d].label}
            </button>
          ))}
        </div>
      )}

      {/* ── La courbe ── */}
      <section className="lisere glass rounded-card p-5">
        <div className="mb-4">
          <p className="eyebrow" style={{ color: meta.couleur }}>
            {meta.mesure}
          </p>
          <p className="mt-1.5 text-[13px] leading-relaxed text-mut">
            {t.discipline === 'natation'
              ? 'À gauche la plus longue distance que tu as enchaînée chaque semaine, à droite le palier que le programme vise.'
              : t.discipline === 'force'
                ? 'À gauche les répétitions que tu as enregistrées, à droite celles que le programme prescrit.'
                : 'À gauche ce que tu as couru, à droite ce que le plan contient.'}
            {t.discipline === 'course' &&
              (t.ancree
                ? ' La suite est calculée sur tes quatre dernières semaines.'
                : ' La suite part encore de ce que tu as déclaré : trois sorties enregistrées suffiront à la mesurer.')}
          </p>
        </div>

        <CourbeTrajectoire
          points={t.points}
          bascule={t.bascule}
          unite={meta.unite}
          couleur={meta.couleur}
          legende={t.discipline === 'natation' ? 'sans pause, cette semaine-là' : 'cette semaine-là'}
        />

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
          <p className="num mt-1.5 text-[26px] leading-none">
            {meta.unite === 'km' ? fr(t.arrivee) : Math.round(t.arrivee)}
          </p>
          <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
            {meta.unite}, la semaine du {formatDate(t.quand)}
          </p>
          {progression !== null && progression > 0 && (
            <p className="mt-1.5 text-[11.5px] leading-relaxed text-mut">
              <span className="text-ok">+{progression} %</span>{' '}
              {t.reelHebdo !== null
                ? `sur tes ${fr(t.reelHebdo)} km hebdomadaires actuels`
                : t.discipline === 'natation'
                  ? 'sur le palier de cette semaine'
                  : 'sur ce que le programme prescrit cette semaine'}
            </p>
          )}
        </div>
        {t.cumulAVenir !== null ? (
          <div className="card">
            <p className="eyebrow">D&rsquo;ici là</p>
            <p className="num mt-1.5 text-[26px] leading-none">{t.cumulAVenir}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
              {meta.cumul}, répartis sur {t.points.length - t.bascule} semaines
            </p>
          </div>
        ) : (
          <div className="card">
            <p className="eyebrow">Aujourd&rsquo;hui</p>
            <p className="num mt-1.5 text-[26px] leading-none">{Math.round(t.depart)}</p>
            <p className="mt-1 text-[11.5px] leading-relaxed text-dim">
              {meta.unite}, le palier que le programme vise cette semaine
            </p>
          </div>
        )}
      </section>

      {/* ── Les paliers ── */}
      <section className="mt-6">
        <h2 className="eyebrow mb-1">Tes rendez-vous</h2>
        <p className="mb-3 text-[12px] leading-5 text-dim">
          {t.discipline === 'natation'
            ? 'La semaine où le programme vise chaque palier de distance sans pause. Ce ne sont pas des prédictions : ces séances sont déjà écrites.'
            : t.discipline === 'force'
              ? 'Ce que la barre peut dater, et ce qu’elle ne peut pas.'
              : 'La semaine où ta sortie longue atteint chaque distance. Ce ne sont pas des prédictions : ces séances sont déjà écrites dans ton programme.'}
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
                  style={{ borderColor: `color-mix(in srgb, ${meta.couleur} 40%, transparent)`, color: meta.couleur }}
                >
                  {frMille(p.km)}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[14px] leading-tight">
                    {p.nom
                      ? `Ton ${p.nom}`
                      : `${frMille(p.km)} ${meta.unite} d’une traite`}
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
            {t.discipline === 'force'
              ? 'La force ne se projette pas en paliers : le programme prescrit des séries, il ne prédit pas un maximum. Ce sont tes tests qui font avancer les repères, et la prescription suit.'
              : 'Aucun palier n’est franchi sur cet horizon. Regarde plus loin, ou construis d’abord le volume : la sortie longue est plafonnée par ce que tu cours à la semaine, et c’est ce plafond qui décide.'}
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
