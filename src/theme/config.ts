export interface ThemeDef {
  code: string;
  label: string;
  swatch: string;
}

export const THEMES = [
  { code: 'slate', label: 'Slate', swatch: '#a1a1aa' },
  { code: 'rem',   label: 'Rem',   swatch: '#90bff9' },
  { code: 'ram',   label: 'Ram',   swatch: '#ffa8bc' },
] as const satisfies readonly ThemeDef[];

export type Theme = typeof THEMES[number]['code'];

export const DEFAULT_THEME: Theme = 'slate';
export const THEME_STORAGE_KEY = 'theme';

const THEME_BY_CODE = new Map(THEMES.map((t) => [t.code, t]));

export function getThemeDef(code: Theme): ThemeDef {
  return THEME_BY_CODE.get(code) ?? THEMES[0];
}

export function isTheme(value: string | null): value is Theme {
  return value !== null && THEME_BY_CODE.has(value as Theme);
}
