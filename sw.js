const CACHE='forest-egg-shell-v1.3.1.0';
const ASSETS=["./index.html","./style.css","./app.mjs","./engine.mjs","./offline.mjs","./pet-art.mjs","./manifest.webmanifest","./icon.svg","./assets/deer-adult-sleep.png","./assets/deer-adult.png","./assets/deer-sleep.png","./assets/deer-teen-sleep.png","./assets/deer-teen.png","./assets/deer-young-sleep.png","./assets/deer-young.png","./assets/deer.png","./assets/egg.png","./assets/fox-adult-sleep.png","./assets/fox-adult.png","./assets/fox-sleep.png","./assets/fox-teen-sleep.png","./assets/fox-teen.png","./assets/fox-young-sleep.png","./assets/fox-young.png","./assets/fox.png","./assets/wolf-adult-sleep.png","./assets/wolf-adult.png","./assets/wolf-sleep.png","./assets/wolf-teen-sleep.png","./assets/wolf-teen.png","./assets/wolf-young-sleep.png","./assets/wolf-young.png","./assets/wolf.png"];
const scope=new URL(self.registration.scope);
const absolute=path=>new URL(path,scope).href;
const expected=new Map(ASSETS.map(path=>[new URL(path,scope).pathname,path]));
const mime=path=>path.endsWith('.png')?'image/png':path.endsWith('.svg')?'image/svg+xml':path.endsWith('.css')?'text/css':path.endsWith('.mjs')?'javascript':path.endsWith('.webmanifest')?'json':'text/html';
async function valid(response,path){
 if(!response||!response.ok||response.redirected)return false;
 const contentType=response.headers.get('content-type')||'';
 if(!contentType.includes(mime(path)))return false;
 if(path.endsWith('.html'))return(await response.clone().text()).includes('data-forest-app="1.3.1"');
 return true;
}
async function broadcast(data){for(const client of await self.clients.matchAll({includeUncontrolled:true,type:'window'}))client.postMessage(data);}
async function status(){const cache=await caches.open(CACHE);let count=0;for(const path of ASSETS)if(await valid(await cache.match(absolute(path)),path))count++;return{type:'OFFLINE_STATUS',version:'1.3.1.0',ready:count===ASSETS.length,count,total:ASSETS.length};}
self.addEventListener('install',event=>event.waitUntil((async()=>{
 try{
  // Activate only a complete release. A failed download keeps the old worker.
  const files=await Promise.all(ASSETS.map(async path=>{
   const response=await fetch(new Request(absolute(path),{cache:'reload',credentials:'same-origin',redirect:'error'}));
   if(!await valid(response,path))throw Error('Missing offline asset: '+path);
   return[path,response];
  }));
  const cache=await caches.open(CACHE);
  await Promise.all(files.map(([path,response])=>cache.put(absolute(path),response)));
  await self.skipWaiting();
 }catch(error){await caches.delete(CACHE);await broadcast({type:'OFFLINE_FAILED'});throw error;}
})()));
self.addEventListener('activate',event=>event.waitUntil((async()=>{
 if(!(await status()).ready)throw Error('Incomplete offline release');
 for(const key of await caches.keys())if(key.startsWith('forest-egg-')&&key!==CACHE)await caches.delete(key);
 await self.clients.claim();await broadcast(await status());
})()));
self.addEventListener('message',event=>{if(event.data?.type!=='OFFLINE_STATUS')return;event.waitUntil((async()=>{const result=await status();event.ports?.[0]?.postMessage(result);})());});
self.addEventListener('fetch',event=>{
 const url=new URL(event.request.url);
 if(event.request.method!=='GET'||url.origin!==scope.origin)return;
 const root=url.pathname===scope.pathname||url.pathname===new URL('./index.html',scope).pathname;
 if(event.request.mode==='navigate'&&root){event.respondWith((async()=>{
  const cache=await caches.open(CACHE),saved=await cache.match(absolute('./index.html'));
  if(await valid(saved,'./index.html'))return saved;
  try{return await fetch(event.request);}catch{return new Response('Для первого запуска подключи интернет и открой игру ещё раз.',{status:503,headers:{'content-type':'text/plain; charset=utf-8'}});}
 })());return;}
 const path=expected.get(url.pathname);
 if(!path)return;
 event.respondWith((async()=>{
  const cache=await caches.open(CACHE),saved=await cache.match(absolute(path));
  if(await valid(saved,path))return saved;
  const response=await fetch(event.request);
  if(await valid(response,path))await cache.put(absolute(path),response.clone());
  return response;
 })());
});
