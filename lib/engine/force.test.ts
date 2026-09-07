import { describe, expect, it } from 'vitest'
import {
  ECHELLE_DIPS,
  ECHELLE_RELEVES,
  ECHELLE_TRACTIONS,
  fourchette,
  palierDe,
  partDeLaSemaine,
  reperesDepuisLignes,
  reperesPerimes,
  RETEST_JOURS,
} from './force'

import { buildStrength } from './program'

/** Les repères réels d'un compte, testés le 27 août. */
const BENJAMIN = { pullups: 17, dips: 26, muscleups: 5, legraises: 27 }

const nomsDe = (ex: ReturnType<typeof buildStrength>) => ex.map((e) => e.n)
const repsDe = (ex: ReturnType<typeof buildStrength>, nom: string) =>
  ex.find((e) => e.n.includes(nom))?.reps
const bornes = (reps: string) => reps.split('–').map(Number)

describe('paliers de difficulté', () => {
  it('choisit le plus haut palier atteignable', () => {
    expect(palierDe(ECHELLE_TRACTIONS, 17).n).toBe('Tractions lestées')
    expect(palierDe(ECHELLE_TRACTIONS, 6).n).toBe('Tractions strictes')
    expect(palierDe(ECHELLE_TRACTIONS, 1).n).toBe('Tractions négatives')
    expect(palierDe(ECHELLE_DIPS, 26).n).toBe('Dips lestés')
    expect(palierDe(ECHELLE_RELEVES, 27).n).toBe('Toes-to-bar')
  })

  it('durcit le mouvement plutôt que d’ajouter des répétitions', () => {
    // C'est la logique propre au street : apres douze tractions strictes, la
    // suite n'est pas treize, c'est le lest.
    expect(palierDe(ECHELLE_TRACTIONS, 11).n).toBe('Tractions strictes')
    expect(palierDe(ECHELLE_TRACTIONS, 12).n).toBe('Tractions lestées')
  })

  it('baisse le nombre quand la variante durcit, sans quoi on durcirait deux fois', () => {
    expect(palierDe(ECHELLE_TRACTIONS, 12).facteur).toBeLessThan(1)
    expect(palierDe(ECHELLE_TRACTIONS, 20).facteur).toBeLessThan(
      palierDe(ECHELLE_TRACTIONS, 12).facteur,
    )
  })
})

describe('fourchette de travail', () => {
  it('se calcule en part du maximum', () => {
    expect(fourchette(20, 0.5, 1)).toBe('10–12')
  })

  it('ne descend jamais sous trois répétitions', () => {
    expect(bornes(fourchette(2, 0.5, 1))[0]).toBeGreaterThanOrEqual(3)
  })

  it('monte avec les semaines, puis plafonne', () => {
    const p1 = partDeLaSemaine(0.5, 1)
    const p10 = partDeLaSemaine(0.5, 10)
    const p52 = partDeLaSemaine(0.5, 52)
    expect(p10).toBeGreaterThan(p1)
    // Au-dela, la progression vient d'un nouveau test, pas d'une part qui
    // continue de monter sur un maximum perime.
    expect(p52).toBeLessThanOrEqual(0.5 + 0.18)
  })
})

describe('la séance haut du corps est enfin calibrée', () => {
  it('prescrit près de la moitié du max, plus 40 % comme avant', () => {
    const ex = buildStrength('UPPER', 2, BENJAMIN)
    const [bas, haut] = bornes(repsDe(ex, 'Tractions lestées') as string)
    // 17 tractions, palier leste (facteur 0,6) : autour de cinq a sept
    // repetitions LESTEES, ce qui est nettement plus dur que les 5–8 strictes
    // d'avant. La comparaison honnete se fait a effort, pas a nombre.
    expect(bas).toBeGreaterThanOrEqual(4)
    expect(haut).toBeLessThanOrEqual(9)
  })

  it('fait apparaître le muscle-up, qui était testé puis jamais prescrit', () => {
    expect(nomsDe(buildStrength('UPPER', 2, BENJAMIN)).some((n) => n.includes('Muscle-up'))).toBe(
      true,
    )
  })

  it('place le muscle-up en premier : il se travaille frais', () => {
    expect(nomsDe(buildStrength('UPPER', 2, BENJAMIN))[0]).toContain('Muscle-up')
  })

  it('n’invente pas de muscle-up quand il n’a jamais été mesuré', () => {
    const ex = buildStrength('UPPER', 2, { pullups: 17 })
    expect(nomsDe(ex).some((n) => n.includes('Muscle-up'))).toBe(false)
  })

  it('garde deux répétitions en réserve : la calibration change, pas la philosophie', () => {
    for (const e of buildStrength('UPPER', 2, BENJAMIN)) expect(e.rir).toBe(2)
  })

  it('laisse la supination stricte, pour ne pas cumuler deux variantes lourdes', () => {
    const ex = buildStrength('UPPER', 2, BENJAMIN)
    const sup = ex.find((e) => e.n === 'Tractions supination')!
    expect(sup).toBeDefined()
    expect(bornes(sup.reps)[0]).toBeGreaterThan(
      bornes(repsDe(ex, 'Tractions lestées') as string)[0]!,
    )
  })
})

