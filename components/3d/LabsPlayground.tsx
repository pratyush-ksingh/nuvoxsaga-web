'use client';

/* eslint-disable @typescript-eslint/no-require-imports --
 * require() is used INTENTIONALLY here as the only Next-supported way to
 * lazy-load client-only deps (drei, rapier, postprocessing) inside a
 * sub-component that's already wrapped in dynamic(ssr:false). Static
 * `import` would pull these into the SSR bundle and break the build.
 */

/**
 * LabsPlayground — physics + shader sandbox for /labs.
 *
 * Heavy bundle, only loaded on this route. Falls back to a static caption
 * on degraded devices.
 */
import dynamic from 'next/dynamic';
import { useDeviceCapability } from '@/lib/use-device-capability';
import { Canvas3D } from './Canvas3D';

const Scene = dynamic(() => Promise.resolve(SceneImpl), { ssr: false });

function SceneImpl() {
  const { Physics, RigidBody, CuboidCollider } =
    require('@react-three/rapier') as typeof import('@react-three/rapier');
  const { MeshTransmissionMaterial, Float } =
    require('@react-three/drei') as typeof import('@react-three/drei');
  const { EffectComposer, Bloom, Noise } =
    require('@react-three/postprocessing') as typeof import('@react-three/postprocessing');

  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[5, 10, 5]} intensity={1.4} />
      <pointLight position={[-5, 5, 5]} intensity={0.8} color="#7B2FFF" />

      <Physics gravity={[0, -9.81, 0]}>
        {/* Floor */}
        <RigidBody type="fixed" colliders={false}>
          <CuboidCollider args={[10, 0.5, 10]} position={[0, -3, 0]} />
        </RigidBody>

        {/* 8 falling bodies */}
        {Array.from({ length: 8 }).map((_, i) => (
          <RigidBody
            key={i}
            position={[(i % 4) - 1.5, 4 + i * 0.7, (i % 2) - 0.5]}
            colliders="ball"
            restitution={0.4}
          >
            <mesh castShadow>
              <icosahedronGeometry args={[0.45, 1]} />
              <MeshTransmissionMaterial
                color="#00B4FF"
                thickness={0.4}
                roughness={0.05}
                transmission={1}
                ior={1.4}
                chromaticAberration={0.05}
              />
            </mesh>
          </RigidBody>
        ))}

        {/* Static glass sculpture as anchor */}
        <Float speed={0.7} rotationIntensity={0.3} floatIntensity={0.2}>
          <mesh position={[0, 0, 0]}>
            <torusKnotGeometry args={[1, 0.32, 160, 24]} />
            <MeshTransmissionMaterial
              color="#7B2FFF"
              thickness={0.6}
              roughness={0}
              transmission={1}
              ior={1.5}
              chromaticAberration={0.08}
              backside
            />
          </mesh>
        </Float>
      </Physics>

      <EffectComposer>
        <Bloom intensity={0.65} luminanceThreshold={0.5} luminanceSmoothing={0.4} />
        <Noise opacity={0.05} />
      </EffectComposer>
    </>
  );
}

export function LabsPlayground() {
  const { degraded, reason } = useDeviceCapability();

  if (degraded) {
    return (
      <div className="aspect-video rounded-xl border border-white/10 bg-card flex items-center justify-center text-foreground/40 text-sm">
        Heavy 3D paused — {reason ?? 'device gate'}
      </div>
    );
  }

  return (
    <div className="aspect-video rounded-xl border border-white/10 bg-black overflow-hidden">
      <Canvas3D camera={{ position: [0, 1, 8], fov: 50 }} frameloop="always">
        <Scene />
      </Canvas3D>
    </div>
  );
}
