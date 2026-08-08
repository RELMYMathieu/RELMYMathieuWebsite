import { animate } from 'motion/mini';
import { onPageReady, prefersReducedMotion, EASE } from '../animations';
import { LOCATION } from '../config/location';
import { BIRTHDAY } from '../utils/age';
import { getCachedWeather, loadWeather, type WeatherSnapshot } from './weather';
import {
  DEFAULT_PHASE,
  GREETING_MS,
  phaseForHour,
  pickLine,
  resolveMoodKey,
  type MoodPhase,
} from '../config/mood';
import type { WeatherBucket } from '../config/weather';
import { getVisit } from './visit';

const START_KEY = 'mood:start';
const TICK_MS = 20_000;

const TIME_FMT = new Intl.DateTimeFormat('en-GB', {
  hour: '2-digit',
  minute: '2-digit',
  hourCycle: 'h23',
  timeZone: LOCATION.timeZone,
});

const DATE_FMT = new Intl.DateTimeFormat('en-GB', {
  month: 'numeric',
  day: 'numeric',
  timeZone: LOCATION.timeZone,
});

type LinePools = Record<string, string[]>;

let visits = 1;
let sessionStart = Date.now();
let lastActivity = Date.now();
let interval: number | null = null;
let listenersBound = false;
let currentLine = '';
let currentPhase: MoodPhase = DEFAULT_PHASE;
let activeEl: HTMLElement | null = null;
let activePools: LinePools = {};

function readSessionStart(): number {
  try {
    const raw = Number(sessionStorage.getItem(START_KEY) ?? '');
    if (Number.isFinite(raw) && raw > 0) return raw;
    const now = Date.now();
    sessionStorage.setItem(START_KEY, String(now));
    return now;
  } catch {
    return Date.now();
  }
}

function localClock(): { hour: number; minute: number; text: string } {
  try {
    const parts = TIME_FMT.formatToParts(new Date());
    const hour = Number(parts.find((p) => p.type === 'hour')?.value);
    const minute = Number(parts.find((p) => p.type === 'minute')?.value);
    if (!Number.isFinite(hour) || !Number.isFinite(minute)) throw new Error('bad parts');
    return {
      hour,
      minute,
      text: `${String(hour).padStart(2, '0')}:${String(minute).padStart(2, '0')}`,
    };
  } catch {
    const now = new Date();
    return {
      hour: now.getHours(),
      minute: now.getMinutes(),
      text: `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}`,
    };
  }
}

function isBirthday(): boolean {
  try {
    const parts = DATE_FMT.formatToParts(new Date());
    const month = Number(parts.find((p) => p.type === 'month')?.value);
    const day = Number(parts.find((p) => p.type === 'day')?.value);
    return month === BIRTHDAY.getUTCMonth() + 1 && day === BIRTHDAY.getUTCDate();
  } catch {
    return false;
  }
}

function readPools(el: HTMLElement): LinePools {
  try {
    const parsed = JSON.parse(el.dataset.moodLines ?? '{}') as LinePools;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

function render(el: HTMLElement, pools: LinePools, animateChange: boolean): void {
  const weather = getCachedWeather();
  const { hour } = localClock();
  const phase = phaseForHour(hour);

  currentPhase = phase;
  document.documentElement.dataset.moodPhase = phase;

  const key = resolveMoodKey({
    phase,
    weather: weather?.bucket ?? null,
    visits,
    dwellMs: Date.now() - sessionStart,
    idleMs: Date.now() - lastActivity,
    birthday: isBirthday(),
    settled: Date.now() - sessionStart >= GREETING_MS,
  });

  const next = pickLine(pools[key] ?? pools[phase] ?? [], visits, phase);
  if (!next) return;

  currentLine = next;
  if (el.textContent === next) return;

  el.textContent = next;
  if (!animateChange || prefersReducedMotion()) return;
  animate(
    el,
    { opacity: [0.35, 1], transform: ['translateY(-2px)', 'translateY(0)'] },
    { duration: 0.36, ease: EASE.snappy },
  );
}

function refresh(animateChange = true): void {
  if (!activeEl?.isConnected) return;
  render(activeEl, activePools, animateChange);
}

function bindDocumentListeners(): void {
  if (listenersBound) return;
  listenersBound = true;

  const mark = () => {
    lastActivity = Date.now();
  };

  for (const type of ['pointerdown', 'pointermove', 'keydown', 'wheel', 'touchstart'] as const) {
    document.addEventListener(type, mark, { passive: true });
  }
  window.addEventListener('scroll', mark, { passive: true });

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) return;
    lastActivity = Date.now();
    refresh();
  });
}

function initMood(): void {
  const el = document.getElementById('status-line');
  if (!el) return;
  if (interval !== null) clearInterval(interval);

  visits = getVisit().count;
  sessionStart = readSessionStart();
  bindDocumentListeners();

  activeEl = el;
  activePools = readPools(el);
  refresh(false);

  if (!getCachedWeather()) {
    void loadWeather().then(() => refresh());
  }

  interval = window.setInterval(() => {
    if (document.hidden) return;
    refresh();
  }, TICK_MS);
}

export interface MoodSnapshot {
  phase: MoodPhase;
  time: string;
  timeZone: string;
  weather: WeatherSnapshot | null;
  visits: number;
  dwellMs: number;
  line: string;
}

export function moodSnapshot(): MoodSnapshot {
  return {
    phase: currentPhase,
    time: localClock().text,
    timeZone: LOCATION.timeZone,
    weather: getCachedWeather(),
    visits,
    dwellMs: Date.now() - sessionStart,
    line: currentLine,
  };
}

export function weatherLabel(bucket: WeatherBucket): string | null {
  try {
    const raw = document.getElementById('status-clock')?.dataset.weatherLabels;
    const labels = JSON.parse(raw ?? '{}') as Partial<Record<WeatherBucket, string>>;
    return labels[bucket] ?? null;
  } catch {
    return null;
  }
}

export function formatDwell(ms: number): string {
  const minutes = Math.floor(ms / 60_000);
  if (minutes < 1) return '<1m';
  if (minutes < 60) return `${minutes}m`;
  return `${Math.floor(minutes / 60)}h ${minutes % 60}m`;
}

onPageReady(initMood);
