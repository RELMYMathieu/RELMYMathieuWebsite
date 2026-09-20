import { onPageReady } from '../animations';
import { ageFromBirthday, BIRTHDAY } from '../utils/age';

export function currentAge(): number {
  return ageFromBirthday(BIRTHDAY);
}

function initAge(): void {
  const age = String(currentAge());
  for (const el of document.querySelectorAll<HTMLElement>('[data-age]')) {
    if (el.textContent !== age) el.textContent = age;
  }
}

onPageReady(initAge);
