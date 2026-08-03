import { navigate } from 'astro:transitions/client';
import { onPageReady } from '../animations';
import { setTheme } from './theme';
import { isTheme, THEMES } from '../theme/config';
import {
  elapsedMs,
  fetchNowPlaying,
  formatClock,
  getCachedNowPlaying,
  needsReauth,
  nowPlayingEnabled,
} from './now-playing';

interface LogEntry {
  text: string;
  echo: boolean;
  prompt?: string;
}

let history: string[] = [];
let historyIndex = 0;
let hotkeyBound = false;
let transcript: LogEntry[] = [];
let hasRunCommand = false;
let keepOpenAcrossNav = false;

const WHOAMI = 'relmymathieu';

const COMMANDS = ['help', 'cd', 'dir', 'cat', 'pwd', 'echo', 'fetch', 'np', 'theme', 'en', 'fr', 'whoami', 'clear', 'exit'];
const WIFE_URL = 'https://www.youtube.com/@zythecreator/videos';

const ARG_COMPLETIONS: Record<string, () => string[]> = {
  theme: () => THEMES.map((t) => t.code),
  cd: () => ['~', '~/blog', 'blog', '..'],
  cat: () => {
    const slugs = getBlogSlugs();
    return whereAmI() === 'blog' ? slugs : slugs.map((s) => `blog/${s}`);
  },
};

function getBlogSlugs(): string[] {
  const { panel } = els();
  return (panel?.dataset.blogSlugs ?? '').split(',').filter(Boolean);
}

function completionFor(value: string): string | null {
  const spaceIdx = value.indexOf(' ');

  if (spaceIdx === -1) {
    if (!value) return null;
    const lower = value.toLowerCase();
    const matches = COMMANDS.filter((c) => c.startsWith(lower));
    if (matches.length !== 1) return null;
    return matches[0].length > value.length ? matches[0] : null;
  }

  const cmd = value.slice(0, spaceIdx).toLowerCase();
  const argStart = spaceIdx + 1;
  const argPart = value.slice(argStart);
  const options = ARG_COMPLETIONS[cmd]?.();
  if (!options || !argPart || /\s/.test(argPart)) return null;

  const lowerArg = argPart.toLowerCase();
  const matches = options.filter((o) => o.startsWith(lowerArg));
  if (matches.length !== 1) return null;
  const match = matches[0];
  return match.length > argPart.length ? value.slice(0, argStart) + match : null;
}

type CdTarget = { kind: 'home' } | { kind: 'blog' };

