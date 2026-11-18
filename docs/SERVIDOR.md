# Servidor Web Push: referencia de la primera versión

Servidor de práctica para que las computadoras de un salón se suscriban y cualquier participante con el código pueda enviar notificaciones a todos.

## Ejecutar en tu computadora

Necesitas Node.js 22 o superior. En una terminal dentro de esta carpeta:

```powershell
npm install
npm run setup
npm start
```

Abre http://localhost:3000 en Chrome, Edge o Firefox. Abre el archivo `.env` y copia el valor de `CLASSROOM_CODE` en la página. Pulsa **Activar notificaciones** y acepta el permiso. Escribe tu nombre y un mensaje, y pulsa **Enviar a todo el salón**.

Las claves se generan una sola vez. No borres `.env` ni cambies las claves mientras uses las suscripciones existentes. Nunca subas `.env` a GitHub ni compartas `VAPID_PRIVATE_KEY`. El código del salón sí se comparte con los participantes.

## Publicar en Render para conectar al salón

1. Crea un repositorio en GitHub y sube los archivos del proyecto, incluido `package-lock.json`. Excluye `.env`, `node_modules` y `data` (ya están en `.gitignore`).
2. En https://dashboard.render.com selecciona **New → Web Service** y conecta ese repositorio.
3. Selecciona runtime **Node**, build command **npm ci**, start command **npm start** e instancia **Free** para la práctica.
4. En **Environment**, agrega estos valores de tu `.env`:

   | Variable | Valor |
   | --- | --- |
   | `VAPID_PUBLIC_KEY` | Tu clave pública generada |
   | `VAPID_PRIVATE_KEY` | Tu clave privada generada |
   | `VAPID_SUBJECT` | La URL HTTPS de tu servicio o un `mailto:` con tu correo real |
   | `CLASSROOM_CODE` | El código compartido del salón, mínimo 8 caracteres |
   | `NODE_VERSION` | `22.16.0` |

5. Pulsa **Deploy Web Service**. También puedes usar **New → Blueprint** con el `render.yaml` incluido e introducir las variables que solicite.
6. Espera el estado **Live**. Abre `https://TU-SERVICIO.onrender.com/api/health`: debe devolver `{"status":"ok"}`.
7. Comparte `https://TU-SERVICIO.onrender.com` y el código del salón. Cada compañero abre la página, introduce el código y activa notificaciones. Envía un mensaje y verifica su recepción en al menos dos computadoras.

**Limitación de la práctica gratuita:** Render puede suspender el servicio tras 15 minutos sin tráfico; el siguiente acceso puede tardar aproximadamente un minuto. Al reiniciar, suspenderse o redesplegar, los archivos de suscripciones se pierden. Los participantes deben volver a pulsar **Activar notificaciones**, aunque el navegador ya tenga permiso. Las claves VAPID de las variables de entorno se conservan. Para uso permanente, usa una base de datos externa o un servicio con disco persistente y `DATA_DIR` apuntando al disco; esta versión está pensada para una sola instancia.

## Qué significa el ejemplo del profesor

- `VAPID_PUBLIC_KEY`: identifica al servidor al crear la suscripción. Tu servidor tiene sus propias claves pública y privada.
- `PUSH_API_URL`: dirección del backend que registra suscripciones y envía mensajes. En este proyecto es `https://TU-SERVICIO.onrender.com/api`.
- FakeStoreAPI: API de datos ficticios de tiendas y usuarios, independiente de Web Push. Puede haberse usado para practicar usuarios o login; no es necesaria para el envío de notificaciones de este proyecto.

Si integras otro frontend, consulta primero `GET /api/config` para obtener `publicKey`. Este proyecto sirve frontend y API desde el mismo dominio; no habilita acceso desde otros dominios. No se conoce el contrato de los endpoints del profesor: esta implementación no supone compatibilidad directa con su cliente.

## API

Todos los endpoints salvo `/api/health` y `/api/config` requieren la cabecera `X-Classroom-Code`.

| Método | Ruta | Cuerpo / respuesta |
| --- | --- | --- |
| GET | `/api/health` | Estado del servidor |
| GET | `/api/config` | `{ publicKey }` |
| GET | `/api/stats` | `{ subscribers }` |
| POST | `/api/subscribe` | Suscripción del navegador: `{ endpoint, keys: { p256dh, auth } }` |
| POST | `/api/unsubscribe` | `{ endpoint }` |
| POST | `/api/send` | `{ name, message }`; devuelve `{ accepted, expired, failed, total }` |

`accepted` cuenta aceptaciones del servicio push, no confirma que el usuario vio la notificación. Se eliminan suscripciones vencidas cuando el proveedor devuelve 404 o 410. Se admiten endpoints de Google, Mozilla, Apple y Windows para evitar usar el backend como un proxy hacia destinos arbitrarios. Cada conexión tiene un máximo de cinco envíos por minuto; los equipos que comparten una IP pueden compartir ese límite. La identidad escrita es libre, no es un usuario autenticado.

## Comprobación y solución de problemas

```powershell
npm test
```

La prueba usa un proveedor simulado: verifica el código del salón, validación de suscripciones, difusión, errores de proveedor, limpieza de suscripciones vencidas y límite de envío. No sustituye la prueba real con dos navegadores o computadoras.

- **No aparece el permiso:** usa HTTPS en internet o localhost en tu computadora. Abrir `http://192.168.x.x:3000` desde otra computadora no satisface normalmente el requisito de contexto seguro.
- **Permiso bloqueado:** abre los permisos del sitio junto a la dirección del navegador y permite notificaciones.
- **Se acepta el envío pero no aparece:** revisa No molestar / Asistente de concentración y los permisos del navegador en Windows. Para la demostración mantén el navegador abierto, aunque cambies de pestaña.
- **Ya estaban activadas pero el contador es cero:** pulsa de nuevo Activar notificaciones para registrar el navegador tras un reinicio de Render.
- **Cambiaste las claves VAPID:** desactiva las notificaciones y vuelve a activarlas para crear una suscripción con las claves nuevas.

## Fuentes

- https://github.com/web-push-libs/web-push
- https://developer.mozilla.org/en-US/docs/Web/API/Push_API
- https://render.com/docs/deploy-node-express-app
- https://render.com/docs/free
