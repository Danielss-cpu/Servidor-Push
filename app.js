import express from 'express';
import { rateLimit } from 'express-rate-limit';
import { timingSafeEqual } from 'node:crypto';
import { fileURLToPath } from 'node:url';

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

export function createApp({ publicKey, classroomCode, store, sendPush }) {
  const app = express();
  app.set('trust proxy', 1);
  app.use((_req, res, next) => {
    res.set('X-Content-Type-Options', 'nosniff');
    res.set('Referrer-Policy', 'no-referrer');
    res.set('Content-Security-Policy', "default-src 'self'; script-src 'self'; style-src 'self'; connect-src 'self'; object-src 'none'; frame-ancestors 'none'; base-uri 'self'");
    next();
  });
  app.use(express.json({ limit: '8kb' }));
  app.get('/api/health', (_req, res) => res.json({ status: 'ok' }));
  app.get('/api/config', (_req, res) => res.json({ publicKey }));
  app.use('/api', rateLimit({ windowMs: 60_000, limit: 60, standardHeaders: 'draft-8', legacyHeaders: false }));
  app.use('/api', (req, res, next) => {
    const expected = Buffer.from(classroomCode);
    const received = Buffer.from(req.get('X-Classroom-Code') || '');
    if (received.length !== expected.length || !timingSafeEqual(received, expected)) {
      return res.status(401).json({ error: 'Código del salón incorrecto.' });
    }
    next();
  });
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
    const payload = JSON.stringify({ title: `${name.trim()} · Salón Push`, body: message.trim(), url: '/' });
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
  app.use(express.static(fileURLToPath(new URL('./public', import.meta.url)), { setHeaders(res, path) {
    if (path.endsWith('sw.js')) res.set('Cache-Control', 'no-cache');
  } }));
  app.use((error, _req, res, _next) => {
    const status = error.status >= 400 && error.status < 500 ? error.status : 500;
    console.error('Error de solicitud:', error.type || error.code || 'interno');
    res.status(status).json({ error: status === 500 ? 'Error interno del servidor.' : 'Solicitud inválida.' });
  });
  return app;
}
