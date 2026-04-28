/**
 * Penpot → Style Dictionary → Tailwind v4 @theme token sync.
 *
 * Pipeline:
 *   1. Penpot REST API: GET /api/rpc/command/get-tokens?file-id=$PENPOT_FILE_ID
 *   2. Transform W3C-spec response → Style Dictionary input format
 *   3. Style Dictionary CLI generates tokens/build/tailwind.css
 *   4. globals.css imports it via @import "../tokens/build/tailwind.css"
 *
 * SAFETY:
 *   - If PENPOT_TOKEN or PENPOT_FILE_ID env vars are missing, this script
 *     no-ops with a warning — used during pre-Phase-0 builds where Penpot
 *     isn't yet provisioned.
 *   - The Penpot response is stored at tokens/raw/penpot.json — diff-able
 *     and committed so an outage doesn't break builds.
 *   - If the Penpot fetch fails, the script falls back to the last
 *     committed tokens/raw/penpot.json instead of blowing up the build.
 *
 * Usage:
 *   npx tsx scripts/sync-tokens.ts          # fetch + transform
 *   npx tsx scripts/sync-tokens.ts --dry    # show what would change
 *   npx tsx scripts/sync-tokens.ts --offline  # use cached tokens/raw only
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const args = process.argv.slice(2);
const DRY = args.includes('--dry');
const OFFLINE = args.includes('--offline');

// SECURITY: Token-bearing requests only go to allowlisted hosts. An attacker
// who controls CI env mustn't be able to redirect our Authorization header
// to their server. Phase 7 review M2.
const PENPOT_API_ALLOWLIST = new Set([
  'https://design.penpot.app/api',
  'https://design.penpot.dev/api', // self-hosted dev env, opt-in
]);
const PENPOT_API = process.env.PENPOT_API_URL ?? 'https://design.penpot.app/api';
if (!PENPOT_API_ALLOWLIST.has(PENPOT_API)) {
  throw new Error(`PENPOT_API_URL not on allowlist: ${PENPOT_API}`);
}
const TOKEN = process.env.PENPOT_TOKEN;
const FILE_ID = process.env.PENPOT_FILE_ID;

const RAW_PATH = path.resolve('tokens/raw/penpot.json');
const SD_INPUT = path.resolve('tokens/raw/sd-input.json');
const OUT_DIR = path.resolve('tokens/build');

function ensure(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

interface PenpotToken {
  name: string;
  value: string;
  type?: string;
}
interface PenpotResponse {
  tokens?: PenpotToken[];
}

async function fetchPenpot(): Promise<PenpotResponse | null> {
  if (!TOKEN || !FILE_ID) {
    console.warn(
      '⚠ PENPOT_TOKEN or PENPOT_FILE_ID missing — skipping fetch, using cached tokens/raw/penpot.json',
    );
    return null;
  }
  try {
    const res = await fetch(`${PENPOT_API}/rpc/command/get-tokens?file-id=${encodeURIComponent(FILE_ID)}`, {
      headers: { Authorization: `Token ${TOKEN}` },
    });
    if (!res.ok) {
      throw new Error(`HTTP ${res.status}`);
    }
    return (await res.json()) as PenpotResponse;
  } catch (e) {
    console.warn(`⚠ Penpot fetch failed: ${(e as Error).message} — falling back to cache`);
    return null;
  }
}

function readCached(): PenpotResponse | null {
  if (!existsSync(RAW_PATH)) return null;
  try {
    return JSON.parse(readFileSync(RAW_PATH, 'utf8')) as PenpotResponse;
  } catch {
    return null;
  }
}

/**
 * Transform a Penpot W3C-spec token list into Style Dictionary input shape.
 * Penpot tokens come back roughly:  { name: 'color.brand.primary', value: '#00B4FF', type: 'color' }
 * Style Dictionary wants nested objects.
 */
function toStyleDictionary(tokens: PenpotToken[]): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const t of tokens) {
    if (typeof t.name !== 'string' || typeof t.value !== 'string') continue;
    const parts = t.name.split('.');
    let cursor: Record<string, unknown> = out;
    for (let i = 0; i < parts.length - 1; i++) {
      const k = parts[i];
      if (!cursor[k] || typeof cursor[k] !== 'object') cursor[k] = {};
      cursor = cursor[k] as Record<string, unknown>;
    }
    cursor[parts[parts.length - 1]] = { value: t.value, type: t.type ?? 'color' };
  }
  return out;
}

async function main() {
  ensure(path.dirname(RAW_PATH));
  ensure(OUT_DIR);

  let resp: PenpotResponse | null = null;
  if (!OFFLINE) resp = await fetchPenpot();
  if (!resp) resp = readCached();
  if (!resp || !resp.tokens?.length) {
    console.warn('⚠ no tokens available (no env, no cache) — sync is a no-op');
    return;
  }

  // Persist the raw Penpot response (diff-able in git)
  if (!DRY) {
    writeFileSync(RAW_PATH, JSON.stringify(resp, null, 2));
    console.log(`✓ wrote ${RAW_PATH}`);
  }

  const sd = toStyleDictionary(resp.tokens);
  if (!DRY) {
    writeFileSync(SD_INPUT, JSON.stringify(sd, null, 2));
    console.log(`✓ wrote ${SD_INPUT}`);
  }

  // We do NOT shell out to style-dictionary here — the CLI is invoked as a
  // separate npm script that consumes SD_INPUT. This keeps this script
  // pure-fetch and lets style-dictionary's config (style-dictionary.config.js)
  // be the single source of truth for output format.
  console.log('Next step: npx style-dictionary build  (config in style-dictionary.config.js)');
  console.log(`Will produce: ${path.join(OUT_DIR, 'tailwind.css')}`);
}

main().catch((e) => {
  console.error(`token sync failed: ${(e as Error).message}`);
  process.exit(1);
});
