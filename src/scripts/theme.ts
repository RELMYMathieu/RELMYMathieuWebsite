import { DEFAULT_THEME, THEME_STORAGE_KEY, isTheme, type Theme } from '../theme/config';

export function readStoredTheme(): Theme {
  try {
    const stored = localStorage.getItem(THEME_STORAGE_KEY);
    return isTheme(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

export function applyTheme(theme: Theme): void {
  document.documentElement.dataset.theme = theme;
}

function forceStyleRecalc(el: HTMLElement): void {
  void el.offsetHeight;
}

export function setTheme(theme: Theme): void {
  const root = document.documentElement;

  root.classList.add('theme-switching');
  applyTheme(theme);
  forceStyleRecalc(root);
  root.classList.remove('theme-switching');

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

document.addEventListener('astro:after-swap', () => applyTheme(readStoredTheme()));
