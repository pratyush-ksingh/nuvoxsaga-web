/**
 * GET /api/og/[slug]?brand=<id> — dynamic Open Graph card.
 *
 * Renders a 1200x630 PNG using @vercel/og. Reads the post by (brand, slug)
 * from Payload and tints the card with the brand's primary colour from
 * `lib/brands.ts`.
 *
 * SECURITY:
 *   - Slug + brand validated with strict allowlists BEFORE any DB read.
 *     No trusting the URL — `<img>` tag injection or path traversal not
 *     possible because we never write the slug to disk and never include
 *     it as raw HTML (only as React text children, which @vercel/og
 *     escapes per the React reconciler).
 *   - Uses Payload's local API (`getPayload()`) — no SSRF surface.
 *   - Cached aggressively (24h s-maxage) — same slug → same image.
 *   - Edge runtime is intentionally NOT used here; Payload's local API
 *     needs Node runtime.
 */
import { NextRequest } from 'next/server';
import { ImageResponse } from 'next/og';
import { getPayload } from 'payload';
import config from '@/payload.config';
import { BRAND_BY_ID, type BrandId } from '@/lib/brands';

export const runtime = 'nodejs';

const ALLOWED_BRANDS = new Set<BrandId>(['nuvox_ai', 'nuvox_space', 'nuvox_world']);
const SLUG_RE = /^[a-z0-9-]{1,200}$/;

function bad(status: number, msg: string): Response {
  return new Response(msg, { status });
}

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ slug: string }> },
) {
  const { slug } = await params;
  const brand = req.nextUrl.searchParams.get('brand');

  // Strict input gates — fail before doing any work.
  if (!brand || !ALLOWED_BRANDS.has(brand as BrandId)) {
    return bad(400, 'invalid brand');
  }
  if (!SLUG_RE.test(slug)) {
    return bad(400, 'invalid slug');
  }

  const brandConf = BRAND_BY_ID[brand as BrandId];
  let title = brandConf.name;
  let excerpt = brandConf.niche;

  try {
    const payload = await getPayload({ config });
    const result = await payload.find({
      collection: 'posts',
      where: {
        and: [
          { brand: { equals: brand } },
          { slug: { equals: slug } },
          { status: { equals: 'published' } },
        ],
      },
      limit: 1,
      depth: 0,
    });
    const post = result.docs[0];
    if (post) {
      title = String((post as { title?: string }).title ?? brandConf.name).slice(0, 120);
      excerpt = String((post as { excerpt?: string }).excerpt ?? brandConf.niche).slice(0, 200);
    }
  } catch (e) {
    // Soft-fail to brand defaults — never leak DB errors to the OG path.
    console.warn('OG payload lookup failed:', (e as Error).message);
  }

  const primary = brandConf.palette.primary;
  const purple = brandConf.palette.purple;
  const dark = brandConf.palette.dark;

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
            {brandConf.name.toUpperCase()}
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
    {
      width: 1200,
      height: 630,
      headers: {
        // Cache aggressively — same slug + brand always renders identically.
        'Cache-Control': 'public, immutable, max-age=86400, s-maxage=86400, stale-while-revalidate=604800',
      },
    },
  );
}
