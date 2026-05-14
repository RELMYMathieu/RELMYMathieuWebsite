export function prefersReducedMotion(): boolean {
  return matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function onPageReady(fn: () => void): void {
  fn();
  document.addEventListener('astro:page-load', fn);
}

export function onceInView(el: Element, cb: () => void, rootMargin = '0px'): void {
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        cb();
        io.disconnect();
        return;
      }
    },
    { rootMargin },
  );
  io.observe(el);
}
