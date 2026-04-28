import type { CollectionConfig } from 'payload';

/**
 * Brands — read-only seed of the 3 brands. Source of truth is
 * `lib/brands.ts` (codegen from `core/brand_config.py`).
 *
 * This collection exists for: dashboard widgets, admin browsability,
 * and any future per-brand override config that doesn't belong in
 * the Python source.
 *
 * Created/updated by `scripts/seed-brands.ts` — admin can edit display
 * fields but the IDs/slugs are locked to the 3 codegen values.
 */
export const Brands: CollectionConfig = {
  slug: 'brands',
  labels: { singular: 'Brand', plural: 'Brands' },
  admin: {
    useAsTitle: 'name',
    defaultColumns: ['id', 'name', 'slug', 'niche'],
    description: 'Source of truth: lib/brands.ts (codegen). Seed via scripts/seed-brands.ts.',
  },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: () => false, // never deleted
  },
  fields: [
    {
      name: 'brandId',
      type: 'select',
      required: true,
      unique: true,
      options: [
        { label: 'Nuvox AI', value: 'nuvox_ai' },
        { label: 'Nuvox Space', value: 'nuvox_space' },
        { label: 'Nuvox World', value: 'nuvox_world' },
      ],
    },
    { name: 'name', type: 'text', required: true },
    { name: 'slug', type: 'text', required: true, unique: true, index: true },
    { name: 'handle', type: 'text', required: true },
    { name: 'niche', type: 'text', required: true },
    {
      name: 'palette',
      type: 'group',
      fields: [
        { name: 'primary', type: 'text', required: true },
        { name: 'cyan', type: 'text', required: true },
        { name: 'purple', type: 'text', required: true },
        { name: 'gold', type: 'text', required: true },
        { name: 'dark', type: 'text', required: true },
        { name: 'card', type: 'text', required: true },
        { name: 'overlay', type: 'text', required: true },
      ],
    },
    {
      name: 'youtubeChannelId',
      type: 'text',
      admin: { description: 'Set via env var, displayed for ops visibility' },
    },
  ],
};
