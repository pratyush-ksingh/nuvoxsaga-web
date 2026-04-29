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
import { HeroCanvasIsland } from '@/components/3d/HeroCanvasIsland';
import { RevealText } from '@/components/motion/RevealText';
import { TiltCard } from '@/components/motion/TiltCard';

export const metadata: Metadata = {
  title: 'Nuvoxsaga — three frontiers, one saga',
  description:
    'Nuvoxsaga is the saga of three frontiers: AI, space, and the world. Long-form essays, daily shorts, and a media house for what comes next.',
  alternates: { canonical: '/' },
};

export default function Home() {
  return (
    <>
      {/* Hero — heavy 3D blob (Phase 9), static banner fallback on degraded devices.
          Phase 0+ swaps the procedural blob for a CC0 gaussian splat. */}
      <section className="relative overflow-hidden min-h-[80vh] flex items-end">
        <HeroCanvasIsland brand="nuvox_ai" />
        <div className="brand-glow relative mx-auto max-w-6xl px-6 pt-24 pb-32 w-full">
          <RevealText as="span" className="text-eyebrow">A media house</RevealText>
          <RevealText as="h1" delay={0.08} className="text-display mt-8 text-[clamp(3.5rem,10vw,9rem)] max-w-5xl">
            Three frontiers.
            <br />
            <span className="italic font-[350]" style={{ fontVariationSettings: "'opsz' 144, 'SOFT' 100" }}>
              One saga.
            </span>
          </RevealText>
          <RevealText as="p" delay={0.16} className="mt-10 max-w-2xl text-lg text-foreground/85 leading-relaxed">
            Long-form essays and daily shorts on AI, space, and the world. Built by editors,
            not algorithms — though we use the algorithms too.
          </RevealText>
        </div>
      </section>

      {/* 3 brand zones */}
      <section className="mx-auto max-w-6xl px-6 pb-section">
        <span className="text-eyebrow mb-10 inline-flex">The brands</span>
        <div className="grid gap-6 md:grid-cols-3">
          {BRANDS.map((b) => (
            <TiltCard key={b.id} className="rounded-xl">
            <Link
              href={`/${b.slug}`}
              data-brand={b.id}
              className="group relative block aspect-[4/5] rounded-xl overflow-hidden border border-white/10 bg-card hover:border-[var(--brand)] transition-colors"
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
                  <div className="size-1.5 rounded-full bg-[var(--brand)] shadow-[0_0_24px_var(--brand)]" />
                  <span className="text-xs uppercase tracking-[0.16em] text-foreground/85">
                    {b.handle}
                  </span>
                </div>
                <h3 className="mt-3 text-3xl tracking-tight" style={{ fontVariationSettings: "'opsz' 96" }}>{b.name}</h3>
                <p className="mt-1.5 text-sm text-foreground/70 capitalize">
                  {b.niche.replace(/_/g, ' ')}
                </p>
              </div>
            </Link>
            </TiltCard>
          ))}
        </div>
      </section>
    </>
  );
}
