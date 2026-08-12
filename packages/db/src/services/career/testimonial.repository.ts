import type { Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type { AppCareerTestimonials } from '../../types/database';

export type CareerTestimonialRecord = Selectable<AppCareerTestimonials>;

export type CareerTestimonialInput = {
  name: string;
  title?: string | null;
  company?: string | null;
  content: string;
  avatarUrl?: string | null;
  linkedinUrl?: string | null;
  rating?: number | null;
  isVerified?: boolean;
  isVisible?: boolean;
  sortOrder?: number;
};

export const TestimonialRepository = {
  async list(handle: DbHandle, ownerUserId: string): Promise<CareerTestimonialRecord[]> {
    return handle
      .selectFrom('app.careerTestimonials')
      .selectAll()
      .where('ownerUserid', '=', ownerUserId)
      .orderBy('sortOrder', 'asc')
      .execute() as Promise<CareerTestimonialRecord[]>;
  },

  async create(
    handle: DbHandle,
    ownerUserId: string,
    input: CareerTestimonialInput,
  ): Promise<CareerTestimonialRecord> {
    return handle
      .insertInto('app.careerTestimonials')
      .values({ ownerUserid: ownerUserId, ...input })
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<CareerTestimonialRecord>;
  },

  async update(
    handle: DbHandle,
    ownerUserId: string,
    id: string,
    input: Partial<CareerTestimonialInput>,
  ): Promise<CareerTestimonialRecord | null> {
    const result = await handle
      .updateTable('app.careerTestimonials')
      .set(input)
      .where('id', '=', id)
      .where('ownerUserid', '=', ownerUserId)
      .returningAll()
      .executeTakeFirst();
    return (result ?? null) as CareerTestimonialRecord | null;
  },

  async remove(handle: DbHandle, ownerUserId: string, id: string): Promise<boolean> {
    const deleted = await handle
      .deleteFrom('app.careerTestimonials')
      .where('id', '=', id)
      .where('ownerUserid', '=', ownerUserId)
      .returning('id')
      .executeTakeFirst();
    return deleted !== undefined;
  },
};
