/* ============================================================
   True Tree Care — service worker
   ------------------------------------------------------------
   GENERATED FILE. Do not edit sw.js directly — edit
   tools/sw-template.js and run `python3 tools/build.py`.

   The precache list and VERSION below are generated from the
   actual bytes on disk, so any content change produces a new
   version and retires the old cache automatically.

   Caches
   ------
   shell   versioned. The app: pages, CSS, JS, data files.
           Wiped and rebuilt on every deploy.
   tiles   unversioned. Map imagery, capped and trimmed FIFO.
           Deliberately survives deploys — a crew that cached a
           work area should not lose it because we shipped a
           copy edit.
   vendor  unversioned. Leaflet from the CDN.
   ============================================================ */

var VERSION = "11240bf5deaf";
var SHELL = "ttc-shell-" + VERSION;
var TILES = "ttc-tiles-v1";
var VENDOR = "ttc-vendor-v1";

var PRECACHE = [
  "./",
  "./about.html",
  "./app/planting.html",
  "./app/plot.html",
  "./app/risk.html",
  "./app/study.html",
  "./assets/css/app.css",
  "./assets/css/main.css",
  "./assets/img/apple-touch-icon.png",
  "./assets/img/icon-192.png",
  "./assets/img/icon-512.png",
  "./assets/img/icon-maskable-512.png",
  "./assets/js/contact.js",
  "./assets/js/planting.js",
  "./assets/js/plot.js",
  "./assets/js/risk.js",
  "./assets/js/site.js",
  "./assets/js/study.js",
  "./contact.html",
  "./data/species.js",
  "./data/study.js",
  "./data/zones.js",
  "./index.html",
  "./manifest.webmanifest",
  "./platform.html",
  "./services.html",
  "./assets/vendor/leaflet/images/layers-2x.png",
  "./assets/vendor/leaflet/images/layers.png",
  "./assets/vendor/leaflet/images/marker-icon-2x.png",
  "./assets/vendor/leaflet/images/marker-icon.png",
  "./assets/vendor/leaflet/images/marker-shadow.png",
  "./assets/vendor/leaflet/leaflet.css",
  "./assets/vendor/leaflet/leaflet.js"
];

/* Cross-origin assets warmed at install. Empty when Leaflet has been
   vendored locally (tools/vendor-leaflet.sh), in which case it lives in the
   shell precache instead and the site makes no third-party requests at all.

   Warming these at install rather than on first visit to the map page is the
   difference between "the map works offline" and "the map works offline only
   if you happened to open it while you still had signal." */
var VENDOR_PRECACHE = [];

/* Map imagery is the bulk of offline storage. At roughly 15 KB a tile this
   cap is on the order of 45 MB, which covers a large working area without
   pushing against browser eviction thresholds. */
var TILE_LIMIT = 3000;

/* A field connection that is "present but useless" is worse than no
   connection: without a deadline every navigation hangs until TCP gives up. */
var NAV_TIMEOUT_MS = 3500;

var TILE_HOST = /(^|\.)tile\.openstreetmap\.org$/;
var VENDOR_HOST = /(^|\.)cdnjs\.cloudflare\.com$/;

/* ---------- Install ---------- */

self.addEventListener("install", function (event) {
  event.waitUntil(Promise.all([
    caches.open(SHELL).then(function (cache) {
      /* Request each explicitly rather than cache.addAll, so one 404 during
         a partial deploy cannot fail the whole install and leave the user
         with no service worker at all. */
      return Promise.all(PRECACHE.map(function (url) {
        return cache.add(new Request(url, { cache: "reload" }))["catch"](function (err) {
          console.warn("[sw] precache miss:", url, err && err.message);
        });
      }));
    }),
    caches.open(VENDOR).then(function (cache) {
      return Promise.all(VENDOR_PRECACHE.map(function (url) {
        return cache.match(url).then(function (hit) {
          if (hit) return null;
          return cache.add(new Request(url, { mode: "cors" }))["catch"](function (err) {
            console.warn("[sw] vendor precache miss:", url, err && err.message);
          });
        });
      }));
    })
  ]));
});

/* ---------- Activate ---------- */

self.addEventListener("activate", function (event) {
  event.waitUntil(
    caches.keys().then(function (names) {
      return Promise.all(names.map(function (name) {
        /* Retire previous shell versions. Leave tiles and vendor alone. */
        if (name.indexOf("ttc-shell-") === 0 && name !== SHELL) return caches.delete(name);
        return null;
      }));
    }).then(function () {
      return self.clients.claim();
    })
  );
});

/* ---------- Strategies ---------- */

function cacheFirst(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (hit) {
      if (hit) return hit;
      return fetch(request).then(function (res) {
        if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone());
        return res;
      });
    });
  });
}

function staleWhileRevalidate(request, cacheName) {
  return caches.open(cacheName).then(function (cache) {
    return cache.match(request).then(function (hit) {
      var network = fetch(request).then(function (res) {
        if (res && res.ok) cache.put(request, res.clone());
        return res;
      })["catch"](function () { return hit; });
      return hit || network;
    });
  });
}

/* Network-first with a deadline, falling back to whatever we have. */
function navigationStrategy(request) {
  return new Promise(function (resolve) {
    var settled = false;
    var timer = setTimeout(function () {
      if (settled) return;
      settled = true;
      resolve(fallback(request));
    }, NAV_TIMEOUT_MS);

    fetch(request).then(function (res) {
      if (settled) {
        /* Landed after the deadline — still worth refreshing the cache. */
        if (res && res.ok) caches.open(SHELL).then(function (c) { c.put(request, res.clone()); });
        return;
      }
      settled = true;
      clearTimeout(timer);
      if (res && res.ok) caches.open(SHELL).then(function (c) { c.put(request, res.clone()); });
      resolve(res);
    })["catch"](function () {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve(fallback(request));
    });
  });
}

