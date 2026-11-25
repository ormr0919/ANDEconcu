/*
 * Service worker: guarda la app para jugar sin conexión.
 * Cambiá VERSION cada vez que publiques cambios para que los celulares descarguen la versión nueva.
 */
const VERSION = 'camino-v4';
const ARCHIVOS = [
  './', './index.html', './manifest.webmanifest', './css/juego.css',
  './js/app.js', './js/puestos.js', './js/fuentes.js', './js/ranking.js', './js/firebase-config.js',
  './js/preguntas-cpi-1.js', './js/preguntas-cpi-2.js', './js/preguntas-ing.js', './js/preguntas-extra.js', './js/perfil.js',
  './img/icono-192.png', './img/icono-512.png', './img/apple-touch-icon.png'
];

self.addEventListener('install', function (e) {
  e.waitUntil(caches.open(VERSION).then(function (c) { return c.addAll(ARCHIVOS); }).then(function () { return self.skipWaiting(); }));
});

self.addEventListener('activate', function (e) {
  e.waitUntil(caches.keys().then(function (ks) {
    return Promise.all(ks.filter(function (k) { return k !== VERSION; }).map(function (k) { return caches.delete(k); }));
  }).then(function () { return self.clients.claim(); }));
});

self.addEventListener('fetch', function (e) {
  const req = e.request;
  if (req.method !== 'GET') { return; }
  const url = new URL(req.url);
  // Firebase y Firestore siempre van a la red (datos en tiempo real).
  if (/firebase|googleapis\.com\/(google\.firestore|identitytoolkit)|securetoken/.test(url.href) && !/fonts\.googleapis/.test(url.href)) { return; }
  // Fuentes de Google: se guardan la primera vez que se usan.
  if (/fonts\.(googleapis|gstatic)\.com/.test(url.host)) {
    e.respondWith(caches.open(VERSION).then(function (c) {
      return c.match(req).then(function (r) {
        const red = fetch(req).then(function (res) { c.put(req, res.clone()); return res; }).catch(function () { return r; });
        return r || red;
      });
    }));
    return;
  }
  if (url.origin !== location.origin) { return; }
  // Archivos propios: primero la red (para tener siempre la última versión), y si no hay conexión, la copia guardada.
  // «no-cache» obliga a revisar con el servidor, así nunca se mezcla un archivo viejo con uno nuevo.
  const red = req.mode === 'navigate' ? fetch(req) : fetch(req, { cache: 'no-cache' });
  e.respondWith(red.then(function (res) {
    const copia = res.clone();
    caches.open(VERSION).then(function (c) { c.put(req, copia); });
    return res;
  }).catch(function () {
    return caches.match(req, { ignoreSearch: true }).then(function (r) { return r || caches.match('./index.html'); });
  }));
});
