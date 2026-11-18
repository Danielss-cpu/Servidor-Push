# Cielo: práctica de PWA en Angular

Aplicación del clima desarrollada con Angular 21, componentes standalone, rutas y TypeScript estricto. Consume la API externa Open-Meteo, permite consultar datos sin conexión y usa el servidor Web Push propio de Render.

## Arquitectura y requisitos

| Requisito | Implementación |
| --- | --- |
| Angular standalone y rutas | `weather/src/app`, rutas `/clima` y `/acerca`, carga diferida |
| HttpClient y API REST pública | `core/weather.service.ts`, búsqueda de ciudades y pronóstico de Open-Meteo |
| Carga y errores | Indicadores de progreso, errores de búsqueda, mensajes de falta de conexión y recuperación de la última consulta |
| Paquete oficial PWA | `@angular/pwa`, manifiesto, iconos y registro de `ngsw-worker.js` |
| Asset Groups | Archivos de la aplicación y recursos de rutas guardados para uso offline |
| Data Groups | Respuestas de las API meteorológica y geográfica, conservando los parámetros de cada consulta |
| Persistencia complementaria | Últimas ocho ciudades en localStorage, con fecha de consulta; no reemplaza la caché oficial del service worker |
| SwPush | `core/push.service.ts`: permiso, suscripción VAPID, registro HTTP POST y cancelación |
| Servidor propio | Express, claves VAPID de entorno y endpoints `/api/subscribe`, `/api/unsubscribe`, `/api/send` |
| Caso de negocio | Envío manual del clima de la ciudad consultada a todos los suscriptores del salón |
| HTTPS y nube | Frontend y backend en el servicio de Render existente, mismo dominio |

## Demostración para entregar

1. Abrir la URL pública y esperar a que aparezca el clima de Orizaba.
2. Buscar otra ciudad y seleccionar el resultado correcto (se muestran estado y país).
3. Mostrar temperatura, sensación térmica, humedad, viento, probabilidad de lluvia, próximas horas y siete días.
4. En DevTools → Application → Service Workers comprobar que `ngsw-worker.js` esté activo. Recargar una vez con conexión si todavía no controla la página.
5. En Application → Manifest revisar nombre, iconos e instalación.
6. En Network seleccionar **Offline**. Recargar normalmente (no recarga forzada ni «Disable cache»), comprobar que se abre la aplicación, que se indica el estado sin conexión y que se siguen viendo los datos guardados y su fecha.
7. Abrir una de las otras ciudades ya consultadas desde «Tus consultas guardadas». Comprobar que se muestran sus datos sin internet. Una ciudad no consultada debe mostrar un error claro; la caché no puede inventar información.
8. Volver a Online antes de probar notificaciones y actualizar el clima.
9. Introducir el código del salón y pulsar **Activar notificaciones** en dos navegadores o computadoras. Aceptar el permiso; revisar No molestar y permisos de Windows si hace falta.
10. Pulsar **Enviar aviso del clima**. Ambos equipos deben recibir el título de la ciudad y su temperatura/condición. El resultado aceptado por el proveedor no prueba por sí solo la visualización en el sistema.
11. Abrir directamente `/clima` y `/acerca` y recargar para comprobar las rutas públicas sin errores 404.
12. Compartir la URL de la aplicación en b-learning. El backend está en la misma URL bajo `/api`; `/api/health` permite comprobarlo.

Las alertas son manuales, no hay vigilancia meteorológica periódica. El código del salón permite a los participantes activar suscripciones y difundir avisos. Las notificaciones requieren conexión. Los pronósticos son estimaciones, y la aplicación muestra la fecha de los datos para distinguir una consulta guardada.

## Render

Se conservan las variables `VAPID_PUBLIC_KEY`, `VAPID_PRIVATE_KEY`, `VAPID_SUBJECT`, `CLASSROOM_CODE` y `NODE_VERSION=22.16.0` ya configuradas. No subir `.env` al repositorio.

Build command: `npm ci`. El script `postinstall` instala y compila Angular. Start command: `npm start`. También se puede compilar manualmente con `npm run build` después de instalar las dependencias. Se requieren Node 22.12 o superior de la rama 22, o Node 24 LTS.

En Render gratuito las suscripciones guardadas en archivos se pierden al suspenderse/reiniciarse el servicio. Hay que pulsar nuevamente **Activar notificaciones**. Las ciudades guardadas en cada navegador son independientes de esos reinicios.

## Fuentes

Pruebas automatizadas: `npm test` (backend) y `npm run test:weather` (datos guardados, errores de API y respuestas fuera de orden). La compilación de producción se verifica con `npm run build`. La demostración real de modo avión y recepción de avisos se realiza con los pasos anteriores.

- https://angular.dev/ecosystem/service-workers/getting-started
- https://angular.dev/ecosystem/service-workers/config
- https://angular.dev/ecosystem/service-workers/push-notifications
- https://open-meteo.com/en/docs
- https://open-meteo.com/en/docs/geocoding-api
