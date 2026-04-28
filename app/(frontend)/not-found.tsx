import Link from 'next/link';

export default function NotFound() {
  return (
    <div className="mx-auto max-w-2xl px-6 py-32 text-center">
      <p className="text-xs uppercase tracking-widest text-foreground/40">404</p>
      <h1 className="mt-4 text-5xl">The page you wanted is off the map.</h1>
      <p className="mt-6 text-foreground/60">
        Either it never existed, or it sailed before you found it.
      </p>
      <div className="mt-10">
        <Link
          href="/"
          className="inline-flex h-10 items-center justify-center rounded-md border border-white/10 px-6 text-sm hover:border-[var(--brand)] transition-colors"
        >
          Back to the saga
        </Link>
      </div>
    </div>
  );
}
