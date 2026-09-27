/**
 * Build-time HTML sanitizer for post bodies.
 *
 * Same policy the Payload Posts collection enforced on save (collections/Posts.ts on
 * master), now applied while the static site is built. Post HTML comes from our own
 * pipeline, but it is LLM-written and includes text pulled from the web, so it is
 * still treated as untrusted: nothing reaches a page without passing through here.
 */
import 'server-only';
import DOMPurify from 'isomorphic-dompurify';

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
// Forbid javascript: / data: URIs except for safe inline images (data:image/*).
const SAFE_URI_REGEX = /^(?:https?:\/\/|mailto:|\/[^\s]|data:image\/(?:png|jpe?g|webp|avif);base64,)/i;

let hooksInstalled = false;

function installHooks(): void {
  if (hooksInstalled) return;
  hooksInstalled = true;
  DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
    if (data.attrName === 'href' || data.attrName === 'src') {
      const v = (data.attrValue ?? '').trim();
      if (v && !SAFE_URI_REGEX.test(v)) data.keepAttr = false;
    }
  });
  // Tabnabbing defence: every <a target="_blank"> gets rel="noopener noreferrer".
  DOMPurify.addHook('afterSanitizeAttributes', (node) => {
    if (node.nodeName === 'A' && (node as HTMLAnchorElement).getAttribute?.('target') === '_blank') {
      (node as HTMLAnchorElement).setAttribute('rel', 'noopener noreferrer');
    }
  });
}

export function sanitizePostHtml(html: string): string {
  installHooks();
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    // target on <a> is stripped by the html profile unless re-asserted here.
    ADD_ATTR: ['target'],
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'svg', 'form', 'input', 'button'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover'],
    USE_PROFILES: { html: true },
  });
}
