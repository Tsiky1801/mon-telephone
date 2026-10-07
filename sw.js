const CACHE = 'quiz-v4';
const FILES = [
  './',
  './index.html',
  './jeu.html',
  './telecharger.html',
  './manifest.webmanifest',
  './manifest-quiz.webmanifest',
  './styles/app.css',
  './styles/tailwind.browser.js',
  './js/components.js',
  './js/quiz-data.js',
  './js/quiz.js',
  './icons/icon-192.png',
  './icons/icon-512.png',
  './icons/icon-quiz-192.png',
  './icons/icon-quiz-512.png'
];
self.addEventListener('install', e => {
  e.waitUntil(caches.open(CACHE).then(c => c.addAll(FILES)).then(() => self.skipWaiting()));
});
self.addEventListener('activate', e => {
  e.waitUntil(caches.keys().then(keys => Promise.all(keys.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener('fetch', e => {
  const req = e.request;
  if (req.method !== 'GET' || new URL(req.url).origin !== location.origin) return;
  // réseau d'abord (toujours à jour), cache en secours (hors ligne)
  e.respondWith(
    fetch(req).then(res => {
      const copy = res.clone();
      caches.open(CACHE).then(c => c.put(req, copy)).catch(() => {});
      return res;
    }).catch(() => caches.match(req).then(hit => hit || caches.match('./jeu.html')))
  );
});
