import '@angular/compiler';
import test from 'node:test';
import assert from 'node:assert/strict';
import { createEnvironmentInjector } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { of, throwError, Subject } from 'rxjs';
import { WeatherService } from './.qa/weather.service.mjs';

test('recupera ciudades guardadas sin red, conserva datos tras un error y descarta respuestas atrasadas', async () => {
  const memory = new Map();
  Object.defineProperty(globalThis, 'navigator', { configurable: true, value: { onLine: true } });
  globalThis.window = new EventTarget();
  globalThis.localStorage = { getItem: key => memory.get(key) || null, setItem: (key, value) => memory.set(key, value) };
  const city = { id: 1, name: 'Orizaba', country: 'México', latitude: 18.85, longitude: -97.1 };
  const forecast = {
    timezone: 'America/Mexico_City',
    current: { time: '2026-11-18T12:00', temperature_2m: 20, relative_humidity_2m: 70, apparent_temperature: 21, weather_code: 3, is_day: 1, wind_speed_10m: 8 },
    hourly: { time: ['2026-11-18T13:00'], temperature_2m: [21], precipitation_probability: [15], weather_code: [3] },
    daily: { time: ['2026-11-18'], weather_code: [3], temperature_2m_max: [23], temperature_2m_min: [15], precipitation_probability_max: [15], sunrise: ['2026-11-18T06:30'], sunset: ['2026-11-18T18:00'] }
  };
  let calls = 0, response = () => of(forecast);
  const http = { get: () => { calls++; return response(); } };
  const injector = createEnvironmentInjector([WeatherService, { provide: HttpClient, useValue: http }], null);
  try {
    const service = injector.get(WeatherService);
    await service.load(city);
    assert.equal(service.snapshot().forecast.current.temperature_2m, 20);
    assert.equal(service.fromStorage(), false);
    assert.equal(memory.has('cielo.weather.v1'), true);
    window.dispatchEvent(new Event('offline'));
    const before = calls;
    await service.load(city);
    assert.equal(calls, before, 'offline no intenta consultar la API');
    assert.equal(service.snapshot().city.name, 'Orizaba');
    assert.equal(service.fromStorage(), true);
    await service.load({ ...city, id: 99, name: 'Nunca consultada' });
    assert.equal(service.snapshot(), null, 'no muestra el clima de otra ciudad como si fuera la solicitada');
    assert.match(service.error(), /todavía no hay datos guardados/);
    window.dispatchEvent(new Event('online'));
    response = () => throwError(() => new Error('API unavailable'));
    await service.load(city);
    assert.equal(service.fromStorage(), true);
    assert.equal(service.snapshot().city.name, 'Orizaba');
    const first = new Subject(), second = new Subject();
    let turn = 0;
    response = () => ++turn === 1 ? first : second;
    const a = service.load(city);
    const b = service.load({ ...city, id: 2, name: 'Xalapa' });
    second.next(forecast); await b;
    first.next(forecast); await a;
    assert.equal(service.snapshot().city.name, 'Xalapa', 'una respuesta atrasada no reemplaza la ciudad más reciente');
  } finally { injector.destroy(); }
});
