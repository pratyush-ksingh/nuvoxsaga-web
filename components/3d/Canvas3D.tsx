'use client';

/**
 * Canvas3D — wraps @react-three/fiber's Canvas with the project's 3D defaults.
 *
 * - DPR clamped [1, 1.5] (mobile-safe pixel ratio).
 * - Tone mapping ACES (cinematic baseline).
 * - frameloop="demand" — render only when something changes; saves battery.
 * - Suspense fallback = null (parent is responsible for the static poster).
 *
 * Phase 11 follow-up: add `gl={{ powerPreference: 'low-power' }}` if Vercel
 * Analytics shows we're triggering high-power GPU on integrated chips.
 */
import { Canvas, type CanvasProps } from '@react-three/fiber';
import { ACESFilmicToneMapping } from 'three';
import { Suspense, type ReactNode } from 'react';

interface Props extends Omit<CanvasProps, 'children'> {
  children: ReactNode;
  /**
   * If true, renders nothing — used by parent components that detect a
   * degraded device and want to short-circuit the canvas. Cheaper than
   * always-mounting + always-cleaning-up.
   */
  disabled?: boolean;
  fallback?: ReactNode;
}

export function Canvas3D({ children, disabled, fallback = null, ...rest }: Props) {
  if (disabled) return <>{fallback}</>;

  return (
    <Canvas
      dpr={[1, 1.5]}
      gl={{
        antialias: true,
        toneMapping: ACESFilmicToneMapping,
        toneMappingExposure: 1.0,
      }}
      frameloop="demand"
      {...rest}
    >
      <Suspense fallback={null}>{children}</Suspense>
    </Canvas>
  );
}
