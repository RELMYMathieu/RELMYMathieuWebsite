export const WEATHER_BUCKETS = [
  'clear',
  'partly',
  'overcast',
  'fog',
  'drizzle',
  'rain',
  'snow',
  'showers',
  'storm',
] as const;

export type WeatherBucket = (typeof WEATHER_BUCKETS)[number];

export const WEATHER_GLYPHS: Record<WeatherBucket, string> = {
  clear: '☀',
  partly: '⛅',
  overcast: '☁',
  fog: '≡',
  drizzle: '☂',
  rain: '☂',
  snow: '❄',
  showers: '☂',
  storm: '⚡',
};

/** WMO weather codes, linked to our buckets, honestly should document this, maybe, later? */
export const WEATHER_CODE_BUCKETS: Record<number, WeatherBucket> = {
  0: 'clear',
  1: 'partly',
  2: 'partly',
  3: 'overcast',
  45: 'fog',
  48: 'fog',
  51: 'drizzle',
  53: 'drizzle',
  55: 'drizzle',
  56: 'drizzle',
  57: 'drizzle',
  61: 'rain',
  63: 'rain',
  65: 'rain',
  66: 'rain',
  67: 'rain',
  71: 'snow',
  73: 'snow',
  75: 'snow',
  77: 'snow',
  80: 'showers',
  81: 'showers',
  82: 'showers',
  85: 'snow',
  86: 'snow',
  95: 'storm',
  96: 'storm',
  99: 'storm',
};

export function isWeatherBucket(value: string): value is WeatherBucket {
  return (WEATHER_BUCKETS as readonly string[]).includes(value);
}
