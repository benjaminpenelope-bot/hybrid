import { describe, expect, it } from 'vitest'
import { onboardingSchema, restWeekdayFrom, type OnboardingInput } from './onboarding'

/** Réponses valides minimales : un coureur, rien d'autre. */
function reponses(over: Partial<OnboardingInput> = {}): unknown {
  return {
    profil: {
      name: 'Test',
      heightCm: 180,
      currentKg: 75,
      goalKg: 75,
    },
    sports: ['running'],
    objectifs: {
      principal: { type: 'marathon', date: null },
      secondaire: null,
    },
    disponibilites: { availableWeekdays: [1, 3, 5, 6], sessionMinutes: 60, allowDoubles: false },
    limitations: [],
    running: { frequency: 3, weeklyKm: 25, longestKm: 12 },
    swimming: null,
    force: null,
    ...over,
  }
}

describe('profil', () => {
  /*
   * Le questionnaire ne demande plus le sexe, la date de naissance ni le
   * niveau declare : rien ne les lisait. Le schema doit donc les accepter
   * absents — sans quoi l'inscription echouerait pour tout le monde — et les
   * ramener a null, pour que la colonne se vide au lieu de garder une
   * ancienne valeur.
   */
  it('accepte un profil sans sexe, date de naissance ni niveau', () => {
    const r = onboardingSchema.safeParse(reponses())
    expect(r.success).toBe(true)
    expect(r.data?.profil.sex).toBeNull()
    expect(r.data?.profil.birthDate).toBeNull()
    expect(r.data?.profil.level).toBeNull()
  })

  it('les accepte encore s’ils sont fournis', () => {
    const r = onboardingSchema.safeParse(
      reponses({ profil: { name: 'Test', heightCm: 180, currentKg: 75, goalKg: 75, level: 'avance' } }),
    )
    expect(r.success).toBe(true)
    expect(r.data?.profil.level).toBe('avance')
  })
})

describe('détail par discipline', () => {
  it('accepte un coureur sans détail de nage', () => {
    expect(onboardingSchema.safeParse(reponses()).success).toBe(true)
  })

  it('exige le détail de course quand la course est déclarée', () => {
    const r = onboardingSchema.safeParse(reponses({ running: null }))
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.path.includes('running'))).toBe(true)
  })

  it('exige le détail de nage quand la natation est déclarée', () => {
    const r = onboardingSchema.safeParse(reponses({ sports: ['running', 'swimming'] }))
    expect(r.success).toBe(false)
    expect(r.error?.issues.some((i) => i.path.includes('swimming'))).toBe(true)
  })

  it('exige le détail de force pour la musculation comme pour le street workout', () => {
    for (const sport of ['strength', 'street_workout'] as const) {
      const r = onboardingSchema.safeParse(reponses({ sports: ['running', sport] }))
      expect(r.success).toBe(false)
      expect(r.error?.issues.some((i) => i.path.includes('force'))).toBe(true)
    }
  })

  it('ne demande rien de particulier au cycliste', () => {
    // Le cyclisme n'a pas encore de detail propre : il ne doit rien bloquer.
    expect(onboardingSchema.safeParse(reponses({ sports: ['running', 'cycling'] })).success).toBe(true)
  })

  it('accepte le cyclisme seul, maintenant que des séances en découlent', () => {
    // Le refus qui vivait ici n'avait de sens que tant que le generateur ne
    // savait produire aucune sortie velo.
    expect(onboardingSchema.safeParse(reponses({ sports: ['cycling'], running: null })).success).toBe(true)
  })
})

describe('jours disponibles', () => {
  it('refuse moins de deux jours', () => {
    const r = onboardingSchema.safeParse(
      reponses({ disponibilites: { availableWeekdays: [1], sessionMinutes: 60, allowDoubles: false } }),
    )
    expect(r.success).toBe(false)
  })

  it('refuse sept jours sur sept', () => {
    // Un programme a besoin d'au moins une coupure pour que le corps encaisse.
    const r = onboardingSchema.safeParse(
      reponses({
        disponibilites: { availableWeekdays: [0, 1, 2, 3, 4, 5, 6], sessionMinutes: 60, allowDoubles: false },
      }),
    )
    expect(r.success).toBe(false)
  })
})

describe('objectifs', () => {
  it('accepte un objectif principal sans échéance', () => {
    expect(onboardingSchema.safeParse(reponses()).success).toBe(true)
  })

  it('accepte un secondaire différent du principal', () => {
    const r = onboardingSchema.safeParse(
      reponses({ objectifs: { principal: { type: 'marathon', date: null }, secondaire: { type: 'force', date: null } } }),
    )
    expect(r.success).toBe(true)
  })

  it('refuse un secondaire identique au principal', () => {
    const r = onboardingSchema.safeParse(
      reponses({
        objectifs: { principal: { type: 'marathon', date: null }, secondaire: { type: 'marathon', date: null } },
      }),
    )
    expect(r.success).toBe(false)
  })
})

describe('sexe et date de naissance', () => {
  it('restent facultatifs', () => {
    // « Sexe si renseigne » : ne jamais forcer la reponse.
    const r = onboardingSchema.safeParse(reponses())
    expect(r.success).toBe(true)
  })
})

describe('restWeekdayFrom', () => {
  it('rend le premier jour non retenu, en partant du lundi', () => {
    expect(restWeekdayFrom([1, 3, 5, 6])).toBe(2)
    expect(restWeekdayFrom([1, 2, 3, 4, 5, 6])).toBe(0)
    expect(restWeekdayFrom([0, 2, 3, 4, 5, 6])).toBe(1)
  })
})
