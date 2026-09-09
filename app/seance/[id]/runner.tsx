'use client'

import { fr } from '@/lib/ui/nombre'
import Link from 'next/link'
import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChipGroup } from '@/components/ui/chip'
import { ChoixNombre, DureeMinSec, NumPad, Scale } from '@/components/ui/numpad'
import { motivation } from '@/lib/ui/motivation'
import { propositionsDeReps } from '@/lib/ui/propositions'
import { Ressenti } from '@/components/ui/ressenti'
import { RestTimer } from '@/components/ui/rest-timer'
import { exercicesAdaptes } from '@/lib/engine/adapt'
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

  /*
   * Les exercices tels qu'ils seront reellement faits, allegement compris.
   * La seance porte la prescription entiere ; le facteur ne s'applique qu'a
   * la lecture, parce qu'il concerne cette seance et non le plan. Voir
   * `exercicesAdaptes`.
   */
  const exercices = useMemo(() => exercicesAdaptes(session), [session])

  const flat = useMemo(
    () => (isStrength ? flatten(exercices) : []),
    [isStrength, exercices],
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
  /**
   * Mesures facultatives — FC et denivele a la course, distance totale a la
   * natation. Repliees tant qu'on ne les demande pas : elles ne nourrissent
   * ni le score, ni la charge, ni le programme.
   */
  const [detail, setDetail] = useState(false)
  const [finisherDone, setFinisherDone] = useState<boolean | null>(null)

  // Natation
  const [swimMinutes, setSwimMinutes] = useState(session.duration || 45)
  const [distance, setDistance] = useState(0)
  const [continuous, setContinuous] = useState(0)
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

  /*
   * Ce qu'il reste a faire, regroupe par exercice : la liste plate compte des
   * series, l'athlete raisonne en exercices. Le premier element est
   * l'exercice de la serie qui vient, avec ses series restantes et non son
   * total.
   */
  const aVenir = useMemo(() => {
    const out: { n: string; series: number; reps: string }[] = []
    for (const f of flat.slice(cursor)) {
      const dernier = out[out.length - 1]
      if (dernier && dernier.n === f.exercise.n) dernier.series++
      else out.push({ n: f.exercise.n, series: 1, reps: f.exercise.reps })
    }
    return out
  }, [flat, cursor])

  const phrase = useMemo(
    () =>
      motivation({
        serie: cursor,
        total: flat.length,
        finDExercice: current !== undefined && current.setIndex + 1 === current.exercise.sets,
        graine: session.id,
      }),
    [cursor, flat.length, current, session.id],
  )
  const isTest = !!current?.exercise.test
  const propositions = current ? propositionsDeReps(current.exercise.reps, current.exercise.unit) : []
  const elapsedMinutes = () => Math.max(1, Math.round((Date.now() - startedAt) / 60000))

  /*
   * DUREE D'UNE SEANCE DE FORCE
   *
   * Elle etait deduite du temps passe sur l'ecran, sans jamais etre montree.
   * Une seance ouverte pour etre completee apres coup, ou parcourue jusqu'au
   * bout par le raccourci, s'enregistrait donc a une minute — et une minute
   * pour dix-sept series ecrase la charge, le ratio aigu/chronique et tout ce
   * qui en depend.
   *
   * La mesure reste la proposition, mais elle s'affiche et se corrige. En
   * dessous de cinq minutes elle n'est pas croyable : le programme reprend
   * alors la duree prevue, qui n'est pas plus vraie mais qui est visible et
   * modifiable — la course et la natation demandaient deja leur duree.
   */
  const [strengthMinutes, setStrengthMinutes] = useState<number | null>(null)

  useEffect(() => {
    if (phase !== 'wrap' || !isStrength || strengthMinutes !== null) return
    const mesure = elapsedMinutes()
    setStrengthMinutes(mesure >= 5 ? mesure : session.duration || 45)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [phase])

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
              stroke,
              crawl: stroke === 'Crawl' || stroke === 'Les deux',
            },
          }
        : {}),
      ...(isStrength
        ? { strength: { sets: logged, minutes: strengthMinutes ?? elapsedMinutes() } }
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
  const estVelo = session.kind === 'bike'
  /*
   * A velo, la distance est facultative : sur home-trainer il n'y en a pas,
   * et l'exiger obligerait a inventer un chiffre. La duree suffit — c'est
   * elle qui porte la charge.
   */
  const runReady =
    minutes > 0 && (estVelo || km > 0) && (!session.finisher || finisherDone !== null)
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
        <Link href="/aujourdhui" className="eyebrow shrink-0 text-dim">
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

            {/*
              La prescription est ecrite juste au-dessus : on la propose en
              pastilles. Aucune n'est preselectionnee — l'athlete en choisit
              une, personne ne decide a sa place — mais la serie se saisit en
              un appui au lieu d'une dizaine. Sur dix-sept series, c'est la
              difference entre garder son telephone a la main et le ranger.
              
              Rien a proposer sur un test : le nombre a saisir est justement
              celui qu'on ne connait pas.
            */}
            <div className="mt-4">
              {propositions.length > 0 ? (
                <ChoixNombre
                  key={cursor}
                  label={current.exercise.unit === 's' ? 'Secondes tenues' : 'Répétitions réalisées'}
                  value={reps}
                  onChange={setReps}
                  options={propositions}
                  unit={current.exercise.unit === 's' ? 's' : undefined}
                />
              ) : (
                <NumPad
                  label={current.exercise.unit === 's' ? 'Secondes tenues' : 'Répétitions réalisées'}
                  value={reps}
                  onChange={setReps}
                  unit={current.exercise.unit === 's' ? 's' : 'reps'}
                />
              )}
              {!isTest && (
                <Scale
                  label="Répétitions encore en réserve"
                  value={rir}
                  onChange={setRir}
                  min={0}
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
            <p className="num mt-1 text-[12.5px] text-mut">
              Objectif : {current.exercise.reps}
              {current.exercise.rir > 0 ? ` · RIR ${current.exercise.rir}` : ''} · série{' '}
              {current.setIndex + 1} sur {current.exercise.sets}
            </p>
            {/* La consigne technique, ici aussi : c'est pendant le repos qu'on
                a le temps de la lire, pas la barre en main. */}
            <p className="mt-2.5 text-[12px] leading-relaxed text-dim">{current.exercise.cue}</p>
          </div>

          {/*
            CE QUI RESTE.
            
            L'ecran ne montrait que la serie suivante. Pendant deux minutes de
            repos on regarde plus loin que ca — savoir s'il reste un exercice
            ou quatre change la facon dont on dose la serie qui vient.
          */}
          {aVenir.length > 0 && (
            <div className="card mt-3">
              <div className="mb-2.5 flex items-baseline justify-between">
                <span className="eyebrow">Ce qu’il reste</span>
                <span className="num text-[11.5px] text-dim">
                  {flat.length - cursor} série{flat.length - cursor > 1 ? 's' : ''}
                </span>
              </div>
              {/*
                Quatre lignes au plus. La liste complete tenait sur l'ecran
                d'un grand telephone et sur aucun autre : elle poussait la
                phrase sous la barre d'onglets, ou personne ne la lit. Le
                reste se compte, il n'a pas besoin d'etre detaille — savoir
                qu'il reste deux exercices suffit a doser la serie qui vient.
              */}
              <div className="flex flex-col gap-2">
                {aVenir.slice(0, 4).map((e, i) => (
                  <div key={`${e.n}-${i}`} className="flex items-baseline justify-between gap-3">
                    <span className="min-w-0 flex-1 truncate text-[13px]">{e.n}</span>
                    <span className="num shrink-0 text-[12.5px] text-mut">
                      {e.series} × {e.reps}
                    </span>
                  </div>
                ))}
                {aVenir.length > 4 && (
                  <p className="text-[12px] text-dim">
                    et {aVenir.length - 4} autre{aVenir.length - 4 > 1 ? 's' : ''} exercice
                    {aVenir.length - 4 > 1 ? 's' : ''} ensuite
                  </p>
                )}
              </div>
            </div>
          )}

          {/*
            Les phrases sont ecrites pour l'application : celles d'un auteur
            vivant lui appartiennent, et en embarquer une base reviendrait a
            redistribuer son travail. Voir `lib/ui/motivation`.
          */}
          <p className="entre mb-2 mt-5 px-2 text-center text-[13px] leading-relaxed text-dim">
            {phrase}
          </p>
        </section>
      )}

      {/* ── Course ── */}
      {phase === 'log' && (session.kind === 'run' || estVelo) && (
        <section>
          {session.target && (
            <div className="card mb-3">
              <div className="eyebrow mb-1.5">Objectif</div>
              <p className="text-[13.5px] leading-relaxed text-mut">{session.target}</p>
            </div>
          )}

          <div className="card">
            <NumPad
              label="Distance"
              value={km}
              onChange={setKm}
              unit="km"
              step={estVelo ? 1 : 0.5}
              {...(estVelo
                ? { hint: 'Facultatif : laisse à 0 sur home-trainer, la durée suffit.' }
                : {})}
            />
            {/*
              Minutes ET secondes : une sortie se chronometre. En minutes
              rondes, 36'40" devenait 36, et l'allure passait de 6:40 a 6:33
              au kilometre sans que rien ne le signale.
            */}
            <DureeMinSec label="Durée" value={minutes} onChange={setMinutes} />

            {/* L'allure au kilometre ne veut rien dire a velo : on montre la vitesse. */}
            <div className="mb-4 flex items-center justify-between rounded-[11px] border border-line bg-bg2 px-3 py-3">
              <span className="eyebrow">{estVelo ? 'Vitesse moyenne' : 'Allure'}</span>
              <span className="num text-[22px]">
                {estVelo
                  ? km > 0 && minutes > 0
                    ? `${fr((km / minutes) * 60)} km/h`
                    : '—'
                  : livePace}
              </span>
            </div>

            {/*
              Deux mesures facultatives, repliees. Elles ne servent qu'au
              resume de la seance et au contexte du coach — ni au score, ni a
              la charge, ni au programme — et la plupart des sorties se
              declarent sans elles. Les laisser depliees faisait quatre
              champs la ou deux suffisent, et donnait a croire qu'on attendait
              quelque chose.
            */}
            {detail ? (
              <>
                <NumPad
                  label="FC moyenne"
                  value={hr}
                  onChange={setHr}
                  unit="bpm"
                  hint="Laisse à 0 si tu n'as pas de cardio : la donnée restera non mesurée plutôt que fausse."
                />
                <NumPad label="Dénivelé positif" value={elev} onChange={setElev} unit="m" step={5} />
              </>
            ) : (
              <button
                type="button"
                onClick={() => setDetail(true)}
                className="mb-4 w-full rounded-[11px] border border-line px-3 py-2.5 text-[12.5px] text-mut active:bg-[rgb(255_255_255/0.05)]"
              >
                Ajouter la FC moyenne et le dénivelé
              </button>
            )}

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
            {/*
              Trois questions au lieu de cinq, et des pastilles au lieu du
              pave.
              
              On sortait d'une seance en devant taper cinq nombres, dont un —
              le nombre de pauses — que rien ne lisait : ni le score, ni la
              charge, ni le coach. Une question qui ne sert a rien coute
              pourtant autant qu'une autre.
              
              Les distances de bassin ne sont pas quelconques : 50, 100, 200,
              400. La pastille rend le cas courant instantane, « Autre » garde
              le pave pour le reste.
            */}
            <ChoixNombre
              label="Durée"
              value={swimMinutes}
              onChange={setSwimMinutes}
              options={[30, 45, 60]}
              unit="min"
              step={5}
            />
            <ChoixNombre
              label="Plus longue distance sans pause"
              value={continuous}
              onChange={setContinuous}
              options={[25, 50, 100, 200, 400]}
              unit="m"
              step={25}
              hint="C'est ce chiffre qui décide de ton score natation, pas le total."
            />
            {/*
              La distance totale est repliee : c'est la distance sans pause
              qui decide du score, et la legende juste au-dessus le dit. Le
              total ne sert qu'au volume hebdomadaire et au bilan — utile,
              mais pas au point de le demander a tout le monde a chaque
              seance.
            */}
            {detail ? (
              <ChoixNombre
                label="Distance totale"
                value={distance}
                onChange={setDistance}
                options={[500, 750, 1000, 1500, 2000]}
                unit="m"
                step={50}
              />
            ) : (
              <button
                type="button"
                onClick={() => setDetail(true)}
                className="mb-4 w-full rounded-[11px] border border-line px-3 py-2.5 text-[12.5px] text-mut active:bg-[rgb(255_255_255/0.05)]"
              >
                Ajouter la distance totale
              </button>
            )}

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
            {/*
              Cinq visages au lieu d'une echelle de 1 a 10. Le moteur recoit
              toujours un RPE, l'athlete ne voit jamais le mot : demander
              « 6 ou 7 ? » apres une seance produit une reponse arbitraire, et
              cette fausse precision se propage ensuite dans toute la charge.
            */}
            <Ressenti
              label="Comment était la séance ?"
              value={rpe}
              onChange={setRpe}
              hint="C’est ce que tu réponds ici qui permet au coach d’adapter la suite."
            />
            <Ressenti
              label="Et toi, comment tu te sens ?"
              value={fatigue}
              onChange={setFatigue}
              hint="Ton état général, pas celui de la séance."
            />
            {isStrength && (
              <NumPad
                label="Durée de la séance"
                value={strengthMinutes ?? 0}
                onChange={setStrengthMinutes}
                unit="min"
                step={5}
              />
            )}

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
                className="field"
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
                className="field"
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
                <Link href="/aujourdhui" className="eyebrow mt-2.5 inline-block text-warn">
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
