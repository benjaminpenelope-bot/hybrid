'use client'

import {
  closestCenter,
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useDraggable,
  useDroppable,
  useSensor,
  useSensors,
} from '@dnd-kit/core'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { useMemo, useState, useTransition } from 'react'
import { Button } from '@/components/ui/button'
import { addDays, DAYS_FR_LONG, formatDate, mondayOf, weekday } from '@/lib/engine/date'
import { sessionLoad } from '@/lib/engine/load'
import { sum } from '@/lib/engine/math'
import type { ExerciseRef } from '@/lib/ui/exercises'
import type { Session } from '@/lib/engine/types'
import { SESSION_META } from '@/lib/ui/session-meta'
import { AjoutSeance } from './ajout-seance'
import {
  markDone,
  moveSessionToDate,
  postponeSession,
  replanSession,
  skipSession,
} from './actions'

/** Une séance réalisée ne se déplace pas : sa date fait partie de la mesure. */
function deplacable(session: Session): boolean {
  return session.type !== 'REST' && session.status !== 'done'
}

/** Ce qui a bougé sur une séance, dit en un mot. */
function badges(session: Session): { label: string; color: string }[] {
  const out: { label: string; color: string }[] = []
  if (session.status === 'done') out.push({ label: 'Réalisée', color: 'var(--ok)' })
  if (session.status === 'skipped') out.push({ label: 'Sautée', color: 'var(--bad)' })
  if (session.moved) out.push({ label: 'Déplacée', color: 'var(--mut)' })
  if (session.edited) out.push({ label: 'Modifiée', color: 'var(--mut)' })
  if (session.adapted) out.push({ label: session.adapted, color: 'var(--warn)' })
  if (session.status === 'done' && !session.log)
    out.push({ label: 'Détails manquants', color: 'var(--warn)' })
  return out
}

/** Le chiffre qui compte, une fois la séance enregistrée. */
function keyFigure(session: Session): string | null {
  const log = session.log
  if (!log) return null
  if (session.kind === 'run' && log.km) return `${log.km.toFixed(2)} km`
  if (session.kind === 'swim' && log.continuous) return `${log.continuous} m sans pause`
  if (session.kind === 'strength' && log.reps) return `${log.reps} répétitions`
  return null
}

