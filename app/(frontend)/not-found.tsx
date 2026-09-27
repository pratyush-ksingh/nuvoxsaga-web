import Link from 'next/link';
import { BRANDS } from '@/lib/brands';

export default function NotFound() {
  return (
    <section className="container-page py-24 md:py-32">
      <h1 className="display max-w-[16ch] text-[clamp(2.5rem,6vw,4.5rem)]">This page does not exist.</h1>
      <p className="mt-6 max-w-[48ch] text-lg text-ink-2">
        The link may be old or mistyped. Start from the home page or pick a publication.
      </p>
      <div className="mt-10 flex flex-wrap items-center gap-x-7 gap-y-4">
        <Link href="/" className="btn-primary">
          Go to the home page
        </Link>
        {BRANDS.map((b) => (
          <Link key={b.id} href={`/${b.slug}`} className="link-arrow text-ink-2">
            {b.name}
          </Link>
        ))}
      </div>
    </section>
  );
}
