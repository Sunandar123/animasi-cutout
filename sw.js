// Service worker: aplikasi tetap bisa dibuka offline.
// Strategi network-first: selalu ambil versi terbaru dari server, pakai cache kalau offline.
const CACHE='animasi-v2';
const FILES=['./','index.html','css/style.css','js/karakter.js','js/mesh.js','js/ik.js','js/render.js','js/editor.js','js/perintah.js','js/proyek.js','js/app.js','manifest.json','icons/icon-192.png','icons/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(FILES)).then(()=>self.skipWaiting()));});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
self.addEventListener('fetch',e=>{
  const req=e.request;
  if(req.method!=='GET'||new URL(req.url).origin!==location.origin)return;
  e.respondWith(fetch(req,{cache:'no-cache'}).then(res=>{
    if(res.ok){const copy=res.clone();caches.open(CACHE).then(c=>c.put(req,copy));}
    return res;
  }).catch(()=>caches.match(req,{ignoreSearch:true}).then(r=>r||caches.match('index.html'))));
});
