'use client'

import { useRouter } from 'next/navigation'
import { useCallback, useEffect, useState } from 'react'
import { flushQueue } from '@/lib/offline/client'
import { summary, type PendingMutation } from '@/lib/offline/queue'
import { EVENEMENT_FILE, readQueue } from '@/lib/offline/storage'

/**
 * Bandeau d'état réseau et file d'attente.
 *
 * Il dit deux choses que l'app ne doit jamais taire : que les données
 * affichées viennent peut-être du cache, et que des écritures attendent
 * encore d'être envoyées.
 */
export function OfflineBar() {
  const router = useRouter()
  const [online, setOnline] = useState(true)
  const [queue, setQueue] = useState<PendingMutation[]>([])
  const [syncing, setSyncing] = useState(false)

  const refresh = useCallback(async () => {
    setQueue(await readQueue())
  }, [])

  const sync = useCallback(async () => {
    setSyncing(true)
    const left = await flushQueue()
    setQueue(left)
    setSyncing(false)
    router.refresh()
  }, [router])

  useEffect(() => {
    setOnline(navigator.onLine)
    void refresh()

    const goOnline = () => {
      setOnline(true)
      void sync()
    }
    const goOffline = () => setOnline(false)

    const surFile = () => void refresh()

    window.addEventListener('online', goOnline)
    window.addEventListener('offline', goOffline)
    window.addEventListener(EVENEMENT_FILE, surFile)

    // Le service worker n'est enregistré qu'en production : en développement
    // il masquerait les rechargements à chaud.
    if ('serviceWorker' in navigator && process.env.NODE_ENV === 'production') {
      navigator.serviceWorker.register('/sw.js').catch(() => {
        // Enregistrement refusé (navigation privée, réglage navigateur) :
        // l'app reste utilisable en ligne, sans mode hors ligne.
      })
    }

    return () => {
      window.removeEventListener('online', goOnline)
      window.removeEventListener('offline', goOffline)
      window.removeEventListener(EVENEMENT_FILE, surFile)
    }
  }, [refresh, sync])

  const message = summary(queue)
  if (online && message === null) return null

  return (
    <div
      className="sticky top-0 z-[60] border-b px-4 py-2"
      style={{
        background: online ? 'var(--card)' : 'rgba(224,167,60,0.14)',
        borderColor: online ? 'var(--line)' : 'rgba(224,167,60,0.4)',
      }}
      role="status"
    >
      <div className="mx-auto flex w-full max-w-app items-center justify-between gap-3 lg:max-w-desk">
        <span className="text-[12px] leading-relaxed text-text">
          {!online && <b>Hors ligne. </b>}
          {!online && 'Les écrans déjà consultés restent lisibles. '}
          {message}
        </span>
        {online && message && (
          <button
            type="button"
            onClick={() => void sync()}
            disabled={syncing}
            className="eyebrow shrink-0 text-warn"
          >
            {syncing ? 'Envoi…' : 'Envoyer'}
          </button>
        )}
      </div>
    </div>
  )
}
