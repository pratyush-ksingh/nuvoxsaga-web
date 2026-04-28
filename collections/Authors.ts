import type { CollectionConfig } from 'payload';

export const Authors: CollectionConfig = {
  slug: 'authors',
  labels: { singular: 'Author', plural: 'Authors' },
  admin: { useAsTitle: 'name', defaultColumns: ['name', 'slug'] },
  access: {
    read: () => true,
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    { name: 'name', type: 'text', required: true },
    {
      name: 'slug',
      type: 'text',
      required: true,
      unique: true,
      validate: (val: unknown) => {
        if (typeof val !== 'string') return 'slug must be a string';
        return /^[a-z0-9-]+$/.test(val) || 'kebab-case lowercase only';
      },
    },
    { name: 'avatar', type: 'upload', relationTo: 'media' },
    { name: 'bio', type: 'textarea' },
    { name: 'twitter', type: 'text' },
    { name: 'github', type: 'text' },
  ],
};
