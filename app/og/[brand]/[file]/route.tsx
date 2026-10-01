/**
 * /og/<brand_id>/<slug>.png — Open Graph card, rendered ONCE per post at build time.
 *
 * Static-export port of the old /api/og/[slug] route: the posts come from the build-time
 * content layer and every PNG is written to disk by `next build`, so no request ever runs
 * code. The file name carries the .png extension so Cloudflare serves an image type.
 *
 * Design (2026-10-01, with the "N." mark): the site's paper and ink, the headline in the
 * Fraunces serif, the mark and nameplate on top, the brand line at the foot. Replaces the
 * purple-to-blue gradient card, which matched neither the site nor the trust brand.
 */
import fs from 'node:fs';
import path from 'node:path';
import { ImageResponse } from 'next/og';
import { BRANDS, BRAND_BY_ID, type BrandId } from '@/lib/brands';
import { loadAllPosts } from '@/lib/content';
import { BRAND_CONTENT } from '@/lib/brand-content';
import { DESKS } from '@/lib/desks';

export const dynamic = 'force-static';
export const dynamicParams = false;

// One card per post, plus a default card per brand (brand pages and posts without an
// excerpt use it; it also keeps the route non-empty before the first post exists,
// which static export requires).
export function generateStaticParams() {
  const brandCards = BRANDS.map((b) => ({ brand: b.id, file: 'default.png' }));
  return [...brandCards, ...loadAllPosts().map((p) => ({ brand: p.brand, file: `${p.slug}.png` }))];
}

// Only Fraunces is loaded: small labels are set in its italic, like the site's standfirsts.
const PAPER = '#fbfbf9';
const INK = '#15161a';
const INK_2 = '#4b4c52';
const HAIRLINE = 'rgba(21,22,26,0.12)';
// Desk accents on a light page (app/globals.css light tokens).
const ACCENT: Record<BrandId, string> = { nuvox_ai: '#0b6c9e', nuvox_space: '#3346c7', nuvox_world: '#b3142f' };

/** Fraunces as static TTF instances (Satori reads TTF/OTF, not woff2). Fetched once per build. */
type Font = { name: string; data: ArrayBuffer; weight: 400 | 700; style: 'normal' | 'italic' };
let fontsPromise: Promise<Font[]> | null = null;
async function ttf(family: string): Promise<ArrayBuffer> {
  // An old user agent makes Google Fonts answer with TrueType URLs.
  const css = await (await fetch(`https://fonts.googleapis.com/css2?family=${family}`, { headers: { 'user-agent': 'Mozilla/4.0' } })).text();
  const url = css.match(/src:\s*url\(([^)]+\.ttf)\)/)?.[1];
  if (!url) throw new Error(`no TTF for ${family}`);
  return (await fetch(url)).arrayBuffer();
}
function fonts(): Promise<Font[]> {
  fontsPromise ??= Promise.all([
    ttf('Fraunces:opsz,wght@144,700').then((data) => ({ name: 'Fraunces', data, weight: 700 as const, style: 'normal' as const })),
    ttf('Fraunces:ital,opsz,wght@1,72,400').then((data) => ({ name: 'Fraunces', data, weight: 400 as const, style: 'italic' as const })),
  ]).catch((e) => {
    console.warn(`og: Fraunces unavailable, cards use the default font (${String(e).slice(0, 120)})`);
    return [];
  });
  return fontsPromise;
}

const MARK = `data:image/png;base64,${fs.readFileSync(path.join(process.cwd(), 'public', 'logos', 'nuvoxsaga.png')).toString('base64')}`;

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ brand: string; file: string }> },
) {
  const { brand, file } = await params;
  const brandConf = BRAND_BY_ID[brand as BrandId];
  const post = loadAllPosts().find((p) => p.brand === brand && `${p.slug}.png` === file);
  const title = (post?.title ?? `${DESKS[brandConf.id].name} news`).slice(0, 120);
  const excerpt = (post?.excerpt ?? BRAND_CONTENT[brandConf.id].publicationLine).slice(0, 170);
  const accent = ACCENT[brandConf.id];
  const format = post ? (post.kind === 'brief' ? 'Brief' : 'Feature') : null;
  const titleSize = title.length > 90 ? 54 : title.length > 60 ? 62 : 72;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          justifyContent: 'space-between',
          background: PAPER,
          color: INK,
          padding: '64px 80px',
          fontFamily: 'Fraunces',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '20px' }}>
          {/* eslint-disable-next-line @next/next/no-img-element -- Satori renders plain img */}
          <img src={MARK} width={64} height={64} style={{ borderRadius: '14px' }} alt="" />
          <div style={{ display: 'flex', fontSize: '36px', fontWeight: 700, letterSpacing: '-0.03em' }}>
            Nuvox<span style={{ fontStyle: 'italic', fontWeight: 400 }}>saga</span>
          </div>
          <div style={{ display: 'flex', width: '2px', height: '30px', background: HAIRLINE, margin: '0 6px' }} />
          <div style={{ display: 'flex', fontSize: '28px', color: accent, fontStyle: 'italic' }}>
            {DESKS[brandConf.id].name}
          </div>
          {format && (
            <div
              style={{
                display: 'flex',
                fontSize: '20px',
                fontStyle: 'italic',
                color: INK_2,
                border: `2px solid ${HAIRLINE}`,
                borderRadius: '999px',
                padding: '4px 14px',
              }}
            >
              {format}
            </div>
          )}
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '22px' }}>
          <div
            style={{
              display: 'flex',
              fontSize: `${titleSize}px`,
              lineHeight: 1.05,
              fontWeight: 700,
              letterSpacing: '-0.025em',
              maxWidth: '1040px',
            }}
          >
            {title}
          </div>
          <div style={{ display: 'flex', fontSize: '28px', fontStyle: 'italic', fontWeight: 400, color: INK_2, maxWidth: '980px' }}>
            {excerpt}
          </div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'center',
            borderTop: `2px solid ${HAIRLINE}`,
            paddingTop: '22px',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '12px', fontSize: '26px', fontStyle: 'italic', fontWeight: 400 }}>
            <div style={{ display: 'flex', width: '12px', height: '12px', borderRadius: '999px', background: '#2f9e6c' }} />
            News you can check.
          </div>
          <div style={{ display: 'flex', fontSize: '22px', fontStyle: 'italic', color: INK_2 }}>nuvoxsaga.com</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630, fonts: await fonts() },
  );
}
