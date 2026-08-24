'use client'

import Link from 'next/link'
import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChipGroup } from '@/components/ui/chip'
import { NumPad, Scale } from '@/components/ui/numpad'
import { RestTimer } from '@/components/ui/rest-timer'
import { pace } from '@/lib/engine/math'
import type { Exercise, Session } from '@/lib/engine/types'
import { SESSION_META } from '@/lib/ui/session-meta'
import { submitOrQueue } from '@/lib/offline/client'
import type { FinishSessionInput } from '@/lib/validation/session'
import { finishSession } from '../actions'
import type { StrengthSet } from '@/lib/validation/session'

type Phase = 'work' | 'rest' | 'log' | 'wrap'

interface FlatSet {
  exercise: Exercise
  exerciseIndex: number
  setIndex: number
}

/** Les exercices sont aplatis en séries : on avance une série à la fois. */
function flatten(exercises: Exercise[]): FlatSet[] {
  const out: FlatSet[] = []
  exercises.forEach((exercise, exerciseIndex) => {
    for (let setIndex = 0; setIndex < exercise.sets; setIndex++) {
      out.push({ exercise, exerciseIndex, setIndex })
    }
  })
  return out
}

export function SessionRunner({ session }: { session: Session }) {
  const isStrength = session.kind === 'strength'
  const meta = SESSION_META[session.type]

  const flat = useMemo(
    () => (isStrength ? flatten(session.exercises) : []),
    [isStrength, session.exercises],
  )

  const [phase, setPhase] = useState<Phase>(
    isStrength && flat.length > 0 ? 'work' : isStrength ? 'wrap' : 'log',
  )
  const [cursor, setCursor] = useState(0)
  const [logged, setLogged] = useState<StrengthSet[]>([])
  const [reps, setReps] = useState(0)
  const [rir, setRir] = useState<number | null>(null)
  const [startedAt] = useState(() => Date.now())

  // Course
  const [km, setKm] = useState(0)
  const [minutes, setMinutes] = useState(session.duration || 0)
  const [hr, setHr] = useState(0)
  const [elev, setElev] = useState(0)
  const [finisherDone, setFinisherDone] = useState<boolean | null>(null)

  // Natation
  const [swimMinutes, setSwimMinutes] = useState(session.duration || 45)
  const [distance, setDistance] = useState(0)
  const [continuous, setContinuous] = useState(0)
  const [pauses, setPauses] = useState(0)
  const [stroke, setStroke] = useState<string | null>(null)

  // Ressenti
  const [rpe, setRpe] = useState<number | null>(null)
  const [fatigue, setFatigue] = useState<number | null>(null)
  const [sleep, setSleep] = useState(7)
  const [pain, setPain] = useState('')
  const [note, setNote] = useState('')

  const [busy, setBusy] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [enFile, setEnFile] = useState(false)

  const current = flat[cursor]
  const isTest = !!current?.exercise.test
  const elapsedMinutes = () => Math.max(1, Math.round((Date.now() - startedAt) / 60000))

  const validateSet = () => {
    if (!current) return
    setLogged((prev) => [
      ...prev,
      {
        exerciseIndex: current.exerciseIndex,
        name: current.exercise.n,
        reps,
        rir,
        test: current.exercise.test ?? null,
      },
    ])
    setReps(0)
    setRir(null)
    if (cursor + 1 >= flat.length) {
      setPhase('wrap')
    } else {
      setPhase(current.exercise.rest > 0 ? 'rest' : 'work')
      setCursor(cursor + 1)
    }
  }

  const submit = async () => {
    if (rpe === null || fatigue === null) return
    setBusy(true)
    setError(null)

    const payload: FinishSessionInput = {
      sessionId: session.id,
      rpe,
      fatigue,
      sleep,
      pain: pain.trim() === '' ? null : pain.trim(),
      note: note.trim() === '' ? null : note.trim(),
      ...(session.kind === 'run'
        ? {
            run: {
              km,
              minutes,
              hr: hr > 0 ? hr : null,
              elev: elev > 0 ? elev : null,
              ...(session.finisher ? { finisherDone: finisherDone === true } : {}),
            },
          }
        : {}),
      ...(session.kind === 'swim'
        ? {
            swim: {
              minutes: swimMinutes,
              distance: distance > 0 ? distance : null,
              continuous,
              pauses: pauses > 0 ? pauses : null,
              stroke,
              crawl: stroke === 'Crawl' || stroke === 'Les deux',
            },
          }
        : {}),
      ...(isStrength
        ? { strength: { sets: logged, minutes: elapsedMinutes() } }
        : {}),
    }

    // Hors ligne, la séance part en file plutôt que d'être perdue. L'identifiant
    // vient de la séance : valider deux fois ne crée pas deux entrées.
    const outcome = await submitOrQueue(
      'finishSession',
      `seance-${session.id}`,
      payload,
      () => finishSession(payload),
    )

    if (outcome.queued) {
      setEnFile(true)
      setBusy(false)
      return
    }

    if (!outcome.ok) {
      setError(outcome.message ?? 'Enregistrement impossible.')
      setBusy(false)
    }
  }

  const livePace = km > 0 && minutes > 0 ? `${pace(minutes, km)}/km` : '—'
  const canFinish = rpe !== null && fatigue !== null
  const runReady = km > 0 && minutes > 0 && (!session.finisher || finisherDone !== null)
  const swimReady = swimMinutes > 0 && continuous > 0 && stroke !== null

  return (
    <main className="wrap wrap-etroit min-h-screen py-5">
      <header className="mb-5 flex items-start justify-between gap-4">
        <div className="min-w-0">
          <span className="eyebrow" style={{ color: meta.color }}>
            {meta.label}
          </span>
          <h1 className="dsp mt-1 text-[22px] leading-tight">{session.title}</h1>
        </div>
        <Link href="/" className="eyebrow shrink-0 text-dim">
          Quitter
        </Link>
      </header>

      {/* ── Force : série par série ── */}
      {phase === 'work' && current && (
        <section>
          <div className="mb-3 flex items-center justify-between">
            <span className="eyebrow">
              Série {cursor + 1} sur {flat.length}
            </span>
            <span className="num text-[12px] text-dim">
              {current.setIndex + 1} / {current.exercise.sets} de cet exercice
            </span>
          </div>

          <div className="card">
            <h2
              className="dsp text-[21px] leading-tight"
              style={{ color: isTest ? 'var(--warn)' : 'var(--text)' }}
            >
              {current.exercise.n}
            </h2>
            <p className="num mt-1 text-[14px] text-mut">
              Objectif : {current.exercise.reps}
              {current.exercise.rir > 0 ? ` · RIR ${current.exercise.rir}` : ' · jusqu’à l’échec'}
            </p>
            <p className="mt-3 text-[12.5px] leading-relaxed text-mut">{current.exercise.cue}</p>

            {isTest && (
              <p className="mt-3 rounded-[11px] border border-warn/40 bg-warn/10 p-3 text-[12.5px] leading-relaxed text-text">
                Série de test. Le chiffre que tu saisis devient ton repère officiel et entre dans
                ton score. Arrête dès que la technique se dégrade.
              </p>
            )}

            <div className="mt-4">
              <NumPad
                label={current.exercise.unit === 's' ? 'Secondes tenues' : 'Répétitions réalisées'}
                value={reps}
                onChange={setReps}
                unit={current.exercise.unit === 's' ? 's' : 'reps'}
              />
              {!isTest && (
                <Scale
                  label="Répétitions encore en réserve"
                  value={rir}
                  onChange={setRir}
                  max={5}
                  hint="0 = tu ne pouvais plus en faire une seule."
                />
              )}
            </div>

            <Button onClick={validateSet} disabled={reps <= 0}>
              Valider la série
            </Button>
          </div>

          <button
            type="button"
            onClick={() => setPhase('wrap')}
            className="eyebrow mx-auto mt-5 block text-dim"
          >
            Terminer la séance ici
          </button>
        </section>
      )}

      {/* ── Repos ── */}
      {phase === 'rest' && current && (
        <section>
          <RestTimer seconds={current.exercise.rest} onDone={() => setPhase('work')} />
          <div className="card mt-3">
            <div className="eyebrow mb-2">Ensuite</div>
            <p className="text-[14px]">{current.exercise.n}</p>
            <p className="num mt-1 text-[12.5px] text-mut">Objectif : {current.exercise.reps}</p>
          </div>
        </section>
      )}

      {/* ── Course ── */}
      {phase === 'log' && session.kind === 'run' && (
        <section>
          {session.target && (
            <div className="card mb-3">
              <div className="eyebrow mb-1.5">Objectif</div>
              <p className="text-[13.5px] leading-relaxed text-mut">{session.target}</p>
            </div>
          )}

          <div className="card">
            <NumPad label="Distance" value={km} onChange={setKm} unit="km" step={0.5} />
            <NumPad label="Durée" value={minutes} onChange={setMinutes} unit="min" />

            <div className="mb-4 flex items-center justify-between rounded-[11px] border border-line bg-bg2 px-3 py-3">
              <span className="eyebrow">Allure</span>
              <span className="num text-[22px]">{livePace}</span>
            </div>

            <NumPad
              label="FC moyenne"
              value={hr}
              onChange={setHr}
              unit="bpm"
              hint="Laisse à 0 si tu n'as pas de cardio : la donnée restera non mesurée plutôt que fausse."
            />
            <NumPad label="Dénivelé positif" value={elev} onChange={setElev} unit="m" step={5} />

            {session.finisher && (
              <div className="mb-4">
                <div className="eyebrow mb-1.5">{session.finisher.title}</div>
                <p className="mb-2.5 text-[12px] leading-relaxed text-dim">
                  {session.finisher.exercises.map((e) => e.n).join(', ')}.
                </p>
                <ChipGroup
                  options={[
                    { value: 'oui', label: 'Bloc effectué' },
                    { value: 'non', label: 'Pas fait' },
                  ]}
                  value={finisherDone === null ? null : finisherDone ? 'oui' : 'non'}
                  onChange={(v) => setFinisherDone(v === 'oui')}
                />
              </div>
            )}

            <Button onClick={() => setPhase('wrap')} disabled={!runReady}>
              Continuer
            </Button>
          </div>
        </section>
      )}

      {/* ── Natation ── */}
      {phase === 'log' && session.kind === 'swim' && (
        <section>
          {session.target && (
            <div className="card mb-3">
              <div className="eyebrow mb-1.5">Objectif</div>
              <p className="text-[13.5px] leading-relaxed text-mut">{session.target}</p>
            </div>
          )}

          <div className="card">
            <NumPad label="Durée" value={swimMinutes} onChange={setSwimMinutes} unit="min" />
            <NumPad
              label="Plus longue distance sans pause"
              value={continuous}
              onChange={setContinuous}
              unit="m"
              step={25}
              hint="C'est le chiffre qui décide de ton score natation, pas le total."
            />
            <NumPad
              label="Distance totale"
              value={distance}
              onChange={setDistance}
              unit="m"
              step={25}
            />
            <NumPad label="Nombre de pauses" value={pauses} onChange={setPauses} />

            <div className="mb-4">
              <div className="eyebrow mb-1.5">Nage</div>
              <ChipGroup
                options={[
                  { value: 'Brasse', label: 'Brasse' },
                  { value: 'Crawl', label: 'Crawl' },
                  { value: 'Les deux', label: 'Les deux' },
                ]}
                value={stroke}
                onChange={setStroke}
              />
            </div>

            <Button onClick={() => setPhase('wrap')} disabled={!swimReady}>
              Continuer
            </Button>
          </div>
        </section>
      )}

      {/* ── Ressenti ── */}
      {phase === 'wrap' && (
        <section>
          <h2 className="dsp mb-3 text-[20px]">Comment c&apos;est passé ?</h2>
          <div className="card">
            <Scale
              label="Effort ressenti (RPE)"
              value={rpe}
              onChange={setRpe}
              hint="1 = très facile · 10 = maximal. C'est ce chiffre qui calcule ta charge."
            />
            <Scale
              label="Fatigue générale"
              value={fatigue}
              onChange={setFatigue}
              hint="1 = frais · 10 = vidé."
            />
            <NumPad label="Sommeil de la nuit" value={sleep} onChange={setSleep} unit="h" step={0.5} />

            <div className="mb-4">
              <label htmlFor="douleur" className="eyebrow mb-[7px] block">
                Douleur ou gêne
              </label>
              <input
                id="douleur"
                value={pain}
                onChange={(e) => setPain(e.target.value)}
                placeholder="ex : tendon d'Achille gauche"
                className="w-full rounded-[11px] border border-line2 bg-bg2 px-[13px] py-3 text-[15px] text-text outline-none focus:border-mut"
              />
              <p className="mt-[7px] text-[11.5px] leading-relaxed text-dim">
                Renseignée, elle allège automatiquement les deux séances suivantes.
              </p>
            </div>

            <div className="mb-4">
              <label htmlFor="note" className="eyebrow mb-[7px] block">
                Commentaire
              </label>
              <textarea
                id="note"
                value={note}
                onChange={(e) => setNote(e.target.value)}
                rows={3}
                className="w-full rounded-[11px] border border-line2 bg-bg2 px-[13px] py-3 text-[15px] text-text outline-none focus:border-mut"
              />
            </div>

            {error && (
              <p className="mb-3 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
                {error}
              </p>
            )}

            {enFile ? (
              <div className="rounded-[11px] border border-warn/40 bg-warn/10 p-3">
                <p className="text-[12.5px] leading-relaxed text-text">
                  <b>Séance gardée sur l&apos;appareil.</b> Elle sera envoyée dès que la connexion
                  revient. Tant qu&apos;elle n&apos;est pas partie, elle ne compte pas encore dans
                  ton score.
                </p>
                <Link href="/" className="eyebrow mt-2.5 inline-block text-warn">
                  Retour à l&apos;accueil
                </Link>
              </div>
            ) : (
              <Button onClick={submit} disabled={!canFinish || busy}>
                {busy ? 'Enregistrement…' : 'Valider la séance'}
              </Button>
            )}
          </div>
        </section>
      )}
    </main>
  )
}
