export interface City {
  id: number;
  name: string;
  latitude: number;
  longitude: number;
  country: string;
  admin1?: string;
}

export interface Forecast {
  timezone: string;
  current: {
    time: string;
    temperature_2m: number;
    relative_humidity_2m: number;
    apparent_temperature: number;
    weather_code: number;
    is_day: number;
    wind_speed_10m: number;
  };
  hourly: {
    time: string[];
    temperature_2m: (number | null)[];
    precipitation_probability: (number | null)[];
    weather_code: (number | null)[];
  };
  daily: {
    time: string[];
    weather_code: (number | null)[];
    temperature_2m_max: (number | null)[];
    temperature_2m_min: (number | null)[];
    precipitation_probability_max: (number | null)[];
    sunrise: string[];
    sunset: string[];
  };
}

export interface WeatherSnapshot { city: City; forecast: Forecast; savedAt: string; }

export const QUICK_CITIES: City[] = [
  { id: 3522307, name: 'Orizaba', admin1: 'Veracruz', country: 'México', latitude: 18.85195, longitude: -97.09957 },
  { id: 3526617, name: 'Xalapa', admin1: 'Veracruz', country: 'México', latitude: 19.53124, longitude: -96.91589 },
  { id: 3530597, name: 'Ciudad de México', country: 'México', latitude: 19.42847, longitude: -99.12766 },
  { id: 4005539, name: 'Guadalajara', admin1: 'Jalisco', country: 'México', latitude: 20.66682, longitude: -103.39182 }
];

export function condition(code: number | null): { label: string; icon: string } {
  if (code === 0) return { label: 'Despejado', icon: '☀' };
  if (code === 1 || code === 2) return { label: 'Parcialmente nublado', icon: '⛅' };
  if (code === 3) return { label: 'Nublado', icon: '☁' };
  if (code === 45 || code === 48) return { label: 'Niebla', icon: '≋' };
  if ([51, 53, 55, 56, 57].includes(code ?? -1)) return { label: 'Llovizna', icon: '🌦' };
  if ([61, 63, 65, 66, 67, 80, 81, 82].includes(code ?? -1)) return { label: 'Lluvia', icon: '🌧' };
  if ([71, 73, 75, 77, 85, 86].includes(code ?? -1)) return { label: 'Nieve', icon: '❄' };
  if ([95, 96, 99].includes(code ?? -1)) return { label: 'Tormenta', icon: '⛈' };
  return { label: 'Sin información', icon: '—' };
}

export function isSnapshot(value: unknown): value is WeatherSnapshot {
  if (!value || typeof value !== 'object') return false;
  const s = value as Partial<WeatherSnapshot>;
  return !!s.city && Number.isFinite(s.city.latitude) && Number.isFinite(s.city.longitude) &&
    typeof s.city.name === 'string' && typeof s.city.country === 'string' &&
    typeof s.savedAt === 'string' && Number.isFinite(Date.parse(s.savedAt)) && isForecast(s.forecast);
}

export function isForecast(value: unknown): value is Forecast {
  if (!value || typeof value !== 'object') return false;
  const f = value as Partial<Forecast>;
  return typeof f.timezone === 'string' && !!f.current && Number.isFinite(f.current.temperature_2m) &&
    typeof f.current.time === 'string' && !!f.hourly && Array.isArray(f.hourly.time) &&
    Array.isArray(f.hourly.temperature_2m) && Array.isArray(f.hourly.weather_code) &&
    Array.isArray(f.hourly.precipitation_probability) && !!f.daily && Array.isArray(f.daily.time) &&
    Array.isArray(f.daily.weather_code) && Array.isArray(f.daily.temperature_2m_max) &&
    Array.isArray(f.daily.temperature_2m_min) && Array.isArray(f.daily.precipitation_probability_max) &&
    Array.isArray(f.daily.sunrise) && Array.isArray(f.daily.sunset);
}
