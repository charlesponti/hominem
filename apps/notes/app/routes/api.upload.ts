import { FileProcessorService } from '@hominem/services/files';
import { fileStorageService } from '@hominem/utils/storage';
import type { ActionFunctionArgs } from 'react-router';

import { createServerHonoClient } from '~/lib/api.server';
import { getServerSession } from '~/lib/auth.server';
import type { FailedUpload, UploadedFile, UploadResponse } from '~/lib/types/upload.js';
import { jsonResponse } from '~/lib/utils/json-response';

interface FormDataReader {
  getAll(name: string): FormDataValue[];
}

function hasFormDataGetAll(value: object): value is FormDataReader {
  return 'getAll' in value;
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed' }, { status: 405 });
  }

  try {
    // Get authentication
    const { user, session } = await getServerSession(request);
    if (!user || !session) {
      return jsonResponse({ error: 'Unauthorized' }, { status: 401 });
    }

    const formData = await request.formData();
    if (!hasFormDataGetAll(formData)) {
      return jsonResponse({ error: 'Invalid form submission' }, { status: 400 });
    }

    const files: File[] = [];
    for (const value of formData.getAll('files')) {
      if (value instanceof File) {
        files.push(value);
      }
    }

    if (!files.length) {
      return jsonResponse({ error: 'No files provided' }, { status: 400 });
    }

    // Create RPC client for vector indexing
    const client = createServerHonoClient(session.access_token, request);

    // Process each file
    const results = await Promise.allSettled(
      files.map(async (file) => {
        // Validate file type
        if (!fileStorageService.isValidFileType(file.type)) {
          throw new Error(`Unsupported file type: ${file.type}`);
        }

        // Convert File to ArrayBuffer
        const buffer = await file.arrayBuffer();

        // Store the file with user authentication
        const storedFile = await fileStorageService.storeFile(
          Buffer.from(buffer),
          file.type,
          user.id,
          { filename: file.name },
        );

        // Process the file based on its type
        const processedFile = await FileProcessorService.processFile(
          buffer,
          file.name,
          file.type,
          storedFile.id,
        );

        // Index the file in the vector store if file has text content
        let vectorIds: string[] = [];
        if (processedFile.textContent || processedFile.content) {
          const data = await client.files.index({
            id: processedFile.id,
            originalName: processedFile.originalName,
            type: processedFile.type,
            mimetype: processedFile.mimetype,
            size: processedFile.size,
            ...(processedFile.textContent ? { textContent: processedFile.textContent } : {}),
            ...(processedFile.content ? { content: processedFile.content } : {}),
            ...(processedFile.thumbnail ? { thumbnail: processedFile.thumbnail } : {}),
          });
          if (data.success) {
            vectorIds = [];
          }
        }

        return {
          ...processedFile,
          url: storedFile.url,
          uploadedAt: storedFile.uploadedAt,
          vectorIds, // Include vector IDs in response
        };
      }),
    );

    // Separate successful and failed uploads
    const successful: UploadedFile[] = [];
    const failed: FailedUpload[] = [];

    results.forEach((result, index) => {
      if (result.status === 'fulfilled') {
        successful.push(result.value);
      } else {
        failed.push({
          name: files[index]?.name || 'Unknown file',
          error: result.reason instanceof Error ? result.reason.message : 'Unknown error',
        });
      }
    });

    const responseData: UploadResponse = {
      success: true,
      files: successful,
      failed,
      message: `Successfully uploaded ${successful.length} of ${files.length} files`,
    };

    return jsonResponse(responseData);
  } catch (error) {
    console.error('Upload error:', error);
    return jsonResponse(
      {
        error: 'Failed to process upload',
        details: error instanceof Error ? error.message : 'Unknown error',
      },
      { status: 500 },
    );
  }
}
