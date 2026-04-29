'use client';

/**
 * TiltCard — gentle rise + scale on hover. Used on the 3 brand cards on
 * the homepage.
 *
 * Earlier draft used 3D rotateX/rotateY tilt; demoted to a "rise" because
 * 3D tilt over an Image with object-cover breaks the framing on hover —
 * looks scrappy on phone. Rise + tiny scale lifts the card cleanly.
 *
 * Reduced-motion: static div, no transitions.
 */
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

export function TiltCard({
  children,
  className,
}: {
  children: ReactNode;
  className?: string;
}) {
  const reduce = useReducedMotion();
  if (reduce) return <div className={className}>{children}</div>;
  return (
    <motion.div
      className={className}
      whileHover={{ y: -6, scale: 1.012 }}
      transition={{ type: 'spring', damping: 18, stiffness: 220 }}
    >
      {children}
    </motion.div>
  );
}
