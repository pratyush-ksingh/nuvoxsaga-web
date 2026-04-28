'use client';

/**
 * Hero scene — procedural shader-driven blob.
 *
 * Phase 9.2 ships this as a stand-in for the gaussian splat captured in
 * Phase 0+ (see plan: "Sketchfab CC0 cathedral or crystal-sculpture splat").
 * The procedural placeholder is intentionally moody and abstract so it
 * looks "designed", not "default".
 *
 * Custom shader: vertex displacement via simplex noise (3D, time-driven).
 * No external GLB / no network fetch. Lygia-style noise inlined for now —
 * Phase 11 swap to `lygia/generative/snoise.glsl` import once we wire a
 * shader-import-loader (next.js-glsl).
 */
import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import { Float } from '@react-three/drei';
import { EffectComposer, Bloom, ChromaticAberration, Noise } from '@react-three/postprocessing';
import { BlendFunction } from 'postprocessing';
import * as THREE from 'three';
import { BRAND_BY_ID, type BrandId } from '@/lib/brands';

const VERT = /* glsl */ `
  uniform float uTime;
  uniform float uIntensity;
  varying vec3 vNormal;
  varying vec3 vPos;

  // 3D simplex noise (Ashima Arts, MIT). Lygia equivalent imported in Phase 11
  // once we wire next-glsl. Original copyright notice:
  //   Copyright (C) 2011 by Ashima Arts (Simplex noise)
  //   Permission is hereby granted, free of charge, to any person obtaining a copy
  //   of this software and associated documentation files (the "Software"), to deal
  //   in the Software without restriction, including without limitation the rights
  //   to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
  //   copies of the Software, and to permit persons to whom the Software is
  //   furnished to do so, subject to the following conditions:
  //   The above copyright notice and this permission notice shall be included in
  //   all copies or substantial portions of the Software.
  vec3 mod289(vec3 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec4 mod289(vec4 x){return x - floor(x*(1.0/289.0))*289.0;}
  vec4 permute(vec4 x){return mod289(((x*34.0)+1.0)*x);}
  vec4 taylorInvSqrt(vec4 r){return 1.79284291400159 - 0.85373472095314 * r;}
  float snoise(vec3 v){
    const vec2 C = vec2(1.0/6.0, 1.0/3.0);
    const vec4 D = vec4(0.0, 0.5, 1.0, 2.0);
    vec3 i  = floor(v + dot(v, C.yyy));
    vec3 x0 = v - i + dot(i, C.xxx);
    vec3 g = step(x0.yzx, x0.xyz);
    vec3 l = 1.0 - g;
    vec3 i1 = min(g.xyz, l.zxy);
    vec3 i2 = max(g.xyz, l.zxy);
    vec3 x1 = x0 - i1 + C.xxx;
    vec3 x2 = x0 - i2 + C.yyy;
    vec3 x3 = x0 - D.yyy;
    i = mod289(i);
    vec4 p = permute( permute( permute(
      i.z + vec4(0.0, i1.z, i2.z, 1.0)) +
      i.y + vec4(0.0, i1.y, i2.y, 1.0)) +
      i.x + vec4(0.0, i1.x, i2.x, 1.0));
    float n_ = 0.142857142857;
    vec3 ns = n_ * D.wyz - D.xzx;
    vec4 j = p - 49.0 * floor(p * ns.z * ns.z);
    vec4 x_ = floor(j * ns.z);
    vec4 y_ = floor(j - 7.0 * x_);
    vec4 x = x_ *ns.x + ns.yyyy;
    vec4 y = y_ *ns.x + ns.yyyy;
    vec4 h = 1.0 - abs(x) - abs(y);
    vec4 b0 = vec4(x.xy, y.xy);
    vec4 b1 = vec4(x.zw, y.zw);
    vec4 s0 = floor(b0)*2.0 + 1.0;
    vec4 s1 = floor(b1)*2.0 + 1.0;
    vec4 sh = -step(h, vec4(0.0));
    vec4 a0 = b0.xzyw + s0.xzyw*sh.xxyy;
    vec4 a1 = b1.xzyw + s1.xzyw*sh.zzww;
    vec3 p0 = vec3(a0.xy,h.x);
    vec3 p1 = vec3(a0.zw,h.y);
    vec3 p2 = vec3(a1.xy,h.z);
    vec3 p3 = vec3(a1.zw,h.w);
    vec4 norm = taylorInvSqrt(vec4(dot(p0,p0), dot(p1,p1), dot(p2,p2), dot(p3,p3)));
    p0 *= norm.x; p1 *= norm.y; p2 *= norm.z; p3 *= norm.w;
    vec4 m = max(0.6 - vec4(dot(x0,x0), dot(x1,x1), dot(x2,x2), dot(x3,x3)), 0.0);
    m = m * m;
    return 42.0 * dot(m*m, vec4(dot(p0,x0), dot(p1,x1), dot(p2,x2), dot(p3,x3)));
  }

  void main() {
    vNormal = normalize(normalMatrix * normal);
    float n = snoise(position * 1.4 + uTime * 0.18);
    vec3 displaced = position + normal * n * uIntensity;
    vPos = displaced;
    gl_Position = projectionMatrix * modelViewMatrix * vec4(displaced, 1.0);
  }
`;

const FRAG = /* glsl */ `
  uniform vec3 uColorA;
  uniform vec3 uColorB;
  varying vec3 vNormal;
  varying vec3 vPos;

  void main() {
    float fres = pow(1.0 - max(dot(vNormal, vec3(0.0, 0.0, 1.0)), 0.0), 2.5);
    vec3 base = mix(uColorA, uColorB, fres);
    gl_FragColor = vec4(base, 1.0);
  }
`;

function hexToColor(hex: string): THREE.Color {
  return new THREE.Color(hex);
}

interface SceneProps {
  brand: BrandId;
}

function Blob({ brand }: SceneProps) {
  const matRef = useRef<THREE.ShaderMaterial>(null);
  const palette = BRAND_BY_ID[brand].palette;

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uIntensity: { value: 0.32 },
      uColorA: { value: hexToColor(palette.primary) },
      uColorB: { value: hexToColor(palette.purple) },
    }),
    [palette.primary, palette.purple],
  );

  useFrame((state) => {
    if (matRef.current) {
      (matRef.current.uniforms.uTime as { value: number }).value = state.clock.elapsedTime;
    }
  });

  return (
    <Float speed={1.2} rotationIntensity={0.4} floatIntensity={0.6}>
      <mesh>
        <icosahedronGeometry args={[1.4, 64]} />
        <shaderMaterial
          ref={matRef}
          vertexShader={VERT}
          fragmentShader={FRAG}
          uniforms={uniforms}
          transparent={false}
        />
      </mesh>
    </Float>
  );
}

export function HeroScene({ brand = 'nuvox_ai' as BrandId }: { brand?: BrandId }) {
  return (
    <>
      <ambientLight intensity={0.4} />
      <pointLight position={[3, 4, 5]} intensity={1.4} />
      <Blob brand={brand} />
      <EffectComposer>
        <Bloom intensity={0.7} luminanceThreshold={0.55} luminanceSmoothing={0.4} />
        <ChromaticAberration
          offset={new THREE.Vector2(0.0008, 0.0008)}
          radialModulation={false}
          modulationOffset={0.5}
          blendFunction={BlendFunction.NORMAL}
        />
        <Noise opacity={0.06} blendFunction={BlendFunction.OVERLAY} />
      </EffectComposer>
    </>
  );
}
