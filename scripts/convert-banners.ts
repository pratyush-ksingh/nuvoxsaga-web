/**
 * Convert brand banners (3 brands × 3 PNGs = 9 source files, 2560×1440 each)
 * into responsive AVIF sizes 1920/1280/768/384 width.
 *
 * Output: public/banners/{brand}_{n}.{width}.avif
 *
 * Run: npm run convert-banners
 *
 * Skips nuvox_sports (dropped per v7 plan).
 */
import sharp from 'sharp';
import { existsSync, mkdirSync, readdirSync, statSync, copyFileSync, writeFileSync } from 'node:fs';
import path from 'node:path';

const SRC_BANNERS = path.resolve('../youtube-ai-system/production/brand_banners');
const SRC_LOGOS = path.resolve('../youtube-ai-system/production/brand_logos');
const SRC_FACES = path.resolve('../youtube-ai-system/production/face_refs');

const DST_BANNERS = path.resolve('public/banners');
const DST_LOGOS = path.resolve('public/logos');
const DST_FACES = path.resolve('public/faces');

const ALLOWED_BRAND_PREFIX = ['nuvox_ai', 'nuvox_space', 'nuvox_world'];
const WIDTHS = [1920, 1280, 768, 384];

function ensure(dir: string) {
  if (!existsSync(dir)) mkdirSync(dir, { recursive: true });
}

async function convertBanners() {
  ensure(DST_BANNERS);
  if (!existsSync(SRC_BANNERS)) {
    console.warn(`[skip] ${SRC_BANNERS} not found`);
    return;
  }
  const files = readdirSync(SRC_BANNERS)
    .filter((f) => f.endsWith('.png'))
    .filter((f) => ALLOWED_BRAND_PREFIX.some((p) => f.startsWith(p)));
  console.log(`Banners: ${files.length} source PNGs (nuvox_sports excluded)`);
  let written = 0;
  for (const f of files) {
    const base = f.replace(/\.png$/i, '');
    const src = path.join(SRC_BANNERS, f);
    for (const w of WIDTHS) {
      const dst = path.join(DST_BANNERS, `${base}.${w}.avif`);
      if (existsSync(dst)) continue;
      await sharp(src).resize({ width: w }).avif({ quality: 60, effort: 4 }).toFile(dst);
      written++;
    }
    console.log(`  ✓ ${base} → ${WIDTHS.length} sizes`);
  }
  console.log(`Banners: wrote ${written} AVIF files`);
}

function copyLogos() {
  ensure(DST_LOGOS);
  if (!existsSync(SRC_LOGOS)) {
    console.warn(`[skip] ${SRC_LOGOS} not found`);
    return;
  }
  const files = readdirSync(SRC_LOGOS)
    .filter((f) => ALLOWED_BRAND_PREFIX.some((p) => f.startsWith(p)));
  for (const f of files) {
    const dst = path.join(DST_LOGOS, f);
    if (!existsSync(dst)) copyFileSync(path.join(SRC_LOGOS, f), dst);
  }
  console.log(`Logos: copied ${files.length} files`);
}

async function convertFaces() {
  ensure(DST_FACES);
  if (!existsSync(SRC_FACES)) {
    console.warn(`[skip] ${SRC_FACES} not found`);
    return;
  }
  const files = readdirSync(SRC_FACES).filter((f) => f.endsWith('.png'));
  let written = 0;
  for (const f of files) {
    const base = f.replace(/\.png$/i, '');
    const dstWebp = path.join(DST_FACES, `${base}.webp`);
    if (!existsSync(dstWebp)) {
      await sharp(path.join(SRC_FACES, f)).webp({ quality: 85 }).toFile(dstWebp);
      written++;
    }
  }
  console.log(`Faces: ${files.length} source PNGs, wrote ${written} WebP`);
}

/**
 * Phase 11 review #2: emit a manifest of which banners exist per brand so
 * a missing banner fails LOUD at build/import time instead of becoming a
 * silent 404 in production. Components import from @/public/banners/manifest.json.
 */
function writeManifest() {
  ensure(DST_BANNERS);
  const manifest: Record<string, { sizes: number[]; files: string[] }> = {};
  if (!existsSync(DST_BANNERS)) return;
  const all = readdirSync(DST_BANNERS).filter((f) => f.endsWith('.avif'));
  for (const f of all) {
    // Filename: nuvox_ai_1.1920.avif → brand=nuvox_ai, n=1, width=1920
    const m = /^(nuvox_[a-z0-9_]+)_(\d+)\.(\d+)\.avif$/.exec(f);
    if (!m) continue;
    const [, brand, , widthStr] = m;
    const width = parseInt(widthStr, 10);
    const entry = manifest[brand] ?? { sizes: [], files: [] };
    if (!entry.sizes.includes(width)) entry.sizes.push(width);
    entry.files.push(f);
    manifest[brand] = entry;
  }
  for (const b of Object.values(manifest)) b.sizes.sort((a, c) => a - c);
  const manifestPath = path.join(DST_BANNERS, 'manifest.json');
  writeFileSync(manifestPath, JSON.stringify(manifest, null, 2));
  console.log(`Manifest: ${Object.keys(manifest).length} brands → ${manifestPath}`);
}

async function main() {
  console.log('=== Asset migration ===\n');
  await convertBanners();
  console.log('');
  copyLogos();
  console.log('');
  await convertFaces();
  console.log('');
  writeManifest();
  console.log('\n✓ Done');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
