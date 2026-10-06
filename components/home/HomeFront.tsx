/**
 * Front-page blocks for the home page and the desk fronts (DESIGN.md §7):
 *   WireTicker    the newest headlines crossing the top of the page, like a news wire
 *   HeroStage     lead story on a 3D photo card + the three stories beside it
 *   FeatureShelf  long reads and explainers on a scroll-driven 3D shelf
 *   PhotoPortal   a desk as a tilting photo card (desk blocks, launch bento)
 *
 * On a desk front (`showDesk={false}`) stories are labelled by section instead of desk,
 * because every story on the page belongs to the same desk.
 *
 * News (briefs) and articles (features) are kept visually apart: briefs run on the
 * wire and in the Latest river, features get the shelf with images and reading time.
 * Every card links through its headline; a stretched ::after (.card-link) makes the
 * whole card clickable while the kicker's desk and section links stay reachable.
 */
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { BRAND_BY_ID, type BrandId } from '@/lib/brands';
import { BRAND_CONTENT } from '@/lib/brand-content';
import { DESKS, findSection } from '@/lib/desks';
import { storyPath, type PublicPost } from '@/lib/content';
import { Picture } from '@/components/Picture';
import { TimeAgo } from '@/components/TimeAgo';
import { Kicker, StoryImage, formatLine } from '@/components/news/StoryCards';
import { Tilt } from '@/components/home/Tilt';

/* ------------------------------------------------------------------ wire */

export function WireTicker({ posts, showDesk = true }: { posts: PublicPost[]; showDesk?: boolean }) {
  if (posts.length < 4) return null;
  const label = (p: PublicPost) =>
    showDesk ? DESKS[p.brand].name : (findSection(p.brand, p.section)?.name ?? DESKS[p.brand].name);
  // Two identical runs: the track slides by exactly one run, so the loop has no seam.
  // The copy is hidden from assistive tech and the tab order.
  const run = (copy: boolean) => (
    <ul aria-hidden={copy || undefined} className="wire-run flex shrink-0 items-center">
      {posts.map((p) => (
        <li key={p.id} className="flex items-center gap-2.5 whitespace-nowrap pr-10 text-sm">
          <span aria-hidden="true" className="size-1.5 rounded-full" style={{ background: DESKS[p.brand].accent }} />
          <span className="font-medium" style={{ color: DESKS[p.brand].accent }}>
            {label(p)}
          </span>
          <Link
            href={storyPath(p)}
            tabIndex={copy ? -1 : undefined}
            className="text-ink-2 transition-colors duration-150 hover:text-ink"
          >
            {p.title}
          </Link>
        </li>
      ))}
    </ul>
  );
  return (
    <section aria-label="Latest headlines" className="border-b border-hairline bg-surface/60">
      <div className="container-page flex h-11 items-center gap-5">
        <Link href="/latest" className="flex shrink-0 items-center gap-2 text-sm font-semibold">
          <span aria-hidden="true" className="wire-dot size-2 rounded-full bg-ink" />
          Latest
        </Link>
        <div className="wire min-w-0 flex-1">
          <div className="wire-track" style={{ ['--wire-dur' as string]: `${posts.length * 7}s` }}>
            {run(false)}
            {run(true)}
          </div>
        </div>
      </div>
    </section>
  );
}

/* ------------------------------------------------------------------ hero */

