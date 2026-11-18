import { HttpClient, HttpErrorResponse } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { SwPush } from '@angular/service-worker';
import { firstValueFrom, timeout } from 'rxjs';
import { WeatherSnapshot, condition } from './weather.models';

interface PushResult { accepted: number; total: number; expired: number; failed: number; }

@Injectable({ providedIn: 'root' })
export class PushService {
  private readonly http = inject(HttpClient);
  private readonly push = inject(SwPush);
  readonly busy = signal(false);
  readonly enabled = signal(false);
  readonly registered = signal(false);
  readonly message = signal('');
  readonly failed = signal(false);
  readonly supported = this.push.isEnabled && 'Notification' in window;

  constructor() { this.push.subscription.subscribe(subscription => this.enabled.set(!!subscription)); }

  private async request<T>(path: string, body: unknown): Promise<T> {
    return firstValueFrom(this.http.post<T>(`/api/${path}`, body).pipe(timeout(60000)));
  }
  private report(error: unknown): void {
    this.failed.set(true);
    this.message.set(error instanceof HttpErrorResponse ?
      (error.error?.error || (error.status === 429 ? 'Espera un minuto antes de volver a enviar.' : 'No pudimos conectar con el servidor. Revisa tu conexión.')) :
      error instanceof Error ? error.message : 'No se pudo completar la operación.');
  }

  async subscribe(): Promise<void> {
    this.busy.set(true); this.failed.set(false);
    try {
      if (!this.supported) throw new Error('Las notificaciones requieren HTTPS y un navegador compatible. Usa la versión publicada o la compilación de producción.');
      if (!navigator.onLine) throw new Error('Conéctate a internet para activar las notificaciones.');
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') throw new Error('Permite las notificaciones en la configuración del sitio para continuar.');
      const config = await firstValueFrom(this.http.get<{ publicKey: string }>('/api/config').pipe(timeout(15000)));
      const subscription = await this.push.requestSubscription({ serverPublicKey: config.publicKey });
      await this.request('subscribe', subscription.toJSON());
      this.registered.set(true);
      this.message.set('Notificaciones activadas y suscripción registrada. Ya puedes enviar un aviso del clima.');
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }

  async unsubscribe(): Promise<void> {
    this.busy.set(true); this.failed.set(false);
    try {
      const subscription = await firstValueFrom(this.push.subscription);
      if (subscription) {
        await this.request('unsubscribe', { endpoint: subscription.endpoint });
        await this.push.unsubscribe();
      }
      this.registered.set(false); this.message.set('Notificaciones desactivadas en este navegador.');
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }

  async send(snapshot: WeatherSnapshot, saved: boolean): Promise<void> {
    this.busy.set(true); this.failed.set(false);
    try {
      if (!navigator.onLine) throw new Error('Necesitas internet para enviar un aviso.');
      if (saved) throw new Error('Actualiza el clima antes de enviar un aviso.');
      const current = snapshot.forecast.current;
      const result = await this.request<PushResult>('send', {
        kind: 'weather', name: snapshot.city.name.slice(0, 40),
        message: `${snapshot.city.name}: ${Math.round(current.temperature_2m)} °C, ${condition(current.weather_code).label.toLowerCase()}. Sensación de ${Math.round(current.apparent_temperature)} °C. Datos de ${current.time.replace('T', ' ')} (${snapshot.forecast.timezone}).`.slice(0, 300)
      });
      this.failed.set(result.failed > 0);
      this.message.set(result.total ? `Proveedor: ${result.accepted} de ${result.total} aceptados. ${result.expired} vencidos y ${result.failed} fallidos. Revisa las notificaciones del equipo; la aceptación no confirma su visualización.` :
        'No hay suscriptores registrados. Activa las notificaciones e inténtalo otra vez.');
    } catch (error) { this.report(error); }
    finally { this.busy.set(false); }
  }
}
