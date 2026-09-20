import { THEMES } from '../../theme/config';
import { els, getBlogSlugs } from './dom';
import { whereAmI } from './paths';

export const COMMANDS = ['help', 'cd', 'dir', 'cat', 'pwd', 'echo', 'fetch', 'np', 'spotify', 'mood', 'rss', 'theme', 'en', 'fr', 'whoami', 'clear', 'exit'];

const ARG_COMPLETIONS: Record<string, () => string[]> = {
  theme: () => THEMES.map((t) => t.code),
  cd: () => ['~', '~/blog', 'blog', '..'],
  cat: () => {
    const slugs = getBlogSlugs();
    return whereAmI() === 'blog' ? slugs : slugs.map((s) => `blog/${s}`);
  },
};

export function completionFor(value: string): string | null {
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

export function updateGhost(): void {
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
