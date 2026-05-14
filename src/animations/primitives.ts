import { animate } from 'motion/mini';
import { EASE } from './easings';
import { prefersReducedMotion } from './runtime';

type Target = HTMLElement | Element;

export interface AnimOptions {
  duration?: number;
  delay?: number;
  ease?: readonly number[];
}

export function fadeIn(el: Target, opts: AnimOptions = {}) {
  if (prefersReducedMotion()) {
    (el as HTMLElement).style.opacity = '1';
    (el as HTMLElement).style.transform = 'none';
    return;
  }
  return animate(
    el,
    { opacity: [0, 1], transform: ['translateY(10px)', 'translateY(0)'] },
    {
      duration: opts.duration ?? 0.45,
      delay: opts.delay ?? 0,
      ease: (opts.ease ?? EASE.smooth) as number[],
    },
  );
}

export function pop(el: Target, opts: AnimOptions = {}) {
  if (prefersReducedMotion()) return;
  return animate(
    el,
    {
      opacity: [0, 1, 1],
      transform: ['translateY(24px) scale(0.96)', 'translateY(0) scale(1)', 'translateY(0) scale(1)'],
    },
    {
      duration: opts.duration ?? 0.52,
      delay: opts.delay ?? 0,
      ease: (opts.ease ?? EASE.bouncy) as number[],
    },
  );
}

export function fadeOut(el: Target, opts: AnimOptions = {}) {
  if (prefersReducedMotion()) {
    (el as HTMLElement).style.opacity = '0';
    return;
  }
  return animate(
    el,
    { opacity: [1, 0], transform: ['scale(1)', 'scale(0.97)'] },
    {
      duration: opts.duration ?? 0.18,
      delay: opts.delay ?? 0,
      ease: (opts.ease ?? EASE.snappy) as number[],
    },
  );
}

export interface MorphOptions extends AnimOptions {
  counterScale?: HTMLElement[];
}

export function morph(
  el: HTMLElement,
  from: DOMRect,
  to: DOMRect,
  opts: MorphOptions = {},
) {
  if (prefersReducedMotion()) return;
  if (!from.width || !to.width) return;

  const dx = from.left - to.left;
  const dy = from.top - to.top;
  const sx = from.width / to.width;
  const sy = from.height / to.height;

  const duration = opts.duration ?? 0.38;
  const ease = (opts.ease ?? EASE.bouncy) as number[];

  el.style.transformOrigin = 'top left';
  const parent = animate(
    el,
    { transform: [`translate(${dx}px, ${dy}px) scale(${sx}, ${sy})`, 'translate(0, 0) scale(1, 1)'] },
    { duration, ease },
  );

  const counterAnims = (opts.counterScale ?? []).map((child) => {
    child.style.transformOrigin = 'top left';
    return animate(
      child,
      { transform: [`scale(${1 / sx}, ${1 / sy})`, 'scale(1, 1)'] },
      { duration, ease },
    );
  });

  return { parent, counterAnims };
}
