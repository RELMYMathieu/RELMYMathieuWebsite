import { makeDraggable } from './draggable';
import { lockScroll as lock, unlockScroll as unlock } from './scroll-lock';
import { morph, onPageReady, EASE, getWindowAnimProfile } from '../animations';

type WindowState = 'normal' | 'fullscreen' | 'minimized';

interface WinEntry {
  el: HTMLElement;
  trigger: HTMLButtonElement;
  backdrop: HTMLElement;
  state: WindowState;
  activeMorph: { stop(): void }[] | null;
}

const Z_BASE = 100;
const STAGGER = 24;

const isMobile = () => window.matchMedia('(max-width: 560px)').matches;

const windows = new Map<HTMLElement, WinEntry>();
let focused: HTMLElement | null = null;
let nextZ = Z_BASE;
let activeBackdrop: HTMLElement | null = null;
let documentListenersBound = false;

function getFocusable(el: HTMLElement): HTMLElement[] {
  return Array.from(
    el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  );
}

const lockScroll = () => lock('windows');
const unlockScroll = () => unlock('windows');

function pruneDetached() {
  for (const [el] of windows) {
    if (!el.isConnected) windows.delete(el);
  }
  if (focused && !focused.isConnected) focused = null;
  if (activeBackdrop && !activeBackdrop.isConnected) activeBackdrop = null;
  if (!windows.size) unlockScroll();
}

function syncFocusChrome() {
  if (!activeBackdrop) return;
  const lit = focused !== null;
  activeBackdrop.classList.toggle('is-open', lit);
  if (lit) lockScroll();
  else unlockScroll();
  for (const [el] of windows) el.classList.toggle('is-focused', el === focused);
}

function syncIcon(win: HTMLElement, state: WindowState) {
  const btn = win.querySelector<HTMLButtonElement>('[data-action="fullscreen"]');
  if (btn) btn.textContent = state === 'fullscreen' ? '[▪]' : '[□]';
}

function focus(win: HTMLElement) {
  if (focused === win) return;
  focused = win;
  nextZ += 1;
  win.style.zIndex = String(nextZ);
  syncFocusChrome();
}

function unfocus() {
  if (!focused) return;
  focused = null;
  syncFocusChrome();
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

function stopActiveMorph(win: HTMLElement, entry: WinEntry): void {
  if (!entry.activeMorph) return;
  for (const anim of entry.activeMorph) anim.stop();
  entry.activeMorph = null;
  const titlebar = win.querySelector<HTMLElement>('.ww-titlebar');
  clearMorphStyles(win, ...(titlebar ? [titlebar] : []));
}

function applyState(win: HTMLElement, next: WindowState) {
  const entry = windows.get(win);
  if (!entry) return;

  stopActiveMorph(win, entry);
  win.classList.remove('is-opening');
  const titlebar = win.querySelector<HTMLElement>('.ww-titlebar')!;
  const from = win.getBoundingClientRect();

  win.classList.remove('is-fullscreen', 'is-minimized');
  entry.state = next;
  if (next === 'fullscreen') win.classList.add('is-fullscreen');
  if (next === 'minimized') win.classList.add('is-minimized');

  reflowMinimized();
  syncIcon(win, next);
  if (next !== 'minimized') {
    focus(win);
  } else {
    if (focused === win) focused = topmostVisible();
    syncFocusChrome();
  }

  const to = win.getBoundingClientRect();
  const profile = getWindowAnimProfile();
  const ease = next === 'minimized' ? EASE[profile.minimizeEase] : EASE[profile.morphEase];
  const duration = next === 'minimized' ? profile.minimizeDuration : profile.morphDuration;

  const result = morph(win, from, to, { duration, ease, counterScale: [titlebar] });
  if (!result) return;
  entry.activeMorph = [result.parent, ...result.counterAnims];
  Promise.all([result.parent, ...result.counterAnims]).finally(() => {
    if (entry.activeMorph) {
      entry.activeMorph = null;
      clearMorphStyles(win, titlebar);
    }
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
  syncFocusChrome();
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
    win.style.left = `calc(50vw + ${offset}px)`;
    win.style.top = `calc(50% + ${offset}px)`;
    win.style.translate = '-50% -50%';
    win.style.transform = '';
    win.offsetHeight;
    win.style.transition = '';
  }

  windows.set(win, { el: win, trigger, backdrop, state: 'normal', activeMorph: null });
  win.classList.remove('is-fullscreen', 'is-minimized');
  win.classList.add('is-open');
  win.setAttribute('aria-hidden', 'false');
  syncIcon(win, 'normal');
  focus(win);

  if (!isMobile()) {
    win.classList.remove('is-opening');
    win.offsetHeight;
    win.classList.add('is-opening');
    let guard = 0;
    const done = (e?: AnimationEvent) => {
      if (e && e.target !== win) return;
      window.clearTimeout(guard);
      win.removeEventListener('animationend', done);
      win.classList.remove('is-opening');
    };
    win.addEventListener('animationend', done);
    guard = window.setTimeout(done, 1000);
  }

  const focusable = getFocusable(win);
  (focusable[0] ?? win).focus();
}

function bindDocumentListeners() {
  if (documentListenersBound) return;
  documentListenersBound = true;

  document.addEventListener('keydown', (e) => {
    const target = focused ?? topmostVisible();
    if (!target) return;
    const entry = windows.get(target);
    if (!entry) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      if (entry.state === 'fullscreen') applyState(target, 'normal');
      else close(target);
      return;
    }

    if (!focused || entry.state === 'minimized' || e.key !== 'Tab') return;

    const focusable = getFocusable(target);
    if (!focusable.length) {
      e.preventDefault();
      target.focus();
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

export function initWindowManager(): void {
  pruneDetached();

  const triggers = document.querySelectorAll<HTMLButtonElement>('button[data-ww-trigger]');
  if (!triggers.length) return;

  const backdrop = document.getElementById('ww-backdrop');
  if (!backdrop) return;
  activeBackdrop = backdrop;

  if (backdrop.dataset.wwBound !== '1') {
    backdrop.dataset.wwBound = '1';
    backdrop.addEventListener('click', () => {
      if (isMobile()) {
        const target = focused ?? topmostVisible();
        if (target) close(target);
      } else {
        unfocus();
      }
    });
  }

  triggers.forEach((trigger) => {
    if (trigger.dataset.wwBound === '1') return;
    trigger.dataset.wwBound = '1';

    const targetId = trigger.getAttribute('aria-controls');
    if (!targetId) return;
    const win = document.getElementById(targetId);
    if (!win) return;

    const handle = win.querySelector<HTMLElement>('[data-drag-handle]')!;
    makeDraggable(
      win,
      handle,
      () => !isMobile() && windows.get(win)?.state !== 'minimized',
      () => {
        const entry = windows.get(win);
        if (entry?.state !== 'fullscreen') return;
        stopActiveMorph(win, entry);
        win.classList.remove('is-fullscreen');
        entry.state = 'normal';
        syncIcon(win, 'normal');
      },
    );

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

    handle.addEventListener('dblclick', (e) => {
      if (isMobile()) return;
      if ((e.target as HTMLElement).closest('[data-action]')) return;
      const entry = windows.get(win);
      if (!entry || entry.state === 'minimized') return;
      applyState(win, entry.state === 'fullscreen' ? 'normal' : 'fullscreen');
    });
  });

  bindDocumentListeners();
}

onPageReady(initWindowManager);
