import type { CareerSocialLinksRecord } from '@hominem/db';
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

export interface AccountLoaderData {
  user: AccountPageUser;
  currentProfile: CareerProfileRecord;
  hasProfile: true;
  socialLinks: CareerSocialLinksRecord | null;
  documents: AccountDocumentFile[];
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
  isPublic?: boolean;
  isActive?: boolean;
}

export interface SocialLinksFormValues {
  github?: string | null;
  linkedin?: string | null;
  twitter?: string | null;
  website?: string | null;
}

export interface AccountActionResult<TData = undefined> {
  success: boolean;
  message?: string;
  error?: string;
  data?: TData;
}
