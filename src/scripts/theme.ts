import { DEFAULT_THEME, THEME_STORAGE_KEY, isTheme, type Theme } from '../theme/config';
import { prefersReducedMotion } from '../animations/runtime';

const FADE_MS = 320;

let fadeTimer: number | null = null;

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

export function setTheme(theme: Theme): void {
  const root = document.documentElement;

  if (!prefersReducedMotion()) {
    root.classList.add('theme-transition');
    if (fadeTimer !== null) clearTimeout(fadeTimer);
    fadeTimer = window.setTimeout(() => {
      root.classList.remove('theme-transition');
      fadeTimer = null;
    }, FADE_MS + 200);
  }

  applyTheme(theme);

  try {
    localStorage.setItem(THEME_STORAGE_KEY, theme);
  } catch {}
}

document.addEventListener('astro:after-swap', () => applyTheme(readStoredTheme()));
