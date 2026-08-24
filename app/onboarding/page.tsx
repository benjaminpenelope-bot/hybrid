import type { Metadata } from 'next'
import { redirect } from 'next/navigation'
import { createClient, currentUserId } from '@/lib/supabase/server'
import { OnboardingForm } from './onboarding-form'

export const metadata: Metadata = { title: 'Bienvenue · Hybrid' }

export default async function OnboardingPage() {
  const userId = await currentUserId()
  if (!userId) redirect('/login?suite=/onboarding')

  const supabase = createClient()
  const { data: profile } = await supabase
    .from('profiles')
    .select('onboarded_at')
    .eq('id', userId)
    .maybeSingle()

  if (profile?.onboarded_at) redirect('/')

  return (
    <main className="wrap wrap-etroit py-8">
      <header className="mb-7">
        <h1 className="dsp text-[26px]">Construisons ton programme</h1>
        <p className="mt-2 text-[13.5px] leading-relaxed text-mut">
          Cinq étapes. Tes réponses génèrent le programme : rien n&apos;est générique, et ce que
          tu n&apos;as jamais mesuré reste marqué comme tel.
        </p>
      </header>

      <OnboardingForm />
    </main>
  )
}
