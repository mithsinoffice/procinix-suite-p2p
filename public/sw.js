const CACHE = 'procinix-v2-shell'
const PRECACHE = ['/', '/index.html']

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE).then(c => c.addAll(PRECACHE)).then(() => self.skipWaiting())
  )
})

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return
  if (e.request.url.includes('/api/')) return
  if (e.request.url.includes('/auth/')) return
  e.respondWith(
    caches.match(e.request).then(cached => {
      const networkFetch = fetch(e.request.clone()).then(res => {
        if (res.ok && res.status < 400) {
          const toCache = res.clone()
          caches.open(CACHE).then(c => c.put(e.request, toCache))
        }
        return res
      }).catch(() => cached)
      return cached || networkFetch
    })
  )
})
