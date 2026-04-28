import type { Metadata } from 'next';
import { LabsPlayground } from '@/components/3d/LabsPlayground';

export const metadata: Metadata = {
  title: 'Labs',
  description:
    'Experiments in heavy 3D — physics sandboxes, shader gallery, gaussian splat viewer.',
  alternates: { canonical: '/labs' },
};

export default function LabsPage() {
  return (
    <section className="mx-auto max-w-7xl px-6 py-24">
      <p className="text-xs uppercase tracking-[0.3em] text-foreground/40">Labs</p>
      <h1 className="mt-6 text-5xl">Heavy 3D playground.</h1>
      <p className="mt-4 max-w-2xl text-foreground/60">
        Where shader experiments live before they earn a place on the front page.
        Reduced-motion users get a static gallery instead.
      </p>

      <div className="mt-16">
        <LabsPlayground />
      </div>

      <ul className="mt-32 grid gap-6 md:grid-cols-3 text-sm text-foreground/60">
        <li>
          <h3 className="text-foreground text-lg">Physics</h3>
          <p className="mt-2">
            Rapier WASM bodies, falling under brand-tinted lighting. Click-and-drag to
            disturb the stack.
          </p>
        </li>
        <li>
          <h3 className="text-foreground text-lg">Shaders</h3>
          <p className="mt-2">
            Lygia compositions over drei materials. No custom GLSL beyond the hero
            displacement — proves "compose, don&apos;t author".
          </p>
        </li>
        <li>
          <h3 className="text-foreground text-lg">Splats</h3>
          <p className="mt-2">
            Gaussian splat viewer arrives once we have a CC0 capture worth showing.
            Rendered via @mkkellogg/gaussian-splats-3d, self-hosted .ksplat.
          </p>
        </li>
      </ul>
    </section>
  );
}
