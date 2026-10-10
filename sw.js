const CACHE = 'kasir-v27';
const FILES = ['./', './index.html', './app.js', './manifest.json', './icon.svg', 'https://cdn.jsdelivr.net/npm/jsbarcode@3.11.5/dist/barcodes/JsBarcode.code128.min.js'];

self.addEventListener('install', e => e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES))));
self.addEventListener('activate', e => e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k))))));
self.addEventListener('fetch', e => {
    // HTML & JS selalu cek jaringan dulu, supaya update langsung dipakai
    if(e.request.mode === 'navigate' || /\.(?:js|css|html)$/.test(new URL(e.request.url).pathname)) {
        e.respondWith(fetch(e.request).then(r => {
            const copy = r.clone();
            caches.open(CACHE).then(c => c.put(e.request, copy));
            return r;
        }).catch(() => caches.match(e.request)));
        return;
    }
    e.respondWith(caches.match(e.request).then(r => r || fetch(e.request)));
});