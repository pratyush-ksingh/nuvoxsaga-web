'use client';

/**
 * RevealText — fade-up reveal on scroll-into-view.
 *
 * Phase 12 motion primitive. Use on h1s and pull-quotes that should
 * "land" rather than just appear. Honours prefers-reduced-motion via
 * useReducedMotion — returns a static element with no transitions when set.
 *
 * Single `viewport={{ once: true }}` prevents thrashing animation on
 * scroll-back-up. Easing is the standard "out-quart" curve used by
 * Linear / Vercel marketing pages.
 */
import { motion, useReducedMotion } from 'framer-motion';
import type { ReactNode } from 'react';

type Tag = 'span' | 'div' | 'h1' | 'h2' | 'h3' | 'p';

interface Props {
  children: ReactNode;
  className?: string;
  delay?: number;
  as?: Tag;
}

const easeOutQuart: [number, number, number, number] = [0.16, 1, 0.3, 1];

export function RevealText({ children, className, delay = 0, as = 'span' }: Props) {
  const reduce = useReducedMotion();
  if (reduce) {
    if (as === 'h1') return <h1 className={className}>{children}</h1>;
    if (as === 'h2') return <h2 className={className}>{children}</h2>;
    if (as === 'h3') return <h3 className={className}>{children}</h3>;
    if (as === 'p') return <p className={className}>{children}</p>;
    if (as === 'div') return <div className={className}>{children}</div>;
    return <span className={className}>{children}</span>;
  }
  const transition = { duration: 0.7, delay, ease: easeOutQuart };
  const initial = { opacity: 0, y: 24 };
  const whileInView = { opacity: 1, y: 0 };
  const viewport = { once: true, amount: 0.3 };
  if (as === 'h1') return <motion.h1 className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>{children}</motion.h1>;
  if (as === 'h2') return <motion.h2 className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>{children}</motion.h2>;
  if (as === 'h3') return <motion.h3 className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>{children}</motion.h3>;
  if (as === 'p') return <motion.p className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>{children}</motion.p>;
  if (as === 'div') return <motion.div className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>{children}</motion.div>;
  return <motion.span className={className} initial={initial} whileInView={whileInView} viewport={viewport} transition={transition}>{children}</motion.span>;
}
