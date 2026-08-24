import { describe, expect, it } from 'vitest'
import { moveToDate } from './reorder'
import type { Session } from './types'

function seance(over: Partial<Session> & { id: string; date: string }): Session {
  return {
    type: 'RUN',
    kind: 'run',
    status: 'planned',
    week: 1,
    title: 'Footing',
    cues: [],
    duration: 40,
    intensity: 2,
    exercises: [],
    log: null,
    rpe: null,
    rpeEst: null,
    ...over,
  }
}

const LUNDI = '2026-03-16'
const MARDI = '2026-03-17'
const MERCREDI = '2026-03-18'

describe('moveToDate', () => {
  it('déplace une séance prévue sur un jour libre', () => {
    const s = [seance({ id: 'a', date: LUNDI })]
    const r = moveToDate(s, 'a', MERCREDI)
    expect(r.ok && r.changees).toEqual([{ id: 'a', date: MERCREDI }])
    expect(r.ok && r.reposEchange).toBe(false)
  })

  it('fait descendre le repos sur le jour libéré', () => {
    // Sans cet échange, la semaine perdrait un jour de repos sans le dire.
    const s = [
      seance({ id: 'a', date: LUNDI }),
      seance({ id: 'r', date: MARDI, type: 'REST', kind: 'rest', title: 'Repos', duration: 0 }),
    ]
    const r = moveToDate(s, 'a', MARDI)
    expect(r.ok && r.changees).toEqual([
      { id: 'a', date: MARDI },
      { id: 'r', date: LUNDI },
    ])
    expect(r.ok && r.reposEchange).toBe(true)
  })

  it('ne fait pas descendre le repos sur un jour qui garde une séance', () => {
    // Le lundi conserve « b » : y poser aussi le repos ne voudrait rien dire.
    const s = [
      seance({ id: 'a', date: LUNDI }),
      seance({ id: 'b', date: LUNDI, kind: 'swim', type: 'SWIM' }),
      seance({ id: 'r', date: MARDI, type: 'REST', kind: 'rest', title: 'Repos', duration: 0 }),
    ]
    const r = moveToDate(s, 'a', MARDI)
    expect(r.ok && r.changees).toEqual([{ id: 'a', date: MARDI }])
    expect(r.ok && r.reposEchange).toBe(false)
  })

  it('refuse de déplacer une séance déjà réalisée', () => {
    // Sa date nourrit la charge, les records et les repères : la changer
    // reviendrait à déclarer un entraînement un jour où il n'a pas eu lieu.
    const s = [seance({ id: 'a', date: LUNDI, status: 'done', log: { km: 8, minutes: 40 } })]
    expect(moveToDate(s, 'a', MARDI)).toEqual({ ok: false, raison: 'deja-realisee' })
  })

  it('refuse de déplacer un jour de repos', () => {
    const s = [
      seance({ id: 'r', date: LUNDI, type: 'REST', kind: 'rest', title: 'Repos', duration: 0 }),
    ]
    expect(moveToDate(s, 'r', MARDI)).toEqual({ ok: false, raison: 'repos' })
  })

  it('refuse un dépôt sur le jour d origine', () => {
    const s = [seance({ id: 'a', date: LUNDI })]
    expect(moveToDate(s, 'a', LUNDI)).toEqual({ ok: false, raison: 'meme-jour' })
  })

  it('refuse une séance inconnue', () => {
    expect(moveToDate([], 'x', LUNDI)).toEqual({ ok: false, raison: 'introuvable' })
  })

  it('laisse coexister deux séances sur le jour d arrivée', () => {
    // Un double n'est pas interdit : c'est à l'athlète de juger, pas à l'app
    // de refuser en silence.
    const s = [
      seance({ id: 'a', date: LUNDI }),
      seance({ id: 'b', date: MARDI, kind: 'swim', type: 'SWIM' }),
    ]
    const r = moveToDate(s, 'a', MARDI)
    expect(r.ok && r.changees).toEqual([{ id: 'a', date: MARDI }])
  })

  it('permet de déplacer une séance sautée', () => {
    // Sautée veut dire « pas faite » : la reprogrammer plus loin est légitime.
    const s = [seance({ id: 'a', date: LUNDI, status: 'skipped' })]
    expect(moveToDate(s, 'a', MERCREDI).ok).toBe(true)
  })
})
