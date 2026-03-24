import { Pressable, StyleSheet, View } from 'react-native';

import { theme } from '~/theme';

import AppIcon from '../ui/icon';
import type { MobileWorkspaceContext } from '../workspace/mobile-workspace-config';
import type { MobileComposerPresentation } from './mobile-composer-config';

interface MobileComposerFooterProps {
  activeContext: MobileWorkspaceContext;
  presentation: MobileComposerPresentation;
  disableAttachmentActions?: boolean;
  onPickAttachment: () => void;
  onOpenCamera: () => void;
  onOpenVoice: () => void;
  onSecondaryAction: () => void;
  onPrimaryAction: () => void;
}

export function MobileComposerFooter({
  activeContext,
  presentation,
  disableAttachmentActions = false,
  onPickAttachment,
  onOpenCamera,
  onOpenVoice,
  onSecondaryAction,
  onPrimaryAction,
}: MobileComposerFooterProps) {
  return (
    <View style={styles.footer}>
      <View style={styles.tools}>
        {presentation.showsAttachmentButton ? (
          <Pressable
            onPress={onPickAttachment}
            accessibilityLabel="Add attachment"
            disabled={disableAttachmentActions}
            style={styles.toolButton}
            testID="mobile-composer-attach"
          >
            <AppIcon name="plus" size={18} style={styles.icon} />
          </Pressable>
        ) : null}
        {presentation.showsAttachmentButton ? (
          <Pressable
            onPress={onOpenCamera}
            accessibilityLabel="Take photo"
            disabled={disableAttachmentActions}
            style={styles.toolButton}
            testID="mobile-composer-camera"
          >
            <AppIcon name="camera" size={18} style={styles.icon} />
          </Pressable>
        ) : null}
        {presentation.showsVoiceButton ? (
          <Pressable
            onPress={onOpenVoice}
            accessibilityLabel="Record voice note"
            style={styles.toolButton}
            testID="mobile-composer-voice"
          >
            <AppIcon name="microphone" size={18} style={styles.icon} />
          </Pressable>
        ) : null}
      </View>
      <View style={styles.actions}>
        {presentation.secondaryActionLabel ? (
          <Pressable
            accessibilityLabel={presentation.secondaryActionLabel}
            onPress={onSecondaryAction}
            style={styles.secondaryAction}
            testID="mobile-composer-secondary-action"
          >
            <AppIcon
              name={activeContext === 'chat' ? 'circle-plus' : 'comment'}
              size={18}
              style={styles.icon}
            />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityLabel={presentation.primaryActionLabel}
          onPress={onPrimaryAction}
          style={styles.primaryAction}
          testID="mobile-composer-primary-action"
        >
          <AppIcon
            name={activeContext === 'chat' ? 'arrow-up' : 'circle-plus'}
            size={18}
            style={styles.primaryIcon}
          />
        </Pressable>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  footer: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  tools: {
    flexDirection: 'row',
    gap: theme.spacing.sm_8,
  },
  toolButton: {
    alignItems: 'center',
    backgroundColor: theme.colors['bg-surface'],
    borderRadius: theme.borderRadii.full,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 38,
  },
  icon: {
    color: theme.colors.foreground,
  },
  actions: {
    flexDirection: 'row',
    gap: theme.spacing.sm_8,
  },
  secondaryAction: {
    alignItems: 'center',
    backgroundColor: theme.colors['bg-surface'],
    borderRadius: theme.borderRadii.full,
    borderWidth: 1,
    borderColor: theme.colors['border-default'],
    justifyContent: 'center',
    minHeight: 38,
    minWidth: 38,
  },
  primaryAction: {
    alignItems: 'center',
    backgroundColor: theme.colors.foreground,
    borderRadius: theme.borderRadii.full,
    justifyContent: 'center',
    minHeight: 42,
    minWidth: 42,
  },
  primaryIcon: {
    color: theme.colors.background,
  },
});
