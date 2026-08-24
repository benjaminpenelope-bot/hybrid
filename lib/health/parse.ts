import type { ISODate, SessionKind } from '@/lib/engine/types'

/**
 * LECTURE D'UN EXPORT APPLE HEALTH
 *
 * `export.xml` fait couramment plusieurs centaines de mégaoctets. Il est lu
 * par morceaux dans le navigateur et n'est jamais envoyé au serveur : seules
 * les quelques lignes utiles en sortent.
 *
 * On ne prend que deux choses, parce que ce sont les deux qu'Apple mesure
 * vraiment et que l'app sait utiliser :
 *
 * - la masse corporelle, qui vient d'une balance ;
 * - les séances, avec leur durée et leur distance.
 *
 * Le ressenti n'existe pas dans Health. Aucune séance importée n'arrive donc
 * avec un RPE, et aucune nage n'arrive avec des mètres « en continu ».
 */

export interface PeseeHealth {
  date: ISODate
  kg: number
}

export interface SeanceHealth {
  /** Identifiant reconstitué : Health ne donne pas de clé stable. */
  cle: string
  date: ISODate
  kind: SessionKind
  minutes: number
  /** Mètres, ou null quand la séance n'en rapporte pas. */
  distance: number | null
  hr: number | null
}

export interface Extraction {
  pesees: PeseeHealth[]
  seances: SeanceHealth[]
  /** Types rencontrés mais non suivis, pour pouvoir le dire plutôt que de taire. */
  ignores: Map<string, number>
}

const DISCIPLINES: Record<string, SessionKind> = {
  HKWorkoutActivityTypeRunning: 'run',
  HKWorkoutActivityTypeSwimming: 'swim',
  HKWorkoutActivityTypeTraditionalStrengthTraining: 'strength',
  HKWorkoutActivityTypeFunctionalStrengthTraining: 'strength',
  HKWorkoutActivityTypeCoreTraining: 'strength',
}

const RECORD = /<Record\s[^>]*?\/?>/g
const WORKOUT = /<Workout\s[^>]*?\/?>/g

function attribut(balise: string, nom: string): string | null {
  const m = new RegExp(`${nom}="([^"]*)"`).exec(balise)
  return m ? (m[1] ?? null) : null
}

function nombre(v: string | null): number | null {
  if (v === null) return null
  const n = Number(v)
  return Number.isFinite(n) ? n : null
}

/** Health écrit « 2026-03-16 07:12:00 +0100 » : la date locale est en tête. */
function jour(v: string | null): ISODate | null {
  if (!v || v.length < 10) return null
  const d = v.slice(0, 10)
  return /^\d{4}-\d{2}-\d{2}$/.test(d) ? d : null
}

export function extractionVide(): Extraction {
  return { pesees: [], seances: [], ignores: new Map() }
}

/**
 * Analyse un morceau de XML et ajoute ce qu'il contient à l'extraction.
 *
 * Le morceau doit se terminer sur une balise complète : c'est à l'appelant de
 * garder la queue tronquée pour le tour suivant. Une balise coupée en deux
 * serait ignorée sans erreur, et la donnée disparaîtrait en silence.
 */
export function analyser(morceau: string, dans: Extraction): Extraction {
  for (const balise of morceau.match(RECORD) ?? []) {
    if (attribut(balise, 'type') !== 'HKQuantityTypeIdentifierBodyMass') continue

    const date = jour(attribut(balise, 'startDate'))
    const valeur = nombre(attribut(balise, 'value'))
    if (date === null || valeur === null || valeur <= 0) continue

    // Health exporte parfois en livres selon les réglages de l'appareil.
    const unite = attribut(balise, 'unit')
    const kg = unite === 'lb' ? valeur * 0.45359237 : valeur
    // Mêmes bornes que la contrainte en base : une valeur hors plage ferait
    // échouer l'insertion de tout le lot, pas seulement de la ligne fautive.
    if (kg < 30 || kg > 250) continue

    dans.pesees.push({ date, kg: Math.round(kg * 10) / 10 })
  }

  for (const balise of morceau.match(WORKOUT) ?? []) {
    const type = attribut(balise, 'workoutActivityType') ?? 'inconnu'
    const kind = DISCIPLINES[type]
    if (!kind) {
      dans.ignores.set(type, (dans.ignores.get(type) ?? 0) + 1)
      continue
    }

    const debut = attribut(balise, 'startDate')
    const date = jour(debut)
    const minutes = nombre(attribut(balise, 'duration'))
    if (date === null || minutes === null || minutes <= 0) continue

    const distance = nombre(attribut(balise, 'totalDistance'))
    const unite = attribut(balise, 'totalDistanceUnit')

    dans.seances.push({
      // Le couple début + type suffit : Health ne crée pas deux séances
      // identiques au même instant.
      cle: `${debut}|${type}`,
      date,
      kind,
      minutes: Math.round(minutes * 10) / 10,
      distance:
        distance === null || distance <= 0
          ? null
          : Math.round(unite === 'mi' ? distance * 1609.344 : distance * 1000),
      hr: null,
    })
  }

  return dans
}

/**
 * Garde une pesée par jour, la dernière. Plusieurs pesées le même jour sont
 * la même mesure répétée, pas une tendance.
 */
export function peseesParJour(pesees: PeseeHealth[]): PeseeHealth[] {
  const parJour = new Map<ISODate, number>()
  for (const p of pesees) parJour.set(p.date, p.kg)
  return [...parJour.entries()]
    .map(([date, kg]) => ({ date, kg }))
    .sort((a, b) => a.date.localeCompare(b.date))
}

/** Dédoublonne les séances sur leur clé : un export réimporté ne double rien. */
export function seancesUniques(seances: SeanceHealth[]): SeanceHealth[] {
  const parCle = new Map<string, SeanceHealth>()
  for (const s of seances) parCle.set(s.cle, s)
  return [...parCle.values()].sort((a, b) => a.date.localeCompare(b.date))
}

/**
 * Découpe un flux : renvoie la partie sûre à analyser et la queue à reporter.
 * On coupe après le dernier `>` pour ne jamais scinder une balise.
 */
export function decouper(tampon: string): { pret: string; queue: string } {
  const fin = tampon.lastIndexOf('>')
  if (fin === -1) return { pret: '', queue: tampon }
  return { pret: tampon.slice(0, fin + 1), queue: tampon.slice(fin + 1) }
}
