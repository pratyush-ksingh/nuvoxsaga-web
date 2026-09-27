'use client';

import Image from 'next/image';
import { useState } from 'react';

/**
 * Lite YouTube embed — initial render is a poster + play button (zero JS
 * payload from YouTube), click swaps to the real iframe with autoplay.
 *
 * Used on /[brand]/blog/[slug] when post.sourceVideoId is set (video
 * embed posts produced by the daily upload pipeline). The body HTML for
 * those posts is just a fallback "Watch on YouTube" link because
 * Posts.beforeChange's DOMPurify FORBID_TAGS rejects <iframe> in the
 * body — the iframe ships from this component instead.
 *
 * CSP requirements (already in middleware.ts):
 *   - img-src includes https://i.ytimg.com
 *   - frame-src includes https://www.youtube-nocookie.com
 *
 * Defense in depth: video id is regex-validated to /^[A-Za-z0-9_-]{11}$/
 * before being interpolated into src or alt — same constraint used in the
 * Python video_sync publisher (Phase 12 W1c security review M-1).
 */

const YT_ID_RE = /^[A-Za-z0-9_-]{11}$/;

export function YouTubeEmbed({ videoId, title }: { videoId: string; title: string }) {
  const [loaded, setLoaded] = useState(false);

  if (!YT_ID_RE.test(videoId)) return null;

  if (loaded) {
    return (
      <div className="relative aspect-video w-full overflow-hidden rounded-2xl bg-black">
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0`}
          title={title}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          loading="lazy"
          className="absolute inset-0 h-full w-full border-0"
        />
      </div>
    );
  }

  return (
    <button
      type="button"
      onClick={() => setLoaded(true)}
      aria-label={`Play video: ${title}`}
      className="group relative block aspect-video w-full overflow-hidden rounded-2xl bg-black"
    >
      <Image
        src={`https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`}
        alt=""
        width={1280}
        height={720}
        sizes="(max-width: 768px) 100vw, 768px"
        className="absolute inset-0 h-full w-full object-cover transition-transform group-hover:scale-105"
        priority={false}
      />
      <span aria-hidden className="absolute inset-0 flex items-center justify-center">
        <span className="flex h-16 w-24 items-center justify-center rounded-xl bg-red-600/90 text-2xl text-white shadow-lg transition-transform group-hover:scale-110">
          {/* Play triangle in pure CSS — no svg dep */}
          <span className="ml-1 inline-block h-0 w-0 border-y-[10px] border-l-[16px] border-y-transparent border-l-white" />
        </span>
      </span>
    </button>
  );
}