export function HeroStage({
  lead,
  secondary,
  showDesk = true,
}: {
  lead?: PublicPost;
  secondary: PublicPost[];
  showDesk?: boolean;
}) {
  if (!lead) return null;
  return (
    <div className={`grid gap-5 lg:gap-6 ${secondary.length > 0 ? 'lg:grid-cols-[1.55fr_1fr]' : ''}`}>
      <div className="stage-in">
        <LeadCard post={lead} showDesk={showDesk} />
      </div>
      {secondary.length > 0 && (
        <ul className="grid content-start gap-5 lg:gap-4">
          {secondary.map((p, i) => (
            <li key={p.id} className="stage-in" style={{ animationDelay: `${120 + i * 90}ms` }}>
              <SideCard post={p} showDesk={showDesk} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

function LeadCard({ post, showDesk }: { post: PublicPost; showDesk: boolean }) {
  return (
    // Desk and section fronts open under a tall masthead, so their lead is shorter.
    <Tilt
      max={4}
      className={`group relative rounded-2xl lg:h-full ${
        showDesk ? 'h-[32rem] md:h-[36rem] lg:min-h-[40rem]' : 'h-[28rem] md:h-[30rem] lg:min-h-[32rem]'
      }`}
    >
      <article className="on-photo tilt-3d absolute inset-0">
        <div className="card-frame absolute inset-0 overflow-hidden rounded-2xl border border-hairline">
          <StoryImage
            post={post}
            sizes="(min-width: 1024px) 62vw, 100vw"
            priority
            className="drift absolute inset-0 size-full object-cover"
          />
          <div aria-hidden="true" className="scrim-lead absolute inset-0" />
          <div aria-hidden="true" className="glare absolute inset-0" />
        </div>
        <div className="depth-2 absolute inset-x-0 bottom-0 p-6 md:p-10">
          <div className="relative z-10">
            <Kicker post={post} showDesk={showDesk} />
          </div>
          <h2 className="display mt-3 max-w-[22ch] text-[clamp(2rem,3.6vw,3.25rem)]">
            <Link href={storyPath(post)} className="card-link">
              {post.title}
            </Link>
          </h2>
          {post.excerpt && (
            <p className="deck mt-4 hidden max-w-[52ch] text-xl leading-snug text-ink-2 md:block">{post.excerpt}</p>
          )}
          <Meta post={post} className="mt-4" />
        </div>
      </article>
    </Tilt>
  );
}

function SideCard({ post, showDesk }: { post: PublicPost; showDesk: boolean }) {
  return (
    <Tilt max={4} className="group relative rounded-2xl">
      <article className="card-frame tilt-3d relative grid grid-cols-[1fr_7rem] gap-4 rounded-2xl border border-hairline bg-surface p-4 sm:grid-cols-[1fr_10rem] lg:min-h-[12.6rem] lg:grid-cols-[1fr_8rem] xl:grid-cols-[1fr_10rem]">
        <div aria-hidden="true" className="glare absolute inset-0 rounded-2xl" />
        <div className="depth-1 flex min-w-0 flex-col">
          <div className="relative z-10">
            <Kicker post={post} showDesk={showDesk} />
          </div>
          <h3 className="mt-2 text-lg font-bold leading-snug tracking-[-0.015em] xl:text-xl">
            <Link href={storyPath(post)} className="card-link">
              {post.title}
            </Link>
          </h3>
          <Meta post={post} className="mt-auto pt-3" />
        </div>
        <div className="self-start overflow-hidden rounded-xl">
          <StoryImage
            post={post}
            sizes="160px"
            className="aspect-[4/3] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
        </div>
      </article>
    </Tilt>
  );
}

function Meta({ post, className = '' }: { post: PublicPost; className?: string }) {
  return (
    <p className={`text-sm text-ink-3 ${className}`}>
      {post.publishedAt && (
        <>
          <TimeAgo iso={post.publishedAt} />{' '}
          <span aria-hidden="true">· </span>
        </>
      )}
      {formatLine(post)}
    </p>
  );
}

/* ----------------------------------------------------------------- shelf */

export function FeatureShelf({ posts, showDesk = true }: { posts: PublicPost[]; showDesk?: boolean }) {
  return (
    <section aria-labelledby="shelf-title" className="overflow-hidden border-t border-hairline">
      <div className="container-page pt-16 md:pt-20">
        <div className="flex flex-wrap items-end justify-between gap-6">
          <div>
            <h2 id="shelf-title" className="display text-[clamp(2rem,4vw,3.25rem)]">
              Features
            </h2>
          </div>
          <p className="max-w-[40ch] text-ink-2">Researched from several sources, with context, and checked claim by claim.</p>
        </div>
      </div>
      <ul className="shelf mt-10 flex snap-x snap-mandatory gap-5 overflow-x-auto pb-16 md:pb-20">
        {posts.map((p) => (
          <li key={p.id} className="w-[min(82vw,22rem)] shrink-0 snap-center">
            <article className="group relative flex h-full flex-col overflow-hidden rounded-2xl border border-hairline bg-surface">
              <div className="overflow-hidden">
                <StoryImage
                  post={p}
                  sizes="352px"
                  className="aspect-[16/10] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.05]"
                />
              </div>
              <div className="flex flex-1 flex-col p-5">
                <div className="relative z-10">
                  <Kicker post={p} showDesk={showDesk} />
                </div>
                <h3 className="mt-2 text-xl font-bold leading-snug tracking-[-0.015em]">
                  <Link href={storyPath(p)} className="card-link">
                    {p.title}
                  </Link>
                </h3>
                {p.excerpt && <p className="mt-2 line-clamp-3 text-ink-2">{p.excerpt}</p>}
                <Meta post={p} className="mt-auto pt-4" />
              </div>
            </article>
          </li>
        ))}
      </ul>
    </section>
  );
}

/* ---------------------------------------------------------------- portal */

export function PhotoPortal({
  brand,
  count,
  large = false,
  className = '',
}: {
  brand: BrandId;
  count?: number;
  large?: boolean;
  className?: string;
}) {
  const b = BRAND_BY_ID[brand];
  const c = BRAND_CONTENT[brand];
  const desk = DESKS[brand];
  return (
    <Tilt max={6} className={`group relative rounded-2xl ${className}`}>
      <Link href={`/${b.slug}`} className="on-photo tilt-3d absolute inset-0 block rounded-2xl">
        <div className="card-frame absolute inset-0 overflow-hidden rounded-2xl border border-hairline">
          <Picture
            name={c.image}
            alt={c.imageAlt}
            sizes={large ? '(min-width: 768px) 55vw, 100vw' : '(min-width: 768px) 33vw, 100vw'}
            className="absolute inset-0 size-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.06]"
          />
          <div aria-hidden="true" className="scrim-bottom absolute inset-0" />
          <div aria-hidden="true" className="glare absolute inset-0" />
        </div>
        <div className="depth-2 absolute inset-x-0 bottom-0 p-6 md:p-7">
          <span aria-hidden="true" className="mb-4 block h-[3px] w-10 rounded-full" style={{ background: desk.accent }} />
          <span className={`block font-serif font-bold tracking-[-0.03em] ${large ? 'text-4xl md:text-5xl' : 'text-3xl'}`}>
            {desk.name}
          </span>
          <span className="mt-2 flex items-center gap-2 text-ink-2">
            {count !== undefined ? `${count} ${count === 1 ? 'story' : 'stories'}` : c.tileCaption}
            <ArrowRight aria-hidden="true" size={16} className="transition-transform duration-200 group-hover:translate-x-1" />
          </span>
        </div>
      </Link>
    </Tilt>
  );
}
