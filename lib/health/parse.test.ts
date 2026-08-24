import { describe, expect, it } from 'vitest'
import {
  analyser,
  decouper,
  extractionVide,
  peseesParJour,
  seancesUniques,
} from './parse'

function extraire(xml: string) {
  return analyser(xml, extractionVide())
}

describe('pesées', () => {
  it('lit une masse corporelle en kilogrammes', () => {
    const r = extraire(
      '<Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-03-16 07:12:00 +0100" unit="kg" value="72.4"/>',
    )
    expect(r.pesees).toEqual([{ date: '2026-03-16', kg: 72.4 }])
  })

  it('convertit les livres en kilogrammes', () => {
    const r = extraire(
      '<Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-03-16 07:12:00 +0100" unit="lb" value="160"/>',
    )
    expect(r.pesees[0]?.kg).toBeCloseTo(72.6, 1)
  })

  it('écarte une valeur hors du plausible', () => {
    // Une balance qui renvoie 0 ou 900 kg s'est trompée : l'importer
    // écraserait une vraie mesure par du bruit.
    const xml = ['0', '900'].map(
      (v) =>
        `<Record type="HKQuantityTypeIdentifierBodyMass" startDate="2026-03-16 07:12:00 +0100" unit="kg" value="${v}"/>`,
    ).join('')
    expect(extraire(xml).pesees).toHaveLength(0)
  })

  it('ignore les autres types de relevés', () => {
    const r = extraire(
      '<Record type="HKQuantityTypeIdentifierStepCount" startDate="2026-03-16 07:12:00 +0100" unit="count" value="8000"/>',
    )
    expect(r.pesees).toHaveLength(0)
  })
})

describe('séances', () => {
  const course =
    '<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="43.5" durationUnit="min" totalDistance="8.04" totalDistanceUnit="km" startDate="2026-03-16 07:12:00 +0100"/>'

  it('lit une course avec sa durée et sa distance', () => {
    const s = extraire(course).seances[0]
    expect(s?.kind).toBe('run')
    expect(s?.date).toBe('2026-03-16')
    expect(s?.minutes).toBe(43.5)
    expect(s?.distance).toBe(8040)
  })

  it('convertit les miles en mètres', () => {
    const s = extraire(course.replace('totalDistanceUnit="km"', 'totalDistanceUnit="mi"')).seances[0]
    expect(s?.distance).toBe(Math.round(8.04 * 1609.344))
  })

  it("n'apporte jamais de ressenti", () => {
    // Health ne mesure pas le RPE. Aucune séance importée ne peut en avoir un.
    const s = extraire(course).seances[0]
    expect(s).not.toHaveProperty('rpe')
    expect(s?.hr).toBeNull()
  })

  it('compte les types non suivis au lieu de les taire', () => {
    const r = extraire(
      '<Workout workoutActivityType="HKWorkoutActivityTypeCycling" duration="60" startDate="2026-03-16 07:12:00 +0100"/>',
    )
    expect(r.seances).toHaveLength(0)
    expect(r.ignores.get('HKWorkoutActivityTypeCycling')).toBe(1)
  })

  it('laisse la distance à null quand la séance n en rapporte pas', () => {
    const r = extraire(
      '<Workout workoutActivityType="HKWorkoutActivityTypeTraditionalStrengthTraining" duration="50" startDate="2026-03-16 18:00:00 +0100"/>',
    )
    expect(r.seances[0]?.kind).toBe('strength')
    expect(r.seances[0]?.distance).toBeNull()
  })
})

describe('decouper', () => {
  it('ne rend que des balises entières et reporte la queue', () => {
    const { pret, queue } = decouper('<Workout a="1"/><Workout b="2"')
    expect(pret).toBe('<Workout a="1"/>')
    expect(queue).toBe('<Workout b="2"')
  })

  it('reporte tout quand aucune balise n est complète', () => {
    // Analyser une balise coupée en deux ferait disparaître la donnée en silence.
    expect(decouper('<Workout a="1').pret).toBe('')
  })

  it('retrouve la balise coupée une fois les morceaux recollés', () => {
    const xml =
      '<Workout workoutActivityType="HKWorkoutActivityTypeRunning" duration="30" startDate="2026-03-16 07:00:00 +0100"/>'
    const coupe = 60
    const un = decouper(xml.slice(0, coupe))
    const deux = decouper(un.queue + xml.slice(coupe))

    const r = extractionVide()
    analyser(un.pret, r)
    analyser(deux.pret, r)
    expect(r.seances).toHaveLength(1)
  })
})

describe('dédoublonnage', () => {
  it('garde une seule pesée par jour', () => {
    const r = peseesParJour([
      { date: '2026-03-16', kg: 72.4 },
      { date: '2026-03-16', kg: 72.6 },
      { date: '2026-03-15', kg: 72.1 },
    ])
    expect(r).toEqual([
      { date: '2026-03-15', kg: 72.1 },
      { date: '2026-03-16', kg: 72.6 },
    ])
  })

  it('dédoublonne les séances sur leur clé', () => {
    // Réimporter le même export ne doit pas doubler les séances.
    const s = {
      cle: 'x',
      date: '2026-03-16',
      kind: 'run' as const,
      minutes: 30,
      distance: null,
      hr: null,
    }
    expect(seancesUniques([s, { ...s }])).toHaveLength(1)
  })
})
