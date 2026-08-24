'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { ChipGroup, ChipMulti, Chip } from '@/components/ui/chip'
import { Field, Question } from '@/components/ui/field'
import { baseWeeklyKm, runSplit, weekVolume } from '@/lib/engine/program'
import {
  EQUIPMENT_LABELS,
  EXPERIENCE_LABELS,
  POOL_LABELS,
  STROKE_LABELS,
  WEEKDAY_LABELS,
  type BenchmarkClaim,
  type OnboardingInput,
} from '@/lib/validation/onboarding'
import { completeOnboarding } from './actions'

type ClaimKey = 'pullups' | 'dips' | 'muscleups' | 'legraises'
type ClaimDraft = { mode: BenchmarkClaim['mode']; value: string }

interface Draft {
  runFrequency: number | null
  runWeeklyKm: string
  runLongestKm: string
  runExperience: OnboardingInput['running']['experience'] | null
  swimFrequency: number | null
  swimStroke: OnboardingInput['swimming']['stroke'] | null
  swimContinuousM: string
  swimPoolAccess: OnboardingInput['swimming']['poolAccess'] | null
  equipment: OnboardingInput['street']['equipment']
  claims: Record<ClaimKey, ClaimDraft>
  name: string
  heightCm: string
  currentKg: string
  goalKg: string
  restWeekday: number
  sessionMinutes: string
  allowDoubles: boolean
  raceDate: string
}

const EMPTY_CLAIM: ClaimDraft = { mode: 'untested', value: '' }

const INITIAL: Draft = {
  runFrequency: null,
  runWeeklyKm: '',
  runLongestKm: '',
  runExperience: null,
  swimFrequency: null,
  swimStroke: null,
  swimContinuousM: '',
  swimPoolAccess: null,
  equipment: [],
  claims: {
    pullups: { ...EMPTY_CLAIM },
    dips: { ...EMPTY_CLAIM },
    muscleups: { ...EMPTY_CLAIM },
    legraises: { ...EMPTY_CLAIM },
  },
  name: '',
  heightCm: '',
  currentKg: '',
  goalKg: '',
  restWeekday: 1,
  sessionMinutes: '60',
  allowDoubles: false,
  raceDate: '',
}

const STEPS = ['Course', 'Natation', 'Barre', 'Physique', 'Disponibilité'] as const

const CLAIM_LABELS: Record<ClaimKey, string> = {
  pullups: 'Tractions strictes',
  dips: 'Dips',
  muscleups: 'Muscle-ups consécutifs',
  legraises: 'Relevés de jambes suspendu',
}

const num = (s: string): number => {
  const v = Number(s.replace(',', '.'))
  return Number.isFinite(v) ? v : NaN
}

function claimOf(draft: ClaimDraft): BenchmarkClaim {
  if (draft.mode === 'untested') return { mode: 'untested' }
  return { mode: draft.mode, value: num(draft.value) }
}

/** Un repère est valide s'il est déclaré inconnu, ou chiffré. */
function claimReady(draft: ClaimDraft): boolean {
  return draft.mode === 'untested' || (num(draft.value) >= 1 && num(draft.value) <= 999)
}

function BenchmarkPicker({
  label,
  draft,
  onChange,
}: {
  label: string
  draft: ClaimDraft
  onChange: (d: ClaimDraft) => void
}) {
  return (
    <div className="mb-4 border-t border-line pt-4 first:border-0 first:pt-0">
      <div className="mb-[9px] text-[13.5px]">{label}</div>
      <div className="flex flex-wrap gap-2">
        <Chip active={draft.mode === 'untested'} onClick={() => onChange({ mode: 'untested', value: '' })}>
          À tester
        </Chip>
        <Chip active={draft.mode === 'atleast'} onClick={() => onChange({ ...draft, mode: 'atleast' })}>
          J&apos;en fais au moins
        </Chip>
        <Chip active={draft.mode === 'max'} onClick={() => onChange({ ...draft, mode: 'max' })}>
          Mon max testé
        </Chip>
      </div>
      {draft.mode !== 'untested' && (
        <input
          type="number"
          inputMode="numeric"
          min={1}
          max={999}
          value={draft.value}
          onChange={(e) => onChange({ ...draft, value: e.target.value })}
          placeholder="Nombre de répétitions"
          aria-label={`${label} — nombre de répétitions`}
          className="mt-[9px] w-full rounded-[11px] border border-line2 bg-bg2 px-[13px] py-3 text-[15px] text-text outline-none focus:border-mut"
        />
      )}
    </div>
  )
}

