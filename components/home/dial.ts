/**
 * Data for the Frontier Dial (components/home/FrontierDial.tsx): each recent story as a
 * point on a 24-hour UTC clock face, one orbit per desk (AI inner, Space, World outer).
 *
 * The angle is the story's time of day (00:00 UTC at the top, clockwise), so the dial
 * shows when the newsroom published, not decoration. The window widens from 24 hours to
 * 3 or 7 days until it holds enough stories to read as a pattern.
 */
import type { BrandId } from '@/lib/brands';

export interface DialStory {
  id: string;
  title: string;
  href: string;
  brand: BrandId;
  publishedAt: string;
}

export interface DialDot extends DialStory {
  /** Degrees clockwise from 00:00 UTC at the top. */
  angle: number;
  /** 0 = AI (inner), 1 = Space, 2 = World (outer). */
  ring: number;
  /** Small radial offset so stories published minutes apart do not sit on top of each other. */
  nudge: number;
  /** "14:05" UTC. */
  time: string;
}

export interface DialData {
  dots: DialDot[];
  /** "Last 24 hours", "Last 3 days" or "Last 7 days". */
  label: string;
  /** Angle of the edition time (the build), for the clock hand. */
  nowAngle: number;
  counts: Record<BrandId, number>;
}

const RING: Record<BrandId, number> = { nuvox_ai: 0, nuvox_space: 1, nuvox_world: 2 };
const WINDOWS: [number, string][] = [
  [24, 'Last 24 hours'],
  [72, 'Last 3 days'],
  [168, 'Last 7 days'],
];
/** Fewest stories a window needs before the dial stops widening it. */
export const MIN_DOTS = 6;

export function angleOf(date: Date): number {
  const minutes = date.getUTCHours() * 60 + date.getUTCMinutes();
  return (minutes / 1440) * 360;
}

export function dialData(stories: DialStory[], now: Date): DialData {
  const age = (s: DialStory) => (now.getTime() - Date.parse(s.publishedAt)) / 36e5;
  const dated = stories.filter((s) => !Number.isNaN(Date.parse(s.publishedAt)) && age(s) >= 0);
  let [hours, label] = WINDOWS[WINDOWS.length - 1];
  for (const [h, l] of WINDOWS) {
    if (dated.filter((s) => age(s) <= h).length >= MIN_DOTS) {
      [hours, label] = [h, l];
      break;
    }
  }
  const inWindow = dated.filter((s) => age(s) <= hours).slice(0, 60);
  const counts = { nuvox_ai: 0, nuvox_space: 0, nuvox_world: 0 } as Record<BrandId, number>;
  const taken = new Map<string, number>();
  const dots = inWindow.map((s) => {
    const d = new Date(s.publishedAt);
    const angle = angleOf(d);
    const ring = RING[s.brand];
    counts[s.brand] += 1;
    // Stories within ~15 minutes on the same orbit step outwards/inwards in turn.
    const key = `${ring}:${Math.round(angle / 3.75)}`;
    const n = taken.get(key) ?? 0;
    taken.set(key, n + 1);
    const nudge = n === 0 ? 0 : (n % 2 ? 1 : -1) * Math.ceil(n / 2) * 11;
    const time = `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`;
    return { ...s, angle, ring, nudge, time };
  });
  return { dots, label, nowAngle: angleOf(now), counts };
}
