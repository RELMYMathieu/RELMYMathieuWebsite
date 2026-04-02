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
    'works.heading': 'Works',
    'works.open': '[open]',
    'works.close': 'Close {name} window',
    'works.placeholder': '[ you are here! ]',
    'works.mobile-hint': 'psst — try this on a bigger screen for the full experience',
  },
  'fr-fr': {
    'nav.home': '~/accueil',
    'nav.blog': '~/blog',
    'nav.lang': 'EN',
    'footer.credit': 'Fait par Relmy Mathieu — construit avec Astro.',
    'blog.title': 'Blog',
    'blog.subtitle': 'pensées, notes, un peu de tout',
    'blog.empty': 'Aucun post pour l\'instant — revenez plus tard.',
    'works.heading': 'Projets',
    'works.open': '[ouvrir]',
    'works.close': 'Fermer la fenêtre {name}',
    'works.placeholder': '[ vous êtes ici! ]',
    'works.mobile-hint': 'psst — essayez sur un plus grand écran pour une meilleure expérience',
  },
} as const;
