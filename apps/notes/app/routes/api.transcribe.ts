import type { ActionFunctionArgs } from 'react-router';

import { VoiceTranscriptionError, transcribeVoiceBuffer } from '@hominem/services';

import { getServerSession } from '~/lib/auth.server';
import { jsonResponse } from '~/lib/utils/json-response';

export async function action({ request }: ActionFunctionArgs) {
  if (request.method !== 'POST') {
    return jsonResponse(
      { success: false, error: 'Method not allowed', code: 'TRANSCRIBE_FAILED' },
      { status: 405 },
    );
  }

  try {
    const { user, session } = await getServerSession(request);
    if (!(user && session)) {
      return jsonResponse({ success: false, error: 'Unauthorized', code: 'AUTH' }, { status: 401 });
    }

    const formData = await request.formData();
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
