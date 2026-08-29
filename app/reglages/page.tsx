import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/engine/date'
import { stravaConfigured } from '@/lib/strava/client'
import { chiffrementDisponible } from '@/lib/strava/crypto'
import { createClient, currentUserId } from '@/lib/supabase/server'
import { HealthImport } from './health-import'
import { MesDonnees } from './mes-donnees'
import { MotDePasse } from './mot-de-passe'
import { StravaCard } from './strava-card'

export const dynamic = 'force-dynamic'
export const metadata = { title: 'Réglages · Hybrid' }

/** Messages d'erreur renvoyés par les routes OAuth, traduits pour l'athlète. */
const ERREURS: Record<string, string> = {
  'strava-non-configure':
    "Les identifiants Strava ne sont pas renseignés sur ce serveur. La connexion est désactivée.",
  'cle-manquante':
    "La clé de chiffrement des jetons est absente. La connexion est désactivée : sans elle, tes jetons Strava seraient stockés en clair.",
  'autorisation-refusee': 'Autorisation annulée sur Strava. Rien n’a été enregistré.',
  'etat-invalide':
    'La demande ne correspond pas à celle partie de cette app. Par sécurité, rien n’a été enregistré.',
  'code-manquant': 'Strava n’a pas renvoyé de code d’autorisation.',
  'lecture-refusee':
    "L'accès en lecture aux activités n'a pas été accordé. Sans lui, tes sorties privées resteraient invisibles et tes semaines paraîtraient incomplètes.",
  'echange-impossible': 'Strava n’a pas accepté l’échange. Réessaie dans un moment.',
}

interface StravaStatus {
  connected: boolean
  athlete_id: number | null
  last_sync: string | null
}

export default async function Page({
  searchParams,
}: {
  searchParams: { erreur?: string; strava?: string; mdp?: string }
}) {
  const userId = await currentUserId()
  if (!userId) redirect('/login?suite=/reglages')

  // Le client ne lit jamais la table `integrations` : ses droits y sont
  // révoqués. Cette fonction ne rend qu'un état, jamais un jeton.
  const supabase = createClient()

  const { data } = await supabase.rpc('strava_status')
  const statut = (Array.isArray(data) ? data[0] : data) as StravaStatus | undefined

  const erreur = searchParams.erreur ? ERREURS[searchParams.erreur] : undefined
  const configure = stravaConfigured() && chiffrementDisponible()

  return (
    <main className="wrap py-[18px]">
      <h1 className="dsp text-[22px]">Réglages</h1>
      <p className="mb-5 mt-2 text-[12.5px] leading-relaxed text-mut">
        Les imports ne remplissent que ce qui est mesuré. Ce qu&apos;une montre ne sait pas dire
        reste à saisir, et n&apos;est jamais deviné.
      </p>

      {erreur && (
        <p className="mb-4 rounded-[11px] border border-bad/40 bg-bad/10 p-3 text-[12.5px] leading-relaxed text-text">
          {erreur}
        </p>
      )}

      {searchParams.strava === 'connecte' && (
        <p className="mb-4 rounded-[11px] border border-ok/40 bg-ok/10 p-3 text-[12.5px] leading-relaxed text-text">
          Compte Strava connecté. Lance une synchronisation pour rattraper les 30 derniers jours.
        </p>
      )}

      <section className="mb-6">
        <h2 className="eyebrow mb-2.5">Strava</h2>
        <StravaCard
          configure={configure}
          connecte={statut?.connected === true}
          athleteId={statut?.athlete_id ?? null}
          derniereSynchro={
            statut?.last_sync ? formatDate(statut.last_sync.slice(0, 10)) : null
          }
        />
      </section>

      <section className="mb-6">
        <h2 className="eyebrow mb-2.5">Apple Health</h2>
        <HealthImport />
      </section>

      <section>
        <h2 className="eyebrow mb-2.5">Mot de passe</h2>
        {/*
          Supabase ne dit pas si un mot de passe existe : `provider: email`
          vaut aussi pour un compte créé par lien magique. Le texte reste donc
          valable dans les deux cas plutôt que d'affirmer à côté.
        */}
        <MotDePasse invite={searchParams.mdp === '1'} />
      </section>

      <section className="mt-6">
        <h2 className="eyebrow mb-2.5">Données personnelles</h2>
        <MesDonnees />
      </section>
    </main>
  )
}
