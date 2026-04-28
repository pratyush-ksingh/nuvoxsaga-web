import type { CollectionConfig } from 'payload';

/**
 * AuditLog — write-only mutation log. Admin-readable only.
 *
 * Populated by Payload's built-in `afterChange` / `afterDelete` hooks
 * applied globally in payload.config.ts via the audit-log helper. We can
 * also write directly from custom routes (e.g., login attempts).
 */
export const AuditLog: CollectionConfig = {
  slug: 'audit-log',
  labels: { singular: 'Audit Log Entry', plural: 'Audit Log' },
  admin: {
    useAsTitle: 'action',
    defaultColumns: ['action', 'collection', 'docId', 'userEmail', 'createdAt'],
    description: 'Append-only mutation log. Cannot be edited or deleted.',
  },
  access: {
    read: ({ req }) => req.user?.role === 'admin',
    create: () => true, // server-side hooks
    update: () => false,
    delete: () => false,
  },
  fields: [
    {
      name: 'action',
      type: 'select',
      required: true,
      index: true,
      options: [
        { label: 'create', value: 'create' },
        { label: 'update', value: 'update' },
        { label: 'delete', value: 'delete' },
        { label: 'login', value: 'login' },
        { label: 'login_fail', value: 'login_fail' },
        { label: 'mfa_setup', value: 'mfa_setup' },
        { label: 'token_use', value: 'token_use' },
        { label: 'revalidate', value: 'revalidate' },
      ],
    },
    { name: 'collection', type: 'text', index: true },
    { name: 'docId', type: 'text', index: true },
    { name: 'userId', type: 'text' },
    { name: 'userEmail', type: 'text' },
    { name: 'userRole', type: 'text' },
    { name: 'ip', type: 'text' },
    { name: 'userAgent', type: 'text' },
    { name: 'fingerprint', type: 'text', admin: { description: 'Doc content hash at write time' } },
    { name: 'meta', type: 'json' },
  ],
  timestamps: true,
};
