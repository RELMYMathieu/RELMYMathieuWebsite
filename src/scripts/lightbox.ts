import { onPageReady } from '../animations';

function bindOne(trigger: HTMLElement, dialog: HTMLDialogElement) {
  const closeBtn = dialog.querySelector<HTMLElement>('[data-lightbox-close]');
  if (!closeBtn) return;

  const open = () => {
    dialog.showModal();
    closeBtn.focus();
  };

  const close = () => {
    dialog.close();
    trigger.focus();
  };

  trigger.addEventListener('click', open);
  closeBtn.addEventListener('click', close);
  dialog.addEventListener('click', (e) => {
    if (e.target === dialog) close();
  });
  dialog.addEventListener('close', () => {
    if (document.activeElement !== trigger) trigger.focus();
  });
}

function initLightboxes(): void {
  const triggers = document.querySelectorAll<HTMLElement>('[aria-controls]');
  for (const trigger of triggers) {
    if (trigger.dataset.lightboxBound === '1') continue;
    const targetId = trigger.getAttribute('aria-controls');
    if (!targetId) continue;
    const dialog = document.getElementById(targetId) as HTMLDialogElement | null;
    if (!dialog || !dialog.classList.contains('lightbox')) continue;
    trigger.dataset.lightboxBound = '1';
    bindOne(trigger, dialog);
  }
}

onPageReady(initLightboxes);
