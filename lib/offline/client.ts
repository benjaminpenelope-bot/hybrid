'use client'

import { finishSession } from '@/app/seance/actions'
import { saveWeight } from '@/app/corps/actions'
import { saveWellness } from '@/app/recuperation/actions'
import type { FinishSessionInput } from '@/lib/validation/session'
import { isRetryable, makeMutation, type MutationKind, type PendingMutation } from './queue'
import { push, readQueue, writeQueue } from './storage'
import { dequeue, markFailure, replayable } from './queue'

/** Rejoue une mutation. Les actions sont les mêmes qu'en ligne : rien de parallèle. */
async function run(mutation: PendingMutation): Promise<{ ok: boolean; message?: string }> {
  switch (mutation.kind) {
    case 'finishSession':
      return (
        (await finishSession(mutation.payload as FinishSessionInput)) ?? { ok: true }
      )
    case 'wellness':
      return saveWellness(mutation.payload as Parameters<typeof saveWellness>[0])
    case 'weight':
      return saveWeight(mutation.payload as number)
  }
}

export interface QueuedResult {
  /** true quand l'écriture est partie en file plutôt qu'au serveur. */
  queued: boolean
  ok: boolean
  message?: string
}

/**
 * Tente l'écriture. Hors ligne, ou si le réseau lâche en route, la mutation
 * part en file au lieu d'être perdue. Une erreur métier, elle, remonte
 * immédiatement : la remettre en file ne la corrigerait pas.
 */
export async function submitOrQueue(
  kind: MutationKind,
  id: string,
  payload: unknown,
  attempt: () => Promise<{ ok: boolean; message?: string } | void>,
): Promise<QueuedResult> {
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    await push(makeMutation(kind, payload, id))
    return { queued: true, ok: true }
  }

  try {
    const result = (await attempt()) ?? { ok: true }
    return { queued: false, ...result }
  } catch (error) {
    if (!isRetryable(error)) {
      return { queued: false, ok: false, message: (error as Error).message }
    }
    await push(makeMutation(kind, payload, id))
    return { queued: true, ok: true }
  }
}

/** Rejoue la file. Renvoie ce qu'il reste après passage. */
export async function flushQueue(): Promise<PendingMutation[]> {
  let queue = await readQueue()

  for (const mutation of replayable(queue)) {
    try {
      const result = await run(mutation)
      queue = result.ok
        ? dequeue(queue, mutation.id)
        : markFailure(queue, mutation.id, result.message ?? 'Refusé par le serveur.')
    } catch (error) {
      if (!isRetryable(error)) {
        queue = markFailure(queue, mutation.id, (error as Error).message)
      } else {
        // Le réseau est retombé : on garde la file telle quelle et on réessaiera.
        break
      }
    }
  }

  await writeQueue(queue)
  return queue
}
