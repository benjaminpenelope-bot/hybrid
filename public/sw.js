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

const VERSION = 'v1'
const SHELL = `shell-${VERSION}`
const PAGES = `pages-${VERSION}`

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
