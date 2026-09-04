import Link from 'next/link'
import { redirect } from 'next/navigation'
import { formatDate } from '@/lib/engine/date'
import { stravaConfigured } from '@/lib/strava/client'
import { chiffrementDisponible } from '@/lib/strava/crypto'
import { joursRestants, lireAbonnement } from '@/lib/coach/abonnement'
import { LIMITES, planDe } from '@/lib/coach/quota'
import { createClient, currentUserId } from '@/lib/supabase/server'
import { HealthImport } from './health-import'
import { adresseDuSite } from '@/lib/paiement/stripe'
import { ImportAuto } from './import-auto'
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

  const [plan, abonnement] = await Promise.all([planDe(userId), lireAbonnement(userId)])

  // Le client ne lit jamais la table `integrations` : ses droits y sont
  // révoqués. Cette fonction ne rend qu'un état, jamais un jeton.
  const supabase = createClient()

  const { data } = await supabase.rpc('strava_status')
  const statut = (Array.isArray(data) ? data[0] : data) as StravaStatus | undefined

  /*
   * Le jeton d'import : on ne lit que son existence et la date du dernier
   * envoi. L'empreinte elle-meme n'a aucune raison de remonter jusqu'ici.
   */
  const { data: jetonRow } = await supabase
    .from('profiles')
    .select('ingest_token_hash, ingest_token_last_used_at')
    .eq('id', userId)
    .maybeSingle<{ ingest_token_hash: string | null; ingest_token_last_used_at: string | null }>()

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

      {/*
        L'import automatique passe en premier : c'est le seul des trois qui ne
        demande rien apres son installation, et les deux autres se lisent
        mieux comme ses appoints.
      */}
      <section className="mb-6">
        <h2 className="eyebrow mb-2.5">Import automatique</h2>
        <ImportAuto
          adresse={`${adresseDuSite()}/api/ingest`}
          jetonExiste={Boolean(jetonRow?.ingest_token_hash)}
          dernierEnvoi={
            jetonRow?.ingest_token_last_used_at
              ? formatDate(jetonRow.ingest_token_last_used_at.slice(0, 10))
              : null
          }
        />
      </section>

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
        <h2 className="eyebrow mb-2.5">Abonnement</h2>
        <div className="card">
          <div className="flex items-baseline justify-between gap-3">
            <h3 className="text-[14px]">{plan === 'pro' ? 'HYBRID PRO' : 'HYBRID'}</h3>
            <span className="num shrink-0 text-[12.5px] text-mut">
              {plan === 'pro' ? 'actif' : 'gratuit'}
            </span>
          </div>

          <p className="mt-2 text-[12.5px] leading-relaxed text-mut">
            {plan === 'pro' && abonnement
              ? `${abonnement.statut === 'essai' ? 'Essai' : 'Abonnement'} en cours, ${joursRestants(abonnement, new Date())} jour(s) restant(s). Coach : ${LIMITES.pro.jour} messages par jour.`
              : `Coach : ${LIMITES.free.jour} messages par jour, ${LIMITES.free.mois} par mois. Tout le reste de l’app est inclus, sans limite.`}
          </p>

          <Link
            href="/pro"
            className="mt-3 inline-block rounded-[10px] border border-line2 bg-bg2 px-3 py-2 text-[12.5px] text-text"
          >
            {plan === 'pro' ? 'Voir mon abonnement' : 'Découvrir HYBRID PRO'}
          </Link>
        </div>
      </section>

      <section className="mt-6">
        <h2 className="eyebrow mb-2.5">Données personnelles</h2>
        <MesDonnees />
      </section>
    </main>
  )
}
