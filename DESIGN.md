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
tiles. No gradients except a dark scrim that keeps text readable over photographs, and
the faint pointer glare on a tilting card (§8), which is white at 10% and never colored.

Theme: dark only, a deliberate brand decision (`color-scheme: dark`). The canvas is the
product, as with both references. Sections never flip to a light background.

## 4. Typography
Three voices (2026-10-01, "Night edition", replacing Geist-for-everything after a design
review against Semafor, Quanta, Rest of World, The Pudding and NYT, SND47 winners):
- **Fraunces** (variable serif, optical size) speaks the news: every h1-h3, `.display`,
  the nameplate, and `.deck` (its italic, for the standfirst under a headline).
- **Geist** carries text and UI: body, nav, kickers, buttons.
- **Geist Mono** (`.data`, tabular figures) is the instrument voice: times, dates,
  counts, the edition line and dial labels.
- Display: Fraunces 600, `letter-spacing -0.025em`, `line-height 1`.
- Nameplate: Fraunces 700 at optical size 144, "Nuvox" roman + "saga" italic 400.
  - Hero `clamp(2.75rem, 6vw, 5.5rem)`, max 2 lines.
  - Section `clamp(2rem, 4vw, 3.25rem)`.
- Headline (cards, feed): Geist 700, 20-24px, `line-height 1.2`.
- Body: Geist 400, 18px, `line-height 1.65`, max 65ch. Deck/lead 20-22px in `--ink-2`.
- Labels: sentence case. Uppercase micro-labels are limited to 1 per 3 sections.
- No em-dash anywhere in visible copy.

Texture: a page-wide film grain (inline SVG noise at 7%, fixed, behind content) and
dotted newspaper rules (`.rule-dot`) in the masthead.

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
- **Masthead (home only)**: edition line in mono (date, edition time UTC, stories checked
  this week), dotted rule, the nameplate unveiled once on load, dotted rule, italic
  standfirst. The edition time is the build time: the page is rebuilt on every publish.
- **Frontier Dial (home signature)**: a 24-hour UTC clock face with one orbit per desk
  (AI inner, Space, World outer). Each recent story is a point at its time of day; the
  window widens from 24 hours to 3 or 7 days until it holds 6 stories. Pointing or
  tabbing shows the story in the readout; every point is a link. Orbit lines drift, points
  never move; a faint sweep trails the edition hand. Data only, never decoration.
- **Newsletter**: pill email field on `--surface` + primary button, one-line note below.

## 7. Layout
- Container `max-w-[1320px]`, gutters 24px mobile / 40px desktop.
- Section rhythm `py-20` mobile, `py-28` desktop; hero top padding at most `pt-24`.
- Home (media house), researched against The Verge (mosaic top stories over a fast
  stream), Bloomberg (a live headline wire) and Rest of World (rich but light pages):
  the masthead, the wire (newest headlines, one line), the hero stage (lead story on a
  full-bleed 3D photo card + 3 side cards), the Frontier Dial band, the Latest river with a 20rem sidebar, the features shelf
  (only with 3+ features), one block per desk opened by a photo portal, a compact "how we
  report" band, then the newsletter band. News and articles stay apart: briefs run on the
  wire and in the river, features get the shelf with image and reading time. Before the first story exists it falls back to the
  launch composition (split hero, desk bento, how we report).
- Desk front: masthead with section pill tabs, the desk's wire (labelled by section), the
  hero stage (shorter lead than home), river + features sidebar, the desk's features shelf
  once it has 3+ features, pager. Section page: masthead, hero stage (lead + 3 once the
  section has 5+ stories, a single lead before that), river.
- Story: kicker (Desk · Section, "In brief" pill), headline, deck, desk byline + UTC stamp,
  credited image, body, source/check box, topic chips, "More from <desk>".
- Every multi-column block collapses to one column under 768px.

## 8. Motion
Float-up reveals driven by CSS scroll timelines (no JS scroll listeners), a slow scale
drift on hero photography, 150-200ms color/opacity transitions. Everything is disabled
under `prefers-reduced-motion`.

Depth (home only, no WebGL: the three.js stack was removed for page weight):
- **Tilt**: photo cards follow a fine pointer up to 4-6 degrees (`components/home/Tilt.tsx`,
  one rAF per frame); text lifts off the photo with `translateZ`. Off on touch screens.
- **Stage**: hero cards rise out of a tilted plane once, on load.
- **Shelf**: the features shelf turns like a coverflow, driven by its own horizontal
  scroll timeline (`animation-timeline: view(inline)`), pure CSS.
- **Wire**: the headline ticker loops; hover or keyboard focus pauses it, and reduced
  motion turns it into a static, scrollable line.
- Never animate `transform` on an element that also tilts: put reveals on a wrapper.

## 9. Imagery
Photographic illustrations generated for the brand (Workers AI, FLUX.2 klein), stored as
responsive WebP in `public/images/`. They are illustrations, not news photos: alt text
says so and the footer states that illustrations are AI-generated.
