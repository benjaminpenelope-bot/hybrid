'use client'

import { useEffect, useMemo, useState } from 'react'
import { Button } from '@/components/ui/button'
import { Chip, ChipGroup, ChipMulti } from '@/components/ui/chip'
import { Field, Question } from '@/components/ui/field'
import { SilhouetteFemme, SilhouetteHomme } from '@/components/ui/silhouettes'
import {
  EQUIPMENT_LABELS,
  OBJECTIFS,
  OBJECTIF_LABELS,
  PLANIFIABLES,
  POOL_LABELS,
  SPORTS,
  SPORT_LABELS,
  STROKE_LABELS,
  WEEKDAY_LABELS,
  type BenchmarkClaim,
  type OnboardingInput,
} from '@/lib/validation/onboarding'
import { libellesDesJalons } from '@/lib/engine/goals'
import { GAIN_MAX_KG_SEMAINE } from '@/lib/engine/body'
import { ABSOLUTE_MIN_BASE, baseWeeklyKm, weekVolume } from '@/lib/engine/program'
import { fr } from '@/lib/ui/nombre'
import { ApercuProgramme } from '@/components/apercu-programme'
import { ApercuSemaine } from '@/components/apercu-semaine'
import { ChoixDefilant } from '@/components/choix-defilant'
import {
  IconAucun,
  IconBarre,
  IconCourse,
  IconJambes,
  IconNatation,
  IconVelo,
  IconDixKm,
  IconEndurance,
  IconForce,
  IconHybride,
  IconHypertrophie,
  IconHyrox,
  IconMarathon,
  IconSemi,
} from '@/components/ui/icons'
import { completeOnboarding } from './actions'

type Sport = (typeof SPORTS)[number]
type Objectif = (typeof OBJECTIFS)[number]
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
  heightCm: string
  currentKg: string
  goalKg: string

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

  limitEtat: 'aucune' | 'gene' | null
  limitZone: string
  limitDescription: string
}

const EMPTY_CLAIM: ClaimDraft = { mode: 'untested', value: '' }

const INITIAL: Draft = {
  name: '',
  sex: null,
  heightCm: '',
  currentKg: '',
  goalKg: '',
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
  limitEtat: null,
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
/** Un volume s'écrit « 31 km », pas « 31,0 km » : le demi-kilomètre ne se lit que s'il existe. */
function km(v: number): string {
  return Number.isInteger(v) ? String(v) : fr(v)
}

/** Rangée de nombres : une fréquence se choisit sur une échelle, pas dans une liste. */
function Nombres({
  valeurs,
  valeur,
  onChange,
  colonnes,
}: {
  valeurs: number[]
  valeur: number | null
  onChange: (n: number) => void
  colonnes: number
}) {
  return (
    <div className="nombres" style={{ gridTemplateColumns: `repeat(${colonnes}, minmax(0, 1fr))` }}>
      {valeurs.map((n) => (
        <button
          key={n}
          type="button"
          data-actif={valeur === n}
          aria-pressed={valeur === n}
          onClick={() => onChange(n)}
        >
          {n}
        </button>
      ))}
    </div>
  )
}

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
    /*
      Un bloc par mouvement plutot qu'un filet horizontal : les trois choix
      appartiennent visiblement au repere qu'ils qualifient, et la liste se
      parcourt d'un coup d'oeil au lieu de se lire ligne a ligne.
    */
    <div className="mb-2.5 rounded-[16px] bg-[rgb(255_255_255/0.028)] p-3.5">
      <div className="mb-2.5 text-[13.5px] font-medium tracking-[-0.01em]">{label}</div>
      <div className="flex flex-wrap gap-2">
        <Chip active={draft.mode === 'untested'} onClick={() => onChange({ mode: 'untested', value: '' })}>
          À tester
        </Chip>
        {/* Libellés courts : les trois tiennent alors sur une ligne, et le nom du mouvement juste au-dessus porte déjà le contexte. */}
        <Chip active={draft.mode === 'atleast'} onClick={() => onChange({ ...draft, mode: 'atleast' })}>
          Au moins
        </Chip>
        <Chip active={draft.mode === 'max'} onClick={() => onChange({ ...draft, mode: 'max' })}>
          Max testé
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
          className="mt-[9px] field"
        />
      )}
    </div>
  )
}

/** Identifiants d'étape. La liste affichée se compose selon les sports déclarés. */
type StepId =
  | 'objectifs'
  | 'sports'
  | 'dispo'
  | 'course'
  | 'natation'
  | 'force'
  | 'apercu'
  | 'profil'
  | 'limites'

/** Pictogramme de chaque objectif. */
const OBJECTIF_ICONES: Record<(typeof OBJECTIFS)[number], (p: { size?: number }) => React.ReactElement> = {
  marathon: IconMarathon,
  semi: IconSemi,
  dix_km: IconDixKm,
  hyrox: IconHyrox,
  force: IconForce,
  hypertrophie: IconHypertrophie,
  street_workout: IconBarre,
  endurance: IconEndurance,
  hybride: IconHybride,
}

