import type { MetadataRoute } from 'next'

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'Polytrain',
    short_name: 'Polytrain',
    description:
      'Entraînement hybride : course, natation, street workout et suivi physique, sur des données mesurées.',
    start_url: '/aujourdhui',
    display: 'standalone',
    // Pas de verrou d'orientation : l'app sert aussi sur laptop.
    orientation: 'any',
    background_color: '#0B0C0E',
    theme_color: '#0B0C0E',
    lang: 'fr',
    categories: ['health', 'fitness', 'sports'],
    /*
     * Pas de variante `maskable` : elle doit remplir toute sa zone, et le logo
     * est détouré. La déclarer laisserait des trous là où le masque attend de
     * la matière. Sans elle, chaque système pose l'icône dans son propre
     * cadre, ce que le détourage gère très bien.
     */
    icons: [{ src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }],
  }
}
