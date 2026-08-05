import type { Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type { AppCareerApplicationNotes } from '../../types/database';

export type CareerApplicationNoteRecord = Selectable<AppCareerApplicationNotes>;

export const ApplicationNotesRepository = {
  async list(handle: DbHandle, applicationId: string): Promise<CareerApplicationNoteRecord[]> {
    return handle
      .selectFrom('app.careerApplicationNotes')
      .selectAll()
      .where('applicationId', '=', applicationId)
      .orderBy('createdAt', 'desc')
      .execute() as Promise<CareerApplicationNoteRecord[]>;
  },

  async create(
    handle: DbHandle,
    applicationId: string,
    content: string,
  ): Promise<CareerApplicationNoteRecord> {
    return handle
      .insertInto('app.careerApplicationNotes')
      .values({ applicationId, content })
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<CareerApplicationNoteRecord>;
  },

  async remove(handle: DbHandle, applicationId: string, id: string): Promise<void> {
    await handle
      .deleteFrom('app.careerApplicationNotes')
      .where('id', '=', id)
      .where('applicationId', '=', applicationId)
      .execute();
  },
};