describe('repli : ce qui n’est pas mesuré ne s’invente pas', () => {
  it('rend exactement la prescription d’avant sans aucun repère', () => {
    const ex = buildStrength('UPPER', 2, {})
    expect(nomsDe(ex)).toEqual([
      'Tractions strictes',
      'Dips',
      'Tractions supination',
      'Pompes lestées ou déclinées',
      'Relevés de jambes suspendu',
    ])
    expect(repsDe(ex, 'Tractions strictes')).toBe('5–8')
    expect(repsDe(ex, 'Dips')).toBe('7–11')
  })

  it('ancre mouvement par mouvement, sans exiger la série complète', () => {
    const ex = buildStrength('UPPER', 2, { pullups: 17 })
    // Les tractions sont ancrees, les dips retombent sur la constante.
    expect(nomsDe(ex)).toContain('Tractions lestées')
    expect(repsDe(ex, 'Dips')).toBe('7–11')
  })

  it('laisse le bas du corps intact sans repère de squat', () => {
    expect(nomsDe(buildStrength('LOWER', 2, BENJAMIN))[0]).toBe('Squats poids du corps')
  })

  it('passe à une jambe quand le squat au poids du corps ne construit plus rien', () => {
    expect(nomsDe(buildStrength('LOWER', 2, { squats: 80 }))[0]).toContain('Pistol')
  })
})

describe('lecture des repères', () => {
  it('retient la mesure la plus récente', () => {
    const r = reperesDepuisLignes([
      { key: 'pullups', value: 25, tested_at: '2026-08-26' },
      { key: 'pullups', value: 17, tested_at: '2026-08-27' },
    ])
    expect(r.pullups).toBe(17)
  })

  it('écarte la natation, qui n’entre dans aucune série', () => {
    const r = reperesDepuisLignes([{ key: 'swim_continuous', value: 400, tested_at: '2026-08-29' }])
    expect(Object.keys(r)).toEqual([])
  })

  it('écarte un zéro : ce n’est pas un maximum, c’est une absence', () => {
    const r = reperesDepuisLignes([{ key: 'muscleups', value: 0, tested_at: '2026-08-27' }])
    expect(r.muscleups).toBeUndefined()
  })

  it('accepte une valeur arrivée en texte, comme le fait PostgREST', () => {
    expect(reperesDepuisLignes([{ key: 'dips', value: '26.0', tested_at: '2026-08-27' }]).dips).toBe(
      26,
    )
  })
})

describe('re-test périodique', () => {
  const lignes = [{ key: 'pullups', value: 17, tested_at: '2026-08-27' }]

  it('ne demande rien tant que les repères sont récents', () => {
    expect(reperesPerimes(lignes, '2026-09-07')).toBe(false)
  })

  it('demande un nouveau test passé huit semaines', () => {
    expect(reperesPerimes(lignes, '2026-10-25')).toBe(true)
    expect(RETEST_JOURS).toBe(56)
  })

  it('se cale sur le plus ancien, pas le plus récent', () => {
    // Un test repasse tous les reperes : se caler sur le plus recent
    // reviendrait a ne jamais re-mesurer ce qui n'a ete vu qu'une fois.
    const melange = [
      { key: 'pullups', value: 17, tested_at: '2026-01-01' },
      { key: 'dips', value: 26, tested_at: '2026-09-06' },
    ]
    expect(reperesPerimes(melange, '2026-09-07')).toBe(true)
  })

  it('ne demande rien quand aucun repère n’existe : c’est la semaine 1 qui teste', () => {
    expect(reperesPerimes([], '2026-09-07')).toBe(false)
  })
})

describe('la séance de test se replace au début d’un bloc', () => {
  it('teste à la semaine indiquée, pas seulement à la première', () => {
    const ex = buildStrength('UPPER', 25, {}, 25)
    expect(ex.some((e) => e.test !== undefined)).toBe(true)
  })

  it('prescrit normalement les autres semaines du bloc', () => {
    expect(buildStrength('UPPER', 26, {}, 25).some((e) => e.test !== undefined)).toBe(false)
  })
})

describe('le matériel déclaré est respecté', () => {
  it('propose le lest quand il est coché', () => {
    expect(palierDe(ECHELLE_TRACTIONS, 17, ['barre', 'lest']).n).toBe('Tractions lestées')
  })

  it('remplace le lest par du tempo quand il manque, sans redescendre d’un cran', () => {
    const p = palierDe(ECHELLE_TRACTIONS, 17, ['barre'])
    expect(p.n).toBe('Tractions tempo')
    // Et surtout pas un retour aux tractions strictes : le palier reste
    // atteint, seule la facon de le durcir change.
    expect(p.facteur).toBeLessThan(1)
  })

  it('vaut aussi pour les dips et les anneaux', () => {
    expect(palierDe(ECHELLE_DIPS, 26, ['paralleles']).n).toBe('Dips tempo')
    expect(palierDe(ECHELLE_DIPS, 26, ['paralleles', 'lest']).n).toBe('Dips lestés')
    expect(palierDe(ECHELLE_DIPS, 40, ['paralleles', 'anneaux']).n).toBe('Dips aux anneaux')
    expect(palierDe(ECHELLE_DIPS, 40, ['paralleles']).n).toBe('Dips tempo')
  })

  it('ne bride rien quand le matériel n’est pas renseigné', () => {
    // Vide veut dire « pas renseigne », pas « rien » : c'est la meme regle
    // que partout, une absence de mesure n'est pas un zero.
    expect(palierDe(ECHELLE_TRACTIONS, 17, []).n).toBe('Tractions lestées')
    expect(palierDe(ECHELLE_TRACTIONS, 17, undefined).n).toBe('Tractions lestées')
  })

  it('tient la promesse du questionnaire dans la séance entière', () => {
    const sansLest = buildStrength('UPPER', 2, BENJAMIN, 1, ['barre', 'paralleles'])
    expect(nomsDe(sansLest).some((n) => n.includes('lesté'))).toBe(false)
    expect(nomsDe(sansLest)).toContain('Tractions tempo')
    expect(nomsDe(sansLest)).toContain('Dips tempo')
  })
})
