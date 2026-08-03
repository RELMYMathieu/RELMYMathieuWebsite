interface Env {
  SPOTIFY_CLIENT_ID: string;
  SPOTIFY_CLIENT_SECRET: string;
  SPOTIFY_REFRESH_TOKEN: string;
  ALLOWED_ORIGINS?: string;
}

type PlaybackState = 'playing' | 'paused' | 'last' | 'idle';

interface NowPlayingPayload {
  state: PlaybackState;
  title?: string;
  artist?: string;
  album?: string;
  url?: string;
  progressMs?: number;
  durationMs?: number;
  playedAt?: string;
  ageMs?: number;
}

interface SpotifyTrack {
  name?: string;
  duration_ms?: number;
  album?: { name?: string };
  artists?: { name?: string }[];
  external_urls?: { spotify?: string };
}

const DEFAULT_ORIGINS = ['https://relmymathieu.me', 'http://localhost:4321'];
const CACHE_SECONDS = 5;

let token: { value: string; expiresAt: number } | null = null;
let refreshToken: string | null = null;

let payloadCache: { at: number; payload: NowPlayingPayload } | null = null;

function allowedOrigins(env: Env): string[] {
  const configured = env.ALLOWED_ORIGINS?.split(',').map((o) => o.trim()).filter(Boolean);
  return configured?.length ? configured : DEFAULT_ORIGINS;
}

function corsHeaders(request: Request, env: Env): Record<string, string> {
  const origin = request.headers.get('Origin');
  const allowed = allowedOrigins(env);
  if (!origin || !allowed.includes(origin)) return {};
  return {
    'Access-Control-Allow-Origin': origin,
    'Vary': 'Origin',
  };
}

function json(body: unknown, request: Request, env: Env, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: {
      'content-type': 'application/json; charset=utf-8',
      'cache-control': `public, max-age=${CACHE_SECONDS}`,
      ...corsHeaders(request, env),
    },
  });
}

class ReauthRequired extends Error {}

async function getAccessToken(env: Env): Promise<string> {
  if (token && Date.now() < token.expiresAt) return token.value;

  const credentials = btoa(`${env.SPOTIFY_CLIENT_ID}:${env.SPOTIFY_CLIENT_SECRET}`);
  const res = await fetch('https://accounts.spotify.com/api/token', {
    method: 'POST',
    headers: {
      authorization: `Basic ${credentials}`,
      'content-type': 'application/x-www-form-urlencoded',
    },
    body: new URLSearchParams({
      grant_type: 'refresh_token',
      refresh_token: refreshToken ?? env.SPOTIFY_REFRESH_TOKEN,
    }),
  });

  const data = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    refresh_token?: string;
    error?: string;
  };

  if (res.status === 400 && data.error === 'invalid_grant') {
    throw new ReauthRequired('refresh token expired or revoked');
  }
  if (!res.ok) throw new Error(`token refresh failed: ${res.status}`);
  if (!data.access_token) throw new Error('token refresh returned no access_token');

  if (data.refresh_token) refreshToken = data.refresh_token;

  const ttlMs = (data.expires_in ?? 3600) * 1000;
  token = { value: data.access_token, expiresAt: Date.now() + ttlMs - 60_000 };
  return token.value;
}

function trackPayload(track: SpotifyTrack, state: PlaybackState): NowPlayingPayload {
  return {
    state,
    title: track.name,
    artist: track.artists?.map((a) => a.name).filter(Boolean).join(', ') || undefined,
    album: track.album?.name,
    url: track.external_urls?.spotify,
    durationMs: track.duration_ms,
  };
}

async function currentlyPlaying(accessToken: string): Promise<NowPlayingPayload | null> {
  const res = await fetch('https://api.spotify.com/v1/me/player/currently-playing', {
    headers: { authorization: `Bearer ${accessToken}` },
  });

  if (res.status === 204) return null;
  if (!res.ok) throw new Error(`currently-playing failed: ${res.status}`);

  const data = (await res.json()) as {
    is_playing?: boolean;
    progress_ms?: number;
    currently_playing_type?: string;
    item?: SpotifyTrack | null;
  };

  if (!data.item || data.currently_playing_type !== 'track') return null;

  return {
    ...trackPayload(data.item, data.is_playing ? 'playing' : 'paused'),
    progressMs: data.progress_ms,
  };
}

async function recentlyPlayed(accessToken: string): Promise<NowPlayingPayload | null> {
  const res = await fetch('https://api.spotify.com/v1/me/player/recently-played?limit=1', {
    headers: { authorization: `Bearer ${accessToken}` },
  });
  if (!res.ok) throw new Error(`recently-played failed: ${res.status}`);

  const data = (await res.json()) as {
    items?: { track?: SpotifyTrack; played_at?: string }[];
  };

  const entry = data.items?.[0];
  if (!entry?.track) return null;

  return { ...trackPayload(entry.track, 'last'), playedAt: entry.played_at };
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    if (request.method === 'OPTIONS') {
      return new Response(null, {
        status: 204,
        headers: {
          ...corsHeaders(request, env),
          'Access-Control-Allow-Methods': 'GET, OPTIONS',
          'Access-Control-Max-Age': '86400',
        },
      });
    }

    if (request.method !== 'GET') {
      return json({ error: 'method not allowed' }, request, env, 405);
    }

    try {
      const fresh = payloadCache && Date.now() - payloadCache.at < CACHE_SECONDS * 1000;
      if (!fresh) {
        const accessToken = await getAccessToken(env);
        const payload =
          (await currentlyPlaying(accessToken)) ?? (await recentlyPlayed(accessToken));
        payloadCache = { at: Date.now(), payload: payload ?? { state: 'idle' } };
      }

      const entry = payloadCache!;
      return json({ ...entry.payload, ageMs: Date.now() - entry.at }, request, env);
    } catch (err) {
      console.error(err);
      if (err instanceof ReauthRequired) {
        return json({ error: 'reauth_required' }, request, env, 401);
      }
      return json({ error: 'upstream unavailable' }, request, env, 502);
    }
  },
};
