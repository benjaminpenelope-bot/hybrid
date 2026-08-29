'use client'

import { useEffect } from 'react'
import { writeQueue } from '@/lib/offline/storage'

/**
 * Vide les pages mises en cache après une déconnexion volontaire.
 *
 * Le service worker garde les écrans déjà visités pour les rendre lisibles
 * hors ligne. Ces écrans contiennent des poids, des séances, des douleurs
 * déclarées : rien de tout ça ne doit survivre à une déconnexion sur un
 * appareil partagé.
 *
 * La file d'attente hors ligne, elle, survit à une déconnexion. Elle contient
 * des séances que l'athlète a faites et qui ne sont pas encore parties ; les
 * effacer serait perdre son travail, pas protéger sa vie privée.
 *
 * Après une suppression de compte, c'est l'inverse : la file ne peut plus
 * partir nulle part, et ce qu'elle contient appartient à un compte qui
 * n'existe plus. `effacerLaFile` la vide alors aussi.
 */
export function PurgeCache({
  actif,
  effacerLaFile = false,
}: {
  actif: boolean
  effacerLaFile?: boolean
}) {
  useEffect(() => {
    if (!actif) return

    if ('caches' in window) {
      void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    }

    if (effacerLaFile) void writeQueue([])

    navigator.serviceWorker?.controller?.postMessage('vider-le-cache')
  }, [actif, effacerLaFile])

  return null
}
