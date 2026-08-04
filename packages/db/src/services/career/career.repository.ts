import type { Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type {
  AppCareerApplications,
  AppCareerApplicationStages,
  AppCareerEducation,
  AppCareerOffers,
  AppCareerPositions,
  AppCareerProfile,
} from '../../types/database';

export type CareerProfileRecord = Selectable<AppCareerProfile>;
export type CareerPositionRecord = Selectable<AppCareerPositions>;
export type CareerEducationRecord = Selectable<AppCareerEducation>;
export type CareerApplicationRecord = Selectable<AppCareerApplications>;
export type CareerApplicationStageRecord = Selectable<AppCareerApplicationStages>;
export type CareerOfferRecord = Selectable<AppCareerOffers>;

export type CareerApplicationWithRelations = CareerApplicationRecord & {
  stages: CareerApplicationStageRecord[];
  offer: CareerOfferRecord | null;
};

export const CareerRepository = {
  async getProfile(handle: DbHandle, ownerUserId: string): Promise<CareerProfileRecord | null> {
    const result = await handle
      .selectFrom('app.careerProfile')
      .selectAll()
      .where('ownerUserid', '=', ownerUserId)
      .executeTakeFirst();
    return (result ?? null) as CareerProfileRecord | null;
  },

  async listPositions(
    handle: DbHandle,
    ownerUserId: string,
    opts?: { type?: 'all' | 'employment' | 'target'; limit?: number },
  ): Promise<CareerPositionRecord[]> {
    let query = handle
      .selectFrom('app.careerPositions')
      .selectAll()
      .where('ownerUserid', '=', ownerUserId);

    if (opts?.type === 'employment') {
      query = query.where('isTarget', '=', false);
    } else if (opts?.type === 'target') {
      query = query.where('isTarget', '=', true);
    }

    return query
      .orderBy('endDate', 'desc')
      .orderBy('startDate', 'desc')
      .limit(opts?.limit ?? 20)
      .execute() as Promise<CareerPositionRecord[]>;
  },

  async listEducation(
    handle: DbHandle,
    ownerUserId: string,
    limit?: number,
  ): Promise<CareerEducationRecord[]> {
    return handle
      .selectFrom('app.careerEducation')
      .selectAll()
      .where('ownerUserid', '=', ownerUserId)
      .orderBy('endDate', 'desc')
      .orderBy('startDate', 'desc')
      .limit(limit ?? 10)
      .execute() as Promise<CareerEducationRecord[]>;
  },

  async listApplications(
    handle: DbHandle,
    ownerUserId: string,
    opts?: { status?: string; limit?: number },
  ): Promise<CareerApplicationRecord[]> {
    let query = handle
      .selectFrom('app.careerApplications')
      .selectAll()
      .where('ownerUserid', '=', ownerUserId);

    if (opts?.status) {
      query = query.where('status', '=', opts.status);
    }

    return query
      .orderBy('appliedAt', 'desc')
      .limit(opts?.limit ?? 20)
      .execute() as Promise<CareerApplicationRecord[]>;
  },

  async getApplicationWithRelations(
    handle: DbHandle,
    ownerUserId: string,
    applicationId: string,
  ): Promise<CareerApplicationWithRelations | null> {
    const application = (await handle
      .selectFrom('app.careerApplications')
      .selectAll()
      .where('id', '=', applicationId)
      .where('ownerUserid', '=', ownerUserId)
      .executeTakeFirst()) as CareerApplicationRecord | undefined;

    if (!application) return null;

    const [stages, offerRow] = await Promise.all([
      handle
        .selectFrom('app.careerApplicationStages')
        .selectAll()
        .where('applicationId', '=', applicationId)
        .orderBy('enteredAt', 'asc')
        .execute() as Promise<CareerApplicationStageRecord[]>,
      handle
        .selectFrom('app.careerOffers')
        .selectAll()
        .where('applicationId', '=', applicationId)
        .executeTakeFirst() as Promise<CareerOfferRecord | undefined>,
    ]);

    return { ...application, stages, offer: offerRow ?? null };
  },

  async applicationBelongsToOwner(
    handle: DbHandle,
    ownerUserId: string,
    applicationId: string,
  ): Promise<boolean> {
    const row = await handle
      .selectFrom('app.careerApplications')
      .select('id')
      .where('id', '=', applicationId)
      .where('ownerUserid', '=', ownerUserId)
      .executeTakeFirst();
    return row !== undefined;
  },
};
