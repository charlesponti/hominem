import { CareerRepository, db, type CareerApplicationRecord } from '@hominem/db';

import { JobApplicationStatus } from '~/types/career';

interface CreateApplicationInput {
  companyName: string;
  position: string;
  status?: JobApplicationStatus;
  location?: string | null;
  source?: string | null;
  jobPostingUrl?: string | null;
  salaryExpectation?: number | null;
  notes?: string | null;
}

export class JobApplicationsService {
  static async getApplication(
    applicationId: string,
    ownerUserid: string,
  ): Promise<CareerApplicationRecord> {
    const application = await CareerRepository.getApplicationWithRelations(
      db,
      ownerUserid,
      applicationId,
    );

    if (!application) {
      throw new Error('Application not found');
    }

    return application;
  }

  static async verifyOwnership(applicationId: string, ownerUserid: string): Promise<boolean> {
    return CareerRepository.applicationBelongsToOwner(db, ownerUserid, applicationId);
  }

  static async updateApplication(
    applicationId: string,
    updates: Partial<CareerApplicationRecord>,
    ownerUserid?: string,
  ): Promise<void> {
    if (Object.keys(updates).length === 0) return;
    await CareerRepository.updateApplication(db, ownerUserid!, applicationId, updates);
  }

  static async createApplication(
    ownerUserid: string,
    input: CreateApplicationInput,
  ): Promise<CareerApplicationRecord> {
    return CareerRepository.createApplication(db, ownerUserid, {
      company: input.companyName,
      title: input.position,
      status: input.status ?? JobApplicationStatus.APPLIED,
      location: input.location ?? null,
      source: input.source ?? null,
      jobPostingUrl: input.jobPostingUrl ?? null,
      salaryExpectation: input.salaryExpectation ?? null,
      notes: input.notes ?? null,
    });
  }
}
