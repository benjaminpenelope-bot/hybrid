/**
 * Service worker d'HYBRID.
 *
 * Lecture hors ligne : les écrans déjà visités restent consultables, avec la
 * dernière version connue. Écriture hors ligne : rien n'est mis en cache ici,
 * les mutations passent par la file IndexedDB de l'application.
 *
 * Règle : ne jamais servir une page en cache sans que l'app puisse le dire.
 * Une donnée périmée affichée comme fraîche serait pire que pas de donnée.
 */

const VERSION = 'v2'
const SHELL = `shell-${VERSION}`
const PAGES = `pages-${VERSION}`
const RSC = `rsc-${VERSION}`

const OFFLINE_URL = '/hors-ligne'

self.addEventListener('install', (event) => {
  event.waitUntil(
    caches.open(SHELL).then((cache) => cache.addAll([OFFLINE_URL, '/manifest.webmanifest'])),
  )
  self.skipWaiting()
})

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) =>
        Promise.all(keys.filter((k) => !k.endsWith(VERSION)).map((k) => caches.delete(k))),
      )
      .then(() => self.clients.claim()),
  )
})

/** Les écritures et l'API ne passent jamais par le cache. */
function isReadNavigation(request) {
  return request.method === 'GET' && request.mode === 'navigate'
}

function isStatic(url) {
  return url.pathname.startsWith('/_next/static') || url.pathname.startsWith('/fonts')
}

/**
 * Changement d'onglet côté client : le routeur ne recharge pas la page, il va
 * chercher la charge utile React du nouvel écran. Ces requêtes ne portent pas
 * `mode: 'navigate'` — sans ce cas, elles échouaient hors ligne et l'athlète
 * restait bloqué sur l'écran d'accueil.
 */
function isRouterFetch(request) {
  return request.headers.get('RSC') === '1'
}

/**
 * Préchargement anticipé du routeur. Sur un écran dynamique, il ne rend que la
 * frontière de chargement, pas le contenu : le mettre en cache ferait servir
 * un squelette perpétuel hors ligne. On le laisse passer sans le retenir.
 */
function isPrefetch(request) {
  return request.headers.get('Next-Router-Prefetch') === '1'
}

/**
 * Même URL, deux réponses différentes selon l'en-tête `RSC` : la page HTML et
 * la charge utile du routeur. Les ranger sous la même clé ferait servir l'une
 * à la place de l'autre, et l'écran s'afficherait en HTML brut.
 */
function rscKey(url) {
  return new Request(`${url.pathname}${url.search ? `${url.search}&` : '?'}__sw=rsc`)
}

self.addEventListener('fetch', (event) => {
  const { request } = event
  const url = new URL(request.url)

  if (url.origin !== self.location.origin) return
  if (request.method !== 'GET') return
  if (url.pathname.startsWith('/api/')) return
  if (url.pathname.startsWith('/auth/')) return

  // Statique immuable : cache d'abord, c'est le seul cas où c'est sans risque.
  if (isStatic(url)) {
    event.respondWith(
      caches.match(request).then(
        (hit) =>
          hit ??
          fetch(request).then((response) => {
            const copy = response.clone()
            caches.open(SHELL).then((cache) => cache.put(request, copy))
            return response
          }),
      ),
    )
    return
  }

  // Navigation du routeur : réseau d'abord, cache en secours. C'est ce qui
  // permet de changer d'onglet hors ligne, sur les écrans déjà visités.
  if (isRouterFetch(request) && !isPrefetch(request)) {
    const cle = rscKey(url)
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(RSC).then((cache) => cache.put(cle, copy))
          return response
        })
        .catch(async () => (await caches.match(cle)) ?? Response.error()),
    )
    return
  }

  // Pages : réseau d'abord, cache en secours. L'app affiche un bandeau
  // « hors ligne » à partir de navigator.onLine, donc la donnée servie depuis
  // le cache n'est jamais présentée comme fraîche.
  if (isReadNavigation(request)) {
    event.respondWith(
      fetch(request)
        .then((response) => {
          const copy = response.clone()
          caches.open(PAGES).then((cache) => cache.put(request, copy))
          return response
        })
        .catch(async () => {
          const cached = await caches.match(request)
          if (cached) return cached
          const offline = await caches.match(OFFLINE_URL)
          return offline ?? Response.error()
        }),
    )
  }
})

/** L'application demande un vidage après déconnexion : aucune donnée ne survit. */
self.addEventListener('message', (event) => {
  if (event.data === 'vider-le-cache') {
    event.waitUntil(caches.keys().then((keys) => Promise.all(keys.map((k) => caches.delete(k)))))
  }
})
