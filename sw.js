const CACHE   = 'urbanmap-v3'; // ← versão incrementada força substituição do cache antigo
const BASE    = '/urban-map';

// Apenas os arquivos estáticos do app — tiles do mapa ficam fora intencionalmente
const ASSETS = [
  `${BASE}/`,
  `${BASE}/index.html`,
  `${BASE}/style.css`,
  `${BASE}/app.js`,
  `${BASE}/manifest.json`,
  'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Sans:wght@300;400;500&display=swap',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.css',
  'https://unpkg.com/leaflet@1.9.4/dist/leaflet.js',
];

// Domínios cujas requisições NUNCA devem ser interceptadas pelo service worker
// (tiles do mapa, API, fontes externas)
const PASSTHROUGH = [
  'basemaps.cartocdn.com',  // tiles do mapa
  'railway.app',            // API
  'cloudinary.com',         // fotos
  'tile.openstreetmap.org', // fallback tiles
];

self.addEventListener('install', e => {
  e.waitUntil(
    caches.open(CACHE)
      .then(c => c.addAll(ASSETS))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener('activate', e => {
  e.waitUntil(
    caches.keys()
      .then(keys => Promise.all(
        keys.filter(k => k !== CACHE).map(k => caches.delete(k))
      ))
      .then(() => self.clients.claim())
  );
});

self.addEventListener('fetch', e => {
  if (e.request.method !== 'GET') return;

  const url = new URL(e.request.url);

  // Deixa passar sem interceptar: tiles, API, domínios externos
  const isPassthrough = PASSTHROUGH.some(domain => url.hostname.includes(domain));
  if (isPassthrough) return;

  // Navegação → tenta rede, cai no cache offline se falhar
  if (e.request.mode === 'navigate') {
    e.respondWith(
      fetch(e.request).catch(() => caches.match(`${BASE}/index.html`))
    );
    return;
  }

  // Demais assets estáticos → cache first, rede como fallback
  e.respondWith(
    caches.match(e.request).then(cached => {
      if (cached) return cached;
      return fetch(e.request).then(res => {
        if (res && res.status === 200) {
          const clone = res.clone();
          caches.open(CACHE).then(c => c.put(e.request, clone));
        }
        return res;
      });
    })
  );
});
