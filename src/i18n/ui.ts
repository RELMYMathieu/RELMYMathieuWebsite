export const languages = {
  en: 'English',
  'fr-fr': 'Français',
} as const;

export type Lang = keyof typeof languages;
export const defaultLang: Lang = 'en';
export const showDefaultLang = false;

export const ui = {
  en: {
    'nav.home': '~/home',
    'nav.blog': '~/blog',
    'nav.lang': 'FR',
    'footer.credit': 'Made by Relmy Mathieu — built with Astro.',
    'blog.title': 'Blog',
    'blog.subtitle': 'thoughts, notes, whatever',
    'blog.empty': 'No posts yet — check back later.',
  },
  'fr-fr': {
    'nav.home': '~/accueil',
    'nav.blog': '~/blog',
    'nav.lang': 'EN',
    'footer.credit': 'Fait par Relmy Mathieu — propulsé par Astro.',
    'blog.title': 'Blog',
    'blog.subtitle': 'pensées, notes, bref.',
    'blog.empty': 'Aucun article pour l\'instant — revenez plus tard.',
  },
} as const;