/**
 * Ce que l'objectif change concretement dans le programme.
 *
 * Ces phrases ne sont pas des arguments de vente : elles decrivent la
 * repartition de la semaine et le dosage que le generateur applique
 * reellement pour chaque objectif. Annoncer le resultat avant de le livrer
 * n'a d'interet que si les deux coincident.
 */
const OBJECTIF_EFFET: Record<(typeof OBJECTIFS)[number], string> = {
  marathon: 'Une sortie longue par semaine, volume qui monte de 8 % puis décharge.',
  semi: 'Même structure, calée sur 21 km au lieu de 42.',
  dix_km: 'Moins de volume, davantage de régularité.',
  hyrox: 'Deux séances de jambes pour une de haut du corps, et la sortie longue reste.',
  force: 'Séries courtes, repos allongés de moitié, quatre séances de barre.',
  hypertrophie: 'Séries longues, repos courts, une répétition en réserve.',
  street_workout: 'Tirage prioritaire, deux séances hautes au plus, jamais rapprochées.',
  endurance: 'Le volume avant l’intensité, sur toutes tes disciplines.',
  hybride: 'Course, nage et barre qui se répondent au lieu de s’additionner.',
}

/** Pictogramme de chaque sport. */
const SPORT_ICONES: Record<(typeof SPORTS)[number], (p: { size?: number }) => React.ReactElement> = {
  running: IconCourse,
  cycling: IconVelo,
  swimming: IconNatation,
  strength: IconBarre,
  street_workout: IconJambes,
}

/**
 * Ce que declarer un sport fait apparaitre dans la semaine.
 *
 * Comme pour les objectifs, ces phrases decrivent ce que le generateur
 * produit reellement — pas une promesse. Le velo se dose en minutes, la nage
 * suit une echelle de distances, la force ouvre par une semaine de tests :
 * tout cela est dans le moteur.
 */
const SPORT_EFFET: Record<(typeof SPORTS)[number], string> = {
  running: 'Footings, endurance fondamentale et sortie longue.',
  cycling: 'Tempo, endurance et sortie longue, dosées en durée plutôt qu’en kilomètres.',
  swimming: 'Technique et endurance, sur une échelle qui va de 25 à 1 500 m.',
  strength: 'Haut et bas du corps, avec une semaine de tests pour situer tes repères.',
  street_workout: 'Tractions, dips et muscle-ups, au poids du corps.',
}

/** Valeur du carrousel pour « pas de second objectif ». */
const AUCUN = 'aucun'

const STEP_TITRES: Record<StepId, string> = {
  profil: 'Toi',
  sports: 'Tes sports',
  objectifs: 'Ce que tu vises',
  dispo: 'Ta disponibilité',
  apercu: 'Ta première semaine',
  course: 'Ta course',
  natation: 'Ta natation',
  force: 'Ta force',
  limites: 'Tes limitations',
}

