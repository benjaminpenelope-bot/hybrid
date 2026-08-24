'use client'

import { enqueue, type PendingMutation } from './queue'

/**
 * Stockage de la file hors ligne, dans IndexedDB.
 * localStorage suffirait en volume mais il est synchrone et se vide plus
 * facilement ; une séance validée mérite mieux.
 */

const DB_NAME = 'athlete-os'
const STORE = 'file-attente'
const VERSION = 1

function open(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, VERSION)
    request.onupgradeneeded = () => {
      const db = request.result
      if (!db.objectStoreNames.contains(STORE)) db.createObjectStore(STORE, { keyPath: 'id' })
    }
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
  })
}

async function withStore<T>(
  mode: IDBTransactionMode,
  fn: (store: IDBObjectStore) => IDBRequest<T>,
): Promise<T> {
  const db = await open()
  return new Promise<T>((resolve, reject) => {
    const tx = db.transaction(STORE, mode)
    const request = fn(tx.objectStore(STORE))
    request.onsuccess = () => resolve(request.result)
    request.onerror = () => reject(request.error)
    tx.oncomplete = () => db.close()
  })
}

export async function readQueue(): Promise<PendingMutation[]> {
  if (typeof indexedDB === 'undefined') return []
  try {
    const all = await withStore<PendingMutation[]>('readonly', (store) => store.getAll())
    return all.sort((a, b) => a.createdAt - b.createdAt)
  } catch {
    return []
  }
}

export async function writeQueue(queue: PendingMutation[]): Promise<void> {
  if (typeof indexedDB === 'undefined') return
  const db = await open()
  await new Promise<void>((resolve, reject) => {
    const tx = db.transaction(STORE, 'readwrite')
    const store = tx.objectStore(STORE)
    store.clear()
    for (const mutation of queue) store.put(mutation)
    tx.oncomplete = () => {
      db.close()
      resolve()
    }
    tx.onerror = () => reject(tx.error)
  })
}

/**
 * Signale un changement de file. Le bandeau d'état écoute cet événement :
 * sans lui, une séance mise en attente resterait invisible jusqu'au prochain
 * rechargement, et l'athlète croirait son enregistrement parti.
 */
export const EVENEMENT_FILE = 'athlete-os:file'

function annonce(queue: PendingMutation[]): void {
  if (typeof window === 'undefined') return
  window.dispatchEvent(new CustomEvent(EVENEMENT_FILE, { detail: queue.length }))
}

export async function push(mutation: PendingMutation): Promise<PendingMutation[]> {
  const next = enqueue(await readQueue(), mutation)
  await writeQueue(next)
  annonce(next)
  return next
}
