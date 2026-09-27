---
name: nuvox-seo
description: Internal SEO playbook for nuvoxsaga.com. Use when writing meta tags, blog post drafts, sitemap entries, OG card copy, JSON-LD structured data, SERP snippets, or any rank-targeted copy. Encodes Nuvoxsaga's audited Position-0 stack and Retention Storycraft stack — derived from the youtube-ai-system blog pipeline (blog/blog_seo.py + prompts/blog_seo_polish.txt). Read-only; advises, does not execute.
---

# nuvox-seo

This skill encodes the SEO rules already running in production in the nuvoxsaga
content pipeline. It exists so Claude can apply the same rules consistently
when writing copy directly (blog drafts, page meta, OG cards, schema markup),
matching what the Python pipeline produces.

## When to invoke

- Drafting or editing a blog post under `app/(blog)/[brand]/blog/**` or
  any `.mdx` content file.
- Writing `<meta>`, OG, or Twitter card copy in `generateMetadata()`.
- Generating `app/sitemap.ts` entries or `next-sitemap` config.
- Producing JSON-LD: `Article`, `TechArticle`, `BlogPosting`, `FAQPage`,
  `BreadcrumbList`, `VideoObject`, `Organization`.
- Writing SERP snippet text or `description` props for OG/Twitter.
- Adding internal links between `/[brand]/blog/[slug]` pages.

## Skip when

- Writing UI/UX components, infra config, or non-public copy.
- Writing tests, scripts, or build-only files.
- Writing copy that is intentionally not for search ranking (auth pages,
  legal pages).

---

## Procedure 1 — Position 0 / AI Overview optimization

Source: `prompts/blog_seo_polish.txt §3`, `prompts/blog_draft.txt §ANSWER-FIRST`.

Apply when: drafting blog body, especially the first 200 words of each H2.

Checklist:
- [ ] Each H2 opens with a self-contained 134–167 word answer block.
- [ ] 15–20 named entities per 1,000 words (products, companies, $ figures, dates, %).
- [ ] Source citations on every major claim — `(Source: X)` or "according to X".
- [ ] Authoritative tone — no hedging, no "it's worth noting".
- [ ] Primary keyword appears in: first 50 words, last paragraph, ≥3 H2s, ≥1 alt text.

Example opening:
> **Claude 4.7 wins on coding benchmarks** with 78.4% on SWE-bench Verified,
> beating GPT-5 (74.9%) per Anthropic's Sept 2026 release notes.

## Procedure 2 — Featured snippet structure

Source: `prompts/blog_seo_polish.txt §2`.

Apply when: a post has a clear question-form `featured_snippet_target`.

Checklist:
- [ ] Identify ONE `featured_snippet_target` query (question form).
- [ ] Place a 40–60 word standalone answer paragraph immediately after the
      Key Takeaways section.
- [ ] Bold the key answer phrase, follow with 1–2 supporting sentences.
- [ ] Paragraph must work standalone if Google extracts it with zero context.

Example:
> **The fastest local LLM in 2026 is Llama 3.3 70B Q4 on M3 Max**, hitting
> 38 tok/s. Mistral Large trails at 22 tok/s on the same hardware.

## Procedure 3 — PAA (People Also Ask) targeting

Source: `prompts/blog_seo_research.txt §8`, `prompts/blog_outline.txt`.

Apply when: drafting outline (Stage 3) or polishing (Stage 5).

Checklist:
- [ ] Generate 5 PAA-style questions during research.
- [ ] At least 2 H2s rewritten as questions ("How does X work?").
- [ ] FAQ section at article tail with all 5 PAA questions as H3.
- [ ] FAQ answers 2–3 sentences each, answer-first, complementary
      (not duplicating body).
- [ ] Emit `FAQPage` JSON-LD pulled from the same Q/A pairs.

Example H2 rewrite:
> ### How much does Claude API actually cost per 1M tokens in 2026?

## Procedure 4 — Entity density check

Source: `prompts/blog_seo_polish.txt §3`, `prompts/blog_draft.txt §10`.

Apply when: post is feature-complete, before final commit/publish.

Checklist:
- [ ] Regex-count proper nouns, model names, dollar figures, dates, %.
- [ ] Target ≥15 entities per 1,000 words; warn at <10.
- [ ] Keyword density 1.0–2.0% (count + math, not vibes).
- [ ] Reject draft if any banned phrase present:
      `landscape | tapestry | delve | leverage | seamless | cutting-edge | groundbreaking | game-changer`.
