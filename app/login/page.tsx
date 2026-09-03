import type { Metadata } from 'next'
import { ConfigurationRequise } from '@/app/configuration-requise'
import { LogoMark } from '@/components/logo'
import { hasSupabaseEnv } from '@/lib/supabase/env'
import { LoginForm } from './login-form'
import { PurgeCache } from './purge-cache'

export const metadata: Metadata = { title: 'Connexion · Hybrid' }

export default function LoginPage({
  searchParams,
}: {
  searchParams: { suite?: string; erreur?: string; deconnexion?: string; compte?: string }
}) {
  if (!hasSupabaseEnv()) return <ConfigurationRequise />

  const suite = searchParams.suite?.startsWith('/') ? searchParams.suite : '/aujourdhui'
  const compteSupprime = searchParams.compte === 'supprime'

  return (
    <main className="wrap wrap-etroit flex min-h-screen flex-col justify-center py-10">
      <div>
        {/* La marque est le sujet de cet ecran : elle porte son halo ici, et
            nulle part ailleurs. */}
        <LogoMark size={76} title="Hybrid" halo />
        <h1 className="dsp mt-5 text-[34px]">Hybrid</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-mut">
          Course, natation, barre et suivi physique dans un seul programme. Connecte-toi pour
          retrouver tes séances.
        </p>
      </div>

      {/*
        Une suppression definitive sans un mot de confirmation laisserait
        l'athlete devant un ecran de connexion, sans savoir si elle a eu lieu.
      */}
      {compteSupprime && (
        <p className="mt-4 rounded-[11px] border border-ok/40 bg-ok/10 p-3 text-[12.5px] leading-relaxed text-text">
          Ton compte et toutes tes données ont été supprimés. Il ne reste rien sur nos serveurs,
          et cet appareil vient d’être vidé de ce qu’il gardait en cache.
        </p>
      )}

      <PurgeCache
        actif={searchParams.deconnexion === '1' || compteSupprime}
        effacerLaFile={compteSupprime}
      />
      <LoginForm suite={suite} erreur={searchParams.erreur} />
    </main>
  )
}
