/* Estúdio de Vídeos: funciona sem internet e recebe fotos pelo menu Compartilhar. */
const CACHE = 'appsara-v3';
const SHARE = 'appsara-share';
const FILES = ['./', './index.html', './manifest.json', './icon-192.png', './icon-512.png'];

self.addEventListener('install', e => { e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting())); });
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE && k !== SHARE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});

self.addEventListener('fetch', e => {
  const url = new URL(e.request.url);
  if (e.request.method === 'POST' && url.pathname.endsWith('/share')) {
    e.respondWith((async () => {
      try {
        const form = await e.request.formData();
        const fotos = form.getAll('fotos').filter(f => f && f.size);
        const c = await caches.open(SHARE);
        for (const k of await c.keys()) await c.delete(k);
        let i = 0;
        for (const f of fotos) await c.put('./shared/' + (i++), new Response(f, { headers: { 'Content-Type': f.type || 'image/jpeg' } }));
      } catch (err) {}
      return Response.redirect('./?recebido=1', 303);
    })());
    return;
  }
  if (e.request.method !== 'GET' || url.origin !== location.origin) return;
  // Rede primeiro, para ela sempre ver a versão nova; cache quando estiver sem internet.
  e.respondWith(fetch(e.request).then(r => {
    if (r.ok) { const copy = r.clone(); caches.open(CACHE).then(c => c.put(e.request, copy)); }
    return r;
  }).catch(() => caches.match(e.request).then(r => r || caches.match('./index.html'))));
});
