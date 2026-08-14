import dns from 'dns';

// Blocks requests to loopback/private/link-local/reserved address space —
// used to gate every asset request the screenshot-render endpoint's headless
// browser makes, since the page content it renders comes from an untrusted
// customer site (a DOM snapshot can reference any URL, including ones that
// resolve to internal infrastructure like the cloud metadata endpoint).
// Checks the RESOLVED IP, not just the hostname string, because a hostname an
// attacker controls can be pointed at an internal IP via DNS (rebinding).

function isPrivateIPv4(ip: string): boolean {
  const parts = ip.split('.').map(Number);
  if (parts.length !== 4 || parts.some((p) => Number.isNaN(p) || p < 0 || p > 255)) return true; // malformed → reject
  const [a, b] = parts;
  if (a === 127) return true; // loopback
  if (a === 10) return true; // private
  if (a === 172 && b >= 16 && b <= 31) return true; // private
  if (a === 192 && b === 168) return true; // private
  if (a === 169 && b === 254) return true; // link-local incl. cloud metadata (169.254.169.254)
  if (a === 0) return true; // "this network"
  if (a === 100 && b >= 64 && b <= 127) return true; // shared address space (CGNAT)
  if (a >= 224) return true; // multicast (224-239) + reserved (240-255)
  return false;
}

function isPrivateIPv6(ip: string): boolean {
  const lower = ip.toLowerCase();
  if (lower === '::1') return true; // loopback
  if (lower.startsWith('fe8') || lower.startsWith('fe9') || lower.startsWith('fea') || lower.startsWith('feb')) return true; // fe80::/10 link-local
  if (lower.startsWith('fc') || lower.startsWith('fd')) return true; // fc00::/7 unique local
  if (lower.startsWith('ff')) return true; // multicast
  // IPv4-mapped (::ffff:a.b.c.d) — check the embedded IPv4 address too
  const mapped = lower.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
  if (mapped) return isPrivateIPv4(mapped[1]);
  return false;
}

export async function isSafeFetchTarget(rawUrl: string): Promise<boolean> {
  let url: URL;
  try {
    url = new URL(rawUrl);
  } catch {
    return false;
  }
  if (url.protocol !== 'http:' && url.protocol !== 'https:') return false;

  try {
    const results = await dns.promises.lookup(url.hostname, { all: true, verbatim: true });
    if (results.length === 0) return false;
    return results.every((r) => (r.family === 4 ? !isPrivateIPv4(r.address) : !isPrivateIPv6(r.address)));
  } catch {
    return false; // DNS failure → treat as unsafe rather than letting the request through
  }
}
