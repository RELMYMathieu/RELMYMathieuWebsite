import { onPageReady, prefersReducedMotion } from '../animations';
import {
  NOW_PLAYING_ENDPOINT,
  NOW_PLAYING_IDLE_POLL_MS,
  NOW_PLAYING_OVERRUN_MS,
  NOW_PLAYING_POLL_MS,
} from '../config/services';

export type PlaybackState = 'playing' | 'paused' | 'last' | 'idle';

export interface NowPlaying {
  state: PlaybackState;
  title?: string;
  artist?: string;
  album?: string;
  url?: string;
  progressMs?: number;
  durationMs?: number;
  playedAt?: string;
  ageMs?: number;
}

const STATES: readonly string[] = ['playing', 'paused', 'last', 'idle'];

let cached: NowPlaying | null = null;
let fetchedAt = 0;
let interval: number | null = null;
let earlyRefresh: number | null = null;
let pending: Promise<NowPlaying | null> | null = null;
let visibilityBound = false;
let reauthRequired = false;
let pollEvery = 0;

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
  if (typeof data.progressMs !== 'number') return null;
  if (data.state === 'paused') return data.progressMs;
  if (data.state !== 'playing') return null;

  const staleness = (data.ageMs ?? 0) + (Date.now() - fetchedAt);
  const advanced = data.progressMs + staleness;
  return data.durationMs ? Math.min(advanced, data.durationMs) : advanced;
}

function remainingMs(data: NowPlaying): number | null {
  if (data.state !== 'playing') return null;
  const elapsed = elapsedMs(data);
  if (elapsed === null || !data.durationMs) return null;
  return Math.max(0, data.durationMs - elapsed);
}

function hasOverrun(data: NowPlaying | null): boolean {
  return data !== null && data.state === 'playing' && remainingMs(data) === 0;
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
      if (!STATES.includes(json?.state)) return null;
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

  const playing = data.state === 'playing';
  el.classList.toggle('is-playing', playing);
  el.classList.toggle('is-paused', data.state === 'paused');
  el.classList.toggle('is-last', data.state === 'last');
  el.hidden = false;
  menu.replaceChildren();

  if (data.state === 'paused') line(menu, 'np-status', el.dataset.npPaused ?? 'paused');
  if (data.state === 'last') line(menu, 'np-status', el.dataset.npLastPrefix ?? 'last played');

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
  track.className = playing ? 'np-progress' : 'np-progress is-paused';
  const bar = document.createElement('span');
  bar.className = 'np-bar';
  if (!playing || prefersReducedMotion()) {
    bar.style.animationName = 'none';
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
  if (cached?.state !== 'playing') return;

  if (hasOverrun(cached)) {
    earlyRefresh = window.setTimeout(refresh, NOW_PLAYING_OVERRUN_MS);
    return;
  }

  const remaining = remainingMs(cached);
  if (remaining === null || remaining >= NOW_PLAYING_POLL_MS) return;
  earlyRefresh = window.setTimeout(refresh, remaining + 1000);
}

function refresh(): void {
  void fetchNowPlaying().then(() => {
    const el = segment();
    if (el?.isConnected) render(el);
    startPolling();
    scheduleEarlyRefresh();
  });
}

function startPolling(): void {
  const next = cached?.state === 'playing' ? NOW_PLAYING_POLL_MS : NOW_PLAYING_IDLE_POLL_MS;
  if (interval !== null && pollEvery === next) return;

  if (interval !== null) clearInterval(interval);
  pollEvery = next;
  interval = window.setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    refresh();
  }, next);
}

function bindMenu(el: HTMLElement): void {
  if (el.dataset.bound === '1') return;
  el.dataset.bound = '1';

  let ticker: number | null = null;

  const tick = () => {
    const menu = el.querySelector<HTMLElement>('.nav-np__menu');
    if (menu && cached) renderTime(menu, cached);
  };

  const start = () => {
    tick();
    if (ticker !== null) return;
    ticker = window.setInterval(tick, 1000);
  };

  const stop = () => {
    if (el.classList.contains('is-pinned')) return;
    if (ticker === null) return;
    clearInterval(ticker);
    ticker = null;
  };

  const trigger = el.querySelector<HTMLElement>('.nav-np__trigger');
  trigger?.addEventListener('click', () => {
    const pinned = el.classList.toggle('is-pinned');
    trigger.setAttribute('aria-expanded', String(pinned));
    pinned ? start() : stop();
  });

  document.addEventListener('click', (e) => {
    if (!el.classList.contains('is-pinned')) return;
    if (el.contains(e.target as Node)) return;
    el.classList.remove('is-pinned');
    trigger?.setAttribute('aria-expanded', 'false');
    stop();
  });

  document.addEventListener('keydown', (e) => {
    if (e.key !== 'Escape' || !el.classList.contains('is-pinned')) return;
    el.classList.remove('is-pinned');
    trigger?.setAttribute('aria-expanded', 'false');
    stop();
  });

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

  bindMenu(el);
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
