import { makeDraggable } from './draggable';

type WindowState = 'normal' | 'fullscreen' | 'minimized';
type FlipMode = 'standard' | 'fullscreen' | 'minimize' | 'restore';

const DESKTOP_OPEN_TOP = '15vh';
const EASE_OUT_QUART = 'cubic-bezier(0.25, 1, 0.5, 1)';
const EASE_OUT_EXPO = 'cubic-bezier(0.16, 1, 0.3, 1)';

const isMobile = () => window.matchMedia('(max-width: 560px)').matches;
const prefersReducedMotion = () => window.matchMedia('(prefers-reduced-motion: reduce)').matches;

function getFocusable(el: HTMLElement): HTMLElement[] {
  return Array.from(
    el.querySelectorAll<HTMLElement>(
      'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])',
    ),
  );
}

function lockScroll() {
  const gap = window.innerWidth - document.documentElement.clientWidth;
  if (gap > 0) document.body.style.paddingRight = gap + 'px';
  document.body.style.overflow = 'hidden';
}

function unlockScroll() {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}

function lerp(a: number, b: number, t: number) {
  return a + (b - a) * t;
}

function suppressTransitions(el: HTMLElement) {
  el.style.transition = 'none';
  el.offsetHeight;
}

function restoreTransitions(el: HTMLElement) {
  el.style.transition = '';
}

function flipAnimate(win: HTMLElement, from: DOMRect, mode: FlipMode = 'standard') {
  if (prefersReducedMotion()) return;

  suppressTransitions(win);
  const to = win.getBoundingClientRect();

  if (!from.width || !to.width) {
    restoreTransitions(win);
    return;
  }

  const dx = from.left - to.left;
  const dy = from.top - to.top;
  const sx = from.width / to.width;
  const sy = from.height / to.height;

  const origin = 'top left';
  const duration =
    mode === 'fullscreen' ? 480 : mode === 'minimize' ? 340 : mode === 'restore' ? 360 : 350;
  const easing = mode === 'minimize' ? EASE_OUT_QUART : EASE_OUT_EXPO;

  const keyframes: Keyframe[] = mode === 'fullscreen'
    ? [
        {
          transformOrigin: origin,
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
          boxShadow: '4px 4px 0 rgba(0, 0, 0, 0.15)',
          opacity: 1,
        },
        {
          transformOrigin: origin,
          transform: `translate(${dx * 0.22}px, ${dy * 0.22}px) scale(${lerp(sx, 1, 0.82)}, ${lerp(sy, 1, 0.82)})`,
          boxShadow: '0 0 60px 12px rgba(120, 120, 120, 0.1)',
          opacity: 0.96,
          offset: 0.62,
        },
        {
          transformOrigin: origin,
          transform: 'none',
          boxShadow: 'none',
          opacity: 1,
        },
      ]
    : mode === 'minimize'
      ? [
          {
            transformOrigin: origin,
            transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
            opacity: 1,
          },
          {
            transformOrigin: origin,
            transform: `translate(${dx * 0.36}px, ${dy * 0.72}px) scale(${lerp(sx, 1, 0.68)}, ${lerp(sy, 1, 0.52)})`,
            opacity: 0.97,
            offset: 0.56,
          },
          {
            transformOrigin: origin,
            transform: 'none',
            opacity: 1,
          },
        ]
      : mode === 'restore'
        ? [
            {
              transformOrigin: origin,
              transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
              opacity: 0.94,
            },
            {
              transformOrigin: origin,
              transform: `translate(${dx * 0.2}px, ${dy * 0.2}px) scale(${lerp(sx, 1, 0.86)}, ${lerp(sy, 1, 0.86)})`,
              opacity: 1,
              offset: 0.7,
            },
            {
              transformOrigin: origin,
              transform: 'none',
              opacity: 1,
            },
          ]
        : [
        {
          transformOrigin: origin,
          transform: `translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`,
        },
        {
          transformOrigin: origin,
          transform: 'none',
        },
          ];

  win.style.willChange = 'transform, opacity';
  const animation = win.animate(keyframes, { duration, easing });
  const cleanup = () => {
    win.style.willChange = '';
    restoreTransitions(win);
  };

  animation.addEventListener('finish', cleanup, { once: true });
  animation.addEventListener('cancel', cleanup, { once: true });
}