function resolveCdTarget(argRaw: string): CdTarget | null {
  const trimmed = argRaw.trim();
  if (!trimmed || trimmed === '~' || trimmed === '/' || trimmed === '..' || trimmed === '../') return { kind: 'home' };
  const stripped = trimmed.replace(/^~\//, '').replace(/\/+$/, '');
  if (stripped === '') return { kind: 'home' };
  if (stripped === 'blog') return { kind: 'blog' };
  return null;
}

type CatTarget = { kind: 'post'; slug: string } | { kind: 'dir' } | null;

function resolveCatTarget(argRaw: string, slugs: string[], inBlog: boolean): CatTarget {
  const trimmed = argRaw.trim();
  if (!trimmed) return null;
  const stripped = trimmed.replace(/^~\//, '').replace(/\/+$/, '');
  if (stripped === 'blog') return { kind: 'dir' };
  if (stripped.startsWith('blog/')) {
    const slug = stripped.slice('blog/'.length);
    return slugs.includes(slug) ? { kind: 'post', slug } : null;
  }
  if (inBlog && slugs.includes(stripped)) return { kind: 'post', slug: stripped };
  return null;
}

function els() {
  return {
    toggle: document.getElementById('cmdbar-toggle'),
    backdrop: document.getElementById('cmdbar-backdrop'),
    panel: document.getElementById('cmdbar'),
    log: document.getElementById('cmdbar-log'),
    input: document.getElementById('cmdbar-input') as HTMLInputElement | null,
    ghost: document.getElementById('cmdbar-ghost'),
    prompt: document.getElementById('cmdbar-prompt'),
  };
}

function updateGhost(): void {
  const { input, ghost } = els();
  if (!input || !ghost) return;

  const typed = input.value;
  const completion = completionFor(typed);
  if (!completion) {
    ghost.replaceChildren();
    return;
  }

  const typedSpan = document.createElement('span');
  typedSpan.className = 'cmdbar-ghost-typed';
  typedSpan.textContent = typed;

  const suggestSpan = document.createElement('span');
  suggestSpan.className = 'cmdbar-ghost-suggest';
  suggestSpan.textContent = completion.slice(typed.length);

  ghost.replaceChildren(typedSpan, suggestSpan);
}

function isOpen(): boolean {
  return els().panel?.classList.contains('is-open') ?? false;
}

function lockScroll(): void {
  if (document.body.style.overflow === 'hidden') return;
  const gap = window.innerWidth - document.documentElement.clientWidth;
  if (gap > 0) document.body.style.paddingRight = gap + 'px';
  document.body.style.overflow = 'hidden';
}

function unlockScroll(): void {
  document.body.style.overflow = '';
  document.body.style.paddingRight = '';
}

function openBar(): void {
  const { backdrop, panel, input } = els();
  if (!backdrop || !panel || !input) return;
  if (panel.classList.contains('is-open')) {
    input.focus();
    return;
  }
  backdrop.classList.add('is-open');
  backdrop.setAttribute('aria-hidden', 'false');
  panel.classList.add('is-open');
  panel.setAttribute('aria-hidden', 'false');
  lockScroll();
  input.focus();
}

function closeBar(): void {
  const { toggle, backdrop, panel } = els();
  if (!backdrop || !panel || !panel.classList.contains('is-open')) return;
  backdrop.classList.remove('is-open');
  backdrop.setAttribute('aria-hidden', 'true');
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  unlockScroll();
  toggle?.focus({ preventScroll: true });
}

function currentLang(): 'en' | 'fr-fr' {
  return location.pathname.startsWith('/fr-fr') ? 'fr-fr' : 'en';
}

function rawPath(): string {
  const p = location.pathname;
  if (p === '/fr-fr' || p === '/fr-fr/') return '/';
  if (p.startsWith('/fr-fr/')) return p.slice('/fr-fr'.length) || '/';
  return p || '/';
}

function langPath(target: 'en' | 'fr-fr'): string {
  const raw = rawPath();
  if (target === 'en') return raw;
  return raw === '/' ? '/fr-fr' : `/fr-fr${raw}`;
}

function whereAmI(): 'home' | 'blog' {
  const raw = rawPath();
  return raw === '/blog' || raw.startsWith('/blog/') ? 'blog' : 'home';
}

function promptText(): string {
  return `relmymathieu@web:${whereAmI() === 'blog' ? '~/blog' : '~'}$`;
}

function updatePrompt(): void {
  const { prompt } = els();
  if (prompt) prompt.textContent = promptText();
}

function renderLine(log: HTMLElement, entry: LogEntry): void {
  const lineEl = document.createElement('div');
  lineEl.className = entry.echo ? 'cmdbar-log-line cmdbar-log-line--echo' : 'cmdbar-log-line';
  if (entry.echo) {
    const promptSpan = document.createElement('span');
    promptSpan.className = 'cmdbar-log-prompt';
    promptSpan.textContent = `${entry.prompt ?? promptText()} `;
    lineEl.append(promptSpan, entry.text);
  } else {
    lineEl.textContent = entry.text;
  }
  log.appendChild(lineEl);
}

function print(text: string, echo = false): void {
  const { log } = els();
  if (!log) return;
  const prompt = echo ? promptText() : undefined;
  for (const line of text.split('\n')) {
    const entry: LogEntry = { text: line, echo, prompt };
    transcript.push(entry);
    renderLine(log, entry);
  }
  log.scrollTop = log.scrollHeight;
}

function goHome(): void {
  navigate(currentLang() === 'fr-fr' ? '/fr-fr' : '/');
}

function goBlog(): void {
  navigate(currentLang() === 'fr-fr' ? '/fr-fr/blog' : '/blog');
}

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

async function catPost(slug: string, notFoundMsg: string): Promise<void> {
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

function guessOS(ua: string): string {
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iOS/.test(ua)) return 'iOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'unknown';
}

function guessBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  return 'unknown';
}

interface SystemInfo {
  os: string;
  browser: string;
  cpu: string;
  gpu: string;
  memory: string;
  screen: string;
  lang: string;
}

function collectSystemInfo(): SystemInfo {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string; brands?: { brand: string; version: string }[] };
    deviceMemory?: number;
  };

  let os = 'unknown';
  try {
    os = nav.userAgentData?.platform || guessOS(navigator.userAgent);
  } catch {}

  let browser = 'unknown';
  try {
    const brands = nav.userAgentData?.brands;
    const brand = brands?.find((b) => !/Not.*Brand/i.test(b.brand)) ?? brands?.[brands.length - 1];
    browser = brand ? `${brand.brand} ${brand.version}` : guessBrowser(navigator.userAgent);
  } catch {}

  let cpu = 'unknown';
  try {
    cpu = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} threads` : 'unknown';
  } catch {}

  let memory = 'unknown';
  try {
    memory = nav.deviceMemory ? `${nav.deviceMemory} GB (approx)` : 'unknown';
  } catch {}

  let gpu = 'unknown';
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL) : undefined;
    if (typeof renderer === 'string' && renderer) gpu = renderer;
  } catch {}

  let screen = 'unknown';
  try {
    screen = `${window.screen.width}x${window.screen.height} @${window.devicePixelRatio}x`;
  } catch {}

  let lang = 'unknown';
  try {
    lang = navigator.language || 'unknown';
  } catch {}

  return { os, browser, cpu, gpu, memory, screen, lang };
}

function runFetchCommand(): void {
  const info = collectSystemInfo();
  const theme = document.documentElement.dataset.theme ?? 'slate';
  const uptime = document.getElementById('status-uptime')?.textContent?.trim() || 'unknown';
  const np = getCachedNowPlaying();

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
  ];

  if (np?.title) {
    lines.push(`playing : ${np.artist ? `${np.artist} - ` : ''}${np.title}`);
  }

  print(lines.join('\n'));
}

interface NpStrings {
  heading: string;
  headingLast: string;
  track: string;
  artist: string;
  album: string;
  none: string;
  off: string;
  error: string;
  reauth: string;
}

function progressBar(progressMs: number, durationMs: number): string {
  const CELLS = 10;
  const filled = Math.min(CELLS, Math.max(0, Math.round((progressMs / durationMs) * CELLS)));
  return `[${'#'.repeat(filled)}${'-'.repeat(CELLS - filled)}] ${formatClock(progressMs)} / ${formatClock(durationMs)}`;
}

async function runNpCommand(strings: NpStrings): Promise<void> {
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
    `♪ ${data.isPlaying ? strings.heading : strings.headingLast}`,
    '-------------------',
    ...rows.map(([label, value]) => `${label.padEnd(pad)} : ${value}`),
  ];

  const elapsed = elapsedMs(data);
  if (elapsed !== null && data.durationMs) {
    lines.push(progressBar(elapsed, data.durationMs));
  }

  print(lines.join('\n'));
}

function triggerFakeDeletion(message: string): void {
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

function runCommand(raw: string): void {
  const trimmed = raw.trim();
  if (!trimmed) return;
  print(trimmed, true);
  history.push(trimmed);
  historyIndex = history.length;

  if (!hasRunCommand) {
    hasRunCommand = true;
    const { input } = els();
    if (input) input.placeholder = '';
  }

  const { panel, log } = els();
  const strings = {
    help: panel?.dataset.help ?? '',
    sudo: panel?.dataset.sudo ?? '',
    notFound: panel?.dataset.notFound ?? '',
    cdNotFound: panel?.dataset.cdNotFound ?? '',
    catNotFound: panel?.dataset.catNotFound ?? '',
    catIsDir: panel?.dataset.catIsDir ?? '',
    dirEmpty: panel?.dataset.dirEmpty ?? '',
    deleted: panel?.dataset.deleted ?? '',
    wife: panel?.dataset.wife ?? '',
    themeSet: panel?.dataset.themeSet ?? '',
    themeUnknown: panel?.dataset.themeUnknown ?? '',
  };

  const npStrings: NpStrings = {
    heading: panel?.dataset.npHeading ?? 'now playing',
    headingLast: panel?.dataset.npHeadingLast ?? 'last played',
    track: panel?.dataset.npTrack ?? 'track',
    artist: panel?.dataset.npArtist ?? 'artist',
    album: panel?.dataset.npAlbum ?? 'album',
    none: panel?.dataset.npNone ?? '',
    off: panel?.dataset.npOff ?? '',
    error: panel?.dataset.npError ?? '',
    reauth: panel?.dataset.npReauth ?? '',
  };

  const [cmd, ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(' ');

  switch (cmd.toLowerCase()) {
    case 'help':
      print(strings.help);
      break;
    case 'clear':
      log?.replaceChildren();
      transcript = [];
      break;
    case 'whoami':
      print(WHOAMI);
      break;
    case 'cd': {
      if (arg.trim().toLowerCase() === 'wife') {
        window.open(WIFE_URL, '_blank', 'noopener,noreferrer');
        print(strings.wife);
        break;
      }
      const target = resolveCdTarget(arg);
      if (target?.kind === 'home') goHome();
      else if (target?.kind === 'blog') goBlog();
      else print(strings.cdNotFound.replace('{path}', arg || '~'));
      break;
    }
    case 'dir': {
      const raw = rawPath();
      let entries: string[];
      if (raw === '/') {
        entries = ['blog'];
      } else if (raw === '/blog' || raw.startsWith('/blog/')) {
        entries = getBlogSlugs();
      } else {
        entries = [];
      }
      print(entries.length ? entries.join('\n') : strings.dirEmpty);
      break;
    }
    case 'cat': {
      const target = resolveCatTarget(arg, getBlogSlugs(), whereAmI() === 'blog');
      if (target?.kind === 'post') void catPost(target.slug, strings.catNotFound);
      else if (target?.kind === 'dir') print(strings.catIsDir.replace('{path}', arg.trim()));
      else print(strings.catNotFound.replace('{slug}', arg.trim() || '?'));
      break;
    }
    case 'pwd':
      print(whereAmI() === 'blog' ? '~/blog' : '~');
      break;
    case 'echo':
      print(arg);
      break;
    case 'fetch':
      runFetchCommand();
      break;
    case 'np':
    case 'spotify':
      void runNpCommand(npStrings);
      break;
    case 'en':
    case 'fr': {
      const { input: langInput } = els();
      if (langInput) langInput.disabled = true;
      navigate(langPath(cmd.toLowerCase() === 'fr' ? 'fr-fr' : 'en'));
      break;
    }
    case 'theme':
      if (isTheme(arg)) {
        setTheme(arg);
        print(strings.themeSet.replace('{theme}', arg));
      } else {
        print(strings.themeUnknown.replace('{theme}', arg || '?'));
      }
      break;
    case 'sudo':
      if (/^rm\s+-rf\s+\/?$/i.test(arg.trim())) {
        triggerFakeDeletion(strings.deleted);
      } else {
        print(strings.sudo);
      }
      break;
    case 'exit':
      closeBar();
      break;
    default:
      print(strings.notFound.replace('{cmd}', cmd));
  }
}

function initCommandBar(): void {
  const { toggle, backdrop, input } = els();
  if (!toggle || !backdrop || !input) return;

  updatePrompt();

  if (toggle.dataset.bound !== '1') {
    toggle.dataset.bound = '1';
    toggle.addEventListener('click', () => openBar());
  }

  if (backdrop.dataset.bound !== '1') {
    backdrop.dataset.bound = '1';
    backdrop.addEventListener('click', () => closeBar());
  }

  if (input.dataset.bound !== '1') {
    input.dataset.bound = '1';
    if (hasRunCommand) input.placeholder = '';

    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        runCommand(input.value);
        input.value = '';
        updateGhost();
      } else if (e.key === 'ArrowUp') {
        if (history.length === 0) return;
        e.preventDefault();
        historyIndex = Math.max(0, historyIndex - 1);
        input.value = history[historyIndex] ?? '';
        updateGhost();
      } else if (e.key === 'ArrowDown') {
        if (history.length === 0) return;
        e.preventDefault();
        historyIndex = Math.min(history.length, historyIndex + 1);
        input.value = history[historyIndex] ?? '';
        updateGhost();
      } else if (e.key === 'ArrowRight') {
        const atEnd = input.selectionStart === input.value.length && input.selectionEnd === input.value.length;
        if (!atEnd) return;
        const completion = completionFor(input.value);
        if (!completion) return;
        e.preventDefault();
        input.value = completion;
        input.setSelectionRange(completion.length, completion.length);
        updateGhost();
      }
    });

    input.addEventListener('input', updateGhost);
  }

  if (!hotkeyBound) {
    hotkeyBound = true;
    document.addEventListener('keydown', (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === 'k') {
        e.preventDefault();
        isOpen() ? closeBar() : openBar();
      } else if (e.key === 'Escape' && isOpen()) {
        closeBar();
      }
    });

    document.addEventListener('astro:before-swap', () => {
      keepOpenAcrossNav = isOpen();
    });

    document.addEventListener('astro:after-swap', () => {
      if (!keepOpenAcrossNav) return;
      keepOpenAcrossNav = false;

      const { backdrop: freshBackdrop, panel: freshPanel, input: freshInput, log: freshLog } = els();
      if (!freshBackdrop || !freshPanel || !freshInput || !freshLog) return;

      for (const entry of transcript) renderLine(freshLog, entry);
      freshLog.scrollTop = freshLog.scrollHeight;
      if (hasRunCommand) freshInput.placeholder = '';

      freshBackdrop.classList.add('is-open');
      freshBackdrop.setAttribute('aria-hidden', 'false');
      freshPanel.classList.add('is-open');
      freshPanel.setAttribute('aria-hidden', 'false');
      lockScroll();
      updatePrompt();
      freshInput.focus();
    });
  }
}

onPageReady(initCommandBar);
