import type { EaseName } from './easings';
import type { Theme } from '../theme/config';

export interface WindowAnimProfile {
  morphEase: EaseName;
  morphDuration: number;
  minimizeEase: EaseName;
  minimizeDuration: number;
}

const DEFAULT_WINDOW_PROFILE: WindowAnimProfile = {
  morphEase: 'bouncy',
  morphDuration: 0.36,
  minimizeEase: 'snappy',
  minimizeDuration: 0.28,
};

const WINDOW_PROFILES: Partial<Record<Theme, WindowAnimProfile>> = {
  aero: {
    morphEase: 'smooth',
    morphDuration: 0.22,
    minimizeEase: 'smooth',
    minimizeDuration: 0.2,
  },
};

export function getWindowAnimProfile(theme?: string | null): WindowAnimProfile {
  const code = (theme ?? document.documentElement.dataset.theme) as Theme | undefined;
  return (code && WINDOW_PROFILES[code]) ?? DEFAULT_WINDOW_PROFILE;
}
