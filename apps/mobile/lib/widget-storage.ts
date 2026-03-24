/**
 * widget-storage.ts
 *
 * Shared storage for WidgetKit → main app action signalling via App Groups.
 *
 * CURRENT STATUS: the QuickActionsWidget uses Button(intent:) / Link which
 * open the app directly via deep link (hakumi://note/add, hakumi://sherpa).
 * The Swift widget does NOT write to this storage today. This module exists
 * as the correct infrastructure for a future widget variant that needs to
 * signal actions to a running app without a cold launch (e.g. interactive
 * lock screen widgets that can't open the app).
 *
 * IMPORTANT – MMKV path is a filesystem path, not an App Group identifier.
 * To share storage across targets the path must be the resolved App Group
 * container URL:
 *
 *   FileManager.default
 *     .containerURL(forSecurityApplicationGroupIdentifier: APP_GROUP)?.path
 *
 * This requires a native call. Until a native helper module exposes this
 * path, the storage is only accessible within the main app process and
 * cannot be read/written by extension targets.
 *
 * TODO: create a native Expo module (e.g. expo-app-group-path) that returns
 * the container path and initialise widgetStorage with it.
 *
 * Key contract:
 *   PENDING_ACTION  – last action queued by the widget ("add-note" | "open-sherpa" | null)
 *   PENDING_ACTION_TS – epoch ms when the action was written (for staleness guard)
 */
import { createMMKV } from 'react-native-mmkv';

const STALE_MS = 30_000; // ignore widget actions older than 30 s

export type WidgetAction = 'add-note' | 'open-sherpa';

export const widgetStorage = createMMKV({
  id: 'hakumi.widget',
  // TODO: replace with the resolved App Group container path from a native call
  // so this storage is shared with WidgetKit extension targets.
});

export function setPendingWidgetAction(action: WidgetAction): void {
  widgetStorage.set('PENDING_ACTION', action);
  widgetStorage.set('PENDING_ACTION_TS', Date.now());
}

export function consumePendingWidgetAction(): WidgetAction | null {
  const action = widgetStorage.getString('PENDING_ACTION') as WidgetAction | undefined;
  const ts = widgetStorage.getNumber('PENDING_ACTION_TS') ?? 0;

  if (!action) return null;

  // Clear regardless of staleness so we don't re-trigger on next foreground
  widgetStorage.remove('PENDING_ACTION');
  widgetStorage.remove('PENDING_ACTION_TS');

  if (Date.now() - ts > STALE_MS) return null;

  return action;
}
