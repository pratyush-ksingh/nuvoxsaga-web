/** /feed.xml: RSS for every desk, rendered once at build. */
import { loadAllPosts } from '@/lib/content';
import { rss } from '@/lib/feeds';

export const dynamic = 'force-static';

export function GET() {
  return rss({
    title: 'Nuvoxsaga',
    path: '/',
    description: 'AI, space and world news, checked against the sources before publication.',
    posts: loadAllPosts(),
  });
}
