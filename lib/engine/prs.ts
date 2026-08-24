import { pace } from './math'
import { benchmarkValue, swimBest } from './state'
import type { AthleteState, RecordEntry, Session, SessionLog } from './types'

/**
 * DETECTION DES RECORDS
 * Un record ne se déclenche que par comparaison à une performance
 * précédemment enregistrée. Aucun record sur une première mesure absente.
 */

export interface PR {
  label: string
  value: string
}

export function detectPRs(state: AthleteState, session: Session, log: SessionLog): PR[] {
  const prs: PR[] = []
  const done = state.sessions.filter((x) => x.status === 'done' && x.id !== session.id)

  if (session.kind === 'run' && log.km) {
    const prev = done.filter((x) => x.kind === 'run' && x.log?.km)
    const bestLong = prev.length ? Math.max(...prev.map((x) => x.log?.km ?? 0)) : 0
    if (log.km > bestLong) prs.push({ label: 'Plus longue sortie', value: `${log.km} km` })
    if (log.km >= 4 && log.minutes) {
      const p = log.minutes / log.km
      const bestP = prev
        .filter((x) => (x.log?.km ?? 0) >= 4 && x.log?.minutes)
        .map((x) => (x.log?.minutes as number) / (x.log?.km as number))
      if (!bestP.length || p < Math.min(...bestP))
        prs.push({ label: 'Meilleure allure sur 4 km+', value: `${pace(p, 1)}/km` })
    }
  }

  if (session.kind === 'swim') {
    const best = swimBest(state).continuous
    if ((log.continuous ?? 0) > best)
      prs.push({ label: 'Distance continue', value: `${log.continuous} m` })
    const prevD = done
      .filter((x) => x.kind === 'swim' && x.log?.distance)
      .map((x) => x.log?.distance as number)
    if (log.distance && (!prevD.length || log.distance > Math.max(...prevD)))
      prs.push({ label: 'Volume natation', value: `${log.distance} m` })
  }

  if (session.kind === 'strength') {
    for (const t of log.tests ?? []) {
      const old = benchmarkValue(state.benchmarks[t.key])
      if (old === null || t.value > old)
        prs.push({ label: `Record ${t.name}`, value: `${t.value}${t.unit ?? ''}` })
    }
    const prevVol = done
      .filter((x) => x.type === session.type && x.log?.reps)
      .map((x) => x.log?.reps as number)
    if (log.reps && (!prevVol.length || log.reps > Math.max(...prevVol)))
      prs.push({ label: 'Volume total', value: `${log.reps} reps` })
  }

  return prs
}

export function toRecords(prs: PR[], date: string): RecordEntry[] {
  return prs.map((p) => ({ label: p.label, value: p.value, date }))
}

/** Paliers de progression street. `got` se calcule sur les repères testés. */
export const BADGES = [
  { key: 'muscleups', value: 1, label: 'Premier muscle-up' },
  { key: 'pullups', value: 10, label: '10 tractions strictes' },
  { key: 'dips', value: 15, label: '15 dips' },
  { key: 'muscleups', value: 3, label: "3 muscle-ups d'affilée" },
  { key: 'legraises', value: 10, label: '10 relevés de jambes stricts' },
  { key: 'pullups', value: 15, label: '15 tractions' },
  { key: 'muscleups', value: 5, label: "5 muscle-ups d'affilée" },
  { key: 'dips', value: 25, label: '25 dips' },
  { key: 'legraises', value: 20, label: '20 relevés de jambes' },
  { key: 'pullups', value: 20, label: '20 tractions' },
] as const

export function badgeState(state: AthleteState): { label: string; got: boolean; known: boolean }[] {
  return BADGES.map((b) => {
    const v = benchmarkValue(state.benchmarks[b.key])
    return { label: b.label, got: v !== null && v >= b.value, known: v !== null }
  })
}
