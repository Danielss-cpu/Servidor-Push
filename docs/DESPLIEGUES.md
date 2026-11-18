# Dos enlaces: servidor push y aplicación Cielo

Los dos despliegues pueden usar el mismo repositorio GitHub. Cada servicio tiene su propio proceso de construcción y su URL pública.

## Servidor push existente (Web Service)

- URL: https://servidor-push-lfpa.onrender.com
- API: https://servidor-push-lfpa.onrender.com/api
- Estado: https://servidor-push-lfpa.onrender.com/api/health
- Root Directory: vacío.
- Build Command: `npm ci`.
- Start Command: `npm start`.
- Mantener las claves VAPID existentes en las variables de entorno.

La API pública admite CORS sin cookies para los métodos GET, POST y OPTIONS. Las suscripciones y los avisos no requieren código de acceso. Se mantienen la validación de endpoints push y los límites de solicitudes y envíos.

## Aplicación Cielo (Static Site nuevo)

En Render → New → Static Site, selecciona el repositorio `Danielss-cpu/Servidor-Push`:

| Campo | Valor |
| --- | --- |
| Name | `cielo-clima` (si está ocupado, elegir otro) |
| Branch | `main` |
| Root Directory | `weather` |
| Build Command | `npm ci --include=dev && npm run build` |
| Publish Directory | `dist/cielo/browser` |
| Environment Variable | `NODE_VERSION=22.16.0` |

No poner claves VAPID privadas ni variables del backend en el sitio estático.

Después de crear el sitio, en Redirects/Rewrites agregar una regla: Source `/*`, Destination `/index.html`, Action **Rewrite**. Esto permite abrir y recargar las rutas `/clima` y `/acerca`.

Para evitar caché de configuración antigua, en Headers se puede establecer `Cache-Control: no-cache` para `/ngsw.json`, `/ngsw-worker.js` e `/index.html`.

El cliente consulta directamente la URL del servidor definida en `weather/src/app/core/push.config.ts`. El navegador muestra el permiso de notificaciones bajo el dominio de la app. Al cambiar de dominio hay que activar las notificaciones otra vez en ese nuevo dominio.

## Comprobaciones

1. Abrir el enlace público nuevo del sitio estático: debe aparecer Cielo y cargar los datos de Open-Meteo.
2. Abrir `/api/health` en el enlace del backend y comprobar `status: ok`.
3. Activar notificaciones desde el enlace nuevo y aceptar el permiso del navegador.
4. Enviar un aviso del clima y comprobar su recepción.
5. Recargar `/clima` y `/acerca` para verificar el rewrite.
6. Comprobar el modo offline desde DevTools una vez guardados los datos.

Al entregar, compartir la URL raíz del servidor push y la URL raíz del sitio estático; son dominios diferentes.
