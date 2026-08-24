import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Athlete OS',
    short_name: 'Athlete OS',
    description:
      'Entraînement hybride : course, natation, street workout et suivi physique, sur des données mesurées.',
    start_url: '/',
    display: 'standalone',
    // Pas de verrou d'orientation : l'app sert aussi sur laptop.
    orientation: 'any',
    background_color: '#0B0C0E',
    theme_color: '#0B0C0E',
    lang: 'fr',
    categories: ['health', 'fitness', 'sports'],
    icons: [
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
