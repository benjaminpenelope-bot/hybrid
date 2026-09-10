import type { Metadata, Viewport } from 'next'
import { Inter } from 'next/font/google'
import { JourLocal } from '@/components/jour-local'
import { OfflineBar } from '@/components/offline-bar'
import { NavOffset, TabBar } from '@/components/tab-bar'
import './globals.css'


const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Hybrid',
  description: "Entraînement hybride : course, natation, street workout, suivi physique.",
}

export const viewport: Viewport = {
  themeColor: '#0B0C0E',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
  /*
   * Pas de zoom à deux doigts : dans une app installée, il déplace la mise en
   * page sans jamais rien révéler de plus, et on en sort mal.
   *
   * iOS n'applique ce verrou qu'en mode autonome — dans Safari il l'ignore
   * volontairement, pour ne pas priver de zoom qui en a besoin. C'est le bon
   * partage : figé dans l'app, libre dans le navigateur.
   */
  maximumScale: 1,
  userScalable: false,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${inter.variable}`}>
      <body className="font-sans">
        {/* Le fuseau de l'athlete et le passage de minuit. Ne rend rien. */}
        <JourLocal />
        <NavOffset>
          <OfflineBar />
          {children}
        </NavOffset>
        <TabBar />
      </body>
    </html>
  )
}
