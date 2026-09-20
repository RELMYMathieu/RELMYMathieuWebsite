export interface SystemInfo {
  os: string;
  browser: string;
  cpu: string;
  gpu: string;
  memory: string;
  screen: string;
  lang: string;
}

function guessOS(ua: string): string {
  if (/Windows/.test(ua)) return 'Windows';
  if (/Mac OS X/.test(ua)) return 'macOS';
  if (/Android/.test(ua)) return 'Android';
  if (/iPhone|iPad|iOS/.test(ua)) return 'iOS';
  if (/Linux/.test(ua)) return 'Linux';
  return 'unknown';
}

function guessBrowser(ua: string): string {
  if (/Edg\//.test(ua)) return 'Edge';
  if (/Firefox\//.test(ua)) return 'Firefox';
  if (/Chrome\//.test(ua) && !/Chromium/.test(ua)) return 'Chrome';
  if (/Safari\//.test(ua) && !/Chrome/.test(ua)) return 'Safari';
  return 'unknown';
}

export function collectSystemInfo(): SystemInfo {
  const nav = navigator as Navigator & {
    userAgentData?: { platform?: string; brands?: { brand: string; version: string }[] };
    deviceMemory?: number;
  };

  let os = 'unknown';
  try {
    os = nav.userAgentData?.platform || guessOS(navigator.userAgent);
  } catch {}

  let browser = 'unknown';
  try {
    const brands = nav.userAgentData?.brands;
    const brand = brands?.find((b) => !/Not.*Brand/i.test(b.brand)) ?? brands?.[brands.length - 1];
    browser = brand ? `${brand.brand} ${brand.version}` : guessBrowser(navigator.userAgent);
  } catch {}

  let cpu = 'unknown';
  try {
    cpu = navigator.hardwareConcurrency ? `${navigator.hardwareConcurrency} threads` : 'unknown';
  } catch {}

  let memory = 'unknown';
  try {
    memory = nav.deviceMemory ? `${nav.deviceMemory} GB (approx)` : 'unknown';
  } catch {}

  let gpu = 'unknown';
  try {
    const canvas = document.createElement('canvas');
    const gl = (canvas.getContext('webgl') ?? canvas.getContext('experimental-webgl')) as WebGLRenderingContext | null;
    const ext = gl?.getExtension('WEBGL_debug_renderer_info');
    const renderer = ext ? gl?.getParameter(ext.UNMASKED_RENDERER_WEBGL) : undefined;
    if (typeof renderer === 'string' && renderer) gpu = renderer;
  } catch {}

  let screen = 'unknown';
  try {
    screen = `${window.screen.width}x${window.screen.height} @${window.devicePixelRatio}x`;
  } catch {}

  let lang = 'unknown';
  try {
    lang = navigator.language || 'unknown';
  } catch {}

  return { os, browser, cpu, gpu, memory, screen, lang };
}
