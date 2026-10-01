'use client';

/**
 * The Frontier Dial: the home page's signature instrument (DESIGN.md §6).
 *
 * A 24-hour UTC clock face with one orbit per desk. Every recent story is a point on its
 * desk's orbit at the time of day it was published (data from components/home/dial.ts).
 * Pointing at, or tabbing to, a point shows that story in the readout beside the dial;
 * every point is a real link. The orbit lines drift slowly; the points never move.
 *
 * Static HTML renders the full dial and the newest story in the readout, so it works
 * before hydration and without JavaScript.
 */
import Link from 'next/link';
import { useState } from 'react';
import { ArrowRight } from 'lucide-react';
import { BRANDS } from '@/lib/brands';
import { DESKS } from '@/lib/desks';
import type { DialData, DialDot } from '@/components/home/dial';

const SIZE = 600;
const C = SIZE / 2;
const RADII = [118, 178, 238];

/** Rounded to 0.01: Node and the browser disagree in the last digits of cos/sin,
 *  which would make the server HTML and the hydrated SVG differ. */
function point(angle: number, r: number) {
  const a = ((angle - 90) * Math.PI) / 180;
  const round = (n: number) => Math.round(n * 100) / 100;
  return { x: round(C + r * Math.cos(a)), y: round(C + r * Math.sin(a)) };
}

export function FrontierDial({ data }: { data: DialData }) {
  const [active, setActive] = useState<DialDot | undefined>(data.dots[0]);
  const hand = point(data.nowAngle, RADII[2] + 18);

  return (
    <div className="grid items-center gap-10 lg:grid-cols-[minmax(0,34rem)_1fr] lg:gap-16">
      <figure className="dial relative mx-auto w-full max-w-[34rem]" style={{ ['--now' as string]: `${data.nowAngle}deg` }}>
        <div aria-hidden="true" className="dial-sweep absolute inset-[7%] rounded-full" />
        <svg viewBox={`0 0 ${SIZE} ${SIZE}`} className="relative block w-full" role="group" aria-label={`Stories published, ${data.label.toLowerCase()}, by time of day in UTC`}>
          {/* Hour ticks: 24 around the outside, labels every six hours. */}
          <g aria-hidden="true">
            {Array.from({ length: 96 }, (_, i) => {
              const hour = i % 4 === 0;
              const a = point(i * 3.75, 272);
              const b = point(i * 3.75, hour ? 258 : 266);
              return (
                <line key={i} x1={a.x} y1={a.y} x2={b.x} y2={b.y} stroke="currentColor" strokeOpacity={hour ? 0.35 : 0.12} strokeWidth={hour ? 1.5 : 1} />
              );
            })}
            {[0, 6, 12, 18].map((h) => {
              const p = point(h * 15, 288);
              return (
                <text key={h} x={p.x} y={p.y} textAnchor="middle" dominantBaseline="central" className="data fill-ink-3 text-[13px]">
                  {String(h).padStart(2, '0')}
                </text>
              );
            })}
          </g>

          {/* One orbit per desk. */}
          <g aria-hidden="true">
            {BRANDS.map((b, i) => (
              <circle
                key={b.id}
                cx={C}
                cy={C}
                r={RADII[i]}
                fill="none"
                stroke={DESKS[b.id].accent}
                strokeOpacity={0.45}
                strokeWidth={1.25}
                strokeDasharray="1.5 6"
                className={`orbit orbit-${i}`}
              />
            ))}
          </g>

          {/* Edition hand: when this page was built. */}
          <line aria-hidden="true" x1={C} y1={C} x2={hand.x} y2={hand.y} stroke="currentColor" strokeOpacity={0.3} strokeWidth={1} />
          <circle aria-hidden="true" cx={C} cy={C} r={3} className="fill-ink" />

          {/* The stories. */}
          {data.dots.map((d) => {
            const p = point(d.angle, RADII[d.ring] + d.nudge);
            const on = active?.id === d.id;
            return (
              <Link
                key={d.id}
                href={d.href}
                aria-label={`${d.title}. ${DESKS[d.brand].name}, ${d.time} UTC`}
                onMouseEnter={() => setActive(d)}
                onFocus={() => setActive(d)}
                className="dial-dot"
              >
                <circle cx={p.x} cy={p.y} r={18} fill="transparent" />
                <circle cx={p.x} cy={p.y} r={on ? 11 : 0} fill="none" stroke={DESKS[d.brand].accent} strokeOpacity={0.6} className="dial-halo" />
                <circle cx={p.x} cy={p.y} r={on ? 6.5 : 5} fill={DESKS[d.brand].accent} className="dial-point" />
              </Link>
            );
          })}
        </svg>
        <figcaption className="sr-only">
          Each point is a story, placed on its desk&apos;s orbit at the time it was published. AI is the inner orbit,
          Space the middle and World the outer.
        </figcaption>
      </figure>

      <div>
        <p className="data text-sm text-ink-3">{data.label} · times in UTC</p>
        <dl className="mt-5 flex flex-wrap gap-x-8 gap-y-3">
          {BRANDS.map((b) => (
            <div key={b.id} className="flex items-baseline gap-2.5">
              <dt className="flex items-center gap-2 text-sm text-ink-2">
                <span aria-hidden="true" className="size-2 rounded-full" style={{ background: DESKS[b.id].accent }} />
                {DESKS[b.id].name}
              </dt>
              <dd className="data text-2xl text-ink">{data.counts[b.id]}</dd>
            </div>
          ))}
        </dl>

        {active && (
          <div aria-live="polite" className="mt-10 border-t border-hairline pt-8">
            <p className="data flex items-center gap-2 text-sm">
              <span style={{ color: DESKS[active.brand].accent }}>{DESKS[active.brand].name}</span>
              <span aria-hidden="true" className="text-ink-3">·</span>
              <span className="text-ink-3">{active.time} UTC</span>
            </p>
            <p className="display mt-3 max-w-[22ch] text-[clamp(1.75rem,3vw,2.6rem)]">
              <Link href={active.href} className="transition-colors duration-150 hover:text-ink-2">
                {active.title}
              </Link>
            </p>
            <Link href={active.href} tabIndex={-1} className="link-arrow mt-5 text-sm text-ink-2">
              Read the story <ArrowRight aria-hidden="true" size={15} />
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}
