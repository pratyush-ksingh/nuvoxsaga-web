/**
 * Middleware — Edge runtime
 *
 * Responsibilities (in order):
 *   1. Per-request CSP nonce generation (script-src 'nonce-XXX' 'strict-dynamic')
 *   2. Rate limit on /api/posts, /api/newsletter, /api/auth, /api/youtube
 *   3. Admin route gate (Phase 5 wires Auth.js — for now /admin is reachable; v0.1 stub)
 *
 * Notes:
 *   - CSP is REPORT-ONLY for the first 48h after launch (Phase 11 → enforce).
 *   - Upstash env can be missing in local dev — middleware no-ops gracefully.
 *   - /admin is disabled on preview deploys via VERCEL_ENV check.
 */
import NextAuth from 'next-auth';
import { NextRequest, NextResponse } from 'next/server';
import { Ratelimit } from '@upstash/ratelimit';
import { Redis } from '@upstash/redis';
import authConfig from '@/app/(auth)/auth.config';

// Edge-safe auth — no provider modules, JWT-only.
const { auth } = NextAuth(authConfig);

// ---------------------------------------------------------------------------
// Lazy Upstash client — no-op if env missing (dev mode without creds)
// ---------------------------------------------------------------------------
let limits:
  | {
      posts: Ratelimit;
      newsletter: Ratelimit;
      auth: Ratelimit;
      yt: Ratelimit;
      revalidate: Ratelimit;
    }
  | null = null;

function getLimits() {
  if (limits) return limits;
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;
  const redis = new Redis({ url, token });
  limits = {
    // Per-token (publisher) write — generous; tightens at API level if abused.
    posts: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'rl:posts' }),
    // Newsletter: brute-force gate against email enumeration + Resend bill bomb.
    newsletter: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(3, '1 h'), prefix: 'rl:nl' }),
    // Magic-link / signin: brute force gate.
    auth: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(5, '1 m'), prefix: 'rl:auth' }),
    // YouTube edge proxy — protect quota.
    yt: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(60, '1 m'), prefix: 'rl:yt' }),
    // Revalidate webhook — flood protection BEFORE HMAC compute. Prevents a
    // signature-fail flood from thrashing the cache + Upstash QPS.
    // Phase 6 review H1.
    revalidate: new Ratelimit({ redis, limiter: Ratelimit.slidingWindow(30, '1 m'), prefix: 'rl:rev' }),
  };
  return limits;
}

function getClientIp(req: NextRequest): string {
  const xff = req.headers.get('x-forwarded-for');
  if (xff) return xff.split(',')[0].trim();
  const real = req.headers.get('x-real-ip');
  if (real) return real;
  return '127.0.0.1';
}

// ---------------------------------------------------------------------------
// CSP — strict, nonce-based, report-only for first 48h
// ---------------------------------------------------------------------------
function buildCsp(nonce: string): string {
  const isDev = process.env.NODE_ENV === 'development';
  const directives: string[] = [
    `default-src 'self'`,
    // 'strict-dynamic' lets nonce'd scripts load further scripts without re-listing.
    // 'wasm-unsafe-eval' required for @react-three/rapier WASM (/labs page).
    // Phase 9 review M1.
    `script-src 'self' 'nonce-${nonce}' 'strict-dynamic' 'wasm-unsafe-eval' ${isDev ? `'unsafe-eval'` : ''}`,
    `style-src 'self' 'unsafe-inline'`, // Tailwind's runtime CSS — Phase 10 explores tightening.
    `img-src 'self' data: blob: https://media.nuvoxsaga.com https://i.ytimg.com https://yt3.ggpht.com`,
    `media-src 'self' https://media.nuvoxsaga.com`,
    `font-src 'self' data:`,
    `connect-src 'self' https://*.neon.tech https://*.upstash.io https://*.sentry.io ${
      isDev ? 'ws: http://localhost:*' : ''
    }`,
    `frame-src https://www.youtube-nocookie.com`,
    `worker-src 'self' blob:`, // gaussian-splats-3d + rapier wasm spawn workers
    `object-src 'none'`,
    `base-uri 'self'`,
    `form-action 'self'`,
    `frame-ancestors 'none'`,
    `upgrade-insecure-requests`,
  ];
  return directives.filter(Boolean).join('; ');
}

