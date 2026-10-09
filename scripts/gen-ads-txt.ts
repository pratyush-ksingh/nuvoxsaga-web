/**
 * /ads.txt for AdSense, written into the export after `next build`:
 *
 *     tsx scripts/gen-ads-txt.ts out
 *
 * Reads NEXT_PUBLIC_ADSENSE_CLIENT through @next/env, the same files and precedence
 * next build uses (.env.local over .env.production, a real env var over both), so the
 * file always agrees with the pages. With the id empty, any ads.txt left in the output
 * directory is removed: a stale file must never ship. With NEXT_PUBLIC_ADS=1 and no
 * valid id the build fails loudly rather than shipping pages that silently carry no ads.
 */
import fs from 'node:fs';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { loadEnvConfig } from '@next/env';

export type AdsTxtResult = 'written' | 'removed' | 'absent';

export function syncAdsTxt(outDir: string, client: string, adsFlag: string, line: (client: string) => string | null): AdsTxtResult {
  const file = path.join(outDir, 'ads.txt');
  const content = line(client);
  if (adsFlag === '1' && !content) {
    throw new Error(`NEXT_PUBLIC_ADS=1 but NEXT_PUBLIC_ADSENSE_CLIENT is not a ca-pub- id (got "${client}")`);
  }
  if (!content) {
    if (!fs.existsSync(file)) return 'absent';
    fs.unlinkSync(file);
    return 'removed';
  }
  fs.mkdirSync(outDir, { recursive: true });
  fs.writeFileSync(file, `${content}\n`);
  return 'written';
}

async function main() {
  const outDir = path.resolve(process.argv[2] ?? 'out');
  loadEnvConfig(process.cwd(), false);
  // Imported after the env is loaded: lib/ads reads the variables at import time.
  const { ADSENSE_CLIENT, adsTxtLine } = await import('../lib/ads');
  const result = syncAdsTxt(outDir, ADSENSE_CLIENT, process.env.NEXT_PUBLIC_ADS ?? '', adsTxtLine);
  console.log(`ads.txt: ${result}${result === 'written' ? ` (${adsTxtLine(ADSENSE_CLIENT)})` : ''}`);
}

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  main().catch((err) => {
    console.error(err instanceof Error ? err.message : err);
    process.exit(1);
  });
}
