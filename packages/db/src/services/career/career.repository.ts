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

export type CareerTimelineRecord = {
  id: string;
  type: 'position' | 'education' | 'application';
  title: string;
  subtitle: string;
  startDate: string | null;
  endDate: string | null;
  isCurrent: boolean;
  order: number;
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

  async getProfileBySlug(handle: DbHandle, slug: string): Promise<CareerProfileRecord | null> {
    const result = await handle
      .selectFrom('app.careerProfile')
      .selectAll()
      .where('slug', '=', slug)
      .where('isPublic', '=', true)
      .executeTakeFirst();
    return (result ?? null) as CareerProfileRecord | null;
  },

  async saveProfile(
    handle: DbHandle,
    ownerUserId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
  ): Promise<CareerProfileRecord> {
    const profile = await handle
      .selectFrom('app.careerProfile')
      .select('id')
      .where('ownerUserid', '=', ownerUserId)
      .executeTakeFirst();

    if (profile) {
      return (
        handle
          .updateTable('app.careerProfile')
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          .set(data as any)
          .where('ownerUserid', '=', ownerUserId)
          .returningAll()
          .executeTakeFirstOrThrow() as Promise<CareerProfileRecord>
      );
    }

    return (
      handle
        .insertInto('app.careerProfile')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values({ ...data, ownerUserid: ownerUserId } as any)
        .returningAll()
        .executeTakeFirstOrThrow() as Promise<CareerProfileRecord>
    );
  },

  async updateProfileImage(
    handle: DbHandle,
    ownerUserId: string,
    url: string,
  ): Promise<CareerProfileRecord> {
    return handle
      .updateTable('app.careerProfile')
      .set({ profileImageUrl: url })
      .where('ownerUserid', '=', ownerUserId)
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<CareerProfileRecord>;
  },

  async updateSlug(
    handle: DbHandle,
    ownerUserId: string,
    newSlug: string,
  ): Promise<CareerProfileRecord> {
    return handle
      .updateTable('app.careerProfile')
      .set({ slug: newSlug })
      .where('ownerUserid', '=', ownerUserId)
      .returningAll()
      .executeTakeFirstOrThrow() as Promise<CareerProfileRecord>;
  },

  async isSlugAvailable(
    handle: DbHandle,
    slug: string,
    excludeProfileId?: string,
  ): Promise<boolean> {
    let query = handle.selectFrom('app.careerProfile').select('id').where('slug', '=', slug);

    if (excludeProfileId) {
      query = query.where('id', '!=', excludeProfileId);
    }

    const row = await query.executeTakeFirst();
    return row === undefined;
  },

  async deleteProfile(handle: DbHandle, ownerUserId: string): Promise<void> {
    await handle.deleteFrom('app.careerProfile').where('ownerUserid', '=', ownerUserId).execute();
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

  async getPositionById(
    handle: DbHandle,
    ownerUserId: string,
    positionId: string,
  ): Promise<CareerPositionRecord | null> {
    const result = await handle
      .selectFrom('app.careerPositions')
      .selectAll()
      .where('id', '=', positionId)
      .where('ownerUserid', '=', ownerUserId)
      .executeTakeFirst();
    return (result ?? null) as CareerPositionRecord | null;
  },

  async createPosition(
    handle: DbHandle,
    ownerUserId: string,
    data: Record<string, unknown> & {
      company: string;
      title: string;
    },
  ): Promise<CareerPositionRecord> {
    return (
      handle
        .insertInto('app.careerPositions')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values({ ...data, ownerUserid: ownerUserId } as any)
        .returningAll()
        .executeTakeFirstOrThrow() as Promise<CareerPositionRecord>
    );
  },

  async updatePosition(
    handle: DbHandle,
    ownerUserId: string,
    positionId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
  ): Promise<CareerPositionRecord> {
    return (
      handle
        .updateTable('app.careerPositions')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(data as any)
        .where('id', '=', positionId)
        .where('ownerUserid', '=', ownerUserId)
        .returningAll()
        .executeTakeFirstOrThrow() as Promise<CareerPositionRecord>
    );
  },

  async deletePosition(handle: DbHandle, ownerUserId: string, positionId: string): Promise<void> {
    await handle
      .deleteFrom('app.careerPositions')
      .where('id', '=', positionId)
      .where('ownerUserid', '=', ownerUserId)
      .execute();
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

  async createEducation(
    handle: DbHandle,
    ownerUserId: string,
    data: {
      school: string;
      degree?: string | null;
      fieldOfStudy?: string | null;
      startDate?: string | null;
      endDate?: string | null;
      activities?: string | null;
      notes?: string | null;
    },
  ): Promise<CareerEducationRecord> {
    return (
      handle
        .insertInto('app.careerEducation')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values({ ...data, ownerUserid: ownerUserId } as any)
        .returningAll()
        .executeTakeFirstOrThrow() as Promise<CareerEducationRecord>
    );
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

  async createApplication(
    handle: DbHandle,
    ownerUserId: string,
    data: {
      company: string;
      title: string;
      location?: string | null;
      source?: string | null;
      appliedAt?: string | null;
      status?: string | null;
      jobPostingUrl?: string | null;
      salaryExpectation?: number | null;
      notes?: string | null;
    },
  ): Promise<CareerApplicationRecord> {
    return (
      handle
        .insertInto('app.careerApplications')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values({ ...data, ownerUserid: ownerUserId } as any)
        .returningAll()
        .executeTakeFirstOrThrow() as Promise<CareerApplicationRecord>
    );
  },

  async updateApplication(
    handle: DbHandle,
    ownerUserId: string,
    applicationId: string,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    data: Record<string, any>,
  ): Promise<CareerApplicationRecord> {
    return (
      handle
        .updateTable('app.careerApplications')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .set(data as any)
        .where('id', '=', applicationId)
        .where('ownerUserid', '=', ownerUserId)
        .returningAll()
        .executeTakeFirstOrThrow() as Promise<CareerApplicationRecord>
    );
  },

  async deleteApplication(
    handle: DbHandle,
    ownerUserId: string,
    applicationId: string,
  ): Promise<void> {
    await handle
      .deleteFrom('app.careerApplications')
      .where('id', '=', applicationId)
      .where('ownerUserid', '=', ownerUserId)
      .execute();
  },

  async listOffers(
    handle: DbHandle,
    ownerUserId: string,
  ): Promise<
    Array<CareerOfferRecord & { company: string; title: string; appliedAt: string | null }>
  > {
    const rows = await handle
      .selectFrom('app.careerOffers as o')
      .innerJoin('app.careerApplications as a', 'a.id', 'o.applicationId')
      .select([
        'o.id',
        'o.applicationId',
        'o.baseSalary',
        'o.bonus',
        'o.currency',
        'o.decision',
        'o.decisionAt',
        'o.equity',
        'o.notes',
        'o.signingBonus',
        'o.totalComp',
        'o.createdAt',
        'a.company',
        'a.title',
        'a.appliedAt',
      ])
      .where('a.ownerUserid', '=', ownerUserId)
      .execute();
    return rows as Array<
      CareerOfferRecord & { company: string; title: string; appliedAt: string | null }
    >;
  },

  async getApplicationCardStats(
    handle: DbHandle,
    applicationIds: string[],
  ): Promise<Map<string, { stageCount: number; hasOffer: boolean }>> {
    const stats = new Map<string, { stageCount: number; hasOffer: boolean }>();
    if (applicationIds.length === 0) return stats;

    for (const id of applicationIds) {
      stats.set(id, { stageCount: 0, hasOffer: false });
    }

    const [stageCounts, offers] = await Promise.all([
      handle
        .selectFrom('app.careerApplicationStages')
        .select(['applicationId', (eb) => eb.fn.countAll().as('count')])
        .where('applicationId', 'in', applicationIds)
        .groupBy('applicationId')
        .execute(),
      handle
        .selectFrom('app.careerOffers')
        .select('applicationId')
        .where('applicationId', 'in', applicationIds)
        .execute(),
    ]);

    for (const row of stageCounts) {
      const entry = stats.get(row.applicationId);
      if (entry) entry.stageCount = Number(row.count ?? 0);
    }
    for (const row of offers) {
      if (!row.applicationId) continue;
      const entry = stats.get(row.applicationId);
      if (entry) entry.hasOffer = true;
    }

    return stats;
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

  async getTimeline(handle: DbHandle, ownerUserId: string): Promise<CareerTimelineRecord[]> {
    const [positions, education, applications] = await Promise.all([
      handle
        .selectFrom('app.careerPositions')
        .select(['id', 'company', 'title', 'startDate', 'endDate', 'isCurrent'])
        .where('ownerUserid', '=', ownerUserId)
        .where('isTarget', '=', false)
        .orderBy('endDate', 'desc')
        .orderBy('startDate', 'desc')
        .execute(),
      handle
        .selectFrom('app.careerEducation')
        .select(['id', 'school', 'degree', 'startDate', 'endDate'])
        .where('ownerUserid', '=', ownerUserId)
        .orderBy('endDate', 'desc')
        .orderBy('startDate', 'desc')
        .execute(),
      handle
        .selectFrom('app.careerApplications')
        .select(['id', 'company', 'title', 'appliedAt'])
        .where('ownerUserid', '=', ownerUserId)
        .orderBy('appliedAt', 'desc')
        .execute(),
    ]);

    const timeline: CareerTimelineRecord[] = [];

    for (const [i, p] of positions.entries()) {
      timeline.push({
        id: p.id,
        type: 'position',
        title: p.title,
        subtitle: p.company,
        startDate: p.startDate,
        endDate: p.endDate,
        isCurrent: p.isCurrent ?? false,
        order: i,
      });
    }

    for (const [i, e] of education.entries()) {
      timeline.push({
        id: e.id,
        type: 'education',
        title: e.degree ?? e.school,
        subtitle: e.school,
        startDate: e.startDate,
        endDate: e.endDate,
        isCurrent: false,
        order: positions.length + i,
      });
    }

    for (const [i, a] of applications.entries()) {
      timeline.push({
        id: a.id,
        type: 'application',
        title: a.title,
        subtitle: a.company,
        startDate: a.appliedAt,
        endDate: null,
        isCurrent: false,
        order: positions.length + education.length + i,
      });
    }

    return timeline;
  },
};
