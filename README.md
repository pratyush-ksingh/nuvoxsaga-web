# nuvoxsaga-web

3-brand AI/tech media-house website at **nuvoxsaga.com**.

Stack: Next.js 15 + Payload CMS 3 + R3F + Tailwind v4 + Auth.js v5.
Brands: `nuvox_ai`, `nuvox_space`, `nuvox_world`.

## Status

Phase 2 complete (scaffold). Plan: see `infra/security/BANNED.md` and the v7 plan in user memory.

## Next steps (Phase 3+)

1. Phase 3 — Security foundation (CSP report-only, middleware rate limit, env wiring)
2. Phase 4 — Payload collections (Posts/Media/Authors/Subscribers/Brands/AuditLog)
3. Phase 5 — Auth.js v5 magic-link + WebAuthn MFA
4. Phase 6 — Repoint Python content pipeline (Ghost → Payload, 4-function rewrite)
5. Phase 7 — SEO foundation (custom `nuvox-seo` skill, sitemap, schema-dts)
6. Phase 8 — Frontend (no 3D yet)
7. Phase 9 — Heavy 3D (gaussian splat hero, per-brand bespoke, /about, /labs)
8. Phase 10 — Polish
9. Phase 11 — Pre-launch audit (11 hard gates)
10. Phase 12 — Launch

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
