import { animate } from 'motion/mini';
import { onPageReady, prefersReducedMotion, EASE } from '../animations';

const FORMAT = new Intl.DateTimeFormat([], {
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
  timeZone: 'Europe/Paris',
});

let interval: number | null = null;

function tick(el: HTMLElement) {
  const next = `[Paris ${FORMAT.format(new Date())}]`;
  if (el.textContent === next) return;
  el.textContent = next;
  if (prefersReducedMotion()) return;
  animate(
    el,
    { opacity: [0.45, 1], transform: ['translateY(-2px)', 'translateY(0)'] },
    { duration: 0.32, ease: EASE.snappy as unknown as number[] },
  );
}

function initClock(): void {
  const el = document.getElementById('status-clock');
  if (!el) return;
  if (interval !== null) clearInterval(interval);
  el.textContent = `[Paris ${FORMAT.format(new Date())}]`;
  interval = window.setInterval(() => tick(el), 30_000);
}

onPageReady(initClock);
