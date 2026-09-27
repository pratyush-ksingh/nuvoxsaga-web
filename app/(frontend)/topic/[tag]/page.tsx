/** /topic/<tag>: every story carrying a tag, across desks. */
import { notFound } from 'next/navigation';
import type { Metadata } from 'next';
import { loadTopics } from '@/lib/content';
import { River } from '@/components/news/StoryCards';

interface Props {
  params: Promise<{ tag: string }>;
}

export const dynamicParams = false;

export function generateStaticParams() {
  const tags = [...loadTopics().keys()].map((tag) => ({ tag }));
  // Static export refuses an empty list; the post-build script deletes the placeholder.
  return tags.length ? tags : [{ tag: '_placeholder' }];
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { tag } = await params;
  const topic = loadTopics().get(tag);
  if (!topic) return {};
  return { title: topic.name, alternates: { canonical: `/topic/${tag}` } };
}

export default async function TopicPage({ params }: Props) {
  const { tag } = await params;
  const topic = loadTopics().get(tag);
  if (!topic) notFound();
  return (
    <section className="container-page pb-24 pt-10 md:pt-14">
      <p className="text-sm font-medium text-ink-3">Topic</p>
      <h1 className="display mt-2 text-[clamp(2.5rem,6vw,4.5rem)]">{topic.name}</h1>
      <p className="mt-3 text-ink-2">
        {topic.posts.length} {topic.posts.length === 1 ? 'story' : 'stories'}
      </p>
      <h2 className="sr-only">Stories</h2>
      <div className="mt-10">
        <River posts={topic.posts.slice(0, 100)} />
      </div>
    </section>
  );
}
