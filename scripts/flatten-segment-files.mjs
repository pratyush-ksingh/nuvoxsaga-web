/**
 * Post-build fix for Next.js 16 static export + client segment prefetch.
 *
 * `next build` writes route-segment prefetch payloads as nested folders:
 *     out/ai/__next.!KGZyb250ZW5kKQ/$d$brand/__PAGE__.txt
 * but the router requests them as one dot-joined file name:
 *     /ai/__next.!KGZyb250ZW5kKQ.$d$brand.__PAGE__.txt
 * A static host has no rewrite for that, so every prefetch 404s and link clicks fall
 * back to slower navigations. This writes a flat copy next to each nested file.
 * It also removes the empty-content placeholder page (see blog/[slug]/page.tsx).
 */
import fs from 'node:fs';
import path from 'node:path';

const OUT = path.resolve(process.argv[2] ?? 'out');
let written = 0;

function filesUnder(dir) {
  return fs.readdirSync(dir, { withFileTypes: true }).flatMap((e) => {
    const p = path.join(dir, e.name);
    return e.isDirectory() ? filesUnder(p) : [p];
  });
}

function walk(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    const full = path.join(dir, entry.name);
    if (entry.name.startsWith('__next.')) {
      for (const file of filesUnder(full)) {
        const rel = path.relative(full, file).split(path.sep).join('.');
        const flat = path.join(dir, `${entry.name}.${rel}`);
        if (!fs.existsSync(flat)) {
          fs.copyFileSync(file, flat);
          written++;
        }
      }
    } else {
      walk(full);
    }
  }
}

if (!fs.existsSync(OUT)) {
  console.error(`flatten-segment-files: ${OUT} does not exist (run next build first)`);
  process.exit(1);
}
// Before the first story exists, dynamic routes emit a notFound placeholder only
// because static export refuses an empty generateStaticParams. Never ship one.
let removed = 0;
function dropPlaceholders(dir) {
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name);
    if (entry.name === '_placeholder' || entry.name.startsWith('_placeholder.')) {
      fs.rmSync(full, { recursive: true, force: true });
      removed++;
    } else if (entry.isDirectory()) {
      dropPlaceholders(full);
    }
  }
}
dropPlaceholders(OUT);
if (removed) console.log(`flatten-segment-files: removed ${removed} placeholder file(s)`);

walk(OUT);
console.log(`flatten-segment-files: wrote ${written} flat prefetch file(s)`);
