import { Component, computed, inject, signal } from '@angular/core';
import { DatePipe, DecimalPipe } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { WeatherService } from '../core/weather.service';
import { PushService } from '../core/push.service';
import { City, QUICK_CITIES, condition } from '../core/weather.models';

@Component({ selector: 'app-dashboard', imports: [FormsModule, DatePipe, DecimalPipe], templateUrl: './dashboard.html', styleUrl: './dashboard.css' })
export class Dashboard {
  readonly weather = inject(WeatherService);
  readonly push = inject(PushService);
  readonly condition = condition;
  readonly quickCities = QUICK_CITIES;
  readonly query = signal('');
  readonly results = signal<City[]>([]);
  readonly searchBusy = signal(false);
  readonly searchError = signal('');
  readonly searched = signal(false);
  readonly code = signal('');
  private searchSequence = 0;
  readonly today = new Intl.DateTimeFormat('es-MX', { weekday: 'long', day: 'numeric', month: 'long' }).format(new Date());
  readonly hours = computed(() => {
    const f = this.weather.snapshot()?.forecast;
    if (!f) return [];
    let start = f.hourly.time.findIndex(time => time >= f.current.time);
    if (start < 0) start = 0;
    return f.hourly.time.slice(start, start + 8).map((time, i) => ({ time: time.slice(11, 16), temperature: f.hourly.temperature_2m[start + i], rain: f.hourly.precipitation_probability[start + i], code: f.hourly.weather_code[start + i] }));
  });
  readonly days = computed(() => {
    const d = this.weather.snapshot()?.forecast.daily;
    return d?.time.map((time, i) => ({ time, code: d.weather_code[i], max: d.temperature_2m_max[i], min: d.temperature_2m_min[i], rain: d.precipitation_probability_max[i] })) || [];
  });
  readonly temperaturePoints = computed(() => {
    const points = this.hours();
    const valid = points.map(p => p.temperature).filter((n): n is number => n !== null && Number.isFinite(n));
    if (!valid.length) return '';
    const min = Math.min(...valid) - 2, span = Math.max(...valid) + 2 - min;
    return points.map((p, i) => `${20 + i * (660 / Math.max(points.length - 1, 1))},${90 - ((p.temperature ?? min) - min) / span * 68}`).join(' ');
  });
  constructor() { if (!this.weather.snapshot()) this.weather.initialize(); }
  async search(): Promise<void> {
    const query = this.query().trim(), sequence = ++this.searchSequence;
    this.searchError.set(''); this.results.set([]); this.searched.set(false);
    if (query.length < 2) { this.searchError.set('Escribe al menos dos letras para buscar una ciudad.'); return; }
    this.searchBusy.set(true);
    try { const results = await this.weather.search(query); if (sequence === this.searchSequence) { this.results.set(results); this.searched.set(true); } }
    catch (error) { if (sequence === this.searchSequence) this.searchError.set(error instanceof Error && error.message.includes('conexión') ? error.message : 'La búsqueda no está disponible. Revisa tu conexión e inténtalo otra vez.'); }
    finally { if (sequence === this.searchSequence) this.searchBusy.set(false); }
  }
  select(city: City): void { ++this.searchSequence; this.searchBusy.set(false); this.results.set([]); this.searched.set(false); this.searchError.set(''); void this.weather.load(city); }
  refresh(): void { const s = this.weather.snapshot(); if (s) void this.weather.load(s.city); else this.weather.initialize(); }
}
