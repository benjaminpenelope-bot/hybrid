'use client'

import { useMemo } from 'react'
import { todayISO, weekday } from '@/lib/engine/date'
import { baseWeeklyKm, generatePlan } from '@/lib/engine/program'
import { restWeekdayFrom } from '@/lib/validation/onboarding'
import { SESSION_CHANNEL, SESSION_META, teinte } from '@/lib/ui/session-meta'
import { fr } from '@/lib/ui/nombre'
import type { GoalType, Sport } from '@/lib/engine/types'

/**
 * APERÇU DU PROGRAMME
 *
 * La première vraie semaine, avec ses titres, ses distances et ses durées.
 *
 * Les trois premières étapes montraient la *forme* de la semaine : sept
 * cellules colorées, assez pour comprendre qu'un objectif la réorganise, pas
 * assez pour donner envie. Ici on montre le programme.
 *
 * Il est calculé dans le navigateur, par le même générateur que celui qui
 * écrira en base à la fin. Rien n'est enregistré : l'athlète voit ce qu'il
 * obtiendra avant de finir de répondre, et peut revenir en arrière sans que
 * rien n'ait été créé.
 */
export function ApercuProgramme({
  objectif,
  sports,
  jours,
  allowDoubles,
  volumeCourseHebdo,
}: {
  objectif: GoalType | null
  sports: Sport[]
  jours: number[]
  allowDoubles: boolean
  /** Volume de course actuel, en km. Null quand l'athlète ne court pas. */
  volumeCourseHebdo: number | null
}) {
  const semaine = useMemo(() => {
    const debut = todayISO()
    const plan = generatePlan(debut, 1, 1, {
      restWeekday: jours.length > 0 ? restWeekdayFrom(jours) : 1,
      allowDoubles,
      goal: objectif,
      sports,
      availableWeekdays: jours,
      ...(volumeCourseHebdo !== null ? { baseKm: baseWeeklyKm(volumeCourseHebdo) } : {}),
      // Identifiants stables : l'aperçu se recalcule à chaque frappe, et des
      // identifiants aléatoires remonteraient toute la liste à chaque fois.
      makeId: (() => {
        let n = 0
        return () => `apercu-${n++}`
      })(),
    })

    // Lundi d'abord, comme partout ailleurs.
    return [1, 2, 3, 4, 5, 6, 0]
      .map((j) => plan.find((s) => weekday(s.date) === j))
      .filter((s): s is NonNullable<typeof s> => s !== undefined)
  }, [objectif, sports, jours, allowDoubles, volumeCourseHebdo])

  const seances = semaine.filter((s) => s.type !== 'REST')
  const minutes = seances.reduce((t, s) => t + s.duration, 0)
  const km = seances.reduce((t, s) => t + (s.log?.km ?? 0), 0)

  return (
    <div>
      <div className="glass mb-4 flex gap-3 rounded-card p-4">
        <Chiffre valeur={`${seances.length}`} legende="séances" />
        <Chiffre valeur={`${Math.round(minutes / 60)} h`} legende="d’entraînement" />
        {km > 0 && <Chiffre valeur={`${fr(km)}`} legende="km de course" />}
      </div>

      <div className="flex flex-col gap-2">
        {semaine.map((s, i) => {
          const meta = SESSION_META[s.type]
          const repos = s.type === 'REST'
          return (
            <div
              key={s.id}
              className="entre glass flex items-center gap-3 rounded-[16px] px-3.5 py-3"
              style={{ animationDelay: `${i * 55}ms` }}
            >
              <span
                className="flex h-9 w-9 shrink-0 items-center justify-center rounded-[11px]"
                style={{
                  background: repos
                    ? 'rgb(255 255 255 / 0.04)'
                    : teinte(SESSION_CHANNEL[s.type], 0.16),
                  color: repos ? 'var(--dim)' : meta.color,
                }}
              >
                <meta.Icon size={17} />
              </span>

              <span className="min-w-0 flex-1">
                <span className="block text-[10.5px] font-semibold uppercase tracking-[0.09em] text-dim">
                  {JOUR_LONG[weekday(s.date)]}
                </span>
                {/*
                  Le titre peut passer a la ligne : tronquer « Endurance
                  fondamentale — 4,5 km » coupait precisement la distance,
                  qui est ce que l'athlete cherche a lire.
                */}
                <span className="mt-0.5 block text-[14px] font-semibold leading-snug tracking-[-0.01em]">
                  {s.title}
                </span>
              </span>

              {!repos && (
                <span className="num shrink-0 text-[12.5px] text-mut">{s.duration} min</span>
              )}
            </div>
          )
        })}
      </div>
    </div>
  )
}

const JOUR_LONG = ['Dimanche', 'Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi']

function Chiffre({ valeur, legende }: { valeur: string; legende: string }) {
  return (
    <div className="flex-1">
      <div className="dsp text-[22px]">{valeur}</div>
      <div className="mt-0.5 text-[11.5px] text-mut">{legende}</div>
    </div>
  )
}
