import { navigate } from 'astro:transitions/client';
import type { Lang } from '../../i18n/config';

export function currentLang(): Lang {
  return location.pathname.startsWith('/fr-fr') ? 'fr-fr' : 'en';
}

export function rawPath(): string {
  const p = location.pathname;
  if (p === '/fr-fr' || p === '/fr-fr/') return '/';
  if (p.startsWith('/fr-fr/')) return p.slice('/fr-fr'.length) || '/';
  return p || '/';
}

export function langPath(target: Lang): string {
  const raw = rawPath();
  if (target === 'en') return raw;
  return raw === '/' ? '/fr-fr' : `/fr-fr${raw}`;
}

export function whereAmI(): 'home' | 'blog' {
  const raw = rawPath();
  return raw === '/blog' || raw.startsWith('/blog/') ? 'blog' : 'home';
}

export function promptText(): string {
  return `relmymathieu@web:${whereAmI() === 'blog' ? '~/blog' : '~'}$`;
}

export function goHome(): void {
  navigate(currentLang() === 'fr-fr' ? '/fr-fr' : '/');
}

export function goBlog(): void {
  navigate(currentLang() === 'fr-fr' ? '/fr-fr/blog' : '/blog');
}

export function goLang(target: Lang): void {
  navigate(langPath(target));
}

export type CdTarget = { kind: 'home' } | { kind: 'blog' };

export function resolveCdTarget(argRaw: string): CdTarget | null {
  const trimmed = argRaw.trim();
  if (!trimmed || trimmed === '~' || trimmed === '/' || trimmed === '..' || trimmed === '../') return { kind: 'home' };
  const stripped = trimmed.replace(/^~\//, '').replace(/\/+$/, '');
  if (stripped === '') return { kind: 'home' };
  if (stripped === 'blog') return { kind: 'blog' };
  return null;
}

export type CatTarget = { kind: 'post'; slug: string } | { kind: 'dir' } | null;

export function resolveCatTarget(argRaw: string, slugs: string[], inBlog: boolean): CatTarget {
  const trimmed = argRaw.trim();
  if (!trimmed) return null;
  const stripped = trimmed.replace(/^~\//, '').replace(/\/+$/, '');
  if (stripped === 'blog') return { kind: 'dir' };
  if (stripped.startsWith('blog/')) {
    const slug = stripped.slice('blog/'.length);
    return slugs.includes(slug) ? { kind: 'post', slug } : null;
  }
  if (inBlog && slugs.includes(stripped)) return { kind: 'post', slug: stripped };
  return null;
}
