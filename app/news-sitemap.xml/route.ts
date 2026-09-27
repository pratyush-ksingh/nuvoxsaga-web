/** /news-sitemap.xml: Google News sitemap (stories from the last 48 hours at build time). */
import { loadAllPosts } from '@/lib/content';
import { newsSitemap } from '@/lib/feeds';

export const dynamic = 'force-static';

export function GET() {
  return newsSitemap(loadAllPosts());
}
