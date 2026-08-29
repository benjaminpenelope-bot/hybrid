import { redirect } from 'next/navigation'
import { loadState } from '@/lib/db/queries'
import { todayISO } from '@/lib/engine/date'
import { nextRung, swimBlocker, swimTechniqueAdvice } from '@/lib/engine/advice'
import { sum } from '@/lib/engine/math'
import { runStats, streetStats, swimStats } from '@/lib/engine/perf'
import {
  calendarAssessment,
  DEFAULT_TARGET_MINUTES,
  marathonVerdict,
  PHASE_TARGETS,
  targetPaceLabel,
} from '@/lib/engine/marathon'
import { phaseAt } from '@/lib/engine/program'
import { badgeState } from '@/lib/engine/prs'
import { marathonReadiness } from '@/lib/engine/scoring'
import { currentUserId } from '@/lib/supabase/server'
import { PerfTabs } from './perf-tabs'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Perfs · Polytrain' }

export default async function Page() {
  const userId = await currentUserId()
  if (!userId) redirect('/login')

  const state = await loadState(userId)
  if (!state || state.sessions.length === 0) redirect('/onboarding')

  const today = todayISO()
  const week = state.sessions.find((s) => s.status === 'planned')?.week ?? 1
  const race = state.profile.raceDate
  const phase = phaseAt(today, week, race)
  const swim = swimStats(state, today)
  const swimMinutes = sum(
    state.sessions
      .filter((s) => s.status === 'done' && s.kind === 'swim')
      .map((s) => s.log?.minutes ?? 0),
  )
  const weeksAvailable = race
    ? Math.floor((new Date(race).getTime() - new Date(today).getTime()) / (7 * 86400000))
    : null

  return (
    <main className="wrap py-[18px]">
      <h1 className="dsp mb-4 text-[22px]">Perfs</h1>
      <PerfTabs
        run={runStats(state, today)}
        swim={swim}
        street={streetStats(state, today)}
        readiness={marathonReadiness(state, today)}
        phase={phase}
        verdict={marathonVerdict(state, today, phase.key)}
        assessment={calendarAssessment(state, today, state.profile, weeksAvailable)}
        targetPace={targetPaceLabel()}
        targetLabel={`sous ${Math.round(DEFAULT_TARGET_MINUTES / 60)} h`}
        weeklyTarget={PHASE_TARGETS.SPECIFIC.weeklyKm}
        swimAdvice={swimTechniqueAdvice(swim.continuous ?? 0)}
        swimNext={nextRung(swim.continuous ?? 0)}
        swimMinutes={swimMinutes}
        swimBlocker={swimBlocker(state, today)}
        badges={badgeState(state)}
      />
    </main>
  )
}
