/**
 * One-shot migration: copy published posts from nuvoxai.db (SQLite, the
 * youtube-ai-system store) into Payload (Neon Postgres via REST).
 *
 * What this does:
 *   1. Opens ../youtube-ai-system/nuvoxai.db.
 *   2. Selects rows WHERE status='published' AND brand_id != 'nuvox_sports'
 *      AND (payload_id IS NULL OR payload_id = '')   ← idempotent
 *   3. Transforms each row to Payload Posts shape (Lexical body, schemaLD,
 *      social, faqPairs, clusters).
 *   4. POSTs to PAYLOAD_API_URL/posts using MIGRATION_TOKEN (admin-role API key).
 *   5. Writes payload_id back to nuvoxai.db (re-runnable).
 *
 * SINGLE-OPERATOR ONLY. Idempotency relies on `payload_id IS NULL` — running
 * concurrently on two machines will double-publish until Payload's
 * (brand,slug) unique constraint rejects the second. Don't co-pilot this.
 *
 * SECURITY:
 *   - Never run with NODE_DEBUG=fetch — undici's verbose mode logs request
 *     headers (Authorization included). All catch blocks scrub to .message.
 *   - MIGRATION_TOKEN should be a freshly-generated admin API key in Payload
 *     /admin/users — DELETE the user after migration completes.
 *
 * Required env:
 *   PAYLOAD_API_URL          e.g. https://nuvoxsaga.com/api
 *   MIGRATION_TOKEN          one-time admin API key (delete after migration)
 *   NUVOXAI_DB_PATH          path to nuvoxai.db (default: ../youtube-ai-system/nuvoxai.db)
 *
 * Run:
 *   npx tsx scripts/migrate-posts-from-sqlite.ts
 *   npx tsx scripts/migrate-posts-from-sqlite.ts --dry-run
 *   npx tsx scripts/migrate-posts-from-sqlite.ts --limit 5
 */
import Database from 'better-sqlite3';
import path from 'node:path';
import { existsSync } from 'node:fs';
import { randomUUID } from 'node:crypto';

const ALLOWED_BRANDS = new Set(['nuvox_ai', 'nuvox_space', 'nuvox_world']);

const args = process.argv.slice(2);
const DRY = args.includes('--dry-run');
const limitIdx = args.indexOf('--limit');
const LIMIT = limitIdx >= 0 ? parseInt(args[limitIdx + 1], 10) : 0;

const DB_PATH =
  process.env.NUVOXAI_DB_PATH ??
  path.resolve('..', 'youtube-ai-system', 'nuvoxai.db');
const API = process.env.PAYLOAD_API_URL;
const TOKEN = process.env.MIGRATION_TOKEN;

function fail(msg: string): never {
  console.error(`✗ ${msg}`);
  process.exit(1);
}

if (!existsSync(DB_PATH)) fail(`DB not found at ${DB_PATH}`);
if (!DRY) {
  if (!API) fail('PAYLOAD_API_URL not set');
  if (!TOKEN) fail('MIGRATION_TOKEN not set');
}

const db = new Database(DB_PATH, { readonly: false });

// Ensure migration columns exist (defence in depth — run.py already adds them).
try {
  db.exec(`ALTER TABLE blog_posts ADD COLUMN payload_id TEXT`);
} catch {
  /* already added */
}
try {
  db.exec(`ALTER TABLE blog_posts ADD COLUMN payload_url TEXT`);
} catch {
  /* already added */
}

interface Row {
  id: number;
  title: string;
  slug: string;
  brand_id: string | null;
  meta_description: string | null;
  content_html: string | null;
  tags: string | null;
  word_count: number | null;
  reading_time_min: number | null;
  topic: string | null;
  clusters: string | null;
  faq_pairs: string | null;
  source_video_id: string | null;
  published_at: string | null;
  payload_id: string | null;
}

const stmt = db.prepare<[], Row>(`
  SELECT id, title, slug, brand_id, meta_description, content_html, tags,
         word_count, reading_time_min, topic, clusters, faq_pairs,
         source_video_id, published_at, payload_id
    FROM blog_posts
   WHERE status = 'published'
     AND brand_id IS NOT NULL
     AND (payload_id IS NULL OR payload_id = '')
   ORDER BY published_at ASC
`);

