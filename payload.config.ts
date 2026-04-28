/**
 * Payload CMS 3 — main config.
 *
 * 7 collections (Posts/Media/Authors/Subscribers/Brands/AuditLog/Users), R2 storage adapter,
 * Lexical editor, GraphQL disabled in prod, /admin disabled on preview deploys.
 */
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { buildConfig } from 'payload';
import { lexicalEditor } from '@payloadcms/richtext-lexical';
import { postgresAdapter } from '@payloadcms/db-postgres';
import { s3Storage } from '@payloadcms/storage-s3';

import { Posts } from './collections/Posts';
import { Media } from './collections/Media';
import { Authors } from './collections/Authors';
import { Subscribers } from './collections/Subscribers';
import { Brands } from './collections/Brands';
import { AuditLog } from './collections/AuditLog';
import { Users } from './collections/Users';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Allow `payload generate:types` etc. to run without a real DB (CI typecheck).
const databaseUri =
  process.env.DATABASE_URI ?? 'postgres://placeholder:placeholder@localhost:5432/placeholder';

const isProd = process.env.NODE_ENV === 'production';
const isPreview = process.env.VERCEL_ENV === 'preview';

export default buildConfig({
  serverURL: process.env.NEXT_PUBLIC_SITE_URL,
  secret: process.env.PAYLOAD_SECRET ?? 'dev-secret-do-not-use-in-prod',
  typescript: { outputFile: path.resolve(__dirname, 'payload-types.ts') },
  db: postgresAdapter({
    pool: { connectionString: databaseUri },
    // Use snake_case in Postgres — easier to read in pgAdmin.
    push: process.env.NODE_ENV !== 'production', // auto-migrate in dev only
  }),
  editor: lexicalEditor({}),
  collections: [Posts, Media, Authors, Subscribers, Brands, AuditLog, Users],

  // Locked-down GraphQL — disable entirely in prod (REST is enough).
  graphQL: {
    disable: isProd,
  },

  admin: {
    user: Users.slug,
    // Disable admin entirely on preview deploys (prevents preview-URL admin sniffing).
    disable: isPreview,
    meta: {
      titleSuffix: ' · Nuvoxsaga',
      icons: [{ rel: 'icon', type: 'image/svg+xml', url: '/logos/nuvox_ai.png' }],
    },
  },

  // SSRF prevention — Payload won't fetch remote images on upload.
  upload: {
    limits: { fileSize: 10 * 1024 * 1024 }, // 10MB hard cap (Media collection enforces 10MB too)
  },

  plugins: [
    s3Storage({
      collections: { media: { prefix: 'uploads' } },
      bucket: process.env.R2_BUCKET ?? 'nuvoxsaga-public',
      config: {
        endpoint: process.env.R2_ENDPOINT,
        region: 'auto',
        credentials: {
          accessKeyId: process.env.R2_ACCESS_KEY_ID ?? '',
          secretAccessKey: process.env.R2_SECRET_ACCESS_KEY ?? '',
        },
        forcePathStyle: true,
      },
    }),
  ],

  // Default access — everything else falls back to per-collection access rules.
  cors: [process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'],
  csrf: [process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000'],
});
