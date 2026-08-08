const owners = new Set<string>();

function sync(): void {
  const locked = owners.size > 0;
  const root = document.documentElement;

  if (locked && !root.classList.contains('is-scroll-locked')) {
    root.style.setProperty('--sb-gutter', `${window.innerWidth - root.clientWidth}px`);
  }

  root.classList.toggle('is-scroll-locked', locked);
}

export function lockScroll(owner: string): void {
  owners.add(owner);
  sync();
}

export function unlockScroll(owner: string): void {
  owners.delete(owner);
  sync();
}
