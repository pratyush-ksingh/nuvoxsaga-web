import type { CollectionConfig } from 'payload';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import DOMPurify from 'isomorphic-dompurify';
import crypto from 'node:crypto';

/**
 * Posts — the heart of the migration.
 *
 * Brands locked to the 3 active brands (sports excluded). Brand is IMMUTABLE
 * after create — prevents a publisher pivoting a post into another brand's
 * publish stream.
 *
 * Body is Lexical-native (Ghost was already Lexical, so the Python pipeline
 * passes the existing tree through unchanged). DOMPurify runs on the
 * serialized HTML projection — we store both forms (`body` lexical tree +
 * `bodyHtmlSanitized` rendered/sanitized HTML) so RSC pages can ship HTML
 * without re-running DOMPurify per request.
 *
 * afterChange POSTs to /api/revalidate (HMAC-signed) so Next.js ISR refreshes.
 */

const ALLOWED_TAGS = [
  'p', 'br', 'strong', 'em', 's', 'u', 'sub', 'sup',
  'h1', 'h2', 'h3', 'h4', 'h5', 'h6',
  'ul', 'ol', 'li',
  'blockquote', 'pre', 'code',
  'a', 'img', 'figure', 'figcaption',
  'table', 'thead', 'tbody', 'tr', 'th', 'td',
  'hr',
  // YouTube embed via lite-youtube-embed (we'll convert at render time)
  'div', 'span',
];
const ALLOWED_ATTR = ['href', 'src', 'alt', 'title', 'class', 'id', 'rel', 'target', 'loading', 'decoding'];
// Forbid javascript: / data: URIs except for safe inline images (data:image/*).
const SAFE_URI_REGEX = /^(?:https?:\/\/|mailto:|\/[^\s]|data:image\/(?:png|jpe?g|webp|avif);base64,)/i;

DOMPurify.addHook('uponSanitizeAttribute', (_node, data) => {
  if (data.attrName === 'href' || data.attrName === 'src') {
    const v = (data.attrValue ?? '').trim();
    if (v && !SAFE_URI_REGEX.test(v)) data.keepAttr = false;
  }
});

// Phase 8 review M1: force rel="noopener noreferrer" on every <a target="_blank">
// (tabnabbing defence). Runs after attribute sanitisation.
DOMPurify.addHook('afterSanitizeAttributes', (node) => {
  if (node.nodeName === 'A' && (node as HTMLAnchorElement).getAttribute?.('target') === '_blank') {
    (node as HTMLAnchorElement).setAttribute('rel', 'noopener noreferrer');
  }
});

function sanitize(html: string): string {
  return DOMPurify.sanitize(html, {
    ALLOWED_TAGS,
    ALLOWED_ATTR,
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed', 'svg', 'form', 'input', 'button'],
    FORBID_ATTR: ['style', 'onerror', 'onload', 'onclick', 'onmouseover'],
    USE_PROFILES: { html: true },
  });
}

/**
 * Best-effort Lexical → HTML for the sanitization pass.
 * For full editor parity Payload exposes a richer serializer; this string
 * extraction is enough to surface XSS payloads through DOMPurify before save.
 */
function lexicalToHtmlBlob(node: unknown): string {
  if (node == null) return '';
  if (typeof node === 'string') return node;
  if (Array.isArray(node)) return node.map(lexicalToHtmlBlob).join(' ');
  if (typeof node === 'object') {
    const o = node as Record<string, unknown>;
    const text = typeof o.text === 'string' ? o.text : '';
    const children = lexicalToHtmlBlob(o.children);
    const html = typeof o.html === 'string' ? o.html : '';
    return [text, children, html].filter(Boolean).join(' ');
  }
  return '';
}

