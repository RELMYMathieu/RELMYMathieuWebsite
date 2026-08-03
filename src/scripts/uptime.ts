import { animate } from 'motion/mini';
import { onPageReady, prefersReducedMotion, EASE } from '../animations';

const MINUTE = 60_000;
const HOUR = 60 * MINUTE;
const DAY = 24 * HOUR;

function formatUptime(ms: number): string {
  if (ms < MINUTE) return '<1m';
  const days = Math.floor(ms / DAY);
  const hours = Math.floor((ms % DAY) / HOUR);
  const minutes = Math.floor((ms % HOUR) / MINUTE);
  if (days > 0) return `${days}d ${hours}h`;
  if (hours > 0) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
}

let interval: number | null = null;

function tick(el: HTMLElement, buildTime: number, label: string): void {
  const next = `[${label} ${formatUptime(Date.now() - buildTime)}]`;
  if (el.textContent === next) return;
  el.textContent = next;
  if (prefersReducedMotion()) return;
  animate(
    el,
    { opacity: [0.45, 1], transform: ['translateY(-2px)', 'translateY(0)'] },
    { duration: 0.32, ease: EASE.snappy },
  );
}

function initUptime(): void {
  const el = document.getElementById('status-uptime');
  if (!el) return;
  if (interval !== null) clearInterval(interval);

  const buildTime = new Date(el.dataset.buildTime ?? '').getTime();
  const label = el.dataset.uptimeLabel ?? 'up';
  if (!Number.isFinite(buildTime)) return;

  tick(el, buildTime, label);
  interval = window.setInterval(() => tick(el, buildTime, label), 30_000);
}

onPageReady(initUptime);
