import {
  elapsedMs,
  fetchNowPlaying,
  formatClock,
  getCachedNowPlaying,
  needsReauth,
  nowPlayingEnabled,
  type PlaybackState,
} from '../now-playing';
import { formatDwell, moodSnapshot, weatherLabel } from '../mood';
import { closeBar, print } from './dom';
import { currentLang } from './paths';
import { collectSystemInfo } from './sysinfo';
import type { MoodStrings, NpStrings, PhaseLabels } from './strings';

export const WHOAMI = 'relmymathieu';

const BLOCK_TAGS = new Set(['H1', 'H2', 'H3', 'H4', 'P', 'LI', 'BLOCKQUOTE', 'PRE']);

function extractPostText(root: Element): string {
  const lines: string[] = [];

  function walk(node: Element): void {
    if (node.tagName === 'SCRIPT' || node.tagName === 'STYLE') return;
    if (BLOCK_TAGS.has(node.tagName)) {
      const text = node.textContent?.replace(/\s+/g, ' ').trim();
      if (text) lines.push(text);
      return;
    }
    for (const child of Array.from(node.children)) walk(child);
  }

  walk(root);
  return lines.join('\n\n');
}

export async function catPost(slug: string, notFoundMsg: string): Promise<void> {
  const url = currentLang() === 'fr-fr' ? `/fr-fr/blog/${slug}` : `/blog/${slug}`;
  try {
    const res = await fetch(url);
    if (!res.ok) throw new Error('not ok');
    const doc = new DOMParser().parseFromString(await res.text(), 'text/html');
    const article = doc.querySelector('.prose-mdx');
    const text = article ? extractPostText(article) : '';
    print(text || notFoundMsg.replace('{slug}', slug));
  } catch {
    print(notFoundMsg.replace('{slug}', slug));
  }
}

export function runFetchCommand(phaseLabels: PhaseLabels): void {
  const info = collectSystemInfo();
  const theme = document.documentElement.dataset.theme ?? 'slate';
  const uptime = document.getElementById('status-uptime')?.textContent?.trim() || 'unknown';
  const np = getCachedNowPlaying();
  const mood = moodSnapshot();

  const lines = [
    `${WHOAMI}@web`,
    '-------------------',
    `os      : ${info.os}`,
    `browser : ${info.browser}`,
    `cpu     : ${info.cpu}`,
    `gpu     : ${info.gpu}`,
    `memory  : ${info.memory}`,
    `screen  : ${info.screen}`,
    `lang    : ${info.lang}`,
    `theme   : ${theme}`,
    `uptime  : ${uptime}`,
    `mood    : ${phaseLabels[mood.phase] ?? mood.phase}`,
  ];

  if (np?.title) {
    lines.push(`playing : ${np.artist ? `${np.artist} - ` : ''}${np.title}`);
  }

  print(lines.join('\n'));
}

const HEADING_FOR: Record<PlaybackState, (s: NpStrings) => string> = {
  playing: (s) => s.heading,
  paused: (s) => s.paused,
  last: (s) => s.headingLast,
  idle: (s) => s.headingLast,
};

function progressBar(progressMs: number, durationMs: number): string {
  const CELLS = 10;
  const filled = Math.min(CELLS, Math.max(0, Math.round((progressMs / durationMs) * CELLS)));
  return `[${'#'.repeat(filled)}${'-'.repeat(CELLS - filled)}] ${formatClock(progressMs)} / ${formatClock(durationMs)}`;
}

export async function runNpCommand(strings: NpStrings): Promise<void> {
  if (!nowPlayingEnabled) {
    print(strings.off);
    return;
  }

  const data = await fetchNowPlaying();
  if (!data) {
    print(needsReauth() ? strings.reauth : strings.error);
    return;
  }
  if (!data.title) {
    print(strings.none);
    return;
  }

  const rows: [string, string][] = [[strings.track, data.title]];
  if (data.artist) rows.push([strings.artist, data.artist]);
  if (data.album) rows.push([strings.album, data.album]);

  const pad = Math.max(...rows.map(([label]) => label.length));
  const lines = [
    `♪ ${HEADING_FOR[data.state](strings)}`,
    '-------------------',
    ...rows.map(([label, value]) => `${label.padEnd(pad)} : ${value}`),
  ];

  const elapsed = elapsedMs(data);
  if (elapsed !== null && data.durationMs) {
    lines.push(progressBar(elapsed, data.durationMs));
  }

  print(lines.join('\n'));
}

export function runMoodCommand(strings: MoodStrings): void {
  const mood = moodSnapshot();
  const weather = mood.weather;

  const rows: [string, string][] = [
    [strings.phase, `${strings.phaseLabels[mood.phase] ?? mood.phase} (${mood.time} ${mood.timeZone})`],
    [
      strings.weather,
      weather ? `${weatherLabel(weather.bucket) ?? weather.bucket} ${weather.temperature}°` : strings.unknown,
    ],
    [strings.visits, String(mood.visits)],
    [strings.dwell, formatDwell(mood.dwellMs)],
  ];
  if (mood.line) rows.push([strings.verdict, mood.line]);

  const pad = Math.max(...rows.map(([label]) => label.length));
  print(
    [
      strings.heading,
      '-------------------',
      ...rows.map(([label, value]) => `${label.padEnd(pad)} : ${value}`),
    ].join('\n'),
  );
}

export function triggerFakeDeletion(message: string): void {
  if (document.getElementById('rm-rf-overlay')) return;
  closeBar();
  const overlay = document.createElement('div');
  overlay.id = 'rm-rf-overlay';
  overlay.setAttribute('role', 'alert');
  overlay.textContent = message;
  document.body.appendChild(overlay);
  document.documentElement.dataset.deleted = '1';
  requestAnimationFrame(() => overlay.classList.add('is-visible'));
}
