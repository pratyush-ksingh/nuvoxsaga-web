/**
 * /about/<editor>: the editor's page. The one accountable human behind AI-drafted stories,
 * linked from every byline ("Edited by …"). Facts come from lib/editor.ts, which draws only
 * on what /contact and /privacy already state. The portrait is optional and renders only
 * when the file exists; nothing placeholder-looking is shown without it.
 */
import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { EDITOR, editorPhoto } from '@/lib/editor';
import { editorProfileSchema } from '@/lib/seo';
import { JsonLd } from '@/components/JsonLd';
import { PlainEmail } from '@/components/PlainEmail';
import { og } from '@/lib/og';

const SITE_URL = process.env.NEXT_PUBLIC_SITE_URL ?? 'https://nuvoxsaga.com';

export const metadata: Metadata = {
  title: `${EDITOR.name}, editor`,
  description: `${EDITOR.name} edits and publishes Nuvoxsaga: he sets the sources and the checking rules, and owns the corrections.`,
  alternates: { canonical: EDITOR.path },
  openGraph: og({ url: EDITOR.path, type: 'profile' }),
};

const DUTIES = [
  { title: 'Sets the sources', body: 'Decides which primary sources each desk draws on: space agencies, research labs, companies, governments and international bodies.' },
  { title: 'Sets the rules', body: 'Stories are drafted with AI and checked claim by claim against their sources by an automated process. The editor sets its rules and reads its daily reports; what fails stays unpublished.' },
  { title: 'Owns the corrections', body: 'Every reported error is read by the editor. Corrections are made on the story and listed in public on the corrections page.' },
];

export default function EditorPage() {
  const photo = editorPhoto();
  return (
    <>
      <JsonLd schemas={[editorProfileSchema({ description: EDITOR.bio.join(' '), photoUrl: photo ? `${SITE_URL}${photo}` : undefined })]} />
      <article data-pagefind-body className="container-page pb-24 pt-10 md:pt-14">
        <div className="mx-auto max-w-[46rem]">
          <nav aria-label="Breadcrumb" className="text-sm font-medium">
            <Link href="/about" className="text-ink-2 hover:text-ink hover:underline hover:underline-offset-4">
              About
            </Link>
          </nav>
          <header className={photo ? 'mt-5 grid gap-8 sm:grid-cols-[10rem_1fr] sm:items-end' : 'mt-5'}>
            {photo && (
              // eslint-disable-next-line @next/next/no-img-element -- static export: pre-encoded file
              <img
                src={photo}
                alt={`${EDITOR.name}, editor of Nuvoxsaga`}
                width={640}
                height={640}
                loading="eager"
                fetchPriority="high"
                decoding="async"
                className="aspect-square w-40 rounded-2xl object-cover"
              />
            )}
            <div>
              <p className="text-sm font-medium text-ink-3">{EDITOR.jobTitle} and publisher</p>
              <h1 className="display mt-2 text-[clamp(2.25rem,5vw,3.75rem)]">{EDITOR.name}</h1>
              <p className="mt-3 text-ink-2">Nuvoxsaga, {EDITOR.location}</p>
            </div>
          </header>

          <section aria-label="Biography" className="mt-10 grid gap-5 text-lg leading-relaxed text-ink-2">
            {EDITOR.bio.map((p, i) => (
              <p key={i}>{p}</p>
            ))}
          </section>

          <section aria-labelledby="duties-title" className="mt-14">
            <h2 id="duties-title" className="text-2xl font-bold tracking-[-0.02em]">
              What the editor does
            </h2>
            <dl className="mt-6 grid gap-6 sm:grid-cols-3">
              {DUTIES.map((d) => (
                <div key={d.title}>
                  <dt className="font-semibold">{d.title}</dt>
                  <dd className="mt-2 text-sm text-ink-2">{d.body}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section aria-labelledby="reach-title" className="mt-14 rounded-2xl border border-hairline bg-surface p-6 md:p-8">
            <h2 id="reach-title" className="text-xl font-bold">
              Reach the editor
            </h2>
            <p className="mt-3 text-ink-2">
              Email <PlainEmail address={EDITOR.email} /> about a story, a mistake or your data. Every message is read.
            </p>
            <p className="mt-4 flex flex-wrap gap-x-6 gap-y-2 text-sm">
              <Link href="/standards" className="link-arrow text-ink-2">
                Editorial standards <ArrowRight aria-hidden="true" size={14} />
              </Link>
              <Link href="/corrections" className="link-arrow text-ink-2">
                Corrections <ArrowRight aria-hidden="true" size={14} />
              </Link>
              <Link href="/about#ownership" className="link-arrow text-ink-2">
                Ownership and funding <ArrowRight aria-hidden="true" size={14} />
              </Link>
            </p>
          </section>
        </div>
      </article>
    </>
  );
}
