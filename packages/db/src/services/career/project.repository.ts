import type { Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type { AppCareerProjects, JsonArray } from '../../types/database';

export type CareerProjectRecord = Selectable<AppCareerProjects>;

export type CareerProjectInput = {
  positionId?: string | null;
  title: string;
  description?: string | null;
  shortDescription?: string | null;
  liveUrl?: string | null;
  githubUrl?: string | null;
  imageUrl?: string | null;
  videoUrl?: string | null;
  technologies?: JsonArray;
  status?: string | null;
  startDate?: string | null;
  endDate?: string | null;
  isFeatured?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
};

export const ProjectRepository = {
  async list(handle: DbHandle, ownerUserId: string): Promise<CareerProjectRecord[]> {
    return handle
      .selectFrom('app.careerProjects')
      .selectAll()
      .where('ownerUserid', '=', ownerUserId)
      .orderBy('sortOrder', 'asc')
      .execute() as Promise<CareerProjectRecord[]>;
  },

  async create(
    handle: DbHandle,
    ownerUserId: string,
    input: CareerProjectInput,
  ): Promise<CareerProjectRecord> {
    return handle
      .insertInto('app.careerProjects')
      .values({
        ownerUserid: ownerUserId,
        ...input,
        technologies: JSON.stringify(input.technologies ?? []) as unknown as JsonArray,
      })
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<CareerProjectRecord>;
  },

  async update(
    handle: DbHandle,
    ownerUserId: string,
    id: string,
    input: Partial<CareerProjectInput>,
  ): Promise<CareerProjectRecord | null> {
    const result = await handle
      .updateTable('app.careerProjects')
      .set({
        ...input,
        ...(input.technologies !== undefined
          ? { technologies: JSON.stringify(input.technologies) as unknown as JsonArray }
          : {}),
      })
      .where('id', '=', id)
      .where('ownerUserid', '=', ownerUserId)
      .returningAll()
      .executeTakeFirst();
    return (result ?? null) as CareerProjectRecord | null;
  },

  async remove(handle: DbHandle, ownerUserId: string, id: string): Promise<void> {
    await handle
      .deleteFrom('app.careerProjects')
      .where('id', '=', id)
      .where('ownerUserid', '=', ownerUserId)
      .execute();
  },
};
