/**
 * Responsive <img> for the pre-encoded WebP sets in public/images/<name>-<width>.webp.
 * Static export has no image-optimisation server, so sizes are generated at design
 * time (design/gen_image.py + sharp) and listed here.
 */
const SETS = {
  'home-orbit': { widths: [480, 768, 1024], ratio: [4, 5] },
  'brand-ai': { widths: [640, 1280, 1792], ratio: [7, 4] },
  'brand-space': { widths: [640, 1280, 1792], ratio: [7, 4] },
  'brand-world': { widths: [640, 1280, 1792], ratio: [7, 4] },
  newsroom: { widths: [640, 1280], ratio: [10, 7] },
} satisfies Record<string, { widths: number[]; ratio: [number, number] }>;

export type PictureName = keyof typeof SETS;

interface Props {
  name: PictureName;
  alt: string;
  sizes: string;
  className?: string;
  priority?: boolean;
}

export function Picture({ name, alt, sizes, className, priority = false }: Props) {
  const set = SETS[name];
  const largest = set.widths[set.widths.length - 1];
  return (
    // eslint-disable-next-line @next/next/no-img-element -- static export: pre-encoded srcset
    <img
      src={`/images/${name}-${largest}.webp`}
      srcSet={set.widths.map((w) => `/images/${name}-${w}.webp ${w}w`).join(', ')}
      sizes={sizes}
      alt={alt}
      width={largest}
      height={Math.round((largest * set.ratio[1]) / set.ratio[0])}
      loading={priority ? 'eager' : 'lazy'}
      fetchPriority={priority ? 'high' : 'auto'}
      decoding="async"
      className={className}
    />
  );
}
