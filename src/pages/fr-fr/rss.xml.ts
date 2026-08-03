import rss from '@astrojs/rss';
import type { APIContext } from 'astro';
import { getFeedItems } from '../../utils/feed';
import { useTranslations } from '../../i18n/utils';

export async function GET(context: APIContext) {
  const t = useTranslations('fr-fr');
  return rss({
    title: `Relmy Mathieu - ${t('blog.title')}`,
    description: t('blog.subtitle'),
    site: context.site ?? 'https://relmymathieu.me',
    items: await getFeedItems('fr-fr'),
    customData: '<language>fr-fr</language>',
  });
}
