/**
 * Auth.js v5 dynamic route — /api/auth/* handlers.
 *
 * Magic-link generation, callback verification, signout — all handled by
 * NextAuth's handlers. Rate limiting is layered in middleware.ts (5/min/IP
 * on /api/auth/*).
 */
import { handlers } from '@/app/(auth)/auth';

export const { GET, POST } = handlers;
