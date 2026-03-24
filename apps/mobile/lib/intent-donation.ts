/**
 * intent-donation.ts
 *
 * Donates App Intents to the system so Siri and Spotlight learn which
 * actions the user performs most. Call the relevant donate function
 * whenever the user manually triggers the corresponding action.
 *
 * On iOS 16+ the system uses donated intents to surface proactive
 * suggestions in Spotlight, Siri, and the Shortcuts app.
 *
 * Implementation note: donation is performed natively inside
 * HakumiAppIntents.swift via `AppShortcutsProvider`. This module
 * exposes JS-callable wrappers that trigger a lightweight native round-trip
 * through Expo Modules. If the native module is not available (Android,
 * older iOS, tests) the calls are silently no-ops.
 */
import { Platform } from 'react-native';

type IntentName = 'AddNoteIntent' | 'StartChatIntent';

function donateIntent(name: IntentName): void {
  if (Platform.OS !== 'ios') return;

  try {
    // NativeModules bridge – populated when HakumiIntents.m is linked.
    // Falls back silently if not available (e.g. Expo Go, unit tests).
    const { HakumiIntents } = require('react-native').NativeModules;
    if (!HakumiIntents) {
      if (__DEV__) {
        console.warn(
          `[intent-donation] HakumiIntents native module not found. ` +
            'Run expo prebuild and rebuild the app to link HakumiIntents.m.',
        );
      }
      return;
    }
    HakumiIntents.donate(name);
  } catch (e) {
    if (__DEV__) console.warn('[intent-donation] donate() failed:', e);
  }
}

/** Call when the user creates a new note manually. */
export function donateAddNoteIntent(): void {
  donateIntent('AddNoteIntent');
}

/** Call when the user opens the Sherpa chat manually. */
export function donateStartChatIntent(): void {
  donateIntent('StartChatIntent');
}
