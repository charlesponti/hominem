import { existsSync } from 'node:fs';

export function getVoiceAudioDir(): string {
  const possiblePaths = [
    './.tmp/voice',
    '../.tmp/voice',
    '../../.tmp/voice',
    '../../../.tmp/voice',
  ];

  for (const path of possiblePaths) {
    const dir = path.replace('/voice', '');
    if (existsSync(dir) || existsSync(path)) {
      return path;
    }
  }

  return './.tmp/voice';
}

export function generateVoiceAudioFilename(prefix: string, extension: string): string {
  const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
  return `${prefix}_${timestamp}.${extension}`;
}
