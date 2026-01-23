import { db } from '@hominem/db';
import {
  financialInstitutions,
  type FinancialInstitution,
  type FinancialInstitutionInsert,
  type FinancialInstitutionInsert,
} from '@hominem/db/schema';
import { eq } from 'drizzle-orm';

/**
 * Repository for Financial Institutions
 * Encapsulates all Database (Drizzle) access for institutions.
 * Always returns Domain models, hiding DB internal types.
 */
export const InstitutionsRepository = {
  async getById(institutionId: string): Promise<FinancialInstitution | null> {
    const result = await db.query.financialInstitutions.findFirst({
      where: eq(financialInstitutions.id, institutionId),
    });
    return (result as FinancialInstitution) ?? null;
  },

  async list(): Promise<FinancialInstitution[]> {
    return (await db.query.financialInstitutions.findMany({
      orderBy: (institutions) => institutions.name,
    })) as FinancialInstitution[];
  },

  async create(input: FinancialInstitutionInsert): Promise<FinancialInstitution> {
    const [created] = await db
      .insert(financialInstitutions)
      .values({
        id: input.id,
        name: input.name,
        url: input.url || null,
        logo: input.logo || null,
        primaryColor: input.primaryColor || null,
        country: input.country || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      } as FinancialInstitutionInsert)
      .returning();

    if (!created) {
      throw new Error(`Failed to create institution: ${input.name}`);
    }

    return created as FinancialInstitution;
  },
};
