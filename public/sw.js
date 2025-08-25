// MovieTracker Web App PWA Service Worker
const CACHE_NAME = 'movietracker-web-v1';
const STATIC_CACHE_NAME = 'movietracker-web-static-v1';
const DYNAMIC_CACHE_NAME = 'movietracker-web-dynamic-v1';

// Static assets to cache immediately
const STATIC_ASSETS = [
  '/',
  '/static/js/bundle.js',
  '/static/css/main.css',
  '/manifest.json',
  '/favicon.ico',
  // Add any additional static assets your app uses
];

// API endpoints and external resources that should be cached
const API_CACHE_PATTERNS = [
  /^https:\/\/api\.themoviedb\.org\/3\//,
  /^https:\/\/image\.tmdb\.org\/t\/p\//,
  /^https:\/\/.*\.supabase\.co\/rest\/v1\//,
  /^https:\/\/.*\.supabase\.co\/auth\/v1\//
];

// Install event - cache static assets
self.addEventListener('install', (event) => {
  console.log('[SW] MovieTracker Web - Installing Service Worker');
  
  event.waitUntil(
    caches.open(STATIC_CACHE_NAME)
      .then((cache) => {
        console.log('[SW] Caching static assets');
        // Try to cache static assets, but don't fail if some are missing
        return Promise.allSettled(
          STATIC_ASSETS.map(url => 
            cache.add(url).catch(err => console.log(`[SW] Failed to cache ${url}:`, err))
          )
        );
      })
      .catch((error) => {
        console.log('[SW] Failed to open cache:', error);
      })
  );
  
  // Force activation of new service worker
  self.skipWaiting();
});

