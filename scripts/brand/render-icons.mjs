#!/usr/bin/env node
/**
 * Renders the Nuvoxsaga mark ("N." : a bold Fraunces N and a green full stop, "a checked fact,
 * full stop") to every icon file the site ships. Run once after changing the mark:
 *
 *     node scripts/brand/render-icons.mjs && python scripts/brand/make-ico.py
 *
 * Uses the real Fraunces font (Google Fonts) in headless Chromium, and renders each size
 * separately so small icons stay crisp. Two optical cuts (DESIGN.md §4, "Mark"):
 *   display  opsz 144, weight 800: high-contrast, for 128 px and up
 *   small    opsz 9, weight 900, larger letter and dot: sturdy hairlines for 16-64 px
 * Outputs (committed): app/icon.png, app/apple-icon.png, public/logos/nuvoxsaga.png,
 * scripts/brand/out/mark-{16,32,48}.png (packed into app/favicon.ico by make-ico.py).
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { chromium } from '@playwright/test';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', '..');
const FONT = 'https://fonts.googleapis.com/css2?family=Fraunces:opsz,wght@9..144,400..900&display=block';
const INK = '#15161a';
const PAPER = '#f2f2f0';
const CHECK = '#3fb27f'; // the "checked" green (reports/Nuvoxsaga trust and fact checker.md)

const CUTS = {
  display: { opsz: 144, wght: 800, fs: 0.74, dx: -0.06, dy: 0.035, dot: 0.135, dotR: 0.12, dotB: 0.215 },
  small: { opsz: 9, wght: 900, fs: 0.82, dx: -0.07, dy: 0.04, dot: 0.19, dotR: 0.06, dotB: 0.19 },
};

function html(size, cut, { rounded }) {
  const c = CUTS[cut];
  return `<!doctype html><html><head><link rel="stylesheet" href="${FONT}"><style>
    html,body{margin:0;background:transparent}
    .tile{width:${size}px;height:${size}px;border-radius:${rounded ? size * 0.225 : 0}px;position:relative;overflow:hidden;
          background:${INK};display:flex;align-items:center;justify-content:center}
    .n{font-family:Fraunces,serif;font-weight:${c.wght};font-variation-settings:'opsz' ${c.opsz};color:${PAPER};
       font-size:${size * c.fs}px;line-height:1;transform:translate(${size * c.dx}px,${size * c.dy}px)}
    .dot{position:absolute;width:${size * c.dot}px;height:${size * c.dot}px;border-radius:50%;background:${CHECK};
         right:${size * c.dotR}px;bottom:${size * c.dotB}px}
  </style></head><body><div class="tile"><span class="n">N</span><span class="dot"></span></div></body></html>`;
}

const jobs = [
  // Modern browsers' tab icon and Android: rounded tile on transparent.
  { file: 'app/icon.png', size: 512, cut: 'display', rounded: true },
  // iOS draws its own rounded corners and needs an opaque square.
  { file: 'app/apple-icon.png', size: 180, cut: 'display', rounded: false },
  // Organization logo for search engines (lib/seo.ts ORG_LOGO): opaque square.
  { file: 'public/logos/nuvoxsaga.png', size: 512, cut: 'display', rounded: false },
  // favicon.ico layers (make-ico.py), rounded on transparent like the tab icon.
  ...[16, 32, 48].map((s) => ({ file: `scripts/brand/out/mark-${s}.png`, size: s, cut: 'small', rounded: true })),
];

const browser = await chromium.launch();
for (const j of jobs) {
  const page = await browser.newPage({ viewport: { width: j.size, height: j.size }, deviceScaleFactor: 1 });
  await page.setContent(html(j.size, j.cut, { rounded: j.rounded }), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  const ok = await page.evaluate(() => document.fonts.check("800 40px Fraunces"));
  if (!ok) throw new Error('Fraunces did not load; refusing to render a fallback font');
  const out = path.join(ROOT, j.file);
  fs.mkdirSync(path.dirname(out), { recursive: true });
  await page.locator('.tile').screenshot({ path: out, omitBackground: j.rounded });
  await page.close();
  console.log(`${j.file} (${j.size}px, ${j.cut} cut)`);
}
await browser.close();
