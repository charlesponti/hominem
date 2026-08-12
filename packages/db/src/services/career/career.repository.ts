import { sql, type Selectable } from 'kysely';

import type { DbHandle } from '../../transaction';
import type {
  AppCareerApplications,
  AppCareerApplicationsOffers,
  AppCareerApplicationStages,
  AppCareerEducation,
  AppCareerEngagements,
  AppCareerProfile,
} from '../../types/database';

export type CareerProfileRecord = Selectable<AppCareerProfile>;
export type CareerEngagementRecord = Selectable<AppCareerEngagements>;
export type CareerEducationRecord = Selectable<AppCareerEducation>;
export type CareerApplicationRecord = Selectable<AppCareerApplications>;
export type CareerApplicationStageRecord = Selectable<AppCareerApplicationStages>;
export type CareerOfferRecord = Selectable<AppCareerApplicationsOffers>;
type CareerApplicationWithCurrentStage = CareerApplicationRecord & {
  currentStage: string | null;
};
type CareerEngagementUpdate = Partial<CareerEngagementRecord> &
  Pick<CareerEngagementRecord, 'id' | 'ownerUserid'>;

export type CareerApplicationWithRelations = CareerApplicationWithCurrentStage & {
  stages: CareerApplicationStageRecord[];
  offers: CareerOfferRecord[];
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
    return result ?? null;
  },

  async getProfileBySlug(handle: DbHandle, slug: string): Promise<CareerProfileRecord | null> {
    const result = await handle
      .selectFrom('app.careerProfile')
      .selectAll()
      .where('slug', '=', slug)
      .where('isPublic', '=', true)
      .executeTakeFirst();
    return result ?? null;
  },

  async saveProfile(
    handle: DbHandle,
    ownerUserId: string,
    data: Partial<CareerProfileRecord>,
  ): Promise<CareerProfileRecord> {
    const profile = await handle
      .selectFrom('app.careerProfile')
      .select('id')
      .where('ownerUserid', '=', ownerUserId)
      .executeTakeFirst();

    if (profile) {
      return handle
        .updateTable('app.careerProfile')
        .set(data)
        .where('ownerUserid', '=', ownerUserId)
        .returningAll()
        .executeTakeFirstOrThrow();
    }

    return handle
      .insertInto('app.careerProfile')
      .values({ ...data, ownerUserid: ownerUserId })
      .returningAll()
      .executeTakeFirstOrThrow();
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
      .executeTakeFirstOrThrow();
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
      .executeTakeFirstOrThrow();
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

  async deleteProfile(handle: DbHandle, ownerUserId: string): Promise<boolean> {
    const deleted = await handle
      .deleteFrom('app.careerProfile')
      .where('ownerUserid', '=', ownerUserId)
      .returning('id')
      .executeTakeFirst();
    return deleted !== undefined;
  },

  async listEngagements(
    handle: DbHandle,
    ownerUserId: string,
    opts?: { type?: 'all' | 'employment'; limit?: number },
  ): Promise<CareerEngagementRecord[]> {
    let query = handle
      .selectFrom('app.careerEngagements')
      .selectAll()
      .where('ownerUserid', '=', ownerUserId);

    if (opts?.type === 'employment') {
      query = query.where('kind', '=', 'EMPLOYMENT');
    }

    return query
      .orderBy('endDate', 'desc')
      .orderBy('startDate', 'desc')
      .limit(opts?.limit ?? 20)
      .execute();
  },

  async getEngagementById(
    handle: DbHandle,
    ownerUserId: string,
    engagementId: string,
  ): Promise<CareerEngagementRecord | null> {
    const result = await handle
      .selectFrom('app.careerEngagements')
      .selectAll()
      .where('id', '=', engagementId)
      .where('ownerUserid', '=', ownerUserId)
      .executeTakeFirst();
    return result ?? null;
  },

  async createEngagement(
    handle: DbHandle,
    ownerUserId: string,
    data: Record<string, unknown> & {
      company: string;
      title: string;
    },
  ): Promise<CareerEngagementRecord> {
    return (
      handle
        .insertInto('app.careerEngagements')
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        .values({ ...data, ownerUserid: ownerUserId } as any)
        .returningAll()
        .executeTakeFirstOrThrow()
    );
  },

  async updateEngagement(
    handle: DbHandle,
    update: CareerEngagementUpdate,
  ): Promise<CareerEngagementRecord | null> {
    const { id, ownerUserid, ...data } = update;
    const updated = await handle
      .updateTable('app.careerEngagements')
      .set(data)
      .where('id', '=', id)
      .where('ownerUserid', '=', ownerUserid)
      .returningAll()
      .executeTakeFirst();
    return updated ?? null;
  },

  async deleteEngagement(
    handle: DbHandle,
    ownerUserId: string,
    engagementId: string,
  ): Promise<boolean> {
    const deleted = await handle
      .deleteFrom('app.careerEngagements')
      .where('id', '=', engagementId)
      .where('ownerUserid', '=', ownerUserId)
      .returning('id')
      .executeTakeFirst();
    return deleted !== undefined;
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
      .execute();
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
        .executeTakeFirstOrThrow()
    );
  },

  async listApplications(
    handle: DbHandle,
    ownerUserId: string,
    opts?: { status?: string; limit?: number },
  ): Promise<CareerApplicationWithCurrentStage[]> {
    let query = handle
      .selectFrom('app.careerApplications as application')
      .leftJoin('app.careerApplicationStages as stage', 'stage.id', 'application.currentStageId')
      .selectAll('application')
      .select('stage.stage as currentStage')
      .where('application.ownerUserid', '=', ownerUserId);

    if (opts?.status) {
      query = query.where(
        'application.status',
        '=',
        opts.status as AppCareerApplications['status'],
      );
    }

    let limitedQuery = query.orderBy(sql`"applied_at" desc nulls last`);
    if (opts?.limit) {
      limitedQuery = limitedQuery.limit(opts.limit);
    }

    return limitedQuery.execute();
  },

  async listApplicationsPage(
    handle: DbHandle,
    ownerUserId: string,
    opts: {
      page: number;
      pageSize: number;
      status?: string | null;
      source?: string | null;
      query?: string;
      sort?: 'asc' | 'desc';
    },
  ): Promise<{ items: CareerApplicationWithCurrentStage[]; total: number }> {
    let query = handle
      .selectFrom('app.careerApplications as application')
      .where('application.ownerUserid', '=', ownerUserId);

    if (opts.status !== undefined) {
      query =
        opts.status === null
          ? query.where('application.status', 'is', null)
          : query.where('application.status', '=', opts.status as AppCareerApplications['status']);
    }

    if (opts.source !== undefined) {
      query =
        opts.source === null
          ? query.where('application.source', 'is', null)
          : query.where('application.source', '=', opts.source);
    }

    const trimmedQuery = opts.query?.trim();
    if (trimmedQuery) {
      const pattern = `%${trimmedQuery}%`;
      query = query.where((eb) =>
        eb.or([
          eb('application.company', 'ilike', pattern),
          eb('application.title', 'ilike', pattern),
        ]),
      );
    }

    const direction = opts.sort === 'asc' ? 'asc' : 'desc';

    const [totalRow, items] = await Promise.all([
      query.select((eb) => eb.fn.countAll<number>().as('count')).executeTakeFirst(),
      query
        .leftJoin('app.careerApplicationStages as stage', 'stage.id', 'application.currentStageId')
        .selectAll('application')
        .select('stage.stage as currentStage')
        .orderBy(sql`"application"."applied_at" ${sql.raw(direction)} nulls last`)
        .offset((opts.page - 1) * opts.pageSize)
        .limit(opts.pageSize)
        .execute(),
    ]);

    return {
      items,
      total: Number(totalRow?.count ?? 0),
    };
  },

  async getApplicationFilterCounts(
    handle: DbHandle,
    ownerUserId: string,
  ): Promise<{
    statusCounts: Array<{ status: string | null; count: number }>;
    sourceCounts: Array<{ source: string | null; count: number }>;
  }> {
    const [statusCounts, sourceCounts] = await Promise.all([
      handle
        .selectFrom('app.careerApplications')
        .select(['status', (eb) => eb.fn.countAll<number>().as('count')])
        .where('ownerUserid', '=', ownerUserId)
        .groupBy('status')
        .execute(),
      handle
        .selectFrom('app.careerApplications')
        .select(['source', (eb) => eb.fn.countAll<number>().as('count')])
        .where('ownerUserid', '=', ownerUserId)
        .groupBy('source')
        .execute(),
    ]);

    return {
      statusCounts: statusCounts.map((row) => ({
        status: row.status,
        count: Number(row.count),
      })),
      sourceCounts: sourceCounts.map((row) => ({
        source: row.source,
        count: Number(row.count),
      })),
    };
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
        .executeTakeFirstOrThrow()
    );
  },

  async updateApplication(
    handle: DbHandle,
    ownerUserId: string,
    applicationId: string,
    data: Partial<CareerApplicationRecord>,
  ): Promise<CareerApplicationRecord> {
    return handle
      .updateTable('app.careerApplications')
      .set(data)
      .where('id', '=', applicationId)
      .where('ownerUserid', '=', ownerUserId)
      .returningAll()
      .executeTakeFirstOrThrow();
  },

  async deleteApplication(
    handle: DbHandle,
    ownerUserId: string,
    applicationId: string,
  ): Promise<boolean> {
    const deleted = await handle
      .deleteFrom('app.careerApplications')
      .where('id', '=', applicationId)
      .where('ownerUserid', '=', ownerUserId)
      .returning('id')
      .executeTakeFirst();
    return deleted !== undefined;
  },

  async updateWishlistApplication(
    handle: DbHandle,
    ownerUserId: string,
    applicationId: string,
    company: string,
  ): Promise<CareerApplicationRecord | null> {
    const updated = await handle
      .updateTable('app.careerApplications')
      .set({ company, title: company })
      .where('id', '=', applicationId)
      .where('ownerUserid', '=', ownerUserId)
      .where('status', '=', 'WISHLIST')
      .returningAll()
      .executeTakeFirst();
    return updated ?? null;
  },

  async deleteWishlistApplication(
    handle: DbHandle,
    ownerUserId: string,
    applicationId: string,
  ): Promise<boolean> {
    const deleted = await handle
      .deleteFrom('app.careerApplications')
      .where('id', '=', applicationId)
      .where('ownerUserid', '=', ownerUserId)
      .where('status', '=', 'WISHLIST')
      .returning('id')
      .executeTakeFirst();
    return deleted !== undefined;
  },

  async listOffers(
    handle: DbHandle,
    ownerUserId: string,
  ): Promise<
    Array<CareerOfferRecord & { company: string; title: string; appliedAt: string | null }>
  > {
    const rows = await handle
      .selectFrom('app.careerApplicationsOffers as o')
      .innerJoin('app.careerApplications as a', 'a.id', 'o.applicationId')
      .select([
        'o.id',
        'o.applicationId',
        'o.stageId',
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
    return rows;
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
        .selectFrom('app.careerApplicationsOffers')
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
    const application = await handle
      .selectFrom('app.careerApplications as application')
      .leftJoin('app.careerApplicationStages as stage', 'stage.id', 'application.currentStageId')
      .selectAll('application')
      .select('stage.stage as currentStage')
      .where('application.id', '=', applicationId)
      .where('application.ownerUserid', '=', ownerUserId)
      .executeTakeFirst();

    if (!application) return null;

    const [stages, offers] = await Promise.all([
      handle
        .selectFrom('app.careerApplicationStages')
        .selectAll()
        .where('applicationId', '=', applicationId)
        .orderBy('stageOrder', 'asc')
        .execute(),
      handle
        .selectFrom('app.careerApplicationsOffers as offer')
        .leftJoin('app.careerApplicationStages as stage', 'stage.id', 'offer.stageId')
        .selectAll('offer')
        .where('offer.applicationId', '=', applicationId)
        .orderBy('stage.stageOrder', 'asc')
        .execute(),
    ]);

    return { ...application, stages, offers };
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
        .selectFrom('app.careerEngagements')
        .select(['id', 'company', 'title', 'startDate', 'endDate', 'isCurrent'])
        .where('ownerUserid', '=', ownerUserId)
        .where('kind', '=', 'EMPLOYMENT')
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
