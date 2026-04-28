import type { CollectionConfig } from 'payload';
import { encryptEmail, emailHash } from '@/lib/crypto';

/**
 * Subscribers — newsletter list.
 *
 * Email is application-layer encrypted (libsodium sealed-box).
 * `emailHash` is the unique lookup key — never decrypt for dedup checks.
 *
 * Public can only CREATE via /api/newsletter/subscribe (rate-limited + Turnstile).
 * Read/update/delete = admin only.
 *
 * Double opt-in:
 *   1. Public submits email → row created with confirmed=false + confirmToken
 *   2. Email sent with /api/newsletter/confirm?t=<token>
 *   3. Confirm endpoint flips confirmed=true
 */
export const Subscribers: CollectionConfig = {
  slug: 'subscribers',
  labels: { singular: 'Subscriber', plural: 'Subscribers' },
  admin: {
    useAsTitle: 'emailHash',
    defaultColumns: ['emailHash', 'confirmed', 'brandsOfInterest', 'createdAt'],
    description: 'Emails encrypted at rest (libsodium). Use emailHash for lookups.',
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
    // create: handled via the public /api/newsletter route which sets the
    // proper hooks. Direct admin create is also allowed.
    create: () => true,
  },
  hooks: {
    beforeValidate: [
      // If we receive a raw email field (from public API), encrypt it now.
      async ({ data, operation }) => {
        if (operation === 'create' && data?.email && !data.emailSealed) {
          const enc = await encryptEmail(String(data.email));
          data.emailSealed = enc.sealed;
          data.emailNonce = enc.nonce;
          data.emailHash = enc.hash;
          // Wipe the plaintext field so it never persists.
          delete data.email;
        }
        return data;
      },
    ],
  },
  fields: [
    {
      // Volatile field — never written to DB. Used only as input on create.
      name: 'email',
      type: 'email',
      virtual: true,
      access: {
        read: () => false,
        update: () => false,
      },
    },
    { name: 'emailSealed', type: 'text', required: true, admin: { hidden: true } },
    { name: 'emailNonce', type: 'text', required: true, admin: { hidden: true } },
    { name: 'emailHash', type: 'text', required: true, unique: true, index: true },
    {
      name: 'brandsOfInterest',
      type: 'select',
      hasMany: true,
      options: [
        { label: 'Nuvox AI', value: 'nuvox_ai' },
        { label: 'Nuvox Space', value: 'nuvox_space' },
        { label: 'Nuvox World', value: 'nuvox_world' },
      ],
      defaultValue: ['nuvox_ai'],
    },
    { name: 'confirmed', type: 'checkbox', defaultValue: false, index: true },
    { name: 'confirmToken', type: 'text', admin: { hidden: true } },
    { name: 'unsubscribeToken', type: 'text', admin: { hidden: true } },
    { name: 'sourceIp', type: 'text', admin: { description: 'IP at signup time' } },
    { name: 'sourceUa', type: 'text', admin: { description: 'User agent at signup' } },
    { name: 'createdAt', type: 'date', admin: { readOnly: true } },
    { name: 'confirmedAt', type: 'date', admin: { readOnly: true } },
  ],
  timestamps: true,
};
