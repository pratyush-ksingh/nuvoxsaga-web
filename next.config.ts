import type { NextConfig } from 'next';
import { withPayload } from '@payloadcms/next/withPayload';
import { withSentryConfig } from '@sentry/nextjs';

/**
 * Security headers — STATIC only (HSTS, X-Frame, etc.).
 * CSP with per-request nonce is set in middleware.ts.
 *
 * Reviewed against OWASP Secure Headers Project + Mozilla Observatory.
 */
const securityHeaders = [
  // Force HTTPS for 2 years on this domain + subdomains. Submit to hstspreload.org after launch.
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains; preload',
  },
  // Block clickjacking. nuvoxsaga.com is never embedded.
  { key: 'X-Frame-Options', value: 'DENY' },
  // Disable MIME sniffing — pairs with file-type magic-byte check on uploads.
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  // Strict referrer — leak only origin, not path/query, on cross-origin nav.
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Browser feature policy — disable everything we don't use.
  {
    key: 'Permissions-Policy',
    value:
      'camera=(), microphone=(), geolocation=(), interest-cohort=(), payment=(), usb=(), midi=()',
  },
  // Cross-origin isolation — required for SharedArrayBuffer (some 3D libs benefit, but breaks some embeds; opt-in here).
  // { key: 'Cross-Origin-Opener-Policy', value: 'same-origin' },
  // { key: 'Cross-Origin-Embedder-Policy', value: 'require-corp' },
];

const nextConfig: NextConfig = {
  // React strict mode — surfaces R3F effect leaks early.
  reactStrictMode: true,

  // Use Payload's pages-side adapter (admin lives in same Next process).
  // serverExternalPackages prevents Payload's bundling conflicts.
  serverExternalPackages: ['payload', '@payloadcms/db-postgres'],

  // Image optimisation — only allow trusted hosts.
  images: {
    formats: ['image/avif', 'image/webp'],
    remotePatterns: [
      // Cloudflare R2 public bucket (custom domain we'll set up in Phase 0).
      { protocol: 'https', hostname: 'media.nuvoxsaga.com' },
      // YouTube thumbnails for video grids (lite-youtube-embed posters).
      { protocol: 'https', hostname: 'i.ytimg.com' },
      { protocol: 'https', hostname: 'yt3.ggpht.com' },
    ],
  },

  async headers() {
    return [
      {
        // Apply to every route. CSP added on top per-request in middleware.
        source: '/:path*',
        headers: securityHeaders,
      },
    ];
  },

  // Block source maps in production (we still upload to Sentry for stack-trace symbolication).
  productionBrowserSourceMaps: false,
};

// Sentry wraps OUTERMOST so its build plugin sees Payload's compiled output
// and can upload source maps + tunnel route. `silent: !process.env.CI` keeps
// local builds quiet; uploads only run when SENTRY_AUTH_TOKEN is set.
export default withSentryConfig(withPayload(nextConfig), {
  silent: !process.env.CI,
  widenClientFileUpload: true,
  tunnelRoute: '/monitoring',
  disableLogger: true,
  reactComponentAnnotation: { enabled: false },
});
