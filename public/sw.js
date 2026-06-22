/**
 * Service Worker — Piripá Transparente PWA
 * Estratégia: Cache First para assets estáticos, Network First para dados da API
 */

const CACHE_NAME    = "piripa-v3";
const API_CACHE     = "piripa-api-v3";
const OFFLINE_PAGE  = "/offline.html";

// Assets que ficam em cache permanente
const STATIC_ASSETS = [
  "/",
  "/index.html",
  "/manifest.json",
  "/icons/icon-192x192.png",
  "/icons/icon-512x512.png",
];

// ── Install: pré-cacheia assets estáticos ─────────────────────────────────────
self.addEventListener("install", (event) => {
  event.waitUntil(
    caches.open(CACHE_NAME).then((cache) => {
      return cache.addAll(STATIC_ASSETS).catch(() => {
        // Silencia erros de assets que ainda não existem
      });
    })
  );
  self.skipWaiting();
});

// ── Activate: limpa caches antigos ────────────────────────────────────────────
self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys().then((keys) =>
      Promise.all(
        keys
          .filter((k) => k !== CACHE_NAME && k !== API_CACHE)
          .map((k) => caches.delete(k))
      )
    )
  );
  self.clients.claim();
});

// ── Fetch: estratégia híbrida ─────────────────────────────────────────────────
self.addEventListener("fetch", (event) => {
  const { request } = event;
  const url = new URL(request.url);

  // Ignorar extensões e requests não-GET
  if (request.method !== "GET") return;
  if (url.protocol === "chrome-extension:") return;

  // API do proxy — Network First com fallback de cache (5 min TTL)
  if (url.pathname.startsWith("/api/")) {
    event.respondWith(networkFirstWithCache(request, API_CACHE, 5 * 60 * 1000));
    return;
  }

  // APIs externas (SAI2, Fator Sistemas, SICONFI) — Network Only
  if (
    url.hostname.includes("sai2.io.org.br") ||
    url.hostname.includes("fatorsistemas.com.br") ||
    url.hostname.includes("tesouro.gov.br") ||
    url.hostname.includes("portaldatransparencia.gov.br")
  ) {
    return; // Deixa o browser tratar normalmente
  }

  // Assets estáticos (JS, CSS, imagens) — Cache First
  if (
    url.pathname.match(/\.(js|css|png|jpg|svg|ico|woff2?)$/) ||
    url.hostname !== self.location.hostname
  ) {
    event.respondWith(cacheFirst(request));
    return;
  }

  // Navegação (HTML) — Network First com fallback para index.html (SPA)
  if (request.mode === "navigate") {
    event.respondWith(
      fetch(request).catch(() =>
        caches.match("/index.html").then((r) => r || fetch("/index.html"))
      )
    );
    return;
  }

  // Default: Network First
  event.respondWith(networkFirstWithCache(request, CACHE_NAME, 60 * 60 * 1000));
});

// ── Estratégias de cache ──────────────────────────────────────────────────────

async function cacheFirst(request) {
  const cached = await caches.match(request);
  if (cached) return cached;
  try {
    const response = await fetch(request);
    if (response.ok) {
      const cache = await caches.open(CACHE_NAME);
      cache.put(request, response.clone());
    }
    return response;
  } catch {
    return new Response("Recurso não disponível offline.", {
      status: 503,
      headers: { "Content-Type": "text/plain; charset=utf-8" },
    });
  }
}

async function networkFirstWithCache(request, cacheName, ttlMs) {
  const cache  = await caches.open(cacheName);
  const cached = await cache.match(request);

  // Verificar se o cache ainda é válido (TTL)
  if (cached) {
    const cachedDate = cached.headers.get("sw-cache-date");
    if (cachedDate && Date.now() - parseInt(cachedDate) < ttlMs) {
      return cached;
    }
  }

  try {
    const response = await fetch(request);
    if (response.ok) {
      // Adicionar header com timestamp para TTL
      const headers = new Headers(response.headers);
      headers.set("sw-cache-date", Date.now().toString());
      const cachedResponse = new Response(await response.clone().blob(), {
        status:     response.status,
        statusText: response.statusText,
        headers,
      });
      cache.put(request, cachedResponse);
    }
    return response;
  } catch {
    // Offline: retorna cache mesmo expirado
    if (cached) return cached;
    return new Response(
      JSON.stringify({ error: "Sem conexão. Dados do cache podem estar desatualizados." }),
      { status: 503, headers: { "Content-Type": "application/json" } }
    );
  }
}

// ── Background Sync (atualizar dados quando voltar online) ────────────────────
self.addEventListener("sync", (event) => {
  if (event.tag === "sync-dados") {
    event.waitUntil(
      caches.open(API_CACHE).then((cache) => cache.keys().then((keys) =>
        Promise.all(keys.map((req) => fetch(req).then((res) => {
          if (res.ok) cache.put(req, res);
        }).catch(() => {})))
      ))
    );
  }
});
