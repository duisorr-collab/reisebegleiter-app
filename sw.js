/* Service Worker des Reisebegleiters. Version d1a029e8da8c
   App-Seite: erst Netz (damit Updates ankommen), sonst gespeicherte Fassung.
   Leaflet und Schriften: aus dem Speicher, im Hintergrund aktualisiert.
   Kartenkacheln: zuletzt angesehene Kacheln werden begrenzt aufgehoben, damit bekannte Ausschnitte offline erscheinen. */
const APP = "app-d1a029e8da8c", LIB = "lib-v1", TILES = "tiles-v1", TILE_MAX = 600;
const SHELL = ["./", "index.html", "manifest.webmanifest", "icon-180.png", "icon-192.png", "icon-512.png"];
self.addEventListener("install", e => { e.waitUntil(caches.open(APP).then(c => c.addAll(SHELL)).then(() => self.skipWaiting())); });
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k.startsWith("app-") && k !== APP).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
async function trimTiles() { const c = await caches.open(TILES), ks = await c.keys(); for (let i = 0; i < ks.length - TILE_MAX; i++) await c.delete(ks[i]); }
self.addEventListener("fetch", e => {
  const r = e.request; if (r.method !== "GET") return;
  const u = new URL(r.url);
  if (u.origin === location.origin) {
    if (r.mode === "navigate" || u.pathname.endsWith("/") || u.pathname.endsWith("index.html")) {
      e.respondWith(fetch(r).then(res => { const cp = res.clone(); caches.open(APP).then(c => c.put("index.html", cp)); return res; })
        .catch(() => caches.match("index.html")));
    } else e.respondWith(caches.match(r).then(m => m || fetch(r)));
    return;
  }
  if (/unpkg\.com|fonts\.(googleapis|gstatic)\.com/.test(u.host)) {
    e.respondWith(caches.open(LIB).then(c => c.match(r).then(m => { const net = fetch(r).then(res => { if (res.ok || res.type === "opaque") c.put(r, res.clone()); return res; }).catch(() => m); return m || net; })));
    return;
  }
  if (/tile\.openstreetmap\.org|arcgisonline\.com|basemaps\.cartocdn\.com/.test(u.host)) {
    e.respondWith(fetch(r).then(res => { if (res.ok) { const cp = res.clone(); caches.open(TILES).then(c => c.put(r, cp)).then(trimTiles); } return res; })
      .catch(() => caches.match(r).then(m => m || Response.error())));
  }
});
