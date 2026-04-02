export function makeDraggable(
  win: HTMLElement,
  handle: HTMLElement,
  canDrag: () => boolean,
): void {
  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;

  function toAbsolute() {
    const r = win.getBoundingClientRect();
    win.style.translate = 'none';
    win.style.left = r.left + 'px';
    win.style.top = r.top + 'px';
  }

  function isControl(e: Event) {
    return (e.target as HTMLElement).closest('.ww-ctrl');
  }

  function beginDrag(clientX: number, clientY: number) {
    win.classList.add('is-dragging');
    toAbsolute();
    dragging = true;
    startX = clientX;
    startY = clientY;
    startLeft = parseInt(win.style.left) || 0;
    startTop = parseInt(win.style.top) || 0;
  }

  function moveDrag(clientX: number, clientY: number) {
    if (!dragging) return;
    win.style.left = startLeft + (clientX - startX) + 'px';
    win.style.top = startTop + (clientY - startY) + 'px';
  }

  function stopDrag() {
    if (!dragging) return;
    dragging = false;
    win.classList.remove('is-dragging');
  }

  handle.addEventListener('mousedown', (e) => {
    if (!canDrag() || isControl(e)) return;
    e.preventDefault();
    beginDrag(e.clientX, e.clientY);
  });

  document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
  document.addEventListener('mouseup', stopDrag);

  handle.addEventListener('touchstart', (e) => {
    if (!canDrag() || isControl(e)) return;
    beginDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: true });

  handle.addEventListener('touchmove', (e) => {
    if (!dragging) return;
    e.preventDefault();
    moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  document.addEventListener('touchend', stopDrag);
}
