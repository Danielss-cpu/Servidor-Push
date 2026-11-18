import { existsSync, writeFileSync } from 'node:fs';
import { randomBytes } from 'node:crypto';
import webpush from 'web-push';

if (existsSync('.env')) {
  console.log('Ya existe .env. Se conservan las claves y el código del salón.');
} else {
  const keys = webpush.generateVAPIDKeys();
  writeFileSync('.env', `PORT=3000\nVAPID_PUBLIC_KEY=${keys.publicKey}\nVAPID_PRIVATE_KEY=${keys.privateKey}\nVAPID_SUBJECT=https://example.com\nCLASSROOM_CODE=${randomBytes(6).toString('hex')}\nDATA_DIR=./data\n`, { mode: 0o600 });
  console.log('Configuración creada en .env. Ahí encontrarás CLASSROOM_CODE para entrar al salón. Ejecuta npm start.');
}
