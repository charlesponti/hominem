import { randomUUID } from 'node:crypto';

import { createChatCompletion, getChatCompletionText, getChatCompletionUsage } from '@hominem/ai';
import { CareerRepository, db, ProjectRepository } from '@hominem/db';
import { recordAIUsageEvent, startAIUsageTimer } from '@hominem/services';
import { z } from 'zod';

const derivedSkillSchema = z.object({
  name: z.string(),
  level: z.number().min(1).max(100),
  category: z.enum(['technical', 'leadership', 'product', 'design', 'data', 'other']),
  proof: z.string(),
});

const derivedSkillsSchema = z.array(derivedSkillSchema);

type DerivedSkill = z.infer<typeof derivedSkillSchema>;

const SYSTEM_PROMPT = `You are a career analyst. Given a person's work history and projects, extract a list of concrete, demonstrable skills.

For each skill return:
- name: the skill name (e.g. "TypeScript", "System Design", "Team Leadership")
- level: 1–100 proficiency estimate based on depth and duration of evidence (80+ = expert, 60–79 = proficient, 40–59 = competent, below 40 = familiar)
- category: one of "technical", "leadership", "product", "design", "data", "other"
- proof: one sentence citing the specific role or project that demonstrates this skill (e.g. "Used for 3 years at Kensho building distributed data ingestion pipelines as Staff Engineer.")

Rules:
- Only include skills directly evident from the provided history. Do not invent.
- Prefer specific, credible skills over generic ones ("React" over "Frontend Development").
- Deduplicate — if the same skill appears across multiple roles, pick the best proof and set level accordingly.
- Return 10–30 skills. Aim for breadth across technical, leadership, and domain skills where evidence exists.
- Return valid JSON only: { "skills": [ ... ] }. No markdown, no explanation.`;

export async function deriveSkillsFromCareerHistory(
  ownerUserid: string,
  profileId: string,
): Promise<DerivedSkill[]> {
  const [workExperiences, projects] = await Promise.all([
    CareerRepository.listEngagements(db, ownerUserid, { type: 'employment' }),
    ProjectRepository.list(db, ownerUserid),
  ]);

  if (workExperiences.length === 0 && projects.length === 0) {
    return [];
  }

  const workSection =
    workExperiences.length > 0
      ? workExperiences
          .map((exp) => {
            const dates = [exp.startDate, exp.endDate ?? 'present'].filter(Boolean).join(' – ');
            return `Role: ${exp.title} at ${exp.company} (${dates})\nDescription: ${exp.description ?? 'N/A'}`;
          })
          .join('\n\n')
      : 'No work experience provided.';

  const projectSection =
    projects.length > 0
      ? projects
          .map((p) => {
            const tags = Array.isArray(p.technologies)
              ? (p.technologies as string[]).join(', ')
              : '';
            return `Project: ${p.title}\nDescription: ${p.description ?? 'N/A'}${tags ? `\nTechnologies: ${tags}` : ''}`;
          })
          .join('\n\n')
      : 'No projects provided.';

  const userMessage = `Work History:\n${workSection}\n\nProjects:\n${projectSection}`;

  const eventId = randomUUID();
  const getDurationMs = startAIUsageTimer();
  let result;
  try {
    result = await createChatCompletion({
      responseFormat: { type: 'json_object' },
      messages: [
        { role: 'system', content: SYSTEM_PROMPT },
        { role: 'user', content: userMessage },
      ],
    });
  } catch (error) {
    await recordAIUsageEvent({
      eventId,
      userId: ownerUserid,
      feature: 'career_skills_derive',
      operation: 'structured_output',
      status: 'failed',
      error,
      durationMs: getDurationMs(),
      metadata: {
        profileId,
        workExperienceCount: workExperiences.length,
        projectCount: projects.length,
      },
    });
    throw error;
  }
  await recordAIUsageEvent({
    eventId,
    userId: ownerUserid,
    feature: 'career_skills_derive',
    operation: 'structured_output',
    usage: getChatCompletionUsage(result),
    model: result.model,
    status: 'succeeded',
    durationMs: getDurationMs(),
    metadata: {
      profileId,
      workExperienceCount: workExperiences.length,
      projectCount: projects.length,
    },
  });

  const raw = getChatCompletionText(result);
  const parsed = JSON.parse(raw);

  // json_object mode always returns an object; find the first array value
  let arr: unknown[];
  if (Array.isArray(parsed)) {
    arr = parsed;
  } else {
    const firstArray = Object.values(parsed as Record<string, unknown>).find(Array.isArray);
    arr = (firstArray as unknown[]) ?? [];
  }
  return derivedSkillsSchema.parse(arr);
}
