import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';
import { mkdtempSync, writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

test('protege el salón, rechaza endpoints ajenos y difunde eliminando suscripciones vencidas', async t => {
  const saved = new Map();
  const sent = [];
  const store = { all: () => [...saved.values()], put: s => saved.set(s.endpoint, s), remove: endpoint => saved.delete(endpoint) };
  const app = createApp({ publicKey: 'public-test-key', classroomCode: 'salon-prueba', store, sendPush: async (subscription, payload) => {
    if (subscription.endpoint.endsWith('expired')) throw { statusCode: 410 };
    if (subscription.endpoint.endsWith('failure')) throw { statusCode: 503 };
    sent.push(JSON.parse(payload));
  } });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(() => new Promise(resolve => server.close(resolve)));
  const base = `http://127.0.0.1:${server.address().port}`;
  const request = (path, body, code = 'salon-prueba') => fetch(`${base}/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Classroom-Code': code },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  assert.equal((await request('health')).status, 200);
  assert.equal((await request('config')).status, 200);
  assert.equal((await request('stats', undefined, 'wrong')).status, 401);
  assert.equal((await request('send', { name: 'Ana', message: 'Hola' }, '')).status, 401);
  const subscription = suffix => ({ endpoint: `https://fcm.googleapis.com/fcm/send/${suffix}`, keys: { p256dh: 'A'.repeat(87), auth: 'B'.repeat(22) } });
  assert.equal((await request('subscribe', { ...subscription('a'), endpoint: 'https://localhost/internal' })).status, 400);
  for (const suffix of ['active', 'expired', 'failure', 'active']) assert.equal((await request('subscribe', subscription(suffix))).status, 201);
  assert.equal((await (await request('stats')).json()).subscribers, 3);
  assert.equal((await request('send', { name: '', message: 'Hola' })).status, 400);
  const result = await (await request('send', { name: 'Ana', message: 'Hola, salón' })).json();
  assert.deepEqual(result, { accepted: 1, expired: 1, failed: 1, total: 3 });
  assert.equal(sent[0].body, 'Hola, salón');
  assert.equal(sent[0].title, 'Ana · Salón Push');
  assert.equal(sent[0].notification.title, sent[0].title);
  assert.equal(sent[0].notification.body, sent[0].body);
  assert.equal(sent[0].notification.data.onActionClick.default.operation, 'focusLastFocusedOrOpen');
  assert.equal((await (await request('stats')).json()).subscribers, 2);
  await request('unsubscribe', { endpoint: subscription('active').endpoint });
  assert.equal((await (await request('stats')).json()).subscribers, 1);
  await request('subscribe', subscription('active'));
  await request('send', { name: 'Orizaba', message: 'Orizaba: 20 °C, lluvia.', kind: 'weather' });
  assert.equal(sent.at(-1).notification.title, 'Orizaba · Cielo');
  for (let i = 0; i < 2; i++) await request('send', { name: 'Ana', message: 'Prueba' });
  assert.equal((await request('send', { name: 'Ana', message: 'Límite' })).status, 429);
});

test('sirve rutas Angular, conserva errores de API y no reemplaza assets inexistentes por HTML', async t => {
  const directory = mkdtempSync(join(tmpdir(), 'cielo-static-'));
  writeFileSync(join(directory, 'index.html'), '<html><title>Cielo</title></html>');
  writeFileSync(join(directory, 'ngsw-worker.js'), '// service worker');
  const app = createApp({ publicKey: 'public', classroomCode: 'salon-prueba', store: { all: () => [] }, sendPush: async () => {}, staticDirectory: directory });
  const server = app.listen(0, '127.0.0.1');
  await new Promise(resolve => server.once('listening', resolve));
  t.after(async () => { await new Promise(resolve => server.close(resolve)); rmSync(directory, { recursive: true, force: true }); });
  const base = `http://127.0.0.1:${server.address().port}`;
  const page = await fetch(`${base}/clima`, { headers: { Accept: 'text/html' } });
  assert.equal(page.status, 200);
  assert.match(await page.text(), /Cielo/);
  assert.match(page.headers.get('cache-control'), /no-cache/);
  assert.match(page.headers.get('content-security-policy'), /https:\/\/api.open-meteo.com/);
  const worker = await fetch(`${base}/ngsw-worker.js`);
  assert.match(worker.headers.get('cache-control'), /no-cache/);
  assert.equal((await fetch(`${base}/missing.js`)).status, 404);
  const missing = await fetch(`${base}/api/unknown`, { headers: { 'X-Classroom-Code': 'salon-prueba' } });
  assert.equal(missing.status, 404);
  assert.equal((await missing.json()).error, 'Ruta de API no encontrada.');
});
