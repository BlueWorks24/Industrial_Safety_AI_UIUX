// 예전에 등록된 서비스 워커를 스스로 지운다. 시제품은 오프라인 캐시를 쓰지 않는다 (오래된 화면이 보이는 것을 막기 위해).
self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', (e) => e.waitUntil((async () => {
  for (const k of await caches.keys()) await caches.delete(k);
  await self.registration.unregister();
  for (const c of await self.clients.matchAll()) c.navigate(c.url);
})()));
