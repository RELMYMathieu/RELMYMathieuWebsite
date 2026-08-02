import { fallIn, onceInView, onPageReady, prefersReducedMotion } from '../animations';

function bootPending(): boolean {
  return !!document.getElementById('boot-screen') && document.documentElement.dataset.booted !== '1';
}

function runFadeIns(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-fade-in]');
  const reduced = prefersReducedMotion();

  for (const el of els) {
    if (el.dataset.fadeInit === '1') continue;
    el.dataset.fadeInit = '1';

    if (reduced) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      continue;
    }

    const stagger = parseFloat(el.dataset.fadeDelay ?? '0');
    const inInitialViewport = el.getBoundingClientRect().top < window.innerHeight;

    onceInView(el, () => {
      fallIn(el, { delay: inInitialViewport ? stagger : 0 });
    });
  }
}

function initFadeIns(): void {
  if (bootPending()) {
    document.addEventListener('site:booted', runFadeIns, { once: true });
    return;
  }
  runFadeIns();
}

onPageReady(initFadeIns);
