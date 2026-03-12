import { VoiceTranscriptionError, transcribeVoiceBuffer } from '@hominem/services';
import type { ActionFunctionArgs } from 'react-router';

import { getServerSession } from '~/lib/auth.server';
import { jsonResponse } from '~/lib/utils/json-response';

interface FormDataReader {
  get(name: string): FormDataEntryValue | null;
}

function hasFormDataGet(value: object): value is FormDataReader {
  return 'get' in value;
}

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return jsonResponse(
      { success: false, error: 'Method not allowed', code: 'TRANSCRIBE_FAILED' },
      { status: 405 },
    );
  }

  try {
    const { user } = await getServerSession(request);
    if (!user) {
      return jsonResponse({ success: false, error: 'Unauthorized', code: 'AUTH' }, { status: 401 });
    }

    const formData = await request.formData();
    if (!hasFormDataGet(formData)) {
      return jsonResponse(
        { success: false, error: 'Invalid form submission', code: 'INVALID_FORMAT' },
        { status: 400 },
      );
    }

    const audioFile = formData.get('audio');

    if (!(audioFile instanceof File)) {
      return jsonResponse(
        { success: false, error: 'No audio file provided', code: 'INVALID_FORMAT' },
        { status: 400 },
      );
    }

    const output = await transcribeVoiceBuffer({
      buffer: await audioFile.arrayBuffer(),
      mimeType: audioFile.type,
      ...(audioFile.name ? { fileName: audioFile.name } : {}),
      language: 'en',
    });

    return jsonResponse({
      success: true,
      transcription: output,
    });
  } catch (error) {
    if (error instanceof VoiceTranscriptionError) {
      return jsonResponse(
        {
          success: false,
          error: error.message,
          code: error.code,
        },
        { status: error.statusCode },
      );
    }

    return jsonResponse(
      {
        success: false,
        error: 'Failed to transcribe audio',
        code: 'TRANSCRIBE_FAILED',
      },
      { status: 500 },
    );
  }
}
