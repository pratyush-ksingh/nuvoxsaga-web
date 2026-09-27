/**
 * /og/<brand_id>/<slug>.png — Open Graph card, rendered ONCE per post at build time.
 *
 * Static-export port of the old /api/og/[slug] route: same card design, but the
 * posts come from the build-time content layer and every PNG is written to disk
 * by `next build`, so no request ever runs code. The file name carries the .png
 * extension so Cloudflare serves it with an image content type.
 */
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

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ brand: string; file: string }> },
) {
  const { brand, file } = await params;
  const brandConf = BRAND_BY_ID[brand as BrandId];
  const post = loadAllPosts().find((p) => p.brand === brand && `${p.slug}.png` === file);
  const title = (post?.title ?? `${DESKS[brandConf.id].name} news`).slice(0, 120);
  const excerpt = (post?.excerpt ?? BRAND_CONTENT[brandConf.id].publicationLine).slice(0, 200);
  const { primary, purple, dark } = brandConf.palette;

  return new ImageResponse(
    (
      <div
        style={{
          height: '100%',
          width: '100%',
          display: 'flex',
          flexDirection: 'column',
          background: `linear-gradient(135deg, ${dark} 0%, ${purple} 80%, ${primary} 100%)`,
          padding: '80px',
          fontFamily: 'Inter, system-ui, sans-serif',
          color: 'white',
          justifyContent: 'space-between',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
          <div
            style={{
              width: '14px',
              height: '14px',
              borderRadius: '999px',
              background: primary,
              boxShadow: `0 0 24px ${primary}`,
            }}
          />
          <div style={{ fontSize: '24px', letterSpacing: '0.06em', opacity: 0.85 }}>
            {`NUVOXSAGA · ${DESKS[brandConf.id].name.toUpperCase()}`}
          </div>
        </div>

        <div style={{ display: 'flex', flexDirection: 'column', gap: '24px' }}>
          <div
            style={{
              fontSize: '64px',
              lineHeight: '1.05',
              fontWeight: 700,
              maxWidth: '1000px',
              letterSpacing: '-0.02em',
            }}
          >
            {title}
          </div>
          <div style={{ fontSize: '28px', opacity: 0.75, maxWidth: '900px' }}>{excerpt}</div>
        </div>

        <div
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'flex-end',
            fontSize: '20px',
            opacity: 0.6,
          }}
        >
          <div>nuvoxsaga.com</div>
          <div>{brandConf.handle}</div>
        </div>
      </div>
    ),
    { width: 1200, height: 630 },
  );
}
