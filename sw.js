// DaviGherbivores offline cache: keeps the app itself on the phone so it opens without signal.
// Records are stored separately by Firebase and sync on their own.
const CACHE = "dg-v5";
const CORE = ["./", "index.html", "manifest.json", "firebase-config.js", "icon-192.png", "icon-512.png",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-app-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-auth-compat.js",
  "https://www.gstatic.com/firebasejs/10.14.1/firebase-firestore-compat.js"];

self.addEventListener("install", e => {
  e.waitUntil(caches.open(CACHE).then(c => Promise.all(CORE.map(u => c.add(new Request(u, u.startsWith("http") ? { mode: "no-cors" } : {})).catch(() => {}))))
    .then(() => self.skipWaiting()));
});
self.addEventListener("activate", e => {
  e.waitUntil(caches.keys().then(ks => Promise.all(ks.filter(k => k !== CACHE).map(k => caches.delete(k)))).then(() => self.clients.claim()));
});
self.addEventListener("fetch", e => {
  const req = e.request, url = new URL(req.url);
  if (req.method !== "GET") return;
  // database and sign-in traffic is handled by Firebase itself
  if (/googleapis\.com$/.test(url.hostname) && !url.hostname.startsWith("fonts.")) return;
  if (url.hostname.endsWith("firebaseapp.com") || url.hostname.endsWith("identitytoolkit.googleapis.com")) return;
  const sameOrigin = url.origin === location.origin;
  const appFile = sameOrigin && (req.mode === "navigate" || /\/(index\.html|firebase-config\.js)?$/.test(url.pathname) || url.pathname.endsWith("firebase-config.js"));
  if (appFile) {
    // newest version when online, saved copy when offline
    e.respondWith(fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); return r; })
      .catch(() => caches.match(req).then(r => r || caches.match("index.html"))));
    return;
  }
  if (sameOrigin || url.hostname === "www.gstatic.com" || url.hostname.startsWith("fonts.")) {
    e.respondWith(caches.match(req).then(hit => hit || fetch(req).then(r => { const c = r.clone(); caches.open(CACHE).then(k => k.put(req, c)); return r; })));
  }
});
