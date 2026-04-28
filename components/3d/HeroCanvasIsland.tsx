'use client';

/**
 * HeroCanvasIsland — client-only mount point for the hero R3F scene.
 *
 * Decides at runtime whether to render the heavy 3D canvas or fall back to
 * a static brand banner. The fallback is what mobile / save-data / reduced-
 * motion users see — and what crawlers see at LCP time.
 */
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useDeviceCapability } from '@/lib/use-device-capability';
import { Canvas3D } from './Canvas3D';
import type { BrandId } from '@/lib/brands';

const HeroScene = dynamic(() => import('./HeroScene').then((m) => m.HeroScene), {
  ssr: false,
});

interface Props {
  brand?: BrandId;
}

export function HeroCanvasIsland({ brand = 'nuvox_ai' }: Props) {
  const { degraded } = useDeviceCapability();

  return (
    <div className="absolute inset-0 -z-10">
      {/* Static poster — visible during LCP on every device, persistent on mobile */}
      <Image
        src={`/banners/${brand}_1.1920.avif`}
        alt=""
        fill
        priority
        sizes="100vw"
        className="object-cover opacity-40"
      />
      <div className="absolute inset-0 bg-gradient-to-b from-background/40 via-background/60 to-background" />

      {/* Heavy 3D canvas — only on capable devices */}
      {!degraded && (
        <Canvas3D
          camera={{ position: [0, 0, 4], fov: 45 }}
          frameloop="always"
          className="absolute inset-0"
        >
          <HeroScene brand={brand} />
        </Canvas3D>
      )}
    </div>
  );
}
