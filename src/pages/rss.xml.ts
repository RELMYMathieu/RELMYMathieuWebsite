import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getFeedItems } from '../utils/feed';
import { useTranslations } from '../i18n/utils';

export async function GET(context: APIContext) {
  const t = useTranslations('en');
  const site = context.site ?? new URL('https://relmymathieu.me');
  return rss({
    title: `Relmy Mathieu - ${t('blog.title')}`,
    description: t('blog.subtitle'),
    site,
    items: await getFeedItems('en', site),
    stylesheet: '/rss/styles.xsl',
    customData: '<language>en</language>',
  });
}
