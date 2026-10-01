/**
 * Story card anatomy for the media-house layout (DESIGN.md §6). Front-page leads and
 * the 3D hero stage live in components/home/HomeFront.tsx.
 *   SecondaryStory  16:9 image, kicker, headline ("More from <desk>" on a story page)
 *   River           the "Latest" list: time, kicker, headline, deck, optional thumbnail
 *   HeadlineList    compact numbered headlines (desk blocks, sidebars)
 * The kicker is "Desk · Section" in the desk accent plus the format label ("Brief" or
 * "Feature", same style for both: DESIGN.md §6, Formats). formatLine() gives the length and
 * source cue that goes with it: "1 min · Source: NASA" or "6 min · 6 sources".
 */
import fs from 'node:fs';
import path from 'node:path';
import Link from 'next/link';
import { BRAND_BY_ID } from '@/lib/brands';
import { BRAND_CONTENT } from '@/lib/brand-content';
import { DESKS, findSection } from '@/lib/desks';
import { storyPath, type PublicPost } from '@/lib/content';
import { Picture } from '@/components/Picture';
import { formatLine, sourceCount } from '@/lib/formats';

export { formatLine, sourceCount };
import { TimeAgo } from '@/components/TimeAgo';

/** The pipeline may write a 480px sibling (<name>-480.webp) for list thumbnails. */
const smallVariants = new Map<string, string | null>();
function smallVariant(src: string): string | null {
  let small = smallVariants.get(src);
  if (small === undefined) {
    const candidate = src.replace(/\.(\w+)$/, '-480.$1');
    small = fs.existsSync(path.join(process.cwd(), 'public', candidate)) ? candidate : null;
    smallVariants.set(src, small);
  }
  return small;
}

export function StoryImage({
  post,
  sizes,
  className,
  priority = false,
}: {
  post: PublicPost;
  sizes: string;
  className?: string;
  priority?: boolean;
}) {
  if (!post.image) {
    // Desk illustration as a neutral fallback; decorative, so empty alt.
    return <Picture name={BRAND_CONTENT[post.brand].image} alt="" sizes={sizes} className={className} priority={priority} />;
  }
  const small = smallVariant(post.image.src);
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export: pre-encoded files
    <img
      src={post.image.src}
      srcSet={small ? `${small} 480w, ${post.image.src} 1200w` : undefined}
      sizes={small ? sizes : undefined}
      alt={post.image.alt}
      width={1200}
      height={675}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className}
    />
  );
}

export function Kicker({ post, showDesk = true }: { post: PublicPost; showDesk?: boolean }) {
  const desk = DESKS[post.brand];
  const section = findSection(post.brand, post.section);
  const brand = BRAND_BY_ID[post.brand];
  return (
    <p className="flex flex-wrap items-center gap-x-2 text-sm font-medium">
      {showDesk && (
        <Link href={`/${brand.slug}`} className="hover:underline hover:underline-offset-4" style={{ color: desk.accent }}>
          {desk.name}
        </Link>
      )}
      {showDesk && section && <span aria-hidden="true" className="text-ink-3">·</span>}
      {section && (
        <Link
          href={`/${brand.slug}/${section.slug}`}
          className="hover:underline hover:underline-offset-4"
          style={showDesk ? undefined : { color: desk.accent }}
        >
          {section.name}
        </Link>
      )}
      <FormatLabel post={post} />
    </p>
  );
}

/** "Brief" or "Feature": one label style for both formats, so neither reads as the default. */
export function FormatLabel({ post }: { post: PublicPost }) {
  return (
    <span className="rounded-full border border-hairline px-2 py-0.5 text-xs font-medium text-ink-2">
      {post.kind === 'brief' ? 'Brief' : 'Feature'}
    </span>
  );
}

export function SecondaryStory({ post, showDesk = true }: { post: PublicPost; showDesk?: boolean }) {
  const href = storyPath(post);
  return (
    <article>
      <Link href={href} tabIndex={-1} aria-hidden="true" className="group block overflow-hidden rounded-2xl">
        <StoryImage
          post={post}
          sizes="(min-width: 768px) 30vw, 100vw"
          className="aspect-[16/9] w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.04]"
        />
      </Link>
      <div className="mt-4">
        <Kicker post={post} showDesk={showDesk} />
        <h3 className="mt-2 text-xl font-bold leading-snug tracking-[-0.015em]">
          <Link href={href} className="transition-colors duration-150 hover:text-ink-2">
            {post.title}
          </Link>
        </h3>
        {post.publishedAt && <TimeAgo iso={post.publishedAt} className="mt-2 block text-sm text-ink-3" />}
      </div>
    </article>
  );
}

export function River({ posts, showDesk = true }: { posts: PublicPost[]; showDesk?: boolean }) {
  return (
    <ol className="divide-y divide-hairline border-y border-hairline">
      {posts.map((p) => {
        const href = storyPath(p);
        // Briefs are compact, text-led rows; features carry a picture (DESIGN.md §6, Formats).
        const thumb = p.kind === 'feature';
        return (
          <li key={p.id}>
            <article className={`grid gap-4 py-6 ${thumb ? 'grid-cols-[1fr_6.5rem] md:grid-cols-[6rem_1fr_10rem]' : 'md:grid-cols-[6rem_1fr]'} md:gap-8`}>
              {p.publishedAt && (
                <TimeAgo iso={p.publishedAt} className="hidden font-mono text-sm text-ink-3 md:block md:pt-0.5" />
              )}
              <div className="min-w-0">
                <Kicker post={p} showDesk={showDesk} />
                <h3 className="mt-1.5 text-lg font-bold leading-snug tracking-[-0.015em] md:text-xl">
                  <Link href={href} className="transition-colors duration-150 hover:text-ink-2">
                    {p.title}
                  </Link>
                </h3>
                {p.excerpt && <p className="mt-1.5 line-clamp-2 max-w-[62ch] text-ink-2">{p.excerpt}</p>}
                <p className="mt-2 text-sm text-ink-3">
                  {p.publishedAt && (
                    <>
                      <TimeAgo iso={p.publishedAt} className="md:hidden" />
                      <span aria-hidden="true" className="md:hidden"> · </span>
                    </>
                  )}
                  {formatLine(p)}
                </p>
              </div>
              {thumb && (
                <Link href={href} tabIndex={-1} aria-hidden="true" className="block self-start overflow-hidden rounded-xl md:rounded-2xl">
                  <StoryImage post={p} sizes="(min-width: 768px) 160px, 104px" className="aspect-[4/3] w-full object-cover" />
                </Link>
              )}
            </article>
          </li>
        );
      })}
    </ol>
  );
}

export function HeadlineList({ posts, numbered = false }: { posts: PublicPost[]; numbered?: boolean }) {
  return (
    <ol className="divide-y divide-hairline">
      {posts.map((p, i) => (
        <li key={p.id} className="flex gap-4 py-4">
          {numbered && (
            <span aria-hidden="true" className="w-6 shrink-0 font-mono text-lg font-bold text-ink-3">
              {i + 1}
            </span>
          )}
          <div className="min-w-0">
            <h3 className="font-semibold leading-snug">
              <Link href={storyPath(p)} className="transition-colors duration-150 hover:text-ink-2">
                {p.title}
              </Link>
            </h3>
            {p.publishedAt && <TimeAgo iso={p.publishedAt} className="mt-1 block text-sm text-ink-3" />}
          </div>
        </li>
      ))}
    </ol>
  );
}
