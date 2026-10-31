const C="shadow-heist-v2-1";
const F=["/","/index.html","/css/style.css","/js/levels.js","/js/engine.js","/js/solver.js","/js/store.js","/js/audio.js","/js/ui.js","/js/board.js","/js/game.js","/manifest.webmanifest","/icon-192.png","/icon-512.png"];
self.addEventListener("install",e=>{e.waitUntil(caches.open(C).then(c=>c.addAll(F)).then(()=>self.skipWaiting()))});
self.addEventListener("activate",e=>{e.waitUntil(caches.keys().then(k=>Promise.all(k.filter(x=>x!==C).map(x=>caches.delete(x)))).then(()=>self.clients.claim()))});
self.addEventListener("fetch",e=>{
 if(e.request.method!=="GET"||new URL(e.request.url).origin!==location.origin)return;
 e.respondWith(fetch(e.request).then(r=>{if(r.ok){const c=r.clone();caches.open(C).then(x=>x.put(e.request,c))}return r}).catch(()=>caches.match(e.request).then(r=>r||caches.match("/"))))});