function fallback(request) {
  return caches.match(request).then(function (hit) {
    if (hit) return hit;
    /* Unknown route while offline — hand back the home page rather than the
       browser's dinosaur, so the nav is still usable. */
    return caches.match(new URL("index.html", self.registration.scope).href)
      .then(function (home) {
        return home || new Response(
          "<!doctype html><meta charset=utf-8><title>Offline</title>" +
          "<style>body{font:16px system-ui;margin:3rem auto;max-width:34rem;padding:0 1.5rem;color:#221f1a}</style>" +
          "<h1>Offline</h1><p>This page has not been cached for offline use. " +
          "Reconnect, or go back to a page you have already opened.</p>",
          { headers: { "Content-Type": "text/html; charset=utf-8" }, status: 503 }
        );
      });
  });
}

/* ---------- Tile cache with FIFO trim ---------- */

function trimTiles() {
  return caches.open(TILES).then(function (cache) {
    return cache.keys().then(function (keys) {
      if (keys.length <= TILE_LIMIT) return null;
      /* Cache.keys() returns insertion order, so the head is the oldest. */
      var excess = keys.slice(0, keys.length - TILE_LIMIT);
      return Promise.all(excess.map(function (k) { return cache.delete(k); }));
    });
  });
}

function tileStrategy(request) {
  return caches.open(TILES).then(function (cache) {
    return cache.match(request).then(function (hit) {
      if (hit) return hit;
      return fetch(request).then(function (res) {
        if (res && res.ok) {
          cache.put(request, res.clone()).then(trimTiles);
        }
        return res;
      })["catch"](function () {
        /* Offline with no tile: a transparent 1x1 keeps Leaflet's grid intact
           instead of throwing a broken-image icon into every empty slot. */
        return new Response(
          Uint8Array.from(atob(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYPhfDwAChwGA60e6kgAAAABJRU5ErkJggg=="
          ), function (c) { return c.charCodeAt(0); }),
          { headers: { "Content-Type": "image/png" } }
        );
      });
    });
  });
}

/* ---------- Fetch routing ---------- */

self.addEventListener("fetch", function (event) {
  var request = event.request;
  if (request.method !== "GET") return;

  var url;
  try { url = new URL(request.url); } catch (e) { return; }
  if (url.protocol !== "http:" && url.protocol !== "https:") return;

  if (TILE_HOST.test(url.hostname)) {
    event.respondWith(tileStrategy(request));
    return;
  }

  if (VENDOR_HOST.test(url.hostname)) {
    event.respondWith(staleWhileRevalidate(request, VENDOR));
    return;
  }

  if (url.origin !== self.location.origin) return;

  if (request.mode === "navigate") {
    event.respondWith(navigationStrategy(request));
    return;
  }

  event.respondWith(
    caches.open(SHELL).then(function (cache) {
      return cache.match(request).then(function (hit) {
        if (hit) {
          /* Refresh in the background; the user gets the cached copy now. */
          fetch(request).then(function (res) {
            if (res && res.ok) cache.put(request, res.clone());
          })["catch"](function () {});
          return hit;
        }
        return fetch(request).then(function (res) {
          if (res && res.ok && url.origin === self.location.origin) {
            cache.put(request, res.clone());
          }
          return res;
        })["catch"](function () {
          return new Response("", { status: 504, statusText: "Offline" });
        });
      });
    })
  );
});

/* ---------- Page messaging ---------- */

function reply(event, payload) {
  if (event.source && event.source.postMessage) event.source.postMessage(payload);
}

self.addEventListener("message", function (event) {
  var data = event.data || {};

  if (data.type === "SKIP_WAITING") {
    self.skipWaiting();
    return;
  }

  /* Bulk tile prefetch for "save this area". The page computes the tile URLs
     and enforces its own cap; we fetch them a few at a time so a field device
     on a weak connection is not hammered, and so we stay polite to the tile
     server. */
  if (data.type === "CACHE_TILES") {
    var urls = (data.urls || []).slice(0, TILE_LIMIT);
    event.waitUntil(caches.open(TILES).then(function (cache) {
      var done = 0, failed = 0, index = 0;
      var CONCURRENCY = 4;

      function next() {
        if (index >= urls.length) return Promise.resolve();
        var url = urls[index++];
        return cache.match(url).then(function (hit) {
          if (hit) { done++; return null; }
          return fetch(url, { mode: "cors" }).then(function (res) {
            if (res && res.ok) return cache.put(url, res.clone());
            failed++;
            return null;
          })["catch"](function () { failed++; });
        }).then(function () {
          done++;
          if (done % 25 === 0 || done === urls.length) {
            reply(event, { type: "TILE_PROGRESS", done: done, total: urls.length });
          }
          return next();
        });
      }

      var workers = [];
      for (var i = 0; i < CONCURRENCY; i++) workers.push(next());
      return Promise.all(workers).then(trimTiles).then(function () {
        reply(event, { type: "TILE_DONE", done: done, failed: failed, total: urls.length });
      });
    }));
    return;
  }

  if (data.type === "TILE_STATS") {
    event.waitUntil(caches.open(TILES).then(function (cache) {
      return cache.keys().then(function (keys) {
        reply(event, { type: "TILE_STATS", count: keys.length, limit: TILE_LIMIT });
      });
    }));
    return;
  }

  if (data.type === "CLEAR_TILES") {
    event.waitUntil(caches.delete(TILES).then(function () {
      reply(event, { type: "TILE_STATS", count: 0, limit: TILE_LIMIT });
    }));
  }
});
