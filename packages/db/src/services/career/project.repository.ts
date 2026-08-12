import type { Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type {
  AppCareerEngagements,
  AppCareerProjectEngagements,
  AppCareerProjects,
  AppCareerProjectStatus,
  JsonArray,
} from '../../types/database';

export type CareerEngagementSummary = Pick<
  Selectable<AppCareerEngagements>,
  'id' | 'company' | 'title' | 'kind'
>;

export type CareerProjectRecord = Selectable<AppCareerProjects> & {
  engagements: CareerEngagementSummary[];
};

export type CareerProjectInput = {
  organization?: string | null;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  liveUrl?: string | null;
  githubUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  technologies?: JsonArray;
  status?: AppCareerProjectStatus | null;
  startDate?: string | null;
  endDate?: string | null;
  isFeatured?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
  engagementIds?: string[];
};

type ProjectRow = Selectable<AppCareerProjects>;

async function withEngagements(
  handle: DbHandle,
  ownerUserId: string,
  projects: ProjectRow[],
): Promise<CareerProjectRecord[]> {
  if (projects.length === 0) return [];

  const links = await handle
    .selectFrom('app.careerProjectEngagements as link')
    .innerJoin('app.careerEngagements as engagement', 'engagement.id', 'link.engagementId')
    .select([
      'link.projectId',
      'engagement.id',
      'engagement.company',
      'engagement.title',
      'engagement.kind',
    ])
    .where('link.ownerUserid', '=', ownerUserId)
    .where(
      'link.projectId',
      'in',
      projects.map((project) => project.id),
    )
    .orderBy('engagement.startDate', 'desc')
    .execute();

  const byProject = new Map<string, CareerEngagementSummary[]>();
  for (const link of links) {
    const entries = byProject.get(link.projectId) ?? [];
    entries.push({
      id: link.id,
      company: link.company,
      title: link.title,
      kind: link.kind,
    });
    byProject.set(link.projectId, entries);
  }

  return projects.map((project) => ({
    ...project,
    engagements: byProject.get(project.id) ?? [],
  }));
}

async function syncEngagements(
  handle: DbHandle,
  ownerUserId: string,
  projectId: string,
  engagementIds: string[],
) {
  await handle
    .deleteFrom('app.careerProjectEngagements')
    .where('ownerUserid', '=', ownerUserId)
    .where('projectId', '=', projectId)
    .execute();

  if (engagementIds.length === 0) return;

  const validEngagements = await handle
    .selectFrom('app.careerEngagements')
    .select('id')
    .where('ownerUserid', '=', ownerUserId)
    .where('id', 'in', engagementIds)
    .execute();
  const validIds = validEngagements.map((engagement) => engagement.id);

  if (validIds.length > 0) {
    await handle
      .insertInto('app.careerProjectEngagements')
      .values(
        validIds.map((engagementId) => ({
          projectId,
          engagementId,
          ownerUserid: ownerUserId,
        })) as Array<Selectable<AppCareerProjectEngagements>>,
      )
      .onConflict((oc) => oc.columns(['projectId', 'engagementId']).doNothing())
      .execute();
  }
}

export const ProjectRepository = {
  async list(handle: DbHandle, ownerUserId: string): Promise<CareerProjectRecord[]> {
    const projects = await handle
      .selectFrom('app.careerProjects')
      .selectAll()
      .where('ownerUserid', '=', ownerUserId)
      .orderBy('sortOrder', 'asc')
      .execute();
    return withEngagements(handle, ownerUserId, projects);
  },

  async create(
    handle: DbHandle,
    ownerUserId: string,
    input: CareerProjectInput,
  ): Promise<CareerProjectRecord> {
    const { engagementIds = [], technologies, ...projectInput } = input;
    const project = await handle
      .insertInto('app.careerProjects')
      .values({
        ownerUserid: ownerUserId,
        ...projectInput,
        technologies: JSON.stringify(technologies ?? []) as unknown as JsonArray,
      })
      .returningAll()
      .executeTakeFirstOrThrow();

    await syncEngagements(handle, ownerUserId, project.id, engagementIds);
    return (await withEngagements(handle, ownerUserId, [project]))[0];
  },

  async update(
    handle: DbHandle,
    ownerUserId: string,
    id: string,
    input: Partial<CareerProjectInput>,
  ): Promise<CareerProjectRecord | null> {
    const { engagementIds, technologies, ...projectInput } = input;
    const result =
      Object.keys(projectInput).length === 0 && technologies === undefined
        ? await handle
            .selectFrom('app.careerProjects')
            .selectAll()
            .where('id', '=', id)
            .where('ownerUserid', '=', ownerUserId)
            .executeTakeFirst()
        : await handle
            .updateTable('app.careerProjects')
            .set({
              ...projectInput,
              ...(technologies !== undefined
                ? { technologies: JSON.stringify(technologies) as unknown as JsonArray }
                : {}),
            })
            .where('id', '=', id)
            .where('ownerUserid', '=', ownerUserId)
            .returningAll()
            .executeTakeFirst();
    if (!result) return null;

    if (engagementIds !== undefined) {
      await syncEngagements(handle, ownerUserId, id, engagementIds);
    }
    return (await withEngagements(handle, ownerUserId, [result]))[0];
  },

  async remove(handle: DbHandle, ownerUserId: string, id: string): Promise<boolean> {
    const deleted = await handle
      .deleteFrom('app.careerProjects')
      .where('id', '=', id)
      .where('ownerUserid', '=', ownerUserId)
      .returning('id')
      .executeTakeFirst();
    return deleted !== undefined;
  },
};
