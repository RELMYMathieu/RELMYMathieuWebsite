import { onPageReady, prefersReducedMotion } from '../animations';
import { bindNavMenu } from './nav-menu';
import { NOW_PLAYING_ENDPOINT, NOW_PLAYING_POLL } from '../config/services';

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
let timer: number | null = null;
let earlyRefresh: number | null = null;
let pending: Promise<NowPlaying | null> | null = null;
let wakeBound = false;
let reauthRequired = false;
let signature = '';
let idleDelay: number = NOW_PLAYING_POLL.idle;

export const nowPlayingEnabled = NOW_PLAYING_ENDPOINT !== '';

export function needsReauth(): boolean {
  return reauthRequired;
}

function stopPolling(): void {
  if (timer !== null) clearTimeout(timer);
  if (earlyRefresh !== null) clearTimeout(earlyRefresh);
  timer = null;
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
      const res = await fetch(NOW_PLAYING_ENDPOINT, {
        headers: { accept: 'application/json' },
        cache: 'no-store',
      });

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

function isLiveSession(state: PlaybackState | undefined): boolean {
  return state === 'playing' || state === 'paused';
}

function signatureOf(data: NowPlaying | null): string {
  if (!data) return '';
  return `${data.state}|${data.title ?? ''}|${data.artist ?? ''}`;
}

function nextDelay(): number {
  return isLiveSession(cached?.state) ? NOW_PLAYING_POLL.live : idleDelay;
}

function scheduleEarlyRefresh(): void {
  if (earlyRefresh !== null) clearTimeout(earlyRefresh);
  earlyRefresh = null;
  if (cached?.state !== 'playing') return;

  if (hasOverrun(cached)) {
    earlyRefresh = window.setTimeout(refresh, NOW_PLAYING_POLL.overrun);
    return;
  }

  const remaining = remainingMs(cached);
  if (remaining === null || remaining >= NOW_PLAYING_POLL.live) return;
  earlyRefresh = window.setTimeout(refresh, remaining + 1000);
}

function schedule(): void {
  if (timer !== null) clearTimeout(timer);
  timer = null;
  if (reauthRequired || document.visibilityState !== 'visible') return;
  timer = window.setTimeout(refresh, nextDelay());
}

function refresh(): void {
  void fetchNowPlaying().then((data) => {
    const next = signatureOf(data);
    if (data && next !== signature) {
      signature = next;
      idleDelay = NOW_PLAYING_POLL.idle;
    } else {
      idleDelay = Math.min(idleDelay * 2, NOW_PLAYING_POLL.idleMax);
    }

    const el = segment();
    if (el?.isConnected) render(el);
    schedule();
    scheduleEarlyRefresh();
  });
}

function wake(): void {
  if (!nowPlayingEnabled || reauthRequired) return;
  idleDelay = NOW_PLAYING_POLL.idle;
  if (Date.now() - fetchedAt < NOW_PLAYING_POLL.minGap) {
    schedule();
    return;
  }
  refresh();
}

function bindMenu(el: HTMLElement): void {
  let ticker: number | null = null;

  const tick = () => {
    const menu = el.querySelector<HTMLElement>('.nav-np__menu');
    if (menu && cached) renderTime(menu, cached);
  };

  bindNavMenu(el, {
    onOpen: () => {
      tick();
      if (ticker !== null) return;
      ticker = window.setInterval(tick, 1000);
    },
    onClose: () => {
      if (ticker === null) return;
      clearInterval(ticker);
      ticker = null;
    },
  });
}

function bindWakeSources(): void {
  if (wakeBound) return;
  wakeBound = true;

  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') wake();
    else stopPolling();
  });

  window.addEventListener('focus', wake);
  window.addEventListener('pageshow', (e) => {
    if (e.persisted) wake();
  });
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
  bindWakeSources();
  refresh();
}

onPageReady(initNowPlaying);
