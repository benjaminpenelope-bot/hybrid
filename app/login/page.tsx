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
  searchParams: { suite?: string; erreur?: string; deconnexion?: string }
}) {
  if (!hasSupabaseEnv()) return <ConfigurationRequise />

  const suite = searchParams.suite?.startsWith('/') ? searchParams.suite : '/'

  return (
    <main className="wrap wrap-etroit flex min-h-screen flex-col justify-center py-10">
      <div>
        <LogoMark size={54} title="Hybrid" />
        <h1 className="dsp mt-3 text-[28px]">Hybrid</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-mut">
          Course, natation, barre et suivi physique dans un seul programme. Connecte-toi pour
          retrouver tes séances.
        </p>
      </div>

      <PurgeCache actif={searchParams.deconnexion === '1'} />
      <LoginForm suite={suite} erreur={searchParams.erreur} />
    </main>
  )
}
