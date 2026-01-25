import { db } from '@hominem/db';
import { plaidItems } from '@hominem/db/schema';
import { and, eq } from 'drizzle-orm';

import { InstitutionsRepository } from './institutions.repository';

interface InstitutionCreateInput {
  id: string;
  name: string;
  url?: string | null;
  logo?: string | null;
  primaryColor?: string | null;
  country?: string | null;
}

/**
 * Service for Financial Institutions
 * Thin orchestration layer that delegates to repository for data access.
 */

export async function getInstitutionById(institutionId: string) {
  return InstitutionsRepository.getById(institutionId);
}

export async function getAllInstitutions() {
  return InstitutionsRepository.list();
}

export async function createInstitution(input: InstitutionCreateInput) {
  return InstitutionsRepository.create(input);
}

/**
 * Get a user's Plaid item for a specific institution
 * This is Plaid-specific and remains in the service layer
 */
export async function getUserPlaidItemForInstitution(
  plaidItemId: string,
  institutionId: string,
  userId: string,
) {
  return db.query.plaidItems.findFirst({
    where: and(
      eq(plaidItems.id, plaidItemId),
      eq(plaidItems.userId, userId),
      eq(plaidItems.institutionId, institutionId),
    ),
  });
}

export const InstitutionService = {
  getInstitutionById,
  getAllInstitutions,
  createInstitution,
  getUserPlaidItemForInstitution,
};
