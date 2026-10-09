/**
 * public/_headers is one long line per header and a malformed directive degrades silently,
 * so the CSP is asserted here: the enforced policy is exactly today's, the Report-Only
 * policy is that policy plus Google's ad and consent origins, every Cloudflare, YouTube
 * and media origin survives in both, and no directive is empty or repeated.
 */
import fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';

const text = fs.readFileSync(path.join(__dirname, '..', 'public', '_headers'), 'utf8');

/** The headers of the `/*` block: `  Name: value` lines up to the next blank line. */
function siteHeaders(): Record<string, string> {
  const lines = text.split(/\r?\n/);
  const start = lines.indexOf('/*');
  expect(start).toBeGreaterThan(-1);
  const out: Record<string, string> = {};
  for (let i = start + 1; i < lines.length && lines[i].trim(); i++) {
    const m = lines[i].match(/^ {2}([A-Za-z-]+): (.+)$/);
    expect(m, `malformed header line: ${lines[i]}`).toBeTruthy();
    expect(out[m![1]], `header repeated: ${m![1]}`).toBeUndefined();
    out[m![1]] = m![2];
  }
  return out;
}

/** directive -> sources. Fails on an empty or repeated directive. */
function directives(policy: string): Map<string, string[]> {
  const map = new Map<string, string[]>();
  for (const part of policy.split(';')) {
    const tokens = part.trim().split(/\s+/).filter(Boolean);
    expect(tokens.length, `empty directive in: ${part}`).toBeGreaterThan(0);
    const [name, ...sources] = tokens;
    expect(name).toMatch(/^[a-z-]+$/);
    expect(map.has(name), `directive repeated: ${name}`).toBe(false);
    // upgrade-insecure-requests is the only valueless directive in use.
    if (name !== 'upgrade-insecure-requests') expect(sources.length, `${name} has no sources`).toBeGreaterThan(0);
    map.set(name, sources);
  }
  return map;
}

/** A source list allows an origin when it names it, or names its scheme (https:). */
function allows(sources: string[] | undefined, origin: string): boolean {
  if (!sources) return false;
  if (sources.includes(origin)) return true;
  return origin.startsWith('https://') && sources.includes('https:');
}

const ENFORCED_TODAY =
  "default-src 'self'; script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval' https://challenges.cloudflare.com https://static.cloudflareinsights.com; style-src 'self' 'unsafe-inline'; img-src 'self' data: blob: https://media.nuvoxsaga.com https://i.ytimg.com https://yt3.ggpht.com; media-src 'self' https://media.nuvoxsaga.com; font-src 'self' data:; connect-src 'self' https://cloudflareinsights.com; frame-src https://www.youtube-nocookie.com https://challenges.cloudflare.com; worker-src 'self' blob:; object-src 'none'; base-uri 'self'; form-action 'self'; frame-ancestors 'none'; upgrade-insecure-requests";

/** Every origin the site depends on today, per directive. Dropping one breaks a feature. */
const EXISTING: [string, string][] = [
  ['script-src', 'https://challenges.cloudflare.com'], // Turnstile
  ['script-src', 'https://static.cloudflareinsights.com'], // Web Analytics beacon
  ['script-src', "'wasm-unsafe-eval'"], // Pagefind
  ['script-src', "'unsafe-inline'"], // Next.js inline bootstrap, theme script
  ['connect-src', 'https://cloudflareinsights.com'],
  ['frame-src', 'https://www.youtube-nocookie.com'],
  ['frame-src', 'https://challenges.cloudflare.com'],
  ['img-src', 'https://media.nuvoxsaga.com'],
  ['img-src', 'https://i.ytimg.com'],
  ['img-src', 'https://yt3.ggpht.com'],
  ['img-src', 'data:'],
  ['img-src', 'blob:'],
  ['media-src', 'https://media.nuvoxsaga.com'],
  ['worker-src', 'blob:'],
  ['font-src', 'data:'],
];

