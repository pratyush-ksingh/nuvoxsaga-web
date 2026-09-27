# Nuvoxsaga design system

> Written in the awesome-design-md DESIGN.md format. Synthesised for Nuvoxsaga from two
> reference analyses (The Verge: paced editorial feed, dark canvas, color as emphasis;
> SpaceX: full-bleed photography, austere chrome, one CTA per band) plus the three
> Nuvox brand colors. It is not a copy of either brand. Section mockups that fixed the
> layout live in `design/ref/` (generated with image-to-code, FLUX.2 klein).

## 1. Design read
Reading this as: a three-brand science and technology news site for curious general
readers, with an editorial media language, leaning toward Tailwind v4 + Geist +
full-bleed photography + restrained motion.

Dials (taste-skill): `DESIGN_VARIANCE 7`, `MOTION_INTENSITY 5`, `VISUAL_DENSITY 7` (raised from 4 on
2026-09-27 when the site became a media house: readers scan many headlines per screen).

## 2. Atmosphere
A dark newsroom at night: cool charcoal canvas, big heavy grotesk headlines, and
photography doing the decorative work. Chrome stays quiet. Each publication owns one
accent color that appears as a short bar, a label or a dot, never as a wash or a glow.

## 3. Color
| Token | Value | Use |
|---|---|---|
| `--canvas` | `#111214` | page background (cool off-black, never `#000`) |
| `--surface` | `#1a1b1e` | raised panels, inputs |
| `--surface-2` | `#232428` | hover surface |
| `--hairline` | `rgb(255 255 255 / 0.08)` | dividers, frames |
| `--ink` | `#f2f2f0` | headlines, primary text (never `#fff`) |
| `--ink-2` | `#a1a1a6` | body secondary, decks |
| `--ink-3` | `#8a8a90` | metadata, captions (WCAG AA on canvas) |
| `--ai` | `#00b4ff` | Nuvox AI accent |
| `--space` | `#1e90ff` | Nuvox Space accent |
| `--world` | `#dc143c` | Nuvox World accent |

Rules: one accent per page. Brand pages and posts use their brand accent only. The home
page stays neutral (white CTAs) and shows the three accents only inside their own brand
tiles. No gradients except a dark scrim that keeps text readable over photographs.

Theme: dark only, a deliberate brand decision (`color-scheme: dark`). The canvas is the
product, as with both references. Sections never flip to a light background.

## 4. Typography
- Family: **Geist** (display + UI), **Geist Mono** only for timeline dates.
- Display: Geist 800, `letter-spacing -0.035em`, `line-height 0.98`.
  - Hero `clamp(2.75rem, 6vw, 5.5rem)`, max 2 lines.
  - Section `clamp(2rem, 4vw, 3.25rem)`.
- Headline (cards, feed): Geist 700, 20-24px, `line-height 1.2`.
- Body: Geist 400, 18px, `line-height 1.65`, max 65ch. Deck/lead 20-22px in `--ink-2`.
- Labels: sentence case. Uppercase micro-labels are limited to 1 per 3 sections.
- No serif. No em-dash anywhere in visible copy.

## 5. Shape
One documented rule: media frames and tiles 16px; buttons, inputs and pills fully round.

## 6. Components
- **Primary button**: `--ink` pill, `--canvas` text, 48px tall, 24px side padding,
  weight 500. Hover 85% opacity; active `translateY(1px)`; focus-visible 2px ring.
- **Text link**: `--ink` with arrow, underline on hover.
- **Brand tile**: full-bleed photo, bottom scrim, brand name 28-40px bold, one-line
  caption, 40px accent bar in the brand color.
- **Story row (river)**: time column (relative after hydration), kicker in the desk accent,
  bold headline, 2-line deck, 4:3 thumbnail only for features or stories with an image,
  hairline between rows.
- **Newsletter**: pill email field on `--surface` + primary button, one-line note below.

## 7. Layout
- Container `max-w-[1320px]`, gutters 24px mobile / 40px desktop.
- Section rhythm `py-20` mobile, `py-28` desktop; hero top padding at most `pt-24`.
- Home (media house): lead story + 3 secondary, then the Latest river with a 20rem sidebar
  (trending topics, features), then one block per desk, then a compact "how we report"
  band, then the newsletter band. Before the first story exists it falls back to the
  launch composition (split hero, desk bento, how we report).
- Desk front: masthead with section pill tabs, lead + 3, river + features sidebar, pager.
- Story: kicker (Desk · Section, "In brief" pill), headline, deck, desk byline + UTC stamp,
  credited image, body, source/check box, topic chips, "More from <desk>".
- Every multi-column block collapses to one column under 768px.

## 8. Motion
Float-up reveals driven by CSS scroll timelines (no JS scroll listeners), a slow scale
drift on hero photography, 150-200ms color/opacity transitions. Everything is disabled
under `prefers-reduced-motion`.

## 9. Imagery
Photographic illustrations generated for the brand (Workers AI, FLUX.2 klein), stored as
responsive WebP in `public/images/`. They are illustrations, not news photos: alt text
says so and the footer states that illustrations are AI-generated.
