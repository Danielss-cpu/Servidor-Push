const $ = id => document.getElementById(id);
const supported = window.isSecureContext && 'serviceWorker' in navigator && 'PushManager' in window && 'Notification' in window;
const status = (message, error = false) => { $('status').textContent = message; $('status').classList.toggle('error', error); };
let registration;

async function api(path, body) {
  const response = await fetch(`/api/${path}`, {
    method: body === undefined ? 'GET' : 'POST',
    headers: { 'Content-Type': 'application/json', 'X-Classroom-Code': $('code').value.trim() },
    ...(body === undefined ? {} : { body: JSON.stringify(body) })
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) throw new Error(data.error || (response.status === 429 ? 'Demasiados intentos. Espera un minuto.' : 'No se pudo completar la solicitud.'));
  return data;
}
function bytes(key) {
  return Uint8Array.from(atob(key.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - key.length % 4) % 4)), c => c.charCodeAt(0));
}
async function updateConnection() {
  const subscription = registration && await registration.pushManager.getSubscription();
  $('connection').textContent = subscription ? 'Notificaciones activadas en este navegador' : 'Sin conectar';
  $('connection').classList.toggle('active', Boolean(subscription));
  $('unsubscribe').disabled = !subscription;
}
async function refresh() { const result = await api('stats'); $('count').textContent = result.subscribers; }

$('subscribe').addEventListener('click', async () => {
  $('subscribe').disabled = true;
  try {
    if (!supported) throw new Error('Abre la página en Chrome, Edge o Firefox usando HTTPS o localhost.');
    if (!$('code').value.trim()) throw new Error('Escribe el código del salón.');
    // Solicitar permiso directamente desde el clic del usuario.
    const permission = await Notification.requestPermission();
    if (permission !== 'granted') throw new Error('Permiso no concedido. Revisa los permisos de notificaciones junto a la dirección del sitio.');
    await api('stats');
    registration = await navigator.serviceWorker.ready;
    let subscription = await registration.pushManager.getSubscription();
    if (!subscription) {
      const { publicKey } = await api('config');
      subscription = await registration.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: bytes(publicKey) });
    }
    await api('subscribe', subscription.toJSON());
    await updateConnection(); await refresh();
    status('¡Listo! Esta computadora está registrada. Envía un mensaje o espera el de un compañero.');
  } catch (error) { status(error.message, true); }
  finally { $('subscribe').disabled = !supported; }
});
$('unsubscribe').addEventListener('click', async () => {
  $('unsubscribe').disabled = true;
  try {
    const subscription = await registration.pushManager.getSubscription();
    if (subscription) { await api('unsubscribe', { endpoint: subscription.endpoint }); await subscription.unsubscribe(); }
    await refresh(); status('Notificaciones desactivadas.');
  } catch (error) { status(error.message, true); }
  finally { await updateConnection(); }
});
$('refresh').addEventListener('click', () => refresh().catch(error => status(error.message, true)));
$('send-form').addEventListener('submit', async event => {
  event.preventDefault(); $('send').disabled = true;
  try {
    const result = await api('send', { name: $('name').value.trim(), message: $('message').value.trim() });
    status(result.total === 0 ? 'Todavía no hay computadoras registradas. Activa las notificaciones primero.' :
      `Aceptados por el proveedor: ${result.accepted} de ${result.total}. Suscripciones vencidas: ${result.expired}. Fallos: ${result.failed}. La recepción depende del permiso, la conexión y la configuración de notificaciones de cada equipo.`, result.failed > 0);
    await refresh();
  } catch (error) { status(error.message, true); }
  finally { $('send').disabled = false; }
});
if (!supported) {
  $('subscribe').disabled = true;
  status('Este navegador no permite Web Push aquí. Usa Chrome, Edge o Firefox con HTTPS o http://localhost:3000.', true);
} else {
  navigator.serviceWorker.register('/sw.js').then(async value => {
    registration = value;
    await updateConnection();
  }).catch(error => status(`No se pudo iniciar el service worker: ${error.message}`, true));
}
