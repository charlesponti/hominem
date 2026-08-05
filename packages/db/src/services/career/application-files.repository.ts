import type { Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type { AppCareerApplicationFiles } from '../../types/database';

export type CareerApplicationFileRecord = Selectable<AppCareerApplicationFiles>;

export type CareerApplicationFileInput = {
  fileName: string;
  fileUrl: string;
  fileType?: string | null;
};

export const ApplicationFilesRepository = {
  async list(handle: DbHandle, applicationId: string): Promise<CareerApplicationFileRecord[]> {
    return handle
      .selectFrom('app.careerApplicationFiles')
      .selectAll()
      .where('applicationId', '=', applicationId)
      .orderBy('createdAt', 'desc')
      .execute() as Promise<CareerApplicationFileRecord[]>;
  },

  async create(
    handle: DbHandle,
    applicationId: string,
    input: CareerApplicationFileInput,
  ): Promise<CareerApplicationFileRecord> {
    return handle
      .insertInto('app.careerApplicationFiles')
      .values({ applicationId, ...input })
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<CareerApplicationFileRecord>;
  },

  async remove(handle: DbHandle, applicationId: string, id: string): Promise<void> {
    await handle
      .deleteFrom('app.careerApplicationFiles')
      .where('id', '=', id)
      .where('applicationId', '=', applicationId)
      .execute();
  },
};
