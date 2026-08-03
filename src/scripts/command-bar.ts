import { navigate } from 'astro:transitions/client';
import { onPageReady } from '../animations';
import { setTheme } from './theme';
import { isTheme, THEMES } from '../theme/config';

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

const COMMANDS = ['help', 'cd', 'dir', 'theme', 'en', 'fr', 'whoami', 'clear', 'exit'];

const ARG_COMPLETIONS: Record<string, () => string[]> = {
  theme: () => THEMES.map((t) => t.code),
  cd: () => {
    const slugs = getBlogSlugs();
    const relative = whereAmI() === 'blog' ? slugs : slugs.map((s) => `blog/${s}`);
    return ['~', '~/blog', 'blog', '..', ...relative];
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

type CdTarget = { kind: 'home' } | { kind: 'blog' } | { kind: 'post'; slug: string };

function resolveCdTarget(argRaw: string, slugs: string[], inBlog: boolean): CdTarget | null {
  const trimmed = argRaw.trim();
  if (!trimmed || trimmed === '~' || trimmed === '/' || trimmed === '..' || trimmed === '../') return { kind: 'home' };
  const stripped = trimmed.replace(/^~\//, '').replace(/\/+$/, '');
  if (stripped === '') return { kind: 'home' };
  if (stripped === 'blog') return { kind: 'blog' };
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

function goPost(slug: string): void {
  navigate(currentLang() === 'fr-fr' ? `/fr-fr/blog/${slug}` : `/blog/${slug}`);
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
    themeSet: panel?.dataset.themeSet ?? '',
    themeUnknown: panel?.dataset.themeUnknown ?? '',
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
      const target = resolveCdTarget(arg, getBlogSlugs(), whereAmI() === 'blog');
      if (target?.kind === 'home') goHome();
      else if (target?.kind === 'blog') goBlog();
      else if (target?.kind === 'post') goPost(target.slug);
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
      print(entries.join('\n'));
      break;
    }
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
      print(strings.sudo);
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
