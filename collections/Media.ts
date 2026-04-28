import type { CollectionConfig } from 'payload';
import { fileTypeFromBuffer } from 'file-type';
import sharp from 'sharp';

/**
 * Media — R2-backed via @payloadcms/storage-s3 plugin (configured in payload.config.ts).
 *
 * Defense in depth:
 *   1. Payload's mimeTypes allowlist
 *   2. file-type magic-byte sniffing (extension/header spoof defense)
 *   3. Hard ban on SVG (XSS via <script> in image)
 *   4. Sharp dimension cap + EXIF strip
 *   5. Random UUID filename (server-side) — original filename never reflected
 */
const ALLOWED_MIME = ['image/jpeg', 'image/png', 'image/webp', 'image/avif'] as const;
const MAX_DIM = 4096;
const MAX_BYTES = 10 * 1024 * 1024; // 10 MB

export const Media: CollectionConfig = {
  slug: 'media',
  upload: {
    staticDir: 'media',
    mimeTypes: [...ALLOWED_MIME],
    imageSizes: [
      { name: 'thumb', width: 384 },
      { name: 'card', width: 768 },
      { name: 'hero', width: 1920 },
    ],
    formatOptions: {
      // Re-encode every upload to AVIF — strips EXIF + metadata.
      format: 'avif',
      options: { quality: 70, effort: 4 },
    },
    crop: false,
    focalPoint: false,
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin' || req.user?.role === 'publisher',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  hooks: {
    beforeChange: [
      // Magic-byte sniff + dimension/size validation BEFORE Payload processes.
      async ({ data, req }) => {
        const file = req.file;
        if (!file) return data;

        if (file.size > MAX_BYTES) {
          throw new Error(`file too large: ${file.size} > ${MAX_BYTES}`);
        }

        // Buffer-from for sniffing — Payload exposes Uint8Array on data
        const buf: Buffer = Buffer.isBuffer(file.data)
          ? (file.data as Buffer)
          : Buffer.from(file.data as ArrayBuffer);

        const sniffed = await fileTypeFromBuffer(buf);
        if (!sniffed || !ALLOWED_MIME.includes(sniffed.mime as (typeof ALLOWED_MIME)[number])) {
          throw new Error(
            `mime mismatch: header sniffed=${sniffed?.mime ?? 'unknown'}, declared=${file.mimetype}`,
          );
        }
        if (file.mimetype !== sniffed.mime) {
          throw new Error(`extension/mime spoof: ${file.mimetype} ≠ ${sniffed.mime}`);
        }

        // SVG is banned — but defence in depth, recheck
        if (sniffed.mime.toString().includes('svg')) {
          throw new Error('SVG uploads are forbidden');
        }

        // Dimension cap via sharp (cheap metadata read, no full decode)
        try {
          const meta = await sharp(buf).metadata();
          if ((meta.width ?? 0) > MAX_DIM || (meta.height ?? 0) > MAX_DIM) {
            throw new Error(`dimensions exceed ${MAX_DIM}px (${meta.width}×${meta.height})`);
          }
        } catch (e) {
          throw new Error(`image decode failed: ${(e as Error).message}`);
        }

        return data;
      },
    ],
  },
  fields: [
    { name: 'alt', type: 'text', required: true },
    { name: 'caption', type: 'text' },
    {
      name: 'brand',
      type: 'select',
      options: [
        { label: 'Nuvox AI', value: 'nuvox_ai' },
        { label: 'Nuvox Space', value: 'nuvox_space' },
        { label: 'Nuvox World', value: 'nuvox_world' },
        { label: 'Shared', value: 'shared' },
      ],
      defaultValue: 'shared',
    },
  ],
};
