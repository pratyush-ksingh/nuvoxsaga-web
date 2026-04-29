'use client';

/**
 * MagneticLink — primary CTA that follows the cursor within a small radius.
 *
 * Phase 12 motion primitive. Use ONLY on the highest-intent CTA on a page
 * (e.g. "Read the blog"). Magnetic effect at scale is annoying; reserved
 * for moments where you want the user to feel pulled in.
 *
 * Reduced-motion users get a static link with a normal hover state. The
 * spring damping is tuned for "follows but doesn't drag" — pull strength
 * 0.3 of cursor distance, ~200ms ease-out.
 */
import { motion, useMotionValue, useSpring, useReducedMotion } from 'framer-motion';
import Link from 'next/link';
import { useRef, type ReactNode } from 'react';

export function MagneticLink({
  href,
  children,
  className,
}: {
  href: string;
  children: ReactNode;
  className?: string;
}) {
  const ref = useRef<HTMLAnchorElement>(null);
  const x = useMotionValue(0);
  const y = useMotionValue(0);
  const sx = useSpring(x, { damping: 18, stiffness: 220 });
  const sy = useSpring(y, { damping: 18, stiffness: 220 });
  const reduce = useReducedMotion();

  if (reduce) {
    return (
      <Link href={href} className={className}>
        {children}
      </Link>
    );
  }

  return (
    <motion.span
      style={{ x: sx, y: sy, display: 'inline-block' }}
      onMouseMove={(e) => {
        if (!ref.current) return;
        const r = ref.current.getBoundingClientRect();
        x.set((e.clientX - (r.left + r.width / 2)) * 0.3);
        y.set((e.clientY - (r.top + r.height / 2)) * 0.3);
      }}
      onMouseLeave={() => {
        x.set(0);
        y.set(0);
      }}
    >
      <Link ref={ref} href={href} className={className}>
        {children}
      </Link>
    </motion.span>
  );
}
