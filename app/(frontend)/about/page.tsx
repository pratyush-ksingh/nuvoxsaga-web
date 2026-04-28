import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'About',
  description:
    'Nuvoxsaga is a media house at the intersection of AI, space, and the world.',
  alternates: { canonical: '/about' },
};

const ACTS = [
  {
    label: '01',
    title: 'Origin',
    body: 'A daily content engine wired into surveillance, retention math, and a Bayesian feedback loop. The goal: ship media that earns attention by being honest about how attention works.',
  },
  {
    label: '02',
    title: 'Voice',
    body: 'Three brands — AI, Space, World — sharing one editorial spine. We use AI tools to produce more, but we use editors to decide what should exist at all.',
  },
  {
    label: '03',
    title: 'Vision',
    body: 'A media house owned by its audience, not its advertisers. A place where every piece is measured by retention, not impressions — and every voice is real.',
  },
];

export default function AboutPage() {
  return (
    <article className="mx-auto max-w-3xl px-6 py-32">
      <p className="text-xs uppercase tracking-[0.3em] text-foreground/40">About</p>
      <h1 className="mt-6 text-6xl leading-[0.95]">Three frontiers, one editorial spine.</h1>

      <div className="mt-24 space-y-32">
        {ACTS.map((a) => (
          <section key={a.label} className="grid gap-8 md:grid-cols-[80px_1fr] items-baseline">
            <div className="text-xs tracking-widest text-foreground/40">{a.label}</div>
            <div>
              <h2 className="text-4xl">{a.title}</h2>
              <p className="mt-6 text-lg text-foreground/70 leading-relaxed">{a.body}</p>
            </div>
          </section>
        ))}
      </div>

      {/* Phase 9.4 follow-up: scroll-driven R3F camera through 3 narrative beats.
          Static text version above is the prefers-reduced-motion fallback and
          base content for crawlers/SEO. The 3D enhancement layers on top. */}
    </article>
  );
}
