import { CareerRepository, db, SkillRepository, sql } from '@hominem/db';
import { data } from 'react-router';
import type { LoaderFunctionArgs } from 'react-router';

import { COMMON_SKILLS } from '~/lib/career/common-skills';
import { userContext } from '~/lib/middleware';

export async function loader({ request, context }: LoaderFunctionArgs) {
  const user = context.get(userContext);
  if (!user) {
    return data({ suggestions: [] }, { status: 401 });
  }

  const url = new URL(request.url);
  const raw = url.searchParams.get('q') ?? '';
  const query = raw.trim().toLowerCase();
  if (!query || query.length < 1) {
    return data({ suggestions: [] });
  }

  const profile = await CareerRepository.getProfile(db, user.id);

  let dbSkills: string[] = [];

  const allSkills = profile ? await SkillRepository.list(db, user.id) : [];
  dbSkills = allSkills.filter((s) => s.name.toLowerCase().includes(query)).map((s) => s.name);

  const curated = COMMON_SKILLS.filter(
    (s) => s.toLowerCase().includes(query) && !dbSkills.includes(s),
  ).slice(0, 10);

  const seen = new Set<string>();
  const suggestions = [...dbSkills.slice(0, 10), ...curated].filter((s) => {
    if (seen.has(s.toLowerCase())) return false;
    seen.add(s.toLowerCase());
    return true;
  });

  return data({ suggestions: suggestions.slice(0, 10) });
}
