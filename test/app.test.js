import test from 'node:test';
import assert from 'node:assert/strict';
import { createApp } from '../app.js';

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
  assert.equal((await (await request('stats')).json()).subscribers, 2);
  await request('unsubscribe', { endpoint: subscription('active').endpoint });
  assert.equal((await (await request('stats')).json()).subscribers, 1);
  for (let i = 0; i < 3; i++) await request('send', { name: 'Ana', message: 'Prueba' });
  assert.equal((await request('send', { name: 'Ana', message: 'Límite' })).status, 429);
});
