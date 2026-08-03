import { onPageReady, prefersReducedMotion } from '../animations';
import { NOW_PLAYING_ENDPOINT, NOW_PLAYING_POLL_MS } from '../config/services';

export interface NowPlaying {
  isPlaying: boolean;
  title?: string;
  artist?: string;
  album?: string;
  url?: string;
  progressMs?: number;
  durationMs?: number;
  playedAt?: string;
  ageMs?: number;
}

let cached: NowPlaying | null = null;
let fetchedAt = 0;
let interval: number | null = null;
let earlyRefresh: number | null = null;
let pending: Promise<NowPlaying | null> | null = null;
let visibilityBound = false;
let reauthRequired = false;

export const nowPlayingEnabled = NOW_PLAYING_ENDPOINT !== '';

export function needsReauth(): boolean {
  return reauthRequired;
}

function stopPolling(): void {
  if (interval !== null) clearInterval(interval);
  if (earlyRefresh !== null) clearTimeout(earlyRefresh);
  interval = null;
  earlyRefresh = null;
}

export function getCachedNowPlaying(): NowPlaying | null {
  return cached;
}

export function elapsedMs(data: NowPlaying): number | null {
  if (!data.isPlaying || typeof data.progressMs !== 'number') return null;
  const staleness = (data.ageMs ?? 0) + (Date.now() - fetchedAt);
  const advanced = data.progressMs + staleness;
  return data.durationMs ? Math.min(advanced, data.durationMs) : advanced;
}

function remainingMs(data: NowPlaying): number | null {
  const elapsed = elapsedMs(data);
  if (elapsed === null || !data.durationMs) return null;
  return Math.max(0, data.durationMs - elapsed);
}

export async function fetchNowPlaying(): Promise<NowPlaying | null> {
  if (!nowPlayingEnabled) return null;
  if (pending) return pending;

  pending = (async () => {
    try {
      const res = await fetch(NOW_PLAYING_ENDPOINT, { headers: { accept: 'application/json' } });

      if (!res.ok) {
        const body = (await res.json().catch(() => ({}))) as { error?: string };
        if (body.error === 'reauth_required') {
          reauthRequired = true;
          stopPolling();
        }
        return null;
      }

      const json = (await res.json()) as NowPlaying;
      if (typeof json?.isPlaying !== 'boolean') return null;
      cached = json;
      fetchedAt = Date.now();
      return json;
    } catch {
      return null;
    } finally {
      pending = null;
    }
  })();

  return pending;
}

function segment(): HTMLElement | null {
  return document.getElementById('now-playing');
}

export function formatClock(ms: number): string {
  const total = Math.max(0, Math.round(ms / 1000));
  return `${Math.floor(total / 60)}:${String(total % 60).padStart(2, '0')}`;
}

function line(parent: HTMLElement, className: string, text: string): void {
  if (!text) return;
  const el = document.createElement('span');
  el.className = className;
  el.textContent = text;
  parent.appendChild(el);
}

function renderTime(menu: HTMLElement, data: NowPlaying): void {
  const time = menu.querySelector<HTMLElement>('.np-time');
  const elapsed = elapsedMs(data);
  if (!time || elapsed === null || !data.durationMs) return;
  time.textContent = `${formatClock(elapsed)} / ${formatClock(data.durationMs)}`;
}

function render(el: HTMLElement): void {
  const data = cached;
  const menu = el.querySelector<HTMLElement>('.nav-np__menu');
  if (!menu) return;

  if (!data?.title) {
    el.hidden = true;
    menu.replaceChildren();
    return;
  }

  const playing = data.isPlaying;
  el.classList.toggle('is-last', !playing);
  el.hidden = false;
  menu.replaceChildren();

  if (!playing) line(menu, 'np-status', el.dataset.npLastPrefix ?? 'last played');

  const title = document.createElement(data.url ? 'a' : 'span');
  title.className = 'np-title';
  title.textContent = data.title;
  if (data.url && title instanceof HTMLAnchorElement) {
    title.href = data.url;
    title.target = '_blank';
    title.rel = 'noopener noreferrer';
  }
  menu.appendChild(title);

  line(menu, 'np-artist', data.artist ?? '');
  line(menu, 'np-album', data.album ?? '');

  const elapsed = elapsedMs(data);
  if (elapsed === null || !data.durationMs) return;

  const track = document.createElement('span');
  track.className = 'np-progress';
  const bar = document.createElement('span');
  bar.className = 'np-bar';
  if (prefersReducedMotion()) {
    bar.style.transform = `scaleX(${elapsed / data.durationMs})`;
  } else {
    bar.style.animationDuration = `${data.durationMs}ms`;
    bar.style.animationDelay = `-${elapsed}ms`;
  }
  track.appendChild(bar);
  menu.appendChild(track);

  const time = document.createElement('span');
  time.className = 'np-time';
  menu.appendChild(time);
  renderTime(menu, data);
}

function scheduleEarlyRefresh(): void {
  if (earlyRefresh !== null) clearTimeout(earlyRefresh);
  earlyRefresh = null;

  const data = cached;
  if (!data?.isPlaying) return;
  const remaining = remainingMs(data);
  if (remaining === null || remaining >= NOW_PLAYING_POLL_MS) return;

  earlyRefresh = window.setTimeout(refresh, Math.max(remaining + 1500, 5000));
}

function refresh(): void {
  void fetchNowPlaying().then(() => {
    const el = segment();
    if (el?.isConnected) render(el);
    scheduleEarlyRefresh();
  });
}

function startPolling(): void {
  if (interval !== null) clearInterval(interval);
  interval = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    refresh();
  }, NOW_PLAYING_POLL_MS);
}

function bindMenuTicker(el: HTMLElement): void {
  if (el.dataset.bound === '1') return;
  el.dataset.bound = '1';

  let ticker: number | null = null;

  const start = () => {
    if (ticker !== null) return;
    ticker = window.setInterval(() => {
      const menu = el.querySelector<HTMLElement>('.nav-np__menu');
      if (menu && cached) renderTime(menu, cached);
    }, 1000);
  };

  const stop = () => {
    if (ticker === null) return;
    clearInterval(ticker);
    ticker = null;
  };

  el.addEventListener('pointerenter', start);
  el.addEventListener('pointerleave', stop);
  el.addEventListener('focusin', start);
  el.addEventListener('focusout', stop);
}

function initNowPlaying(): void {
  const el = segment();
  if (!el) return;

  if (!nowPlayingEnabled) {
    el.hidden = true;
    return;
  }

  if (cached) render(el);
  else el.hidden = true;

  bindMenuTicker(el);
  refresh();
  startPolling();

  if (!visibilityBound) {
    visibilityBound = true;
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'visible') refresh();
    });
  }
}

onPageReady(initNowPlaying);
