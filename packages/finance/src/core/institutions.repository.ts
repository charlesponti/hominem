import type {
  FinancialInstitutionOutput,
  FinancialInstitutionInput,
} from '@hominem/db/types/finance';

import { db } from '@hominem/db';
import { financialInstitutions } from '@hominem/db/schema/finance';
import { eq } from 'drizzle-orm';

/**
 * Repository for Financial Institutions
 * Encapsulates all Database (Drizzle) access for institutions.
 * Always returns Domain models, hiding DB internal types.
 */
export const InstitutionsRepository = {
  async getById(institutionId: string): Promise<FinancialInstitutionOutput | null> {
    const result = await db.query.financialInstitutions.findFirst({
      where: eq(financialInstitutions.id, institutionId),
    });
    return (result as FinancialInstitutionOutput) ?? null;
  },

  async list(): Promise<FinancialInstitutionOutput[]> {
    return (await db.query.financialInstitutions.findMany({
      orderBy: (institutions) => institutions.name,
    })) as FinancialInstitutionOutput[];
  },

  async create(input: FinancialInstitutionInput): Promise<FinancialInstitutionOutput> {
    const [created] = await db
      .insert(financialInstitutions)
      .values({
        id: input.id,
        name: input.name,
        url: input.url || null,
        logo: input.logo || null,
        primaryColor: input.primaryColor || null,
        country: input.country || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      } as FinancialInstitutionInput)
      .returning();

    if (!created) {
      throw new Error(`Failed to create institution: ${input.name}`);
    }

    return created as FinancialInstitutionOutput;
  },
};