export function WeekView({
  sessions,
  today,
  exercices,
}: {
  sessions: Session[]
  today: string
  exercices: ExerciseRef[]
}) {
  const router = useRouter()
  const [offset, setOffset] = useState(0)
  const [selected, setSelected] = useState<Session | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const [dragId, setDragId] = useState<string | null>(null)
  const [ajout, setAjout] = useState(false)

  /**
   * Le seuil de 8 px laisse passer le clic à la souris, et le délai de 180 ms
   * laisse la page défiler au doigt : sans lui, tout balayage vertical
   * arracherait une séance.
   */
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 180, tolerance: 8 } }),
  )

  const enDeplacement = dragId === null ? null : (sessions.find((s) => s.id === dragId) ?? null)

  const monday = addDays(mondayOf(today), offset * 7)
  const days = useMemo(
    () => Array.from({ length: 7 }, (_, i) => addDays(monday, i)),
    [monday],
  )

  /** Chiffres de la semaine affichée, pas d'une fenêtre glissante. */
  const stats = useMemo(() => {
    const week = sessions.filter((s) => days.includes(s.date))
    const planned = week.filter((s) => s.type !== 'REST' && s.status !== 'skipped')
    const done = week.filter((s) => s.status === 'done')
    return {
      done: done.length,
      planned: planned.length,
      km: sum(week.filter((s) => s.log?.km).map((s) => s.log?.km ?? 0)),
      swimM: sum(done.filter((s) => s.kind === 'swim').map((s) => s.log?.distance ?? 0)),
      reps: sum(done.filter((s) => s.kind === 'strength').map((s) => s.log?.reps ?? 0)),
      minutes: Math.round(sum(done.map((s) => s.log?.minutes ?? s.duration ?? 0))),
      load: Math.round(
        sum(
          done.map((s) =>
            sessionLoad(s.log?.minutes ?? s.duration ?? 0, s.rpe ?? s.rpeEst ?? 0),
          ),
        ),
      ),
    }
  }, [sessions, days])

  const run = (fn: () => Promise<{ ok: boolean; message?: string }>) => {
    setError(null)
    startTransition(async () => {
      const result = await fn()
      if (!result.ok) setError(result.message ?? 'Action impossible.')
      else {
        setSelected(null)
        router.refresh()
      }
    })
  }

  const weekLabel =
    offset === 0
      ? 'Cette semaine'
      : offset === 1
        ? 'Semaine prochaine'
        : offset === -1
          ? 'Semaine dernière'
          : `${formatDate(monday)} → ${formatDate(addDays(monday, 6))}`

  return (
    <>
      <div className="mb-4 flex items-center justify-between">
        <button
          type="button"
          onClick={() => setOffset(offset - 1)}
          aria-label="Semaine précédente"
          className="h-11 w-11 rounded-[11px] border border-line2 bg-bg2 font-display text-[18px] text-text"
        >
          ‹
        </button>
        <div className="text-center">
          <div className="dsp text-[16px]">{weekLabel}</div>
          {offset !== 0 && (
            <button type="button" onClick={() => setOffset(0)} className="eyebrow mt-0.5 text-dim">
              Revenir à aujourd&apos;hui
            </button>
          )}
        </div>
        <button
          type="button"
          onClick={() => setOffset(offset + 1)}
          aria-label="Semaine suivante"
          className="h-11 w-11 rounded-[11px] border border-line2 bg-bg2 font-display text-[18px] text-text"
        >
          ›
        </button>
      </div>

      <div className="mb-5 grid grid-cols-3 gap-2 lg:grid-cols-6">
        <div className="rounded-card border border-line bg-card p-3">
          <div className="eyebrow text-[9.5px]">Séances</div>
          <div className="num mt-1 text-[24px] leading-none">
            {stats.done}/{stats.planned}
          </div>
          <div className="mt-1 text-[10.5px] text-dim">réalisées</div>
        </div>
        <div className="rounded-card border border-line bg-card p-3">
          <div className="eyebrow text-[9.5px]">Course</div>
          <div className="num mt-1 text-[24px] leading-none text-run">
            {stats.km.toFixed(1)}
          </div>
          <div className="mt-1 text-[10.5px] text-dim">km</div>
        </div>
        <div className="rounded-card border border-line bg-card p-3">
          <div className="eyebrow text-[9.5px]">Charge</div>
          <div className="num mt-1 text-[24px] leading-none">{stats.load}</div>
          <div className="mt-1 text-[10.5px] text-dim">unités</div>
        </div>

        {/* Trois repères de plus, quand l'écran a la place de les porter. */}
        <div className="hidden rounded-card border border-line bg-card p-3 lg:block">
          <div className="eyebrow text-[9.5px]">Natation</div>
          <div className="num mt-1 text-[24px] leading-none text-swim">{stats.swimM}</div>
          <div className="mt-1 text-[10.5px] text-dim">m</div>
        </div>
        <div className="hidden rounded-card border border-line bg-card p-3 lg:block">
          <div className="eyebrow text-[9.5px]">Répétitions</div>
          <div className="num mt-1 text-[24px] leading-none text-street">{stats.reps}</div>
          <div className="mt-1 text-[10.5px] text-dim">au total</div>
        </div>
        <div className="hidden rounded-card border border-line bg-card p-3 lg:block">
          <div className="eyebrow text-[9.5px]">Temps</div>
          <div className="num mt-1 text-[24px] leading-none">{stats.minutes}</div>
          <div className="mt-1 text-[10.5px] text-dim">min</div>
        </div>
      </div>

      {/* Sept jours en une colonne sur mobile, deux sur laptop : la semaine
          entière tient alors dans un écran, sans faire défiler. */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={(e) => setDragId(String(e.active.id))}
        onDragCancel={() => setDragId(null)}
        onDragEnd={(e) => {
          setDragId(null)
          const cible = e.over?.id
          const id = String(e.active.id)
          if (typeof cible !== 'string') return
          const seance = sessions.find((x) => x.id === id)
          if (!seance || seance.date === cible) return
          run(() => moveSessionToDate(id, cible))
        }}
      >
        <ul className="flex flex-col gap-2 lg:grid lg:grid-cols-2 lg:items-start lg:gap-x-5">
          {days.map((date) => (
            <JourColonne
              key={date}
              date={date}
              isToday={date === today}
              seances={sessions.filter((s) => s.date === date)}
              onSelect={setSelected}
              enCours={dragId !== null}
            />
          ))}
        </ul>

        {/* L'aperçu suit le doigt : sans lui, on déplace un élément invisible. */}
        <DragOverlay dropAnimation={null}>
          {enDeplacement && (
            <div className="pointer-events-none opacity-95">
              <CarteSeance seance={enDeplacement} isToday={false} />
            </div>
          )}
        </DragOverlay>
      </DndContext>

      <p className="mt-3 text-[11.5px] leading-relaxed text-dim">
        Maintiens une séance pour la faire glisser sur un autre jour. Une séance déjà réalisée ne
        se déplace pas : sa date fait partie de la mesure.
      </p>

      <Button variant="ghost" onClick={() => setAjout(true)} className="mt-3">
        Ajouter une séance passée
      </Button>

      {ajout && (
        <AjoutSeance
          dateParDefaut={days.includes(today) ? today : days[6]!}
          maxDate={today}
          exercices={exercices}
          onFerme={() => setAjout(false)}
          onEnregistre={() => {
            setAjout(false)
            router.refresh()
          }}
        />
      )}

      {/* ── Actions sur la séance choisie ── */}
      {selected && (
        <div
          className="fixed inset-0 z-[100] flex items-end bg-bg/80 backdrop-blur-sm"
          role="dialog"
          aria-label={`Actions pour ${selected.title}`}
        >
          <div className="max-h-[85vh] w-full overflow-y-auto rounded-t-card border-t border-line bg-card p-4 pb-8">
            <div className="mx-auto w-full max-w-app">
              <div className="mb-1 flex items-start justify-between gap-4">
                <div className="min-w-0">
                  <span className="eyebrow" style={{ color: SESSION_META[selected.type].color }}>
                    {SESSION_META[selected.type].label}
                  </span>
                  <h2 className="dsp mt-1 text-[20px] leading-tight">{selected.title}</h2>
                  <p className="mt-0.5 text-[12px] text-dim">{formatDate(selected.date)}</p>
                </div>
                <button
                  type="button"
                  onClick={() => setSelected(null)}
                  className="eyebrow shrink-0 text-dim"
                >
                  Fermer
                </button>
              </div>

              {selected.goal && (
                <p className="mt-3 text-[12.5px] leading-relaxed text-mut">{selected.goal}</p>
              )}

              {selected.adapted && (
                <p className="mt-3 rounded-[11px] border border-warn/40 bg-warn/10 p-3 text-[12.5px] leading-relaxed text-text">
                  Séance {selected.adapted} automatiquement après ta dernière séance validée.
                </p>
              )}

              {error && (
                <p className="mt-3 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
                  {error}
                </p>
              )}

              <div className="mt-4 flex flex-col gap-2">
                {selected.type !== 'REST' && selected.status !== 'done' && (
                  <Link
                    href={`/seance/${selected.id}`}
                    className="flex w-full items-center justify-center rounded-[13px] bg-text p-[15px] font-display text-base font-bold uppercase tracking-[0.09em] text-bg"
                  >
                    Commencer la séance
                  </Link>
                )}

                {selected.status === 'done' && !selected.log && (
                  <Link
                    href={`/seance/${selected.id}`}
                    className="flex w-full items-center justify-center rounded-[13px] bg-text p-[15px] font-display text-base font-bold uppercase tracking-[0.09em] text-bg"
                  >
                    Ajouter les détails
                  </Link>
                )}

                {selected.status === 'done' && selected.log && (
                  <Link
                    href={`/seance/${selected.id}/resume`}
                    className="flex w-full items-center justify-center rounded-[13px] border border-line2 p-3 font-display text-[13px] font-bold uppercase tracking-[0.09em] text-text"
                  >
                    Voir le résumé
                  </Link>
                )}

                <div className="grid grid-cols-2 gap-2">
                  {selected.status === 'planned' && selected.type !== 'REST' && (
                    <Button variant="ghost" small onClick={() => run(() => markDone(selected.id))} disabled={pending}>
                      Fait
                    </Button>
                  )}
                  {selected.status === 'planned' && (
                    <Button
                      variant="ghost"
                      small
                      onClick={() => run(() => postponeSession(selected.id))}
                      disabled={pending}
                    >
                      Reporter
                    </Button>
                  )}
                  {selected.status === 'planned' && selected.type !== 'REST' && (
                    <Button variant="ghost" small onClick={() => run(() => skipSession(selected.id))} disabled={pending}>
                      Sauter
                    </Button>
                  )}
                  {(selected.status === 'skipped' ||
                    (selected.status === 'done' && !selected.log)) && (
                    <Button
                      variant="ghost"
                      small
                      onClick={() => run(() => replanSession(selected.id))}
                      disabled={pending}
                    >
                      Reprogrammer
                    </Button>
                  )}
                  <Link
                    href={`/seance/${selected.id}/modifier`}
                    className="flex items-center justify-center rounded-[10px] border border-line2 p-2.5 font-display text-[13px] font-bold uppercase tracking-[0.09em] text-text"
                  >
                    Modifier
                  </Link>
                </div>
              </div>

              <p className="mt-4 text-[11.5px] leading-relaxed text-dim">
                « Fait » enregistre l&apos;assiduité mais pas la charge : sans durée ni RPE, il
                n&apos;y a rien à mesurer. Ajoute les détails pour que la séance compte dans ton
                score.
              </p>
            </div>
          </div>
        </div>
      )}
    </>
  )
}

