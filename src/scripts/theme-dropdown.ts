import { onPageReady } from '../animations';
import { createDropdown } from './dropdown';
import { readStoredTheme, setTheme } from './theme';
import { isTheme, type Theme } from '../theme/config';

function markActive(menu: HTMLElement, toggle: HTMLElement, theme: Theme): void {
  for (const option of menu.querySelectorAll<HTMLElement>('.theme-option')) {
    const active = option.dataset.themeCode === theme;
    option.classList.toggle('dropdown-option--active', active);
    option.setAttribute('aria-checked', active ? 'true' : 'false');
    if (active) {
      const base = toggle.dataset.labelBase ?? '';
      toggle.setAttribute('aria-label', `${base}: ${option.textContent?.trim() ?? theme}`);
    }
  }
}

function initThemeDropdown(): void {
  const toggle = document.getElementById('theme-toggle');
  const menu = document.getElementById('theme-menu');
  if (!toggle || !menu) return;

  createDropdown({ toggle, menu, itemSelector: 'button' });
  markActive(menu, toggle, readStoredTheme());

  if (menu.dataset.bound === 'true') return;
  menu.dataset.bound = 'true';

  toggle.addEventListener('click', () => markActive(menu, toggle, readStoredTheme()));

  menu.addEventListener('click', (e) => {
    const option = (e.target as HTMLElement | null)?.closest<HTMLElement>('.theme-option');
    const code = option?.dataset.themeCode ?? null;
    if (!isTheme(code)) return;
    setTheme(code);
    markActive(menu, toggle, code);
  });
}

onPageReady(initThemeDropdown);
