# Nuvoxsaga Banned Tools — DO NOT INSTALL

This file is the security perimeter. Anything below is rejected by policy.
Reviewed 2026-04-28 across v3-v7 plan iterations.

## Skills BANNED

| Item | Reason |
|---|---|
| #11 Superpowers (obra) | Broad capability creep, unclear scope for production site |
| #20 NotebookLM Integration (PleasePrompto) | Unverified maintainer bridging Google product — credential risk |

## Skills DROPPED (after security audit)

| Item | Reason |
|---|---|
| #18 Claude SEO (AgriciDaniel) | Indie maintainer, low audit surface; replaced by custom `nuvox-seo` skill |
| #17 Marketing Skills (Corey Haines) | Indie, mixed quality; not needed for media site |
| #14 Context Optimization (muratcankoylan) | Unknown maintainer, prompt-only but unaudited |
| Task Master AI (eyaltoledano) | Writes to local FS state — overhead and unaudited |
| Tokens Studio Figma plugin | Third-party token storage; native Variables export is cleaner |

## Repos BANNED

| Item | Reason |
|---|---|
| OpenClaw | Trojan-name (echoes OpenAI); unverifiable maintainer |
| AutoGPT | Autonomous code-exec agent, supply-chain history concerns |
| NemoClaw | Trojan-name (echoes NVIDIA NeMo); unverified |
| figaro (byt3bl33d3r) | Maintainer is offsec/red-team author — not for prod |
| deer-flow (ByteDance) | PII jurisdiction concerns |
| AIlice (myshell-ai) | Autonomous self-evolving agent — exec risk |
| Ghost OS | Stealth-named, unverified |
| Mem9 | Trojan-name (echoes Mem0), unverified |
| stealth-browser-mcp (vibheksoni) | "Stealth" = evasion tooling, ban category |
| CK BeaconBay | Unknown maintainer, opaque name |
| Theatre.js | Last meaningful release Q2 2024 — abandoned-feeling |

## Trojan-name watch (verify maintainer publicly before any install)

- `OpenClaw` → echoes OpenAI
- `NemoClaw` → echoes NVIDIA NeMo
- `Mem9` → echoes Mem0
- `Ghost OS` → echoes GhostBSD/stealth
- `Claude Inspector`, `claude-squad`, `claude-deep-research-skill` → verify these are not Anthropic-impersonating before install

## Authoritative SAFE list

Use only:
- Anthropic-official (github.com/anthropics/*)
- Microsoft-official, Google-official, Vercel-official
- Well-known indies (Karpathy, Mozilla, GitHub, Pmndrs, Don McCurdy, Patricio Gonzalez Vivo)
- MIT/Apache license (or equivalent permissive)
- No arbitrary code-exec capabilities

## Currently installed (Phase 1 complete)

Skills (Anthropic-official, symlinked from `~/.claude/skills/anthropic-skills/`):
- `frontend-design` (#06)
- `theme-factory` (#09)
- `web-artifacts-builder` (#10)
- `skill-creator` (#15)
- `brand-guidelines` (#19)
- `canvas-design` (bonus)
- `mcp-builder` (bonus)

Coming in later phases:
- Custom `nuvox-seo` skill (Phase 7) — generated via Skill Creator + 8-gate review
- MCPs `tavily`, `context7`, `figma` (Phase 2.7) — config draft at `.mcp.json` (gitignored)
- CI tools (Phase 11): `claude-code-security-review` (Anthropic), `promptfoo`, `agent-governance-toolkit` (Microsoft)
