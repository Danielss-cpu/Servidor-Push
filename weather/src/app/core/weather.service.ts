import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { firstValueFrom, timeout } from 'rxjs';
import { City, Forecast, QUICK_CITIES, WeatherSnapshot, isForecast, isSnapshot } from './weather.models';

@Injectable({ providedIn: 'root' })
export class WeatherService {
  private readonly http = inject(HttpClient);
  private readonly storageKey = 'cielo.weather.v1';
  private sequence = 0;
  readonly snapshot = signal<WeatherSnapshot | null>(null);
  readonly loading = signal(false);
  readonly error = signal('');
  readonly fromStorage = signal(false);
  readonly online = signal(navigator.onLine);
  readonly storageWarning = signal('');
  readonly saved = signal<WeatherSnapshot[]>(this.readSaved());

  constructor() {
    window.addEventListener('online', () => this.online.set(true));
    window.addEventListener('offline', () => this.online.set(false));
  }

  private readSaved(): WeatherSnapshot[] {
    try {
      const data: unknown = JSON.parse(localStorage.getItem(this.storageKey) || '[]');
      return Array.isArray(data) ? data.filter(isSnapshot).slice(0, 8) : [];
    } catch { return []; }
  }

  async search(query: string): Promise<City[]> {
    if (!this.online()) throw new Error('Necesitas conexión para buscar nuevas ciudades. Puedes abrir tus consultas guardadas.');
    const params = new HttpParams().set('name', query).set('count', 6).set('language', 'es').set('format', 'json');
    const response = await firstValueFrom(this.http.get<{ results?: City[] }>('https://geocoding-api.open-meteo.com/v1/search', { params }).pipe(timeout(12000)));
    return (response.results || []).filter(city => Number.isFinite(city.latitude) && Number.isFinite(city.longitude));
  }

  async load(city: City): Promise<void> {
    const sequence = ++this.sequence;
    const previous = this.saved().find(item => item.city.id === city.id);
    this.error.set(''); this.loading.set(true);
    this.snapshot.set(previous || null); this.fromStorage.set(!!previous);
    try {
      if (!this.online()) throw new Error('offline');
      const params = new HttpParams()
        .set('latitude', city.latitude).set('longitude', city.longitude)
        .set('current', 'temperature_2m,relative_humidity_2m,apparent_temperature,weather_code,is_day,wind_speed_10m')
        .set('hourly', 'temperature_2m,precipitation_probability,weather_code')
        .set('daily', 'weather_code,temperature_2m_max,temperature_2m_min,precipitation_probability_max,sunrise,sunset')
        .set('timezone', 'auto').set('forecast_days', 7);
      const forecast = await firstValueFrom(this.http.get<Forecast>('https://api.open-meteo.com/v1/forecast', { params }).pipe(timeout(15000)));
      if (!isForecast(forecast)) throw new Error('invalid response');
      if (sequence !== this.sequence) return;
      const snapshot: WeatherSnapshot = { city, forecast, savedAt: new Date().toISOString() };
      this.snapshot.set(snapshot); this.fromStorage.set(!this.online());
      const saved = [snapshot, ...this.saved().filter(item => item.city.id !== city.id)].slice(0, 8);
      this.saved.set(saved);
      try { localStorage.setItem(this.storageKey, JSON.stringify(saved)); this.storageWarning.set(''); }
      catch { this.storageWarning.set('Tu navegador no permite guardar más datos. Esta consulta podría no estar disponible al volver a abrir la app sin internet.'); }
    } catch {
      if (sequence !== this.sequence) return;
      this.error.set(previous ? 'Mostramos la última consulta guardada. No pudimos actualizar el clima.' :
        'No pudimos cargar esta ciudad. Revisa tu conexión y vuelve a intentarlo; todavía no hay datos guardados para ella.');
    } finally { if (sequence === this.sequence) this.loading.set(false); }
  }

  initialize(): void { void this.load(this.saved()[0]?.city || QUICK_CITIES[0]); }
}
