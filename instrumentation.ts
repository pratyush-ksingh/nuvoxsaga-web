/**
 * Sentry server + edge instrumentation + boot-time env validation.
 *
 * Loaded by Next.js automatically when present at the project root.
 * Sentry only initialises when SENTRY_DSN is set — silent in dev unless
 * SENTRY_FORCE_DEV=1. Env validation runs unconditionally and throws in
 * deployed environments if a required Phase 0 var is missing.
 *
 * beforeSend scrubs email / Authorization / cookie / set-cookie patterns
 * out of every event before it leaves the server.
 */
import * as Sentry from '@sentry/nextjs';
import { validateEnv } from './lib/env';

const DSN = process.env.SENTRY_DSN;
const FORCE_DEV = process.env.SENTRY_FORCE_DEV === '1';
const ENABLED = !!DSN && (process.env.NODE_ENV === 'production' || FORCE_DEV);

const SCRUB_KEYS = /(authorization|cookie|set-cookie|email|api-key|x-internal-secret)/i;
const SCRUB_VALUE_PATTERNS = [
  // bearer / api-key prefixes
  /Bearer\s+[A-Za-z0-9._\-+/=]+/g,
  /users API-Key\s+[A-Za-z0-9._\-+/=]+/g,
  // emails
  /\b[\w.+-]+@[\w-]+\.[\w.-]+\b/g,
  // postgres URLs
  /postgres(?:ql)?:\/\/[^\s"'<>]+/gi,
];

function scrubString(s: unknown): unknown {
  if (typeof s !== 'string') return s;
  let out = s;
  for (const re of SCRUB_VALUE_PATTERNS) out = out.replace(re, '[REDACTED]');
  return out;
}

function scrubObject<T extends object>(o: T, seen: WeakSet<object> = new WeakSet()): T {
  // Phase 11 review M-2: WeakSet cycle guard — Next.js request contexts
  // sometimes contain self-referencing objects; without this, beforeSend
  // crashes and the event is dropped silently.
  if (seen.has(o)) return o;
  seen.add(o);
  for (const k of Object.keys(o) as (keyof T)[]) {
    if (typeof k === 'string' && SCRUB_KEYS.test(k)) {
      (o as Record<string, unknown>)[k as string] = '[REDACTED]';
    } else if (typeof o[k] === 'string') {
      (o as Record<string, unknown>)[k as string] = scrubString(o[k] as unknown);
    } else if (o[k] && typeof o[k] === 'object') {
      scrubObject(o[k] as unknown as object, seen);
    }
  }
  return o;
}

export async function register() {
  // Validate Phase 0 vars first — refuses to boot in deployed envs if
  // required secrets are missing. In dev this only warns.
  validateEnv();

  if (!ENABLED) return;

  // Server (Node) and Edge use the same init shape with different SDKs in
  // @sentry/nextjs. Calling init in `register` covers both.
  Sentry.init({
    dsn: DSN,
    environment: process.env.VERCEL_ENV ?? process.env.NODE_ENV,
    release: process.env.VERCEL_GIT_COMMIT_SHA ?? 'local',
    tracesSampleRate: process.env.NODE_ENV === 'production' ? 0.1 : 0,
    sendDefaultPii: false,
    beforeSend(event) {
      // Phase 11 review M-1: also scrub the most common leak vectors —
      // exception .value/.type strings (the thrown Error message), the
      // top-level event.message, event.user (if any code calls setUser),
      // and stack-frame `vars` (off by default but cheap to defend).
      if (event.request?.headers) scrubObject(event.request.headers);
      if (event.tags) scrubObject(event.tags);
      if (event.extra) scrubObject(event.extra);
      if (event.contexts) scrubObject(event.contexts as unknown as object);
      if (event.user) scrubObject(event.user);
      if (event.message) event.message = scrubString(event.message) as string;
      if (event.exception?.values) {
        for (const v of event.exception.values) {
          if (v.value) v.value = scrubString(v.value) as string;
          if (v.type) v.type = scrubString(v.type) as string;
          for (const f of v.stacktrace?.frames ?? []) {
            const fv = (f as { vars?: Record<string, unknown> }).vars;
            if (fv) scrubObject(fv);
          }
        }
      }
      if (Array.isArray(event.breadcrumbs)) {
        for (const b of event.breadcrumbs) {
          if (b.message) b.message = scrubString(b.message) as string;
          if (b.data) scrubObject(b.data);
        }
      }
      return event;
    },
  });
}

// Edge runtime hook — Next.js calls this for edge errors.
export const onRequestError: typeof Sentry.captureRequestError = Sentry.captureRequestError;