export function OnboardingForm() {
  const [step, setStep] = useState(0)
  const [d, setD] = useState<Draft>(INITIAL)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))

  const baseKm = useMemo(() => baseWeeklyKm(num(d.runWeeklyKm) || 0), [d.runWeeklyKm])
  const firstVolume = weekVolume(1, baseKm)
  const split = runSplit(1, baseKm)

  const ready = [
    d.runFrequency !== null &&
      d.runWeeklyKm !== '' &&
      num(d.runWeeklyKm) >= 0 &&
      d.runLongestKm !== '' &&
      d.runExperience !== null,
    d.swimFrequency !== null && d.swimStroke !== null && d.swimPoolAccess !== null,
    d.equipment.length > 0 && (Object.keys(d.claims) as ClaimKey[]).every((k) => claimReady(d.claims[k])),
    d.name.trim() !== '' &&
      num(d.heightCm) >= 100 &&
      num(d.currentKg) >= 30 &&
      num(d.goalKg) >= 30,
    num(d.sessionMinutes) >= 20 && num(d.sessionMinutes) <= 180,
  ]

  const submit = async () => {
    setBusy(true)
    setError(null)
    const input: OnboardingInput = {
      running: {
        frequency: d.runFrequency ?? 0,
        weeklyKm: num(d.runWeeklyKm) || 0,
        longestKm: num(d.runLongestKm) || 0,
        experience: d.runExperience ?? 'premiere',
      },
      swimming: {
        frequency: d.swimFrequency ?? 0,
        stroke: d.swimStroke ?? 'aucune',
        continuousM: num(d.swimContinuousM) || 0,
        poolAccess: d.swimPoolAccess ?? 'rare',
      },
      street: {
        equipment: d.equipment,
        pullups: claimOf(d.claims.pullups),
        dips: claimOf(d.claims.dips),
        muscleups: claimOf(d.claims.muscleups),
        legraises: claimOf(d.claims.legraises),
      },
      body: {
        name: d.name.trim(),
        heightCm: Math.round(num(d.heightCm)),
        currentKg: num(d.currentKg),
        goalKg: num(d.goalKg),
      },
      availability: {
        restWeekday: d.restWeekday,
        sessionMinutes: Math.round(num(d.sessionMinutes)),
        allowDoubles: d.allowDoubles,
        raceDate: d.raceDate === '' ? null : d.raceDate,
      },
    }

    const result = await completeOnboarding(input)
    if (result && !result.ok) {
      setError(result.message ?? "L'enregistrement a échoué.")
      setBusy(false)
    }
  }

  const noBar = d.equipment.includes('aucun') || !d.equipment.includes('barre')
  const shortSessions = num(d.sessionMinutes) < Math.round(split.long * 7)

  return (
    <div>
      <div className="mb-6 flex gap-1.5" role="group" aria-label="Progression">
        {STEPS.map((label, i) => (
          <span
            key={label}
            className={`h-[3px] flex-1 rounded-full ${i <= step ? 'bg-text' : 'bg-line'}`}
            aria-current={i === step ? 'step' : undefined}
          />
        ))}
      </div>

      <p className="eyebrow mb-1">
        Étape {step + 1} sur {STEPS.length}
      </p>

      {step === 0 && (
        <section>
          <h2 className="dsp mb-4 text-[24px]">Où en es-tu en course ?</h2>
          <Question label="Séances par semaine, aujourd'hui">
            <ChipGroup
              options={[0, 1, 2, 3, 4, 5, 6].map((n) => ({ value: String(n), label: String(n) }))}
              value={d.runFrequency === null ? null : String(d.runFrequency)}
              onChange={(v) => set('runFrequency', Number(v))}
            />
          </Question>
          <Field
            label="Volume hebdomadaire actuel"
            suffix="km"
            type="number"
            inputMode="decimal"
            min={0}
            value={d.runWeeklyKm}
            onChange={(e) => set('runWeeklyKm', e.target.value)}
            hint="Ce chiffre fixe le volume de ta première semaine : elle ne dépassera jamais le tien de plus de 10 %. Sois honnête, partir trop haut est la première cause de blessure."
          />
          <Field
            label="Plus longue sortie récente"
            suffix="km"
            type="number"
            inputMode="decimal"
            min={0}
            value={d.runLongestKm}
            onChange={(e) => set('runLongestKm', e.target.value)}
          />
          <Question label="Ton expérience">
            <ChipGroup
              options={(
                Object.keys(EXPERIENCE_LABELS) as OnboardingInput['running']['experience'][]
              ).map((v) => ({ value: v, label: EXPERIENCE_LABELS[v] }))}
              value={d.runExperience}
              onChange={(v) => set('runExperience', v)}
            />
          </Question>
        </section>
      )}

      {step === 1 && (
        <section>
          <h2 className="dsp mb-4 text-[24px]">Et dans l&apos;eau ?</h2>
          <Question label="Séances par semaine">
            <ChipGroup
              options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
              value={d.swimFrequency === null ? null : String(d.swimFrequency)}
              onChange={(v) => set('swimFrequency', Number(v))}
            />
          </Question>
          <Question label="Ta nage">
            <ChipGroup
              options={(Object.keys(STROKE_LABELS) as OnboardingInput['swimming']['stroke'][]).map(
                (v) => ({ value: v, label: STROKE_LABELS[v] }),
              )}
              value={d.swimStroke}
              onChange={(v) => set('swimStroke', v)}
            />
          </Question>
          <Field
            label="Distance nagée sans pause"
            suffix="m"
            type="number"
            inputMode="numeric"
            min={0}
            value={d.swimContinuousM}
            onChange={(e) => set('swimContinuousM', e.target.value)}
            hint="Laisse vide si tu ne l'as jamais comptée. Elle s'affichera « à mesurer » jusqu'à ta première séance, sans fausser ton score."
          />
          <Question label="Accès à la piscine">
            <ChipGroup
              options={(Object.keys(POOL_LABELS) as OnboardingInput['swimming']['poolAccess'][]).map(
                (v) => ({ value: v, label: POOL_LABELS[v] }),
              )}
              value={d.swimPoolAccess}
              onChange={(v) => set('swimPoolAccess', v)}
            />
          </Question>
        </section>
      )}

      {step === 2 && (
        <section>
          <h2 className="dsp mb-4 text-[24px]">Barre et matériel</h2>
          <Question label="Ce dont tu disposes" hint="Plusieurs choix possibles.">
            <ChipMulti
              options={(
                Object.keys(EQUIPMENT_LABELS) as OnboardingInput['street']['equipment']
              ).map((v) => ({ value: v, label: EQUIPMENT_LABELS[v] }))}
              value={d.equipment}
              onChange={(v) => set('equipment', v)}
            />
          </Question>
          {noBar && d.equipment.length > 0 && (
            <p className="mb-4 rounded-[11px] border border-warn/40 bg-warn/10 p-3 text-[12.5px] leading-relaxed text-text">
              Sans barre de traction, les séances haut du corps du programme ne sont pas
              réalisables telles quelles. Un parc, une aire de street workout ou une barre de
              porte suffisent.
            </p>
          )}

          <div className="card mt-2">
            <p className="mb-4 text-[12.5px] leading-relaxed text-mut">
              Réponds uniquement ce que tu sais. Un repère non mesuré reste « À TESTER » et sort
              du calcul de ton score : il ne sera jamais deviné.
            </p>
            {(Object.keys(CLAIM_LABELS) as ClaimKey[]).map((k) => (
              <BenchmarkPicker
                key={k}
                label={CLAIM_LABELS[k]}
                draft={d.claims[k]}
                onChange={(c) => setD((p) => ({ ...p, claims: { ...p.claims, [k]: c } }))}
              />
            ))}
          </div>
        </section>
      )}

      {step === 3 && (
        <section>
          <h2 className="dsp mb-4 text-[24px]">Toi</h2>
          <Field
            label="Prénom"
            type="text"
            autoComplete="given-name"
            value={d.name}
            onChange={(e) => set('name', e.target.value)}
          />
          <Field
            label="Taille"
            suffix="cm"
            type="number"
            inputMode="numeric"
            value={d.heightCm}
            onChange={(e) => set('heightCm', e.target.value)}
          />
          <Field
            label="Poids actuel"
            suffix="kg"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={d.currentKg}
            onChange={(e) => set('currentKg', e.target.value)}
          />
          <Field
            label="Poids visé"
            suffix="kg"
            type="number"
            inputMode="decimal"
            step="0.1"
            value={d.goalKg}
            onChange={(e) => set('goalKg', e.target.value)}
            hint="Au-delà de 0,25 kg par semaine, la prise se fait surtout en gras. L'app te le signalera."
          />
        </section>
      )}

      {step === 4 && (
        <section>
          <h2 className="dsp mb-4 text-[24px]">Ton organisation</h2>
          <Question
            label="Jour de repos"
            hint="Tout le microcycle se cale sur ce jour. Tu pourras le déplacer plus tard."
          >
            <ChipGroup
              options={WEEKDAY_LABELS.map((label, i) => ({
                value: String(i),
                label: label.slice(0, 3),
              }))}
              value={String(d.restWeekday)}
              onChange={(v) => set('restWeekday', Number(v))}
            />
          </Question>
          <Field
            label="Temps disponible par séance"
            suffix="min"
            type="number"
            inputMode="numeric"
            min={20}
            max={180}
            value={d.sessionMinutes}
            onChange={(e) => set('sessionMinutes', e.target.value)}
          />
          {shortSessions && (
            <p className="mb-4 rounded-[11px] border border-warn/40 bg-warn/10 p-3 text-[12.5px] leading-relaxed text-text">
              Ta sortie longue de première semaine demandera environ{' '}
              {Math.round(split.long * 7)} min. Prévois un créneau plus large ce jour-là, ou
              accepte de la couper.
            </p>
          )}
          <Question
            label="Doublés"
            hint="Deux séances dans la même journée. Refusés, le travail des jambes est enchaîné au footing du mercredi."
          >
            <ChipGroup
              options={[
                { value: 'non', label: 'Aucun doublé' },
                { value: 'oui', label: 'Doublés acceptés' },
              ]}
              value={d.allowDoubles ? 'oui' : 'non'}
              onChange={(v) => set('allowDoubles', v === 'oui')}
            />
          </Question>
          <Field
            label="Date du marathon (facultatif)"
            type="date"
            value={d.raceDate}
            onChange={(e) => set('raceDate', e.target.value)}
            hint="Renseignée, elle cale les phases du programme. L'app dira franchement si le temps disponible est trop court."
          />

          <div className="card mt-2">
            <div className="eyebrow mb-2">Ce qui va être généré</div>
            <ul className="flex flex-col gap-1.5 text-[13px] text-mut">
              <li>
                <b className="text-text">{firstVolume} km</b> de course la première semaine, calés
                sur ce que tu cours déjà — jamais plus de 10 % au-dessus.
              </li>
              <li>
                Répartition : {split.fundamental} km en endurance, {split.easy} km en footing
                souple, {split.long} km en sortie longue.
              </li>
              <li>
                Repos le {WEEKDAY_LABELS[d.restWeekday]?.toLowerCase()}, 8 semaines de séances
                d&apos;avance.
              </li>
            </ul>
          </div>
        </section>
      )}

      {error && (
        <p className="mt-4 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        {step > 0 && (
          <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={busy}>
            Retour
          </Button>
        )}
        {step < STEPS.length - 1 ? (
          <Button onClick={() => setStep((s) => s + 1)} disabled={!ready[step]}>
            Continuer
          </Button>
        ) : (
          <Button onClick={submit} disabled={!ready[step] || busy}>
            {busy ? 'Génération…' : 'Générer mon programme'}
          </Button>
        )}
      </div>
    </div>
  )
}
