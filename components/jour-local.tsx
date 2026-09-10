'use client'

import { useRouter } from 'next/navigation'
import { useEffect, useRef } from 'react'
import { COOKIE_FUSEAU, jourLocal, msAvantMinuit } from '@/lib/engine/fuseau'

/**
 * LE JOUR SE TOURNE À MINUIT
 *
 * Deux choses, et il fallait les deux pour que la séance du jour change
 * vraiment à minuit.
 *
 * LE FUSEAU. Le serveur calcule « aujourd'hui » avec sa propre horloge, qui
 * est celle d'UTC. À Paris en été, il annonçait donc la veille jusqu'à deux
 * heures du matin. Ce composant écrit le fuseau du navigateur dans un témoin
 * et demande un nouveau rendu quand il vient de le poser : la page suivante
 * est calculée sur le bon jour.
 *
 * LE MINUTEUR. Une application installée reste ouverte la nuit. Même avec le
 * bon fuseau, un écran rendu la veille reste la veille : rien ne le recalcule
 * tout seul. Un minuteur cale donc un rafraîchissement sur le prochain
 * minuteur local, puis se replace pour le suivant.
 *
 * Et le retour à l'écran, qui est le cas le plus fréquent : on rouvre l'app
 * le matin, l'onglet redevient visible, et si la date a tourné depuis le
 * dernier rendu on recharge. Un minuteur seul ne suffirait pas — le système
 * suspend les temporisations d'un onglet en arrière-plan.
 */
export function JourLocal() {
  const router = useRouter()
  const jourRendu = useRef(jourLocal())

  useEffect(() => {
    const fuseau = Intl.DateTimeFormat().resolvedOptions().timeZone

    /*
     * Le temoin est relu a chaque rendu de serveur, donc il doit vivre
     * au-dela de la session. Un an, `SameSite=Lax` : il ne part jamais vers
     * un autre site, et il ne contient qu'un nom de fuseau.
     */
    const actuel = document.cookie
      .split('; ')
      .find((c) => c.startsWith(`${COOKIE_FUSEAU}=`))
      ?.slice(COOKIE_FUSEAU.length + 1)

    if (fuseau && actuel !== fuseau) {
      document.cookie = `${COOKIE_FUSEAU}=${fuseau}; path=/; max-age=31536000; SameSite=Lax`
      // Le rendu en cours a ete calcule sans le temoin : on le refait.
      router.refresh()
    }

    let minuteur: ReturnType<typeof setTimeout> | undefined

    const programmer = () => {
      // Deux secondes de marge : un rafraichissement declenche a la
      // milliseconde pres retomberait parfois sur la veille.
      const delai = msAvantMinuit(fuseau) + 2000
      minuteur = setTimeout(() => {
        jourRendu.current = jourLocal()
        router.refresh()
        programmer()
      }, delai)
    }
    programmer()

    const auRetour = () => {
      if (document.visibilityState !== 'visible') return
      const maintenant = jourLocal()
      if (maintenant === jourRendu.current) return
      jourRendu.current = maintenant
      router.refresh()
    }
    document.addEventListener('visibilitychange', auRetour)

    return () => {
      if (minuteur !== undefined) clearTimeout(minuteur)
      document.removeEventListener('visibilitychange', auRetour)
    }
  }, [router])

  return null
}
