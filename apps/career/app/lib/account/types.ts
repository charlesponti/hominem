import type { CareerCertificationRecord, CareerSocialLinksRecord } from '@hominem/db';
import type { CareerProfileRecord } from '@hominem/db';

export interface AccountPageUser {
  id: string;
  name?: string | null;
  email?: string | null;
}

export interface AccountDocumentFile {
  id: string;
  name: string;
  displayName: string;
  size: number;
  lastModified: string | null;
}

/** Loader data for /profile — everything that makes up your profile content. */
export interface ProfileLoaderData {
  user: AccountPageUser;
  currentProfile: CareerProfileRecord;
  hasProfile: true;
  socialLinks: CareerSocialLinksRecord | null;
  documents: AccountDocumentFile[];
  certifications: CareerCertificationRecord[];
}

/** Loader data for /account — identity, visibility, and administration only. */
export interface AccountSettingsLoaderData {
  user: AccountPageUser;
  currentProfile: CareerProfileRecord;
}

export interface BasicInfoFormValues {
  name: string;
  initials?: string | null;
  title?: string | null;
  jobTitle: string;
  bio: string;
  tagline: string;
  currentLocation: string;
  email: string;
  phone?: string | null;
  availabilityStatus?: boolean;
  openToRemote?: boolean;
}

export interface SocialLinksFormValues {
  github?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  website?: string | null;
}

/** Combined shape backing ProfilePage's single unified form. */
export type ProfileDetailsFormValues = BasicInfoFormValues & SocialLinksFormValues;

export interface CertificationFormValues {
  name: string;
  issuingOrganization: string;
  issueDate?: string | null;
}

export interface AccountActionResult<TData = undefined> {
  success: boolean;
  message?: string;
  error?: string;
  data?: TData;
}
