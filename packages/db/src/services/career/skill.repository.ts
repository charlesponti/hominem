import type { Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type { AppCareerSkills } from '../../types/database';

export type CareerSkillRecord = Selectable<AppCareerSkills>;

export type CareerSkillInput = {
  name: string;
  category?: string | null;
  level?: number | null;
  yearsOfExperience?: number | null;
  description?: string | null;
  proof?: string | null;
  aiDerived?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
};

export const SkillRepository = {
  async list(handle: DbHandle, ownerUserId: string): Promise<CareerSkillRecord[]> {
    return handle
      .selectFrom('app.careerSkills')
      .selectAll()
      .where('ownerUserid', '=', ownerUserId)
      .orderBy('sortOrder', 'asc')
      .execute() as Promise<CareerSkillRecord[]>;
  },

  async create(
    handle: DbHandle,
    ownerUserId: string,
    input: CareerSkillInput,
  ): Promise<CareerSkillRecord> {
    return handle
      .insertInto('app.careerSkills')
      .values({ ownerUserid: ownerUserId, ...input })
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<CareerSkillRecord>;
  },

  async update(
    handle: DbHandle,
    ownerUserId: string,
    id: string,
    input: Partial<CareerSkillInput>,
  ): Promise<CareerSkillRecord | null> {
    const result = await handle
      .updateTable('app.careerSkills')
      .set(input)
      .where('id', '=', id)
      .where('ownerUserid', '=', ownerUserId)
      .returningAll()
      .executeTakeFirst();
    return (result ?? null) as CareerSkillRecord | null;
  },

  async remove(handle: DbHandle, ownerUserId: string, id: string): Promise<void> {
    await handle
      .deleteFrom('app.careerSkills')
      .where('id', '=', id)
      .where('ownerUserid', '=', ownerUserId)
      .execute();
  },

  /** Diff-based replace: deletes skills no longer present, upserts the rest by name. */
  async replaceSkills(
    handle: DbHandle,
    ownerUserId: string,
    skills: CareerSkillInput[],
  ): Promise<CareerSkillRecord[]> {
    const existing = await this.list(handle, ownerUserId);
    const incomingNames = new Set(skills.map((s) => s.name));

    const toRemove = existing.filter((s) => !incomingNames.has(s.name));
    for (const skill of toRemove) {
      await this.remove(handle, ownerUserId, skill.id);
    }

    const results: CareerSkillRecord[] = [];
    for (const skill of skills) {
      const match = existing.find((s) => s.name === skill.name);
      if (match) {
        const updated = await this.update(handle, ownerUserId, match.id, skill);
        if (updated) results.push(updated);
      } else {
        results.push(await this.create(handle, ownerUserId, skill));
      }
    }

    return results;
  },
};
