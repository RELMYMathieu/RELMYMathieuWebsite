import { animate } from 'motion/mini';
import { onPageReady, prefersReducedMotion, EASE } from '../animations';
import { LOCATION } from '../config/location';
import { bindNavMenu } from './nav-menu';
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

function part(className: string, text: string): HTMLElement {
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  return el;
}

function renderMenu(menu: HTMLElement, labels: Labels, time: string): void {
  const weather = getCachedWeather();
  menu.replaceChildren();
  menu.appendChild(part('clock-city', LOCATION.city));
  menu.appendChild(part('clock-time', `${time} ${LOCATION.timeZone}`));
  if (!weather) return;
  const label = labels[weather.bucket] ?? weather.bucket;
  menu.appendChild(part('clock-weather', `${weather.glyph} ${label} · ${weather.temperature}°`));
}

function render(el: HTMLElement, labels: Labels, animateChange = true): void {
  const trigger = el.querySelector<HTMLElement>('.nav-clock__trigger');
  const menu = el.querySelector<HTMLElement>('.nav-clock__menu');
  if (!trigger || !menu) return;

  const weather = getCachedWeather();
  const time = FORMAT.format(new Date());
  const suffix = weather ? ` ${weather.glyph} ${weather.temperature}°` : '';
  const next = `[${LOCATION.city} ${time}${suffix}]`;
  if (trigger.textContent === next) return;

  const nodes: (string | Node)[] = ['[', part('nav-clock__city', `${LOCATION.city} `), time];
  if (suffix) nodes.push(part('nav-clock__weather', suffix));
  nodes.push(']');
  trigger.replaceChildren(...nodes);
  renderMenu(menu, labels, time);

  if (!animateChange || prefersReducedMotion()) return;
  animate(
    trigger,
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

  let ticker: number | null = null;
  bindNavMenu(el, {
    onOpen: () => {
      const menu = el.querySelector<HTMLElement>('.nav-clock__menu');
      if (menu) renderMenu(menu, labels, FORMAT.format(new Date()));
      if (ticker !== null) return;
      ticker = window.setInterval(() => {
        const open = el.querySelector<HTMLElement>('.nav-clock__menu');
        if (open) renderMenu(open, labels, FORMAT.format(new Date()));
      }, 1000);
    },
    onClose: () => {
      if (ticker === null) return;
      clearInterval(ticker);
      ticker = null;
    },
  });

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
