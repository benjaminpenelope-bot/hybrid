import { describe, expect, it } from 'vitest'
import { formatPeriode } from './date'

describe('formatPeriode', () => {
  it('ne répète pas le mois quand la période n’en change pas', () => {
    expect(formatPeriode('2026-03-12', '2026-03-18')).toBe('du 12 au 18 mars')
  })

  it('nomme les deux mois quand la période les traverse', () => {
    expect(formatPeriode('2026-02-28', '2026-03-06')).toBe('du 28 févr au 6 mars')
  })
})
