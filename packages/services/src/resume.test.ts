import { describe, expect, it } from 'vitest';

import { buildResumeImportDiff, type ConvertedResumeData } from './resume';

function makeParsed(overrides: Partial<ConvertedResumeData> = {}): ConvertedResumeData {
  return {
    portfolio: {
      slug: 'jane-doe',
      title: 'Portfolio',
      name: 'Jane Doe',
      initials: 'JD',
      job_title: 'Staff Engineer',
      bio: 'Builds things.',
      tagline: 'Ship it',
      current_location: 'Remote',
      email: 'jane@example.com',
      phone: null,
      availability_status: true,
      open_to_remote: true,
      is_public: true,
      is_active: true,
    },
    social_links: { github: 'janedoe', linkedin: null, twitter: null, website: null },
    workExperience: [],
    skills: [],
    projects: [],
    stats: [],
    ...overrides,
  };
}

describe('buildResumeImportDiff', () => {
  it('emits a scalar change only for fields that actually differ', () => {
    const parsed = makeParsed();
    const currentProfile = {
      headline: 'Staff Engineer', // unchanged
      summary: 'Old bio.', // changed
      tagline: 'Ship it', // unchanged
      location: 'Remote',
      email: 'jane@example.com',
      phone: null,
      initials: 'JD',
      availabilityStatus: true,
      openToRemote: true,
      // biome-ignore lint: minimal fixture
    } as any;

    const diff = buildResumeImportDiff(parsed, currentProfile, null);

    expect(diff.scalarChanges).toHaveLength(1);
    expect(diff.scalarChanges[0]).toMatchObject({
      field: 'summary',
      group: 'basics',
      current: 'Old bio.',
      proposed: 'Builds things.',
    });
  });

  it('treats a null current profile as every field having changed', () => {
    const diff = buildResumeImportDiff(makeParsed(), null, null);
    expect(diff.scalarChanges.length).toBeGreaterThan(0);
    expect(diff.scalarChanges.every((change) => change.current === null)).toBe(true);
  });

  it('emits every parsed list item unconditionally, keyed by group and index', () => {
    const parsed = makeParsed({
      workExperience: [
        {
          company: 'Acme',
          description: 'Built stuff',
          role: 'Engineer',
          start_date: '2020-01-01',
          end_date: null,
        },
      ],
      skills: [
        {
          name: 'TypeScript',
          level: 90,
          category: null,
          description: null,
          years_of_experience: 5,
          certifications: [],
        },
      ],
    });

    const diff = buildResumeImportDiff(parsed, null, null);

    expect(diff.listChanges.map((c) => c.key)).toEqual(['work:0', 'skill:0']);
    expect(diff.listChanges[0].summary).toContain('Engineer at Acme');
    expect(diff.listChanges[1].summary).toBe('TypeScript — level 90');
  });

  it('diffs social links against the current record', () => {
    const parsed = makeParsed({
      social_links: { github: 'janedoe', linkedin: 'jane-doe', twitter: null, website: null },
    });
    const currentSocial = {
      github: 'janedoe', // unchanged
      linkedin: null, // changed
      twitter: null,
      website: null,
      // biome-ignore lint: minimal fixture
    } as any;

    const diff = buildResumeImportDiff(parsed, null, currentSocial);
    const socialChanges = diff.scalarChanges.filter((c) => c.group === 'social');

    expect(socialChanges).toHaveLength(1);
    expect(socialChanges[0]).toMatchObject({
      field: 'linkedin',
      current: null,
      proposed: 'jane-doe',
    });
  });
});
