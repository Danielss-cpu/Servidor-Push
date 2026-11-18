# Cielo · PWA del clima en Angular

Aplicación de práctica: búsqueda de ciudades, clima actual, pronóstico de siete días, consultas offline y avisos Web Push. Frontend Angular 21 con componentes standalone, rutas, HttpClient, TypeScript estricto, `@angular/pwa` y `SwPush`. Backend Node.js/Express con claves VAPID propias.

## Ejecutar

Requiere Node 22.12+ de la rama 22 o Node 24 LTS. En la raíz del repositorio:

```powershell
npm ci
npm run setup
npm start
```

`npm ci` instala también las dependencias del frontend y compila Angular para producción. Abre http://localhost:3000. `npm run setup` conserva `.env` si ya existe. Para volver a compilar tras editar el frontend: `npm run build`.

Las notificaciones necesitan el valor de `CLASSROOM_CODE` de `.env`. Ese código se comparte con los participantes. No compartas ni subas `.env` o `VAPID_PRIVATE_KEY`.

Para desarrollo del frontend, desde `weather`: `npm start`. Este modo es para editar la interfaz; las pruebas completas de PWA y notificaciones se hacen sobre la compilación de producción servida por el backend, con HTTPS o localhost.

## Render

En el servicio existente:

- Branch: `main`.
- Build Command: `npm ci`.
- Start Command: `npm start`.
- Node: `NODE_VERSION=22.16.0`.
- Conservar las variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT` y `CLASSROOM_CODE`.

El script `postinstall` construye el frontend automáticamente. Express sirve los archivos de `weather/dist/cielo/browser` y la API desde `/api`. Las rutas `/clima` y `/acerca` funcionan al abrirlas directamente. Sin una compilación, el backend mantiene la página inicial de Salón Push como respaldo local.

Los avisos del clima se envían manualmente a todos los suscriptores y describen la ciudad consultada. No hay monitoreo meteorológico automático ni cuentas de usuario. Los datos meteorológicos proceden de Open-Meteo, con atribución CC BY 4.0.

Render gratuito pierde las suscripciones de archivos cuando se suspende o reinicia. Cada participante debe pulsar **Activar notificaciones** de nuevo. Las ciudades guardadas se conservan en cada navegador y no dependen de los reinicios del backend.

## Práctica y validación

- [Guía para demostrar los requisitos y entregar la práctica](docs/PRACTICA.md).
- [Referencia del servidor y endpoints](docs/SERVIDOR.md).
- Pruebas del backend: `npm test`.
- Comprobación del servicio: `GET /api/health`.

El modo offline necesita una primera visita con conexión y que el service worker termine de guardar la app. Se almacenan respuestas de las API en Data Groups y archivos de la app en Asset Groups. Las últimas ocho ciudades también se guardan en localStorage para recuperarlas y navegar entre ellas. La fecha de los datos permanece visible. No se pueden buscar ciudades nuevas ni enviar avisos sin internet.
