import { isWeatherBucket, type WeatherBucket } from './weather';

export const MOOD_PHASES = ['late', 'dawn', 'morning', 'afternoon', 'evening', 'night'] as const;

export type MoodPhase = (typeof MOOD_PHASES)[number];

export const PHASE_BY_HOUR = [
  'night',
  'late',
  'late',
  'late',
  'late',
  'dawn',
  'dawn',
  'dawn',
  'morning',
  'morning',
  'morning',
  'morning',
  'afternoon',
  'afternoon',
  'afternoon',
  'afternoon',
  'afternoon',
  'afternoon',
  'evening',
  'evening',
  'evening',
  'evening',
  'night',
  'night',
] as const satisfies readonly MoodPhase[];

export const DEFAULT_PHASE: MoodPhase = 'afternoon';

export function phaseForHour(hour: number): MoodPhase {
  if (!Number.isFinite(hour)) return DEFAULT_PHASE;
  return PHASE_BY_HOUR[((Math.trunc(hour) % 24) + 24) % 24];
}

export const NOTABLE_WEATHER = ['drizzle', 'rain', 'showers', 'snow', 'storm', 'fog'] as const;

export type NotableWeather = (typeof NOTABLE_WEATHER)[number];

export function isNotableWeather(value: string): value is NotableWeather {
  return (NOTABLE_WEATHER as readonly string[]).includes(value);
}

export const QUIET_PHASES: readonly MoodPhase[] = ['night', 'late'];

export const IDLE_MS = 3 * 60_000;
export const DWELL_MS = 5 * 60_000;
export const GREETING_MS = 18_000;
export const LOYAL_VISITS = 5;

export type MoodLineKey =
  | 'birthday'
  | 'idle'
  | 'dwell'
  | 'loyal'
  | 'returning'
  | `weather.${NotableWeather}`
  | MoodPhase;

export const MOOD_LINE_KEYS: readonly MoodLineKey[] = [
  ...MOOD_PHASES,
  ...NOTABLE_WEATHER.map((w) => `weather.${w}` as const),
  'birthday',
  'idle',
  'dwell',
  'loyal',
  'returning',
];

export interface MoodState {
  phase: MoodPhase;
  weather: WeatherBucket | null;
  visits: number;
  dwellMs: number;
  idleMs: number;
  birthday: boolean;
  settled: boolean;
}

export function resolveMoodKey(state: MoodState): MoodLineKey {
  if (state.birthday) return 'birthday';
  if (QUIET_PHASES.includes(state.phase) && state.idleMs >= IDLE_MS) return 'idle';
  if (state.dwellMs >= DWELL_MS) return 'dwell';
  if (!state.settled && state.visits >= LOYAL_VISITS) return 'loyal';
  if (!state.settled && state.visits >= 2) return 'returning';
  if (state.weather && isWeatherBucket(state.weather) && isNotableWeather(state.weather)) {
    return `weather.${state.weather}`;
  }
  return state.phase;
}

export function pickLine(pool: readonly string[], visits: number, phase: MoodPhase): string {
  if (pool.length === 0) return '';
  const offset = visits + MOOD_PHASES.indexOf(phase);
  return pool[((offset % pool.length) + pool.length) % pool.length];
}
