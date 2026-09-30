import type { NextConfig } from 'next';

/**
 * Static export for Cloudflare Pages (see infra/STATIC_CLOUDFLARE_PLAN.md).
 *
 * `next build` writes plain files to ./out — no server runs in production.
 * Security headers (HSTS, CSP, X-Frame, ...) cannot be set from here in export mode;
 * they live in public/_headers, which Cloudflare Pages applies to every response.
 * The newsletter endpoints are Cloudflare Pages Functions in ./functions.
 */
const nextConfig: NextConfig = {
  output: 'export',

  reactStrictMode: true,

  // No image-optimisation server exists in a static export. Images are pre-encoded
  // WebP sets (components/Picture.tsx, public/media).
  images: { unoptimized: true },

  productionBrowserSourceMaps: false,
};

export default nextConfig;