export function OnboardingForm({
  titre,
  intro,
  /**
   * Étape d'ouverture, uniquement en aperçu de développement : elle permet de
   * revoir une étape précise sans avoir à cliquer tout le questionnaire.
   * La page ne la transmet jamais en production.
   */
  etapeInitiale,
}: {
  titre: string
  intro: string
  etapeInitiale?: string
}) {
  const [index, setIndex] = useState(0)
  /*
   * En apercu de developpement, le brouillon part rempli d'un athlete
   * representatif : sans sports declares, les etapes de calibrage n'existent
   * pas dans la liste et sont donc inatteignables. Ce prereglage ne sert qu'a
   * relire les ecrans, il n'est jamais transmis en production.
   */
  const [d, setD] = useState<Draft>(() =>
    etapeInitiale
      ? {
          ...INITIAL,
          goalMain: 'marathon',
          sports: ['running', 'swimming', 'street_workout'],
          weekdays: [1, 2, 3, 4, 5, 6],
          runFrequency: 3,
          runWeeklyKm: '28',
          runLongestKm: '12',
          name: 'Alex',
          heightCm: '180',
          sex: null,
          currentKg: '78',
          goalKg: '73',
        }
      : INITIAL,
  )
  const [error, setError] = useState<string | null>(null)
  const [busy, setBusy] = useState(false)

  const set = <K extends keyof Draft>(k: K, v: Draft[K]) => setD((p) => ({ ...p, [k]: v }))

  const faitDeLaForce = d.sports.includes('strength') || d.sports.includes('street_workout')
  /* Au moins un sport dont le generateur sait deduire des seances. */
  const sportPlanifiable = d.sports.some((s) => PLANIFIABLES.includes(s))

  /*
   * « Aucun » en tete, puis tous les objectifs sauf le principal : un
   * secondaire identique au principal ne veut rien dire, et le schema le
   * refuse de toute facon.
   */
  const secondaires = useMemo(
    () => [AUCUN, ...OBJECTIFS.filter((o) => o !== d.goalMain)],
    [d.goalMain],
  )

  /*
   * Les étapes propres à une discipline n'existent que si elle est déclarée.
   * Un cycliste ne verra jamais de question sur sa nage — c'est tout l'intérêt
   * de demander les sports avant le détail.
   */
  const steps = useMemo<StepId[]>(() => {
    /*
     * L'objectif d'abord, le profil en dernier.
     *
     * Le formulaire commencait par le prenom, la taille et les deux poids :
     * sept champs, dont les deux plus intimes, demandes avant d'avoir dit a
     * quoi ils servaient. On commence desormais par ce qui a fait venir la
     * personne, et on garde l'administratif pour le moment ou elle est
     * engagee.
     */
    const s: StepId[] = ['objectifs', 'sports', 'dispo']
    if (d.sports.includes('running')) s.push('course')
    if (d.sports.includes('swimming')) s.push('natation')
    if (faitDeLaForce) s.push('force')
    /*
     * L'apercu arrive apres le calibrage et avant l'administratif.
     *
     * Il ne peut pas venir plus tot : les distances dependent du volume de
     * course actuel, demande a l'etape « course ». Les montrer avant
     * afficherait des chiffres que le programme livre ne contiendrait pas.
     *
     * Il vient en revanche avant le profil et les limitations, qui
     * n'influencent pas le plan : c'est la recompense qui justifie de
     * repondre aux deux dernieres questions.
     */
    s.push('apercu')
    s.push('profil')
    s.push('limites')
    return s
  }, [d.sports, faitDeLaForce])

  // Un sport retiré peut raccourcir la liste sous l'index courant.
  const step = steps[Math.min(index, steps.length - 1)]!

  useEffect(() => {
    if (!etapeInitiale) return
    const i = steps.indexOf(etapeInitiale as StepId)
    if (i >= 0) setIndex(i)
    // Une seule fois : ensuite c'est la navigation qui mene.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  /*
   * Ecart entre le poids vise et le poids actuel, en kilos, ou `null` tant
   * que les deux ne sont pas saisis. Un ecart ne se lit pas avant d'avoir
   * ses deux bornes.
   */
  const ecartDePoids =
    num(d.currentKg) >= 30 && num(d.goalKg) >= 30 ? num(d.goalKg) - num(d.currentKg) : null

  const pret: Record<StepId, boolean> = {
    profil:
      d.name.trim().length > 0 &&
      d.sex !== null &&
      num(d.heightCm) >= 100 &&
      num(d.heightCm) <= 250 &&
      num(d.currentKg) >= 30 &&
      num(d.goalKg) >= 30,
    // Le velo seul ne produirait aucune seance : on bloque ici plutot qu'au
    // dernier ecran, une fois tout le questionnaire rempli.
    sports: d.sports.length > 0 && sportPlanifiable,
    objectifs: d.goalMain !== null && d.goalSecond !== d.goalMain,
    dispo: d.weekdays.length >= 2 && d.weekdays.length <= 6 && num(d.sessionMinutes) >= 20,
    course:
      d.runFrequency !== null && num(d.runWeeklyKm) >= 0 && num(d.runLongestKm) >= 0,
    natation: d.swimFrequency !== null && d.swimStroke !== null && d.swimPoolAccess !== null,
    force: Object.values(d.claims).every(claimReady),
    apercu: true,
    // Une gene declaree sans zone ne dit rien de plus qu'une case vide.
    limites: d.limitEtat === 'aucune' || (d.limitEtat === 'gene' && d.limitZone.trim().length > 0),
  }

  const submit = async () => {
    setBusy(true)
    setError(null)

    const payload: OnboardingInput = {
      profil: {
        name: d.name.trim(),
        sex: d.sex,
        heightCm: Math.round(num(d.heightCm)),
        currentKg: num(d.currentKg),
        goalKg: num(d.goalKg),
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
      limitations:
        d.limitEtat === 'gene' && d.limitZone.trim()
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
      {/*
        L'accueil du questionnaire ne se lit qu'une fois. Le garder sur les
        cinq ecrans repoussait les choix sous la ligne de flottaison a chaque
        etape, pour redire ce qu'on avait deja lu.
      */}
      {index === 0 && (
        <header className="entre mb-7">
          <h1 className="dsp text-[26px]">{titre}</h1>
          <p className="mt-2 text-[13.5px] leading-relaxed text-mut">{intro}</p>
        </header>
      )}

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
          <p className="mb-5 text-[13.5px] leading-relaxed text-mut">
            Ton programme est calé, ces réponses n&rsquo;y touchent plus. Elles servent au suivi de
            ton corps et au coach, qui te répond avec tes chiffres plutôt qu&rsquo;avec des
            généralités.
          </p>

          <Field
            label="Prénom"
            value={d.name}
            onChange={(e) => set('name', e.target.value)}
            placeholder="Ton prénom"
          />

          {/*
            Le reste de l'ecran n'arrive qu'une fois le prenom donne, et
            s'ouvre en s'adressant a la personne par son nom. Six champs
            poses d'un coup se remplissent comme un formulaire ; deux
            questions qui se repondent l'une a l'autre se tiennent comme une
            conversation, et c'est la derniere impression avant le programme.
          */}
          {d.name.trim().length > 0 && (
            <div className="entre mt-7">
              <p className="mb-1.5 text-[19px] font-semibold tracking-[-0.02em]">
                Enchanté, {d.name.trim()}.
              </p>
              <p className="mb-4 text-[13px] leading-relaxed text-mut">
                Avec qui je travaille ? Le coach s&rsquo;adresse à toi au bon genre, et rapporte
                tes repères à la bonne référence.
              </p>

              <div className="grid grid-cols-2 gap-2.5">
                {([
                  ['homme', 'Homme', SilhouetteHomme],
                  ['femme', 'Femme', SilhouetteFemme],
                ] as const).map(([valeur, libelle, Figure], i) => (
                  <button
                    key={valeur}
                    type="button"
                    className="choix entre flex-col items-center gap-1.5 py-6"
                    style={{ animationDelay: `${i * 70}ms` }}
                    data-actif={d.sex === valeur}
                    aria-pressed={d.sex === valeur}
                    onClick={() => set('sex', valeur)}
                  >
                    {/* La figure choisie retrouve sa pleine lumiere ; l'autre
                        reste en retrait, sans changer de forme. */}
                    <span
                      className="transition-opacity duration-300"
                      style={{ opacity: d.sex === null || d.sex === valeur ? 1 : 0.45 }}
                    >
                      <Figure size={78} />
                    </span>
                    <span className="text-[15px] font-semibold tracking-[-0.01em]">{libelle}</span>
                  </button>
                ))}
              </div>

              {/*
                Troisieme choix, entier mais discret : personne ne doit se
                trouver bloque a l'avant-derniere question du questionnaire.
              */}
              <button
                type="button"
                className="choix entre mt-2.5 w-full justify-center gap-2 py-3 text-[13px]"
                style={{ animationDelay: '140ms' }}
                data-actif={d.sex === 'autre'}
                aria-pressed={d.sex === 'autre'}
                onClick={() => set('sex', 'autre')}
              >
                {/* Pas de pictogramme ici : un glyphe isole au milieu de deux
                    figures dessinees ferait tache, et la ligne se lit sans. */}
                <span className="font-medium">Autre, ou je préfère ne pas préciser</span>
              </button>
            </div>
          )}

          {d.sex !== null && (
            <div className="entre mt-8">
              {/* Taille et poids cote a cote : deux nombres courts n'ont pas
                  besoin d'une ligne chacun, et les rapprocher montre qu'ils
                  vont ensemble. */}
              <div className="grid grid-cols-2 gap-x-3">
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
              </div>

              <Field
                label="Poids visé"
                type="number"
                inputMode="decimal"
                suffix="kg"
                value={d.goalKg}
                onChange={(e) => set('goalKg', e.target.value)}
                hint="Mets le même que ton poids actuel si tu ne cherches pas à le changer."
              />

              {/*
                Le meme principe qu'a l'etape course : ce que la reponse
                produit, affiche pendant qu'on la donne. Le rythme vient de la
                constante que l'ecran Corps utilise pour alerter — la duree
                annoncee ici est donc exactement celle au bout de laquelle
                l'app cessera de dire que ca va trop vite.
              */}
              {ecartDePoids !== null && (
                <p className="entre -mt-1 rounded-[12px] bg-[rgb(255_255_255/0.035)] px-3.5 py-2.5 text-[12.5px] leading-5 text-mut">
                  {ecartDePoids === 0 ? (
                    <>
                      Poids stable : l&rsquo;app suivra ta tendance sans jamais te pousser à la
                      faire bouger.
                    </>
                  ) : (
                    <>
                      {ecartDePoids > 0 ? 'Prendre' : 'Perdre'}{' '}
                      <b className="text-text">{km(Math.abs(ecartDePoids))} kg</b> — au-delà de{' '}
                      {fr(GAIN_MAX_KG_SEMAINE, 2)} kg par semaine, l&rsquo;app te signale que ça va
                      trop vite. Compte donc{' '}
                      <b className="text-text">
                        {Math.ceil(Math.abs(ecartDePoids) / GAIN_MAX_KG_SEMAINE)} semaines
                      </b>{' '}
                      au minimum.
                    </>
                  )}
                </p>
              )}
            </div>
          )}
        </section>
      )}

      {step === 'sports' && (
        <section>
          {/*
            La meme semaine qu'a l'etape precedente, mais qui tient compte des
            sports declares : le generateur remplace les disciplines qu'on ne
            pratique pas, et on le voit ici avant de valider. C'est
            l'explication la plus courte de ce qu'est une substitution.
          */}
          <div className="glass rounded-card p-4">
            <p className="eyebrow mb-3">La forme de ta semaine</p>
            <ApercuSemaine objectif={d.goalMain} sports={d.sports} />
            <p className="mt-3 text-[12px] leading-5 text-dim">
              {d.sports.length === 0
                ? 'Coche ce que tu pratiques : les disciplines que tu ne fais pas seront remplacées.'
                : 'Ce que tu ne déclares pas est remplacé par un sport que tu pratiques, jamais laissé vide.'}
            </p>
          </div>

          <p className="mb-4 mt-7 text-[13.5px] leading-relaxed text-mut">
            On ne te posera de questions que sur ces disciplines.
          </p>

          <div className="grid gap-2.5 sm:grid-cols-2">
            {SPORTS.map((sp, i) => {
              const actif = d.sports.includes(sp)
              const S = SPORT_ICONES[sp]
              return (
                <button
                  key={sp}
                  type="button"
                  className="choix entre"
                  style={{ animationDelay: `${i * 45}ms` }}
                  data-actif={actif}
                  aria-pressed={actif}
                  onClick={() =>
                    set('sports', actif ? d.sports.filter((x) => x !== sp) : [...d.sports, sp])
                  }
                >
                  <span className={actif ? 'text-text' : 'text-mut'}>
                    <S size={20} />
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[14.5px] font-semibold tracking-[-0.01em]">
                      {SPORT_LABELS[sp]}
                    </span>
                    <span className="mt-1 block text-[12.5px] leading-5 text-mut">
                      {SPORT_EFFET[sp]}
                    </span>
                  </span>
                </button>
              )
            })}
          </div>

          {d.sports.length > 0 && !sportPlanifiable && (
            <p className="entre mt-5 rounded-[14px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
              Avec le cyclisme seul, ton programme serait vide : aucune séance de vélo n&rsquo;est
              encore générée. Ajoute la course, la natation ou la force pour recevoir un plan.
            </p>
          )}
        </section>
      )}

      {step === 'objectifs' && (
        <section>
          {/*
            La semaine est visible des l'arrivee, avant tout choix.
            
            Elle affiche alors la repartition par defaut, celle que le
            generateur produirait sans objectif declare — donc rien
            d'invente. La montrer d'emblee vaut mieux que de la faire
            apparaitre au premier clic : on voit une semaine se recomposer,
            au lieu d'en voir une surgir. Le premier est un changement, le
            second une apparition, et seul le changement se ressent.
          */}
          <div className="glass rounded-card p-4">
            <p className="eyebrow mb-3">La forme de ta semaine</p>
            <ApercuSemaine objectif={d.goalMain} />
            <p className="mt-3 text-[12px] leading-5 text-dim">
              {d.goalMain
                ? 'Les jours se caleront sur tes disponibilités, deux étapes plus loin. C’est la répartition qui compte ici, pas le calendrier.'
                : 'Choisis un objectif : la semaine se recompose.'}
            </p>
          </div>

          <p className="mb-4 mt-7 text-[13.5px] leading-relaxed text-mut">
            C&rsquo;est lui qui tranche quand deux besoins s&rsquo;opposent. Fais défiler : la
            semaine se recompose à chaque objectif.
          </p>

          {/*
            Une rangee qui defile plutot qu'une liste de neuf cartes. Empilees,
            elles faisaient plus haut qu'un ecran : on tapait la sixieme sans
            plus voir la semaine qu'elle transformait. Ici les deux tiennent
            dans le meme regard.
          */}
          <div className="-mx-4">
            <ChoixDefilant
              valeurs={OBJECTIFS}
              valeur={d.goalMain}
              onChange={(o) => {
                set('goalMain', o)
                // Un secondaire identique au principal ne veut rien dire.
                if (d.goalSecond === o) set('goalSecond', null)
              }}
            >
              {(o, actif) => {
                const O = OBJECTIF_ICONES[o]
                return (
                  <span
                    className="choix flex-col gap-2.5 transition-opacity duration-300"
                    data-actif={actif}
                    style={{ opacity: actif ? 1 : 0.5 }}
                  >
                    <span className={actif ? 'text-text' : 'text-mut'}>
                      <O size={22} />
                    </span>
                    <span className="block text-[15px] font-semibold tracking-[-0.01em]">
                      {OBJECTIF_LABELS[o]}
                    </span>
                    {/*
                      Ce que le programme fera, et non une promesse : les
                      phrases decrivent la repartition et le dosage que le
                      generateur applique reellement pour cet objectif.
                    */}
                    <span className="block text-[12.5px] leading-5 text-mut">
                      {OBJECTIF_EFFET[o]}
                    </span>
                  </span>
                )
              }}
            </ChoixDefilant>
          </div>

          {d.goalMain && (
            <div className="entre mt-7">
              <Field
                label="Une échéance ?"
                type="date"
                value={d.goalMainDate}
                onChange={(e) => set('goalMainDate', e.target.value)}
                hint="Facultative. Sans date, la progression se fait sans compte à rebours."
              />

              <div className="mt-6">
                <p className="eyebrow mb-1.5">Un objectif secondaire ?</p>
                <p className="mb-3 text-[12.5px] leading-5 text-mut">
                  Facultatif. Il ne change pas la forme de ta semaine &mdash; c&rsquo;est le
                  principal qui la d&eacute;cide &mdash; mais il ajoute des jalons &agrave;
                  suivre, poursuivis tant qu&rsquo;ils ne compromettent pas l&rsquo;objectif
                  principal.
                </p>

                {/*
                  Meme carrousel que le principal. Les jalons affiches viennent
                  du moteur : ce sont exactement ceux que l'ecran Objectifs
                  suivra, donc la promesse ne peut pas s'en ecarter.
                */}
                <div className="-mx-4">
                  <ChoixDefilant
                    valeurs={secondaires}
                    valeur={d.goalSecond ?? AUCUN}
                    onChange={(v) =>
                      set('goalSecond', v === AUCUN ? null : (v as typeof d.goalSecond))
                    }
                  >
                    {(v, actif) => {
                      const aucun = v === AUCUN
                      const o = v as (typeof OBJECTIFS)[number]
                      const O = aucun ? IconAucun : OBJECTIF_ICONES[o]
                      return (
                        <span
                          className="choix flex-col gap-2.5 transition-opacity duration-300"
                          data-actif={actif}
                          style={{ opacity: actif ? 1 : 0.5 }}
                        >
                          <span className={actif ? 'text-text' : 'text-mut'}>
                            <O size={22} />
                          </span>
                          <span className="block text-[15px] font-semibold tracking-[-0.01em]">
                            {aucun ? 'Aucun' : OBJECTIF_LABELS[o]}
                          </span>
                          <span className="block text-[12.5px] leading-5 text-mut">
                            {aucun
                              ? 'Un seul objectif, poursuivi sans compromis.'
                              : `Ajoute : ${libellesDesJalons(o).slice(0, 2).join(' · ')}`}
                          </span>
                        </span>
                      )
                    }}
                  </ChoixDefilant>
                </div>
              </div>
            </div>
          )}
        </section>
      )}

      {step === 'dispo' && (
        <section>
          {/*
            Troisieme et derniere fois que la semaine se recompose : apres
            l'objectif qui lui donne sa forme et les sports qui la rendent
            realisable, les jours la posent enfin sur un calendrier.
          */}
          <div className="glass rounded-card p-4">
            <p className="eyebrow mb-3">Ta semaine</p>
            <ApercuSemaine objectif={d.goalMain} sports={d.sports} jours={d.weekdays} />
            <p className="mt-3 text-[12px] leading-5 text-dim">
              {d.weekdays.length < 2
                ? 'Choisis au moins deux jours.'
                : `${d.weekdays.length} jours d’entraînement, ${7 - d.weekdays.length} de coupure. Le premier jour libre devient ton repos, et c’est lui qui cale toute la semaine.`}
            </p>
          </div>

          <p className="mb-3 mt-7 text-[13.5px] leading-relaxed text-mut">
            Entre deux et six jours. Les jours non retenus deviennent tes coupures — le repos fait
            partie du programme, il ne s&rsquo;y ajoute pas.
          </p>

          {/*
            Sept jours de lundi a dimanche, en toutes lettres abregees.
            L'initiale seule donnait « L M M J V S D » : deux M identiques,
            et rien pour distinguer mardi de mercredi. Un jour se reconnait a
            ses trois premieres lettres, pas a la premiere.
          */}
          <div className="grid grid-cols-7 gap-1.5">
            {[1, 2, 3, 4, 5, 6, 0].map((jour) => {
              const actif = d.weekdays.includes(jour)
              return (
                <button
                  key={jour}
                  type="button"
                  aria-pressed={actif}
                  className={`flex min-h-[62px] flex-col items-center justify-center gap-1.5 rounded-[14px] text-[12px] font-semibold tracking-[-0.01em] transition-[background-color,box-shadow,color] duration-200 active:scale-[0.96] ${
                    actif
                      ? 'bg-[rgb(255_255_255/0.11)] text-text shadow-[inset_0_1px_0_rgb(255_255_255/0.18)]'
                      : 'bg-[rgb(255_255_255/0.035)] text-dim'
                  }`}
                  onClick={() =>
                    set(
                      'weekdays',
                      actif
                        ? d.weekdays.filter((j) => j !== jour)
                        : [...d.weekdays, jour].sort((a, b) => a - b),
                    )
                  }
                >
                  {WEEKDAY_LABELS[jour]}
                  {/* Une pastille plutot qu'une coche : elle tient dans la
                      largeur d'un jour sur le plus petit ecran. */}
                  <span
                    aria-hidden
                    className={`h-1.5 w-1.5 rounded-full transition-colors duration-200 ${
                      actif ? 'bg-text' : 'bg-[rgb(255_255_255/0.12)]'
                    }`}
                  />
                </button>
              )
            })}
          </div>

          <div className="mt-7">
            <Field
              label="Durée par séance"
              type="number"
              inputMode="numeric"
              suffix="min"
              value={d.sessionMinutes}
              onChange={(e) => set('sessionMinutes', e.target.value)}
              hint="Une moyenne, pas un plafond : elle cale les séances courantes. La sortie longue et les séances de test la dépasseront, parce que c’est leur rôle."
            />
            <Question
              label="Deux séances le même jour ?"
              hint="Si tu l’autorises, la natation du samedi devient une séance jambes complète, doublée."
            >
              <ChipGroup
                options={[
                  { value: 'non' as const, label: 'Jamais' },
                  { value: 'oui' as const, label: 'Possible' },
                ]}
                value={d.allowDoubles ? 'oui' : 'non'}
                onChange={(v) => set('allowDoubles', v === 'oui')}
              />
            </Question>
          </div>
        </section>
      )}

      {step === 'course' && (
        <section>
          <p className="mb-5 text-[13.5px] leading-relaxed text-mut">
            Ces chiffres calent le point de départ. Le programme part de ce que tu fais
            aujourd&rsquo;hui, pas de ce qu&rsquo;il faudrait faire.
          </p>

          <p className="eyebrow mb-2">Séances de course par semaine</p>
          <Nombres
            valeurs={[0, 1, 2, 3, 4, 5, 6, 7]}
            valeur={d.runFrequency}
            onChange={(n) => set('runFrequency', n)}
            colonnes={8}
          />

          <div className="mt-6">
            <Field
              label="Volume hebdomadaire actuel"
              type="number"
              inputMode="decimal"
              suffix="km"
              value={d.runWeeklyKm}
              onChange={(e) => set('runWeeklyKm', e.target.value)}
              hint="Mets 0 si tu ne cours pas encore : le programme démarrera au minimum sûr."
            />

            {/*
              Ce que le chiffre saisi produit, en direct.
              
              La premiere semaine ne reprend pas le volume declare : elle
              l'augmente de 10 %, plancher a huit kilometres. Le dire en
              chiffres plutot qu'en phrase evite la surprise a l'ouverture du
              programme, et montre que la progression est bornee.
            */}
            {d.runWeeklyKm.trim() !== '' && (
              <p className="entre -mt-1 mb-4 rounded-[12px] bg-[rgb(255_255_255/0.035)] px-3.5 py-2.5 text-[12.5px] leading-5 text-mut">
                {num(d.runWeeklyKm) > 0 ? (
                  <>
                    Ta semaine 1 partira sur{' '}
                    <b className="text-text">{km(weekVolume(1, baseWeeklyKm(num(d.runWeeklyKm))))} km</b>{' '}
                    — ton volume actuel plus 10 %, jamais davantage.
                  </>
                ) : (
                  <>
                    Ta semaine 1 partira sur <b className="text-text">{km(ABSOLUTE_MIN_BASE)} km</b>, le
                    plancher pour une reprise. La progression viendra ensuite.
                  </>
                )}
              </p>
            )}

            <Field
              label="Ta plus longue sortie récente"
              type="number"
              inputMode="decimal"
              suffix="km"
              value={d.runLongestKm}
              onChange={(e) => set('runLongestKm', e.target.value)}
              hint="Elle sert de repère à tes objectifs de distance. Laisse 0 si tu n’en as pas."
            />
          </div>
        </section>
      )}

      {step === 'natation' && (
        <section>
          <p className="mb-5 text-[13.5px] leading-relaxed text-mut">
            La natation progresse par paliers, de 25 à 1 500 m sans pause. Ces réponses situent
            ton départ sur cette échelle.
          </p>

          <p className="eyebrow mb-2">Séances de natation par semaine</p>
          <Nombres
            valeurs={[0, 1, 2, 3, 4]}
            valeur={d.swimFrequency}
            onChange={(n) => set('swimFrequency', n)}
            colonnes={5}
          />

          <div className="mt-6">
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
              hint="Laisse vide si tu ne l’as jamais mesurée. Elle s’affichera « À TESTER » plutôt que d’être devinée — c’est la règle partout dans l’app."
            />

            <Question
              label="Accès à la piscine"
              hint="Une contrainte, pas une excuse : le programme s’y adapte au lieu de te proposer ce que tu ne peux pas faire."
            >
              <ChipGroup
                options={(Object.keys(POOL_LABELS) as (keyof typeof POOL_LABELS)[]).map((k) => ({
                  value: k,
                  label: POOL_LABELS[k],
                }))}
                value={d.swimPoolAccess}
                onChange={(v) => set('swimPoolAccess', v)}
              />
            </Question>
          </div>
        </section>
      )}

      {step === 'force' && (
        <section>
          <p className="mb-5 text-[13.5px] leading-relaxed text-mut">
            La semaine 1 s&rsquo;ouvre sur des tests : le programme a besoin de savoir où tu en es
            avant de prescrire quoi que ce soit. Ce que tu déclares ici évite d&rsquo;en tester
            trop, rien de plus.
          </p>

          <Question label="Ton matériel" hint="Ce que tu n’as pas ne sera jamais programmé.">
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
              Un repère déclaré n’est pas un repère testé. « Au moins » reste marqué comme
              partiel jusqu’à ce que tu passes un vrai test.
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

      {step === 'apercu' && (
        <section>
          <p className="mb-5 text-[13.5px] leading-relaxed text-mut">
            Voilà ce que tes réponses produisent. Rien n&rsquo;est encore enregistré : tu peux
            revenir en arrière, le programme se recalcule.
          </p>

          <ApercuProgramme
            objectif={d.goalMain}
            sports={d.sports}
            jours={d.weekdays}
            allowDoubles={d.allowDoubles}
            volumeCourseHebdo={d.sports.includes('running') ? num(d.runWeeklyKm) : null}
          />

          <p className="mt-5 text-[12px] leading-5 text-dim">
            La semaine 1 sert de point de départ : le volume monte ensuite de 8 % par semaine, avec
            une décharge toutes les quatre. Il reste deux questions, qui ne changent pas le
            programme mais permettent de suivre ton corps et tes contraintes.
          </p>
        </section>
      )}

      {step === 'limites' && (
        <section>
          <p className="mb-5 text-[13.5px] leading-relaxed text-mut">
            Dernière question. Ta réponse ne modifie pas le programme —
            je te dis exactement ce qu&rsquo;elle fait juste en dessous.
          </p>

          {/*
            Deux reponses explicites plutot qu'un champ qu'on laisse vide.
            « Rien a signaler » est une information, l'absence de saisie n'en
            est pas une : on ne sait pas si la personne va bien ou si elle a
            saute la question. Et c'est le dernier geste avant le bouton qui
            genere le programme — autant que ce soit une decision.
          */}
          <div className="grid grid-cols-2 gap-2.5">
            {([
              ['aucune', 'Rien à signaler'],
              ['gene', 'Une gêne en cours'],
            ] as const).map(([valeur, libelle], i) => (
              <button
                key={valeur}
                type="button"
                className="choix entre items-center justify-center py-4 text-center"
                style={{ animationDelay: `${i * 70}ms` }}
                data-actif={d.limitEtat === valeur}
                aria-pressed={d.limitEtat === valeur}
                onClick={() => set('limitEtat', valeur)}
              >
                <span className="text-[14px] font-semibold tracking-[-0.01em]">{libelle}</span>
              </button>
            ))}
          </div>

          {d.limitEtat === 'gene' && (
            <div className="entre mt-6">
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

              {/*
                Ce que la declaration fait reellement.
                
                L'ecran promettait jusqu'ici que « le coach allegera ce qui
                sollicite la zone ». Le moteur fait l'inverse, et le dit dans
                son propre code : une limitation en cours ne change aucune
                action, parce que relier une zone a des exercices demanderait
                une correspondance que personne n'a etablie. Promettre un
                allegement qui n'arrive pas est pire que ne rien promettre :
                on se croit protege.
              */}
              <p className="entre rounded-[12px] bg-[rgb(255_255_255/0.035)] px-3.5 py-3 text-[12.5px] leading-5 text-mut">
                Ce qu&rsquo;elle fait : la zone part au coach, qui en tient compte dans ce
                qu&rsquo;il te propose, et elle est rappelée dans les preuves de chaque décision.
                Ce qu&rsquo;elle ne fait pas : baisser la charge toute seule.{' '}
                <span className="text-text">
                  C&rsquo;est le jour où tu signales une douleur que la séance s&rsquo;allège.
                </span>
              </p>
            </div>
          )}

          {d.limitEtat === 'aucune' && (
            <p className="entre mt-6 rounded-[12px] bg-[rgb(255_255_255/0.035)] px-3.5 py-3 text-[12.5px] leading-5 text-mut">
              Noté. Tu pourras signaler une douleur n&rsquo;importe quel jour depuis
              l&rsquo;écran Récupération : c&rsquo;est ce signalement, et lui seul, qui allège
              une séance.
            </p>
          )}

          <p className="mt-6 rounded-[12px] border border-line bg-bg2 p-3.5 text-[12px] leading-relaxed text-dim">
            Hybrid ne pose aucun diagnostic. Une douleur qui augmente à l&rsquo;effort ou qui
            dure plus de quelques jours doit t&rsquo;amener à consulter un professionnel de
            santé.
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
