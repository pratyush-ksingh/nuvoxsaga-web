/**
 * WebAuthn helpers — wraps @simplewebauthn/server for our admin MFA flow.
 *
 * Flow:
 *   1. Admin completes magic-link signin → session has mfaVerified=false
 *   2. Middleware redirects to /admin/setup-mfa
 *   3. /admin/setup-mfa POSTs to /api/admin/mfa/register/options → returns
 *      navigator.credentials.create() options
 *   4. Browser produces an attestation → POSTs to .../register/verify
 *   5. We store the credential public key on the Users record (Payload)
 *   6. Subsequent admin loads challenge an authentication assertion before
 *      mfaVerified flips to true
 *
 * This file ONLY composes @simplewebauthn — Payload integration lives in
 * the route handlers (Phase 5.3 wires those).
 */
import {
  generateRegistrationOptions,
  verifyRegistrationResponse,
  generateAuthenticationOptions,
  verifyAuthenticationResponse,
} from '@simplewebauthn/server';
import type {
  RegistrationResponseJSON,
  AuthenticationResponseJSON,
  AuthenticatorTransportFuture,
} from '@simplewebauthn/server';

const RP_NAME = 'Nuvoxsaga';

function getRpId(): string {
  // Relying Party ID = the registrable suffix of the site's host.
  const url = process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
  return new URL(url).hostname;
}

function getOrigin(): string {
  return process.env.NEXT_PUBLIC_SITE_URL ?? 'http://localhost:3000';
}

export async function buildRegistrationOptions(args: {
  /** Opaque random WebAuthn user handle — NEVER derived from PII (per spec §4). */
  userId: string;
  userName: string; // email
  excludeCredentialIds?: string[];
}) {
  return generateRegistrationOptions({
    rpName: RP_NAME,
    rpID: getRpId(),
    userID: new TextEncoder().encode(args.userId),
    userName: args.userName,
    attestationType: 'none', // we don't need attestation for owner-only auth
    excludeCredentials: (args.excludeCredentialIds ?? []).map((id) => ({
      id,
      transports: ['internal', 'hybrid'] satisfies AuthenticatorTransportFuture[],
    })),
    authenticatorSelection: {
      residentKey: 'preferred',
      // 'required' forces PIN/biometric — without UV, MFA collapses to single-factor
      // possession. Owner-only flow has no UX cost from requiring it.
      userVerification: 'required',
      authenticatorAttachment: undefined,
    },
  });
}

export async function verifyRegistration(args: {
  response: RegistrationResponseJSON;
  expectedChallenge: string;
}) {
  return verifyRegistrationResponse({
    response: args.response,
    expectedChallenge: args.expectedChallenge,
    expectedOrigin: getOrigin(),
    expectedRPID: getRpId(),
    requireUserVerification: true,
  });
}

export async function buildAuthenticationOptions(args: {
  allowCredentialIds?: string[];
}) {
  return generateAuthenticationOptions({
    rpID: getRpId(),
    allowCredentials: (args.allowCredentialIds ?? []).map((id) => ({
      id,
      transports: ['internal', 'hybrid'] satisfies AuthenticatorTransportFuture[],
    })),
    userVerification: 'preferred',
  });
}

export async function verifyAuthentication(args: {
  response: AuthenticationResponseJSON;
  expectedChallenge: string;
  credentialPublicKey: Uint8Array;
  credentialID: string;
  counter: number;
}) {
  // Coerce to a fresh Uint8Array<ArrayBuffer> to satisfy @simplewebauthn's strict type.
  const pkBuf = new Uint8Array(args.credentialPublicKey);
  return verifyAuthenticationResponse({
    response: args.response,
    expectedChallenge: args.expectedChallenge,
    expectedOrigin: getOrigin(),
    expectedRPID: getRpId(),
    credential: {
      id: args.credentialID,
      publicKey: pkBuf,
      counter: args.counter,
    },
    requireUserVerification: true,
  });
}
