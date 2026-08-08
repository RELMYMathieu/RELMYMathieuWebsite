import { getCollection, render } from 'astro:content';
import { experimental_AstroContainer as AstroContainer } from 'astro/container';
import mdxRenderer from '@astrojs/mdx/server.js';
import sanitizeHtml from 'sanitize-html';
import type { Lang } from '../i18n/config';

export interface FeedItem {
  title: string;
  description?: string;
  pubDate?: Date;
  link: string;
  content?: string;
}

const EXCERPT_LENGTH = 220;

function absolutise(html: string, site: URL): string {
  return html.replace(/(href|src)="\/(?!\/)/g, `$1="${site.origin}/`);
}

function excerpt(html: string): string {
  const text = html
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
  if (text.length <= EXCERPT_LENGTH) return text;
  return `${text.slice(0, EXCERPT_LENGTH).replace(/\s+\S*$/, '')}...`;
}

export async function getFeedItems(lang: Lang, site: URL): Promise<FeedItem[]> {
  const posts = await getCollection('blog', (e) => e.id.endsWith(`/${lang}`));
  const prefix = lang === 'en' ? '/blog' : `/${lang}/blog`;

  const container = await AstroContainer.create();
  container.addServerRenderer({ name: '@astrojs/mdx', renderer: mdxRenderer });

  return Promise.all(
    posts
      .sort((a, b) => (b.data.published?.getTime() ?? 0) - (a.data.published?.getTime() ?? 0))
      .map(async (post) => {
        const { Content } = await render(post);
        const html = sanitizeHtml(absolutise(await container.renderToString(Content), site), {
          allowedTags: sanitizeHtml.defaults.allowedTags.concat(['img']),
          allowedAttributes: {
            ...sanitizeHtml.defaults.allowedAttributes,
            img: ['src', 'alt', 'title', 'width', 'height'],
          },
        });

        return {
          title: post.data.title,
          description: post.data.description ?? excerpt(html),
          pubDate: post.data.published,
          link: `${prefix}/${post.id.replace(/\/[^/]+$/, '')}/`,
          content: html,
        };
      }),
  );
}
