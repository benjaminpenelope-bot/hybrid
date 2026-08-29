'use client'

import { useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Chip, ChipGroup, ChipMulti } from '@/components/ui/chip'
import { Field, Question } from '@/components/ui/field'
import {
  EQUIPMENT_LABELS,
  NIVEAUX,
  NIVEAU_LABELS,
  OBJECTIFS,
  OBJECTIF_LABELS,
  POOL_LABELS,
  SPORTS,
  SPORT_LABELS,
  STROKE_LABELS,
  WEEKDAY_LABELS,
  type BenchmarkClaim,
  type OnboardingInput,
} from '@/lib/validation/onboarding'
import { completeOnboarding } from './actions'

type Sport = (typeof SPORTS)[number]
type Objectif = (typeof OBJECTIFS)[number]
type Niveau = (typeof NIVEAUX)[number]
type ClaimKey = 'pullups' | 'dips' | 'muscleups' | 'legraises'
type ClaimDraft = { mode: BenchmarkClaim['mode']; value: string }

/**
 * Brouillon du questionnaire.
 *
 * Les nombres sont conservés en texte tant que l'athlète tape : un champ vide
 * doit rester vide, et non retomber à zéro. La conversion n'a lieu qu'à
 * l'envoi, ou pour vérifier qu'une étape est complète.
 */
interface Draft {
  name: string
  sex: 'homme' | 'femme' | 'autre' | null
  birthDate: string
  heightCm: string
  currentKg: string
  goalKg: string
  level: Niveau | null

  sports: Sport[]

  goalMain: Objectif | null
  goalMainDate: string
  goalSecond: Objectif | null
  goalSecondDate: string

  weekdays: number[]
  sessionMinutes: string
  allowDoubles: boolean

  runFrequency: number | null
  runWeeklyKm: string
  runLongestKm: string

  swimFrequency: number | null
  swimStroke: NonNullable<OnboardingInput['swimming']>['stroke'] | null
  swimContinuousM: string
  swimPoolAccess: NonNullable<OnboardingInput['swimming']>['poolAccess'] | null

  equipment: NonNullable<OnboardingInput['force']>['equipment']
  claims: Record<ClaimKey, ClaimDraft>

  limitZone: string
  limitDescription: string
}

const EMPTY_CLAIM: ClaimDraft = { mode: 'untested', value: '' }

const INITIAL: Draft = {
  name: '',
  sex: null,
  birthDate: '',
  heightCm: '',
  currentKg: '',
  goalKg: '',
  level: null,
  sports: [],
  goalMain: null,
  goalMainDate: '',
  goalSecond: null,
  goalSecondDate: '',
  weekdays: [],
  sessionMinutes: '60',
  allowDoubles: false,
  runFrequency: null,
  runWeeklyKm: '',
  runLongestKm: '',
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
  limitZone: '',
  limitDescription: '',
}

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
          className="mt-[9px] w-full rounded-[11px] border border-line2 bg-bg2 px-[13px] py-3 text-base text-text outline-none focus:border-mut"
        />
      )}
    </div>
  )
}

/** Identifiants d'étape. La liste affichée se compose selon les sports déclarés. */
type StepId = 'profil' | 'sports' | 'objectifs' | 'dispo' | 'course' | 'natation' | 'force' | 'limites'

const STEP_TITRES: Record<StepId, string> = {
  profil: 'Toi',
  sports: 'Tes sports',
  objectifs: 'Tes objectifs',
  dispo: 'Ta disponibilité',
  course: 'Ta course',
  natation: 'Ta natation',
  force: 'Ta force',
  limites: 'Tes limitations',
}

