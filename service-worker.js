const CACHE_NAME = "tesnavi-pwa-v3";
const APP_SHELL = [
  "./",
  "./index.html",
  "./style.css",
  "./app.js",
  "./gemini.js",
  "./manifest.json",
  "./apple-touch-icon.png",
  "./favicon-32x32.png",
  "./icon-192.png",
  "./icon-512.png",
  "./assets/logo.png",
  "./assets/logo-header.png",
  "./assets/icons/apple-touch-icon.png",
  "./assets/icons/favicon-32x32.png",
  "./assets/icons/icon-192.png",
  "./assets/icons/icon-512.png"
];

const OFFLINE_HTML = `<!doctype html>
<html lang="ja">
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <meta name="theme-color" content="#2478d4">
  <title>テスナビ</title>
  <style>
    body {
      margin: 0;
      min-height: 100vh;
      display: grid;
      place-items: center;
      padding: 24px;
      font-family: system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
      color: #12233f;
      background: #f4f8ff;
    }

    main {
      width: min(440px, 100%);
      padding: 24px;
      border: 1px solid #dbeafe;
      border-radius: 14px;
      background: #ffffff;
      box-shadow: 0 18px 42px rgba(36, 120, 212, 0.12);
    }

    h1 {
      margin: 0 0 10px;
      color: #0f65c7;
      font-size: 1.7rem;
    }

    p {
      margin: 0;
      line-height: 1.8;
      font-weight: 700;
    }
  </style>
</head>
<body>
  <main>
    <h1>テスナビ</h1>
    <p>オフライン中です。接続が戻ったらもう一度開いてください。保存済みの画面がある場合は、再読み込みで表示できます。</p>
  </main>
</body>
</html>`;

self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then((cache) => cache.addAll(APP_SHELL))
      .then(() => self.skipWaiting())
  );
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  );
});

self.addEventListener("fetch", (event) => {
  const request = event.request;

  if (request.method !== "GET") {
    return;
  }

  const url = new URL(request.url);

  if (url.origin !== self.location.origin) {
    return;
  }

  if (request.mode === "navigate") {
    event.respondWith(handleNavigation(request));
    return;
  }

  event.respondWith(cacheFirst(request));
});

async function handleNavigation(request) {
  try {
    return await fetch(request);
  } catch (error) {
    const cachedIndex = await caches.match("./index.html");
    return cachedIndex || new Response(OFFLINE_HTML, {
      headers: { "Content-Type": "text/html; charset=utf-8" }
    });
  }
}

async function cacheFirst(request) {
  const cached = await caches.match(request);

  if (cached) {
    return cached;
  }

  try {
    const response = await fetch(request);

    if (response && response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }

    return response;
  } catch (error) {
    return new Response("", { status: 503, statusText: "Offline" });
  }
}
