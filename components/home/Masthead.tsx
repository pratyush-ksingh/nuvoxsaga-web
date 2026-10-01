/**
 * Home masthead: a newspaper nameplate for a site with no paper (DESIGN.md §6).
 *
 *   edition line   weekday and date, edition time in UTC, stories checked this week
 *   nameplate      "Nuvox" roman + "saga" italic in the display serif
 *   brand line     "News you can check." (DESIGN.md §4: a promise readers can test, never "100%")
 *   standfirst     what is checked, and when
 *
 * The page is static and rebuilt on every publish, so "edition" is the build time: it is
 * true for as long as the page is.
 */
const dateFmt = new Intl.DateTimeFormat('en-GB', {
  weekday: 'long',
  day: 'numeric',
  month: 'long',
  year: 'numeric',
  timeZone: 'UTC',
});
const timeFmt = new Intl.DateTimeFormat('en-GB', { hour: '2-digit', minute: '2-digit', hour12: false, timeZone: 'UTC' });

export function Masthead({ edition, weekCount }: { edition: Date; weekCount: number }) {
  return (
    <section aria-label="Nuvoxsaga" className="overflow-hidden">
      <div className="container-page pt-7 md:pt-9">
        <div className="data flex flex-wrap items-center justify-between gap-x-6 gap-y-1 text-[0.8rem] text-ink-3">
          <p>
            <time dateTime={edition.toISOString()}>{dateFmt.format(edition)}</time>
          </p>
          <p className="hidden sm:block">Edition {timeFmt.format(edition)} UTC</p>
          <p>{weekCount} stories checked this week</p>
        </div>
        <div aria-hidden="true" className="rule-dot mt-4" />
        <p className="masthead-name select-none py-3 text-center md:py-5" translate="no">
          Nuvox<em>saga</em>
        </p>
        <div aria-hidden="true" className="rule-dot" />
        <p className="deck mx-auto mt-5 text-center text-[clamp(1.5rem,2.6vw,2.1rem)] leading-tight text-ink">
          News you can check.
        </p>
        <p className="mx-auto mt-2 max-w-[52ch] text-center text-ink-2 md:text-lg">
          Every factual claim checked against its source, before it is published.
        </p>
      </div>
    </section>
  );
}
