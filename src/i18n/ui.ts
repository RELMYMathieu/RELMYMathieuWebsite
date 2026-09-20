import { LOCALES, DEFAULT_LOCALE, SHOW_DEFAULT_PREFIX, type Lang } from './config';
import { chrome } from './strings/chrome';
import { status } from './strings/status';
import { mood } from './strings/mood';
import { content } from './strings/content';
import { command } from './strings/command';
import { system } from './strings/system';

export type { Lang };
export const defaultLang = DEFAULT_LOCALE;
export const showDefaultLang = SHOW_DEFAULT_PREFIX;

export const languages = Object.fromEntries(
  LOCALES.map((l) => [l.code, l.label]),
) as Record<Lang, string>;

export const ui = {
  en: {
    ...chrome.en,
    ...status.en,
    ...mood.en,
    ...content.en,
    ...command.en,
    ...system.en,
  },
  'fr-fr': {
    ...chrome['fr-fr'],
    ...status['fr-fr'],
    ...mood['fr-fr'],
    ...content['fr-fr'],
    ...command['fr-fr'],
    ...system['fr-fr'],
  },
} as const;
