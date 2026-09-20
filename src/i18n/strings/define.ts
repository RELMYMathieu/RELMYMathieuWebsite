import type { Lang } from '../config';

type Translated<T extends Record<string, string>> = {
  [L in Lang]: L extends 'en' ? T : Record<keyof T, string>;
};

export function defineStrings<const T extends Record<string, string>>(
  strings: Translated<T>,
): Translated<T> {
  return strings;
}
