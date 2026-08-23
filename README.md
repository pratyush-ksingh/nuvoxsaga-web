# nuvoxsaga-web

3-brand AI/tech media-house website at **nuvoxsaga.com**.

Stack: Next.js 15 + Payload CMS 3 + R3F + Tailwind v4 + Auth.js v5.
Brands: `nuvox_ai`, `nuvox_space`, `nuvox_world`.

## Status

Feature-complete, in final pre-launch hardening. Security foundation, Payload
collections, Auth.js v5 magic-link + WebAuthn, the Ghost → Payload content
pipeline, SEO, frontend, and heavy 3D are all built; a Vercel preview deploy
is live. What's left is smoke-testing the full stack, activating Sentry, and
the deferred Ghost → Payload post migration.

**Canonical status doc: [`infra/REMAINING_PLAN.md`](infra/REMAINING_PLAN.md)** —
read it first in any session. It tracks live infra (Vercel/R2/Turnstile/Resend/
Neon/Upstash), the Bitwarden env-var inventory, and the remaining tech-polish /
smoke-test / migration / launch checklist.

## CI

`.github/workflows/security.yml` runs on every push/PR to `master`: Gitleaks
secret scan, `npm audit`, codegen-drift check, `tsc --noEmit`, lint, CodeQL,
and (PRs only) the Anthropic `claude-code-security-review` action.
`lighthouse.yml` runs a Lighthouse CI audit against `LIGHTHOUSE_BASE_URL`.

## Key files

- `lib/brands.ts` — codegen from `../youtube-ai-system/core/brand_config.py`. **Never edit by hand.**
- `scripts/gen-brands.ts` — codegen runner. CI prebuild fails on drift.
- `scripts/convert-banners.ts` — banner PNG → AVIF responsive sizes.
- `infra/security/BANNED.md` — security policy, do not install banned items.
- `public/banners/` — 36 AVIF banner sizes (3 brands × 3 banners × 4 widths).
- `public/logos/` — 3 brand logos (PNG, 800×800).
- `public/faces/` — 6 emotion-driven avatars (WebP).
- `public/shaders/lygia/` — git submodule, BSD-style attribution required.
- `.mcp.json.example` — MCP config template (Tavily/Context7/Figma). Copy to `.mcp.json` (gitignored).
- `.env.example` — env var template.

## Codegen workflow

```bash
npm run gen-brands       # regenerate lib/brands.ts from Python source
npm run convert-banners  # re-convert banners if source PNGs change
```

Pre-build runs gen-brands automatically and fails on uncommitted drift.

## Security boundary

See `infra/security/BANNED.md` for the full banned list and trojan-name watch.
