import Link from 'next/link'
import type { Alert, AlertLevel, AlertTarget } from '@/lib/engine/alerts'

const LEVEL_COLOR: Record<AlertLevel, string> = {
  critical: 'var(--bad)',
  warn: 'var(--warn)',
  info: 'var(--mut)',
}

const TARGET_HREF: Record<AlertTarget, string> = {
  recovery: '/recuperation',
  body: '/corps',
  perf: '/perfs',
  week: '/semaine',
  coach: '/coach',
  goals: '/objectifs',
}

/** Trois signaux au maximum : au-delà, plus personne ne les lit. */
export function Alerts({ alerts, hasHistory }: { alerts: Alert[]; hasHistory: boolean }) {
  if (alerts.length === 0) {
    return (
      <p className="text-[13px] leading-relaxed text-mut">
        {hasHistory
          ? 'Aucun signal : rien ne sort des limites mesurées.'
          : "Aucune séance enregistrée pour l'instant. Les signaux apparaîtront dès que tu auras des données à surveiller, pas avant."}
      </p>
    )
  }

  return (
    <div className="flex flex-col gap-2">
      {alerts.slice(0, 3).map((a) => (
        <Link
          key={a.id}
          href={TARGET_HREF[a.target]}
          className="block rounded-card border bg-card p-4"
          style={{ borderColor: `${LEVEL_COLOR[a.level]}40` }}
        >
          <span className="flex items-center gap-2">
            <span
              className="h-2 w-2 shrink-0 rounded-full"
              style={{ background: LEVEL_COLOR[a.level] }}
              aria-hidden
            />
            <span className="dsp text-[15px]">{a.title}</span>
          </span>
          <p className="mt-2 text-[12.5px] leading-relaxed text-mut">{a.body}</p>
          <p className="num mt-2 text-[11px] text-dim">{a.evidence}</p>
        </Link>
      ))}
    </div>
  )
}
