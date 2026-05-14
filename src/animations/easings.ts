export const EASE = {
  snappy:  [0.25, 1, 0.5, 1],
  smooth:  [0.16, 1, 0.3, 1],
  bouncy:  [0.05, 0.9, 0.1, 1.05],
  pop:     [0.34, 1.56, 0.64, 1],
  linear:  [0, 0, 1, 1],
} as const;

export type EaseName = keyof typeof EASE;
