'use client';

/**
 * Pointer-driven 3D tilt for a card (DESIGN.md §8, "Depth").
 *
 * Writes four CSS custom properties on the element and nothing else:
 *   --rx / --ry   rotation in degrees (the .tilt rule turns them into a transform)
 *   --gx / --gy   pointer position in %, for the specular glare layer
 * Children opt into depth with .depth-1 / .depth-2 (translateZ).
 *
 * It only runs for a fine, hovering pointer without reduced motion; touch screens
 * and reduced-motion readers get the flat card. One rAF per frame, no library.
 */
import { useEffect, useRef, type ReactNode } from 'react';

export function Tilt({ children, className = '', max = 7 }: { children: ReactNode; className?: string; max?: number }) {
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const ok = window.matchMedia('(hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)');
    if (!ok.matches) return;

    let frame = 0;
    let x = 0.5;
    let y = 0.5;
    const paint = () => {
      frame = 0;
      el.style.setProperty('--ry', `${((x - 0.5) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--rx', `${((0.5 - y) * 2 * max).toFixed(2)}deg`);
      el.style.setProperty('--gx', `${(x * 100).toFixed(1)}%`);
      el.style.setProperty('--gy', `${(y * 100).toFixed(1)}%`);
    };
    const onMove = (e: PointerEvent) => {
      const r = el.getBoundingClientRect();
      x = Math.min(1, Math.max(0, (e.clientX - r.left) / r.width));
      y = Math.min(1, Math.max(0, (e.clientY - r.top) / r.height));
      if (!frame) frame = requestAnimationFrame(paint);
    };
    const onLeave = () => {
      x = 0.5;
      y = 0.5;
      if (!frame) frame = requestAnimationFrame(paint);
    };
    el.dataset.tilt = 'on';
    el.addEventListener('pointermove', onMove);
    el.addEventListener('pointerleave', onLeave);
    return () => {
      cancelAnimationFrame(frame);
      el.removeEventListener('pointermove', onMove);
      el.removeEventListener('pointerleave', onLeave);
      delete el.dataset.tilt;
    };
  }, [max]);

  return (
    <div ref={ref} className={`tilt ${className}`}>
      {children}
    </div>
  );
}
