import type { CollectionConfig } from 'payload';

/**
 * Users — Payload's auth collection.
 *
 * Two roles:
 *   - admin     full Payload admin access; protected by Auth.js v5 magic-link + WebAuthn (Phase 5)
 *   - publisher API-key only; per-brand scope, drafts only, set by Python pipeline
 *
 * Per-brand publisher tokens are 3 separate user records — one per brand —
 * each with role=publisher and brandScope=<brand>. This limits blast radius
 * if a single token leaks (only that brand's posts can be created).
 */
export const Users: CollectionConfig = {
  slug: 'users',
  labels: { singular: 'User', plural: 'Users' },
  // Avoids collision with Auth.js pg-adapter's `users` table — Payload writes
  // to `payload_users` instead. Slug stays `users` for API/admin URLs.
  dbName: 'payload_users',
  auth: {
    useAPIKey: true,
    tokenExpiration: 60 * 60 * 8, // 8h max session
    maxLoginAttempts: 5,
    lockTime: 15 * 60 * 1000, // 15min lock after 5 fails
    cookies: {
      sameSite: 'Lax',
      secure: true,
    },
  },
  admin: {
    useAsTitle: 'email',
    defaultColumns: ['email', 'role', 'brandScope', 'mfaVerified'],
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: ({ req }) => req.user?.role === 'admin',
    update: ({ req }) => req.user?.role === 'admin',
    delete: ({ req }) => req.user?.role === 'admin',
  },
  fields: [
    {
      name: 'role',
      type: 'select',
      required: true,
      defaultValue: 'publisher',
      options: [
        { label: 'Admin (full)', value: 'admin' },
        { label: 'Publisher (per-brand API only)', value: 'publisher' },
      ],
    },
    {
      // Limits a publisher token to one brand. Admin role ignores this.
      name: 'brandScope',
      type: 'select',
      options: [
        { label: 'Nuvox AI', value: 'nuvox_ai' },
        { label: 'Nuvox Space', value: 'nuvox_space' },
        { label: 'Nuvox World', value: 'nuvox_world' },
      ],
      admin: {
        description: 'For publisher role only. Admin role ignores this.',
        condition: (data: { role?: string }) => data?.role === 'publisher',
      },
    },
    { name: 'mfaVerified', type: 'checkbox', defaultValue: false },
    { name: 'mfaSecret', type: 'text', admin: { hidden: true } },
    /**
     * WebAuthn user handle — opaque random 64-byte ID, base64url-encoded.
     * Generated on first MFA enrolment, stable across credential rotations.
     * Per WebAuthn §4: MUST NOT be derived from PII (email, etc).
     */
    {
      name: 'webauthnUserHandle',
      type: 'text',
      admin: { hidden: true, description: 'Opaque WebAuthn user handle (random)' },
    },
    { name: 'lastLoginAt', type: 'date', admin: { readOnly: true } },
    { name: 'lastLoginIp', type: 'text', admin: { readOnly: true } },
  ],
};
