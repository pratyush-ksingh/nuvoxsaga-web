'use client';

/* eslint-disable @typescript-eslint/no-require-imports --
 * Lazy-load drei via require() inside the dynamic ssr:false sub-component
 * to keep three/drei out of the SSR bundle. See LabsPlayground.tsx for
 * the same pattern.
 */

/**
 * BrandOrb — lightweight per-brand 3D widget for /[brand] hero.
 *
 * Uses drei's MeshDistortMaterial — zero custom GLSL, brand-tinted via
 * the existing palette. Smaller, slower-frame budget than the parent hero
 * (so /[brand] pages compose cheaply).
 */
import dynamic from 'next/dynamic';
import { Canvas3D } from './Canvas3D';
import { useDeviceCapability } from '@/lib/use-device-capability';
import { BRAND_BY_ID, type BrandId } from '@/lib/brands';

const Inner = dynamic(() => Promise.resolve(InnerImpl), { ssr: false });

/**
 * Per-brand geometry for the smaller in-page orb (matches HeroScene's
 * shape language — Phase 12 Fix 5a). Distort + roughness tuned per shape:
 *  - Sphere on nuvox_space gets a brighter rim (rougher metal, brighter point light)
 *  - Torus on nuvox_world has lower distort so the ring shape remains readable
 */
function orbGeometry(brand: BrandId) {
  switch (brand) {
    case 'nuvox_space':
      return <sphereGeometry args={[1, 64, 64]} />;
    case 'nuvox_world':
      return <torusGeometry args={[0.72, 0.3, 24, 64]} />;
    case 'nuvox_ai':
    default:
      return <icosahedronGeometry args={[1, 4]} />;
  }
}

function brandOrbMaterial(brand: BrandId) {
  switch (brand) {
    case 'nuvox_space':
      return { speed: 1.6, distort: 0.32, roughness: 0.18, metalness: 0.72 };
    case 'nuvox_world':
      return { speed: 1.4, distort: 0.18, roughness: 0.25, metalness: 0.55 };
    case 'nuvox_ai':
    default:
      return { speed: 2, distort: 0.45, roughness: 0.1, metalness: 0.6 };
  }
}

function InnerImpl({ brand }: { brand: BrandId }) {
  // Avoid pulling in drei + three on the SSR pass — only client side.
  const { Float, MeshDistortMaterial } = require('@react-three/drei') as typeof import('@react-three/drei');
  const palette = BRAND_BY_ID[brand].palette;
  const mat = brandOrbMaterial(brand);
  return (
    <>
      <ambientLight intensity={0.5} />
      <pointLight position={[3, 3, 5]} intensity={1.2} color={palette.primary} />
      <Float speed={1.0} rotationIntensity={0.3} floatIntensity={0.5}>
        <mesh>
          {orbGeometry(brand)}
          <MeshDistortMaterial
            color={palette.primary}
            speed={mat.speed}
            distort={mat.distort}
            roughness={mat.roughness}
            metalness={mat.metalness}
          />
        </mesh>
      </Float>
    </>
  );
}

export function BrandOrb({ brand }: { brand: BrandId }) {
  const { degraded } = useDeviceCapability();
  if (degraded) return null;

  return (
    <Canvas3D
      camera={{ position: [0, 0, 3.2], fov: 50 }}
      className="aspect-square w-full"
      frameloop="always"
    >
      <Inner brand={brand} />
    </Canvas3D>
  );
}
