import { onPageReady, prefersReducedMotion } from '../animations';
import { formatLogin } from './last-login';
import { getVisit } from './visit';

const STEP_MS = 200;
const HOLD_MS = 700;
const OK_TAG = /^(\[ )(OK)( \])(.*)$/;

let booted = false;

function appendLine(linesEl: HTMLElement, text: string): void {
  const line = document.createElement('div');
  const match = text.match(OK_TAG);
  if (match) {
    const okSpan = document.createElement('span');
    okSpan.className = 'boot-ok';
    okSpan.textContent = match[2];
    line.append(match[1], okSpan, match[3], match[4]);
  } else {
    line.textContent = text;
  }
  linesEl.appendChild(line);
}

function finish(screen: HTMLElement): void {
  booted = true;
  document.documentElement.dataset.booted = '1';
  screen.remove();
  document.dispatchEvent(new CustomEvent('site:booted'));
}

document.addEventListener('astro:after-swap', () => {
  if (!booted) return;
  document.documentElement.dataset.booted = '1';
  document.getElementById('boot-screen')?.remove();
});

function initBoot(): void {
  const screen = document.getElementById('boot-screen');
  if (!screen) return;
  if (screen.dataset.bootStarted === '1') return;
  screen.dataset.bootStarted = '1';

  if (booted) {
    document.documentElement.dataset.booted = '1';
    screen.remove();
    return;
  }

  if (prefersReducedMotion()) {
    finish(screen);
    return;
  }

  const linesEl = document.getElementById('boot-lines');
  const lines = (screen.dataset.lines ?? '').split('\n').filter(Boolean);
  if (!linesEl || lines.length === 0) {
    finish(screen);
    return;
  }

  const { previous } = getVisit();
  const loginLine =
    previous === null
      ? screen.dataset.firstLogin
      : screen.dataset.lastLogin?.replace(
          '{date}',
          formatLogin(previous, screen.dataset.loginLocale || 'en', true),
        );
  if (loginLine) lines.push(loginLine);

  let i = 0;
  const interval = window.setInterval(() => {
    if (i >= lines.length) {
      window.clearInterval(interval);
      window.setTimeout(() => finish(screen), HOLD_MS);
      return;
    }
    appendLine(linesEl, lines[i]);
    i++;
  }, STEP_MS);
}

onPageReady(initBoot);
