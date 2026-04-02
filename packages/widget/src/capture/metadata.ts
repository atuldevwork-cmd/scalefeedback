export interface BrowserMetadata {
  page_url: string;
  browser: string;
  os: string;
  screen_size: string;
  viewport_size: string;
  device_pixel_ratio: number;
  user_agent: string;
}

export function collectMetadata(): BrowserMetadata {
  const ua = navigator.userAgent;

  return {
    page_url: window.location.href,
    browser: getBrowserName(ua),
    os: getOSName(ua),
    screen_size: `${screen.width}x${screen.height}`,
    viewport_size: `${window.innerWidth}x${window.innerHeight}`,
    device_pixel_ratio: window.devicePixelRatio || 1,
    user_agent: ua,
  };
}

function getBrowserName(ua: string): string {
  if (ua.includes('Edg/')) return `Edge ${getVersion(ua, 'Edg/')}`;
  if (ua.includes('Chrome/')) return `Chrome ${getVersion(ua, 'Chrome/')}`;
  if (ua.includes('Firefox/')) return `Firefox ${getVersion(ua, 'Firefox/')}`;
  if (ua.includes('Safari/') && !ua.includes('Chrome')) return `Safari ${getVersion(ua, 'Version/')}`;
  return 'Unknown Browser';
}

function getOSName(ua: string): string {
  if (ua.includes('Windows NT 10.0')) return 'Windows 10/11';
  if (ua.includes('Windows NT')) return 'Windows';
  if (ua.includes('Mac OS X')) return `macOS ${getMacVersion(ua)}`;
  if (ua.includes('iPhone')) return 'iOS (iPhone)';
  if (ua.includes('iPad')) return 'iOS (iPad)';
  if (ua.includes('Android')) return `Android ${getVersion(ua, 'Android ')}`;
  if (ua.includes('Linux')) return 'Linux';
  return 'Unknown OS';
}

function getVersion(ua: string, prefix: string): string {
  const idx = ua.indexOf(prefix);
  if (idx === -1) return '';
  const rest = ua.substring(idx + prefix.length);
  const match = rest.match(/^[\d.]+/);
  return match ? match[0].split('.').slice(0, 2).join('.') : '';
}

function getMacVersion(ua: string): string {
  const match = ua.match(/Mac OS X ([\d_]+)/);
  if (!match) return '';
  return match[1].replace(/_/g, '.').split('.').slice(0, 2).join('.');
}
