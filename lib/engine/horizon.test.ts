import { describe, expect, it } from 'vitest'
import { BLOC_SEMAINES, HORIZON_MIN_JOURS, prolongationRequise } from './horizon'

const AUJOURD_HUI = '2026-09-04'

describe('horizon du programme', () => {
  it('ne prolonge pas tant que l’avance suffit', () => {
    // Le plan va jusqu'au 5 octobre : trente et un jours devant.
    expect(prolongationRequise(AUJOURD_HUI, '2026-10-05', 12)).toBeNull()
  })

  it('ne prolonge pas au seuil exact', () => {
    const seuil = '2026-09-25' // 21 jours
    expect(prolongationRequise(AUJOURD_HUI, seuil, 8)).toBeNull()
  })

  it('prolonge un jour avant le seuil, dans la continuité', () => {
    const r = prolongationRequise(AUJOURD_HUI, '2026-09-24', 8)
    expect(r).toEqual({ depuis: '2026-09-25', semaine: 9, semaines: BLOC_SEMAINES })
  })

  /*
   * Le cas qui a motivé le travail : huit semaines generees a l'inscription,
   * puis plus rien. Le plan se termine, et l'athlete ouvre l'application
   * devant un calendrier vide.
   */
  it('prolonge quand le plan se termine demain', () => {
    const r = prolongationRequise(AUJOURD_HUI, '2026-09-05', 8)
    expect(r?.depuis).toBe('2026-09-06')
    expect(r?.semaine).toBe(9)
  })

  it('repart d’aujourd’hui quand le plan est déjà fini', () => {
    const r = prolongationRequise(AUJOURD_HUI, '2026-08-20', 8)
    // Et non du 21 aout : on ne s'entraine pas la semaine derniere.
    expect(r).toEqual({ depuis: AUJOURD_HUI, semaine: 9, semaines: BLOC_SEMAINES })
  })

  it('repart de zéro quand il n’y a aucune séance', () => {
    expect(prolongationRequise(AUJOURD_HUI, null, 0)).toEqual({
      depuis: AUJOURD_HUI,
      semaine: 1,
      semaines: BLOC_SEMAINES,
    })
  })

  /*
   * La numerotation porte la progression du volume et le cycle de decharge.
   * La remettre a un ferait redescendre l'athlete au volume de sa premiere
   * semaine tous les deux mois.
   */
  it('ne remet jamais le compteur de semaines à zéro', () => {
    const r = prolongationRequise(AUJOURD_HUI, '2026-09-10', 40)
    expect(r?.semaine).toBe(41)
  })

  it('l’horizon vaut trois semaines', () => {
    expect(HORIZON_MIN_JOURS).toBe(21)
  })
})
