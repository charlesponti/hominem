import { CareerRepository, db, SocialLinksRepository } from '@hominem/db';
import { imageStorageService, isStorageServiceError, validateFile } from '@hominem/storage';

import { logger } from '~/lib/logger';
import { parseFormData } from '~/lib/route-utils';
import { normalizePortfolioSlug } from '~/types/resume';

import { deleteUserDocument } from './documents.server';
import type {
  AccountActionResult,
  AccountPageUser,
  BasicInfoFormValues,
  SocialLinksFormValues,
} from './types';

const PROFILE_IMAGE_VALIDATION = {
  maxSizeBytes: 5 * 1024 * 1024,
  allowedTypes: ['image/jpeg', 'image/png', 'image/gif', 'image/webp'],
} as const;

type AccountActionHandler = (args: {
  formData: FormData;
  user: AccountPageUser;
}) => Promise<AccountActionResult<unknown>>;

const accountActionHandlers: Record<string, AccountActionHandler> = {
  delete: handleDeleteProfileAction,
  'upload-profile-image': handleUploadProfileImageAction,
  'update-slug': handleUpdateSlugAction,
  'update-basics': handleUpdateBasicsAction,
  'update-social-links': handleUpdateSocialLinksAction,
  'delete-document': handleDeleteDocumentAction,
};

function getProfileImageUploadErrorMessage(error: unknown): string {
  if (!isStorageServiceError(error)) {
    return error instanceof Error ? error.message : 'Failed to upload image';
  }

  switch (error.code) {
    case 'storage.config.missing':
      return 'Profile image storage is not configured yet.';
    case 'storage.credentials.invalid':
      return 'Profile image storage credentials were rejected.';
    case 'storage.bucket.access_denied':
      return 'Profile image storage access was denied.';
    case 'storage.bucket.missing':
      return 'Profile image storage bucket was not found.';
    case 'storage.network.unreachable':
      return 'Profile image storage is temporarily unreachable.';
    default:
      return 'Failed to upload image';
  }
}

export async function handleAccountAction({
  formData,
  user,
}: {
  formData: FormData;
  user: AccountPageUser;
}): Promise<AccountActionResult<unknown>> {
  const action = formData.get('action');

  if (typeof action !== 'string' || !action) {
    throw new Response('Invalid action', { status: 400 });
  }

  const handler = accountActionHandlers[action];

  if (!handler) {
    throw new Response('Invalid action', { status: 400 });
  }

  return handler({ formData, user });
}

async function handleDeleteProfileAction({
  user,
}: {
  formData: FormData;
  user: AccountPageUser;
}): Promise<AccountActionResult> {
  try {
    await CareerRepository.deleteProfile(db, user.id);
    return { success: true, message: 'Profile deleted successfully' };
  } catch (error) {
    logger.error('Failed to delete profile', error, { owner_userid: user.id });
    throw new Response('Failed to delete profile', { status: 500 });
  }
}

