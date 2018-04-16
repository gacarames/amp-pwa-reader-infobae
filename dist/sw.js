'use strict';

importScripts('/workbox.js');
const workboxSW = new WorkboxSW({
  clientsClaim: true,
  skipWaiting: true
});

// Static precaching of images
workboxSW.precache([
  {
    "url": "img/guardian.svg",
    "revision": "71151b554813937005e3c38752a2b58b"
  },
  {
    "url": "img/icon-1x.png",
    "revision": "df80cb1dee402a915c5fb7ef5c4973b6"
  },
  {
    "url": "img/icon-2x.png",
    "revision": "c5083014e15983aba868a571a571acc9"
  },
  {
    "url": "img/icon-4x.png",
    "revision": "4fdc52b96043c0f65299afd66c7ccc11"
  },
  {
    "url": "img/infobae.svg",
    "revision": "7eee5bcaa0d1bb420c3859ae8473b1ec"
  },
  {
    "url": "img/loader.svg",
    "revision": "49c8c1d4cf72f3c02145814516c7bc9c"
  },
  {
    "url": "index.html",
    "revision": "cb1c2467de47e77da48fb7dd659485b0"
  },
  {
    "url": "inline.css",
    "revision": "31e07e15b5f43e313bbb0f8f2507d899"
  }
]);

// Register main route for all navigation links to pages
workboxSW.router.registerNavigationRoute('index.html', {
  whitelist: [/./],
  blacklist: [/img\/.*/, /\.(js|css)/]
});

// Cache external libraries and fonts
workboxSW.router.registerRoute('https://cdn.ampproject.org/(.*)', workboxSW.strategies.staleWhileRevalidate());
workboxSW.router.registerRoute('https://cdn.polyfill.io/(.*)', workboxSW.strategies.staleWhileRevalidate());
workboxSW.router.registerRoute('https://pasteup.guim.co.uk/fonts/(.*)', workboxSW.strategies.cacheFirst());

// Cache a number of YQL queries, but only for the offline scenario
workboxSW.router.registerRoute(
  'https://query.yahooapis.com/v1/public/(.*)',
  workboxSW.strategies.networkFirst()
);

// Cache a number of images
workboxSW.router.registerRoute(
  'https://i.guim.co.uk/img/(.*)',
  workboxSW.strategies.cacheFirst({
    cacheName: 'images',
    cacheExpiration: {
      maxEntries: 10,
      maxAgeSeconds: 7 * 24 * 60 * 60
    },
    cacheableResponse: {statuses: [ 0, 200 ]}
  })
);

// Make sure new versions of the Service Worker activate immediately
self.addEventListener('install', () => {
  self.skipWaiting();
});
