import { onPageReady } from '../animations';
import { readStoredTheme, setTheme } from './theme';
import { getThemeDef, isTheme, type Theme } from '../theme/config';

function currentTheme(): Theme {
  const applied = document.documentElement.dataset.theme ?? null;
  return isTheme(applied) ? applied : readStoredTheme();
}

function sync(theme: Theme): void {
  const trigger = document.getElementById('theme-trigger');
  if (trigger) {
    const base = trigger.dataset.labelBase ?? '';
    trigger.setAttribute('aria-label', `${base}: ${getThemeDef(theme).label}`);
  }

  for (const card of document.querySelectorAll<HTMLElement>('.theme-card')) {
    card.setAttribute('aria-pressed', card.dataset.themeCode === theme ? 'true' : 'false');
  }
}

function moveFocus(grid: HTMLElement, from: HTMLElement, step: number): void {
  const cards = Array.from(grid.querySelectorAll<HTMLElement>('.theme-card'));
  const index = cards.indexOf(from);
  if (index === -1) return;
  cards[(index + step + cards.length) % cards.length].focus();
}

function initThemePicker(): void {
  const grid = document.getElementById('theme-grid');
  if (!grid) return;

  sync(currentTheme());

  if (grid.dataset.bound === 'true') return;
  grid.dataset.bound = 'true';

  grid.addEventListener('click', (e) => {
    const card = (e.target as HTMLElement | null)?.closest<HTMLElement>('.theme-card');
    const code = card?.dataset.themeCode ?? null;
    if (!isTheme(code)) return;
    setTheme(code);
  });

  grid.addEventListener('keydown', (e) => {
    const card = (e.target as HTMLElement | null)?.closest<HTMLElement>('.theme-card');
    if (!card) return;

    const cards = grid.querySelectorAll<HTMLElement>('.theme-card');

    switch (e.key) {
      case 'ArrowRight':
      case 'ArrowDown':
        e.preventDefault();
        moveFocus(grid, card, 1);
        break;
      case 'ArrowLeft':
      case 'ArrowUp':
        e.preventDefault();
        moveFocus(grid, card, -1);
        break;
      case 'Home':
        e.preventDefault();
        cards[0]?.focus();
        break;
      case 'End':
        e.preventDefault();
        cards[cards.length - 1]?.focus();
        break;
    }
  });
}

document.addEventListener('themechange', () => sync(currentTheme()));

onPageReady(initThemePicker);
