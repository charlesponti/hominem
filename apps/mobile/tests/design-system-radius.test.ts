import { readFileSync } from 'node:fs'
import { join } from 'node:path'

import { describe, expect, it } from 'vitest'

const root = process.cwd()

const mobileFiles = [
  'theme/theme.ts',
  'theme/styles.ts',
  'app/(auth)/index.tsx',
  'app/(auth)/verify.tsx',
  'app/(protected)/_layout.tsx',
  'app/(protected)/(tabs)/account/archived-chats.tsx',
  'app/(protected)/(tabs)/account/index.tsx',
  'app/(protected)/(tabs)/focus/index.tsx',
  'components/animated/pulsing-circle.tsx',
  'components/avatar.tsx',
  'components/badges/index.tsx',
  'components/bottom-sheet.tsx',
  'components/capture/proposal-card.tsx',
  'components/chat/chat-header.tsx',
  'components/chat/chat-message.tsx',
  'components/chat/chat-search-modal.tsx',
  'components/chat/chat-shimmer-message.tsx',
  'components/chat/chat-thinking-indicator.tsx',
  'components/chat/classification-review.tsx',
  'components/chat/context-anchor.tsx',
  'components/chat/session-card.tsx',
  'components/error-boundary/feature-error-boundary.tsx',
  'components/feedback-block.tsx',
  'components/focus/focus-list-item.tsx',
  'components/focus/focus-search.tsx',
  'components/focus/note-editing-sheet.tsx',
  'components/input/mobile-composer-attachments.tsx',
  'components/input/mobile-composer-footer.tsx',
  'components/input/mobile-composer.tsx',
  'components/media/camera-modal.tsx',
  'components/media/mobile-voice-input.tsx',
  'components/media/voice-session-modal.tsx',
  'components/notes/focus-item-preview.tsx',
  'components/start/intent-pill.tsx',
  'components/swipeable-card.tsx',
  'components/upload-file-button.tsx',
  'components/workspace/inbox-stream-item.tsx',
  'components/workspace/inbox-stream.tsx',
  'components/workspace/mobile-workspace-switcher.tsx',
  'components/workspace/note-context-screen.tsx',
  'components/workspace/search-context-screen.tsx',
]

const hardcodedRadiusPattern =
  /\b(borderRadius|borderTopLeftRadius|borderTopRightRadius|borderBottomLeftRadius|borderBottomRightRadius)\s*:\s*(\d+|t\.spacing\.[a-zA-Z0-9_]+|theme\.spacing\.[a-zA-Z0-9_]+)/g
const legacyRadiusTokenPattern = /\b(borderRadii\.(?!md\b|full\b)[a-zA-Z0-9_]+)/g

describe('mobile radius audit', () => {
  it('limits theme border radii to shared design-system keys', () => {
    const source = readFileSync(join(root, 'theme/theme.ts'), 'utf8')

    expect(source).toContain('md: radiiNative.md')
    expect(source).toContain('full: radiiNative.full')
    expect(source).not.toMatch(/\bsm_6\b|\bm_6\b|\bmd_10\b|\bl_12\b|\blg_14\b|\bxl_20\b|\bxl_24\b|\bs_3\b/)
  })

  it('uses only shared border radius tokens in app code', () => {
    const offenders: string[] = []

    for (const file of mobileFiles) {
      const source = readFileSync(join(root, file), 'utf8')

      if (hardcodedRadiusPattern.test(source) || legacyRadiusTokenPattern.test(source)) {
        offenders.push(file)
      }
    }

    expect(offenders).toEqual([])
  })
})