// ---------------------------------------------------------------------------
// Main handler
// ---------------------------------------------------------------------------
export async function middleware(req: NextRequest) {
  const path = req.nextUrl.pathname;
  const ip = getClientIp(req);

  // -- Rate limiting (only on protected /api/* routes) --
  const lim = getLimits();
  if (lim) {
    const bucket = path.startsWith('/api/posts')
      ? lim.posts
      : path.startsWith('/api/newsletter')
        ? lim.newsletter
        : path.startsWith('/api/auth')
          ? lim.auth
          : path.startsWith('/api/youtube')
            ? lim.yt
            : path === '/api/revalidate' // public webhook ONLY (not /internal)
              ? lim.revalidate
              : null;
    if (bucket) {
      const { success, limit, remaining, reset } = await bucket.limit(ip);
      if (!success) {
        return new NextResponse('Too Many Requests', {
          status: 429,
          headers: {
            'Retry-After': String(Math.ceil((reset - Date.now()) / 1000)),
            'X-RateLimit-Limit': String(limit),
            'X-RateLimit-Remaining': String(remaining),
          },
        });
      }
    }
  }

  // -- /admin gate — Auth.js v5 session + WebAuthn MFA --
  if (path.startsWith('/admin')) {
    // Hard disable on preview deploys — prevents preview-URL admin sniffing.
    if (process.env.VERCEL_ENV === 'preview') {
      return new NextResponse('Admin disabled on preview', { status: 403 });
    }

    const session = await auth();

    // (1) No session → redirect to /login
    if (!session?.user) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('next', path);
      return NextResponse.redirect(loginUrl);
    }

    // (2) Session exists but role wrong → 403
    // @ts-expect-error -- augmented in auth.ts callbacks
    const role: string | undefined = session.user.role;
    if (role !== 'admin') {
      return new NextResponse('Forbidden', { status: 403 });
    }

    // (3) MFA not yet enrolled → force enrolment, but allow /admin/setup-mfa
    // @ts-expect-error -- session.user is augmented in auth.config.ts callbacks
    const mfaVerified: boolean | undefined = session.user.mfaVerified;
    if (!mfaVerified && !path.startsWith('/admin/setup-mfa')) {
      return NextResponse.redirect(new URL('/admin/setup-mfa', req.url));
    }

    // (4) Session age check — force re-auth if older than 8h (sticky safety net
    //     beyond Auth.js's own maxAge).
    // @ts-expect-error -- session.user is augmented in auth.config.ts callbacks
    const mintedAt: number | undefined = session.user.mintedAt;
    if (typeof mintedAt === 'number' && Date.now() / 1000 - mintedAt > 8 * 60 * 60) {
      const loginUrl = new URL('/login', req.url);
      loginUrl.searchParams.set('expired', '1');
      return NextResponse.redirect(loginUrl);
    }
  }

  // -- Per-request CSP nonce --
  const nonce = crypto.randomUUID().replace(/-/g, '');
  const csp = buildCsp(nonce);

  // Pass nonce to RSC so <Script nonce={nonce} /> can pick it up.
  const reqHeaders = new Headers(req.headers);
  reqHeaders.set('x-nonce', nonce);

  const res = NextResponse.next({ request: { headers: reqHeaders } });

  // Report-only for first 48h post-launch — Phase 11 toggles to enforced.
  // To enforce: change header name to 'Content-Security-Policy'.
  res.headers.set('Content-Security-Policy-Report-Only', csp);
  res.headers.set('x-nonce', nonce);

  return res;
}

export const config = {
  // Run middleware on everything except static assets + Next internals.
  // Note: must include /api/* and /admin/* explicitly.
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|banners/|logos/|faces/|3d/|shaders/|.*\\.(?:avif|webp|png|jpg|jpeg|svg|glb|ksplat|riv|woff2?)$).*)',
  ],
};
