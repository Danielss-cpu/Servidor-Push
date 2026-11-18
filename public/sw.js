self.addEventListener('install', () => self.skipWaiting());
self.addEventListener('activate', event => event.waitUntil(self.clients.claim()));
self.addEventListener('push', event => {
  let data = { title: 'Salón Push', body: 'Tienes un nuevo aviso del salón.' };
  try { if (event.data) data = { ...data, ...event.data.json() }; } catch { /* Mostrar aviso aunque llegue texto inválido. */ }
  event.waitUntil(self.registration.showNotification(data.title, { body: data.body, data: { url: '/' } }));
});
self.addEventListener('notificationclick', event => {
  event.notification.close();
  event.waitUntil((async () => {
    const windows = await self.clients.matchAll({ type: 'window', includeUncontrolled: true });
    for (const client of windows) if (new URL(client.url).origin === self.location.origin) return client.focus();
    return self.clients.openWindow('/');
  })());
});
