const CACHE_NAME = "ichiji_ichie_cache_v0.1.2"; // APP_VERSIONと揃えると管理が楽

const ASSETS = [
  "./",
  "./index.html",
  "./styles.css",
  "./app.js",
  "./manifest.webmanifest",
  "./dict/base_words.txt",
  "./dict/extra_words.txt",
  "./dict/deny_words.txt",
  "./docs/THIRD_PARTY_NOTICES.txt"
];

self.addEventListener("install", (event) => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    // denyが無い場合もあるので、失敗しても続行
    for (const url of ASSETS) {
      try { await cache.add(url); } catch {}
    }
    self.skipWaiting();
  })());
});

self.addEventListener("activate", (event) => {
  event.waitUntil((async () => {
    const keys = await caches.keys();
    await Promise.all(keys.map(k => (k === CACHE_NAME ? null : caches.delete(k))));
    self.clients.claim();
  })());
});

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;

  event.respondWith((async () => {
    const cached = await caches.match(req);
    if (cached) return cached;

    try {
      const res = await fetch(req);

      // 取れたものは同一オリジンだけキャッシュ（レスポンスが壊れていないことが前提）
      const url = new URL(req.url);
      if (url.origin === location.origin && res) {
        const cache = await caches.open(CACHE_NAME);
        cache.put(req, res.clone());
      }
      return res; // ★必ず Response
    } catch (e) {
      // ★ここが重要：キャッシュが無いなら必ず Response を返す
      return new Response("", {
        status: 503,
        statusText: "Service Worker fetch failed",
      });
    }
  })());
});

