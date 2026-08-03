import { getCollection } from 'astro:content';
import type { Lang } from '../i18n/config';

export interface FeedItem {
  title: string;
  description?: string;
  pubDate?: Date;
  link: string;
}

export async function getFeedItems(lang: Lang): Promise<FeedItem[]> {
  const posts = await getCollection('blog', (e) => e.id.endsWith(`/${lang}`));
  const prefix = lang === 'en' ? '/blog' : `/${lang}/blog`;

  return posts
    .sort((a, b) => (b.data.published?.getTime() ?? 0) - (a.data.published?.getTime() ?? 0))
    .map((post) => ({
      title: post.data.title,
      description: post.data.description,
      pubDate: post.data.published,
      link: `${prefix}/${post.id.replace(/\/[^/]+$/, '')}/`,
    }));
}
