/**
 * JSON-LD builders: the organisation is a NewsMediaOrganization with its policy links, the
 * editor is a Person credited on every article (never the author, which stays the
 * organisation because stories are AI-drafted), and story images lead with the title card.
 */
import { describe, expect, it, vi } from 'vitest';

vi.mock('server-only', () => ({}));

const seo = await import('@/lib/seo');
const { EDITOR } = await import('@/lib/editor');

describe('organisation', () => {
  const org = seo.organizationSchema() as unknown as Record<string, unknown>;

  it('is a NewsMediaOrganization with every policy page linked', () => {
    expect(org['@type']).toBe('NewsMediaOrganization');
    expect(org.foundingDate).toBe('2026-09-27');
    expect(org.ethicsPolicy).toBe('https://nuvoxsaga.com/standards');
    expect(org.correctionsPolicy).toBe('https://nuvoxsaga.com/corrections');
    expect(org.masthead).toBe('https://nuvoxsaga.com/about#masthead');
    expect(org.ownershipFundingInfo).toBe('https://nuvoxsaga.com/about#ownership');
    expect(org.actionableFeedbackPolicy).toBe('https://nuvoxsaga.com/contact');
    expect(org.founder).toMatchObject({ '@type': 'Person', name: EDITOR.name, url: `https://nuvoxsaga.com${EDITOR.path}` });
    expect(org.sameAs).toEqual(expect.arrayContaining(['https://x.com/NuvoxSaga', 'https://www.instagram.com/nuvoxsaga/']));
  });
});

describe('editor profile', () => {
  it('is a ProfilePage whose main entity is the editor, with the photo only when given', () => {
    const noPhoto = seo.editorProfileSchema({ description: 'bio' }) as { mainEntity: Record<string, unknown> };
    expect(noPhoto.mainEntity['@type']).toBe('Person');
    expect(noPhoto.mainEntity.jobTitle).toBe('Editor');
    expect(noPhoto.mainEntity.worksFor).toMatchObject({ '@type': 'NewsMediaOrganization', name: 'Nuvoxsaga' });
    expect(noPhoto.mainEntity.image).toBeUndefined();
    const photo = seo.editorProfileSchema({ description: 'bio', photoUrl: 'https://nuvoxsaga.com/images/editor/x.jpg' }) as {
      mainEntity: Record<string, unknown>;
    };
    expect(photo.mainEntity.image).toBe('https://nuvoxsaga.com/images/editor/x.jpg');
  });
});

describe('article', () => {
  const base = { brandId: 'nuvox_space' as const, slug: 'a-story', title: 'A <b>story</b>', tier: 'news' as const, format: 'brief' as const };

  it('keeps the organisation as author and adds the editor as a Person', () => {
    const a = seo.articleSchema(base) as unknown as Record<string, unknown>;
    expect(a['@type']).toBe('ReportageNewsArticle');
    expect(a.author).toMatchObject({ '@type': 'Organization', name: 'Nuvoxsaga' });
    expect(a.editor).toMatchObject({ '@type': 'Person', name: EDITOR.name, url: `https://nuvoxsaga.com${EDITOR.path}` });
  });

  it('lists the title card first and a story photo second', () => {
    expect((seo.articleSchema(base) as unknown as { image: string[] }).image).toEqual(['https://nuvoxsaga.com/og/nuvox_space/a-story.png']);
    const withPhoto = seo.articleSchema({ ...base, imageUrl: 'https://nuvoxsaga.com/media/space/a-story.webp' }) as unknown as { image: string[] };
    expect(withPhoto.image).toEqual(['https://nuvoxsaga.com/og/nuvox_space/a-story.png', 'https://nuvoxsaga.com/media/space/a-story.webp']);
  });

  it('never lets a title close the script element', () => {
    const a = seo.articleSchema({ ...base, title: 'x</script><script>alert(1)' }) as unknown as { headline: string };
    expect(a.headline).not.toContain('</script');
  });
});
