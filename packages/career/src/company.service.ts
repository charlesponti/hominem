import { db } from '@hominem/db';
import type { CompanyOutput, CompanyInput } from '@hominem/db/schema';
import { companies } from '@hominem/db/schema/company';
import { eq, type SQL } from 'drizzle-orm';

export class CompanyService {
  async create(data: Omit<CompanyInput, 'id' | 'version' | 'createdAt' | 'updatedAt'>) {
    const [result] = await db.insert(companies).values(data).returning();
    return result;
  }

  async update(id: string, data: Partial<CompanyInput>) {
    const [result] = await db
      .update(companies)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning();
    return result;
  }

  async findById(id: string) {
    const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1);
    return company;
  }

  async findMany(query: SQL<CompanyOutput>) {
    return await db.select().from(companies).where(query);
  }

  async delete(id: string) {
    const [result] = await db.delete(companies).where(eq(companies.id, id)).returning();
    return result;
  }
}
