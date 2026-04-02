import { ui, defaultLang, showDefaultLang, type Lang } from './ui';

export type { Lang };

export function getLangFromUrl(url: URL): Lang {
  const first = url.pathname.split('/').filter(Boolean)[0];
  return (first && first in ui) ? first as Lang : defaultLang;
}

export function useTranslations(lang: Lang) {
  return function t(key: keyof typeof ui[typeof defaultLang]): string {
    return (ui[lang] as Record<string, string>)[key] ?? ui[defaultLang][key];
  };
}

export function useTranslatedPath(lang: Lang) {
  return function translatePath(path: string, l: Lang = lang): string {
    return !showDefaultLang && l === defaultLang ? path : `/${l}${path}`;
  };
}

export function getRawPath(url: URL, lang: Lang): string {
  if (lang === defaultLang) return url.pathname;
  return url.pathname.replace(`/${lang}`, '') || '/';
}
