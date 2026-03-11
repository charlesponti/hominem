import { Pressable, StyleSheet, View } from 'react-native'

import type { ArtifactType, ThoughtLifecycleState } from '@hominem/chat-services/types'
import { Text, theme } from '~/theme'

/**
 * ArtifactActions — transformation strip shown in SessionView.
 *
 * v1: Note is enabled. Task / Task List / Tracker are disabled ("Coming soon").
 * Hidden when no messages. Dimmed during 'composing'. Disabled during
 * 'classifying', 'reviewing_changes', 'persisting'.
 */

interface ArtifactActionsProps {
  state: ThoughtLifecycleState
  messageCount: number
  onTransform: (type: ArtifactType) => void
}

const ACTIONS: { type: ArtifactType; label: string }[] = [
  { type: 'note', label: '→ NOTE' },
  { type: 'task', label: '→ TASK' },
  { type: 'task_list', label: '→ LIST' },
  { type: 'tracker', label: '→ TRACKER' },
]

const ENABLED: ArtifactType[] = ['note']
const BLOCKING: ThoughtLifecycleState[] = ['classifying', 'reviewing_changes', 'persisting']

export const ArtifactActions = ({ state, messageCount, onTransform }: ArtifactActionsProps) => {
  if (messageCount === 0) return null

  const isComposing = state === 'composing'
  const isBlocked = BLOCKING.includes(state)

  return (
    <View style={[styles.row, isComposing && styles.dimmed]}>
      {ACTIONS.map(({ type, label }) => {
        const enabled = ENABLED.includes(type)
        const disabled = !enabled || isBlocked

        return (
          <Pressable
            key={type}
            style={[styles.btn, disabled && styles.btnDisabled]}
            onPress={() => onTransform(type)}
            disabled={disabled}
            accessibilityLabel={enabled ? label : `${label} — Coming soon`}
            accessibilityState={{ disabled }}
          >
            <Text
              variant="caption"
              color={disabled ? 'secondaryForeground' : 'foreground'}
              style={disabled ? styles.disabledText : undefined}
            >
              {label}
            </Text>
          </Pressable>
        )
      })}
    </View>
  )
}

const styles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  dimmed: { opacity: 0.5 },
  btn: {
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 6,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.muted,
  },
  btnDisabled: { opacity: 0.38 },
  disabledText: {},
})
