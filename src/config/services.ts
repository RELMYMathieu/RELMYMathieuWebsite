// TODO : Is there a better way to do this? I mean for the timers and for the endpoint.
export const NOW_PLAYING_ENDPOINT: string = 'https://relmy-now-playing.ninjacowzx.workers.dev';

export const NOW_PLAYING_POLL = {
  live: 8_000,
  idle: 20_000,
  idleMax: 120_000,
  overrun: 4_000,
  minGap: 3_000,
} as const;
