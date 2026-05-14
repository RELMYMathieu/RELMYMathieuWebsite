const MIN_VISIBLE = 80;

export function makeDraggable(
  win: HTMLElement,
  handle: HTMLElement,
  canDrag: () => boolean,
): void {
  let dragging = false;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;
  let winW = 0, winH = 0, handleH = 0;

  function toAbsolute() {
    const r = win.getBoundingClientRect();
    win.style.translate = 'none';
    win.style.left = r.left + 'px';
    win.style.top = r.top + 'px';
    winW = r.width;
    winH = r.height;
    handleH = handle.getBoundingClientRect().height || 32;
  }

  function isControl(e: Event) {
    return (e.target as HTMLElement).closest('.ww-ctrl');
  }

  function clamp(left: number, top: number): [number, number] {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minLeft = MIN_VISIBLE - winW;
    const maxLeft = vw - MIN_VISIBLE;
    const minTop = 0;
    const maxTop = vh - handleH;
    return [
      Math.min(Math.max(left, minLeft), maxLeft),
      Math.min(Math.max(top, minTop), maxTop),
    ];
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
    const [left, top] = clamp(
      startLeft + (clientX - startX),
      startTop + (clientY - startY),
    );
    win.style.left = left + 'px';
    win.style.top = top + 'px';
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

  window.addEventListener('resize', () => {
    if (!win.style.left || !win.style.top) return;
    const r = win.getBoundingClientRect();
    winW = r.width;
    winH = r.height;
    handleH = handle.getBoundingClientRect().height || 32;
    const [left, top] = clamp(parseInt(win.style.left) || 0, parseInt(win.style.top) || 0);
    win.style.left = left + 'px';
    win.style.top = top + 'px';
  });
}

