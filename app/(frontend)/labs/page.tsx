import type { Metadata } from 'next';
import { LabsPlayground } from '@/components/3d/LabsPlayground';

export const metadata: Metadata = {
  title: 'Labs',
  description:
    '3D experiments: a physics sandbox, a shader gallery and a gaussian splat viewer.',
  alternates: { canonical: '/labs' },
};

export default function LabsPage() {
  return (
    <section className="container-page pb-24 pt-14 md:pt-20">
      <h1 className="display text-[clamp(2.5rem,5vw,4rem)]">Labs</h1>
      <p className="mt-4 max-w-[52ch] text-lg text-ink-2">
        3D experiments that are not part of the main site yet. With reduced motion turned on, you see a still gallery instead.
      </p>

      <div className="mt-16">
        <LabsPlayground />
      </div>

      <ul className="mt-20 grid gap-10 text-ink-2 md:grid-cols-3">
        <li>
          <h3 className="text-lg font-bold text-ink">Physics</h3>
          <p className="mt-2">
            Rapier WASM bodies, falling under brand-tinted lighting. Click-and-drag to
            disturb the stack.
          </p>
        </li>
        <li>
          <h3 className="text-lg font-bold text-ink">Shaders</h3>
          <p className="mt-2">
            Lygia compositions over drei materials. No custom GLSL beyond the hero
            displacement. It proves &ldquo;compose, don&apos;t author&rdquo;.
          </p>
        </li>
        <li>
          <h3 className="text-lg font-bold text-ink">Splats</h3>
          <p className="mt-2">
            Gaussian splat viewer arrives once we have a CC0 capture worth showing.
            Rendered via @mkkellogg/gaussian-splats-3d, self-hosted .ksplat.
          </p>
        </li>
      </ul>
    </section>
  );
}
