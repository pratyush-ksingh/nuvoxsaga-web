'use client';

/**
 * HeroCanvasIsland — client-only mount point for the hero R3F scene.
 *
 * Decides at runtime whether to render the heavy 3D canvas or fall back to
 * a static brand banner. The fallback is what mobile / save-data / reduced-
 * motion users see — and what crawlers see at LCP time.
 *
 * Phase 11 (Phase 9 review M2): pause the canvas frameloop when the hero
 * is scrolled out of viewport. Saves GPU on long scroll, also pauses on
 * tab visibility changes.
 */
import dynamic from 'next/dynamic';
import Image from 'next/image';
import { useEffect, useRef, useState } from 'react';
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
  const hostRef = useRef<HTMLDivElement>(null);
  const [active, setActive] = useState(true);

  // IntersectionObserver — pause when scrolled out of view.
  useEffect(() => {
    const el = hostRef.current;
    if (!el || typeof IntersectionObserver === 'undefined') return;
    const io = new IntersectionObserver(
      (entries) => {
        for (const e of entries) setActive(e.isIntersecting);
      },
      { threshold: 0 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Pause when tab is backgrounded.
  useEffect(() => {
    function onVis() {
      if (document.visibilityState === 'hidden') setActive(false);
      else if (hostRef.current) {
        // Re-evaluate visibility against viewport on tab refocus.
        const rect = hostRef.current.getBoundingClientRect();
        const inView =
          rect.bottom > 0 && rect.top < window.innerHeight && rect.right > 0 && rect.left < window.innerWidth;
        setActive(inView);
      }
    }
    document.addEventListener('visibilitychange', onVis);
    return () => document.removeEventListener('visibilitychange', onVis);
  }, []);

  return (
    <div ref={hostRef} className="absolute inset-0 -z-10">
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

      {/* Heavy 3D canvas — only on capable devices, only when on-screen + tab focused */}
      {!degraded && (
        <Canvas3D
          camera={{ position: [0, 0, 4], fov: 45 }}
          frameloop={active ? 'always' : 'never'}
          className="absolute inset-0"
          ariaLabel={`Animated abstract shape representing the ${brand.replace('_', ' ')} brand.`}
        >
          <HeroScene brand={brand} />
        </Canvas3D>
      )}
    </div>
  );
}
