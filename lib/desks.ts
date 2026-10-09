/**
 * The three news desks and their sections. Brand ids, slugs and palettes come from the
 * generated lib/brands.ts; this file holds the editorial structure of the media house.
 *
 * A section slug is a URL segment under its desk (/space/launch), so it must never be
 * one of the desk's static route names (news, page, feed.xml).
 */
import type { BrandId } from './brands';

export interface Section {
  slug: string;
  name: string;
  /** 40-80 words shown under the section's title: what the section covers and from where. */
  blurb: string;
}

/**
 * A section page is indexable (and in the sitemap) from this many stories. Below it the
 * page is a title and a couple of cards: readers can still use it, search engines are
 * asked not to index it (noindex,follow).
 */
export const SECTION_INDEX_MIN = 5;

export interface Desk {
  /** Short desk name used in the masthead and labels ("Space"). */
  name: string;
  /** CSS custom property holding the desk accent. */
  accent: string;
  sections: readonly Section[];
}

export const DESKS: Record<BrandId, Desk> = {
  nuvox_ai: {
    name: 'AI',
    accent: 'var(--ai)',
    sections: [
      {
        slug: 'models',
        name: 'Models',
        blurb:
          'New and updated AI models as their makers announce them: what a model is for, what it is claimed to do, how it is offered and at what price. Each brief is written from the lab’s or company’s own release and checked against it, so a benchmark number here is the one the maker published, attributed to them, not a figure we measured ourselves.',
      },
      {
        slug: 'research',
        name: 'Research',
        blurb:
          'Papers, results and methods from university labs and company research teams, reported from the institution’s own announcement or the paper itself. We say what was tested, on what, and what the authors claim it shows. Where a result is preliminary or not yet peer-reviewed, the brief says so, because that is what the source says.',
      },
      {
        slug: 'business',
        name: 'Business',
        blurb:
          'Deals, funding, pricing, partnerships and company results in the AI industry, taken from the companies’ own statements and filings. Figures are attributed to the company that reported them. We do not report rumours or unnamed-source stories; if a number does not appear in a primary source, it does not appear here.',
      },
      {
        slug: 'policy',
        name: 'Policy',
        blurb:
          'Laws, regulations, standards and government decisions about AI, from the EU, the United States, India, the United Kingdom and international bodies. Briefs are written from the regulator’s or legislature’s own text and link to it, so you can read the rule itself, not only our summary of it.',
      },
      {
        slug: 'tools',
        name: 'Tools',
        blurb:
          'Products and features built on AI, from coding assistants to consumer apps, as their makers release them: what shipped, who can use it, what it costs. Written from the release notes or launch post and checked against them. We report what the maker says the tool does; we do not review or rank tools.',
      },
    ],
  },
  nuvox_space: {
    name: 'Space',
    accent: 'var(--space)',
    sections: [
      {
        slug: 'launch',
        name: 'Launch',
        blurb:
          'Launch schedules, liftoffs, landings and launch-vehicle news from NASA, ESA, ISRO, JAXA and the launch companies. Each brief is written from the agency’s or operator’s own announcement and links to it, so dates, payloads and outcomes are the ones the source stated. A slip or a scrub is reported when the source reports it.',
      },
      {
        slug: 'missions',
        name: 'Missions',
        blurb:
          'Spacecraft on their way and at their targets: flybys, orbit insertions, landings, instrument milestones and crew operations on the International Space Station, reported from the mission team’s own updates. We say where a spacecraft is and what it has done, attributed to the agency that flies it.',
      },
      {
        slug: 'science',
        name: 'Science',
        blurb:
          'Discoveries and results from telescopes, probes and planetary science, from the first images of a new observatory to a paper on an exoplanet’s atmosphere. Briefs are written from the research institution’s or agency’s own release, and a claim is reported as the scientists stated it, with its caveats.',
      },
      {
        slug: 'industry',
        name: 'Industry',
        blurb:
          'The space economy: contracts, satellite constellations, launch providers, suppliers and the companies building for orbit, reported from their own announcements and from agency procurement notices. Figures and contract values are the ones the source published, attributed to it.',
      },
      {
        slug: 'policy',
        name: 'Policy',
        blurb:
          'Space law, agency budgets, international agreements, licensing and regulation, from NASA and ESA to national space agencies and the UN. Written from the agency’s, government’s or body’s own text, with a link to the document, so the decision can be read in full.',
      },
    ],
  },
  nuvox_world: {
    name: 'World',
    accent: 'var(--world)',
    sections: [
      {
        slug: 'asia',
        name: 'Asia',
        blurb:
          'News from across Asia, with a close eye on India, reported from governments, central banks, courts and international bodies rather than from other outlets. Each brief links to the official statement it was written from. We report what was announced and who announced it; opinion and anonymous sourcing stay out.',
      },
      {
        slug: 'americas',
        name: 'Americas',
        blurb:
          'The United States, Canada and Latin America: government decisions, official statistics, court rulings and public-health notices, written from the issuing body’s own release. A figure in a brief is the figure the source published, attributed to it. We do not publish election results or casualty counts unless an official source states them.',
      },
      {
        slug: 'europe',
        name: 'Europe',
        blurb:
          'The European Union, the United Kingdom and the wider continent: legislation, regulation, sanctions, court decisions and official statistics, reported from the institution’s own text. Briefs link to the regulation or statement itself so the decision can be checked in the original.',
      },
      {
        slug: 'middle-east-africa',
        name: 'Middle East & Africa',
        blurb:
          'Developments across the Middle East and Africa as stated by governments, the UN and its agencies, the African Union and other official bodies. We report official announcements and figures with their attribution. Casualty figures and allegations appear only when an official source states them, and never from anonymous sources.',
      },
      {
        slug: 'health-climate',
        name: 'Health & climate',
        blurb:
          'Public health and climate news from the WHO, national health agencies, meteorological services and UN climate bodies: guidelines, outbreak notices, climate data and policy decisions. Written from the agency’s own release and checked against it, so a statistic here is the agency’s statistic, attributed to it.',
      },
    ],
  },
};

const RESERVED = new Set(['news', 'page', 'feed.xml']);
for (const desk of Object.values(DESKS)) {
  for (const s of desk.sections) {
    if (RESERVED.has(s.slug)) throw new Error(`desk section "${s.slug}" collides with a route name`);
  }
}

export function findSection(brand: BrandId, slug: string | undefined): Section | undefined {
  return slug ? DESKS[brand].sections.find((s) => s.slug === slug) : undefined;
}

/** Number of stories per river page (desk fronts and their /page/N archives). */
export const PAGE_SIZE = 24;