export function OnboardingForm() {
  const [index, setIndex] = useState(0)
  const [d, setD] = useState<Draft>(INITIAL)
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))

  const faitDeLaForce = d.sports.includes('strength') || d.sports.includes('street_workout')

  /*
   * Les étapes propres à une discipline n'existent que si elle est déclarée.
   * Un cycliste ne verra jamais de question sur sa nage — c'est tout l'intérêt
   * de demander les sports avant le détail.
   */
  const steps = useMemo<StepId[]>(() => {
    const s: StepId[] = ['profil', 'sports', 'objectifs', 'dispo']
    if (d.sports.includes('running')) s.push('course')
    if (d.sports.includes('swimming')) s.push('natation')
    if (faitDeLaForce) s.push('force')
    s.push('limites')
    return s
  }, [d.sports, faitDeLaForce])

  // Un sport retiré peut raccourcir la liste sous l'index courant.
  const step = steps[Math.min(index, steps.length - 1)]!

  const pret: Record<StepId, boolean> = {
    profil:
      d.name.trim().length > 0 &&
      d.level !== null &&
      num(d.heightCm) >= 100 &&
      num(d.heightCm) <= 250 &&
      num(d.currentKg) >= 30 &&
      num(d.goalKg) >= 30,
    sports: d.sports.length > 0,
    objectifs: d.goalMain !== null && d.goalSecond !== d.goalMain,
    dispo: d.weekdays.length >= 2 && d.weekdays.length <= 6 && num(d.sessionMinutes) >= 20,
    course:
      d.runFrequency !== null && num(d.runWeeklyKm) >= 0 && num(d.runLongestKm) >= 0,
    natation: d.swimFrequency !== null && d.swimStroke !== null && d.swimPoolAccess !== null,
    force: Object.values(d.claims).every(claimReady),
    limites: true,
  }

  const submit = async () => {
    setBusy(true)
    setError(null)

    const payload: OnboardingInput = {
      profil: {
        name: d.name.trim(),
        sex: d.sex,
        birthDate: d.birthDate || null,
        heightCm: Math.round(num(d.heightCm)),
        currentKg: num(d.currentKg),
        goalKg: num(d.goalKg),
        level: d.level!,
      },
      sports: d.sports,
      objectifs: {
        principal: { type: d.goalMain!, date: d.goalMainDate || null },
        secondaire: d.goalSecond ? { type: d.goalSecond, date: d.goalSecondDate || null } : null,
      },
      disponibilites: {
        availableWeekdays: d.weekdays,
        sessionMinutes: Math.round(num(d.sessionMinutes)),
        allowDoubles: d.allowDoubles,
      },
      // Une seule limitation au questionnaire : au-delà, c'est une
      // consultation, pas un formulaire d'inscription.
      limitations: d.limitZone.trim()
        ? [{ zone: d.limitZone.trim(), description: d.limitDescription.trim() }]
        : [],
      running: d.sports.includes('running')
        ? {
            frequency: d.runFrequency!,
            weeklyKm: num(d.runWeeklyKm),
            longestKm: num(d.runLongestKm),
          }
        : null,
      swimming: d.sports.includes('swimming')
        ? {
            frequency: d.swimFrequency!,
            stroke: d.swimStroke!,
            continuousM: d.swimContinuousM ? num(d.swimContinuousM) : 0,
            poolAccess: d.swimPoolAccess!,
          }
        : null,
      force: faitDeLaForce
        ? {
            equipment: d.equipment,
            pullups: claimOf(d.claims.pullups),
            dips: claimOf(d.claims.dips),
            muscleups: claimOf(d.claims.muscleups),
            legraises: claimOf(d.claims.legraises),
          }
        : null,
    }

    const r = await completeOnboarding(payload)
    if (!r.ok) {
      setError(r.message ?? 'Enregistrement impossible.')
      setBusy(false)
    }
  }

  return (
    <div>
      <div className="mb-6 flex gap-1.5" role="group" aria-label="Progression">
        {steps.map((s, i) => (
          <span
            key={s}
            className={`h-1 flex-1 rounded-full ${i <= index ? 'bg-text' : 'bg-line2'}`}
            aria-hidden
          />
        ))}
      </div>

      <p className="eyebrow mb-1">
        Étape {index + 1} sur {steps.length}
      </p>
      <h2 className="dsp mb-5 text-[24px]">{STEP_TITRES[step]}</h2>

      {step === 'profil' && (
        <section>
          <Field
            label="Prénom"
            value={d.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ton prénom"
          />
          <Question label="Ton niveau">
            <ChipGroup
              options={NIVEAUX.map((n) => ({ value: n, label: NIVEAU_LABELS[n] }))}
              value={d.level}
              onChange={(v) => set('level', v)}
            />
          </Question>
          <Question
            label="Sexe"
            hint="Facultatif. Il n’entre dans aucun calcul pour l’instant, et tu peux le laisser vide."
          >
            <ChipGroup
              options={[
                { value: 'homme' as const, label: 'Homme' },
                { value: 'femme' as const, label: 'Femme' },
                { value: 'autre' as const, label: 'Autre' },
              ]}
              value={d.sex}
              onChange={(v) => set('sex', v)}
            />
          </Question>
          <Field
            label="Date de naissance"
            type="date"
            value={d.birthDate}
            onChange={(e) => set('birthDate', e.target.value)}
            hint="Facultative."
          />
          <Field
            label="Taille"
            type="number"
            inputMode="numeric"
            suffix="cm"
            value={d.heightCm}
            onChange={(e) => set('heightCm', e.target.value)}
          />
          <Field
            label="Poids actuel"
            type="number"
            inputMode="decimal"
            suffix="kg"
            value={d.currentKg}
            onChange={(e) => set('currentKg', e.target.value)}
          />
          <Field
            label="Poids visé"
            type="number"
            inputMode="decimal"
            suffix="kg"
            value={d.goalKg}
            onChange={(e) => set('goalKg', e.target.value)}
            hint="Mets le même que ton poids actuel si tu ne cherches pas à le changer."
          />
        </section>
      )}

      {step === 'sports' && (
        <section>
          <Question
            label="Ce que tu pratiques"
            hint="On ne te posera de questions que sur ces disciplines."
          >
            <ChipMulti
              options={SPORTS.map((s) => ({ value: s, label: SPORT_LABELS[s] }))}
              value={d.sports}
              onChange={(v) => set('sports', v)}
            />
          </Question>
          {d.sports.includes('cycling') && (
            <p className="rounded-[11px] border border-warn/40 bg-warn/10 p-3 text-[12.5px] leading-relaxed text-text">
              Le cyclisme est enregistré dans ton profil, mais le générateur ne
              produit pas encore de séances de vélo. Elles arriveront avec le
              planificateur multi-sport.
            </p>
          )}
        </section>
      )}

      {step === 'objectifs' && (
        <section>
          <Question label="Ton objectif principal" hint="Celui qui tranche quand deux besoins s’opposent.">
            <ChipGroup
              options={OBJECTIFS.map((o) => ({ value: o, label: OBJECTIF_LABELS[o] }))}
              value={d.goalMain}
              onChange={(v) => set('goalMain', v)}
            />
          </Question>
          <Field
            label="Échéance"
            type="date"
            value={d.goalMainDate}
            onChange={(e) => set('goalMainDate', e.target.value)}
            hint="Facultative. Sans date, la progression se fait sans compte à rebours."
          />
          <Question
            label="Un objectif secondaire ?"
            hint="Facultatif. Il sera poursuivi tant qu’il ne compromet pas le principal."
          >
            <div className="flex flex-wrap gap-2">
              <Chip active={d.goalSecond === null} onClick={() => set('goalSecond', null)}>
                Aucun
              </Chip>
              {OBJECTIFS.filter((o) => o !== d.goalMain).map((o) => (
                <Chip key={o} active={d.goalSecond === o} onClick={() => set('goalSecond', o)}>
                  {OBJECTIF_LABELS[o]}
                </Chip>
              ))}
            </div>
          </Question>
        </section>
      )}

      {step === 'dispo' && (
        <section>
          <Question
            label="Tes jours d’entraînement"
            hint="Entre deux et six jours. Les jours non retenus deviennent tes coupures."
          >
            <div className="flex flex-wrap gap-2">
              {WEEKDAY_LABELS.map((label, jour) => (
                <Chip
                  key={jour}
                  active={d.weekdays.includes(jour)}
                  onClick={() =>
                    set(
                      'weekdays',
                      d.weekdays.includes(jour)
                        ? d.weekdays.filter((j) => j !== jour)
                        : [...d.weekdays, jour].sort((a, b) => a - b),
                    )
                  }
                >
                  {label}
                </Chip>
              ))}
            </div>
          </Question>
          <Field
            label="Durée par séance"
            type="number"
            inputMode="numeric"
            suffix="min"
            value={d.sessionMinutes}
            onChange={(e) => set('sessionMinutes', e.target.value)}
          />
          <Question label="Deux séances le même jour ?">
            <ChipGroup
              options={[
                { value: 'non' as const, label: 'Jamais' },
                { value: 'oui' as const, label: 'Possible' },
              ]}
              value={d.allowDoubles ? 'oui' : 'non'}
              onChange={(v) => set('allowDoubles', v === 'oui')}
            />
          </Question>
        </section>
      )}

      {step === 'course' && (
        <section>
          <Question label="Séances de course par semaine, aujourd’hui">
            <ChipGroup
              options={[0, 1, 2, 3, 4, 5, 6, 7].map((n) => ({ value: String(n), label: String(n) }))}
              value={d.runFrequency === null ? null : String(d.runFrequency)}
              onChange={(v) => set('runFrequency', Number(v))}
            />
          </Question>
          <Field
            label="Volume hebdomadaire actuel"
            type="number"
            inputMode="decimal"
            suffix="km"
            value={d.runWeeklyKm}
            onChange={(e) => set('runWeeklyKm', e.target.value)}
            hint="C’est ce chiffre qui fixe le point de départ. Mets 0 si tu ne cours pas encore."
          />
          <Field
            label="Ta plus longue sortie récente"
            type="number"
            inputMode="decimal"
            suffix="km"
            value={d.runLongestKm}
            onChange={(e) => set('runLongestKm', e.target.value)}
          />
        </section>
      )}

      {step === 'natation' && (
        <section>
          <Question label="Séances de natation par semaine, aujourd’hui">
            <ChipGroup
              options={[0, 1, 2, 3, 4].map((n) => ({ value: String(n), label: String(n) }))}
              value={d.swimFrequency === null ? null : String(d.swimFrequency)}
              onChange={(v) => set('swimFrequency', Number(v))}
            />
          </Question>
          <Question label="Ta nage">
            <ChipGroup
              options={(Object.keys(STROKE_LABELS) as (keyof typeof STROKE_LABELS)[]).map((k) => ({
                value: k,
                label: STROKE_LABELS[k],
              }))}
              value={d.swimStroke}
              onChange={(v) => set('swimStroke', v)}
            />
          </Question>
          <Field
            label="Distance nagée sans pause"
            type="number"
            inputMode="numeric"
            suffix="m"
            value={d.swimContinuousM}
            onChange={(e) => set('swimContinuousM', e.target.value)}
            hint="Laisse vide si tu ne l’as jamais mesurée. Elle s’affichera « À TESTER » plutôt que d’être devinée."
          />
          <Question label="Accès à la piscine">
            <ChipGroup
              options={(Object.keys(POOL_LABELS) as (keyof typeof POOL_LABELS)[]).map((k) => ({
                value: k,
                label: POOL_LABELS[k],
              }))}
              value={d.swimPoolAccess}
              onChange={(v) => set('swimPoolAccess', v)}
            />
          </Question>
        </section>
      )}

      {step === 'force' && (
        <section>
          <Question label="Ton matériel">
            <ChipMulti
              options={(Object.keys(EQUIPMENT_LABELS) as (keyof typeof EQUIPMENT_LABELS)[]).map((k) => ({
                value: k,
                label: EQUIPMENT_LABELS[k],
              }))}
              value={d.equipment}
              onChange={(v) => set('equipment', v)}
            />
          </Question>
          <div className="mt-6">
            <p className="eyebrow mb-1">Tes repères</p>
            <p className="mb-4 text-[11.5px] leading-relaxed text-dim">
              Un repère déclaré n’est pas un repère testé. « J’en fais au moins »
              reste marqué comme partiel jusqu’à ce que tu passes un vrai test.
            </p>
            {(Object.keys(CLAIM_LABELS) as ClaimKey[]).map((k) => (
              <BenchmarkPicker
                key={k}
                label={CLAIM_LABELS[k]}
                draft={d.claims[k]}
                onChange={(c) => set('claims', { ...d.claims, [k]: c })}
              />
            ))}
          </div>
        </section>
      )}

      {step === 'limites' && (
        <section>
          <Question
            label="Une blessure ou une gêne en cours ?"
            hint="Facultatif. Le coach allégera ce qui sollicite la zone, et ne posera jamais de diagnostic."
          >
            <Field
              label="Zone concernée"
              value={d.limitZone}
              onChange={(e) => set('limitZone', e.target.value)}
              placeholder="genou droit, épaule gauche…"
            />
            {d.limitZone.trim() && (
              <Field
                label="Précision"
                value={d.limitDescription}
                onChange={(e) => set('limitDescription', e.target.value)}
                placeholder="depuis quand, ce qui déclenche"
              />
            )}
          </Question>
          <p className="rounded-[11px] border border-line bg-bg2 p-3 text-[12.5px] leading-relaxed text-mut">
            Cette application ne pose aucun diagnostic. Une douleur qui augmente
            à l’effort ou dure plus de quelques jours doit t’amener à consulter
            un professionnel de santé.
          </p>
        </section>
      )}

      {error && (
        <p className="mt-4 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {error}
        </p>
      )}

      <div className="mt-6 flex gap-2">
        {index > 0 && (
          <Button variant="ghost" onClick={() => setIndex((i) => i - 1)} disabled={busy}>
            Retour
          </Button>
        )}
        {index < steps.length - 1 ? (
          <Button onClick={() => setIndex((i) => i + 1)} disabled={!pret[step]}>
            Continuer
          </Button>
        ) : (
          <Button onClick={submit} disabled={!pret[step] || busy}>
            {busy ? 'Génération…' : 'Générer mon programme'}
          </Button>
        )}
      </div>
    </div>
  )
}
