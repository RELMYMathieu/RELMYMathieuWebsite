import { setTheme } from '../theme';
import { isTheme } from '../../theme/config';
import { clearLog, clearPlaceholder, closeBar, els, getBlogSlugs, print } from './dom';
import {
  currentLang,
  goBlog,
  goHome,
  goLang,
  rawPath,
  resolveCatTarget,
  resolveCdTarget,
  whereAmI,
} from './paths';
import { readMoodStrings, readNpStrings, readShellStrings } from './strings';
import {
  WHOAMI,
  catPost,
  runFetchCommand,
  runMoodCommand,
  runNpCommand,
  triggerFakeDeletion,
} from './commands';

const WIFE_URL = 'https://www.youtube.com/@zythecreator/videos';

let history: string[] = [];
let historyIndex = 0;

export function historyPrev(current: string): string {
  if (history.length === 0) return current;
  historyIndex = Math.max(0, historyIndex - 1);
  return history[historyIndex] ?? '';
}

export function historyNext(current: string): string {
  if (history.length === 0) return current;
  historyIndex = Math.min(history.length, historyIndex + 1);
  return history[historyIndex] ?? '';
}

export function hasHistory(): boolean {
  return history.length > 0;
}

export function runCommand(raw: string): void {
  const trimmed = raw.trim();
  if (!trimmed) return;
  print(trimmed, true);
  history.push(trimmed);
  historyIndex = history.length;
  clearPlaceholder();

  const { panel } = els();
  const strings = readShellStrings(panel);
  const npStrings = readNpStrings(panel);
  const moodStrings = readMoodStrings(panel);

  const [cmd, ...rest] = trimmed.split(/\s+/);
  const arg = rest.join(' ');

  switch (cmd.toLowerCase()) {
    case 'help':
      print(strings.help);
      break;
    case 'clear':
      clearLog();
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
      const path = rawPath();
      let entries: string[];
      if (path === '/') {
        entries = ['blog'];
      } else if (path === '/blog' || path.startsWith('/blog/')) {
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
      runFetchCommand(moodStrings.phaseLabels);
      break;
    case 'np':
    case 'spotify':
      void runNpCommand(npStrings);
      break;
    case 'mood':
      runMoodCommand(moodStrings);
      break;
    case 'rss': {
      const feed = currentLang() === 'fr-fr' ? '/fr-fr/rss.xml' : '/rss.xml';
      print(strings.rss.replace('{path}', feed));
      window.open(feed, '_blank', 'noopener,noreferrer');
      break;
    }
    case 'en':
    case 'fr': {
      const { input } = els();
      if (input) input.disabled = true;
      goLang(cmd.toLowerCase() === 'fr' ? 'fr-fr' : 'en');
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
