const CACHE = 'macaisse-shell-v2';
// Polices (texte + icônes) : cache séparé, conservé d'une version de l'app à l'autre.
const FONT_CACHE = 'macaisse-fonts-v1';
const FONT_HOSTS = ['fonts.googleapis.com', 'fonts.gstatic.com'];
const SHELL = ['/', '/index.html'];

self.addEventListener('install', (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(SHELL)).catch(() => {}));
  self.skipWaiting();
});

self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(keys.filter((k) => k !== CACHE && k !== FONT_CACHE).map((k) => caches.delete(k)))
    )
  );
  self.clients.claim();
});

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;
  const url = new URL(req.url);
  if (FONT_HOSTS.includes(url.hostname)) {
    // Polices : sert le cache tout de suite et le rafraîchit en arrière-plan. Sans cela, les
    // icônes disparaissent hors ligne. Une réponse « opaque » (feuille de style sans CORS) est
    // acceptée : on ne la lit pas, on la rejoue seulement.
    event.respondWith(
      caches.open(FONT_CACHE).then((cache) =>
        cache.match(req).then((cached) => {
          const network = fetch(req)
            .then((res) => {
              if (res && (res.ok || res.type === 'opaque')) cache.put(req, res.clone());
              return res;
            })
            .catch(() => cached);
          return cached || network;
        })
      )
    );
    return;
  }
  if (url.origin !== self.location.origin) return;
  // Ne jamais cacher les appels API : la file de rejeu (syncQueue) s'en charge.
  if (url.pathname.startsWith('/api') || url.pathname.startsWith('/orgs')) return;
  event.respondWith(
    caches.match(req).then((cached) => {
      const network = fetch(req).then((res) => {
        if (res && res.status === 200) {
          const copy = res.clone();
          caches.open(CACHE).then((c) => c.put(req, copy));
        }
        return res;
      }).catch(() => cached);
      return cached || network;
    })
  );
});
