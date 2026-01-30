import type { EmptyInput } from '../utils';
import type { InstitutionData } from './shared.types';

// ============================================================================
// Institutions
// ============================================================================

export type InstitutionsListInput = EmptyInput;
export type InstitutionsListOutput = InstitutionData[];

export type InstitutionCreateInput = {
  id: string;
  name: string;
  logo?: string;
  url?: string;
  primaryColor?: string;
  country?: string;
};
export type InstitutionCreateOutput = InstitutionData;
