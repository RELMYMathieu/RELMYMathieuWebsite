import { onPageReady } from '../animations';
import { LOCATION } from '../config/location';
import { LOYAL_VISITS } from '../config/mood';
import { getVisit } from './visit';

export function formatLogin(at: number, locale: string, withSeconds = false): string {
  try {
    return new Intl.DateTimeFormat(locale, {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      ...(withSeconds ? { second: '2-digit' } : {}),
      hourCycle: 'h23',
      timeZone: LOCATION.timeZone,
    })
      .format(new Date(at))
      .toLowerCase();
  } catch {
    return new Date(at).toISOString().slice(0, 16).replace('T', ' ');
  }
}

function initLastLogin(): void {
  const el = document.getElementById('last-login');
  if (!el) return;

  const { count, previous } = getVisit();
  if (previous === null) return;

  const locale = el.dataset.loginLocale || 'en';
  const template = count >= LOYAL_VISITS ? el.dataset.loginRegular : el.dataset.loginBack;
  if (!template) return;

  el.textContent = template.replace('{date}', formatLogin(previous, locale));
}

onPageReady(initLastLogin);
