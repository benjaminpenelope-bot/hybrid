'use client'

import Link from 'next/link'
import { useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChipGroup } from '@/components/ui/chip'
import { NumPad, Scale } from '@/components/ui/numpad'
import { weekday } from '@/lib/engine/date'
import { buildSession } from '@/lib/engine/program'
import type { Profile, Session, SessionType } from '@/lib/engine/types'
import { SESSION_META } from '@/lib/ui/session-meta'
import type { EditableExercise } from '@/lib/validation/edit-session'
import { updateSession } from '../../actions'

const TYPES: SessionType[] = ['RUN', 'LONG', 'BIKE', 'RIDE', 'SWIM', 'UPPER', 'LOWER', 'REST']

const EMPTY_EXERCISE: EditableExercise = {
  n: 'Nouvel exercice',
  sets: 3,
  reps: '10',
  rest: 90,
  rir: 2,
  cue: '',
}

export function SessionEditor({ session, profile }: { session: Session; profile: Profile }) {
  const [type, setType] = useState<SessionType>(session.type)
  const [title, setTitle] = useState(session.title)
  const [goal, setGoal] = useState(session.goal ?? '')
  const [why, setWhy] = useState(session.why ?? '')
  const [target, setTarget] = useState(session.target ?? '')
  const [duration, setDuration] = useState(session.duration)
  const [intensity, setIntensity] = useState(session.intensity)
  const [cues, setCues] = useState<string[]>(session.cues ?? [])
  const [exercises, setExercises] = useState<EditableExercise[]>(
    (session.exercises ?? []).map((e) => ({ ...e })),
  )
  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)

  /**
   * Changer de type recharge le contenu type de la discipline : sinon on
   * garderait des tractions sur une séance de natation.
   */
  const swapType = (next: SessionType) => {
    if (next === type) return
    const fresh = buildSession(session.date, session.week, weekday(session.date), next, {
      restWeekday: profile.restWeekday,
      allowDoubles: profile.allowDoubles,
      raceDate: profile.raceDate,
      baseKm: profile.baseWeeklyKm ?? undefined,
      makeId: () => session.id,
    })
    setType(next)
    setTitle(fresh.title)
    setGoal(fresh.goal ?? '')
    setWhy(fresh.why ?? '')
    setTarget(fresh.target ?? '')
    setDuration(fresh.duration)
    setIntensity(fresh.intensity)
    setCues(fresh.cues)
    /*
     * Sans marqueur de test : c'est le programme qui decide quand mesurer, pas
     * une retouche de seance. Le contenu type de la semaine 1 porte les quatre
     * tests, et changer de type ici les recopiait — la seance reclamait alors
     * des repere officiels qu'on n'avait pas demande a passer.
     */
    setExercises(
      fresh.exercises.map(({ test: _test, ...e }) => ({ ...e })),
    )
  }

  /*
   * Renommer un exercice lui retire son marqueur de test.
   *
   * Un repere est attache a un mouvement precis : des que le nom change, la
   * cle ne decrit plus ce qu'on fait. C'est ainsi qu'un exercice « Abdos »
   * a fini par enregistrer cinquante dips, et qu'une seance ordinaire
   * reclamait encore les chiffres d'un test.
   */
  const patch = (i: number, key: keyof EditableExercise, value: string | number) =>
    setExercises((prev) =>
      prev.map((e, j) => {
        if (j !== i) return e
        const suivant = { ...e, [key]: value }
        if (key === 'n' && value !== e.n) delete suivant.test
        return suivant
      }),
    )

  const move = (i: number, direction: -1 | 1) =>
    setExercises((prev) => {
      const next = [...prev]
      const j = i + direction
      if (j < 0 || j >= next.length) return prev
      const a = next[i]!
      const b = next[j]!
      next[i] = b
      next[j] = a
      return next
    })

  const submit = async () => {
    setBusy(true)
    setError(null)
    const result = await updateSession({
      sessionId: session.id,
      type,
      title: title.trim(),
      goal: goal.trim() === '' ? null : goal.trim(),
      why: why.trim() === '' ? null : why.trim(),
      target: target.trim() === '' ? null : target.trim(),
      duration,
      intensity,
      cues: cues.filter((c) => c.trim() !== ''),
      exercises,
    })
    if (result && !result.ok) {
      setError(result.message ?? 'Enregistrement impossible.')
      setBusy(false)
    }
  }

  const input =
    'field'

  return (
    <main className="wrap py-5">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div>
          <span className="eyebrow" style={{ color: SESSION_META[type].color }}>
            Modifier
          </span>
          <h1 className="dsp mt-1 text-[22px] leading-tight">{session.title}</h1>
          <p className="mt-0.5 text-[12px] text-dim">
            Seule cette journée est modifiée. Le reste du programme ne bouge pas.
          </p>
        </div>
        <Link href="/semaine" className="eyebrow shrink-0 text-dim">
          Annuler
        </Link>
      </header>

      <section className="card">
        <div className="mb-4">
          <div className="eyebrow mb-[7px]">Type de séance</div>
          <ChipGroup
            options={TYPES.map((t) => ({ value: t, label: SESSION_META[t].label }))}
            value={type}
            onChange={swapType}
          />
          <p className="mt-[7px] text-[11.5px] leading-relaxed text-dim">
            Changer de type recharge le contenu type de la discipline.
          </p>
        </div>

        <div className="mb-4">
          <label htmlFor="titre" className="eyebrow mb-[7px] block">
            Titre
          </label>
          <input id="titre" value={title} onChange={(e) => setTitle(e.target.value)} className={input} />
        </div>

        <NumPad label="Durée" value={duration} onChange={setDuration} unit="min" step={5} />
        <Scale label="Intensité prévue" value={intensity} onChange={setIntensity} max={5} />

        <div className="mb-4">
          <label htmlFor="objectif" className="eyebrow mb-[7px] block">
            Objectif
          </label>
          <textarea
            id="objectif"
            value={goal}
            onChange={(e) => setGoal(e.target.value)}
            rows={2}
            className={input}
          />
        </div>

        <div className="mb-4">
          <label htmlFor="cible" className="eyebrow mb-[7px] block">
            Cible chiffrée
          </label>
          <input id="cible" value={target} onChange={(e) => setTarget(e.target.value)} className={input} />
        </div>

        <div className="mb-0">
          <label htmlFor="pourquoi" className="eyebrow mb-[7px] block">
            Pourquoi cette séance
          </label>
          <textarea
            id="pourquoi"
            value={why}
            onChange={(e) => setWhy(e.target.value)}
            rows={3}
            className={input}
          />
        </div>
      </section>

      <section className="mt-5">
        <div className="mb-2.5 flex items-center justify-between">
          <h2 className="eyebrow">Exercices</h2>
          <span className="num text-[11px] text-dim">{exercises.length}</span>
        </div>

        <div className="flex flex-col gap-2">
          {exercises.map((e, i) => (
            <div key={`${i}-${e.n}`} className="card">
              <div className="mb-3 flex items-start gap-2">
                <input
                  value={e.n}
                  onChange={(ev) => patch(i, 'n', ev.target.value)}
                  aria-label={`Nom de l'exercice ${i + 1}`}
                  className={`${input} text-[14px]`}
                />
                <div className="flex shrink-0 gap-1">
                  <button
                    type="button"
                    onClick={() => move(i, -1)}
                    disabled={i === 0}
                    aria-label="Monter"
                    className="h-11 w-9 rounded-[9px] border border-line2 bg-bg2 text-[13px] text-mut disabled:opacity-30"
                  >
                    ↑
                  </button>
                  <button
                    type="button"
                    onClick={() => move(i, 1)}
                    disabled={i === exercises.length - 1}
                    aria-label="Descendre"
                    className="h-11 w-9 rounded-[9px] border border-line2 bg-bg2 text-[13px] text-mut disabled:opacity-30"
                  >
                    ↓
                  </button>
                  <button
                    type="button"
                    onClick={() => setExercises((prev) => prev.filter((_, j) => j !== i))}
                    aria-label="Supprimer"
                    className="h-11 w-9 rounded-[9px] border border-line2 bg-bg2 text-[13px] text-bad"
                  >
                    ×
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <label className="block">
                  <span className="eyebrow mb-1 block text-[9.5px]">Séries</span>
                  <input
                    type="number"
                    min={1}
                    max={20}
                    value={e.sets}
                    onChange={(ev) => patch(i, 'sets', Number(ev.target.value))}
                    className={`${input} num`}
                  />
                </label>
                <label className="block">
                  <span className="eyebrow mb-1 block text-[9.5px]">Répétitions</span>
                  <input
                    value={e.reps}
                    onChange={(ev) => patch(i, 'reps', ev.target.value)}
                    className={input}
                  />
                </label>
                <label className="block">
                  <span className="eyebrow mb-1 block text-[9.5px]">Repos (s)</span>
                  <input
                    type="number"
                    min={0}
                    max={900}
                    step={15}
                    value={e.rest}
                    onChange={(ev) => patch(i, 'rest', Number(ev.target.value))}
                    className={`${input} num`}
                  />
                </label>
                <label className="block">
                  <span className="eyebrow mb-1 block text-[9.5px]">RIR</span>
                  <input
                    type="number"
                    min={0}
                    max={5}
                    value={e.rir}
                    onChange={(ev) => patch(i, 'rir', Number(ev.target.value))}
                    className={`${input} num`}
                  />
                </label>
              </div>

              <label className="mt-2 block">
                <span className="eyebrow mb-1 block text-[9.5px]">Consigne</span>
                <textarea
                  value={e.cue}
                  onChange={(ev) => patch(i, 'cue', ev.target.value)}
                  rows={2}
                  className={input}
                />
              </label>

              {e.test && (
                <p className="mt-2 text-[11.5px] leading-relaxed text-warn">
                  Série de test : le résultat deviendra ton repère officiel.
                </p>
              )}
            </div>
          ))}
        </div>

        <Button
          variant="ghost"
          small
          onClick={() => setExercises((prev) => [...prev, { ...EMPTY_EXERCISE }])}
          className="mt-2"
        >
          Ajouter un exercice
        </Button>
      </section>

      {error && (
        <p className="mt-4 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {error}
        </p>
      )}

      <div className="mt-5">
        <Button onClick={submit} disabled={busy || title.trim() === ''}>
          {busy ? 'Enregistrement…' : 'Enregistrer la séance'}
        </Button>
      </div>
    </main>
  )
}