/** Google's ad and consent origins (AdSense plan, Phase 4.2). */
const ADS: [string, string][] = [
  ['script-src', 'https://pagead2.googlesyndication.com'],
  ['script-src', 'https://tpc.googlesyndication.com'],
  ['script-src', 'https://googleads.g.doubleclick.net'],
  ['script-src', 'https://fundingchoicesmessages.google.com'],
  ['script-src', 'https://www.googletagservices.com'],
  ['script-src', 'https://partner.googleadservices.com'],
  ['script-src', 'https://*.adtrafficquality.google'],
  ['frame-src', 'https://googleads.g.doubleclick.net'],
  ['frame-src', 'https://tpc.googlesyndication.com'],
  ['frame-src', 'https://*.safeframe.googlesyndication.com'],
  ['frame-src', 'https://fundingchoicesmessages.google.com'],
  ['frame-src', 'https://*.adtrafficquality.google'],
  ['frame-src', 'https://www.google.com'],
  ['connect-src', 'https://pagead2.googlesyndication.com'],
  ['connect-src', 'https://googleads.g.doubleclick.net'],
  ['connect-src', 'https://tpc.googlesyndication.com'],
  ['connect-src', 'https://fundingchoicesmessages.google.com'],
  ['connect-src', 'https://ep1.adtrafficquality.google'],
  ['connect-src', 'https://ep2.adtrafficquality.google'],
  ['connect-src', 'https://csi.gstatic.com'],
  ['img-src', 'https:'],
  ['style-src', 'https://fundingchoicesmessages.google.com'],
];

describe('public/_headers', () => {
  const headers = siteHeaders();
  const enforced = headers['Content-Security-Policy'];
  const reportOnly = headers['Content-Security-Policy-Report-Only'];

  it('carries both policies, each on exactly one line', () => {
    expect(enforced).toBeTruthy();
    expect(reportOnly).toBeTruthy();
    expect(text.match(/^ {2}Content-Security-Policy: /gm)).toHaveLength(1);
    expect(text.match(/^ {2}Content-Security-Policy-Report-Only: /gm)).toHaveLength(1);
    for (const v of [enforced, reportOnly]) expect(v).not.toMatch(/[\r\n]/);
  });

  it('keeps the other security headers', () => {
    expect(headers['Strict-Transport-Security']).toContain('max-age=63072000');
    expect(headers['X-Frame-Options']).toBe('DENY');
    expect(headers['X-Content-Type-Options']).toBe('nosniff');
    expect(headers['Referrer-Policy']).toBe('strict-origin-when-cross-origin');
    expect(headers['Permissions-Policy']).toContain('camera=()');
  });

  it('leaves the enforced policy as it is today (the flip is a deliberate follow-up)', () => {
    expect(enforced).toBe(ENFORCED_TODAY);
  });

  it('has no empty or repeated directive in either policy', () => {
    for (const policy of [enforced, reportOnly]) {
      const d = directives(policy);
      expect(d.get('object-src')).toEqual(["'none'"]);
      expect(d.get('base-uri')).toEqual(["'self'"]);
      expect(d.get('frame-ancestors')).toEqual(["'none'"]);
      expect(d.has('upgrade-insecure-requests')).toBe(true);
      expect(policy).not.toContain("'unsafe-eval'");
    }
  });

  it('keeps every existing origin in both policies', () => {
    const e = directives(enforced);
    const r = directives(reportOnly);
    for (const [directive, origin] of EXISTING) {
      expect(allows(e.get(directive), origin), `enforced ${directive} lost ${origin}`).toBe(true);
      expect(allows(r.get(directive), origin), `report-only ${directive} lost ${origin}`).toBe(true);
    }
  });

  it('report-only is the enforced policy plus the AdSense and consent origins', () => {
    const e = directives(enforced);
    const r = directives(reportOnly);
    // A superset: every directive and source of the enforced policy is still there.
    for (const [directive, sources] of e) {
      expect(r.has(directive), `report-only lacks ${directive}`).toBe(true);
      for (const s of sources) expect(allows(r.get(directive), s), `report-only ${directive} lacks ${s}`).toBe(true);
    }
    for (const [directive, origin] of ADS) {
      expect(r.get(directive), `report-only ${directive} lacks ${origin}`).toContain(origin);
    }
    // Only https origins are added; no http:, no bare wildcard.
    for (const sources of r.values()) {
      for (const s of sources) expect(s).not.toMatch(/^(http:|\*$|https:\/\/\*$)/);
    }
  });
});