const updateStmt = db.prepare<{ id: number; payload_id: string; payload_url: string }>(`
  UPDATE blog_posts SET payload_id = @payload_id, payload_url = @payload_url
   WHERE id = @id
`);

function toLexical(html: string): unknown {
  return {
    root: {
      children: [{ type: 'html', version: 1, html }],
      direction: null,
      format: '',
      indent: 0,
      type: 'root',
      version: 1,
    },
  };
}

function safeJSON<T>(s: string | null, fallback: T): T {
  if (!s) return fallback;
  try {
    return JSON.parse(s) as T;
  } catch {
    return fallback;
  }
}

function rowToPayload(r: Row) {
  const tags = safeJSON<string[]>(r.tags, []).filter((t) => typeof t === 'string');
  const clusters = safeJSON<string[]>(r.clusters, []).filter((c) => typeof c === 'string');
  const faq = safeJSON<{ question?: string; answer?: string }[]>(r.faq_pairs, []);
  return {
    title: r.title,
    slug: r.slug,
    brand: r.brand_id,
    status: 'published',
    excerpt: r.meta_description ?? '',
    body: toLexical(r.content_html ?? ''),
    tags: tags.map((t) => ({ tag: t })),
    wordCount: r.word_count ?? 0,
    readingTimeMin: r.reading_time_min ?? 0,
    topic: r.topic ?? '',
    clusters: clusters.map((c) => ({ cluster: c })),
    faqPairs: faq.map((p) => ({
      question: String(p.question ?? ''),
      answer: String(p.answer ?? ''),
    })),
    sourceVideoId: r.source_video_id ?? '',
    publishedAt: r.published_at ?? new Date().toISOString(),
  };
}

async function postOne(payloadDoc: ReturnType<typeof rowToPayload>) {
  const res = await fetch(`${API}/posts`, {
    method: 'POST',
    headers: {
      Authorization: `users API-Key ${TOKEN}`,
      'Content-Type': 'application/json',
      'X-Idempotency-Key': randomUUID(),
    },
    body: JSON.stringify(payloadDoc),
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`HTTP ${res.status}: ${text.slice(0, 200)}`);
  }
  const json = (await res.json()) as { doc?: { id?: string }; id?: string };
  const id = json.doc?.id ?? json.id;
  if (!id) throw new Error('response missing id');
  return String(id);
}

function publicUrl(brand: string, slug: string): string {
  const brandSlug = brand.replace(/^nuvox_/, 'nuvox');
  const host = (API ?? 'https://nuvoxsaga.com/api').replace(/\/api\/?$/, '');
  return `${host}/${brandSlug}/blog/${slug}`;
}

async function main() {
  const rows = stmt.all();
  const targets = rows.filter((r) => r.brand_id && ALLOWED_BRANDS.has(r.brand_id));
  const planned = LIMIT > 0 ? targets.slice(0, LIMIT) : targets;

  console.log(`Found ${rows.length} eligible · ${targets.length} after brand filter · processing ${planned.length}${DRY ? ' (DRY RUN)' : ''}`);

  let ok = 0;
  let fail = 0;
  for (const r of planned) {
    const doc = rowToPayload(r);
    if (DRY) {
      console.log(`  · would publish [${r.id}] ${r.brand_id} / ${r.slug}`);
      continue;
    }
    try {
      const payloadId = await postOne(doc);
      const url = publicUrl(String(r.brand_id), r.slug);
      updateStmt.run({ id: r.id, payload_id: payloadId, payload_url: url });
      console.log(`  ✓ [${r.id}] ${r.brand_id} / ${r.slug} → ${payloadId}`);
      ok++;
    } catch (e) {
      console.warn(`  ✗ [${r.id}] ${r.brand_id} / ${r.slug}: ${(e as Error).message}`);
      fail++;
    }
  }
  console.log(`Done · ok=${ok} fail=${fail}`);
  db.close();
  if (fail > 0) process.exit(2);
}

main().catch((e) => {
  // Scrub: error objects from fetch/undici can include header dumps under
  // verbose modes — log only the message, never the raw error or stack.
  console.error(`migration failed: ${(e as Error).message}`);
  process.exit(1);
});
