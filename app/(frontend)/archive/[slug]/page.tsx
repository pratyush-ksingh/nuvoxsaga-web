import { notFound } from 'next/navigation';
import Link from 'next/link';
import type { Metadata } from 'next';
import { getArchivePost, loadArchive } from '@/lib/archive';
import { ArchiveNotice } from '@/components/ArchiveNotice';

interface Props {
  params: Promise<{ slug: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  return loadArchive().map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getArchivePost(slug);
  if (!post) return {};
  return {
    title: `${post.title} (archive)`,
    description: post.excerpt,
    alternates: { canonical: `/archive/${post.slug}` },
    robots: { index: false, follow: false },
  };
}

const dateFmt = new Intl.DateTimeFormat('en', { year: 'numeric', month: 'long', day: 'numeric', timeZone: 'UTC' });

export default async function ArchivePostPage({ params }: Props) {
  const { slug } = await params;
  const post = getArchivePost(slug);
  if (!post) notFound();

  return (
    <article className="container-page pb-24 pt-14 md:pt-20">
      <header className="mx-auto max-w-[46rem]">
        <nav aria-label="Breadcrumb" className="text-sm font-medium">
          <Link href="/archive" className="text-ink-2 hover:text-ink hover:underline hover:underline-offset-4">
            Archive
          </Link>
        </nav>
        <h1 className="display mt-5 text-[clamp(2rem,4.5vw,3.25rem)]">{post.title}</h1>
        <div className="mt-6 flex flex-wrap gap-x-6 gap-y-2 border-y border-hairline py-4 text-sm text-ink-3">
          {post.publishedAt && (
            <time dateTime={post.publishedAt}>Originally published {dateFmt.format(new Date(post.publishedAt))}</time>
          )}
          {post.readingTimeMin ? <span>{post.readingTimeMin} min read</span> : null}
        </div>
        <div className="mt-8">
          <ArchiveNotice />
        </div>
      </header>

      <div
        // Sanitized at build time (lib/sanitize.ts); raw archive HTML is never rendered.
        // eslint-disable-next-line react/no-danger -- sanitized at build
        dangerouslySetInnerHTML={{ __html: post.bodyHtmlSanitized }}
        className="article-body mx-auto mt-12 max-w-[46rem]"
      />

      <div className="mx-auto mt-16 max-w-[46rem]">
        <Link href="/archive" className="link-arrow text-ink-2">
          All archived posts
        </Link>
      </div>
    </article>
  );
}
