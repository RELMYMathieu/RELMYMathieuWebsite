import { makeDraggable } from './draggable';
import { morph, onPageReady, EASE } from '../animations';

type WindowState = 'normal' | 'fullscreen' | 'minimized';

interface WinEntry {
  el: HTMLElement;
  trigger: HTMLButtonElement;
  backdrop: HTMLElement;
  state: WindowState;
}

const DESKTOP_OPEN_TOP = '20vh';
const Z_BASE = 100;
const STAGGER = 24;

const isMobile = () => window.matchMedia('(max-width: 560px)').matches;

const windows = new Map<HTMLElement, WinEntry>();
let focused: HTMLElement | null = null;
let nextZ = Z_BASE;
let documentListenersBound = false;

function getFocusable(el: HTMLElement): HTMLElement[] {
  return Array.from(
    el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function lockScroll() {
  if (document.body.style.overflow === 'hidden') return;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  if (gap > 0) document.body.style.paddingRight = gap + 'px';
  document.body.style.overflow = 'hidden';
}

function unlockScroll() {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}

function anyVisible(): boolean {
  for (const e of windows.values()) if (e.state !== 'minimized') return true;
  return false;
}

function syncBackdrop(backdrop: HTMLElement) {
  const visible = anyVisible();
  backdrop.classList.toggle('is-open', visible);
  visible ? lockScroll() : unlockScroll();
}

function syncIcon(win: HTMLElement, state: WindowState) {
  const btn = win.querySelector<HTMLButtonElement>('[data-action="fullscreen"]');
  if (btn) btn.textContent = state === 'fullscreen' ? '[▪]' : '[□]';
}

function focus(win: HTMLElement) {
  focused = win;
  nextZ += 1;
  win.style.zIndex = String(nextZ);
}

function topmostVisible(): HTMLElement | null {
  let best: HTMLElement | null = null;
  let bestZ = -Infinity;
  for (const [el, entry] of windows) {
    if (entry.state === 'minimized') continue;
    const z = parseInt(el.style.zIndex || '0', 10);
    if (z > bestZ) { bestZ = z; best = el; }
  }
  return best;
}

function reflowMinimized() {
  const slotW = Math.min(320, window.innerWidth - 32) + 8;
  let i = 0;
  for (const [el, entry] of windows) {
    if (entry.state !== 'minimized') continue;
    el.style.setProperty('--ww-min-x', `calc(1rem + ${i * slotW}px)`);
    i++;
  }
}

function clearMorphStyles(el: HTMLElement, ...children: HTMLElement[]) {
  el.style.transform = '';
  el.style.transformOrigin = '';
  for (const child of children) {
    child.style.transform = '';
    child.style.transformOrigin = '';
  }
}

function applyState(win: HTMLElement, next: WindowState) {
  const entry = windows.get(win);
  if (!entry) return;

  win.classList.remove('is-opening');
  const titlebar = win.querySelector<HTMLElement>('.ww-titlebar')!;
  const from = win.getBoundingClientRect();

  win.classList.remove('is-fullscreen', 'is-minimized');
  entry.state = next;
  if (next === 'fullscreen') win.classList.add('is-fullscreen');
  if (next === 'minimized') win.classList.add('is-minimized');

  reflowMinimized();
  syncBackdrop(entry.backdrop);
  syncIcon(win, next);
  if (next !== 'minimized') focus(win);
  else if (focused === win) focused = topmostVisible();

  const to = win.getBoundingClientRect();
  const ease = (next === 'minimized' ? EASE.snappy : EASE.bouncy) as unknown as number[];
  const duration = next === 'minimized' ? 0.28 : 0.36;

  const result = morph(win, from, to, { duration, ease, counterScale: [titlebar] });
  if (!result) return;
  Promise.all([result.parent, ...result.counterAnims]).finally(() => {
    clearMorphStyles(win, titlebar);
  });
}

function close(win: HTMLElement) {
  const entry = windows.get(win);
  if (!entry) return;

  win.classList.remove('is-open');
  win.setAttribute('aria-hidden', 'true');
  entry.trigger.focus({ preventScroll: true });

  setTimeout(() => {
    win.classList.remove('is-fullscreen', 'is-minimized');
    win.style.left = '';
    win.style.top = '';
    win.style.translate = '';
    win.style.transform = '';
    win.style.zIndex = '';
    win.style.removeProperty('--ww-min-x');
  }, 220);

  windows.delete(win);
  if (focused === win) focused = topmostVisible();
  reflowMinimized();
  syncBackdrop(entry.backdrop);
}

function handleAction(win: HTMLElement, action: string) {
  if (action === 'close') return close(win);
  const entry = windows.get(win);
  if (!entry) return;
  if (action === 'minimize') return applyState(win, entry.state === 'minimized' ? 'normal' : 'minimized');
  if (action === 'fullscreen') return applyState(win, entry.state === 'fullscreen' ? 'normal' : 'fullscreen');
}

function visibleCount(): number {
  let n = 0;
  for (const e of windows.values()) if (e.state !== 'minimized') n++;
  return n;
}

function open(win: HTMLElement, trigger: HTMLButtonElement, backdrop: HTMLElement) {
  const existing = windows.get(win);
  if (existing) {
    if (existing.state === 'minimized') applyState(win, 'normal');
    else focus(win);
    return;
  }

  if (!isMobile()) {
    const offset = visibleCount() * STAGGER;
    win.style.transition = 'none';
    win.style.left = `calc(50% + ${offset}px)`;
    win.style.top = `calc(${DESKTOP_OPEN_TOP} + ${offset}px)`;
    win.style.translate = '-50% 0';
    win.style.transform = '';
    win.offsetHeight;
    win.style.transition = '';
  }

  windows.set(win, { el: win, trigger, backdrop, state: 'normal' });
  win.classList.remove('is-fullscreen', 'is-minimized');
  win.classList.add('is-open');
  win.setAttribute('aria-hidden', 'false');
  syncBackdrop(backdrop);
  syncIcon(win, 'normal');
  focus(win);

  if (!isMobile()) {
    win.classList.remove('is-opening');
    win.offsetHeight;
    win.classList.add('is-opening');
    window.setTimeout(() => win.classList.remove('is-opening'), 520);
  }

  const focusable = getFocusable(win);
  (focusable[0] ?? win).focus();
}

function bindDocumentListeners() {
  if (documentListenersBound) return;
  documentListenersBound = true;

  document.addEventListener('keydown', (e) => {
    if (!focused) return;
    const entry = windows.get(focused);
    if (!entry) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      if (entry.state === 'fullscreen') applyState(focused, 'normal');
      else close(focused);
      return;
    }

    if (entry.state === 'minimized' || e.key !== 'Tab') return;

    const focusable = getFocusable(focused);
    if (!focusable.length) {
      e.preventDefault();
      focused.focus();
      return;
    }

    const first = focusable[0];
    const last = focusable[focusable.length - 1];

    if (e.shiftKey && document.activeElement === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && document.activeElement === last) {
      e.preventDefault();
      first.focus();
    }
  });

  window.addEventListener('resize', reflowMinimized);
}

export function initWorkWindows(): void {
  const triggers = document.querySelectorAll<HTMLButtonElement>('button[data-work]');
  if (!triggers.length) return;

  const backdrop = document.getElementById('ww-backdrop');
  if (!backdrop) return;

  if (backdrop.dataset.wwBound !== '1') {
    backdrop.dataset.wwBound = '1';
    backdrop.addEventListener('click', () => {
      if (focused) close(focused);
    });
  }

  triggers.forEach((trigger) => {
    if (trigger.dataset.wwBound === '1') return;
    trigger.dataset.wwBound = '1';

    const workId = trigger.dataset.work!;
    const win = document.getElementById(`ww-${workId}`);
    if (!win) return;

    const handle = win.querySelector<HTMLElement>('[data-drag-handle]')!;
    makeDraggable(win, handle, () => !isMobile() && windows.get(win)?.state === 'normal');

    trigger.addEventListener('click', () => open(win, trigger, backdrop));

    win.addEventListener('mousedown', () => {
      const entry = windows.get(win);
      if (entry && entry.state !== 'minimized') focus(win);
    });

    win.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
      if (btn) handleAction(win, btn.dataset.action!);
    });

    handle.addEventListener('click', (e) => {
      const entry = windows.get(win);
      if (!entry || entry.state !== 'minimized') return;
      if ((e.target as HTMLElement).closest('[data-action]')) return;
      applyState(win, 'normal');
    });
  });

  bindDocumentListeners();
}

onPageReady(initWorkWindows);
