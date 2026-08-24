'use client'

import { useEffect } from 'react'

/**
 * Vide les pages mises en cache après une déconnexion volontaire.
 *
 * Le service worker garde les écrans déjà visités pour les rendre lisibles
 * hors ligne. Ces écrans contiennent des poids, des séances, des douleurs
 * déclarées : rien de tout ça ne doit survivre à une déconnexion sur un
 * appareil partagé.
 *
 * La file d'attente hors ligne, elle, n'est pas touchée. Elle contient des
 * séances que l'athlète a faites et qui ne sont pas encore parties ; les
 * effacer serait perdre son travail, pas protéger sa vie privée.
 */
export function PurgeCache({ actif }: { actif: boolean }) {
  useEffect(() => {
    if (!actif) return

    if ('caches' in window) {
      void caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k))))
    }

    navigator.serviceWorker?.controller?.postMessage('vider-le-cache')
  }, [actif])

  return null
}