/**
 * Un jour de la semaine, et sa zone de dépôt.
 *
 * Le cadre ne s'allume que pendant un déplacement : hors de là, sept cadres
 * en pointillés brouilleraient la lecture de la semaine.
 */
function JourColonne({
  date,
  isToday,
  seances,
  onSelect,
  enCours,
}: {
  date: string
  isToday: boolean
  seances: Session[]
  onSelect: (s: Session) => void
  enCours: boolean
}) {
  const { setNodeRef, isOver } = useDroppable({ id: date })

  return (
    <li ref={setNodeRef}>
      <div className="mb-1 flex items-baseline gap-2">
        <span className={`eyebrow ${isToday ? 'text-text' : ''}`}>
          {DAYS_FR_LONG[weekday(date)]}
        </span>
        <span className="num text-[11px] text-dim">{formatDate(date).slice(4)}</span>
        {isToday && <span className="num text-[10px] text-run">aujourd&apos;hui</span>}
      </div>

      <div
        className="flex flex-col gap-2 rounded-[15px] transition-colors"
        style={{
          outline: isOver ? '2px dashed var(--run)' : enCours ? '2px dashed var(--line2)' : 'none',
          outlineOffset: 3,
        }}
      >
        {seances.length === 0 && (
          <div className="rounded-[13px] border border-dashed border-line px-3 py-3 text-[13px] text-dim">
            {enCours ? 'Déposer ici' : 'Rien de programmé'}
          </div>
        )}

        {seances.map((s) => (
          <SeanceDeplacable key={s.id} seance={s} isToday={isToday} onSelect={onSelect} />
        ))}
      </div>
    </li>
  )
}

