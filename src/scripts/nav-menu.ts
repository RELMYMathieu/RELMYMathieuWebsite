export interface NavMenuOptions {
  onOpen?(): void;
  onClose?(): void;
}

export function bindNavMenu(container: HTMLElement, options: NavMenuOptions = {}): void {
  if (container.dataset.bound === '1') return;
  container.dataset.bound = '1';

  const trigger = container.querySelector<HTMLElement>('[data-nav-menu-trigger]');
  const { onOpen, onClose } = options;

  const isPinned = () => container.classList.contains('is-pinned');

  const unpin = () => {
    if (!isPinned()) return;
    container.classList.remove('is-pinned');
    trigger?.setAttribute('aria-expanded', 'false');
    onClose?.();
  };

  trigger?.addEventListener('click', () => {
    const pinned = container.classList.toggle('is-pinned');
    trigger.setAttribute('aria-expanded', String(pinned));
    pinned ? onOpen?.() : onClose?.();
  });

  document.addEventListener('click', (e) => {
    if (!isPinned()) return;
    if (container.contains(e.target as Node)) return;
    unpin();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !isPinned()) return;
    unpin();
    trigger?.focus();
  });

  container.addEventListener('pointerenter', () => onOpen?.());
  container.addEventListener('pointerleave', () => {
    if (!isPinned()) onClose?.();
  });
  container.addEventListener('focusin', () => onOpen?.());
  container.addEventListener('focusout', () => {
    if (!isPinned()) onClose?.();
  });
}
