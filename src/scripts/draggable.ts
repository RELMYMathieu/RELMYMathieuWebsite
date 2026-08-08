const MIN_VISIBLE = 80;
const DRAG_THRESHOLD = 4;

export function makeDraggable(
  win: HTMLElement,
  handle: HTMLElement,
  canDrag: () => boolean,
  onDragStart?: () => void,
): void {
  let dragging = false;
  let pending = false;
  let pendingX = 0, pendingY = 0;
  let startX = 0, startY = 0, startLeft = 0, startTop = 0;
  let winW = 0, winH = 0, handleH = 0, minTop = 0;

  function topBoundary(): number {
    const bar = document.querySelector<HTMLElement>('.nav-bar');
    if (!bar) return 0;
    const pos = getComputedStyle(bar).position;
    if (pos !== 'sticky' && pos !== 'fixed') return 0;
    return Math.max(0, bar.getBoundingClientRect().bottom);
  }
  let frame = 0;
  let queuedLeft = 0, queuedTop = 0;

  function commit() {
    frame = 0;
    win.style.left = queuedLeft + 'px';
    win.style.top = queuedTop + 'px';
  }

  function queuePosition(left: number, top: number) {
    queuedLeft = left;
    queuedTop = top;
    if (!frame) frame = requestAnimationFrame(commit);
  }

  function flushPosition() {
    if (!frame) return;
    cancelAnimationFrame(frame);
    commit();
  }

  function measure() {
    const r = win.getBoundingClientRect();
    winW = r.width;
    winH = r.height;
    handleH = handle.getBoundingClientRect().height || 32;
    minTop = topBoundary();
    return r;
  }

  function isControl(e: Event) {
    return (e.target as HTMLElement).closest('.ww-ctrl');
  }

  function clamp(left: number, top: number): [number, number] {
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const minLeft = MIN_VISIBLE - winW;
    const maxLeft = vw - MIN_VISIBLE;
    const maxTop = vh - handleH;
    return [
      Math.min(Math.max(left, minLeft), maxLeft),
      Math.min(Math.max(top, minTop), maxTop),
    ];
  }

  function confirmDrag(clientX: number, clientY: number) {
    const preRect = win.getBoundingClientRect();
    const fracX = preRect.width ? (pendingX - preRect.left) / preRect.width : 0;
    const offsetY = pendingY - preRect.top;

    onDragStart?.();

    win.classList.add('is-dragging');
    win.style.translate = 'none';
    measure();

    const offsetX = fracX * winW;
    const [left, top] = clamp(clientX - offsetX, clientY - offsetY);
    win.style.left = left + 'px';
    win.style.top = top + 'px';

    dragging = true;
    startX = clientX;
    startY = clientY;
    startLeft = left;
    startTop = top;
  }

  function moveDrag(clientX: number, clientY: number) {
    if (pending && !dragging) {
      if (Math.hypot(clientX - pendingX, clientY - pendingY) < DRAG_THRESHOLD) return;
      confirmDrag(clientX, clientY);
    }
    if (!dragging) return;
    const [left, top] = clamp(
      startLeft + (clientX - startX),
      startTop + (clientY - startY),
    );
    queuePosition(left, top);
  }

  function stopDrag() {
    pending = false;
    if (!dragging) return;
    dragging = false;
    flushPosition();
    win.classList.remove('is-dragging');
  }

  handle.addEventListener('mousedown', (e) => {
    if (!canDrag() || isControl(e)) return;
    e.preventDefault();
    pending = true;
    pendingX = e.clientX;
    pendingY = e.clientY;
  });

  document.addEventListener('mousemove', (e) => moveDrag(e.clientX, e.clientY));
  document.addEventListener('mouseup', stopDrag);

  handle.addEventListener('touchstart', (e) => {
    if (!canDrag() || isControl(e)) return;
    pending = true;
    pendingX = e.touches[0].clientX;
    pendingY = e.touches[0].clientY;
  }, { passive: true });

  handle.addEventListener('touchmove', (e) => {
    if (!pending && !dragging) return;
    e.preventDefault();
    moveDrag(e.touches[0].clientX, e.touches[0].clientY);
  }, { passive: false });

  document.addEventListener('touchend', stopDrag);

  window.addEventListener('resize', () => {
    flushPosition();
    if (!win.style.left || !win.style.top) return;
    measure();
    const [left, top] = clamp(parseInt(win.style.left) || 0, parseInt(win.style.top) || 0);
    win.style.left = left + 'px';
    win.style.top = top + 'px';
  });
}