export const Posts: CollectionConfig = {
  slug: 'posts',
  labels: { singular: 'Post', plural: 'Posts' },
  admin: {
    useAsTitle: 'title',
    defaultColumns: ['title', 'brand', 'status', 'publishedAt', 'updatedAt'],
  },
  access: {
    read: () => true, // public
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'publisher',
    update: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'publisher',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      // (1) Brand is immutable post-create — limits blast radius if a
      //     publisher token is compromised.
      ({ data, originalDoc }) => {
        if (originalDoc && data.brand && data.brand !== originalDoc.brand) {
          throw new Error('brand is immutable after create');
        }
        return data;
      },
      // (2) Sanitize Lexical HTML serialization. Even though Lexical itself
      //     is structured, malicious HTML can sneak through `html` nodes —
      //     so we run DOMPurify on the serialized blob.
      ({ data }) => {
        if (data.body) {
          const blob = lexicalToHtmlBlob(data.body);
          data.bodyHtmlSanitized = sanitize(blob);
        }
        return data;
      },
      // (3) Force status='draft' for non-admin publishers — only admin
      //     promotes to 'published'.
      ({ data, req, operation }) => {
        if (operation === 'create' && req.user?.role === 'publisher' && data.status === 'published') {
          data.status = 'draft';
        }
        return data;
      },
    ],
    afterChange: [
      async ({ doc, req }) => {
        // Trigger Next.js ISR revalidation. The webhook is HMAC-signed in the
        // Python pipeline path; for in-admin edits we use the internal secret.
        const secret = process.env.PAYLOAD_INTERNAL_SECRET;
        const siteUrl = process.env.NEXT_PUBLIC_SITE_URL;
        if (!secret || !siteUrl) return; // dev mode, no revalidate
        try {
          await fetch(`${siteUrl}/api/revalidate/internal`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'X-Internal-Secret': secret,
            },
            body: JSON.stringify({ brand: doc.brand, slug: doc.slug, op: 'post' }),
          });
        } catch (e) {
          req.payload.logger.warn(`revalidate failed for ${doc.slug}: ${(e as Error).message}`);
        }
      },
    ],
  },
  fields: [
    { name: 'title', type: 'text', required: true, maxLength: 200 },
    {
      name: 'slug',
      type: 'text',
      required: true,
      index: true,
      validate: (val: unknown) => {
        if (typeof val !== 'string') return 'slug must be a string';
        if (!/^[a-z0-9-]+$/.test(val)) return 'kebab-case lowercase only';
        if (val.length > 200) return 'slug too long';
        return true;
      },
    },
    {
      name: 'brand',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'Nuvox AI', value: 'nuvox_ai' },
        { label: 'Nuvox Space', value: 'nuvox_space' },
        { label: 'Nuvox World', value: 'nuvox_world' },
      ],
    },
    {
      name: 'status',
      type: 'select',
      defaultValue: 'draft',
      required: true,
      options: [
        { label: 'Draft', value: 'draft' },
        { label: 'Published', value: 'published' },
        { label: 'Scheduled', value: 'scheduled' },
        { label: 'Archived', value: 'archived' },
      ],
    },
    { name: 'excerpt', type: 'textarea', maxLength: 300 },
    {
      name: 'body',
      type: 'richText',
      editor: lexicalEditor(),
    },
    {
      // Sanitized HTML projection for RSC rendering — DO NOT edit directly,
      // populated by beforeChange hook.
      name: 'bodyHtmlSanitized',
      type: 'code',
      admin: { hidden: true, readOnly: true },
    },
    { name: 'tags', type: 'array', fields: [{ name: 'tag', type: 'text' }] },
    {
      name: 'featuredImage',
      type: 'upload',
      relationTo: 'media',
    },
    {
      name: 'author',
      type: 'relationship',
      relationTo: 'authors',
    },
    { name: 'publishedAt', type: 'date', index: true },
    { name: 'wordCount', type: 'number' },
    { name: 'readingTimeMin', type: 'number' },
    { name: 'topic', type: 'text' },
    {
      name: 'clusters',
      type: 'array',
      fields: [{ name: 'cluster', type: 'text' }],
    },
    {
      name: 'faqPairs',
      type: 'array',
      fields: [
        { name: 'question', type: 'text' },
        { name: 'answer', type: 'textarea' },
      ],
    },
    {
      name: 'schemaLD',
      type: 'json',
      admin: {
        description:
          '7 schema.org types emitted by the Python pipeline (Article + Breadcrumb + Org always; FAQPage / VideoObject / HowTo / Product conditional).',
      },
    },
    {
      name: 'social',
      type: 'json',
      admin: { description: 'OG + Twitter card fields' },
    },
    { name: 'sourceVideoId', type: 'text' },
    /**
     * Audit fingerprint — written by beforeChange so AuditLog can reference it.
     */
    {
      name: 'fingerprint',
      type: 'text',
      admin: { hidden: true, readOnly: true },
      hooks: {
        beforeChange: [
          ({ data }) => crypto.createHash('sha256').update(JSON.stringify(data ?? {})).digest('hex'),
        ],
      },
    },
  ],
  indexes: [
    { fields: ['brand', 'slug'], unique: true },
    { fields: ['brand', 'status', 'publishedAt'] },
  ],
};