export function initWorkWindows(): void {
  const triggers = document.querySelectorAll<HTMLButtonElement>('button[data-work]');
  if (!triggers.length) return;

  if ((window as any).__wwBound) return;
  (window as any).__wwBound = true;

  const backdrop = document.getElementById('ww-backdrop')!;
  let activeWindow: HTMLElement | null = null;
  let activeTrigger: HTMLButtonElement | null = null;
  let state: WindowState = 'normal';

  function clearState(win: HTMLElement) {
    win.classList.remove('is-fullscreen', 'is-minimized');
  }

  function syncIcon(win: HTMLElement) {
    const btn = win.querySelector<HTMLButtonElement>('[data-action="fullscreen"]');
    if (btn) btn.textContent = state === 'fullscreen' ? '[▪]' : '[□]';
  }

  function applyState(next: WindowState) {
    if (!activeWindow) return;

    const previousState = state;
    const first = activeWindow.getBoundingClientRect();
    const mode: FlipMode =
      next === 'fullscreen'
        ? 'fullscreen'
        : next === 'minimized'
          ? 'minimize'
          : previousState === 'minimized'
            ? 'restore'
            : 'standard';

    clearState(activeWindow);
    state = next;

    if (next === 'fullscreen') activeWindow.classList.add('is-fullscreen');
    if (next === 'minimized') activeWindow.classList.add('is-minimized');

    const showBackdrop = next !== 'minimized';
    backdrop.classList.toggle('is-open', showBackdrop);
    showBackdrop ? lockScroll() : unlockScroll();
    syncIcon(activeWindow);

    flipAnimate(activeWindow, first, mode);
  }

  function close() {
    if (!activeWindow || !activeTrigger) return;
    const win = activeWindow;

    win.classList.remove('is-open');
    win.setAttribute('aria-hidden', 'true');
    backdrop.classList.remove('is-open');
    unlockScroll();
    activeTrigger.focus({ preventScroll: true });

    setTimeout(() => {
      win.classList.remove('is-fullscreen', 'is-minimized');
      win.style.left = '';
      win.style.top = '';
      win.style.translate = '';
      win.style.transform = '';
    }, 220);

    state = 'normal';
    activeWindow = null;
    activeTrigger = null;
  }

  function handleAction(action: string) {
    if (action === 'close') return close();
    if (action === 'minimize') return applyState(state === 'minimized' ? 'normal' : 'minimized');
    if (action === 'fullscreen') return applyState(state === 'fullscreen' ? 'normal' : 'fullscreen');
  }

  function open(win: HTMLElement, trigger: HTMLButtonElement) {
    if (activeWindow && activeWindow !== win) close();

    if (!isMobile()) {
      win.style.transition = 'none';
      win.style.left = '50%';
      win.style.top = DESKTOP_OPEN_TOP;
      win.style.translate = '-50% 0';
      win.style.transform = '';
      win.offsetHeight;
      win.style.transition = '';
    }

    activeWindow = win;
    activeTrigger = trigger;
    state = 'normal';
    clearState(win);
    win.classList.add('is-open');
    win.setAttribute('aria-hidden', 'false');
    backdrop.classList.add('is-open');
    lockScroll();
    syncIcon(win);

    if (!isMobile() && !prefersReducedMotion()) {
      win.classList.remove('is-opening');
      win.offsetHeight;
      win.classList.add('is-opening');
      window.setTimeout(() => win.classList.remove('is-opening'), 520);
    }

    const focusable = getFocusable(win);
    (focusable[0] ?? win).focus();
  }

  triggers.forEach((trigger) => {
    const workId = trigger.dataset.work!;
    const win = document.getElementById(`ww-${workId}`);
    if (!win) return;

    const handle = win.querySelector<HTMLElement>('[data-drag-handle]')!;
    makeDraggable(win, handle, () => !isMobile() && state === 'normal');

    trigger.addEventListener('click', () => open(win, trigger));

    win.addEventListener('click', (e) => {
      const btn = (e.target as HTMLElement).closest<HTMLButtonElement>('[data-action]');
      if (btn) handleAction(btn.dataset.action!);
    });

    handle.addEventListener('click', (e) => {
      if (state !== 'minimized') return;
      if ((e.target as HTMLElement).closest('[data-action]')) return;
      applyState('normal');
    });
  });

  backdrop.addEventListener('click', close);

  document.addEventListener('keydown', (e) => {
    if (!activeWindow) return;

    if (e.key === 'Escape') {
      e.preventDefault();
      state === 'fullscreen' ? applyState('normal') : close();
      return;
    }

    if (state === 'minimized' || e.key !== 'Tab') return;

    const focusable = getFocusable(activeWindow);
    if (!focusable.length) {
      e.preventDefault();
      activeWindow.focus();
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
}