// Activate event - clean up old caches
self.addEventListener('activate', (event) => {
  console.log('[SW] MovieTracker Web - Activating Service Worker');
  
  event.waitUntil(
    caches.keys().then((cacheNames) => {
      return Promise.all(
        cacheNames.map((cacheName) => {
          if (cacheName !== STATIC_CACHE_NAME && cacheName !== DYNAMIC_CACHE_NAME) {
            console.log('[SW] Deleting old cache:', cacheName);
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
  
  // Take control of all clients
  self.clients.claim();
});

// Fetch event - handle network requests with different strategies
self.addEventListener('fetch', (event) => {
  const { request } = event;
  const url = new URL(request.url);
  
  // Skip non-http requests
  if (!request.url.startsWith('http')) {
    return;
  }
  
  // Skip Chrome extensions and other non-web requests
  if (url.protocol !== 'http:' && url.protocol !== 'https:') {
    return;
  }
  
  // Handle different types of requests
  if (request.method === 'GET') {
    // Static React app assets - cache first strategy
    if (isStaticAsset(request.url)) {
      event.respondWith(cacheFirstStrategy(request, STATIC_CACHE_NAME));
    }
    // API requests - network first strategy with cache fallback
    else if (isAPIRequest(request.url)) {
      event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME));
    }
    // Images (including TMDB images) - cache first strategy
    else if (isImageRequest(request)) {
      event.respondWith(cacheFirstStrategy(request, DYNAMIC_CACHE_NAME));
    }
    // HTML pages - network first strategy with offline fallback
    else if (request.headers.get('accept')?.includes('text/html')) {
      event.respondWith(htmlNetworkFirstStrategy(request));
    }
    // Default - try network first, fallback to cache
    else {
      event.respondWith(networkFirstStrategy(request, DYNAMIC_CACHE_NAME));
    }
  }
});

// Cache first strategy - good for static assets and images
async function cacheFirstStrategy(request, cacheName) {
  try {
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Cache hit:', request.url);
      // Fetch in background to update cache
      fetch(request)
        .then(response => {
          if (response.ok) {
            cache.put(request, response.clone());
          }
        })
        .catch(() => {}); // Ignore background fetch errors
      
      return cachedResponse;
    }
    
    console.log('[SW] Cache miss, fetching:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Cache first strategy failed:', error);
    // Try to return a cached version if available
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    if (cachedResponse) {
      return cachedResponse;
    }
    throw error;
  }
}

// Network first strategy - good for API requests
async function networkFirstStrategy(request, cacheName) {
  try {
    console.log('[SW] Network first for:', request.url);
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(cacheName);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] Network failed, trying cache:', error);
    
    const cache = await caches.open(cacheName);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      console.log('[SW] Serving from cache:', request.url);
      return cachedResponse;
    }
    
    throw error;
  }
}

// HTML network first strategy with offline page fallback
async function htmlNetworkFirstStrategy(request) {
  try {
    const networkResponse = await fetch(request);
    
    if (networkResponse.ok) {
      const cache = await caches.open(DYNAMIC_CACHE_NAME);
      cache.put(request, networkResponse.clone());
    }
    
    return networkResponse;
  } catch (error) {
    console.log('[SW] HTML request failed, checking cache:', error);
    
    const cache = await caches.open(DYNAMIC_CACHE_NAME);
    const cachedResponse = await cache.match(request);
    
    if (cachedResponse) {
      return cachedResponse;
    }
    
    // Return offline page
    return new Response(
      `<!DOCTYPE html>
      <html>
        <head>
          <title>MovieTracker - Offline</title>
          <meta name="viewport" content="width=device-width, initial-scale=1">
          <style>
            * { margin: 0; padding: 0; box-sizing: border-box; }
            body { 
              font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', sans-serif;
              background: linear-gradient(135deg, #302c44 0%, #434a54 100%);
              color: white;
              min-height: 100vh;
              display: flex;
              align-items: center;
              justify-content: center;
            }
            .container { 
              text-align: center; 
              max-width: 400px; 
              padding: 40px 20px;
            }
            .logo { 
              font-size: 2.5rem; 
              margin-bottom: 20px; 
              font-weight: bold;
            }
            h1 { 
              font-size: 1.8rem; 
              margin-bottom: 16px; 
              opacity: 0.9;
            }
            p { 
              opacity: 0.8; 
              line-height: 1.6; 
              margin-bottom: 30px;
              font-size: 1.1rem;
            }
            .retry-btn { 
              background: rgba(255, 255, 255, 0.2); 
              color: white; 
              border: 2px solid rgba(255, 255, 255, 0.3);
              padding: 12px 32px; 
              border-radius: 25px; 
              cursor: pointer; 
              font-size: 1rem;
              font-weight: 600;
              transition: all 0.3s ease;
              text-transform: uppercase;
              letter-spacing: 1px;
            }
            .retry-btn:hover {
              background: rgba(255, 255, 255, 0.3);
              border-color: rgba(255, 255, 255, 0.5);
              transform: translateY(-2px);
            }
            @media (max-width: 480px) {
              .logo { font-size: 2rem; }
              h1 { font-size: 1.5rem; }
              .container { padding: 20px; }
            }
          </style>
        </head>
        <body>
          <div class="container">
            <div class="logo">🎬 MovieTracker</div>
            <h1>You're Offline</h1>
            <p>Check your internet connection and try again to access the latest movies and TV shows.</p>
            <button class="retry-btn" onclick="window.location.reload()">Retry Connection</button>
          </div>
        </body>
      </html>`,
      {
        status: 200,
        statusText: 'OK',
        headers: { 'Content-Type': 'text/html' }
      }
    );
  }
}

// Helper functions
function isStaticAsset(url) {
  return url.includes('/static/') || 
         url.includes('/assets/') || 
         url.endsWith('.js') || 
         url.endsWith('.css') || 
         url.endsWith('.woff') || 
         url.endsWith('.woff2') ||
         url.endsWith('.ico') ||
         url.includes('favicon');
}

function isAPIRequest(url) {
  return API_CACHE_PATTERNS.some(pattern => pattern.test(url));
}

function isImageRequest(request) {
  return request.headers.get('accept')?.includes('image') ||
         request.url.includes('image.tmdb.org') ||
         request.url.match(/\.(jpg|jpeg|png|gif|webp|svg)$/);
}

// Handle background sync for offline actions (e.g., adding to watchlist)
self.addEventListener('sync', (event) => {
  console.log('[SW] Background sync triggered:', event.tag);
  
  if (event.tag === 'sync-watchlist') {
    event.waitUntil(syncWatchlistData());
  } else if (event.tag === 'sync-rating') {
    event.waitUntil(syncRatingData());
  }
});

// Sync functions for offline data
async function syncWatchlistData() {
  try {
    console.log('[SW] Syncing watchlist data...');
    // Get offline data from IndexedDB or localStorage
    // Send to Supabase when back online
    // This would be implemented based on your offline storage strategy
  } catch (error) {
    console.log('[SW] Watchlist sync failed:', error);
  }
}

async function syncRatingData() {
  try {
    console.log('[SW] Syncing rating data...');
    // Similar to watchlist sync
  } catch (error) {
    console.log('[SW] Rating sync failed:', error);
  }
}

// Handle push notifications (for future movie recommendations)
self.addEventListener('push', (event) => {
  console.log('[SW] Push notification received');
  
  let notificationData = { title: 'MovieTracker', body: 'New content available!' };
  
  if (event.data) {
    try {
      notificationData = event.data.json();
    } catch (e) {
      notificationData.body = event.data.text();
    }
  }
  
  const options = {
    body: notificationData.body,
    icon: '/icon-192x192.png',
    badge: '/badge-72x72.png',
    tag: 'movietracker-notification',
    requireInteraction: true,
    actions: [
      {
        action: 'view',
        title: 'View Details'
      },
      {
        action: 'dismiss',
        title: 'Dismiss'
      }
    ],
    data: notificationData.data || {}
  };
  
  event.waitUntil(
    self.registration.showNotification(notificationData.title, options)
  );
});

// Handle notification clicks
self.addEventListener('notificationclick', (event) => {
  console.log('[SW] Notification clicked:', event.action);
  
  event.notification.close();
  
  if (event.action === 'view') {
    // Open specific page based on notification data
    const url = event.notification.data?.url || '/';
    event.waitUntil(clients.openWindow(url));
  } else if (event.action === 'dismiss') {
    // Just close the notification
    return;
  } else {
    // Default action - open the app
    event.waitUntil(clients.openWindow('/'));
  }
});

// Handle share target (when users share movie links to the app)
self.addEventListener('fetch', (event) => {
  if (event.request.url.includes('/share-movie')) {
    event.respondWith(handleMovieShare(event.request));
  }
});

async function handleMovieShare(request) {
  const url = new URL(request.url);
  const title = url.searchParams.get('title');
  const text = url.searchParams.get('text');
  const sharedUrl = url.searchParams.get('url');
  
  // Extract movie ID from shared URL if it's a TMDB link
  // Redirect to movie detail page
  return Response.redirect('/', 302);
}