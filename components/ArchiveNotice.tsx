/** Shown on every archive page: these posts were never fact-checked. */
import Link from 'next/link';

export function ArchiveNotice() {
  return (
    <div role="note" className="archive-note rounded-2xl border px-5 py-4">
      <p className="font-semibold">Archived from nuvox-ai.com</p>
      <p className="archive-note-body mt-1 text-sm leading-relaxed">
        Published in March and April 2026, before our fact-checking process existed. Figures and
        claims were not independently verified and may be outdated or wrong. For checked stories, read
        the current <Link href="/ai" className="underline underline-offset-4">AI desk</Link>.
      </p>
    </div>
  );
}
