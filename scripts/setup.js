import { existsSync, writeFileSync } from 'node:fs';
import webpush from 'web-push';

if (existsSync('.env')) {
  console.log('Ya existe .env. Se conservan las claves VAPID.');
} else {
  const keys = webpush.generateVAPIDKeys();
  writeFileSync('.env', `PORT=3000\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=https://example.com\nDATA_DIR=./data\n`, { mode: 0o600 });
  console.log('Configuración VAPID creada en .env. Ejecuta npm start.');
}
