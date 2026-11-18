import 'dotenv/config';
import { mkdirSync, existsSync, readFileSync, writeFileSync, renameSync } from 'node:fs';
import { resolve, join } from 'node:path';
import webpush from 'web-push';
import { createApp } from './app.js';

for (const key of ['VAPID_PUBLIC_KEY', 'VAPID_PRIVATE_KEY', 'VAPID_SUBJECT', 'CLASSROOM_CODE']) {
  if (!process.env[key]) throw new Error(`Falta ${key}. Ejecuta npm run setup o configura las variables en Render.`);
}
if (process.env.CLASSROOM_CODE.length < 8) throw new Error('CLASSROOM_CODE debe tener al menos 8 caracteres.');
webpush.setVapidDetails(process.env.VAPID_SUBJECT, process.env.VAPID_PUBLIC_KEY, process.env.VAPID_PRIVATE_KEY);
const directory = resolve(process.env.DATA_DIR || './data');
mkdirSync(directory, { recursive: true });
const file = join(directory, 'subscriptions.json');
const saved = existsSync(file) ? JSON.parse(readFileSync(file, 'utf8')) : [];
const subscriptions = new Map(saved.map(subscription => [subscription.endpoint, subscription]));
function persist() {
  writeFileSync(`${file}.tmp`, JSON.stringify([...subscriptions.values()]), { mode: 0o600 });
  renameSync(`${file}.tmp`, file);
}
const store = {
  all: () => [...subscriptions.values()],
  put(subscription) { subscriptions.set(subscription.endpoint, subscription); persist(); },
  remove(endpoint) { subscriptions.delete(endpoint); persist(); }
};
const app = createApp({
  publicKey: process.env.VAPID_PUBLIC_KEY,
  classroomCode: process.env.CLASSROOM_CODE,
  store,
  sendPush: (subscription, payload) => webpush.sendNotification(subscription, payload, { TTL: 3600, timeout: 10_000 })
});
const server = app.listen(process.env.PORT || 3000, '0.0.0.0', () => {
  console.log(`Salón Push disponible en http://localhost:${server.address().port}`);
});
