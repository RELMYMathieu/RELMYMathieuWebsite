import { animate } from 'motion/mini';
import { onPageReady, prefersReducedMotion, EASE } from '../animations';
import { LOCATION } from '../config/location';
import { getCachedWeather, loadWeather } from './weather';
import type { WeatherBucket } from '../config/weather';

const FORMAT = new Intl.DateTimeFormat([], {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: LOCATION.timeZone,
});

type Labels = Partial<Record<WeatherBucket, string>>;

let interval: number | null = null;

function readLabels(el: HTMLElement): Labels {
  try {
    return JSON.parse(el.dataset.weatherLabels ?? '{}') as Labels;
  } catch {
    return {};
  }
}

function render(el: HTMLElement, labels: Labels, animateChange = true): void {
  const weather = getCachedWeather();
  const suffix = weather ? ` ${weather.glyph} ${weather.temperature}°` : '';
  const next = `[${LOCATION.city} ${FORMAT.format(new Date())}${suffix}]`;
  if (el.textContent === next) return;

  el.textContent = next;
  const label = weather ? labels[weather.bucket] : undefined;
  if (label) el.title = label;
  else el.removeAttribute('title');

  if (!animateChange || prefersReducedMotion()) return;
  animate(
    el,
    { opacity: [0.45, 1], transform: ['translateY(-2px)', 'translateY(0)'] },
    { duration: 0.32, ease: EASE.snappy },
  );
}

function initClock(): void {
  const el = document.getElementById('status-clock');
  if (!el) return;
  if (interval !== null) clearInterval(interval);

  const labels = readLabels(el);
  render(el, labels, false);

  if (!getCachedWeather()) {
    void loadWeather().then(() => {
      if (el.isConnected) render(el, labels);
    });
  }

  interval = window.setInterval(() => {
    if (!el.isConnected) return;
    render(el, labels);
    if (!getCachedWeather()) {
      void loadWeather().then(() => {
        if (el.isConnected) render(el, labels);
      });
    }
  }, 30_000);
}

onPageReady(initClock);
