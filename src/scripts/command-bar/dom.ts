import { lockScroll as lock, unlockScroll as unlock } from '../scroll-lock';
import { promptText } from './paths';

interface LogEntry {
  text: string;
  echo: boolean;
  prompt?: string;
}

let transcript: LogEntry[] = [];
let placeholderCleared = false;

export function els() {
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

export function getBlogSlugs(): string[] {
  const { panel } = els();
  return (panel?.dataset.blogSlugs ?? '').split(',').filter(Boolean);
}

export function isOpen(): boolean {
  return els().panel?.classList.contains('is-open') ?? false;
}

export const lockScroll = () => lock('cmdbar');
export const unlockScroll = () => unlock('cmdbar');

export function openBar(): void {
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

export function closeBar(): void {
  const { toggle, backdrop, panel } = els();
  if (!backdrop || !panel || !panel.classList.contains('is-open')) return;
  backdrop.classList.remove('is-open');
  backdrop.setAttribute('aria-hidden', 'true');
  panel.classList.remove('is-open');
  panel.setAttribute('aria-hidden', 'true');
  unlockScroll();
  toggle?.focus({ preventScroll: true });
}

export function updatePrompt(): void {
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

export function print(text: string, echo = false): void {
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

export function clearLog(): void {
  els().log?.replaceChildren();
  transcript = [];
}

export function replayTranscript(log: HTMLElement): void {
  for (const entry of transcript) renderLine(log, entry);
  log.scrollTop = log.scrollHeight;
}

export function placeholderIsCleared(): boolean {
  return placeholderCleared;
}

export function clearPlaceholder(): void {
  if (placeholderCleared) return;
  placeholderCleared = true;
  const { input } = els();
  if (input) input.placeholder = '';
}
