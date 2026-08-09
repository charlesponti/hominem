import type { ChatMessageItem } from '@hominem/chat';
import * as Clipboard from 'expo-clipboard';
import * as FileSystem from 'expo-file-system/legacy';
import * as Haptics from 'expo-haptics';
import * as Sharing from 'expo-sharing';
import { useCallback } from 'react';
import { Share } from 'react-native';

export async function copyMessage(message: ChatMessageItem): Promise<void> {
  const text = message.message;
  if (!text) return;

  await Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
  try {
    await Clipboard.setStringAsync(text);
  } catch {
    await Share.share({ message: text, title: 'Copy message' });
  }
}

export async function shareMessage(message: ChatMessageItem): Promise<void> {
  const text = message.message;
  if (!text) return;

  const uri = `${FileSystem.cacheDirectory}message_${message.id}.txt`;
  await FileSystem.writeAsStringAsync(uri, text, { encoding: FileSystem.EncodingType.UTF8 });
  await Sharing.shareAsync(uri, { mimeType: 'text/plain', UTI: 'public.plain-text' });
}

export function useCopyMessage() {
  return useCallback(copyMessage, []);
}

export function useShareMessage() {
  return useCallback(shareMessage, []);
}
