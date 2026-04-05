import { inView } from 'motion';
import { animate } from 'motion/mini';

const KEYFRAMES = {
  opacity: [0, 1],
  transform: ['translateY(10px)', 'translateY(0)'],
};

function initFadeIns(): void {
  const els = document.querySelectorAll<HTMLElement>('[data-fade-in]');

  for (const el of els) {
    if (el.dataset.fadeInit === '1') continue;
    el.dataset.fadeInit = '1';

    if (matchMedia('(prefers-reduced-motion: reduce)').matches) {
      el.style.opacity = '1';
      el.style.transform = 'none';
      return;
    }

    const stagger = parseFloat(el.dataset.fadeDelay ?? '0');
    const inInitialViewport = el.getBoundingClientRect().top < window.innerHeight;

    inView(
      el,
      () => {
        animate(el, KEYFRAMES, {
          duration: 0.45,
          delay: inInitialViewport ? stagger : 0,
          ease: [0.22, 1, 0.36, 1],
        });
      },
      { margin: '0px' },
    );
  }
}

initFadeIns();
document.addEventListener('astro:page-load', initFadeIns);
