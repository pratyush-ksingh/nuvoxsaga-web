/**
 * Parent landing page (/).
 *
 * Phase 8: editorial 3-brand portal placeholder. Phase 9 wires the unified
 * gaussian-splat hero canvas with scroll-driven camera through brand zones.
 */
import Link from 'next/link';
import Image from 'next/image';
import type { Metadata } from 'next';
import { BRANDS } from '@/lib/brands';

export const metadata: Metadata = {
  title: 'Nuvoxsaga — three frontiers, one saga',
  description:
    'Nuvoxsaga is the saga of three frontiers: AI, space, and the world. Long-form essays, daily shorts, and a media house for what comes next.',
  alternates: { canonical: '/' },
};

export default function Home() {
  return (
    <>
      {/* Hero — placeholder for Phase 9 gaussian-splat canvas */}
      <section className="relative overflow-hidden">
        <div className="mx-auto max-w-7xl px-6 pt-24 pb-32">
          <p className="text-xs uppercase tracking-[0.3em] text-foreground/40">A media house</p>
          <h1 className="mt-6 text-6xl md:text-7xl lg:text-8xl leading-[0.95] max-w-5xl">
            Three frontiers.
            <br />
            <span className="text-foreground/50">One saga.</span>
          </h1>
          <p className="mt-8 max-w-2xl text-lg text-foreground/65">
            Long-form essays and daily shorts on AI, space, and the world. Built by editors,
            not algorithms — though we use the algorithms too.
          </p>
        </div>
      </section>

      {/* 3 brand zones */}
      <section className="mx-auto max-w-7xl px-6 pb-24">
        <p className="text-xs uppercase tracking-[0.3em] text-foreground/40 mb-8">The brands</p>
        <div className="grid gap-6 md:grid-cols-3">
          {BRANDS.map((b) => (
            <Link
              key={b.id}
              href={`/${b.slug}`}
              data-brand={b.id}
              className="group relative aspect-[4/5] rounded-xl overflow-hidden border border-white/10 bg-card hover:border-[var(--brand)] transition-colors"
            >
              <Image
                src={`/banners/${b.id}_1.768.avif`}
                alt={`${b.name} hero banner`}
                fill
                sizes="(max-width: 768px) 100vw, 33vw"
                className="object-cover opacity-50 group-hover:opacity-70 transition-opacity"
                priority={b.id === 'nuvox_ai'}
              />
              <div className="absolute inset-0 bg-gradient-to-t from-background via-background/60 to-transparent" />
              <div className="absolute inset-0 flex flex-col justify-end p-6">
                <div className="flex items-center gap-2">
                  <div className="size-1.5 rounded-full bg-[var(--brand)]" />
                  <span className="text-xs uppercase tracking-widest text-foreground/60">
                    {b.handle}
                  </span>
                </div>
                <h3 className="mt-2 text-3xl">{b.name}</h3>
                <p className="mt-1 text-sm text-foreground/60 capitalize">
                  {b.niche.replace(/_/g, ' ')}
                </p>
              </div>
            </Link>
          ))}
        </div>
      </section>
    </>
  );
}
