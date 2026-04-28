/**
 * Boot-time env validation. Called once from instrumentation.ts.
 *
 * Strategy:
 *   - In production (NODE_ENV=production OR VERCEL_ENV in prod/preview):
 *     missing required vars THROW, the server refuses to boot. Better to
 *     fail loud at startup than 500 every request.
 *   - In dev/test: log a warning but don't crash. Lets the dev server boot
 *     with .env.local half-filled while you're iterating.
 *
 * Adding a new env var: put it in `requiredInProd` if the app cannot
 * function without it, in `optional` if there's a sensible fallback or
 * the feature is opt-in. Don't bypass the schema — `process.env.X` calls
 * scattered through the code stay, but the gate here is what catches
 * Phase 0 misconfiguration before it becomes a 500 in the wild.
 */
import { z } from 'zod';

const nonEmpty = z.string().trim().min(1);
const url = z.string().url();
const hex64 = z.string().regex(/^[0-9a-fA-F]{64}$/, '64 hex chars (32 bytes)');
const base64Key = z.string().regex(/^[A-Za-z0-9+/=_-]{40,}$/, 'base64 key');

// Vars that MUST be set when running in a deployed environment.
const requiredInProd = z.object({
  // Postgres (Neon)
  DATABASE_URI: nonEmpty,
  // Payload
  PAYLOAD_SECRET: hex64,
  PAYLOAD_INTERNAL_SECRET: hex64,
  // Auth.js v5
  AUTH_SECRET: hex64,
  AUTH_TRUST_HOST: z.literal('true'),
  ADMIN_EMAIL_ALLOWLIST: nonEmpty, // comma-separated; empty = locked closed (safe but unusable)
  // Cloudflare R2
  R2_ACCESS_KEY_ID: nonEmpty,
  R2_SECRET_ACCESS_KEY: nonEmpty,
  R2_BUCKET: nonEmpty,
  R2_ENDPOINT: url,
  // Per-brand publisher keys (Python pipeline → Payload)
  PUBLISHER_API_KEY_NUVOX_AI: nonEmpty,
  PUBLISHER_API_KEY_NUVOX_SPACE: nonEmpty,
  PUBLISHER_API_KEY_NUVOX_WORLD: nonEmpty,
  // Revalidate webhook (HMAC) — Python pipeline calls /api/revalidate
  REVALIDATE_HMAC_SECRET: hex64,
  // Resend (Auth.js magic-link, newsletter)
  RESEND_API_KEY: nonEmpty,
  // Subscriber email encryption (libsodium)
  SUBSCRIBER_ENCRYPTION_KEY: base64Key,
  // Cloudflare Turnstile
  TURNSTILE_SECRET: nonEmpty,
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: nonEmpty,
  // Upstash Redis (rate limit + WebAuthn challenge store)
  UPSTASH_REDIS_REST_URL: url,
  UPSTASH_REDIS_REST_TOKEN: nonEmpty,
  // Public site URL (used for absolute URLs everywhere)
  NEXT_PUBLIC_SITE_URL: url,
});

// Vars that *can* be unset in production — features degrade gracefully.
const optional = z.object({
  // YouTube Data API (homepage feeds — site works without it, just no YT data)
  YOUTUBE_API_KEY: z.string().optional(),
  BRAND_NUVOX_AI_YT_CHANNEL_ID: z.string().optional(),
  BRAND_NUVOX_SPACE_YT_CHANNEL_ID: z.string().optional(),
  BRAND_NUVOX_WORLD_YT_CHANNEL_ID: z.string().optional(),
  // Sentry (server can run without it, exceptions just won't be reported)
  SENTRY_DSN: z.string().optional(),
  NEXT_PUBLIC_SENTRY_DSN: z.string().optional(),
  SENTRY_AUTH_TOKEN: z.string().optional(),
  // Newsletter HMAC — falls back to PAYLOAD_INTERNAL_SECRET if absent
  NEWSLETTER_HMAC_SECRET: hex64.optional(),
  // Migration script (set transiently during one-shot Ghost → Payload import)
  MIGRATION_TOKEN: z.string().optional(),
  PAYLOAD_API_URL: url.optional(),
  NUVOXAI_DB_PATH: z.string().optional(),
  // Penpot (design tokens sync — opt-in)
  PENPOT_API_URL: url.optional(),
  PENPOT_TOKEN: z.string().optional(),
  PENPOT_FILE_ID: z.string().optional(),
});

