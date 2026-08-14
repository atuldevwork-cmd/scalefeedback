/** @type {import('next').NextConfig} */
const nextConfig = {
  // Prevent Next.js from bundling these packages into serverless functions
  // (puppeteer ships with a ~300MB Chromium binary; @sparticuz/chromium downloads at runtime)
  experimental: {
    serverComponentsExternalPackages: ['puppeteer', 'puppeteer-core', '@sparticuz/chromium', 'cheerio'],
    // Ensures the vendored rrweb-snapshot bundle ships in the deployed
    // function's filesystem — it's only reached via a runtime fs.readFileSync,
    // which Vercel's build-time file tracer won't pick up on its own.
    outputFileTracingIncludes: {
      '/api/render-snapshot/route': ['./lib/vendor/**'],
    },
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '*.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  async headers() {
    return [
      // ── Security headers for all dashboard/app routes ───────────────────────
      {
        source: '/:path*',
        headers: [
          { key: 'X-Content-Type-Options',  value: 'nosniff' },
          { key: 'X-Frame-Options',          value: 'SAMEORIGIN' },
          { key: 'Referrer-Policy',          value: 'strict-origin-when-cross-origin' },
          { key: 'Permissions-Policy',       value: 'geolocation=(), microphone=(), camera=()' },
          { key: 'X-DNS-Prefetch-Control',   value: 'on' },
        ],
      },
      // ── Widget feedback submission — must allow cross-origin from any site ──
      {
        source: '/api/feedback',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type, x-api-key' },
        ],
      },
      // ── Widget config — must allow cross-origin reads ────────────────────────
      {
        source: '/api/widget-config',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'GET, OPTIONS' },
        ],
      },
      // ── Widget server-side screenshot render — cross-origin from any site ──
      {
        source: '/api/render-snapshot',
        headers: [
          { key: 'Access-Control-Allow-Origin',  value: '*' },
          { key: 'Access-Control-Allow-Methods', value: 'POST, OPTIONS' },
          { key: 'Access-Control-Allow-Headers', value: 'Content-Type' },
        ],
      },
    ];
  },
};

export default nextConfig;
