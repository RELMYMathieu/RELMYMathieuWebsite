const VISITS_KEY = 'mood:visits';
const LAST_KEY = 'mood:last';
const COUNTED_KEY = 'mood:counted';
const PREV_KEY = 'mood:prev';

export interface Visit {
  count: number;
  previous: number | null;
}

let memo: Visit | null = null;

function toTimestamp(raw: string | null): number | null {
  const value = Number(raw ?? '');
  return Number.isFinite(value) && value > 0 ? value : null;
}

function resolve(): Visit {
  const now = Date.now();
  const stored = Number(localStorage.getItem(VISITS_KEY) ?? '0');
  const base = Number.isFinite(stored) && stored > 0 ? Math.trunc(stored) : 0;

  if (sessionStorage.getItem(COUNTED_KEY) === '1') {
    return { count: Math.max(1, base), previous: toTimestamp(sessionStorage.getItem(PREV_KEY)) };
  }

  const previous = toTimestamp(localStorage.getItem(LAST_KEY));
  sessionStorage.setItem(PREV_KEY, previous === null ? '' : String(previous));
  sessionStorage.setItem(COUNTED_KEY, '1');
  localStorage.setItem(LAST_KEY, String(now));
  localStorage.setItem(VISITS_KEY, String(base + 1));

  return { count: base + 1, previous };
}

export function getVisit(): Visit {
  if (memo) return memo;
  try {
    memo = resolve();
  } catch {
    memo = { count: 1, previous: null };
  }
  return memo;
}
