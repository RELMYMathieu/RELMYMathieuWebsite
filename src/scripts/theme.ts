import { onPageReady } from '../animations';

function initThemeToggle(): void {
  const btn = document.getElementById('theme-toggle');
  if (!btn) return;
  const isDark = () => document.documentElement.classList.contains('dark');
  const sync = () => {
    const dark = isDark();
    btn.textContent = dark ? '☀' : '☾';
    btn.setAttribute('aria-pressed', String(dark));
  };
  sync();
  if (btn.dataset.bound === 'true') return;
  btn.dataset.bound = 'true';
  btn.addEventListener('click', () => {
    const dark = document.documentElement.classList.toggle('dark');
    localStorage.setItem('theme', dark ? 'dark' : 'light');
    sync();
  });
}

onPageReady(initThemeToggle);
