import { and, eq, sql } from 'drizzle-orm'
import { db } from '@hominem/data/db'
import { financeAccounts, financialInstitutions, plaidItems } from '@hominem/data/schema'
import { logger } from '../../logger'

export interface InstitutionConnection {
  institutionId: string
  institutionName: string
  institutionLogo: string | null
  institutionUrl: string | null
  status: 'active' | 'error' | 'pending_expiration' | 'revoked'
  lastSyncedAt: Date | null
  error: string | null
  accountCount: number
  isPlaidConnected: boolean
}

export interface InstitutionAccount {
  id: string
  name: string
  officialName: string | null
  type: string
  balance: string
  mask: string | null
  subtype: string | null
  institutionId: string | null
  institutionName: string | null
  institutionLogo: string | null
  isPlaidConnected: boolean
  plaidAccountId: string | null
  lastUpdated: Date | null
  createdAt: Date
  updatedAt: Date
}

/**
 * Aggregates all institution connections by user ID.
 */
export async function getUserInstitutionConnections(
  userId: string
): Promise<InstitutionConnection[]> {
  try {
    const connections = await db
      .select({
        institutionId: financialInstitutions.id,
        institutionName: financialInstitutions.name,
        institutionLogo: financialInstitutions.logo,
        institutionUrl: financialInstitutions.url,
        status: plaidItems.status,
        lastSyncedAt: plaidItems.lastSyncedAt,
        error: plaidItems.error,
        accountCount: sql<number>`COUNT(DISTINCT ${financeAccounts.id})`,
        isPlaidConnected: sql<boolean>`${plaidItems.id} IS NOT NULL`,
      })
      .from(financialInstitutions)
      .leftJoin(
        plaidItems,
        and(eq(financialInstitutions.id, plaidItems.institutionId), eq(plaidItems.userId, userId))
      )
      .leftJoin(
        financeAccounts,
        and(
          eq(financialInstitutions.id, financeAccounts.institutionId),
          eq(financeAccounts.userId, userId)
        )
      )
      .where(sql`${financeAccounts.userId} = ${userId} OR ${plaidItems.userId} = ${userId}`)
      .groupBy(
        financialInstitutions.id,
        financialInstitutions.name,
        financialInstitutions.logo,
        financialInstitutions.url,
        plaidItems.status,
        plaidItems.lastSyncedAt,
        plaidItems.error,
        plaidItems.id
      )

    return connections.map((conn) => ({
      ...conn,
      lastSyncedAt: conn.lastSyncedAt,
      status: conn.status || 'active', // Default to active for manual connections
      error: conn.error,
    }))
  } catch (error) {
    logger.error('Error getting user institution connections:', error)
    throw error
  }
}

/**
 * Get all accounts for a user with institution information
 * This provides a clean, institution-centric view of accounts
 */
export async function getUserAccounts(userId: string): Promise<InstitutionAccount[]> {
  try {
    const accounts = await db
      .select({
        id: financeAccounts.id,
        name: financeAccounts.name,
        officialName: financeAccounts.officialName,
        type: financeAccounts.type,
        balance: financeAccounts.balance,
        mask: financeAccounts.mask,
        subtype: financeAccounts.subtype,
        institutionId: financeAccounts.institutionId,
        institutionName: financialInstitutions.name,
        institutionLogo: financialInstitutions.logo,
        isPlaidConnected: sql<boolean>`${financeAccounts.plaidItemId} IS NOT NULL`,
        plaidAccountId: financeAccounts.plaidAccountId,
        lastUpdated: financeAccounts.lastUpdated,
        createdAt: financeAccounts.createdAt,
        updatedAt: financeAccounts.updatedAt,
      })
      .from(financeAccounts)
      .leftJoin(financialInstitutions, eq(financeAccounts.institutionId, financialInstitutions.id))
      .where(eq(financeAccounts.userId, userId))

    return accounts.map((account) => ({
      ...account,
      lastUpdated: account.lastUpdated,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }))
  } catch (error) {
    logger.error('Error getting user accounts:', error)
    throw error
  }
}

/**
 * Get accounts for a specific institution
 */
export async function getInstitutionAccounts(
  userId: string,
  institutionId: string
): Promise<InstitutionAccount[]> {
  try {
    const accounts = await db
      .select({
        id: financeAccounts.id,
        name: financeAccounts.name,
        officialName: financeAccounts.officialName,
        type: financeAccounts.type,
        balance: financeAccounts.balance,
        mask: financeAccounts.mask,
        subtype: financeAccounts.subtype,
        institutionId: financeAccounts.institutionId,
        institutionName: financialInstitutions.name,
        institutionLogo: financialInstitutions.logo,
        isPlaidConnected: sql<boolean>`${financeAccounts.plaidItemId} IS NOT NULL`,
        plaidAccountId: financeAccounts.plaidAccountId,
        lastUpdated: financeAccounts.lastUpdated,
        createdAt: financeAccounts.createdAt,
        updatedAt: financeAccounts.updatedAt,
      })
      .from(financeAccounts)
      .leftJoin(financialInstitutions, eq(financeAccounts.institutionId, financialInstitutions.id))
      .where(
        and(eq(financeAccounts.userId, userId), eq(financeAccounts.institutionId, institutionId))
      )

    return accounts.map((account) => ({
      ...account,
      lastUpdated: account.lastUpdated,
      createdAt: account.createdAt,
      updatedAt: account.updatedAt,
    }))
  } catch (error) {
    logger.error('Error getting institution accounts:', error)
    throw error
  }
}

/**
 * Get institution details
 */
export async function getInstitution(institutionId: string) {
  try {
    const institution = await db.query.financialInstitutions.findFirst({
      where: eq(financialInstitutions.id, institutionId),
    })

    return institution
  } catch (error) {
    logger.error('Error getting institution:', error)
    throw error
  }
}

/**
 * Get all available institutions
 */
export async function getAllInstitutions() {
  try {
    const institutions = await db.query.financialInstitutions.findMany({
      orderBy: (financialInstitutions, { asc }) => [asc(financialInstitutions.name)],
    })

    return institutions
  } catch (error) {
    logger.error('Error getting all institutions:', error)
    throw error
  }
}

/**
 * Create a new institution (for manual accounts)
 */
export async function createInstitution(data: {
  id: string
  name: string
  url?: string
  logo?: string
  primaryColor?: string
  country?: string
}) {
  try {
    const [institution] = await db
      .insert(financialInstitutions)
      .values({
        id: data.id,
        name: data.name,
        url: data.url || null,
        logo: data.logo || null,
        primaryColor: data.primaryColor || null,
        country: data.country || null,
        createdAt: new Date(),
        updatedAt: new Date(),
      })
      .returning()

    return institution
  } catch (error) {
    logger.error('Error creating institution:', error)
    throw error
  }
}
