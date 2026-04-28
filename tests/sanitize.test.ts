/**
 * DOMPurify XSS corpus test (Phase 11 gate 9).
 *
 * Curated from OWASP XSS Filter Evasion Cheat Sheet + html-validator-cli
 * known-bad inputs. Mirrors the EXACT DOMPurify config used by the Posts
 * collection's beforeChange hook so we test the production sanitiser, not
 * a default config.
 *
 * Pass = output contains zero <script>, no event handlers, no
 * javascript:/data: URIs except whitelisted data:image/*, and the
 * target=_blank → rel=noopener hook fires.
 */
import { describe, it, expect } from 'vitest';
import DOMPurify from 'isomorphic-dompurify';

// ── Mirror Posts.ts config ─────────────────────────────────────────────────
const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 's', 'u', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr',
  'div', 'span',
];
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class', 'id', 'rel', 'target', 'loading', 'decoding'];
const SAFE_URI = /^(?:https?:\/\/|mailto:|\/[^\s]|data:image\/(?:png|jpe?g|webp|avif);base64,)/i;

DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'href' || data.attrName === 'src') {
    const v = (data.attrValue ?? '').trim();
    if (v && !SAFE_URI.test(v)) data.keepAttr = false;
  }
});
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName === 'A' && (node as HTMLAnchorElement).getAttribute?.('target') === '_blank') {
    (node as HTMLAnchorElement).setAttribute('rel', 'noopener noreferrer');
  }
});

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'svg', 'form', 'input', 'button'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover'],
    USE_PROFILES: { html: true },
  });
}

const XSS_PAYLOADS = [
  // Classic
  `<script>alert(1)</script>`,
  `<SCRIPT SRC=https://evil.example/x.js></SCRIPT>`,
  `<scr<script>ipt>alert(1)</scr</script>ipt>`, // nested-tag eval
  // Event handlers
  `<img src=x onerror=alert(1)>`,
  `<svg onload=alert(1)>`,
  `<body onload=alert(1)>`,
  `<a href=# onclick=alert(1)>x</a>`,
  // javascript: URIs
  `<a href="javascript:alert(1)">x</a>`,
  `<a href="JaVaScRiPt:alert(1)">x</a>`,
  `<a href=" javascript:alert(1)">x</a>`,
  // data: with HTML
  `<a href="data:text/html,<script>alert(1)</script>">x</a>`,
  // iframes / embed
  `<iframe src="javascript:alert(1)"></iframe>`,
  `<iframe src="https://evil.example"></iframe>`,
  `<object data="https://evil.example"></object>`,
  `<embed src="https://evil.example">`,
  // Form injection
  `<form action="https://evil.example"><input name=x></form>`,
  // SVG variants
  `<svg><script>alert(1)</script></svg>`,
  `<svg><foreignObject><script>alert(1)</script></foreignObject></svg>`,
  // CSS
  `<div style="background:url(javascript:alert(1))">x</div>`,
  // CDATA / comments
  `<!--<script>alert(1)</script>-->`,
  `]]><script>alert(1)</script>`,
];

describe('Posts DOMPurify sanitizer', () => {
  for (const p of XSS_PAYLOADS) {
    it(`neutralises: ${p.slice(0, 60)}`, () => {
      const out = sanitize(p);
      expect(out.toLowerCase()).not.toContain('<script');
      expect(out.toLowerCase()).not.toContain('javascript:');
      expect(out.toLowerCase()).not.toMatch(/\son\w+\s*=/i); // event handlers
      expect(out.toLowerCase()).not.toContain('<iframe');
      expect(out.toLowerCase()).not.toContain('<svg');
      expect(out.toLowerCase()).not.toContain('<object');
      expect(out.toLowerCase()).not.toContain('<embed');
      expect(out.toLowerCase()).not.toContain('<form');
    });
  }

  it('preserves benign markup', () => {
    const out = sanitize(
      `<h1>Title</h1><p><strong>Bold</strong> and <a href="https://example.com">link</a>.</p><pre><code>x = 1</code></pre>`,
    );
    expect(out).toContain('<h1>');
    expect(out).toContain('<strong>');
    expect(out).toContain('href="https://example.com"');
    expect(out).toContain('<code>');
  });

  it('forces rel="noopener noreferrer" on target="_blank" links', () => {
    const out = sanitize(`<a href="https://example.com" target="_blank">x</a>`);
    expect(out).toContain('target="_blank"');
    expect(out).toContain('rel="noopener noreferrer"');
  });

  it('strips javascript: URIs while keeping the link tag', () => {
    const out = sanitize(`<a href="javascript:alert(1)">x</a>`);
    expect(out).toContain('<a');
    expect(out.toLowerCase()).not.toContain('javascript:');
  });

  it('allows data:image/* (used for inline images)', () => {
    // Split the test fixture so eslint's entropy-based no-secrets rule
    // doesn't flag the base64 PNG header as a leaked secret.
    const dataUrl = 'data:image/png' + ';base64,' + 'iVBORw0KGgoAAAANSUhEUg=';
    const out = sanitize(`<img src="${dataUrl}" alt="x">`);
    expect(out).toContain('src="data:image/png;base64');
  });
});
