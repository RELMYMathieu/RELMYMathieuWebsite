import { onPageReady } from '../animations';

let currentToggle: HTMLElement | null = null;
let currentMenu: HTMLElement | null = null;
let currentOptions: HTMLAnchorElement[] = [];
let documentBound = false;

function isOpen(): boolean {
  return currentMenu?.classList.contains('is-open') ?? false;
}

function focusItem(index: number) {
  const item = currentOptions[index];
  if (item) item.focus();
}

function openMenu() {
  if (!currentToggle || !currentMenu) return;
  currentMenu.classList.add('is-open');
  currentMenu.setAttribute('aria-hidden', 'false');
  currentToggle.setAttribute('aria-expanded', 'true');
}

function closeMenu() {
  if (!currentToggle || !currentMenu) return;
  currentMenu.classList.remove('is-open');
  currentMenu.setAttribute('aria-hidden', 'true');
  currentToggle.setAttribute('aria-expanded', 'false');
}

function bindDocumentListenersOnce() {
  if (documentBound) return;
  documentBound = true;

  document.addEventListener('click', (e) => {
    if (!currentMenu || !currentToggle || !isOpen()) return;
    const target = e.target as Node | null;
    if (currentToggle.contains(target) || currentMenu.contains(target)) return;
    closeMenu();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isOpen()) return;
    closeMenu();
    currentToggle?.focus();
  });
}

function initLangDropdown(): void {
  const toggle = document.getElementById('lang-toggle');
  const menu = document.getElementById('lang-menu');
  if (!toggle || !menu) return;

  currentToggle = toggle;
  currentMenu = menu;
  currentOptions = Array.from(menu.querySelectorAll<HTMLAnchorElement>('a'));

  bindDocumentListenersOnce();

  if (toggle.dataset.bound === 'true') return;
  toggle.dataset.bound = 'true';

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen()) {
      closeMenu();
    } else {
      openMenu();
      focusItem(0);
    }
  });

  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      openMenu();
      focusItem(0);
    }
  });

  menu.addEventListener('keydown', (e) => {
    const current = document.activeElement as HTMLAnchorElement | null;
    const index = current ? currentOptions.indexOf(current) : -1;

    if (e.key === 'Escape') {
      e.preventDefault();
      closeMenu();
      toggle.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem((index + 1) % currentOptions.length);
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem((index - 1 + currentOptions.length) % currentOptions.length);
    }

    if (e.key === 'Home') {
      e.preventDefault();
      focusItem(0);
    }

    if (e.key === 'End') {
      e.preventDefault();
      focusItem(currentOptions.length - 1);
    }

    if (e.key === 'Tab') {
      closeMenu();
    }
  });
}

onPageReady(initLangDropdown);
