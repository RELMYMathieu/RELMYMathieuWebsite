import { LOCATION } from '../config/location';

export const BIRTHDAY = new Date('2008-09-03');

const SITE_DATE = new Intl.DateTimeFormat('en-GB', {
  timeZone: LOCATION.timeZone,
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
});

function siteToday(now: Date): { year: number; month: number; day: number } | null {
  try {
    const parts = SITE_DATE.formatToParts(now);
    const get = (type: string) => Number(parts.find((p) => p.type === type)?.value);
    const year = get('year');
    const month = get('month');
    const day = get('day');
    if (!year || !month || !day) return null;
    return { year, month, day };
  } catch {
    return null;
  }
}

export function ageFromBirthday(birthday: Date, now: Date = new Date()): number {
  const today = siteToday(now) ?? {
    year: now.getUTCFullYear(),
    month: now.getUTCMonth() + 1,
    day: now.getUTCDate(),
  };

  const bMonth = birthday.getUTCMonth() + 1;
  const bDay = birthday.getUTCDate();

  let age = today.year - birthday.getUTCFullYear();
  if (today.month < bMonth || (today.month === bMonth && today.day < bDay)) age--;
  return age;
}
