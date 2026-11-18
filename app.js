import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { fileURLToPath } from 'node:url';
import { existsSync } from 'node:fs';
import { join } from 'node:path';

const allowedPushHost = host => host === 'fcm.googleapis.com' ||
  host === 'updates.push.services.mozilla.com' || host.endsWith('.push.services.mozilla.com') ||
  host === 'web.push.apple.com' || host.endsWith('.notify.windows.com');

export function validSubscription(value) {
  try {
    const url = new URL(value.endpoint);
    return url.protocol === 'https:' && !url.username && !url.password && (!url.port || url.port === '443') &&
      allowedPushHost(url.hostname) && value.endpoint.length < 2048 &&
      /^[\w-]{87}$/.test(value.keys.p256dh) && /^[\w-]{22}$/.test(value.keys.auth);
  } catch { return false; }
}

export function createApp({ publicKey, store, sendPush, staticDirectory }) {
  const app = express();
  app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; connect-src 'self' https://api.open-meteo.com https://geocoding-api.open-meteo.com; object-src 'none'; frame-ancestors 'none'; base-uri 'self'; manifest-src 'self'");
    next();
  });
  app.use(express.json({ limit: '8kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/config', (_req, res) => res.json({ publicKey }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.get('/api/stats', (_req, res) => res.json({ subscribers: store.all().length }));
  app.post('/api/subscribe', (req, res) => {
    if (!validSubscription(req.body)) return res.status(400).json({ error: 'Suscripción inválida o proveedor no admitido.' });
    if (store.all().length >= 500 && !store.all().some(s => s.endpoint === req.body.endpoint)) {
      return res.status(409).json({ error: 'El salón alcanzó el límite de 500 suscripciones.' });
    }
    store.put({ endpoint: req.body.endpoint, keys: { p256dh: req.body.keys.p256dh, auth: req.body.keys.auth } });
    res.status(201).json({ ok: true });
  });
  app.post('/api/unsubscribe', (req, res) => {
    if (typeof req.body?.endpoint !== 'string') return res.status(400).json({ error: 'Falta endpoint.' });
    store.remove(req.body.endpoint);
    res.json({ ok: true });
  });
  app.post('/api/send', rateLimit({ windowMs: 60_000, limit: 5, standardHeaders: 'draft-8', legacyHeaders: false }), async (req, res) => {
    const { name, message } = req.body || {};
    if (typeof name !== 'string' || !name.trim() || name.length > 40 || typeof message !== 'string' || !message.trim() || message.length > 300) {
      return res.status(400).json({ error: 'Escribe un nombre (hasta 40 caracteres) y un mensaje (hasta 300).' });
    }
    const subscriptions = store.all();
    const title = `${name.trim()} · ${req.body.kind === 'weather' ? 'Cielo' : 'Salón Push'}`;
    // Mantiene compatibilidad con el worker anterior y con el formato oficial de SwPush.
    const payload = JSON.stringify({ title, body: message.trim(), url: '/', notification: {
      title, body: message.trim(), icon: '/icons/icon-192x192.png',
      data: { onActionClick: { default: { operation: 'focusLastFocusedOrOpen', url: '/' } } }
    } });
    let accepted = 0, expired = 0, failed = 0;
    // Lotes pequeños para no abrir cientos de conexiones simultáneas.
    for (let i = 0; i < subscriptions.length; i += 10) {
      await Promise.all(subscriptions.slice(i, i + 10).map(async subscription => {
        try { await sendPush(subscription, payload); accepted++; }
        catch (error) {
          if ([404, 410].includes(error.statusCode)) { store.remove(subscription.endpoint); expired++; }
          else { failed++; console.error('Error del proveedor push:', error.statusCode || error.code || 'desconocido'); }
        }
      }));
    }
    res.json({ accepted, expired, failed, total: subscriptions.length });
  });
  const directory = staticDirectory || fileURLToPath(new URL('./public', import.meta.url));
  app.use('/api', (_req, res) => res.status(404).json({ error: 'Ruta de API no encontrada.' }));
  app.use(express.static(directory, { setHeaders(res, path) {
    if (/\.(?:html|json)$/.test(path) || path.endsWith('sw.js') || path.endsWith('ngsw-worker.js')) res.set('Cache-Control', 'no-cache');
  } }));
  app.get('/{*path}', (req, res, next) => {
    if (!req.accepts('html') || /\.[a-z0-9]+$/i.test(req.path) || !existsSync(join(directory, 'index.html'))) return next();
    res.set('Cache-Control', 'no-cache').sendFile(join(directory, 'index.html'));
  });
  app.use((error, _req, res, _next) => {
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    console.error('Error de solicitud:', error.type || error.code || 'interno');
    res.status(status).json({ error: status === 500 ? 'Error interno del servidor.' : 'Solicitud inválida.' });
  });
  return app;
}
