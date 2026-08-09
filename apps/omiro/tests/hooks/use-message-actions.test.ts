import type { ChatMessageItem } from '@hominem/chat';
import { afterEach, describe, expect, it, vi } from 'vitest';

vi.mock('expo-clipboard', () => ({ setStringAsync: vi.fn() }));
vi.mock('expo-haptics', () => ({
  impactAsync: vi.fn(),
  ImpactFeedbackStyle: { Light: 'light' },
}));
vi.mock('expo-file-system/legacy', () => ({
  cacheDirectory: '/cache/',
  EncodingType: { UTF8: 'utf8' },
  writeAsStringAsync: vi.fn(),
}));
vi.mock('expo-sharing', () => ({ shareAsync: vi.fn() }));
vi.mock('react-native', () => ({ Share: { share: vi.fn() } }));

import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { Share } from 'react-native';

import { copyMessage, shareMessage } from '~/hooks/use-message-actions';

function message(id: string, text: string): ChatMessageItem {
  return { id, message: text } as ChatMessageItem;
}

afterEach(() => {
  vi.clearAllMocks();
});

describe('copyMessage', () => {
  it('does nothing when the message has no text', async () => {
    await copyMessage(message('1', ''));

    expect(Haptics.impactAsync).not.toHaveBeenCalled();
    expect(Clipboard.setStringAsync).not.toHaveBeenCalled();
    expect(Share.share).not.toHaveBeenCalled();
  });

  it('triggers haptics and copies the message text', async () => {
    vi.mocked(Clipboard.setStringAsync).mockResolvedValue(true);

    await copyMessage(message('1', 'hello world'));

    expect(Haptics.impactAsync).toHaveBeenCalledWith(Haptics.ImpactFeedbackStyle.Light);
    expect(Clipboard.setStringAsync).toHaveBeenCalledWith('hello world');
    expect(Share.share).not.toHaveBeenCalled();
  });

  it('falls back to the share sheet when the clipboard write fails', async () => {
    vi.mocked(Clipboard.setStringAsync).mockRejectedValue(new Error('denied'));

    await copyMessage(message('1', 'hello world'));

    expect(Share.share).toHaveBeenCalledWith({ message: 'hello world', title: 'Copy message' });
  });
});

describe('shareMessage', () => {
  it('does nothing when the message has no text', async () => {
    await shareMessage(message('1', ''));

    expect(FileSystem.writeAsStringAsync).not.toHaveBeenCalled();
    expect(Sharing.shareAsync).not.toHaveBeenCalled();
  });

  it('writes the message to a cache file and opens the share sheet', async () => {
    vi.mocked(FileSystem.writeAsStringAsync).mockResolvedValue(undefined);
    vi.mocked(Sharing.shareAsync).mockResolvedValue(undefined);

    await shareMessage(message('7', 'share me'));

    expect(FileSystem.writeAsStringAsync).toHaveBeenCalledWith('/cache/message_7.txt', 'share me', {
      encoding: 'utf8',
    });
    expect(Sharing.shareAsync).toHaveBeenCalledWith('/cache/message_7.txt', {
      mimeType: 'text/plain',
      UTI: 'public.plain-text',
    });
  });
});
