#!/usr/bin/env node
/**
 * Tell IndexNow search engines (Bing, and through it Edge, DuckDuckGo and Yahoo; also Yandex,
 * Seznam, Naver) which pages are new or changed. Run after a deploy:
 *
 *     node scripts/indexnow.mjs            # submit URLs new or changed since the last run
 *     node scripts/indexnow.mjs --all      # submit every URL in the sitemap
 *     node scripts/indexnow.mjs --dry-run  # print what would be sent
 *
 * The key file public/<key>.txt is deployed with the site; IndexNow fetches it to confirm the
 * submission comes from the site owner. The key is public by design, not a secret.
 * Sent URLs and their lastmod are remembered in .indexnow-sent.json (gitignored), so each
 * deploy submits only what changed. Never fails a deploy: errors are printed, exit code 0.
 */
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const SITE = process.env.NEXT_PUBLIC_SITE_URL || 'https://nuvoxsaga.com';
const STATE = path.join(ROOT, '.indexnow-sent.json');
const args = new Set(process.argv.slice(2));
const keyFile = fs.readdirSync(path.join(ROOT, 'public')).find((f) => /^[0-9a-f]{32}\.txt$/.test(f));

async function sitemapEntries() {
  const res = await fetch(`${SITE}/sitemap.xml`, { headers: { 'user-agent': 'nuvoxsaga-indexnow/1.0' } });
  if (!res.ok) throw new Error(`sitemap HTTP ${res.status}`);
  const xml = await res.text();
  return [...xml.matchAll(/<url>([\s\S]*?)<\/url>/g)]
    .map((m) => ({
      loc: (m[1].match(/<loc>([^<]+)<\/loc>/) || [])[1],
      lastmod: (m[1].match(/<lastmod>([^<]+)<\/lastmod>/) || [])[1] || '',
    }))
    .filter((e) => e.loc && sameOrigin(e.loc));
}

/** Only our own pages: an exact origin match, so "https://nuvoxsaga.com.example" is refused. */
function sameOrigin(url) {
  try {
    return new URL(url).origin === new URL(SITE).origin;
  } catch {
    return false;
  }
}

async function main() {
  if (!keyFile) return console.log('indexnow: no key file in public/, nothing sent');
  const key = keyFile.replace('.txt', '');
  const keyLive = await fetch(`${SITE}/${keyFile}`).then((r) => (r.ok ? r.text() : ''));
  if (keyLive.trim() !== key) {
    return console.log(`indexnow: ${SITE}/${keyFile} is not live yet (deploy first); nothing sent`);
  }
  const entries = await sitemapEntries();
  const sent = fs.existsSync(STATE) ? JSON.parse(fs.readFileSync(STATE, 'utf8')) : {};
  const todo = entries.filter((e) => args.has('--all') || sent[e.loc] !== e.lastmod);
  if (todo.length === 0) return console.log('indexnow: nothing new or changed');
  if (args.has('--dry-run')) {
    return console.log(`indexnow: would submit ${todo.length} URL(s):\n` + todo.map((e) => `  ${e.loc}`).join('\n'));
  }
  const res = await fetch('https://api.indexnow.org/indexnow', {
    method: 'POST',
    headers: { 'content-type': 'application/json; charset=utf-8' },
    body: JSON.stringify({
      host: new URL(SITE).host,
      key,
      keyLocation: `${SITE}/${keyFile}`,
      urlList: todo.map((e) => e.loc).slice(0, 10000),
    }),
  });
  // 200 OK and 202 Accepted both mean the submission was received.
  if (res.status === 200 || res.status === 202) {
    for (const e of todo) sent[e.loc] = e.lastmod;
    fs.writeFileSync(STATE, JSON.stringify(sent, null, 1));
    console.log(`indexnow: submitted ${todo.length} URL(s), HTTP ${res.status}`);
  } else {
    console.log(`indexnow: HTTP ${res.status} ${(await res.text()).slice(0, 200)}`);
  }
}

// Never fails a deploy: any error is printed and the exit code stays 0.
await main().catch((e) => console.log(`indexnow: failed, nothing recorded: ${String(e).slice(0, 200)}`));