function SeanceDeplacable({
  seance,
  isToday,
  onSelect,
}: {
  seance: Session
  isToday: boolean
  onSelect: (s: Session) => void
}) {
  const peutBouger = deplacable(seance)
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: seance.id,
    disabled: !peutBouger,
  })

  return (
    <div ref={setNodeRef} style={{ opacity: isDragging ? 0.35 : 1 }}>
      <CarteSeance
        seance={seance}
        isToday={isToday}
        onSelect={onSelect}
        poignee={peutBouger ? { ...listeners, ...attributes } : undefined}
      />
    </div>
  )
}

/** La carte elle-même, réutilisée telle quelle par l'aperçu de déplacement. */
function CarteSeance({
  seance,
  isToday,
  onSelect,
  poignee,
}: {
  seance: Session
  isToday: boolean
  onSelect?: (s: Session) => void
  poignee?: Record<string, unknown>
}) {
  const meta = SESSION_META[seance.type]

  return (
    <button
      type="button"
      onClick={onSelect ? () => onSelect(seance) : undefined}
      // `manipulation` et non `none` : le TouchSensor s'active au maintien, donc
      // un simple balayage sur une carte doit encore faire défiler la page.
      className={`flex w-full items-center gap-3 rounded-[13px] border border-line bg-card px-3 py-[11px] text-left ${
        poignee ? 'touch-manipulation' : ''
      }`}
      style={{ borderColor: isToday ? `${meta.color}55` : undefined }}
      {...poignee}
    >
      <span
        className="h-2 w-2 shrink-0 rounded-full"
        style={{ background: meta.color }}
        aria-hidden
      />
      <span className="shrink-0 text-[17px]" aria-hidden>
        {meta.icon}
      </span>
      <span className="min-w-0 flex-1">
        <span
          className={`block truncate text-[13.5px] ${
            seance.status === 'skipped' ? 'line-through opacity-45' : ''
          }`}
        >
          {seance.title}
        </span>
        {keyFigure(seance) && (
          <span className="num mt-0.5 block text-[11.5px] text-dim">{keyFigure(seance)}</span>
        )}
        {badges(seance).length > 0 && (
          <span className="mt-1 flex flex-wrap gap-1.5">
            {badges(seance).map((b) => (
              <span
                key={b.label}
                className="rounded-full border px-1.5 py-px font-display text-[9.5px] uppercase tracking-[0.08em]"
                style={{ color: b.color, borderColor: `${b.color}55` }}
              >
                {b.label}
              </span>
            ))}
          </span>
        )}
      </span>
      <span className="num shrink-0 text-[12px] text-dim">
        {seance.duration ? `${seance.duration}'` : '—'}
      </span>
    </button>
  )
}
