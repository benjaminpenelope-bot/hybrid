import { describe, expect, it } from 'vitest'
import {
  MAX_ATTEMPTS,
  blocked,
  dequeue,
  enqueue,
  isRetryable,
  makeMutation,
  markFailure,
  replayable,
  summary,
  type PendingMutation,
} from './queue'

function fail(queue: PendingMutation[], id: string, times: number): PendingMutation[] {
  let q = queue
  for (let i = 0; i < times; i++) q = markFailure(q, id, 'réseau indisponible')
  return q
}

describe('enqueue', () => {
  it("garde l'ordre de création", () => {
    const q = enqueue(
      enqueue([], makeMutation('weight', 82, 'b', 200)),
      makeMutation('weight', 81, 'a', 100),
    )
    expect(q.map((m) => m.id)).toEqual(['a', 'b'])
  })

  it('remplace une mutation de même identifiant au lieu de la doubler', () => {
    const q = enqueue(
      enqueue([], makeMutation('finishSession', { rpe: 6 }, 'seance-42', 100)),
      makeMutation('finishSession', { rpe: 8 }, 'seance-42', 300),
    )
    expect(q).toHaveLength(1)
    expect(q[0]?.payload).toEqual({ rpe: 8 })
  })
})

describe('markFailure', () => {
  it('incrémente les tentatives et retient la dernière erreur', () => {
    const q = markFailure(enqueue([], makeMutation('weight', 80, 'a')), 'a', 'timeout')
    expect(q[0]?.attempts).toBe(1)
    expect(q[0]?.lastError).toBe('timeout')
  })

  it('laisse la mutation en file tant qu’il reste des tentatives', () => {
    const q = fail(enqueue([], makeMutation('weight', 80, 'a')), 'a', MAX_ATTEMPTS - 1)
    expect(replayable(q)).toHaveLength(1)
    expect(blocked(q)).toHaveLength(0)
  })

  it('bloque la mutation au-delà du plafond, sans jamais la supprimer', () => {
    const q = fail(enqueue([], makeMutation('weight', 80, 'a')), 'a', MAX_ATTEMPTS)
    expect(replayable(q)).toHaveLength(0)
    expect(blocked(q)).toHaveLength(1)
    // La donnée de l'athlète reste là : c'est à lui de trancher, pas à l'app.
    expect(q).toHaveLength(1)
  })
})

describe('dequeue', () => {
  it('ne retire que la mutation visée', () => {
    const q = enqueue(enqueue([], makeMutation('weight', 80, 'a', 1)), makeMutation('weight', 81, 'b', 2))
    expect(dequeue(q, 'a').map((m) => m.id)).toEqual(['b'])
  })
})

describe('isRetryable', () => {
  it('réessaie sur une panne réseau', () => {
    expect(isRetryable(new TypeError('Failed to fetch'))).toBe(true)
    expect(isRetryable(new Error('network timeout'))).toBe(true)
    expect(isRetryable(new Error('connect ECONNREFUSED 127.0.0.1:3400'))).toBe(true)
  })

  it('ne réessaie pas une erreur métier', () => {
    // Rejouer une saisie refusée par la validation ne la fera jamais passer.
    expect(isRetryable(new Error('RPE hors des bornes autorisées.'))).toBe(false)
    expect(isRetryable(new Error('Session expirée.'))).toBe(false)
  })
})

describe('summary', () => {
  it('ne dit rien quand la file est vide', () => {
    expect(summary([])).toBeNull()
  })

  it('annonce les enregistrements en attente', () => {
    const q = enqueue(enqueue([], makeMutation('weight', 80, 'a', 1)), makeMutation('weight', 81, 'b', 2))
    expect(summary(q)).toBe('2 enregistrements en attente de réseau.')
  })

  it('distingue une file bloquée d’une file en attente', () => {
    const q = fail(enqueue([], makeMutation('weight', 80, 'a')), 'a', MAX_ATTEMPTS)
    expect(summary(q)).toContain('bloqué')
  })
})
