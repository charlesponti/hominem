import { describe, expect, it } from 'vitest';

import {
  VOICE_TRANSCRIPTION_MAX_SIZE_BYTES,
  VoiceTranscriptionError,
  normalizeVoiceMimeType,
  validateVoiceInput,
} from './voice-transcription.service';

describe('voice-transcription.service', () => {
  it('normalizes codec-annotated mime types', () => {
    expect(normalizeVoiceMimeType('audio/webm;codecs=opus')).toBe('audio/webm');
  });

  it('normalizes mime aliases', () => {
    expect(normalizeVoiceMimeType('audio/x-wav')).toBe('audio/wav');
    expect(normalizeVoiceMimeType('audio/m4a')).toBe('audio/mp4');
  });

  it('rejects unsupported mime with stable code', () => {
    expect(() => validateVoiceInput({ mimeType: 'audio/flac', size: 10 })).toThrowError(
      VoiceTranscriptionError,
    );

    try {
      validateVoiceInput({ mimeType: 'audio/flac', size: 10 });
    } catch (error) {
      if (error instanceof VoiceTranscriptionError) {
        expect(error.code).toBe('INVALID_FORMAT');
        return;
      }
      throw error;
    }
  });

  it('rejects oversized payload with stable code', () => {
    try {
      validateVoiceInput({
        mimeType: 'audio/webm;codecs=opus',
        size: VOICE_TRANSCRIPTION_MAX_SIZE_BYTES + 1,
      });
    } catch (error) {
      if (error instanceof VoiceTranscriptionError) {
        expect(error.code).toBe('TOO_LARGE');
        return;
      }
      throw error;
    }

    throw new Error('Expected VoiceTranscriptionError to be thrown');
  });
});
