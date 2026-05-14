export interface LocaleDef {
  code: string;
  label: string;
  short: string;
  htmlLang: string;
}

export const LOCALES = [
  { code: 'en',    label: 'English',  short: 'EN', htmlLang: 'en'    },
  { code: 'fr-fr', label: 'Français', short: 'FR', htmlLang: 'fr-FR' },
] as const satisfies readonly LocaleDef[];

export type Lang = typeof LOCALES[number]['code'];

export const DEFAULT_LOCALE: Lang = 'en';
export const SHOW_DEFAULT_PREFIX = false;

export const LOCALE_CODES = LOCALES.map((l) => l.code) as readonly Lang[];

const LOCALE_BY_CODE = new Map(LOCALES.map((l) => [l.code, l]));

export function getLocale(code: Lang): LocaleDef {
  return LOCALE_BY_CODE.get(code) ?? LOCALES[0];
}

export function isLocale(value: string): value is Lang {
  return LOCALE_BY_CODE.has(value as Lang);
}
