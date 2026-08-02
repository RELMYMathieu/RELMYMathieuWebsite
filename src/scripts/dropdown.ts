export interface DropdownOptions {
  toggle: HTMLElement;
  menu: HTMLElement;
  itemSelector?: string;
}

export interface DropdownHandle {
  isOpen(): boolean;
  open(): void;
  close(): void;
}

interface Instance extends DropdownHandle {
  toggle: HTMLElement;
  menu: HTMLElement;
  focusToggle(): void;
}

const instances = new Set<Instance>();
let documentBound = false;

function pruneDetached() {
  for (const instance of instances) {
    if (!instance.toggle.isConnected) instances.delete(instance);
  }
}

function bindDocumentListenersOnce() {
  if (documentBound) return;
  documentBound = true;

  document.addEventListener('click', (e) => {
    const target = e.target as Node | null;
    for (const instance of instances) {
      if (!instance.isOpen()) continue;
      if (instance.toggle.contains(target) || instance.menu.contains(target)) continue;
      instance.close();
    }
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape') return;
    for (const instance of instances) {
      if (!instance.isOpen()) continue;
      instance.close();
      instance.focusToggle();
    }
  });
}

export function createDropdown({
  toggle,
  menu,
  itemSelector = 'a',
}: DropdownOptions): DropdownHandle {
  pruneDetached();

  const items = () => Array.from(menu.querySelectorAll<HTMLElement>(itemSelector));

  const isOpen = () => menu.classList.contains('is-open');

  const focusItem = (index: number) => {
    const list = items();
    if (list.length === 0) return;
    const wrapped = ((index % list.length) + list.length) % list.length;
    list[wrapped]?.focus();
  };

  const close = () => {
    const active = document.activeElement;
    menu.classList.remove('is-open');
    menu.setAttribute('aria-hidden', 'true');
    toggle.setAttribute('aria-expanded', 'false');
    if (active instanceof HTMLElement && menu.contains(active)) toggle.focus();
  };

  const open = () => {
    for (const other of instances) {
      if (other.menu !== menu) other.close();
    }
    menu.classList.add('is-open');
    menu.setAttribute('aria-hidden', 'false');
    toggle.setAttribute('aria-expanded', 'true');
  };

  const instance: Instance = {
    toggle,
    menu,
    isOpen,
    open,
    close,
    focusToggle: () => toggle.focus(),
  };
  instances.add(instance);

  bindDocumentListenersOnce();

  if (toggle.dataset.bound === 'true') return instance;
  toggle.dataset.bound = 'true';

  toggle.addEventListener('click', (e) => {
    e.stopPropagation();
    if (isOpen()) {
      close();
    } else {
      open();
      focusItem(0);
    }
  });

  toggle.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      open();
      focusItem(0);
    }
  });

  menu.addEventListener('click', (e) => {
    const target = e.target as HTMLElement | null;
    if (target?.closest(itemSelector)) close();
  });

  menu.addEventListener('keydown', (e) => {
    const list = items();
    const current = document.activeElement as HTMLElement | null;
    const index = current ? list.indexOf(current) : -1;

    if (e.key === 'Escape') {
      e.preventDefault();
      close();
      toggle.focus();
      return;
    }

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      focusItem(index + 1);
    }

    if (e.key === 'ArrowUp') {
      e.preventDefault();
      focusItem(index - 1);
    }

    if (e.key === 'Home') {
      e.preventDefault();
      focusItem(0);
    }

    if (e.key === 'End') {
      e.preventDefault();
      focusItem(list.length - 1);
    }

    if (e.key === 'Tab') {
      close();
    }
  });

  return instance;
}
