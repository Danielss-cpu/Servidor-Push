# Cielo · PWA del clima en Angular

Aplicación de práctica: búsqueda de ciudades, clima actual, pronóstico de siete días, consultas offline y avisos Web Push. Frontend Angular 21 con componentes standalone, rutas, HttpClient, TypeScript estricto, `@angular/pwa` y `SwPush`. Backend Node.js/Express con claves VAPID propias.

## Ejecutar

Requiere Node 22.12+ de la rama 22 o Node 24 LTS. En la raíz del repositorio:

```powershell
npm ci
npm run setup
npm start
```

Estos comandos ejecutan únicamente el servidor push y su página de prueba en http://localhost:3000. `npm run setup` conserva `.env` si ya existe. Angular se instala y compila de forma independiente dentro de `weather`: `npm ci --include=dev` y `npm run build`.

Las notificaciones se activan con el permiso del navegador, sin código de acceso. Cualquier visitante puede suscribirse y enviar avisos, con un límite de cinco envíos por minuto por conexión. No compartas ni subas `.env` o `VAPID_PRIVATE_KEY`.

Para desarrollo del frontend, desde `weather`: `npm start`. Las pruebas completas de PWA y notificaciones se hacen en el sitio estático de producción con HTTPS. El cliente utiliza la URL pública del backend definida en `weather/src/app/core/push.config.ts`.

## Render

En el servicio existente:

- Branch: `main`.
- Build Command: `npm ci`.
- Start Command: `npm start`.
- Node: `NODE_VERSION=22.16.0`.
- Conservar las variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`.

Express sirve únicamente la página de prueba de Salón Push y la API desde `/api`. Cielo se publica como un Static Site independiente con Root Directory `weather`, Build Command `npm ci --include=dev && npm run build` y Publish Directory `dist/cielo/browser`. En ese sitio se configura el rewrite `/*` a `/index.html` para las rutas de Angular. Consulta [la guía de los dos despliegues](docs/DESPLIEGUES.md).

Los avisos del clima se envían manualmente a todos los suscriptores y describen la ciudad consultada. No hay monitoreo meteorológico automático ni cuentas de usuario. Los datos meteorológicos proceden de Open-Meteo, con atribución CC BY 4.0.

Render gratuito pierde las suscripciones de archivos cuando se suspende o reinicia. Cada participante debe pulsar **Activar notificaciones** de nuevo. Las ciudades guardadas se conservan en cada navegador y no dependen de los reinicios del backend.

## Práctica y validación

- [Guía para demostrar los requisitos y entregar la práctica](docs/PRACTICA.md).
- [Referencia del servidor y endpoints](docs/SERVIDOR.md).
- Pruebas del backend: `npm test`.
- Comprobación del servicio: `GET /api/health`.

El modo offline necesita una primera visita con conexión y que el service worker termine de guardar la app. Se almacenan respuestas de las API en Data Groups y archivos de la app en Asset Groups. Las últimas ocho ciudades también se guardan en localStorage para recuperarlas y navegar entre ellas. La fecha de los datos permanece visible. No se pueden buscar ciudades nuevas ni enviar avisos sin internet.
