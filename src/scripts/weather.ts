import { LOCATION } from '../config/location';
import {
  WEATHER_CODE_BUCKETS,
  WEATHER_GLYPHS,
  isWeatherBucket,
  type WeatherBucket,
} from '../config/weather';

export interface WeatherSnapshot {
  bucket: WeatherBucket;
  glyph: string;
  temperature: number;
}

const CACHE_KEY = 'weather:current';
const TTL_MS = 15 * 60_000;
const RETRY_COOLDOWN_MS = 5 * 60_000;

interface CacheEntry {
  at: number;
  data: WeatherSnapshot;
}

let memo: CacheEntry | null = null;
let pending: Promise<WeatherSnapshot | null> | null = null;
let failedAt = 0;

function readCache(): CacheEntry | null {
  if (memo && Date.now() - memo.at < TTL_MS) return memo;
  try {
    const raw = sessionStorage.getItem(CACHE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as CacheEntry;
    if (typeof parsed?.at !== 'number' || !parsed.data) return null;
    if (!isWeatherBucket(parsed.data.bucket) || typeof parsed.data.temperature !== 'number') return null;
    if (Date.now() - parsed.at >= TTL_MS) return null;
    memo = parsed;
    return parsed;
  } catch {
    return null;
  }
}

function writeCache(data: WeatherSnapshot): void {
  const entry: CacheEntry = { at: Date.now(), data };
  memo = entry;
  try {
    sessionStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {}
}

function endpoint(): string {
  const params = new URLSearchParams({
    latitude: String(LOCATION.latitude),
    longitude: String(LOCATION.longitude),
    current: 'temperature_2m,weather_code',
    timezone: LOCATION.timeZone,
  });
  return `https://api.open-meteo.com/v1/forecast?${params}`;
}

async function request(): Promise<WeatherSnapshot | null> {
  try {
    const res = await fetch(endpoint());
    if (!res.ok) throw new Error(String(res.status));

    const json = (await res.json()) as {
      current?: { temperature_2m?: number; weather_code?: number };
    };

    const temp = json.current?.temperature_2m;
    const code = json.current?.weather_code;
    if (typeof temp !== 'number' || typeof code !== 'number') throw new Error('malformed');

    const bucket = WEATHER_CODE_BUCKETS[code] ?? 'overcast';
    const snapshot: WeatherSnapshot = {
      bucket,
      glyph: WEATHER_GLYPHS[bucket],
      temperature: Math.round(temp),
    };
    writeCache(snapshot);
    return snapshot;
  } catch {
    failedAt = Date.now();
    return null;
  }
}

export function loadWeather(): Promise<WeatherSnapshot | null> {
  const cached = readCache();
  if (cached) return Promise.resolve(cached.data);
  if (pending) return pending;
  if (Date.now() - failedAt < RETRY_COOLDOWN_MS) return Promise.resolve(null);

  pending = request().finally(() => {
    pending = null;
  });
  return pending;
}

export function getCachedWeather(): WeatherSnapshot | null {
  return readCache()?.data ?? null;
}
