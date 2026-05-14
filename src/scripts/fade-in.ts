import { fadeIn, onceInView, onPageReady, prefersReducedMotion } from '../animations';

function initFadeIns(): void {
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
      fadeIn(el, { delay: inInitialViewport ? stagger : 0 });
    });
  }
}

onPageReady(initFadeIns);
