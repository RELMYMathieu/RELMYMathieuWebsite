import type { MoodPhase } from '../../config/mood';

export type PhaseLabels = Partial<Record<MoodPhase, string>>;

export interface ShellStrings {
  help: string;
  sudo: string;
  notFound: string;
  cdNotFound: string;
  catNotFound: string;
  catIsDir: string;
  dirEmpty: string;
  deleted: string;
  wife: string;
  themeSet: string;
  themeUnknown: string;
  rss: string;
}

export interface NpStrings {
  heading: string;
  paused: string;
  headingLast: string;
  track: string;
  artist: string;
  album: string;
  none: string;
  off: string;
  error: string;
  reauth: string;
}

export interface MoodStrings {
  heading: string;
  phase: string;
  weather: string;
  visits: string;
  dwell: string;
  verdict: string;
  unknown: string;
  phaseLabels: PhaseLabels;
}

function parsePhaseLabels(raw: string | undefined): PhaseLabels {
  try {
    const parsed = JSON.parse(raw ?? '{}') as PhaseLabels;
    return parsed && typeof parsed === 'object' ? parsed : {};
  } catch {
    return {};
  }
}

export function readShellStrings(panel: HTMLElement | null): ShellStrings {
  return {
    help: panel?.dataset.help ?? '',
    sudo: panel?.dataset.sudo ?? '',
    notFound: panel?.dataset.notFound ?? '',
    cdNotFound: panel?.dataset.cdNotFound ?? '',
    catNotFound: panel?.dataset.catNotFound ?? '',
    catIsDir: panel?.dataset.catIsDir ?? '',
    dirEmpty: panel?.dataset.dirEmpty ?? '',
    deleted: panel?.dataset.deleted ?? '',
    wife: panel?.dataset.wife ?? '',
    themeSet: panel?.dataset.themeSet ?? '',
    themeUnknown: panel?.dataset.themeUnknown ?? '',
    rss: panel?.dataset.rss ?? '',
  };
}

export function readNpStrings(panel: HTMLElement | null): NpStrings {
  return {
    heading: panel?.dataset.npHeading ?? 'now playing',
    paused: panel?.dataset.npPaused ?? 'paused',
    headingLast: panel?.dataset.npHeadingLast ?? 'last played',
    track: panel?.dataset.npTrack ?? 'track',
    artist: panel?.dataset.npArtist ?? 'artist',
    album: panel?.dataset.npAlbum ?? 'album',
    none: panel?.dataset.npNone ?? '',
    off: panel?.dataset.npOff ?? '',
    error: panel?.dataset.npError ?? '',
    reauth: panel?.dataset.npReauth ?? '',
  };
}

export function readMoodStrings(panel: HTMLElement | null): MoodStrings {
  return {
    heading: panel?.dataset.moodHeading ?? 'site mood',
    phase: panel?.dataset.moodPhase ?? 'phase',
    weather: panel?.dataset.moodWeather ?? 'weather',
    visits: panel?.dataset.moodVisits ?? 'visits',
    dwell: panel?.dataset.moodDwell ?? 'dwell',
    verdict: panel?.dataset.moodVerdict ?? 'verdict',
    unknown: panel?.dataset.moodUnknown ?? 'unknown',
    phaseLabels: parsePhaseLabels(panel?.dataset.moodPhaseLabels),
  };
}
