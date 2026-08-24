/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  // typedRoutes reste désactivé : les types de routes sont générés au build,
  // donc `tsc --noEmit` échoue sur toute route ajoutée depuis la dernière
  // compilation. Le gain ne vaut pas un typecheck qui ment.
}

export default nextConfig
