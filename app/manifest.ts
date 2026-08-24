import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Hybrid',
    short_name: 'Hybrid',
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
    /*
     * Deux fichiers distincts, et pas le même déclaré deux fois : un masque
     * Android rogne l'icône sur un cercle de 80 % du côté. Le logo remplit son
     * cadre, donc la variante `maskable` est la même image remise à 86 % sur
     * du noir — sans quoi les pointes des trois bras seraient coupées.
     */
    icons: [
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' },
      { src: '/icon-maskable.png', sizes: '512x512', type: 'image/png', purpose: 'maskable' },
    ],
  }
}
