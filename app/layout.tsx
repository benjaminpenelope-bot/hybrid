import type { Metadata, Viewport } from 'next'
import { Barlow_Condensed, Inter } from 'next/font/google'
import { OfflineBar } from '@/components/offline-bar'
import { NavOffset, TabBar } from '@/components/tab-bar'
import './globals.css'

const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-barlow',
  display: 'swap',
})

const inter = Inter({
  subsets: ['latin'],
  weight: ['400', '500', '600'],
  variable: '--font-inter',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Athlete OS',
  description: "Entraînement hybride : course, natation, street workout, suivi physique.",
}

export const viewport: Viewport = {
  themeColor: '#0B0C0E',
  width: 'device-width',
  initialScale: 1,
  viewportFit: 'cover',
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="fr" className={`${barlow.variable} ${inter.variable}`}>
      <body className="font-sans">
        <NavOffset>
          <OfflineBar />
          {children}
        </NavOffset>
        <TabBar />
      </body>
    </html>
  )
}