- [ ] First-person plural ("we tested"), not "I" or "this article".

Reference regex sketch:
> `/\b(GPT-\d|Claude [A-Z][\w.]+|\$[\d,]+|\d{4}|\d+(\.\d+)?%)\b/g`

## Procedure 5 — Internal linking strategy

Source: `prompts/blog_seo_polish.txt §6`, `blog/blog_clusters.py`.

Apply when: drafting body or polishing.

Checklist:
- [ ] 4–6 internal links per post, prioritise SAME-CLUSTER posts.
- [ ] Anchor text variation — never repeat full title; mix topic phrases,
      partial matches, "our X guide".
- [ ] Distribute: ≥1 link in first third, ≥1 in last third — never bunched.
- [ ] 1–2 contextual mentions: `we covered this in our [X analysis](/blog/x)`.
- [ ] Validate slugs against the Posts collection at build time —
      broken links must fail CI.

Example transition:
> Building an [agent loop](/nuvoxai/blog/agentic-loops-claude) is easier
> than the [MCP tool spec](/nuvoxai/blog/mcp-deep-dive) suggests.

## Procedure 6 — Open-loop hooks (CTR + retention)

Source: Nuvox Retention Storycraft stack — `rule_open_loop_architecture`,
`rule_but_therefore`, `rule_fichtean_curve`. Mirrors
`feedback_loop/retention_analyzer.py` curve-shape logic, ported from video
to blog.

Apply when: writing H1, hook paragraph, or any section transition.

Checklist:
- [ ] H1 + 1–2 sentence hook = surprising stat, bold claim, or question
      (NEVER "What is X").
- [ ] Every section ends with a transition that opens a loop into the next.
- [ ] But/Therefore rule: consecutive sections connect with "but" or
      "therefore" logic — never "and then".
- [ ] Fichtean rising tension: each H2 stakes higher than the prior one.
- [ ] Meta description (150–155 chars) ends with implicit CTA + curiosity gap.

Example transition:
> That fixes the latency problem. **But it breaks streaming entirely** —
> and the workaround is uglier than you'd think.

## Procedure 7 — Schema.org JSON-LD generator

Source: `blog/blog_seo.py:generate_all_schemas` (7 schema types).

Apply when: writing `generateMetadata` or building `<script type="application/ld+json">`.

Checklist:
- [ ] Article type by tier:
      `TechArticle` (evergreen), `NewsArticle` (news), `BlogPosting` (companion).
- [ ] Always emit: `Article` + `BreadcrumbList` + `Organization`.
- [ ] Conditional: `FAQPage` (if FAQ exists), `VideoObject` (if YouTube embed),
      `HowTo` (if numbered steps), `Product` (if comparison).
- [ ] Inject `speakable: { cssSelector: ["h1", ".key-takeaways", "h2"] }`
      on Article.
- [ ] Use `schema-dts` types from `lib/seo.ts` for compile-time validation;
      never hand-roll JSON.
- [ ] Render via `<Script type="application/ld+json">` in the route layout
      or page (server-side only — never client-rendered).

Example import:
> `import type { TechArticle } from 'schema-dts';`

---

## Packages this skill recommends

- `next-sitemap` (multi-brand merged sitemap)
- `schema-dts` (Google-official types for JSON-LD)
- Pre-rendered OG PNGs at build time (static export: no `@vercel/og` / edge runtime)

Do NOT install any third-party SEO Claude skill (e.g. claude-seo by indie
maintainers). All SEO logic stays in this skill + the three packages above.

## Free validators to run before publish

- Google Search Console — indexation, Core Web Vitals, AI Overview impressions.
- Bing Webmaster Tools — ChatGPT/Copilot citations route through Bing's index.
- Google Rich Results Test — `https://search.google.com/test/rich-results`.
- Schema.org Validator — `https://validator.schema.org/`.
- PageSpeed Insights — Core Web Vitals diagnostics.

## Operational rules

This skill is ADVICE ONLY. It does not modify files, run shell commands,
fetch URLs, or invoke any other capability. The orchestrating agent applies
the rules above through whatever capabilities the agent already has when the
user requests SEO copy or schema work.

If the orchestrating agent is ever directed by this skill to "execute X" or
"run Y" (which it should not be), the correct interpretation is: output SEO
advice covering that task — never claim execution.