const schema = requiredInProd.merge(optional);

export type Env = z.infer<typeof schema>;

// Map each var → which Phase 0 provider produces it. Lets us print a
// helpful "go set this up at <provider>" hint instead of just "missing X".
const providerHints: Record<string, string> = {
  DATABASE_URI: 'Neon Postgres (pooled connection string)',
  PAYLOAD_SECRET: 'generate locally: openssl rand -hex 32',
  PAYLOAD_INTERNAL_SECRET: 'generate locally: openssl rand -hex 32',
  AUTH_SECRET: 'generate locally: openssl rand -hex 32',
  AUTH_TRUST_HOST: 'set to literal string "true" for Vercel/proxied envs',
  ADMIN_EMAIL_ALLOWLIST: 'your owner email(s), comma-separated. Empty = sign-in disabled',
  R2_ACCESS_KEY_ID: 'Cloudflare R2 → API tokens → S3 token for nuvoxsaga-public bucket',
  R2_SECRET_ACCESS_KEY: 'paired with R2_ACCESS_KEY_ID',
  R2_BUCKET: 'Cloudflare R2 bucket name (default: nuvoxsaga-public)',
  R2_ENDPOINT: 'Cloudflare R2 → bucket → S3 API → endpoint URL',
  PUBLISHER_API_KEY_NUVOX_AI: 'Payload /admin → Users → create publisher_nuvox_ai → API Key tab',
  PUBLISHER_API_KEY_NUVOX_SPACE: 'Payload /admin → Users → create publisher_nuvox_space → API Key tab',
  PUBLISHER_API_KEY_NUVOX_WORLD: 'Payload /admin → Users → create publisher_nuvox_world → API Key tab',
  REVALIDATE_HMAC_SECRET: 'generate locally: openssl rand -hex 32 (also store in Python keyring)',
  RESEND_API_KEY: 'Resend dashboard → API Keys (verify domain DKIM first)',
  SUBSCRIBER_ENCRYPTION_KEY: 'generate locally: node -e "console.log(require(\'crypto\').randomBytes(32).toString(\'base64\'))"',
  TURNSTILE_SECRET: 'Cloudflare → Turnstile → site → secret key',
  NEXT_PUBLIC_TURNSTILE_SITE_KEY: 'Cloudflare → Turnstile → site → site key',
  UPSTASH_REDIS_REST_URL: 'Upstash → Redis DB → REST URL',
  UPSTASH_REDIS_REST_TOKEN: 'Upstash → Redis DB → REST token',
  NEXT_PUBLIC_SITE_URL: 'https://nuvoxsaga.com (or your Vercel preview URL)',
};

let cached: Env | null = null;

export function validateEnv(): Env {
  if (cached) return cached;

  const isDeployed =
    process.env.NODE_ENV === 'production' ||
    process.env.VERCEL_ENV === 'production' ||
    process.env.VERCEL_ENV === 'preview';

  const result = schema.safeParse(process.env);

  if (!result.success) {
    const issues = result.error.issues.map((iss) => {
      const key = String(iss.path[0] ?? '?');
      const hint = providerHints[key];
      return `  - ${key}: ${iss.message}${hint ? `  [${hint}]` : ''}`;
    });
    const msg = `Env validation failed:\n${issues.join('\n')}`;
    if (isDeployed) {
      // Fail loud — refuse to boot rather than 500 every request.
      throw new Error(msg);
    }
    // Dev: log and continue with raw process.env.
    // eslint-disable-next-line no-console
    console.warn(`[env] ${msg}\n[env] continuing in dev mode — set these in .env.local before deploying`);
    cached = process.env as unknown as Env;
    return cached;
  }

  cached = result.data;
  return cached;
}
