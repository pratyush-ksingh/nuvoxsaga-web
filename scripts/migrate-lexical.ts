/**
 * Body-shape conversion for the SQLite → Payload post migration.
 *
 * Ghost-stored posts in nuvoxai.db are *already Lexical JSON* — wrapping them
 * as a single {type:'html'} node would flatten inline marks/links and break
 * the editor on round-trip. Plain HTML strings (older posts) still need the
 * single-node wrap. `toBody` detects which is which and does the right thing.
 *
 * Lives in scripts/ so it stays out of the runtime bundle. Imported by both
 * scripts/migrate-posts-from-sqlite.ts and tests/migrate-lexical.test.ts.
 */

export interface LexicalRoot {
  root: {
    type: 'root';
    children: unknown[];
    direction?: unknown;
    format?: unknown;
    indent?: unknown;
    version?: unknown;
  };
}

export function isLexicalRoot(value: unknown): value is LexicalRoot {
  if (!value || typeof value !== 'object') return false;
  const v = value as { root?: unknown };
  if (!v.root || typeof v.root !== 'object') return false;
  const r = v.root as { type?: unknown; children?: unknown };
  return r.type === 'root' && Array.isArray(r.children);
}

export function toBody(html: string): unknown {
  // (1) Pass-through path — content_html that's actually serialised Lexical
  // JSON. Skipping this branch was the original migration's silent-corruption
  // bug: every Ghost post (which used Lexical natively) would have been
  // flattened into a single-html-node tree, losing inline structure.
  if (html) {
    try {
      const parsed = JSON.parse(html);
      if (isLexicalRoot(parsed)) return parsed;
    } catch {
      // not JSON — fall through to wrap path
    }
  }
  // (2) Wrap path — bare HTML string into a minimal Lexical tree.
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
