// Cache to store static files so the page wil still show when offline
const CACHE_NAME = "file-cache-v1";

// These files will be cached immediately
const FILES_TO_CACHE = [
    "/icons/icon-192x192.png",
    "/icons/icon-512x512.png",
    "/db.js",
    "/index.html",
    "/index.js",
    "styles.css"
];

// Cache to store JSON from server
const DATA_CACHE_NAME = "data-cache-v1";

self.addEventListener("install", function (event) {
  
  console.log("Installing service worker");
  
  // Cache all the static files immediately
  const cacheResources = async () => {
    const cache = await caches.open(CACHE_NAME);
    return cache.addAll(FILES_TO_CACHE);
  }

  event.waitUntil(cacheResources());

  // Activate service worker immediately
  self.skipWaiting();

});


self.addEventListener("activate", function(event) {

  console.log("Activating service worker");

  // Remove any other caches from old versions of the code
  const removeOldCache = async () => {
    const cacheKeyArray = await caches.keys();
  
    const cacheResultPromiseArray = cacheKeyArray.map(key => {
      if (key !== CACHE_NAME && key !== DATA_CACHE_NAME) {
        console.log("Removing old cache data", key);
        return caches.delete(key);
      }
    });  
    return Promise.all(cacheResultPromiseArray);
  }

  event.waitUntil(removeOldCache()); 

  self.clients.claim();
});

self.addEventListener("fetch", function(event) {
  
  // Cache response from server if offline or return the real response when online
  const handleAPIDataRequest = async (event) => {
    try {
      const response = await fetch(event.request);
      if (response.status === 200) {
        console.log(`Adding API request to cache: ${event.request.url}`);

        const apiCache = await caches.open(DATA_CACHE_NAME);
        await apiCache.put(event.request.url, response.clone());

        return response;
      }
    } catch(error) {
      console.log(`Error during API request so returning cache instead: ${event.request.url}`)
      return await caches.match(event.request);
    }
  }
  
  // Return the cached file if saved or get file from server
  const handleResourceRequest = async (event) => {
    const matchedCache = await caches.match(event.request);
    return matchedCache ||  await fetch(event.request);
  }

  if (event.request.url.includes("/api/")) {
    event.respondWith(handleAPIDataRequest(event));
  } else {
    event.respondWith(handleResourceRequest(event));
  }
});