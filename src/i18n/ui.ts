import { LOCALES, DEFAULT_LOCALE, SHOW_DEFAULT_PREFIX, type Lang } from './config';

export type { Lang };
export const defaultLang = DEFAULT_LOCALE;
export const showDefaultLang = SHOW_DEFAULT_PREFIX;

export const languages = Object.fromEntries(
  LOCALES.map((l) => [l.code, l.label]),
) as Record<Lang, string>;

export const ui = {
  en: {
    'nav.home': '~/home',
    'nav.blog': '~/blog',
    'theme.label': 'Switch theme',
    'nav.skip': 'Skip to content',
    'lang.label': 'Switch language',
    'lang.menu': 'Language selector',
    'lang.switchTo': 'Switch to {name}',
    'ww.minimize': 'Minimize',
    'ww.fullscreen': 'Fullscreen',
    'footer.credit': 'Made by Relmy Mathieu and built with Astro.',
    'blog.title': 'Blog',
    'blog.subtitle': 'thoughts, notes, whatever',
    'blog.empty': 'Hello, blog! No posts yet, check back later.',
    'works.heading': 'Works',
    'works.open': '[open]',
    'works.close': 'Close {name} window',
    'works.placeholder': '[ you are here! ]',
    'lightbox.close': 'Close',
    'engine.title': 'Game engine preview',
    'engine.caption': 'yaay first triangle in vulkan. (March 31st, 2026)',
    'engine.closeLabel': 'Close preview',
    'engine.imageAlt': 'First Vulkan triangle',
  },
  'fr-fr': {
    'nav.home': '~/accueil',
    'nav.blog': '~/blog',
    'theme.label': 'Changer de thème',
    'nav.skip': 'Aller au contenu',
    'lang.label': 'Changer de langue',
    'lang.menu': 'Sélecteur de langue',
    'lang.switchTo': 'Passer en {name}',
    'ww.minimize': 'Réduire',
    'ww.fullscreen': 'Plein écran',
    'footer.credit': 'Fait par Relmy Mathieu et construit avec Astro.',
    'blog.title': 'Blog',
    'blog.subtitle': 'pensées, notes, bref.',
    'blog.empty': 'Bonjour, cher blog ! Aucun post pour l\'instant, revenez plus tard.',
    'works.heading': 'Projets',
    'works.open': '[ouvrir]',
    'works.close': 'Fermer la fenêtre {name}',
    'works.placeholder': '[ vous êtes ici! ]',
    'lightbox.close': 'Fermer',
    'engine.title': 'Aperçu du moteur',
    'engine.caption': 'yaay premier triangle en vulkan. (31 mars 2026)',
    'engine.closeLabel': 'Fermer l\'aperçu',
    'engine.imageAlt': 'Premier triangle Vulkan',
  },
} as const;
