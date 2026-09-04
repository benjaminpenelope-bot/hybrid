/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // typedRoutes reste désactivé : les types de routes sont générés au build,
  // donc `tsc --noEmit` échoue sur toute route ajoutée depuis la dernière
  // compilation. Le gain ne vaut pas un typecheck qui ment.

  /*
   * Le raccourci iOS doit arriver sur le téléphone avec son nom et son
   * extension intacts. Sans `Content-Disposition`, Safari renomme le fichier
   * d'après ce qu'il croit lire — il l'avait enregistré en
   * « hybrid-pas.shortcut.html », que l'app Raccourcis refuse d'ouvrir.
   *
   * Le fichier est aussi passé en plist binaire : en XML, il commence par des
   * chevrons, et c'est précisément ce qui poussait Safari à y voir du HTML.
   */
  async headers() {
    return [
      {
        source: '/raccourci/hybrid-pas.shortcut',
        headers: [
          { key: 'Content-Type', value: 'application/octet-stream' },
          {
            key: 'Content-Disposition',
            value: 'attachment; filename="hybrid-pas.shortcut"',
          },
        ],
      },
    ]
  },
}

export default nextConfig
