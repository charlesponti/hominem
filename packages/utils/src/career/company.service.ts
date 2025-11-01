import { db } from '@hominem/data/db'
import { type Company, companies, type NewCompany } from '@hominem/data/schema'
import { eq, type SQL } from 'drizzle-orm'

export class CompanyService {
  async create(data: Omit<NewCompany, 'id' | 'version' | 'createdAt' | 'updatedAt'>) {
    const [result] = await db.insert(companies).values(data).returning()
    return result
  }

  async update(id: string, data: Partial<NewCompany>) {
    const [result] = await db
      .update(companies)
      .set({
        ...data,
        updatedAt: new Date(),
      })
      .where(eq(companies.id, id))
      .returning()
    return result
  }

  async findById(id: string) {
    const [company] = await db.select().from(companies).where(eq(companies.id, id)).limit(1)
    return company
  }

  async findMany(query: SQL<Company>) {
    return await db.select().from(companies).where(query)
  }

  async delete(id: string) {
    const [result] = await db.delete(companies).where(eq(companies.id, id)).returning()
    return result
  }
}
