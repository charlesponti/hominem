import type { Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type { AppCareerCertifications } from '../../types/database';

export type CareerCertificationRecord = Selectable<AppCareerCertifications>;

export type CareerCertificationInput = {
  positionId?: string | null;
  name: string;
  description?: string | null;
  issuingOrganization: string;
  issueDate?: string | null;
  expirationDate?: string | null;
  status?: string | null;
  category?: string | null;
  isVisible?: boolean;
  sortOrder?: number;
};

export const CertificationRepository = {
  async list(handle: DbHandle, ownerUserId: string): Promise<CareerCertificationRecord[]> {
    return handle
      .selectFrom('app.careerCertifications')
      .selectAll()
      .where('ownerUserid', '=', ownerUserId)
      .orderBy('sortOrder', 'asc')
      .execute() as Promise<CareerCertificationRecord[]>;
  },

  async create(
    handle: DbHandle,
    ownerUserId: string,
    input: CareerCertificationInput,
  ): Promise<CareerCertificationRecord> {
    return handle
      .insertInto('app.careerCertifications')
      .values({ ownerUserid: ownerUserId, ...input })
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<CareerCertificationRecord>;
  },

  async update(
    handle: DbHandle,
    ownerUserId: string,
    id: string,
    input: Partial<CareerCertificationInput>,
  ): Promise<CareerCertificationRecord | null> {
    const result = await handle
      .updateTable('app.careerCertifications')
      .set(input)
      .where('id', '=', id)
      .where('ownerUserid', '=', ownerUserId)
      .returningAll()
      .executeTakeFirst();
    return (result ?? null) as CareerCertificationRecord | null;
  },

  async remove(handle: DbHandle, ownerUserId: string, id: string): Promise<boolean> {
    const deleted = await handle
      .deleteFrom('app.careerCertifications')
      .where('id', '=', id)
      .where('ownerUserid', '=', ownerUserId)
      .returning('id')
      .executeTakeFirst();
    return deleted !== undefined;
  },
};