async function handleUploadProfileImageAction({
  formData,
  user,
}: {
  formData: FormData;
  user: AccountPageUser;
}): Promise<AccountActionResult<{ imageUrl: string }>> {
  try {
    const imageFile = formData.get('image') as File | null;

    if (!imageFile) {
      throw new Response('No image file provided', { status: 400 });
    }

    const validation = validateFile(imageFile, PROFILE_IMAGE_VALIDATION);
    if (!validation.valid) {
      throw new Response(validation.error || 'Invalid file', { status: 400 });
    }

    let uploadResult: { id: string; url: string };

    try {
      const buffer = Buffer.from(await imageFile.arrayBuffer());
      uploadResult = await imageStorageService.storeFile(buffer, imageFile.type, user.id, {
        originalName: imageFile.name,
      });
    } catch (uploadError) {
      logger.error('Failed to store profile image', uploadError, { owner_userid: user.id });
      throw new Response(getProfileImageUploadErrorMessage(uploadError), { status: 500 });
    }

    try {
      await CareerRepository.updateProfileImage(db, user.id, uploadResult.url);
    } catch (updateError) {
      logger.error('Database update error', updateError, { owner_userid: user.id });
      await imageStorageService.deleteFile(uploadResult.id, user.id);
      throw new Response('Failed to update profile', { status: 500 });
    }

    return {
      success: true,
      message: 'Profile image updated successfully',
      data: { imageUrl: uploadResult.url },
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    logger.error('Failed to upload profile image', error, { owner_userid: user.id });
    throw new Response('Failed to upload profile image', { status: 500 });
  }
}

async function handleUpdateSlugAction({
  formData,
  user,
}: {
  formData: FormData;
  user: AccountPageUser;
}): Promise<AccountActionResult<{ slug: string }>> {
  try {
    const newSlug = formData.get('slug');
    const profileId = formData.get('profileId');

    if (typeof newSlug !== 'string' || typeof profileId !== 'string' || !newSlug || !profileId) {
      throw new Response('Slug and profile ID are required', { status: 400 });
    }

    if (!/^[a-z0-9-]+$/.test(newSlug)) {
      throw new Response('Slug can only contain lowercase letters, numbers, and hyphens', {
        status: 400,
      });
    }

    if (newSlug.length < 3) {
      throw new Response('Slug must be at least 3 characters long', { status: 400 });
    }

    if (newSlug.length > 50) {
      throw new Response('Slug must be less than 50 characters long', { status: 400 });
    }

    const isAvailable = await CareerRepository.isSlugAvailable(db, newSlug, profileId);

    if (!isAvailable) {
      throw new Response('Slug is already taken', { status: 400 });
    }

    await CareerRepository.updateSlug(db, user.id, newSlug);

    return {
      success: true,
      message: 'Profile URL updated successfully',
      data: { slug: newSlug },
    };
  } catch (error) {
    if (error instanceof Response) {
      throw error;
    }

    logger.error('Failed to update profile URL', error, { owner_userid: user.id });
    throw new Response('Failed to update profile URL', { status: 500 });
  }
}

async function handleUpdateSocialLinksAction({
  formData,
  user,
}: {
  formData: FormData;
  user: AccountPageUser;
}): Promise<AccountActionResult> {
  const socialLinksDataResult = parseFormData<SocialLinksFormValues>(formData, 'socialLinksData');

  if ('success' in socialLinksDataResult && !socialLinksDataResult.success) {
    return { success: false, error: "Your social links couldn't be read. Refresh and try again." };
  }

  const socialLinksData = socialLinksDataResult as SocialLinksFormValues;

  try {
    await SocialLinksRepository.save(db, user.id, {
      github: socialLinksData.github ?? null,
      linkedin: socialLinksData.linkedin ?? null,
      twitter: socialLinksData.twitter ?? null,
      website: socialLinksData.website ?? null,
    });

    return { success: true, message: 'Social links saved successfully' };
  } catch (error) {
    logger.error('Failed to save social links', error, { owner_userid: user.id });
    return { success: false, error: "We couldn't save your social links. Try again." };
  }
}

async function handleUpdateBasicsAction({
  formData,
  user,
}: {
  formData: FormData;
  user: AccountPageUser;
}): Promise<AccountActionResult> {
  const profileDataResult = parseFormData<BasicInfoFormValues>(formData, 'portfolioData');

  if ('success' in profileDataResult && !profileDataResult.success) {
    return { success: false, error: 'Your changes couldn’t be read. Refresh and try again.' };
  }

  const profileData = profileDataResult as BasicInfoFormValues;

  try {
    const name = profileData.name || '';
    const [firstName, ...rest] = name.split(' ');
    const lastName = rest.join(' ') || null;

    await CareerRepository.saveProfile(db, user.id, {
      firstName,
      lastName,
      headline: profileData.jobTitle,
      summary: profileData.bio,
      location: profileData.currentLocation,
      email: profileData.email,
      phone: profileData.phone ?? null,
      initials: profileData.initials ?? null,
      tagline: profileData.tagline,
      title: profileData.title ?? null,
      availabilityStatus: profileData.availabilityStatus ?? false,
      openToRemote: profileData.openToRemote ?? false,
      isPublic: profileData.isPublic ?? true,
      isActive: profileData.isActive ?? true,
    });

    return { success: true, message: 'Profile basics updated successfully' };
  } catch (error) {
    logger.error('Failed to update profile basics', error, { owner_userid: user.id });
    return { success: false, error: 'We couldn’t save your basic info. Try again.' };
  }
}

async function handleDeleteDocumentAction({
  formData,
  user,
}: {
  formData: FormData;
  user: AccountPageUser;
}): Promise<AccountActionResult> {
  const fileId = formData.get('fileId');
  if (typeof fileId !== 'string' || !fileId.trim()) {
    return { success: false, error: 'Choose a file to delete.' };
  }

  try {
    const deleted = await deleteUserDocument(user.id, fileId.trim());
    if (!deleted) {
      return { success: false, error: 'That file was not found or could not be deleted.' };
    }
    return { success: true, message: 'File deleted' };
  } catch (error) {
    logger.error('Failed to delete document', error, {
      fileId: fileId.trim(),
      owner_userid: user.id,
    });
    return { success: false, error: 'We couldn’t delete that file. Try again.' };
  }
}
