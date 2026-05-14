import { ui } from './ui';
import { DEFAULT_LOCALE, SHOW_DEFAULT_PREFIX, isLocale, type Lang } from './config';

export type { Lang };

export function getLangFromUrl(url: URL): Lang {
  const first = url.pathname.split('/').filter(Boolean)[0];
  return first && isLocale(first) ? first : DEFAULT_LOCALE;
}

export function useTranslations(lang: Lang) {
  return function t(key: keyof typeof ui[typeof DEFAULT_LOCALE]): string {
    return (ui[lang] as Record<string, string>)[key] ?? ui[DEFAULT_LOCALE][key];
  };
}

export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string, l: Lang = lang): string {
    return !SHOW_DEFAULT_PREFIX && l === DEFAULT_LOCALE ? path : `/${l}${path}`;
  };
}

export function getRawPath(url: URL, lang: Lang): string {
  if (lang === DEFAULT_LOCALE) return url.pathname;
  return url.pathname.replace(`/${lang}`, '') || '/';
}
